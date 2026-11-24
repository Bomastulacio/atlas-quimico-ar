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
from atlas_pipeline.config import PipelineSettings
from atlas_pipeline.harness.budget import CircuitBreaker, ExecutionBudget, TokenBucketRateLimiter
from atlas_pipeline.harness.cache import ContentAddressedCache, compute_sha256_bytes
from atlas_pipeline.harness.security import enforce_tool_allowlist
from atlas_pipeline.harness.telemetry import AuditEvent, AuditTrail
from atlas_pipeline.nodes.staging_export import export_staging_artifacts
from atlas_pipeline.nodes.validator import ValidationReport, validate_staging_bundle
from atlas_pipeline.schemas import StagingDataBundle
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
    llm_extractor: LLMExtractorFn | None = None
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
            ps = parse_source(fs)
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
