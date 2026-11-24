"""Evaluación cerrada contra el Set de Oro de Aluminio (data/golden/aluminio.golden.json)."""

from __future__ import annotations

import json
from pathlib import Path

from atlas_pipeline.cli import aluminio_official_specs
from atlas_pipeline.config import PipelineSettings, default_repo_root
from atlas_pipeline.graph import OrchestratorRuntime, run_pipeline_until_interrupt
from atlas_pipeline.nodes.staging_export import render_supabase_upsert_sql
from atlas_pipeline.nodes.validator import validate_staging_bundle
from atlas_pipeline.schemas import StagingDataBundle


def _load_golden_raw() -> dict:
    golden_path = default_repo_root() / "data" / "golden" / "aluminio.golden.json"
    assert golden_path.exists(), f"Falta Set de Oro en {golden_path}"
    return json.loads(golden_path.read_text(encoding="utf-8"))


def test_golden_aluminio_passes_strict_python_validator_and_generates_supabase_sql() -> None:
    """Verifica paridad 1:1 entre el Set de Oro TS/Zod y el Gate Pydantic/SQL de Python."""
    golden = _load_golden_raw()
    bundle = StagingDataBundle.model_validate(
        {
            "producto_id": "aluminio",
            "fuentes": golden["fuentes"],
            "empresas": golden["empresas"],
            "plantas": golden["plantas"],
            "produccion": golden["produccion"],
            "comercio_exterior": golden["comercio_exterior"],
        }
    )

    report = validate_staging_bundle(bundle, strict_real=True)
    assert report.ok, f"El Set de Oro falló validación Python: {report.errors} / {report.anomalies_detected}"
    assert len(bundle.fuentes) == 8
    assert len(bundle.produccion) == 5
    assert len(bundle.comercio_exterior) == 10

    sql = render_supabase_upsert_sql(bundle)
    assert "INSERT INTO public.fuentes" in sql
    assert "INSERT INTO public.empresas" in sql
    assert "INSERT INTO public.plantas" in sql
    assert "INSERT INTO public.produccion" in sql
    assert "INSERT INTO public.comercio_exterior" in sql
    assert "ON CONFLICT (registro_id) DO UPDATE" in sql


def test_orchestrator_deterministic_fastpath_matches_golden_comex(tmp_path: Path) -> None:
    """
    Ejecuta el grafo completo de Etapa 4 en modo 0 tokens sobre las fuentes oficiales crudas
    (INDEC + UN Comtrade) y verifica coincidencia exacta contra el Set de Oro de Aluminio.
    """
    repo_raw = default_repo_root() / "data" / "raw"
    specs = aluminio_official_specs(repo_raw)
    if not all(s.local_path and s.local_path.exists() for s in specs):
        # En CI sin archivos raw descargados, este benchmark se omite sin romper el resto de la suite
        return

    golden = _load_golden_raw()
    golden_comex_by_id = {r["registro_id"]: r for r in golden["comercio_exterior"]}

    settings = PipelineSettings(repo_root=tmp_path)
    runtime = OrchestratorRuntime(
        settings=settings,
        source_specs=specs,
        strict_real=True,
        prefer_deterministic_only=True,
    )

    _run_id, paused_state = run_pipeline_until_interrupt(
        producto_id="aluminio",
        runtime=runtime,
    )

    assert paused_state["validation_ok"] is True
    assert paused_state["budget_summary"]["llm_calls_used"] == 0
    assert "__interrupt__" in paused_state

    extracted_bundle = StagingDataBundle.model_validate(paused_state["bundle_json"])
    assert len(extracted_bundle.comercio_exterior) == len(golden_comex_by_id)

    for rec in extracted_bundle.comercio_exterior:
        expected = golden_comex_by_id[rec.registro_id]
        assert rec.anio == expected["anio"]
        assert rec.ncm_codigo == expected["ncm_codigo"]
        assert rec.exportacion.estado == expected["exportacion"]["estado"]
        assert rec.exportacion.valor == expected["exportacion"]["valor"]
        assert rec.importacion.estado == expected["importacion"]["estado"]
        assert rec.importacion.valor == expected["importacion"]["valor"]
        assert rec.saldo_comercial.estado == expected["saldo_comercial"]["estado"]
        assert rec.saldo_comercial.valor == expected["saldo_comercial"]["valor"]
        assert rec.procedencia.hash == expected["procedencia"]["hash"]
