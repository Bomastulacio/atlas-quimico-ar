"""Gate determinista de validación: imposible de saltear por el LLM."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from atlas_pipeline.schemas import Fuente, Provenance, StagingDataBundle

_INVALID_CITA_RE = re.compile(
    r"^(n/?a|sin\s+cita|desconocid[oa]|estimad[oa]|pendiente|none|null|-|\.+)$",
    re.IGNORECASE,
)


@dataclass
class ValidationReport:
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    anomalies_detected: list[str] = field(default_factory=list)

    def to_feedback_prompt(self) -> str:
        """Formatea feedback quirúrgico para el siguiente ciclo del Agente 1."""
        lines = ["El validador determinista rechazó el borrador por los siguientes errores exactos:"]
        for err in self.errors:
            lines.append(f"- ERROR: {err}")
        for anom in self.anomalies_detected:
            lines.append(f"- ANOMALÍA FÍSICA/DE RANGO: {anom}")
        lines.append(
            "Corregí únicamente los campos señalados usando valores exactos de las fuentes descargadas "
            "(o marcá estado='sin_datos' con valor=None si el dato no existe)."
        )
        return "\n".join(lines)


def _check_provenance(
    prov: Provenance,
    ctx: str,
    fuentes_by_id: dict[str, Fuente],
    *,
    strict_real: bool,
    errors: list[str],
) -> None:
    if strict_real and prov.confianza == "ejemplo":
        errors.append(f"[{ctx}] confianza='ejemplo' prohibida en modo strict_real")

    cita = prov.cita_ubicacion.strip()
    if not cita or _INVALID_CITA_RE.match(cita):
        errors.append(f"[{ctx}] cita_ubicacion inválida o genérica: {prov.cita_ubicacion!r}")

    fuente = fuentes_by_id.get(prov.fuente_id)
    if fuente is None:
        errors.append(f"[{ctx}] fuente_id '{prov.fuente_id}' no existe en el catálogo de fuentes")
        return

    if prov.hash.lower() != fuente.hash.lower():
        errors.append(
            f"[{ctx}] hash en procedencia ({prov.hash}) no coincide con el SHA-256 real "
            f"de la fuente '{fuente.fuente_id}' ({fuente.hash})"
        )
    if prov.url != fuente.url:
        errors.append(f"[{ctx}] url en procedencia no coincide con la fuente '{fuente.fuente_id}'")


def validate_staging_bundle(
    bundle: StagingDataBundle,
    *,
    known_fuentes: dict[str, Fuente] | None = None,
    strict_real: bool = True,
    max_capacity_factor: float = 1.35,
    is_multi_plant_sector: bool = False,
) -> ValidationReport:
    """
    Ejecuta todas las barreras deterministas sobre el borrador del Agente 1:
    1. Integridad referencial (fuente_id, empresa_id, producto_id) y coincidencia exacta de SHA-256.
    2. Cero cifras con confianza='ejemplo' en strict_real y citas exactas obligatorias.
    3. Detección de duplicados por PK.
    4. Control físico de rango: producción vs. capacidad instalada (detecta errores de origen como
       el corrimiento de columnas en datos.gob.ar dataset 41).
    """
    errors: list[str] = []
    warnings: list[str] = []
    anomalies: list[str] = []

    fuentes_by_id: dict[str, Fuente] = dict(known_fuentes or {})
    seen_fuentes: set[str] = set()
    for f in bundle.fuentes:
        if f.fuente_id in seen_fuentes:
            errors.append(f"[fuentes] fuente_id duplicado: {f.fuente_id}")
        seen_fuentes.add(f.fuente_id)
        if strict_real and f.tipo == "ejemplo":
            errors.append(f"[fuentes:{f.fuente_id}] tipo='ejemplo' prohibido en strict_real")
        fuentes_by_id[f.fuente_id] = f

    seen_empresas: set[str] = set()
    for emp in bundle.empresas:
        if emp.empresa_id in seen_empresas:
            errors.append(f"[empresas] empresa_id duplicado: {emp.empresa_id}")
        seen_empresas.add(emp.empresa_id)
        _check_provenance(
            emp.procedencia,
            f"empresas:{emp.empresa_id}",
            fuentes_by_id,
            strict_real=strict_real,
            errors=errors,
        )

    seen_plantas: set[str] = set()
    total_installed_capacity_t: float = 0.0
    for pl in bundle.plantas:
        if pl.planta_id in seen_plantas:
            errors.append(f"[plantas] planta_id duplicado: {pl.planta_id}")
        seen_plantas.add(pl.planta_id)
        if pl.producto_id != bundle.producto_id:
            errors.append(
                f"[plantas:{pl.planta_id}] producto_id '{pl.producto_id}' difiere del objetivo '{bundle.producto_id}'"
            )
        if seen_empresas and pl.empresa_id not in seen_empresas:
            errors.append(f"[plantas:{pl.planta_id}] empresa_id '{pl.empresa_id}' no existe en empresas")
        if pl.capacidad.estado == "dato":
            if pl.capacidad.valor <= 0:
                errors.append(f"[plantas:{pl.planta_id}] capacidad debe ser > 0")
            elif "t" in pl.capacidad.unidad.lower():
                unit_low = pl.capacidad.unidad.lower()
                annual_cap = (
                    pl.capacidad.valor * 365.0
                    if ("/día" in unit_low or "/dia" in unit_low or "t/d" in unit_low)
                    else pl.capacidad.valor
                )
                total_installed_capacity_t += annual_cap
        _check_provenance(
            pl.procedencia,
            f"plantas:{pl.planta_id}",
            fuentes_by_id,
            strict_real=strict_real,
            errors=errors,
        )

    seen_prod: set[str] = set()
    for pr in bundle.produccion:
        if pr.registro_id in seen_prod:
            errors.append(f"[produccion] registro_id duplicado: {pr.registro_id}")
        seen_prod.add(pr.registro_id)
        if pr.producto_id != bundle.producto_id:
            errors.append(
                f"[produccion:{pr.registro_id}] producto_id '{pr.producto_id}' != '{bundle.producto_id}'"
            )
        _check_provenance(
            pr.procedencia,
            f"produccion:{pr.registro_id}",
            fuentes_by_id,
            strict_real=strict_real,
            errors=errors,
        )
        if pr.medicion.estado == "dato":
            if pr.medicion.valor < 0:
                errors.append(f"[produccion:{pr.registro_id}] valor negativo imposible: {pr.medicion.valor}")
            # Control físico contra capacidad instalada declarada (atrapa bug datos.gob.ar acero vs aluminio)
            if total_installed_capacity_t > 0 and pr.medicion.valor > total_installed_capacity_t * max_capacity_factor:
                msg = (
                    f"[produccion:{pr.registro_id}] valor {pr.medicion.valor:,.1f} {pr.medicion.unidad} "
                    f"supera en >{max_capacity_factor:.2f}x la capacidad instalada declarada "
                    f"({total_installed_capacity_t:,.0f} t/año)."
                )
                if is_multi_plant_sector:
                    warnings.append(
                        f"{msg} Sector multiplanta: las plantas registradas son anclas representativas."
                    )
                else:
                    anomalies.append(
                        f"{msg} Posible error en fuente oficial (ej. corrimiento de columnas en origen)."
                    )

    seen_comex: set[str] = set()
    for ce in bundle.comercio_exterior:
        if ce.registro_id in seen_comex:
            errors.append(f"[comercio_exterior] registro_id duplicado: {ce.registro_id}")
        seen_comex.add(ce.registro_id)
        if ce.producto_id != bundle.producto_id:
            errors.append(
                f"[comercio_exterior:{ce.registro_id}] producto_id '{ce.producto_id}' != '{bundle.producto_id}'"
            )
        _check_provenance(
            ce.procedencia,
            f"comercio_exterior:{ce.registro_id}",
            fuentes_by_id,
            strict_real=strict_real,
            errors=errors,
        )
        if ce.exportacion.estado == "dato" and ce.exportacion.valor < 0:
            errors.append(f"[comercio_exterior:{ce.registro_id}] exportación negativa: {ce.exportacion.valor}")
        if ce.importacion.estado == "dato" and ce.importacion.valor < 0:
            errors.append(f"[comercio_exterior:{ce.registro_id}] importación negativa: {ce.importacion.valor}")

    if not bundle.produccion and not bundle.comercio_exterior and not bundle.plantas:
        warnings.append("El borrador no extrajo ningún registro de producción, comercio exterior ni plantas.")

    ok = len(errors) == 0 and len(anomalies) == 0
    return ValidationReport(ok=ok, errors=errors, warnings=warnings, anomalies_detected=anomalies)
