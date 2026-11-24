"""Evaluación cerrada de Etapa 5: Agente 2, Agente 3 (contexto limpio) y tasa de falsos aprobados = 0%."""

from __future__ import annotations

import copy
import json
from pathlib import Path

from atlas_pipeline.agents.verifier_agent import (
    build_clean_verifier_prompt,
    run_agent3_independent_verification,
)
from atlas_pipeline.chem.verifiers import run_chemical_verification_suite
from atlas_pipeline.config import PipelineSettings, default_repo_root
from atlas_pipeline.graph import (
    OrchestratorRuntime,
    resume_full_pipeline_after_review,
    run_full_pipeline_until_interrupt,
)
from atlas_pipeline.harness.budget import CircuitBreaker, ExecutionBudget, TokenBucketRateLimiter
from atlas_pipeline.nodes.validator import validate_staging_bundle
from atlas_pipeline.schemas import (
    ProcessDraftBundle,
    StagingDataBundle,
    VerificationVerdict,
    VerifierAuditReport,
)
from atlas_pipeline.tools.fetcher import SourceSpec


def _load_golden_bundles() -> tuple[StagingDataBundle, ProcessDraftBundle]:
    raw = json.loads(
        (default_repo_root() / "data" / "golden" / "aluminio.golden.json").read_text(
            encoding="utf-8"
        )
    )
    data_bundle = StagingDataBundle.model_validate(
        {
            "producto_id": "aluminio",
            "fuentes": raw["fuentes"],
            "empresas": raw["empresas"],
            "plantas": raw["plantas"],
            "produccion": raw["produccion"],
            "comercio_exterior": raw["comercio_exterior"],
            "notas_auditoria": ["RAZONAMIENTO_SECRETO_AGENTE_1_NO_FILTRAR"],
        }
    )
    process_draft = ProcessDraftBundle.model_validate(
        {
            "producto_id": "aluminio",
            "fuentes": raw["fuentes"],
            "proceso": raw["procesos"][0],
            "pasos": raw["pasos_proceso"],
            "conexiones": raw["conexiones_proceso"],
            "notas_tecnicas": ["RAZONAMIENTO_SECRETO_AGENTE_2_NO_FILTRAR"],
        }
    )
    return data_bundle, process_draft


def test_agent3_clean_context_excludes_agent1_and_agent2_reasoning() -> None:
    """Garantiza aislamiento de contexto: Agente 3 nunca ve notas ni razonamientos de Agentes 1 y 2."""
    data_bundle, process_draft = _load_golden_bundles()
    val_rep = validate_staging_bundle(data_bundle, strict_real=True)
    chem_rep = run_chemical_verification_suite(
        proceso=process_draft.proceso,
        pasos=process_draft.pasos,
        conexiones=process_draft.conexiones,
        plantas=data_bundle.plantas,
        comercio_exterior=data_bundle.comercio_exterior,
        produccion=data_bundle.produccion,
    )
    prompt = build_clean_verifier_prompt(
        data_bundle=data_bundle,
        process_draft=process_draft,
        parsed_sources=[],
        data_validation=val_rep,
        chem_report=chem_rep,
    )
    assert "RAZONAMIENTO_SECRETO_AGENTE_1_NO_FILTRAR" not in prompt
    assert "RAZONAMIENTO_SECRETO_AGENTE_2_NO_FILTRAR" not in prompt
    assert "aluminio-hall-heroult" in prompt


def test_agent3_hard_guardrail_zero_false_approval_rate_on_broken_chemistry(tmp_path: Path) -> None:
    """
    Eval adversaria: aunque un LLM Agente 3 permisivo intente devolver APROBADO frente a
    una reacción desbalanceada o energía absurda, el guardrail determinista fuerza RECHAZADO
    garantizando 0% de falsos aprobados y 100% de rechazo en casos inválidos.
    """
    data_bundle, valid_process = _load_golden_bundles()
    val_rep = validate_staging_bundle(data_bundle, strict_real=True)

    # Construir 3 mutaciones químicas inválidas
    bad_reaction = copy.deepcopy(valid_process)
    bad_reaction.proceso.reaccion_global = "2 Al2O3 + 2 C -> 4 Al + 3 CO2"

    bad_stoich = copy.deepcopy(valid_process)
    next(p for p in bad_stoich.pasos if p.paso_id == "al-p4-electrolisis-hall-heroult").reactivos[0].cantidad = 1.40

    bad_energy = copy.deepcopy(valid_process)
    bad_energy.proceso.energia_especifica.valor = 95.0  # type: ignore[union-attr]

    def lenient_hallucinating_llm(_sys: str, _usr: str, _model: str):
        return (
            VerifierAuditReport(
                veredicto_global="APROBADO",
                items=[
                    VerificationVerdict(
                        item_id="proceso:aluminio-hall-heroult",
                        categoria="proceso",
                        veredicto="APROBADO",
                        motivo="Parece correcto a simple vista.",
                        citas_verificadas=True,
                    )
                ],
                resumen="Aprobado erróneamente por un verificador permisivo.",
            ),
            100,
            50,
        )

    settings = PipelineSettings(repo_root=tmp_path, max_rpm=60)
    false_approvals = 0
    rejections = 0

    for mutated in [bad_reaction, bad_stoich, bad_energy]:
        chem_rep = run_chemical_verification_suite(
            proceso=mutated.proceso,
            pasos=mutated.pasos,
            conexiones=mutated.conexiones,
            plantas=data_bundle.plantas,
            comercio_exterior=data_bundle.comercio_exterior,
            produccion=data_bundle.produccion,
        )
        res = run_agent3_independent_verification(
            data_bundle=data_bundle,
            process_draft=mutated,
            parsed_sources=[],
            data_validation=val_rep,
            chem_report=chem_rep,
            settings=settings,
            budget=ExecutionBudget(),
            rate_limiter=TokenBucketRateLimiter(60),
            circuit_breaker=CircuitBreaker(),
            llm_verifier=lenient_hallucinating_llm,
        )
        assert res.deterministic_override is True
        if res.report.veredicto_global == "APROBADO":
            false_approvals += 1
        elif res.report.veredicto_global == "RECHAZADO":
            rejections += 1

    assert false_approvals == 0
    assert rejections == 3


def test_full_stage5_graph_agent2_retry_and_agent3_approval_on_golden(tmp_path: Path) -> None:
    """
    Flujo end-to-end Etapa 5:
    Agente 1 -> Gate datos -> Agente 2 (falla intento 1 con reacción desbalanceada ->
    reintenta con feedback químico y corrige en intento 2) -> 6 Verificadores químicos OK ->
    Agente 3 independiente (contexto limpio) APROBADO -> SQL completo Supabase (incluye procesos/pasos/conexiones) ->
    interrupt() -> resume humano.
    """
    data_bundle, valid_process = _load_golden_bundles()
    raw_file = tmp_path / "data" / "raw" / "aluminio_ref.txt"
    raw_file.parent.mkdir(parents=True, exist_ok=True)
    raw_file.write_text("Aluminio primario Hall-Héroult 2 Al2O3 + 3 C -> 4 Al + 3 CO2\n", encoding="utf-8")

    spec = SourceSpec(
        fuente_id="aluar-eeff-2025",
        nombre=data_bundle.fuentes[0].nombre,
        organismo=data_bundle.fuentes[0].organismo,
        tipo="empresa",
        url=data_bundle.fuentes[0].url,
        filename="aluminio_ref.txt",
        formato="txt",
        local_path=raw_file,
        fecha_descarga="2026-11-24",
    )

    # Ajustar hashes del bundle a los de las fuentes conocidas (se inyectan como catálogo conocido)
    agent2_calls = {"count": 0}

    def sim_agent1(_sys: str, _usr: str, _model: str):
        return copy.deepcopy(data_bundle), 180, 120

    def sim_agent2(_sys: str, user_prompt: str, _model: str):
        agent2_calls["count"] += 1
        draft = copy.deepcopy(valid_process)
        if agent2_calls["count"] == 1:
            # Intento 1: error estequiométrico intencional en la reacción global
            draft.proceso.reaccion_global = "2 Al2O3 + 2 C -> 4 Al + 3 CO2"
        else:
            # Verificar que el feedback del verificador químico llegó al Agente 2
            assert "C desbalanceado" in user_prompt
        return draft, 260, 210

    def sim_agent3(_sys: str, user_prompt: str, _model: str):
        # Aislamiento de contexto garantizado en vivo
        assert "RAZONAMIENTO_SECRETO_AGENTE_1_NO_FILTRAR" not in user_prompt
        assert "RAZONAMIENTO_SECRETO_AGENTE_2_NO_FILTRAR" not in user_prompt
        return (
            VerifierAuditReport(
                veredicto_global="APROBADO",
                items=[
                    VerificationVerdict(
                        item_id="datos:aluminio",
                        categoria="datos",
                        veredicto="APROBADO",
                        motivo="Citas, hashes SHA-256 y cifras verificadas contra Set de Oro.",
                        citas_verificadas=True,
                    ),
                    VerificationVerdict(
                        item_id="proceso:aluminio-hall-heroult",
                        categoria="proceso",
                        veredicto="APROBADO",
                        motivo="Las 6 verificaciones químicas deterministas aprobaron.",
                        citas_verificadas=True,
                    ),
                ],
                resumen="Auditoría independiente completa sin hallazgos bloqueantes.",
            ),
            200,
            90,
        )

    settings = PipelineSettings(repo_root=tmp_path, max_retries_per_step=2, max_rpm=60)
    runtime = OrchestratorRuntime(
        settings=settings,
        source_specs=[spec],
        llm_extractor=sim_agent1,
        process_llm_extractor=sim_agent2,
        verifier_llm=sim_agent3,
        known_fuentes_override={f.fuente_id: f for f in data_bundle.fuentes},
    )

    run_id, paused_state = run_full_pipeline_until_interrupt(
        producto_id="aluminio",
        runtime=runtime,
    )

    assert agent2_calls["count"] == 2
    assert paused_state["validation_ok"] is True
    assert paused_state["chem_ok"] is True
    assert paused_state["verifier_verdict"] == "APROBADO"
    assert "__interrupt__" in paused_state

    sql_text = Path(paused_state["staging_sql_path"]).read_text(encoding="utf-8")
    assert "INSERT INTO public.procesos" in sql_text
    assert "INSERT INTO public.pasos_proceso" in sql_text
    assert "INSERT INTO public.conexiones_proceso" in sql_text

    final_state = resume_full_pipeline_after_review(
        thread_id=run_id,
        runtime=runtime,
        approved=True,
        comment="Etapa 5 aprobada para Supabase",
    )
    assert final_state["status"] == "APROBADO_PARA_SUPABASE"
