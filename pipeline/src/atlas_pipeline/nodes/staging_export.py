"""Exportación determinista a data/staging/ + SQL idempotente para Supabase + reporte Markdown."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from atlas_pipeline.nodes.validator import ValidationReport
from atlas_pipeline.schemas import StagingDataBundle


@dataclass(frozen=True)
class StagingArtifacts:
    staging_dir: Path
    bundle_json_path: Path
    supabase_sql_path: Path
    report_md_path: Path


def _sql_val(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def _upsert_sql(table: str, pk: str, columns: list[str], rows: list[list[str]]) -> str:
    if not rows:
        return f"-- ({table}: 0 filas)\n"
    cols = ", ".join(columns)
    vals = ",\n".join(f"  ({', '.join(r)})" for r in rows)
    updates = ", ".join(f"{c} = EXCLUDED.{c}" for c in columns if c != pk)
    return (
        f"-- Tabla: public.{table} ({len(rows)} filas)\n"
        f"INSERT INTO public.{table} ({cols}) VALUES\n"
        f"{vals}\n"
        f"ON CONFLICT ({pk}) DO UPDATE SET {updates};\n\n"
    )


def render_supabase_upsert_sql(bundle: StagingDataBundle) -> str:
    """Genera SQL idempotente listo para ejecutar en Supabase tras aprobación humana."""
    parts: list[str] = [
        "-- =============================================================================",
        f"-- Atlas Químico Argentino — Upsert staging a Supabase ({bundle.producto_id})",
        f"-- Generado: {datetime.now(UTC).isoformat()}",
        "-- REGLA AGENTS.md: ejecutar solo tras aprobación humana (interrupt / PR).",
        "-- =============================================================================",
        "BEGIN;\n",
    ]

    parts.append(
        _upsert_sql(
            "fuentes",
            "fuente_id",
            ["fuente_id", "nombre", "organismo", "tipo", "url", "fecha_descarga", "hash", "archivo_raw", "notas"],
            [
                [
                    _sql_val(f.fuente_id),
                    _sql_val(f.nombre),
                    _sql_val(f.organismo),
                    _sql_val(f.tipo),
                    _sql_val(f.url),
                    _sql_val(f.fecha_descarga),
                    _sql_val(f.hash),
                    _sql_val(f.archivo_raw),
                    _sql_val(f.notas),
                ]
                for f in bundle.fuentes
            ],
        )
    )

    parts.append(
        _upsert_sql(
            "empresas",
            "empresa_id",
            [
                "empresa_id",
                "razon_social",
                "tipo_capital",
                "sitio_web_oficial",
                "hechos_verificables",
                "anio",
                "fuente_id",
                "cita_ubicacion",
                "confianza",
            ],
            [
                [
                    _sql_val(e.empresa_id),
                    _sql_val(e.razon_social),
                    _sql_val(e.tipo_capital),
                    _sql_val(e.sitio_web_oficial),
                    _sql_val(e.hechos_verificables),
                    _sql_val(e.procedencia.anio),
                    _sql_val(e.procedencia.fuente_id),
                    _sql_val(e.procedencia.cita_ubicacion),
                    _sql_val(e.procedencia.confianza),
                ]
                for e in bundle.empresas
            ],
        )
    )

    parts.append(
        _upsert_sql(
            "plantas",
            "planta_id",
            [
                "planta_id",
                "empresa_id",
                "producto_id",
                "provincia_id",
                "departamento_id",
                "nombre",
                "localidad",
                "lat",
                "lon",
                "estado_operativo",
                "capacidad_valor",
                "capacidad_estado",
                "capacidad_unidad",
                "anio",
                "fuente_id",
                "cita_ubicacion",
                "confianza",
            ],
            [
                [
                    _sql_val(pl.planta_id),
                    _sql_val(pl.empresa_id),
                    _sql_val(pl.producto_id),
                    _sql_val(pl.provincia_id),
                    _sql_val(pl.departamento_id),
                    _sql_val(pl.nombre),
                    _sql_val(pl.localidad),
                    _sql_val(pl.lat),
                    _sql_val(pl.lon),
                    _sql_val(pl.estado_operativo),
                    _sql_val(pl.capacidad.valor),
                    _sql_val(pl.capacidad.estado),
                    _sql_val(pl.capacidad.unidad),
                    _sql_val(pl.procedencia.anio),
                    _sql_val(pl.procedencia.fuente_id),
                    _sql_val(pl.procedencia.cita_ubicacion),
                    _sql_val(pl.procedencia.confianza),
                ]
                for pl in bundle.plantas
            ],
        )
    )

    parts.append(
        _upsert_sql(
            "produccion",
            "registro_id",
            [
                "registro_id",
                "producto_id",
                "provincia_id",
                "anio",
                "valor",
                "estado",
                "unidad",
                "fuente_id",
                "cita_ubicacion",
                "confianza",
            ],
            [
                [
                    _sql_val(pr.registro_id),
                    _sql_val(pr.producto_id),
                    _sql_val(pr.provincia_id),
                    _sql_val(pr.anio),
                    _sql_val(pr.medicion.valor),
                    _sql_val(pr.medicion.estado),
                    _sql_val(pr.medicion.unidad),
                    _sql_val(pr.procedencia.fuente_id),
                    _sql_val(pr.procedencia.cita_ubicacion),
                    _sql_val(pr.procedencia.confianza),
                ]
                for pr in bundle.produccion
            ],
        )
    )

    parts.append(
        _upsert_sql(
            "comercio_exterior",
            "registro_id",
            [
                "registro_id",
                "producto_id",
                "anio",
                "ncm_codigo",
                "metrica",
                "exportacion_valor",
                "exportacion_estado",
                "importacion_valor",
                "importacion_estado",
                "saldo_comercial_valor",
                "saldo_comercial_estado",
                "unidad",
                "fuente_id",
                "cita_ubicacion",
                "confianza",
            ],
            [
                [
                    _sql_val(ce.registro_id),
                    _sql_val(ce.producto_id),
                    _sql_val(ce.anio),
                    _sql_val(ce.ncm_codigo),
                    _sql_val(ce.metrica),
                    _sql_val(ce.exportacion.valor),
                    _sql_val(ce.exportacion.estado),
                    _sql_val(ce.importacion.valor),
                    _sql_val(ce.importacion.estado),
                    _sql_val(ce.saldo_comercial.valor),
                    _sql_val(ce.saldo_comercial.estado),
                    _sql_val(ce.exportacion.unidad or ce.importacion.unidad or ce.saldo_comercial.unidad),
                    _sql_val(ce.procedencia.fuente_id),
                    _sql_val(ce.procedencia.cita_ubicacion),
                    _sql_val(ce.procedencia.confianza),
                ]
                for ce in bundle.comercio_exterior
            ],
        )
    )

    parts.append("COMMIT;\n")
    return "".join(parts)


def render_review_report_md(
    bundle: StagingDataBundle,
    validation: ValidationReport,
    *,
    run_id: str,
    budget_summary: dict[str, int | float],
    injection_alerts: list[str],
) -> str:
    status_label = "APROBABLE (validación determinista OK)" if validation.ok else "BLOQUEADO (requiere revisión humana)"
    lines = [
        f"# Informe de Staging — {bundle.producto_id}",
        "",
        f"- **Run ID:** `{run_id}`",
        f"- **Estado de validación:** **{status_label}**",
        (f"- **Fuentes:** {len(bundle.fuentes)} | **Empresas:** {len(bundle.empresas)} | "
        f"**Plantas:** {len(bundle.plantas)} | **Producción:** {len(bundle.produccion)} | "
        f"**Comercio exterior:** {len(bundle.comercio_exterior)}"),
        (f"- **Uso de recursos:** pasos={budget_summary.get('steps_used', 0)}, "
        f"llamadas LLM={budget_summary.get('llm_calls_used', 0)}, "
        f"cache hits={budget_summary.get('cache_hits', 0)}, "
        f"tokens_in={budget_summary.get('tokens_in', 0)}, tokens_out={budget_summary.get('tokens_out', 0)}"),
        "",
    ]

    if validation.errors or validation.anomalies_detected:
        lines.append("## Hallazgos que bloquean publicación")
        for e in validation.errors:
            lines.append(f"- [ERROR] {e}")
        for a in validation.anomalies_detected:
            lines.append(f"- [ANOMALÍA] {a}")
        lines.append("")

    if injection_alerts:
        lines.append("## Alertas de seguridad (prompt injection en fuentes externas)")
        for alert in injection_alerts:
            lines.append(f"- {alert}")
        lines.append("")

    lines.append("## Fuentes con SHA-256")
    for f in bundle.fuentes:
        lines.append(f"- `{f.fuente_id}` ({f.organismo}, {f.fecha_descarga}): {f.url} (`{f.hash}`)")
    lines.append("")

    if bundle.produccion:
        lines.append("## Series de producción extraídas")
        for pr in bundle.produccion:
            val_str = f"{pr.medicion.valor} {pr.medicion.unidad}" if pr.medicion.estado == "dato" else "sin_datos"
            lines.append(f"- `{pr.registro_id}` ({pr.anio}): **{val_str}** — cita: {pr.procedencia.cita_ubicacion}")
        lines.append("")

    if bundle.comercio_exterior:
        lines.append("## Series de comercio exterior extraídas")
        for ce in bundle.comercio_exterior:
            exp_s = f"{ce.exportacion.valor}" if ce.exportacion.estado == "dato" else "sin_datos"
            imp_s = f"{ce.importacion.valor}" if ce.importacion.estado == "dato" else "sin_datos"
            sal_s = f"{ce.saldo_comercial.valor}" if ce.saldo_comercial.estado == "dato" else "sin_datos"
            lines.append(
                f"- `{ce.registro_id}` ({ce.anio}, NCM `{ce.ncm_codigo}`): "
                f"exp={exp_s}, imp={imp_s}, saldo={sal_s} — cita: {ce.procedencia.cita_ubicacion}"
            )
        lines.append("")

    lines.append("## Siguiente paso obligatorio (AGENTS.md)")
    lines.append("1. Revisar cifras y citas en este informe.")
    lines.append("2. Si aprobás, aplicar `upsert_supabase.sql` en Supabase (`rbjymgrimmrbetgbeios`).")
    lines.append("3. Ejecutar `npm run data:sync:supabase && npm run data:validate`.")
    lines.append("")
    return "\n".join(lines)


def export_staging_artifacts(
    bundle: StagingDataBundle,
    validation: ValidationReport,
    staging_root: Path,
    *,
    run_id: str,
    budget_summary: dict[str, int | float],
    injection_alerts: list[str] | None = None,
) -> StagingArtifacts:
    target_dir = staging_root / bundle.producto_id
    target_dir.mkdir(parents=True, exist_ok=True)

    bundle_path = target_dir / "bundle.json"
    sql_path = target_dir / "upsert_supabase.sql"
    report_path = target_dir / "reporte_revision.md"

    bundle_path.write_text(
        json.dumps(bundle.model_dump(mode="json"), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    sql_path.write_text(render_supabase_upsert_sql(bundle), encoding="utf-8")
    report_path.write_text(
        render_review_report_md(
            bundle,
            validation,
            run_id=run_id,
            budget_summary=budget_summary,
            injection_alerts=injection_alerts or [],
        ),
        encoding="utf-8",
    )

    return StagingArtifacts(
        staging_dir=target_dir,
        bundle_json_path=bundle_path,
        supabase_sql_path=sql_path,
        report_md_path=report_path,
    )
