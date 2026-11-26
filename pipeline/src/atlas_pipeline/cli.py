"""CLI offline del pipeline LangGraph (multi-producto + watchdog SHA-256 para crons)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from atlas_pipeline.config import PipelineSettings
from atlas_pipeline.graph import (
    OrchestratorRuntime,
    resume_full_pipeline_after_review,
    resume_pipeline_after_review,
    run_full_pipeline_until_interrupt,
    run_pipeline_until_interrupt,
)
from atlas_pipeline.tools.catalog import (
    build_product_catalog_context,
    list_validated_products,
    resolve_product_source_specs,
)
from atlas_pipeline.tools.fetcher import SourceSpec
from atlas_pipeline.tools.watchdog import run_source_watchdog


def aluminio_official_specs(raw_dir: Path) -> list[SourceSpec]:
    """Fuentes oficiales locales ya descargadas del caso modelo de Aluminio (Etapa 3)."""
    return [
        SourceSpec(
            fuente_id="indec-comex-aluminio-2024",
            nombre="Series de Tiempo INDEC: comercio exterior de aluminio y sus manufacturas (162.1 / 163.1 / 164.1)",
            organismo="INDEC / datos.gob.ar",
            tipo="oficial",
            url="https://apis.datos.gob.ar/series/api/series/?ids=162.1_XUMINIORAS_0_0_23,163.1_MUMINIORAS_0_0_23,164.1_SLUMINIRAS_0_0_24&start_date=2019-01-01&format=csv",
            filename="datosgob_indec_aluminio_comex_anual.csv",
            formato="csv",
            local_path=raw_dir / "datosgob_indec_aluminio_comex_anual.csv",
            fecha_descarga="2026-11-24",
        ),
        SourceSpec(
            fuente_id="uncomtrade-ar-alumina-2023",
            nombre="UN Comtrade: importaciones de Argentina HS 281820 (Alúmina) y HS 7601 (Aluminio en bruto) 2023",
            organismo="UN Comtrade (Naciones Unidas)",
            tipo="oficial",
            url="https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=32&period=2023&partnerCode=0&partner2Code=0&customsCode=C00&motCode=0&cmdCode=7601,281820",
            filename="uncomtrade_ar_7601_281820_2023.json",
            formato="json",
            local_path=raw_dir / "uncomtrade_ar_7601_281820_2023.json",
            fecha_descarga="2026-11-24",
        ),
        SourceSpec(
            fuente_id="uncomtrade-ar-alumina-2024",
            nombre="UN Comtrade: importaciones de Argentina HS 281820 (Alúmina) y HS 7601 (Aluminio en bruto) 2024",
            organismo="UN Comtrade (Naciones Unidas)",
            tipo="oficial",
            url="https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=32&period=2024&partnerCode=0&partner2Code=0&customsCode=C00&motCode=0&cmdCode=7601,281820",
            filename="uncomtrade_ar_7601_281820_2024.json",
            formato="json",
            local_path=raw_dir / "uncomtrade_ar_7601_281820_2024.json",
            fecha_descarga="2026-11-24",
        ),
    ]


def _run_for_product(
    *,
    producto_id: str,
    settings: PipelineSettings,
    deterministic_only: bool,
    full_pipeline: bool,
    only_official: bool,
    live_fetch: bool,
    thread_id: str | None = None,
) -> dict[str, Any]:
    only_types = {"oficial"} if only_official else None
    specs = resolve_product_source_specs(
        validated_dir=settings.validated_dir,
        producto_id=producto_id,
        raw_dir=settings.raw_dir,
        only_types=only_types,
    )
    if not specs:
        raise ValueError(f"No se encontraron fuentes registradas para el producto '{producto_id}'.")

    catalog_context = build_product_catalog_context(settings.validated_dir, producto_id)
    runtime = OrchestratorRuntime(
        settings=settings,
        source_specs=specs,
        prefer_deterministic_only=deterministic_only,
        prefer_existing_sources=not live_fetch,
        catalog_context=catalog_context,
    )
    runner = run_full_pipeline_until_interrupt if full_pipeline else run_pipeline_until_interrupt
    run_id, state = runner(
        producto_id=producto_id,
        runtime=runtime,
        thread_id=thread_id,
    )
    return {
        "producto_id": producto_id,
        "run_id": run_id,
        "sources_count": len(specs),
        "status": state.get("status"),
        "validation_ok": state.get("validation_ok"),
        "verifier_verdict": state.get("verifier_verdict"),
        "staging_report_path": state.get("staging_report_path"),
        "staging_sql_path": state.get("staging_sql_path"),
        "budget": state.get("budget_summary"),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="atlas-pipeline",
        description="Pipeline offline LangGraph multi-producto y watchdog SHA-256 del Atlas Químico Argentino",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list-products", help="Lista los productos validados y sus fuentes vinculadas")

    run_gen = sub.add_parser("run", help="Ejecuta el pipeline para cualquier producto (o --all) hasta interrupt()")
    target = run_gen.add_mutually_exclusive_group(required=True)
    target.add_argument("--producto", help="ID del producto en data/validated/productos.json (ej. metanol, litio)")
    target.add_argument("--all", action="store_true", help="Ejecuta todos los productos validados en secuencia")
    run_gen.add_argument("--deterministic-only", action="store_true", help="Solo fast-path determinista (0 tokens)")
    run_gen.add_argument("--full", action="store_true", help="Ejecuta grafo completo (Agentes 1, 2 y 3)")
    run_gen.add_argument("--only-official", action="store_true", help="Incluye únicamente fuentes tipo='oficial'")
    run_gen.add_argument("--live-fetch", action="store_true", help="Ignora caché local y descarga fresco en memoria")
    run_gen.add_argument("--thread-id", default=None, help="ID de thread para el checkpointer SQLite")

    watch_p = sub.add_parser(
        "watch",
        help="Watchdog determinista por SHA-256 (0 tokens LLM) ideal para crons de monitoreo de fuentes",
    )
    watch_p.add_argument("--producto", default=None, help="Filtrar auditoría a un producto específico")
    watch_p.add_argument("--only-official", action="store_true", help="Auditar solo fuentes tipo='oficial'")
    watch_p.add_argument(
        "--trigger-changed",
        action="store_true",
        help="Si una fuente cambió de SHA-256, dispara el pipeline solo para los productos afectados",
    )
    watch_p.add_argument("--full", action="store_true", help="Al disparar por cambios, usar grafo completo")
    watch_p.add_argument(
        "--deterministic-only",
        action="store_true",
        help="Al disparar por cambios, usar solo fast-path determinista (0 tokens)",
    )
    watch_p.add_argument(
        "--fail-on-broken",
        action="store_true",
        help="Devuelve exit code 2 si hay fuentes rotas (HTTP != 200) o fuera de allowlist",
    )

    run_p = sub.add_parser("run-aluminio", help="Ejecuta el flujo de Etapa 4 sobre aluminio hasta interrupt()")
    run_p.add_argument("--deterministic-only", action="store_true", help="Solo fast-path determinista (0 tokens)")
    run_p.add_argument("--thread-id", default=None, help="ID de thread para el checkpointer SQLite")

    res_p = sub.add_parser("resume", help="Reanuda un thread pausado en human_review")
    res_p.add_argument("--thread-id", required=True)
    res_p.add_argument("--producto", default="aluminio", help="ID de producto del thread pausado")
    res_p.add_argument("--full", action="store_true", help="Reanudar thread del grafo completo (Etapas 4+5)")
    res_p.add_argument("--approve", action="store_true")
    res_p.add_argument("--comment", default="")

    args = parser.parse_args(argv)
    settings = PipelineSettings()

    if args.cmd == "list-products":
        entries = list_validated_products(settings.validated_dir)
        payload = [
            {
                "producto_id": e.producto_id,
                "nombre": e.nombre,
                "categoria": e.categoria,
                "formula_quimica": e.formula_quimica,
                "fuentes_count": len(e.fuente_ids),
                "provincias": list(e.provincias),
            }
            for e in entries
        ]
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0

    if args.cmd == "run":
        product_ids = (
            [e.producto_id for e in list_validated_products(settings.validated_dir)]
            if args.all
            else [args.producto]
        )
        summaries = [
            _run_for_product(
                producto_id=pid,
                settings=settings,
                deterministic_only=args.deterministic_only,
                full_pipeline=args.full,
                only_official=args.only_official,
                live_fetch=args.live_fetch,
                thread_id=args.thread_id if len(product_ids) == 1 else None,
            )
            for pid in product_ids
        ]
        out: Any = summaries[0] if len(summaries) == 1 else summaries
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0

    if args.cmd == "watch":
        only_types = {"oficial"} if args.only_official else None
        report = run_source_watchdog(
            validated_dir=settings.validated_dir,
            state_dir=settings.state_dir,
            producto_id=args.producto,
            only_types=only_types,
            timeout_seconds=settings.http_timeout_seconds,
        )
        triggered: list[dict[str, Any]] = []
        if args.trigger_changed and report.affected_products:
            for pid in report.affected_products:
                triggered.append(
                    _run_for_product(
                        producto_id=pid,
                        settings=settings,
                        deterministic_only=args.deterministic_only,
                        full_pipeline=args.full,
                        only_official=args.only_official,
                        live_fetch=True,
                    )
                )

        summary = {
            "checked_at": report.checked_at,
            "total_checked": report.total_checked,
            "unchanged": report.unchanged,
            "changed": report.changed,
            "broken": report.broken,
            "blocked_domain": report.blocked_domain,
            "affected_products": report.affected_products,
            "report_md": str(settings.state_dir / "watchdog_latest.md"),
            "triggered_runs": triggered,
        }
        print(json.dumps(summary, ensure_ascii=False, indent=2))
        if args.fail_on_broken and (report.broken > 0 or report.blocked_domain > 0):
            return 2
        return 0

    if args.cmd == "run-aluminio":
        runtime = OrchestratorRuntime(
            settings=settings,
            source_specs=aluminio_official_specs(settings.raw_dir),
            prefer_deterministic_only=args.deterministic_only,
            catalog_context=build_product_catalog_context(settings.validated_dir, "aluminio"),
        )
        run_id, state = run_pipeline_until_interrupt(
            producto_id="aluminio",
            runtime=runtime,
            thread_id=args.thread_id,
        )
        print(
            json.dumps(
                {
                    "run_id": run_id,
                    "status": state.get("status"),
                    "validation_ok": state.get("validation_ok"),
                    "staging_report_path": state.get("staging_report_path"),
                    "staging_sql_path": state.get("staging_sql_path"),
                    "budget": state.get("budget_summary"),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    if args.cmd == "resume":
        specs = (
            aluminio_official_specs(settings.raw_dir)
            if args.producto == "aluminio"
            else resolve_product_source_specs(
                validated_dir=settings.validated_dir,
                producto_id=args.producto,
                raw_dir=settings.raw_dir,
            )
        )
        runtime = OrchestratorRuntime(
            settings=settings,
            source_specs=specs,
            prefer_deterministic_only=True,
            catalog_context=build_product_catalog_context(settings.validated_dir, args.producto),
        )
        resumer = resume_full_pipeline_after_review if args.full else resume_pipeline_after_review
        final_state = resumer(
            thread_id=args.thread_id,
            runtime=runtime,
            approved=args.approve,
            comment=args.comment,
        )
        print(json.dumps({"thread_id": args.thread_id, "status": final_state.get("status")}, indent=2))
        return 0

    return 1
