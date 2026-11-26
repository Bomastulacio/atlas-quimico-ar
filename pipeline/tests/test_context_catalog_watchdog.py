"""Tests de contexto ampliado (Gemini 4), catálogo multi-producto, allowlist y watchdog SHA-256."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from atlas_pipeline.agents.data_agent import run_agent1_data_extraction
from atlas_pipeline.cli import main as cli_main
from atlas_pipeline.config import PipelineSettings, default_repo_root
from atlas_pipeline.harness.budget import CircuitBreaker, ExecutionBudget, TokenBucketRateLimiter
from atlas_pipeline.harness.cache import ContentAddressedCache, compute_sha256_bytes
from atlas_pipeline.harness.gemini_client import assemble_context_blocks
from atlas_pipeline.harness.security import fence_untrusted_content, validate_source_url
from atlas_pipeline.schemas import StagingDataBundle
from atlas_pipeline.tools.catalog import (
    build_product_catalog_context,
    list_validated_products,
    resolve_product_source_specs,
)
from atlas_pipeline.tools.fetcher import FetchedSource, SourceSpec
from atlas_pipeline.tools.parsers import parse_source
from atlas_pipeline.tools.watchdog import run_source_watchdog


def test_expanded_context_settings_and_no_premature_truncation() -> None:
    settings = PipelineSettings()
    assert settings.max_source_chars >= 120_000
    assert settings.max_total_context_chars >= 480_000
    assert settings.max_pdf_page_chars >= 12_000
    assert settings.max_html_lines >= 2_000
    assert settings.max_output_tokens >= 16_384

    # Antes de la ampliación, 50.000 caracteres se truncaban a 18.000
    large_text = "fila_oficial,2024,12345\n" * 2_100
    assert len(large_text) > 50_000
    fenced, findings = fence_untrusted_content(
        large_text,
        fuente_id="fuente-larga",
        url="https://datos.energia.gob.ar/test.csv",
        content_hash="sha256:" + "a" * 64,
    )
    assert findings == []
    assert "TRUNCADO POR LÍMITE DE CONTEXTO" not in fenced
    assert len(fenced) > 50_000


def test_assemble_context_blocks_balances_budget_across_sources() -> None:
    b1 = "<untrusted_source id='1'>\n" + ("A" * 15_000) + "\n</untrusted_source>"
    b2 = "<untrusted_source id='2'>\n" + ("B" * 15_000) + "\n</untrusted_source>"
    assembled = assemble_context_blocks([b1, b2], max_total_chars=12_000)
    assert len(assembled) <= 12_000
    assert "<untrusted_source id='1'>" in assembled
    assert "<untrusted_source id='2'>" in assembled
    assert "AAAAA" in assembled
    assert "BBBBB" in assembled


def test_all_validated_fuentes_and_new_scientific_apis_pass_allowlist() -> None:
    validated_dir = default_repo_root() / "data" / "validated"
    fuentes = json.loads((validated_dir / "fuentes.json").read_text(encoding="utf-8"))
    assert len(fuentes) >= 48
    for f in fuentes:
        assert validate_source_url(f["url"]) == f["url"]

    for url in (
        "https://datos.energia.gob.ar/api/3/action/package_show?id=bioetanol",
        "https://datos.magyp.gob.ar/dataset/estimaciones-agricolas",
        "https://datos.mineria.gob.ar/dataset/litio",
        "https://api.bcra.gob.ar/estadisticas/v2.0/datosvariable/4",
        "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/methanol/JSON",
        "https://webbook.nist.gov/cgi/cbook.cgi?ID=C67561",
        "https://api.openalex.org/works?search=hall+heroult",
        "https://api.crossref.org/works",
    ):
        assert validate_source_url(url) == url

    with pytest.raises(ValueError, match="fuera de la lista blanca"):
        validate_source_url("https://sitio-no-auditado.example/datos.csv")


def test_catalog_resolves_all_11_products_and_canonical_context() -> None:
    validated_dir = default_repo_root() / "data" / "validated"
    entries = list_validated_products(validated_dir)
    ids = {e.producto_id for e in entries}
    assert len(entries) >= 11
    for expected in (
        "aluminio",
        "litio",
        "urea",
        "petroquimica",
        "soja",
        "biodiesel",
        "algodon",
        "metanol",
        "polipropileno",
        "bioetanol-maiz",
        "bioetanol-cana",
    ):
        assert expected in ids
        specs = resolve_product_source_specs(validated_dir=validated_dir, producto_id=expected)
        assert len(specs) >= 1, f"{expected} debe resolver al menos 1 fuente"

    ctx_metanol = build_product_catalog_context(validated_dir, "metanol")
    assert ctx_metanol is not None
    assert "CH3OH" in ctx_metanol
    assert "58035" in ctx_metanol


def test_agent1_receives_canonical_catalog_context(tmp_path: Path) -> None:
    settings = PipelineSettings(repo_root=tmp_path)
    raw = b"anio,valor\n2024,100\n"
    spec = SourceSpec(
        fuente_id="se-test-csv",
        nombre="Serie Energía Test",
        organismo="Secretaría de Energía",
        tipo="oficial",
        url="https://datos.energia.gob.ar/test.csv",
        filename="test.csv",
        formato="csv",
    )
    from atlas_pipeline.schemas import Fuente

    digest = compute_sha256_bytes(raw)
    fs = FetchedSource(
        spec=spec,
        raw_path=None,
        raw_bytes=raw,
        sha256_hash=digest,
        size_bytes=len(raw),
        fuente=Fuente(
            fuente_id=spec.fuente_id,
            nombre=spec.nombre,
            organismo=spec.organismo,
            tipo="oficial",
            url=spec.url,
            fecha_descarga="2026-11-26",
            hash=digest,
        ),
        from_local_cache=False,
    )
    ps = parse_source(fs, max_source_chars=settings.max_source_chars)
    seen_prompt: list[str] = []

    def fake_llm(_sys: str, usr: str, _model: str):
        seen_prompt.append(usr)
        return StagingDataBundle(producto_id="metanol", fuentes=[fs.fuente]), 120, 40

    run_agent1_data_extraction(
        producto_id="metanol",
        fetched_sources=[fs],
        parsed_sources=[ps],
        settings=settings,
        budget=ExecutionBudget(max_steps=10, max_llm_calls=5, max_cost_usd=0.0),
        rate_limiter=TokenBucketRateLimiter(max_rpm=60),
        circuit_breaker=CircuitBreaker(),
        cache=ContentAddressedCache(tmp_path / "cache"),
        catalog_context='{"producto_id": "metanol", "provincia_id": "58"}',
        llm_extractor=fake_llm,
    )
    assert len(seen_prompt) == 1
    assert "CONTEXTO DE CATÁLOGO EXISTENTE" in seen_prompt[0]
    assert '"provincia_id": "58"' in seen_prompt[0]


def test_watchdog_detects_unchanged_changed_broken_and_blocked(tmp_path: Path) -> None:
    validated_dir = tmp_path / "validated"
    state_dir = tmp_path / "state"
    validated_dir.mkdir(parents=True)

    same_bytes = b"anio,valor\n2024,10\n"
    same_hash = compute_sha256_bytes(same_bytes)

    (validated_dir / "fuentes.json").write_text(
        json.dumps(
            [
                {
                    "fuente_id": "f-same",
                    "nombre": "Sin cambios",
                    "organismo": "INDEC",
                    "tipo": "oficial",
                    "url": "https://apis.datos.gob.ar/same.csv",
                    "fecha_descarga": "2026-11-26",
                    "hash": same_hash,
                },
                {
                    "fuente_id": "f-changed",
                    "nombre": "Actualizada",
                    "organismo": "Secretaría de Energía",
                    "tipo": "oficial",
                    "url": "https://datos.energia.gob.ar/new.csv",
                    "fecha_descarga": "2026-11-26",
                    "hash": "sha256:" + "0" * 64,
                },
                {
                    "fuente_id": "f-broken",
                    "nombre": "Caída",
                    "organismo": "UN Comtrade",
                    "tipo": "oficial",
                    "url": "https://comtradeapi.un.org/down.json",
                    "fecha_descarga": "2026-11-26",
                    "hash": "sha256:" + "1" * 64,
                },
                {
                    "fuente_id": "f-blocked",
                    "nombre": "Dominio no permitido",
                    "organismo": "Desconocido",
                    "tipo": "oficial",
                    "url": "https://dominio-no-permitido.example/x.csv",
                    "fecha_descarga": "2026-11-26",
                    "hash": "sha256:" + "2" * 64,
                },
            ]
        ),
        encoding="utf-8",
    )
    (validated_dir / "produccion.json").write_text(
        json.dumps(
            [
                {"producto_id": "metanol", "procedencia": {"fuente_id": "f-changed"}},
                {"producto_id": "aluminio", "procedencia": {"fuente_id": "f-same"}},
            ]
        ),
        encoding="utf-8",
    )

    def fake_getter(url: str, _timeout: float) -> tuple[int, bytes]:
        if "same.csv" in url:
            return 200, same_bytes
        if "new.csv" in url:
            return 200, b"anio,valor\n2025,20\n"
        return 503, b"service unavailable"

    report = run_source_watchdog(
        validated_dir=validated_dir,
        state_dir=state_dir,
        http_getter=fake_getter,
    )
    assert report.total_checked == 4
    assert report.unchanged == 1
    assert report.changed == 1
    assert report.broken == 1
    assert report.blocked_domain == 1
    assert report.affected_products == ["metanol"]
    assert (state_dir / "watchdog_latest.json").exists()
    assert (state_dir / "watchdog_latest.md").exists()
    assert "f-changed" in (state_dir / "watchdog_latest.md").read_text(encoding="utf-8")


def test_cli_list_products_outputs_validated_catalog(capsys: pytest.CaptureFixture[str]) -> None:
    rc = cli_main(["list-products"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert len(payload) >= 11
    assert any(item["producto_id"] == "metanol" for item in payload)
