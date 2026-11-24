"""Tests exhaustivos de las 6 herramientas deterministas de verificación química (Sección 6.2)."""

from __future__ import annotations

import copy
import json

from atlas_pipeline.chem.verifiers import (
    molar_mass,
    parse_formula_atoms,
    run_chemical_verification_suite,
    verify_atomic_balance,
    verify_energy_order_of_magnitude,
    verify_flow_graph_coherence,
    verify_geo_and_trade_plausibility,
    verify_stoichiometry_and_yield,
)
from atlas_pipeline.config import default_repo_root
from atlas_pipeline.schemas import (
    ComercioExteriorRegistro,
    ConexionProceso,
    PasoProceso,
    Planta,
    Proceso,
    ProduccionRegistro,
    ValorMedidoDato,
)


def _load_golden_objects():
    raw = json.loads(
        (default_repo_root() / "data" / "golden" / "aluminio.golden.json").read_text(
            encoding="utf-8"
        )
    )
    proceso = Proceso.model_validate(raw["procesos"][0])
    pasos = [PasoProceso.model_validate(p) for p in raw["pasos_proceso"]]
    conexiones = [ConexionProceso.model_validate(c) for c in raw["conexiones_proceso"]]
    plantas = [Planta.model_validate(pl) for pl in raw["plantas"]]
    comex = [ComercioExteriorRegistro.model_validate(ce) for ce in raw["comercio_exterior"]]
    produccion = [ProduccionRegistro.model_validate(pr) for pr in raw["produccion"]]
    return proceso, pasos, conexiones, plantas, comex, produccion


def test_formula_parser_and_atomic_balances_for_mvp_chains() -> None:
    assert parse_formula_atoms("Al(OH)3") == {"Al": 1, "O": 3, "H": 3}
    assert parse_formula_atoms("CO(NH2)2") == {"C": 1, "O": 1, "N": 2, "H": 4}
    assert abs(molar_mass("Al2O3") - 101.960) < 0.01

    # Reacciones válidas de las cadenas MVP (Sección 6.2)
    for rxn in [
        "2 Al2O3 + 3 C -> 4 Al + 3 CO2",
        "2 Al(OH)3 -> Al2O3 + 3 H2O",
        "2 NH3 + CO2 -> CO(NH2)2 + H2O",
        "N2 + 3 H2 -> 2 NH3",
        "2 LiCl + Na2CO3 -> Li2CO3 + 2 NaCl",
    ]:
        res = verify_atomic_balance(rxn)
        assert res.ok, f"Debía aprobar {rxn}: {res.errors}"

    # Reacción desbalanceada (falta 1 C)
    bad = verify_atomic_balance("2 Al2O3 + 2 C -> 4 Al + 3 CO2")
    assert not bad.ok
    assert any("C desbalanceado" in e for e in bad.errors)


def test_golden_aluminio_passes_all_6_chemical_verifiers() -> None:
    proceso, pasos, conexiones, plantas, comex, produccion = _load_golden_objects()
    suite = run_chemical_verification_suite(
        proceso=proceso,
        pasos=pasos,
        conexiones=conexiones,
        plantas=plantas,
        comercio_exterior=comex,
        produccion=produccion,
    )
    assert suite.ok, f"Set de Oro falló verificadores químicos: {suite.all_errors}"
    assert len(suite.checks) == 6
    assert all(c.ok for c in suite.checks)


def test_adversarial_super_stoichiometric_yield_rejected() -> None:
    """Rendimiento > 100% (1,50 t Al2O3/t Al < mínimo teórico 1,889) debe rechazarse."""
    proceso, pasos, *_ = _load_golden_objects()
    bad_pasos = copy.deepcopy(pasos)
    electrolisis = next(p for p in bad_pasos if p.paso_id == "al-p4-electrolisis-hall-heroult")
    electrolisis.reactivos[0].cantidad = 1.50

    res = verify_stoichiometry_and_yield(proceso, bad_pasos)
    assert not res.ok
    assert any("MENOR al mínimo estequiométrico" in e for e in res.errors)


def test_adversarial_energy_out_of_magnitude_rejected() -> None:
    """Energía absurda (2,5 MWh/t Al fuera de [13, 15.5]) debe rechazarse."""
    proceso, pasos, *_ = _load_golden_objects()
    bad_proc = copy.deepcopy(proceso)
    bad_proc.energia_especifica = ValorMedidoDato(
        valor=2.5,
        unidad="MWh/t Al",
        procedencia=proceso.procedencia,
    )
    res = verify_energy_order_of_magnitude(bad_proc, pasos)
    assert not res.ok
    assert any("fuera del rango publicado" in e for e in res.errors)


def test_adversarial_orphan_step_and_unexplained_cycle_rejected() -> None:
    proceso, pasos, conexiones, *_ = _load_golden_objects()

    # Caso A: paso huérfano (quitar conexiones del paso 6)
    no_p6 = [c for c in conexiones if c.destino_paso_id != "al-p6-fundicion-colada"]
    res_orphan = verify_flow_graph_coherence(proceso, pasos, no_p6)
    assert not res_orphan.ok
    assert any("Paso huérfano" in e for e in res_orphan.errors)

    # Caso B: ciclo dirigido sin tipo_corriente='reciclo' (cambiar al-c6-gases-a-celdas a 'principal')
    bad_cycle = copy.deepcopy(conexiones)
    for c in bad_cycle:
        if c.conexion_id == "al-c6-gases-a-celdas":
            c.tipo_corriente = "principal"
    res_cycle = verify_flow_graph_coherence(proceso, pasos, bad_cycle)
    assert not res_cycle.ok
    assert any("Ciclo inexplicado" in e for e in res_cycle.errors)


def test_adversarial_missing_imported_alumina_in_trade_rejected() -> None:
    """Si el proceso declara alúmina importada HS 2818.20 pero falta en comercio_exterior, rechaza."""
    proceso, pasos, _, plantas, comex, produccion = _load_golden_objects()
    comex_without_alumina = [c for c in comex if c.ncm_codigo != "2818.20"]

    res = verify_geo_and_trade_plausibility(
        proceso.producto_id,
        pasos,
        plantas,
        comex_without_alumina,
        produccion=produccion,
    )
    assert not res.ok
    assert any("2818.20" in e for e in res.errors)
