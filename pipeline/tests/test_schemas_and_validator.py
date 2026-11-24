"""Tests unitarios de esquemas Pydantic v2 y del Gate determinista de validación."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from atlas_pipeline.nodes.validator import validate_staging_bundle
from atlas_pipeline.schemas import (
    ComercioExteriorRegistro,
    Empresa,
    Fuente,
    Planta,
    ProduccionRegistro,
    Provenance,
    StagingDataBundle,
    ValorMedidoDato,
    ValorMedidoSinDatos,
)

VALID_HASH = "sha256:" + "a" * 64


def _fuente(fuente_id: str = "indec-2024", tipo: str = "oficial") -> Fuente:
    return Fuente(
        fuente_id=fuente_id,
        nombre="Fuente Oficial Test",
        organismo="INDEC",
        tipo=tipo,  # type: ignore[arg-type]
        url="https://apis.datos.gob.ar/series/test.csv",
        fecha_descarga="2026-11-24",
        hash=VALID_HASH,
    )


def _prov(
    fuente: Fuente,
    *,
    anio: int = 2024,
    cita: str = "test.csv fila 2",
    confianza: str = "alta",
    override_hash: str | None = None,
) -> Provenance:
    return Provenance(
        anio=anio,
        fuente_id=fuente.fuente_id,
        fuente=fuente.nombre,
        url=fuente.url,
        fecha_descarga=fuente.fecha_descarga,
        hash=override_hash or fuente.hash,
        cita_ubicacion=cita,
        confianza=confianza,  # type: ignore[arg-type]
    )


def test_sin_datos_rechaza_valor_numerico() -> None:
    with pytest.raises(ValidationError):
        ValorMedidoSinDatos(estado="sin_datos", valor=123.0)  # type: ignore[arg-type]


def test_comercio_exterior_rechaza_saldo_inconsistente() -> None:
    f = _fuente()
    p = _prov(f)
    with pytest.raises(ValidationError, match="saldo_comercial"):
        ComercioExteriorRegistro(
            registro_id="comex-aluminio-2024-usd",
            producto_id="aluminio",
            anio=2024,
            ncm_codigo="76",
            metrica="valor_usd",
            exportacion=ValorMedidoDato(valor=1000.0, unidad="millones USD", procedencia=p),
            importacion=ValorMedidoDato(valor=300.0, unidad="millones USD", procedencia=p),
            saldo_comercial=ValorMedidoDato(valor=500.0, unidad="millones USD", procedencia=p),
            procedencia=p,
        )


def test_validator_bloquea_hash_falsificado_y_cita_generica() -> None:
    f = _fuente()
    bad_hash = "sha256:" + "f" * 64
    p_bad = _prov(f, cita="N/A", override_hash=bad_hash)

    bundle = StagingDataBundle(
        producto_id="aluminio",
        fuentes=[f],
        produccion=[
            ProduccionRegistro(
                registro_id="prod-aluminio-2024",
                producto_id="aluminio",
                provincia_id="26",
                anio=2024,
                medicion=ValorMedidoDato(valor=443507.0, unidad="t", procedencia=p_bad),
                procedencia=p_bad,
            )
        ],
    )
    report = validate_staging_bundle(bundle, strict_real=True)
    assert not report.ok
    assert any("cita_ubicacion inválida" in e for e in report.errors)
    assert any("hash en procedencia" in e for e in report.errors)


def test_validator_detecta_anomalia_real_datos_gob_acero_vs_aluminio() -> None:
    """Reproduce el bug real de datos.gob.ar dataset 41 (4.928 kt vs capacidad 460 kt)."""
    f = _fuente("datosgob-41")
    p = _prov(f, anio=2023, cita="sspm_41_3_industria_anual.csv fila 2023")

    bundle = StagingDataBundle(
        producto_id="aluminio",
        fuentes=[f],
        empresas=[
            Empresa(
                empresa_id="aluar-saic",
                razon_social="Aluar Aluminio Argentino S.A.I.C.",
                tipo_capital="nacional",
                sitio_web_oficial="https://www.aluar.com.ar/",
                hechos_verificables="Único productor de aluminio primario en Argentina.",
                procedencia=p,
            )
        ],
        plantas=[
            Planta(
                planta_id="aluar-puerto-madryn",
                empresa_id="aluar-saic",
                producto_id="aluminio",
                provincia_id="26",
                departamento_id="26007",
                nombre="Planta Aluar",
                localidad="Puerto Madryn",
                lat=-42.735,
                lon=-65.039,
                estado_operativo="operativa",
                capacidad=ValorMedidoDato(valor=460000.0, unidad="t/año", procedencia=p),
                procedencia=p,
            )
        ],
        produccion=[
            ProduccionRegistro(
                registro_id="prod-aluminio-bug-2023",
                producto_id="aluminio",
                provincia_id="26",
                anio=2023,
                medicion=ValorMedidoDato(valor=4_928_000.0, unidad="t", procedencia=p),
                procedencia=p,
            )
        ],
    )

    report = validate_staging_bundle(bundle, strict_real=True)
    assert not report.ok
    assert len(report.anomalies_detected) == 1
    assert "capacidad instalada" in report.anomalies_detected[0]
