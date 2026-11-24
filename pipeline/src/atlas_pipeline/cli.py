"""CLI offline del pipeline LangGraph (Etapa 4)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from atlas_pipeline.config import PipelineSettings
from atlas_pipeline.graph import (
    OrchestratorRuntime,
    resume_pipeline_after_review,
    run_pipeline_until_interrupt,
)
from atlas_pipeline.tools.fetcher import SourceSpec


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


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="atlas-pipeline",
        description="Pipeline offline LangGraph del Atlas Químico Argentino",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    run_p = sub.add_parser("run-aluminio", help="Ejecuta el flujo de Etapa 4 sobre aluminio hasta interrupt()")
    run_p.add_argument("--deterministic-only", action="store_true", help="Solo fast-path determinista (0 tokens)")
    run_p.add_argument("--thread-id", default=None, help="ID de thread para el checkpointer SQLite")

    res_p = sub.add_parser("resume", help="Reanuda un thread pausado en human_review")
    res_p.add_argument("--thread-id", required=True)
    res_p.add_argument("--approve", action="store_true")
    res_p.add_argument("--comment", default="")

    args = parser.parse_args(argv)
    settings = PipelineSettings()

    if args.cmd == "run-aluminio":
        runtime = OrchestratorRuntime(
            settings=settings,
            source_specs=aluminio_official_specs(settings.raw_dir),
            prefer_deterministic_only=args.deterministic_only,
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
        runtime = OrchestratorRuntime(
            settings=settings,
            source_specs=aluminio_official_specs(settings.raw_dir),
            prefer_deterministic_only=True,
        )
        final_state = resume_pipeline_after_review(
            thread_id=args.thread_id,
            runtime=runtime,
            approved=args.approve,
            comment=args.comment,
        )
        print(json.dumps({"thread_id": args.thread_id, "status": final_state.get("status")}, indent=2))
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
