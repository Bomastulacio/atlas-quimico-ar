"""Orquestador LangGraph (Etapa 4): grafo cíclico, checkpointer SQLite, harness y pausa interrupt."""

from __future__ import annotations

import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, TypedDict

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from atlas_pipeline.agents.data_agent import LLMExtractorFn, run_agent1_data_extraction
from atlas_pipeline.agents.process_agent import ProcessLLMExtractorFn, run_agent2_process_drafting
from atlas_pipeline.agents.verifier_agent import VerifierLLMFn, run_agent3_independent_verification
from atlas_pipeline.chem.verifiers import (
    ChemicalVerificationSuiteReport,
    run_chemical_verification_suite,
)
from atlas_pipeline.config import PipelineSettings
from atlas_pipeline.harness.budget import CircuitBreaker, ExecutionBudget, TokenBucketRateLimiter
from atlas_pipeline.harness.cache import ContentAddressedCache, compute_sha256_bytes
from atlas_pipeline.harness.security import enforce_tool_allowlist
from atlas_pipeline.harness.telemetry import AuditEvent, AuditTrail
from atlas_pipeline.nodes.staging_export import export_staging_artifacts
from atlas_pipeline.nodes.validator import ValidationReport, validate_staging_bundle
from atlas_pipeline.schemas import (
    Fuente,
    ProcessDraftBundle,
    StagingDataBundle,
    VeredictoItem,
    VerifierAuditReport,
)
from atlas_pipeline.tools.fetcher import FetchedSource, SourceSpec, fetch_source
from atlas_pipeline.tools.parsers import ParsedSource, parse_source

PipelineStatus = Literal[
    "EN_CURSO",
    "VALIDADO_PARA_REVISION",
    "REQUIERE_REVISION_HUMANA",
    "APROBADO_PARA_SUPABASE",
    "RECHAZADO_POR_HUMANO",
    "ABORTADO_POR_PRESUPUESTO",
]


class PipelineState(TypedDict, total=False):
    run_id: str
    producto_id: str
    status: PipelineStatus
    retry_count: int
    fetched_count: int
    injection_alerts: list[str]
    bundle_json: dict[str, Any]
    pending_cache_key: str | None
    validation_ok: bool
    validation_errors: list[str]
    validation_anomalies: list[str]
    validation_feedback: str | None
    process_retry_count: int
    process_draft_json: dict[str, Any] | None
    pending_process_cache_key: str | None
    chem_ok: bool
    chem_errors: list[str]
    chem_feedback: str | None
    verifier_verdict: VeredictoItem | None
    verifier_report_json: dict[str, Any] | None
    staging_sql_path: str | None
    staging_report_path: str | None
    human_decision: dict[str, Any] | None
    budget_summary: dict[str, int | float]


@dataclass
class OrchestratorRuntime:
    """Dependencias deterministas inyectadas fuera del estado serializable de LangGraph."""

    settings: PipelineSettings
    source_specs: list[SourceSpec]
    strict_real: bool = True
    prefer_deterministic_only: bool = False
    prefer_existing_sources: bool = True
    catalog_context: str | None = None
    llm_extractor: LLMExtractorFn | None = None
    process_llm_extractor: ProcessLLMExtractorFn | None = None
    verifier_llm: VerifierLLMFn | None = None
    known_fuentes_override: dict[str, Fuente] | None = None
    budget: ExecutionBudget = field(init=False)
    rate_limiter: TokenBucketRateLimiter = field(init=False)
    circuit_breaker: CircuitBreaker = field(init=False)
    cache: ContentAddressedCache = field(init=False)
    audit_trail: AuditTrail = field(init=False)
    fetched_sources: list[FetchedSource] = field(default_factory=list)
    parsed_sources: list[ParsedSource] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.budget = ExecutionBudget(
            max_steps=self.settings.max_steps_per_run,
            max_llm_calls=self.settings.max_llm_calls_per_run,
            max_cost_usd=self.settings.max_cost_usd,
        )
        self.rate_limiter = TokenBucketRateLimiter(max_rpm=self.settings.max_rpm)
        self.circuit_breaker = CircuitBreaker()
        self.cache = ContentAddressedCache(self.settings.cache_dir)
        self.audit_trail = AuditTrail(self.settings.audit_log_path)


def build_stage4_graph(runtime: OrchestratorRuntime, checkpointer: SqliteSaver):
    """Construye y compila el StateGraph cíclico de Etapa 4 con persistencia SQLite e interrupt."""

    def node_fetch_sources(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("fetch_sources")
        enforce_tool_allowlist("orchestrator", "fetch_source")

        fetched: list[FetchedSource] = []
        for spec in runtime.source_specs:
            fs = fetch_source(
                spec,
                runtime.settings.raw_dir,
                timeout_seconds=runtime.settings.http_timeout_seconds,
                prefer_existing=runtime.prefer_existing_sources,
                persist_local=False,
                supabase_url=runtime.settings.supabase_url,
                supabase_service_role_key=runtime.settings.supabase_service_role_key,
                supabase_bucket=runtime.settings.supabase_raw_bucket,
            )
            fetched.append(fs)
        runtime.fetched_sources = fetched

        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="fetch_sources",
                actor="orchestrator",
                action="fetch_source",
                status="OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={"fuentes": [f.fuente.fuente_id for f in fetched]},
            )
        )
        return {
            "fetched_count": len(fetched),
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_parse_sources(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("parse_sources")
        enforce_tool_allowlist("orchestrator", "parse_source")

        parsed: list[ParsedSource] = []
        alerts: list[str] = []
        for fs in runtime.fetched_sources:
            ps = parse_source(
                fs,
                max_source_chars=runtime.settings.max_source_chars,
                max_pdf_page_chars=runtime.settings.max_pdf_page_chars,
                max_html_lines=runtime.settings.max_html_lines,
            )
            parsed.append(ps)
            for finding in ps.injection_findings:
                alerts.append(
                    f"[{ps.fuente_id}] patrón '{finding.rule}' detectado en dato externo: {finding.snippet!r}"
                )
        runtime.parsed_sources = parsed

        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="parse_sources",
                actor="orchestrator",
                action="parse_source",
                status="ALERTA_INYECCION" if alerts else "OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={"parsed": len(parsed), "injection_alerts": len(alerts)},
            )
        )
        return {
            "injection_alerts": alerts,
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_agent1_extract(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("agent1_extract")

        result = run_agent1_data_extraction(
            producto_id=state["producto_id"],
            fetched_sources=runtime.fetched_sources,
            parsed_sources=runtime.parsed_sources,
            settings=runtime.settings,
            budget=runtime.budget,
            rate_limiter=runtime.rate_limiter,
            circuit_breaker=runtime.circuit_breaker,
            cache=runtime.cache,
            validation_feedback=state.get("validation_feedback"),
            catalog_context=runtime.catalog_context,
            llm_extractor=runtime.llm_extractor,
            prefer_deterministic_only=runtime.prefer_deterministic_only,
        )
        payload = result.bundle.model_dump(mode="json")
        out_hash = compute_sha256_bytes(result.bundle.model_dump_json().encode("utf-8"))

        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="agent1_extract",
                actor="agent1_data",
                action="extract_structured_data",
                status="OK",
                output_hash=out_hash,
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                tokens_in=result.tokens_in,
                tokens_out=result.tokens_out,
                cache_hit=result.cache_hit,
                details={
                    "used_llm": result.used_llm,
                    "retry_attempt": state.get("retry_count", 0),
                },
            )
        )
        return {
            "bundle_json": payload,
            "pending_cache_key": result.cache_key if result.used_llm else None,
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_validate_gate(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("validate_gate")
        enforce_tool_allowlist("orchestrator", "validate_staging")

        known_fuentes = {f.fuente.fuente_id: f.fuente for f in runtime.fetched_sources}
        bundle = StagingDataBundle.model_validate(state["bundle_json"])
        report: ValidationReport = validate_staging_bundle(
            bundle,
            known_fuentes=known_fuentes,
            strict_real=runtime.strict_real,
        )

        # Solo persistir en cache direccionado por SHA-256 si el Gate determinista aprobó
        pending_key = state.get("pending_cache_key")
        if report.ok and pending_key:
            runtime.cache.set(pending_key, state["bundle_json"])

        retry_count = state.get("retry_count", 0)
        next_retry = retry_count if report.ok else retry_count + 1
        status = (
            "VALIDADO_PARA_REVISION"
            if report.ok
            else ("EN_CURSO" if retry_count < runtime.settings.max_retries_per_step else "REQUIERE_REVISION_HUMANA")
        )

        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="validate_gate",
                actor="orchestrator",
                action="validate_staging",
                status="OK" if report.ok else "RECHAZADO",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={
                    "errors": report.errors,
                    "anomalies": report.anomalies_detected,
                    "retry_count": next_retry,
                },
            )
        )
        return {
            "validation_ok": report.ok,
            "validation_errors": report.errors,
            "validation_anomalies": report.anomalies_detected,
            "validation_feedback": None if report.ok else report.to_feedback_prompt(),
            "retry_count": next_retry,
            "status": status,
            "budget_summary": runtime.budget.to_dict(),
        }

    def route_after_validation(state: PipelineState) -> Literal["agent1_extract", "export_staging"]:
        if state.get("validation_ok"):
            return "export_staging"
        # Máximo `max_retries_per_step` reintentos (retry_count ya se incrementó en validate_gate)
        if state.get("retry_count", 0) <= runtime.settings.max_retries_per_step:
            return "agent1_extract"
        return "export_staging"

    def node_export_staging(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("export_staging")
        enforce_tool_allowlist("orchestrator", "export_staging_supabase")

        bundle = StagingDataBundle.model_validate(state["bundle_json"])
        report = ValidationReport(
            ok=bool(state.get("validation_ok")),
            errors=list(state.get("validation_errors", [])),
            anomalies_detected=list(state.get("validation_anomalies", [])),
        )
        artifacts = export_staging_artifacts(
            bundle,
            report,
            runtime.settings.staging_dir,
            run_id=state["run_id"],
            budget_summary=runtime.budget.to_dict(),
            injection_alerts=list(state.get("injection_alerts", [])),
        )

        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="export_staging",
                actor="orchestrator",
                action="export_staging_supabase",
                status="OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={
                    "sql_path": str(artifacts.supabase_sql_path),
                    "report_path": str(artifacts.report_md_path),
                },
            )
        )
        return {
            "staging_sql_path": str(artifacts.supabase_sql_path),
            "staging_report_path": str(artifacts.report_md_path),
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_human_review(state: PipelineState) -> PipelineState:
        enforce_tool_allowlist("orchestrator", "human_interrupt")
        # Pausa obligatoria de LangGraph: el humano revisa el informe y aprueba o rechaza
        decision = interrupt(
            {
                "mensaje": "Revisá el informe de staging y el SQL para Supabase antes de publicar.",
                "producto_id": state["producto_id"],
                "validation_ok": state.get("validation_ok", False),
                "validation_errors": state.get("validation_errors", []),
                "validation_anomalies": state.get("validation_anomalies", []),
                "injection_alerts": state.get("injection_alerts", []),
                "report_path": state.get("staging_report_path"),
                "supabase_sql_path": state.get("staging_sql_path"),
            }
        )

        approved = bool(isinstance(decision, dict) and decision.get("approved") is True)
        # Incluso si el humano responde, un borrador con validación fallida exige corrección explícita
        final_status: PipelineStatus = (
            "APROBADO_PARA_SUPABASE"
            if (approved and state.get("validation_ok"))
            else "RECHAZADO_POR_HUMANO"
        )

        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="human_review",
                actor="human",
                action="human_interrupt",
                status=final_status,
                details={"decision": decision},
            )
        )
        return {
            "human_decision": decision if isinstance(decision, dict) else {"raw": decision},
            "status": final_status,
            "budget_summary": runtime.budget.to_dict(),
        }

    graph = StateGraph(PipelineState)
    graph.add_node("fetch_sources", node_fetch_sources)
    graph.add_node("parse_sources", node_parse_sources)
    graph.add_node("agent1_extract", node_agent1_extract)
    graph.add_node("validate_gate", node_validate_gate)
    graph.add_node("export_staging", node_export_staging)
    graph.add_node("human_review", node_human_review)

    graph.add_edge(START, "fetch_sources")
    graph.add_edge("fetch_sources", "parse_sources")
    graph.add_edge("parse_sources", "agent1_extract")
    graph.add_edge("agent1_extract", "validate_gate")
    graph.add_conditional_edges(
        "validate_gate",
        route_after_validation,
        {
            "agent1_extract": "agent1_extract",
            "export_staging": "export_staging",
        },
    )
    graph.add_edge("export_staging", "human_review")
    graph.add_edge("human_review", END)

    return graph.compile(checkpointer=checkpointer)


def build_full_pipeline_graph(runtime: OrchestratorRuntime, checkpointer: SqliteSaver):
    """
    Grafo completo de Etapas 4 + 5:
    fetch -> parse -> Agent 1 ⇄ validate_data_gate -> Agent 2 ⇄ 6 chemical_verifiers ->
    Agent 3 (contexto limpio) -> export_staging (SQL Supabase completo) -> human_review (interrupt).
    """

    def _known_fuentes() -> dict[str, Fuente]:
        base = {f.fuente.fuente_id: f.fuente for f in runtime.fetched_sources}
        if runtime.known_fuentes_override:
            base.update(runtime.known_fuentes_override)
        return base

    def node_fetch_sources(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("fetch_sources")
        enforce_tool_allowlist("orchestrator", "fetch_source")
        fetched = [
            fetch_source(
                spec,
                runtime.settings.raw_dir,
                timeout_seconds=runtime.settings.http_timeout_seconds,
                prefer_existing=runtime.prefer_existing_sources,
                persist_local=False,
                supabase_url=runtime.settings.supabase_url,
                supabase_service_role_key=runtime.settings.supabase_service_role_key,
                supabase_bucket=runtime.settings.supabase_raw_bucket,
            )
            for spec in runtime.source_specs
        ]
        runtime.fetched_sources = fetched
        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="fetch_sources",
                actor="orchestrator",
                action="fetch_source",
                status="OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={"fuentes": [f.fuente.fuente_id for f in fetched]},
            )
        )
        return {"fetched_count": len(fetched), "budget_summary": runtime.budget.to_dict()}

    def node_parse_sources(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("parse_sources")
        enforce_tool_allowlist("orchestrator", "parse_source")
        parsed = []
        alerts: list[str] = []
        for fs in runtime.fetched_sources:
            ps = parse_source(
                fs,
                max_source_chars=runtime.settings.max_source_chars,
                max_pdf_page_chars=runtime.settings.max_pdf_page_chars,
                max_html_lines=runtime.settings.max_html_lines,
            )
            parsed.append(ps)
            for finding in ps.injection_findings:
                alerts.append(f"[{ps.fuente_id}] patrón '{finding.rule}': {finding.snippet!r}")
        runtime.parsed_sources = parsed
        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="parse_sources",
                actor="orchestrator",
                action="parse_source",
                status="ALERTA_INYECCION" if alerts else "OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
            )
        )
        return {"injection_alerts": alerts, "budget_summary": runtime.budget.to_dict()}

    def node_agent1_extract(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("agent1_extract")
        res = run_agent1_data_extraction(
            producto_id=state["producto_id"],
            fetched_sources=runtime.fetched_sources,
            parsed_sources=runtime.parsed_sources,
            settings=runtime.settings,
            budget=runtime.budget,
            rate_limiter=runtime.rate_limiter,
            circuit_breaker=runtime.circuit_breaker,
            cache=runtime.cache,
            validation_feedback=state.get("validation_feedback"),
            catalog_context=runtime.catalog_context,
            llm_extractor=runtime.llm_extractor,
            prefer_deterministic_only=runtime.prefer_deterministic_only,
        )
        if runtime.known_fuentes_override:
            merged = {f.fuente_id: f for f in res.bundle.fuentes}
            merged.update(runtime.known_fuentes_override)
            res.bundle.fuentes = list(merged.values())
        payload = res.bundle.model_dump(mode="json")
        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="agent1_extract",
                actor="agent1_data",
                action="extract_structured_data",
                status="OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                tokens_in=res.tokens_in,
                tokens_out=res.tokens_out,
                cache_hit=res.cache_hit,
            )
        )
        return {
            "bundle_json": payload,
            "pending_cache_key": res.cache_key if res.used_llm else None,
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_validate_data_gate(state: PipelineState) -> PipelineState:
        runtime.budget.consume_step("validate_data_gate")
        enforce_tool_allowlist("orchestrator", "validate_staging")
        bundle = StagingDataBundle.model_validate(state["bundle_json"])
        report = validate_staging_bundle(
            bundle,
            known_fuentes=_known_fuentes(),
            strict_real=runtime.strict_real,
        )
        if report.ok and state.get("pending_cache_key"):
            runtime.cache.set(state["pending_cache_key"], state["bundle_json"])
        retry_count = state.get("retry_count", 0)
        return {
            "validation_ok": report.ok,
            "validation_errors": report.errors,
            "validation_anomalies": report.anomalies_detected,
            "validation_feedback": None if report.ok else report.to_feedback_prompt(),
            "retry_count": retry_count if report.ok else retry_count + 1,
            "budget_summary": runtime.budget.to_dict(),
        }

    def route_after_data_gate(state: PipelineState) -> Literal["agent1_extract", "agent2_draft_process", "agent3_verify"]:
        if state.get("validation_ok"):
            return "agent2_draft_process"
        if state.get("retry_count", 0) <= runtime.settings.max_retries_per_step:
            return "agent1_extract"
        return "agent3_verify"

    def node_agent2_draft_process(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("agent2_draft_process")
        res = run_agent2_process_drafting(
            producto_id=state["producto_id"],
            fetched_sources=runtime.fetched_sources,
            parsed_sources=runtime.parsed_sources,
            settings=runtime.settings,
            budget=runtime.budget,
            rate_limiter=runtime.rate_limiter,
            circuit_breaker=runtime.circuit_breaker,
            cache=runtime.cache,
            chemical_feedback=state.get("chem_feedback"),
            catalog_context=runtime.catalog_context,
            llm_extractor=runtime.process_llm_extractor,
        )
        if runtime.known_fuentes_override:
            merged = {f.fuente_id: f for f in res.draft.fuentes}
            merged.update(runtime.known_fuentes_override)
            res.draft.fuentes = list(merged.values())
        payload = res.draft.model_dump(mode="json")
        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="agent2_draft_process",
                actor="agent2_process",
                action="draft_chemical_process",
                status="OK",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                tokens_in=res.tokens_in,
                tokens_out=res.tokens_out,
                cache_hit=res.cache_hit,
            )
        )
        return {
            "process_draft_json": payload,
            "pending_process_cache_key": res.cache_key if res.used_llm else None,
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_chemical_verify_gate(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("chemical_verify_gate")
        enforce_tool_allowlist("orchestrator", "verify_chemistry")
        data_bundle = StagingDataBundle.model_validate(state["bundle_json"])
        draft = ProcessDraftBundle.model_validate(state["process_draft_json"])
        suite: ChemicalVerificationSuiteReport = run_chemical_verification_suite(
            proceso=draft.proceso,
            pasos=draft.pasos,
            conexiones=draft.conexiones,
            plantas=data_bundle.plantas,
            comercio_exterior=data_bundle.comercio_exterior,
            produccion=data_bundle.produccion,
        )
        if suite.ok and state.get("pending_process_cache_key"):
            runtime.cache.set(state["pending_process_cache_key"], state["process_draft_json"])
        p_retry = state.get("process_retry_count", 0)
        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="chemical_verify_gate",
                actor="orchestrator",
                action="verify_chemistry",
                status="OK" if suite.ok else "RECHAZADO",
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                details={"errors": suite.all_errors},
            )
        )
        return {
            "chem_ok": suite.ok,
            "chem_errors": suite.all_errors,
            "chem_feedback": None if suite.ok else suite.to_feedback_prompt(),
            "process_retry_count": p_retry if suite.ok else p_retry + 1,
            "budget_summary": runtime.budget.to_dict(),
        }

    def route_after_chem_gate(state: PipelineState) -> Literal["agent2_draft_process", "agent3_verify"]:
        if state.get("chem_ok"):
            return "agent3_verify"
        if state.get("process_retry_count", 0) <= runtime.settings.max_retries_per_step:
            return "agent2_draft_process"
        return "agent3_verify"

    def node_agent3_verify(state: PipelineState) -> PipelineState:
        t0 = time.perf_counter()
        runtime.budget.consume_step("agent3_verify")
        data_bundle = StagingDataBundle.model_validate(state["bundle_json"])
        draft = (
            ProcessDraftBundle.model_validate(state["process_draft_json"])
            if state.get("process_draft_json")
            else None
        )
        data_val = ValidationReport(
            ok=bool(state.get("validation_ok")),
            errors=list(state.get("validation_errors", [])),
            anomalies_detected=list(state.get("validation_anomalies", [])),
        )
        chem_rep = (
            run_chemical_verification_suite(
                proceso=draft.proceso,
                pasos=draft.pasos,
                conexiones=draft.conexiones,
                plantas=data_bundle.plantas,
                comercio_exterior=data_bundle.comercio_exterior,
                produccion=data_bundle.produccion,
            )
            if draft is not None
            else None
        )
        res = run_agent3_independent_verification(
            data_bundle=data_bundle,
            process_draft=draft,
            parsed_sources=runtime.parsed_sources,
            data_validation=data_val,
            chem_report=chem_rep,
            settings=runtime.settings,
            budget=runtime.budget,
            rate_limiter=runtime.rate_limiter,
            circuit_breaker=runtime.circuit_breaker,
            llm_verifier=runtime.verifier_llm,
            prefer_deterministic_only=runtime.prefer_deterministic_only,
        )
        next_status: PipelineStatus = (
            "VALIDADO_PARA_REVISION"
            if res.report.veredicto_global == "APROBADO"
            else "REQUIERE_REVISION_HUMANA"
        )
        runtime.audit_trail.record(
            AuditEvent(
                run_id=state["run_id"],
                node="agent3_verify",
                actor="agent3_verifier",
                action="audit_claim",
                status=res.report.veredicto_global,
                latency_ms=round((time.perf_counter() - t0) * 1000, 2),
                tokens_in=res.tokens_in,
                tokens_out=res.tokens_out,
                details={"deterministic_override": res.deterministic_override},
            )
        )
        return {
            "verifier_verdict": res.report.veredicto_global,
            "verifier_report_json": res.report.model_dump(mode="json"),
            "status": next_status,
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_export_staging(state: PipelineState) -> PipelineState:
        runtime.budget.consume_step("export_staging")
        enforce_tool_allowlist("orchestrator", "export_staging_supabase")
        data_bundle = StagingDataBundle.model_validate(state["bundle_json"])
        draft = (
            ProcessDraftBundle.model_validate(state["process_draft_json"])
            if state.get("process_draft_json")
            else None
        )
        v_report = (
            VerifierAuditReport.model_validate(state["verifier_report_json"])
            if state.get("verifier_report_json")
            else None
        )
        val_rep = ValidationReport(
            ok=bool(state.get("validation_ok")) and bool(state.get("chem_ok", True)),
            errors=list(state.get("validation_errors", [])) + list(state.get("chem_errors", [])),
            anomalies_detected=list(state.get("validation_anomalies", [])),
        )
        artifacts = export_staging_artifacts(
            data_bundle,
            val_rep,
            runtime.settings.staging_dir,
            run_id=state["run_id"],
            budget_summary=runtime.budget.to_dict(),
            injection_alerts=list(state.get("injection_alerts", [])),
            process_draft=draft,
            verifier_report=v_report,
        )
        return {
            "staging_sql_path": str(artifacts.supabase_sql_path),
            "staging_report_path": str(artifacts.report_md_path),
            "budget_summary": runtime.budget.to_dict(),
        }

    def node_human_review(state: PipelineState) -> PipelineState:
        enforce_tool_allowlist("orchestrator", "human_interrupt")
        decision = interrupt(
            {
                "mensaje": "Revisá el informe de staging, el dictamen del Agente 3 y el SQL para Supabase.",
                "producto_id": state["producto_id"],
                "validation_ok": state.get("validation_ok", False),
                "chem_ok": state.get("chem_ok", False),
                "verifier_verdict": state.get("verifier_verdict"),
                "report_path": state.get("staging_report_path"),
                "supabase_sql_path": state.get("staging_sql_path"),
            }
        )
        approved = bool(isinstance(decision, dict) and decision.get("approved") is True)
        all_gates_ok = (
            bool(state.get("validation_ok"))
            and bool(state.get("chem_ok"))
            and state.get("verifier_verdict") == "APROBADO"
        )
        final_status: PipelineStatus = (
            "APROBADO_PARA_SUPABASE" if (approved and all_gates_ok) else "RECHAZADO_POR_HUMANO"
        )
        return {
            "human_decision": decision if isinstance(decision, dict) else {"raw": decision},
            "status": final_status,
            "budget_summary": runtime.budget.to_dict(),
        }

    graph = StateGraph(PipelineState)
    graph.add_node("fetch_sources", node_fetch_sources)
    graph.add_node("parse_sources", node_parse_sources)
    graph.add_node("agent1_extract", node_agent1_extract)
    graph.add_node("validate_data_gate", node_validate_data_gate)
    graph.add_node("agent2_draft_process", node_agent2_draft_process)
    graph.add_node("chemical_verify_gate", node_chemical_verify_gate)
    graph.add_node("agent3_verify", node_agent3_verify)
    graph.add_node("export_staging", node_export_staging)
    graph.add_node("human_review", node_human_review)

    graph.add_edge(START, "fetch_sources")
    graph.add_edge("fetch_sources", "parse_sources")
    graph.add_edge("parse_sources", "agent1_extract")
    graph.add_edge("agent1_extract", "validate_data_gate")
    graph.add_conditional_edges(
        "validate_data_gate",
        route_after_data_gate,
        {
            "agent1_extract": "agent1_extract",
            "agent2_draft_process": "agent2_draft_process",
            "agent3_verify": "agent3_verify",
        },
    )
    graph.add_edge("agent2_draft_process", "chemical_verify_gate")
    graph.add_conditional_edges(
        "chemical_verify_gate",
        route_after_chem_gate,
        {
            "agent2_draft_process": "agent2_draft_process",
            "agent3_verify": "agent3_verify",
        },
    )
    graph.add_edge("agent3_verify", "export_staging")
    graph.add_edge("export_staging", "human_review")
    graph.add_edge("human_review", END)

    return graph.compile(checkpointer=checkpointer)


def create_sqlite_checkpointer(db_path: Path) -> tuple[sqlite3.Connection, SqliteSaver]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    saver = SqliteSaver(conn)
    saver.setup()
    return conn, saver


def run_pipeline_until_interrupt(
    *,
    producto_id: str,
    runtime: OrchestratorRuntime,
    thread_id: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Ejecuta el orquestador hasta la pausa humana `interrupt()` guardando estado en SQLite."""
    run_id = thread_id or f"{producto_id}-{uuid.uuid4().hex[:8]}"
    conn, saver = create_sqlite_checkpointer(runtime.settings.checkpoint_db_path)
    try:
        app = build_stage4_graph(runtime, saver)
        config = {"configurable": {"thread_id": run_id}}
        initial: PipelineState = {
            "run_id": run_id,
            "producto_id": producto_id,
            "status": "EN_CURSO",
            "retry_count": 0,
            "injection_alerts": [],
            "validation_errors": [],
            "validation_anomalies": [],
            "validation_feedback": None,
        }
        result = app.invoke(initial, config=config)
        return run_id, result
    finally:
        conn.close()


def resume_pipeline_after_review(
    *,
    thread_id: str,
    runtime: OrchestratorRuntime,
    approved: bool,
    comment: str = "",
) -> dict[str, Any]:
    """Reanuda un thread pausado en `human_review` con la decisión explícita del usuario."""
    conn, saver = create_sqlite_checkpointer(runtime.settings.checkpoint_db_path)
    try:
        app = build_stage4_graph(runtime, saver)
        config = {"configurable": {"thread_id": thread_id}}
        return app.invoke(
            Command(resume={"approved": approved, "comment": comment}),
            config=config,
        )
    finally:
        conn.close()


def run_full_pipeline_until_interrupt(
    *,
    producto_id: str,
    runtime: OrchestratorRuntime,
    thread_id: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Ejecuta el grafo completo de Etapas 4+5 (Agentes 1, 2 y 3 + verificadores) hasta interrupt()."""
    run_id = thread_id or f"{producto_id}-full-{uuid.uuid4().hex[:8]}"
    conn, saver = create_sqlite_checkpointer(runtime.settings.checkpoint_db_path)
    try:
        app = build_full_pipeline_graph(runtime, saver)
        config = {"configurable": {"thread_id": run_id}}
        initial: PipelineState = {
            "run_id": run_id,
            "producto_id": producto_id,
            "status": "EN_CURSO",
            "retry_count": 0,
            "process_retry_count": 0,
            "injection_alerts": [],
            "validation_errors": [],
            "validation_anomalies": [],
            "validation_feedback": None,
            "chem_errors": [],
            "chem_feedback": None,
        }
        result = app.invoke(initial, config=config)
        return run_id, result
    finally:
        conn.close()


def resume_full_pipeline_after_review(
    *,
    thread_id: str,
    runtime: OrchestratorRuntime,
    approved: bool,
    comment: str = "",
) -> dict[str, Any]:
    """Reanuda un thread completo (Etapas 4+5) tras la revisión humana."""
    conn, saver = create_sqlite_checkpointer(runtime.settings.checkpoint_db_path)
    try:
        app = build_full_pipeline_graph(runtime, saver)
        config = {"configurable": {"thread_id": thread_id}}
        return app.invoke(
            Command(resume={"approved": approved, "comment": comment}),
            config=config,
        )
    finally:
        conn.close()
