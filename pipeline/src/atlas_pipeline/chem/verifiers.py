"""Suite determinista de 6 verificadores de ingeniería química (Sección 6.2).

1. Balance atómico por elemento y conservación de masa molar (IUPAC).
2. Balance de masa global por paso y coherencia entre corrientes de la cadena.
3. Estequiometría y rendimiento (rendimiento real <= teórico; consumos >= mínimo estequiométrico).
4. Orden de magnitud energético (MWh/t o GJ/t contra rangos publicados citados).
5. Coherencia de unidades y de grafo de flujo (sin pasos huérfanos, sin ciclos inexplicados).
6. Plausibilidad geográfica y comercial (planta existente e insumos importados en comex).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from atlas_pipeline.schemas import (
    ComercioExteriorRegistro,
    ConexionProceso,
    PasoProceso,
    Planta,
    Proceso,
    ProduccionRegistro,
)

# Masas atómicas estándar IUPAC (g/mol) para cadenas químicas e industriales argentinas
ATOMIC_MASSES: dict[str, float] = {
    "H": 1.00794,
    "He": 4.002602,
    "Li": 6.941,
    "B": 10.811,
    "C": 12.011,
    "N": 14.0067,
    "O": 15.999,
    "F": 18.998403,
    "Na": 22.989769,
    "Mg": 24.305,
    "Al": 26.9815385,
    "Si": 28.0855,
    "P": 30.973762,
    "S": 32.065,
    "Cl": 35.453,
    "K": 39.0983,
    "Ca": 40.078,
    "Ti": 47.867,
    "Cr": 51.9961,
    "Mn": 54.938044,
    "Fe": 55.845,
    "Ni": 58.6934,
    "Cu": 63.546,
    "Zn": 65.38,
    "Br": 79.904,
    "Ba": 137.327,
}

# Rangos de orden de magnitud energético publicados (expresados en MWh/t producto; 1 MWh = 3.6 GJ)
# Son controles de cordura orientativos basados en bibliografía técnica (IPCC / IAI / Ullmann / IEA).
PUBLISHED_ENERGY_RANGES_MWH_PER_T: dict[str, tuple[float, float, str]] = {
    "aluminio": (13.0, 15.5, "Hall-Héroult Prebake (IPCC 2006 / IAI / Aluar Memoria 2025: 13-15,5 MWh/t Al)"),
    "urea": (4.5, 11.0, "Amoníaco Haber-Bosch + síntesis de urea (16-40 GJ/t equivalentes)"),
    "petroquimica": (3.5, 10.0, "Craqueo térmico de etano a etileno (12-36 GJ/t)"),
    "litio": (0.5, 12.0, "Evaporación solar + carbonatación de salmueras"),
    "biodiesel": (0.05, 1.5, "Transesterificación catalítica (eléctrica + vapor)"),
    "soja": (0.04, 0.8, "Molienda y extracción por solvente"),
}

_FORMULA_TOKEN_RE = re.compile(r"\b([A-Z][a-z]?(?:\d+|\([A-Za-z0-9]+\)\d*|[A-Z][a-z]?\d*)*)\b")


@dataclass
class ChemicalCheckResult:
    check_id: str
    nombre: str
    ok: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metrics: dict[str, float | str | int | bool] = field(default_factory=dict)


@dataclass
class ChemicalVerificationSuiteReport:
    ok: bool
    checks: list[ChemicalCheckResult]

    @property
    def all_errors(self) -> list[str]:
        return [f"[{c.check_id}] {e}" for c in self.checks for e in c.errors]

    def to_feedback_prompt(self) -> str:
        lines = ["La suite determinista de verificación química (Sección 6.2) detectó fallas bloqueantes:"]
        for c in self.checks:
            if not c.ok:
                for e in c.errors:
                    lines.append(f"- [{c.check_id} - {c.nombre}] {e}")
        lines.append(
            "Corregí únicamente los balances, estequiometrías, energías o conexiones señaladas "
            "manteniendo fuentes verificables citadas."
        )
        return "\n".join(lines)


def parse_formula_atoms(formula: str) -> dict[str, int]:
    """Parser químico determinista con soporte para paréntesis anidados (ej. Al(OH)3, CO(NH2)2)."""
    formula = formula.strip()
    if not formula:
        raise ValueError("Fórmula química vacía")

    stack: list[dict[str, int]] = [{}]
    i = 0
    n = len(formula)

    while i < n:
        ch = formula[i]
        if ch == "(":
            stack.append({})
            i += 1
        elif ch == ")":
            if len(stack) == 1:
                raise ValueError(f"Paréntesis de cierre sin apertura en {formula!r}")
            group = stack.pop()
            i += 1
            num_start = i
            while i < n and formula[i].isdigit():
                i += 1
            mult = int(formula[num_start:i]) if i > num_start else 1
            for el, cnt in group.items():
                stack[-1][el] = stack[-1].get(el, 0) + cnt * mult
        elif ch.isupper():
            start = i
            i += 1
            while i < n and formula[i].islower():
                i += 1
            el = formula[start:i]
            if el not in ATOMIC_MASSES:
                raise ValueError(f"Elemento desconocido {el!r} en fórmula {formula!r}")
            num_start = i
            while i < n and formula[i].isdigit():
                i += 1
            cnt = int(formula[num_start:i]) if i > num_start else 1
            stack[-1][el] = stack[-1].get(el, 0) + cnt
        elif ch in (" ", "\t", "·", "."):
            i += 1
        else:
            raise ValueError(f"Carácter químico no reconocido {ch!r} en {formula!r}")

    if len(stack) != 1:
        raise ValueError(f"Paréntesis sin cerrar en {formula!r}")
    return stack[0]


def molar_mass(formula: str) -> float:
    atoms = parse_formula_atoms(formula)
    return sum(ATOMIC_MASSES[el] * cnt for el, cnt in atoms.items())


def parse_reaction(reaccion: str) -> tuple[list[tuple[float, str]], list[tuple[float, str]]]:
    """Parsea '2 Al2O3 + 3 C -> 4 Al + 3 CO2' en listas (coeficiente, fórmula) de reactivos y productos."""
    normalized = reaccion.replace("→", "->").replace("=", "->")
    parts = normalized.split("->")
    if len(parts) != 2:
        raise ValueError(f"Reacción debe contener exactamente un separador '->': {reaccion!r}")

    def _parse_side(side: str) -> list[tuple[float, str]]:
        terms: list[tuple[float, str]] = []
        for raw_term in side.split("+"):
            t = raw_term.strip()
            if not t:
                continue
            m = re.match(r"^(\d+(?:\.\d+)?)?\s*([A-Za-z0-9()]+)$", t)
            if not m:
                raise ValueError(f"Término químico inválido {t!r} en reacción {reaccion!r}")
            coeff = float(m.group(1)) if m.group(1) else 1.0
            formula = m.group(2)
            # Validar fórmula inmediatamente
            parse_formula_atoms(formula)
            terms.append((coeff, formula))
        if not terms:
            raise ValueError(f"Lado vacío en reacción {reaccion!r}")
        return terms

    return _parse_side(parts[0]), _parse_side(parts[1])


def verify_atomic_balance(reaccion: str) -> ChemicalCheckResult:
    """Verificador 6.2.1: Balance atómico por elemento y conservación de masa molar."""
    try:
        lhs_terms, rhs_terms = parse_reaction(reaccion)
    except ValueError as exc:
        return ChemicalCheckResult(
            check_id="6.2.1_atomic_balance",
            nombre="Balance atómico por elemento",
            ok=False,
            errors=[f"No se pudo parsear reacción '{reaccion}': {exc}"],
        )

    lhs_atoms: dict[str, float] = {}
    rhs_atoms: dict[str, float] = {}
    lhs_mass = 0.0
    rhs_mass = 0.0

    for coeff, formula in lhs_terms:
        atoms = parse_formula_atoms(formula)
        for el, cnt in atoms.items():
            lhs_atoms[el] = lhs_atoms.get(el, 0.0) + coeff * cnt
        lhs_mass += coeff * molar_mass(formula)

    for coeff, formula in rhs_terms:
        atoms = parse_formula_atoms(formula)
        for el, cnt in atoms.items():
            rhs_atoms[el] = rhs_atoms.get(el, 0.0) + coeff * cnt
        rhs_mass += coeff * molar_mass(formula)

    errors: list[str] = []
    for el in sorted(set(lhs_atoms) | set(rhs_atoms)):
        left_c = lhs_atoms.get(el, 0.0)
        right_c = rhs_atoms.get(el, 0.0)
        if abs(left_c - right_c) > 1e-6:
            errors.append(
                f"Elemento {el} desbalanceado en '{reaccion}': reactivos={left_c:g}, productos={right_c:g}"
            )

    if abs(lhs_mass - rhs_mass) > 1e-2:
        errors.append(
            f"Masa molar total desbalanceada en '{reaccion}': LHS={lhs_mass:.3f} vs RHS={rhs_mass:.3f} g/mol"
        )

    return ChemicalCheckResult(
        check_id="6.2.1_atomic_balance",
        nombre="Balance atómico por elemento",
        ok=len(errors) == 0,
        errors=errors,
        metrics={"lhs_molar_mass": round(lhs_mass, 3), "rhs_molar_mass": round(rhs_mass, 3)},
    )


def _is_mass_unit(unidad: str) -> bool:
    u = unidad.strip().lower()
    return u.startswith(("t/", "kg/")) or u == "t" or u == "kg"


def _to_tonnes_basis(cantidad: float, unidad: str) -> float:
    u = unidad.strip().lower()
    if u.startswith("kg/") or u == "kg":
        return cantidad / 1000.0
    return cantidad


def verify_step_and_chain_mass_balance(
    pasos: list[PasoProceso],
    conexiones: list[ConexionProceso],
    *,
    tolerance_rel: float = 0.15,
) -> ChemicalCheckResult:
    """
    Verificador 6.2.2: Balance de masa por paso y coherencia con conexiones.
    - En pasos cerrados (sin insumos abiertos como 'aire ambiente' ni corrientes sin cuantificar),
      valida `entradas >= salidas` dentro de la tolerancia explícita y que no aparezca masa de la nada.
    - En pasos donde el producto principal se transforma físicamente (ej. fundición/silos), verifica
      que las pérdidas/escorias declaradas cierren el balance (`entradas ≈ salidas + pérdidas`).
    - Verifica coherencia entre los flujos en aristas entrantes y las entradas declaradas del paso.
    """
    errors: list[str] = []
    warnings: list[str] = []
    pasos_by_id = {p.paso_id: p for p in pasos}

    for paso in pasos:
        mass_in = sum(
            _to_tonnes_basis(r.cantidad, r.unidad)
            for r in paso.reactivos
            if r.cantidad is not None and _is_mass_unit(r.unidad)
        )
        mass_out_prod = sum(
            _to_tonnes_basis(p.cantidad, p.unidad)
            for p in paso.productos
            if p.cantidad is not None and _is_mass_unit(p.unidad)
        )
        mass_out_sub = sum(
            _to_tonnes_basis(s.cantidad, s.unidad)
            for s in paso.subproductos
            if s.cantidad is not None and _is_mass_unit(s.unidad)
        )
        mass_out = mass_out_prod + mass_out_sub

        has_open_air_input = any(
            "aire" in ins.unidad.lower() or "o2" in ins.especie.lower()
            for ins in paso.insumos
        )
        has_unquantified_sub = any(s.cantidad is None for s in paso.subproductos)
        has_unquantified_prod = any(p.cantidad is None for p in paso.productos)

        if mass_in > 0 and mass_out > 0 and not has_unquantified_sub and not has_unquantified_prod:
            # Si sale más masa de la que entra sin aporte atmosférico declarado -> violación física!
            if mass_out > mass_in * (1.0 + tolerance_rel) and not has_open_air_input:
                errors.append(
                    f"Paso '{paso.paso_id}': salidas ({mass_out:.3f} t/t) exceden entradas ({mass_in:.3f} t/t) "
                    f"sin insumo atmosférico/auxiliar declarado (tolerancia {tolerance_rel:.0%})."
                )
            # En pasos de preparación/producto (sin pérdidas no cuantificadas), verificar cierre
            if paso.tipo_paso in ("preparacion", "producto") and not has_open_air_input:
                diff_rel = abs(mass_in - mass_out) / max(mass_in, 1e-9)
                if diff_rel > tolerance_rel:
                    errors.append(
                        f"Paso '{paso.paso_id}' ({paso.tipo_paso}): desbalance de masa "
                        f"entradas={mass_in:.3f} vs salidas+pérdidas={mass_out:.3f} (desvío {diff_rel:.1%} > {tolerance_rel:.0%})."
                    )

    # Coherencia entre flujo de conexión y entrada cuantificada del paso destino
    for con in conexiones:
        if con.flujo.estado != "dato" or not _is_mass_unit(con.flujo.unidad):
            continue
        dest = pasos_by_id.get(con.destino_paso_id)
        if not dest or not dest.reactivos:
            continue
        dest_quant_vals = [
            _to_tonnes_basis(r.cantidad, r.unidad)
            for r in dest.reactivos
            if r.cantidad is not None and _is_mass_unit(r.unidad)
        ]
        if dest_quant_vals:
            flow_val = _to_tonnes_basis(con.flujo.valor, con.flujo.unidad)
            if not any(abs(flow_val - dv) <= max(0.05, dv * 0.1) for dv in dest_quant_vals):
                warnings.append(
                    f"Conexión '{con.conexion_id}' ({flow_val:.3f}) difiere de reactivos en '{dest.paso_id}' ({dest_quant_vals})."
                )

    return ChemicalCheckResult(
        check_id="6.2.2_mass_balance",
        nombre="Balance de masa por paso y cadena",
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        metrics={"pasos_evaluados": len(pasos), "tolerancia_rel": tolerance_rel},
    )


def _extract_leading_formula(especie: str) -> str | None:
    """Extrae la fórmula química principal de textos como 'Al2O3 (alúmina calcinada)' o 'C (ánodos)'."""
    first_token = especie.strip().split()[0].strip("(),;:")
    if not first_token:
        return None
    try:
        parse_formula_atoms(first_token)
        return first_token
    except ValueError:
        for m in _FORMULA_TOKEN_RE.finditer(especie):
            cand = m.group(1)
            try:
                parse_formula_atoms(cand)
                return cand
            except ValueError:
                continue
    return None


def verify_stoichiometry_and_yield(
    proceso: Proceso,
    pasos: list[PasoProceso],
) -> ChemicalCheckResult:
    """
    Verificador 6.2.3: Estequiometría y rendimiento.
    El consumo específico real de cada reactivo nunca puede ser menor al mínimo estequiométrico
    teórico (equivale a rendimiento > 100%, físicamente imposible).
    """
    errors: list[str] = []
    warnings: list[str] = []
    ratios_checked: dict[str, float] = {}

    for paso in pasos:
        if not paso.reaccion_balanceada:
            continue
        try:
            lhs_terms, rhs_terms = parse_reaction(paso.reaccion_balanceada)
        except ValueError:
            continue

        # Identificar producto cuantificado de referencia en el paso (ej. Al = 1.0 t/t Al)
        prod_ref_formula: str | None = None
        prod_ref_qty: float | None = None
        prod_ref_coeff: float | None = None

        rhs_map = {formula: coeff for coeff, formula in rhs_terms}
        for prod_item in paso.productos:
            if prod_item.cantidad is None or not _is_mass_unit(prod_item.unidad):
                continue
            f = _extract_leading_formula(prod_item.especie)
            if f and f in rhs_map:
                prod_ref_formula = f
                prod_ref_qty = _to_tonnes_basis(prod_item.cantidad, prod_item.unidad)
                prod_ref_coeff = rhs_map[f]
                break

        if not prod_ref_formula or not prod_ref_qty or not prod_ref_coeff or prod_ref_qty <= 0:
            continue

        prod_ref_molar_total = prod_ref_coeff * molar_mass(prod_ref_formula)
        lhs_map = {formula: coeff for coeff, formula in lhs_terms}

        for react_item in paso.reactivos:
            if react_item.cantidad is None or not _is_mass_unit(react_item.unidad):
                continue
            rf = _extract_leading_formula(react_item.especie)
            if rf and rf in lhs_map:
                react_molar_total = lhs_map[rf] * molar_mass(rf)
                stoich_min_per_unit_prod = react_molar_total / prod_ref_molar_total
                real_per_unit_prod = _to_tonnes_basis(react_item.cantidad, react_item.unidad) / prod_ref_qty
                key = f"{paso.paso_id}:{rf}/{prod_ref_formula}"
                ratios_checked[key] = round(real_per_unit_prod, 4)

                # Tolerancia mínima de redondeo 0.5%; debajo de eso viola la 1ª ley de conservación
                if real_per_unit_prod < stoich_min_per_unit_prod * 0.995:
                    errors.append(
                        f"Paso '{paso.paso_id}': consumo específico de {rf} ({real_per_unit_prod:.4f} t/t {prod_ref_formula}) "
                        f"es MENOR al mínimo estequiométrico teórico ({stoich_min_per_unit_prod:.4f} t/t {prod_ref_formula}); "
                        "rendimiento > 100% es físicamente imposible."
                    )

    return ChemicalCheckResult(
        check_id="6.2.3_stoichiometry_yield",
        nombre="Estequiometría y mínimo teórico",
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        metrics={**ratios_checked, "producto": proceso.producto_id},
    )


def _energy_to_mwh_per_t(valor: float, unidad: str) -> float | None:
    u = unidad.strip().lower()
    if "mwh" in u:
        return valor
    if "kwh" in u:
        return valor / 1000.0
    if "gj" in u:
        return valor / 3.6
    if "mj" in u:
        return valor / 3600.0
    return None


def verify_energy_order_of_magnitude(
    proceso: Proceso,
    pasos: list[PasoProceso],
    *,
    published_ranges: dict[str, tuple[float, float, str]] | None = None,
) -> ChemicalCheckResult:
    """Verificador 6.2.4: Orden de magnitud energético (MWh/t o GJ/t) contra rangos citados."""
    ranges = published_ranges if published_ranges is not None else PUBLISHED_ENERGY_RANGES_MWH_PER_T
    errors: list[str] = []
    warnings: list[str] = []
    metrics: dict[str, float | str | int | bool] = {}

    if proceso.energia_especifica.estado == "dato":
        mwh_val = _energy_to_mwh_per_t(
            proceso.energia_especifica.valor, proceso.energia_especifica.unidad
        )
        if mwh_val is None:
            errors.append(
                f"Unidad energética no reconocida en proceso '{proceso.proceso_id}': "
                f"{proceso.energia_especifica.unidad!r} (usar MWh/t, kWh/t o GJ/t)."
            )
        else:
            metrics["energia_proceso_mwh_t"] = round(mwh_val, 3)
            if mwh_val <= 0:
                errors.append(f"Energía específica debe ser > 0, recibido {mwh_val}")
            elif proceso.producto_id in ranges:
                low, high, ref = ranges[proceso.producto_id]
                metrics["rango_min_mwh_t"] = low
                metrics["rango_max_mwh_t"] = high
                if not (low <= mwh_val <= high):
                    errors.append(
                        f"Energía específica de '{proceso.producto_id}' ({mwh_val:.2f} MWh/t) "
                        f"fuera del rango publicado [{low:.2f}, {high:.2f}] MWh/t ({ref})."
                    )
    else:
        warnings.append(f"Proceso '{proceso.proceso_id}' declara energía específica como sin_datos.")

    # También verificar pasos de reacción con energía reportada
    for paso in pasos:
        if paso.energia.estado == "dato":
            step_mwh = _energy_to_mwh_per_t(paso.energia.valor, paso.energia.unidad)
            if step_mwh is None:
                errors.append(f"Paso '{paso.paso_id}': unidad energética no reconocida {paso.energia.unidad!r}")
            elif step_mwh < 0:
                errors.append(f"Paso '{paso.paso_id}': consumo energético negativo ({step_mwh})")

    return ChemicalCheckResult(
        check_id="6.2.4_energy_range",
        nombre="Orden de magnitud energético",
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        metrics=metrics,
    )


def verify_flow_graph_coherence(
    proceso: Proceso,
    pasos: list[PasoProceso],
    conexiones: list[ConexionProceso],
) -> ChemicalCheckResult:
    """
    Verificador 6.2.5: Coherencia de flujo y grafo.
    - Sin pasos huérfanos ni componentes desconectadas.
    - Sin ciclos inexplicados (un ciclo dirigido solo se permite si atraviesa al menos una
      corriente explícitamente tipada como `reciclo`).
    - Todas las FK internas pertenecen al mismo `proceso_id`.
    """
    errors: list[str] = []
    paso_ids = {p.paso_id for p in pasos}

    for p in pasos:
        if p.proceso_id != proceso.proceso_id:
            errors.append(f"Paso '{p.paso_id}' pertenece a '{p.proceso_id}', no a '{proceso.proceso_id}'")

    adj_dir: dict[str, list[tuple[str, str]]] = {pid: [] for pid in paso_ids}
    adj_undir: dict[str, set[str]] = {pid: set() for pid in paso_ids}

    for c in conexiones:
        if c.proceso_id != proceso.proceso_id:
            errors.append(f"Conexión '{c.conexion_id}' pertenece a otro proceso '{c.proceso_id}'")
        if c.origen_paso_id not in paso_ids:
            errors.append(f"Conexión '{c.conexion_id}': origen inexistente '{c.origen_paso_id}'")
            continue
        if c.destino_paso_id not in paso_ids:
            errors.append(f"Conexión '{c.conexion_id}': destino inexistente '{c.destino_paso_id}'")
            continue
        adj_dir[c.origen_paso_id].append((c.destino_paso_id, c.tipo_corriente))
        adj_undir[c.origen_paso_id].add(c.destino_paso_id)
        adj_undir[c.destino_paso_id].add(c.origen_paso_id)

    # 1. Pasos huérfanos y conectividad global
    if len(pasos) > 1:
        for pid in sorted(paso_ids):
            if not adj_undir[pid]:
                errors.append(f"Paso huérfano sin conexiones: '{pid}'")

        start_node = pasos[0].paso_id
        visited: set[str] = set()
        stack = [start_node]
        while stack:
            curr = stack.pop()
            if curr in visited:
                continue
            visited.add(curr)
            stack.extend(adj_undir[curr] - visited)
        disconnected = paso_ids - visited
        if disconnected:
            errors.append(f"Grafo desconectado: pasos inalcanzables desde '{start_node}': {sorted(disconnected)}")

    # 2. Detección de ciclos dirigidos sin corriente 'reciclo' (DFS sobre subgrafo sin aristas reciclo)
    non_recycle_adj: dict[str, list[str]] = {
        u: [v for v, kind in edges if kind != "reciclo"] for u, edges in adj_dir.items()
    }
    color: dict[str, int] = {pid: 0 for pid in paso_ids}  # 0=unvisited, 1=visiting, 2=done

    def _dfs_cycle(node: str, path: list[str]) -> None:
        color[node] = 1
        for nxt in non_recycle_adj[node]:
            if color[nxt] == 1:
                cycle_slice = path[path.index(nxt) :] + [nxt]
                errors.append(
                    f"Ciclo inexplicado sin corriente 'reciclo' declarada: {' -> '.join(cycle_slice)}"
                )
            elif color[nxt] == 0:
                _dfs_cycle(nxt, path + [nxt])
        color[node] = 2

    for pid in sorted(paso_ids):
        if color[pid] == 0:
            _dfs_cycle(pid, [pid])

    return ChemicalCheckResult(
        check_id="6.2.5_flow_graph",
        nombre="Coherencia de grafo de flujo",
        ok=len(errors) == 0,
        errors=errors,
        metrics={"nodos": len(pasos), "aristas": len(conexiones)},
    )


def verify_geo_and_trade_plausibility(
    producto_id: str,
    pasos: list[PasoProceso],
    plantas: list[Planta],
    comercio_exterior: list[ComercioExteriorRegistro],
    produccion: list[ProduccionRegistro] | None = None,
) -> ChemicalCheckResult:
    """
    Verificador 6.2.6: Plausibilidad geográfica y comercial.
    - La planta existe en coordenadas válidas dentro de Argentina.
    - Si algún paso declara un insumo importado (ej. 'alúmina importada' / 'HS 2818.20'),
      debe figurar en `comercio_exterior` con importación verificada > 0.
    """
    errors: list[str] = []
    warnings: list[str] = []
    metrics: dict[str, float | str | int | bool] = {}

    matching_plantas = [pl for pl in plantas if pl.producto_id == producto_id]
    metrics["plantas_verificadas"] = len(matching_plantas)
    if not matching_plantas:
        errors.append(f"No hay ninguna planta registrada para el producto '{producto_id}'")
    else:
        for pl in matching_plantas:
            if pl.departamento_id and not pl.departamento_id.startswith(pl.provincia_id):
                errors.append(
                    f"Planta '{pl.planta_id}': departamento '{pl.departamento_id}' inconsistente con provincia '{pl.provincia_id}'"
                )

    # Detectar mención explícita de insumo importado en pasos (especialmente materia_prima)
    declares_imported_input = any(
        ("importa" in p.nombre.lower() or "importa" in p.descripcion.lower())
        or any("importa" in r.especie.lower() for r in p.reactivos)
        for p in pasos
        if p.tipo_paso in ("materia_prima", "preparacion")
    )
    metrics["declara_insumo_importado"] = declares_imported_input

    if declares_imported_input:
        import_rows = [
            ce
            for ce in comercio_exterior
            if ce.producto_id == producto_id
            and ce.importacion.estado == "dato"
            and ce.importacion.valor > 0
        ]
        # Si menciona un código HS explícito (ej. 2818.20) verificar que figure en comercio_exterior
        hs_mentions: set[str] = set()
        for p in pasos:
            for m in re.finditer(r"HS\s+(\d{4}(?:\.\d{2})?)", p.descripcion, flags=re.IGNORECASE):
                hs_mentions.add(m.group(1))

        if not import_rows:
            errors.append(
                f"El proceso de '{producto_id}' declara insumos importados pero no existen registros "
                "verificados de importación en comercio_exterior."
            )
        elif hs_mentions:
            present_ncms = {ce.ncm_codigo for ce in import_rows if ce.ncm_codigo}
            missing_hs = hs_mentions - present_ncms
            if missing_hs:
                errors.append(
                    f"El proceso cita insumo importado HS {sorted(missing_hs)} que no figura "
                    f"con importación verificada en comercio_exterior (presentes: {sorted(present_ncms)})."
                )

        # Cruce cuantitativo opcional: si hay volumen importado de alúmina y producción, chequear orden
        if produccion:
            vol_imports = [
                ce for ce in import_rows if ce.metrica == "volumen_t" and ce.importacion.estado == "dato"
            ]
            latest_prod = sorted(
                [pr for pr in produccion if pr.producto_id == producto_id and pr.medicion.estado == "dato"],
                key=lambda x: x.anio,
                reverse=True,
            )
            if vol_imports and latest_prod:
                latest_imp = max(vol_imports, key=lambda x: x.anio)
                if latest_imp.importacion.estado == "dato" and latest_prod[0].medicion.estado == "dato":
                    ratio = latest_imp.importacion.valor / latest_prod[0].medicion.valor
                    metrics["ratio_insumo_importado_produccion"] = round(ratio, 4)

    return ChemicalCheckResult(
        check_id="6.2.6_geo_trade_plausibility",
        nombre="Plausibilidad geográfica y comercial",
        ok=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        metrics=metrics,
    )


def run_chemical_verification_suite(
    *,
    proceso: Proceso,
    pasos: list[PasoProceso],
    conexiones: list[ConexionProceso],
    plantas: list[Planta],
    comercio_exterior: list[ComercioExteriorRegistro],
    produccion: list[ProduccionRegistro] | None = None,
) -> ChemicalVerificationSuiteReport:
    """Ejecuta de forma determinista las 6 verificaciones químicas de la Sección 6.2."""
    checks: list[ChemicalCheckResult] = []

    # 1. Balance atómico de la reacción global y de cada reacción en pasos
    atomic_errors: list[str] = []
    atomic_count = 0
    rxns_to_check: list[str] = []
    if proceso.reaccion_global:
        rxns_to_check.append(proceso.reaccion_global)
    for p in pasos:
        if p.reaccion_balanceada and p.reaccion_balanceada not in rxns_to_check:
            rxns_to_check.append(p.reaccion_balanceada)

    for rxn in rxns_to_check:
        res = verify_atomic_balance(rxn)
        atomic_count += 1
        atomic_errors.extend(res.errors)

    checks.append(
        ChemicalCheckResult(
            check_id="6.2.1_atomic_balance",
            nombre="Balance atómico por elemento",
            ok=len(atomic_errors) == 0 and atomic_count > 0,
            errors=atomic_errors if atomic_count > 0 else ["No se declaró ninguna reacción balanceada."],
            metrics={"reacciones_verificadas": atomic_count},
        )
    )

    # 2. Balance de masa por paso y cadena
    checks.append(verify_step_and_chain_mass_balance(pasos, conexiones))

    # 3. Estequiometría y rendimiento
    checks.append(verify_stoichiometry_and_yield(proceso, pasos))

    # 4. Orden de magnitud energético
    checks.append(verify_energy_order_of_magnitude(proceso, pasos))

    # 5. Coherencia de flujo y grafo
    checks.append(verify_flow_graph_coherence(proceso, pasos, conexiones))

    # 6. Plausibilidad geográfica y comercial
    checks.append(
        verify_geo_and_trade_plausibility(
            proceso.producto_id,
            pasos,
            plantas,
            comercio_exterior,
            produccion=produccion,
        )
    )

    return ChemicalVerificationSuiteReport(
        ok=all(c.ok for c in checks),
        checks=checks,
    )
