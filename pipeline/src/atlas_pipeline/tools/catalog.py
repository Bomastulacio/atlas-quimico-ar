"""Catálogo multi-producto desde `data/validated/*.json`: resolución de fuentes y contexto canónico."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from atlas_pipeline.tools.fetcher import SourceSpec


@dataclass(frozen=True)
class ProductCatalogEntry:
    producto_id: str
    nombre: str
    categoria: str
    formula_quimica: str | None
    fuente_ids: tuple[str, ...]
    provincias: tuple[str, ...]


def _load_json_list(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    return raw if isinstance(raw, list) else []


def _collect_fuente_ids(obj: Any, out: set[str]) -> None:
    if isinstance(obj, dict):
        fid = obj.get("fuente_id")
        if isinstance(fid, str) and fid.strip():
            out.add(fid.strip())
        for value in obj.values():
            _collect_fuente_ids(value, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_fuente_ids(item, out)


def infer_format_from_url(url: str, archivo_raw: str | None = None) -> str:
    """Infiere el formato de fuente (`csv`, `json`, `pdf`, `html`) desde URL o archivo."""
    candidates = [archivo_raw or "", url]
    for candidate in candidates:
        lower = candidate.lower()
        if ".csv" in lower or "format=csv" in lower:
            return "csv"
        if ".pdf" in lower:
            return "pdf"
        if ".json" in lower or "comtradeapi.un.org" in lower or "/api/" in lower:
            return "json"
    return "html"


def _safe_filename(fuente_id: str, url: str, formato: str) -> str:
    parsed = urlparse(url)
    leaf = Path(parsed.path).name
    if leaf and "." in leaf and len(leaf) <= 80:
        safe = re.sub(r"[^A-Za-z0-9._-]+", "_", leaf)
        return safe
    ext = formato if formato in ("csv", "json", "pdf", "html", "txt") else "dat"
    safe_id = re.sub(r"[^A-Za-z0-9._-]+", "_", fuente_id)
    return f"{safe_id}.{ext}"


def map_fuentes_to_products(validated_dir: Path) -> dict[str, set[str]]:
    """Mapea cada `fuente_id` al conjunto de `producto_id` que la citan en `data/validated/`."""
    mapping: dict[str, set[str]] = {}
    procesos = _load_json_list(validated_dir / "procesos.json")
    proc_to_prod = {
        str(p["proceso_id"]): str(p["producto_id"])
        for p in procesos
        if p.get("proceso_id") and p.get("producto_id")
    }

    for fname in (
        "produccion.json",
        "comercio_exterior.json",
        "plantas.json",
        "productos_zonas.json",
        "procesos.json",
    ):
        for row in _load_json_list(validated_dir / fname):
            prod = row.get("producto_id")
            if not isinstance(prod, str) or not prod:
                continue
            fids: set[str] = set()
            _collect_fuente_ids(row, fids)
            for fid in fids:
                mapping.setdefault(fid, set()).add(prod)

    for fname in ("pasos_proceso.json", "conexiones_proceso.json"):
        for row in _load_json_list(validated_dir / fname):
            proc_id = row.get("proceso_id")
            prod = proc_to_prod.get(str(proc_id)) if proc_id else None
            if not prod:
                continue
            fids = set()
            _collect_fuente_ids(row, fids)
            for fid in fids:
                mapping.setdefault(fid, set()).add(prod)

    return mapping


def list_validated_products(validated_dir: Path) -> list[ProductCatalogEntry]:
    """Lista todos los productos validados con sus fuentes y provincias asociadas."""
    productos = _load_json_list(validated_dir / "productos.json")
    zonas = _load_json_list(validated_dir / "productos_zonas.json")
    fuente_to_prods = map_fuentes_to_products(validated_dir)

    prod_to_fuentes: dict[str, set[str]] = {}
    for fid, prods in fuente_to_prods.items():
        for prod in prods:
            prod_to_fuentes.setdefault(prod, set()).add(fid)

    prod_to_provs: dict[str, set[str]] = {}
    for z in zonas:
        prod = z.get("producto_id")
        prov = z.get("provincia_id")
        if isinstance(prod, str) and isinstance(prov, str):
            prod_to_provs.setdefault(prod, set()).add(prov)

    entries: list[ProductCatalogEntry] = []
    for p in productos:
        pid = str(p["producto_id"])
        entries.append(
            ProductCatalogEntry(
                producto_id=pid,
                nombre=str(p.get("nombre", pid)),
                categoria=str(p.get("categoria", "")),
                formula_quimica=p.get("formula_quimica"),
                fuente_ids=tuple(sorted(prod_to_fuentes.get(pid, set()))),
                provincias=tuple(sorted(prod_to_provs.get(pid, set()))),
            )
        )
    return entries


def resolve_product_source_specs(
    *,
    validated_dir: Path,
    producto_id: str,
    raw_dir: Path | None = None,
    only_types: set[str] | None = None,
) -> list[SourceSpec]:
    """
    Construye las `SourceSpec` del producto consultando `data/validated/fuentes.json` y sus citas.
    Si un archivo crudo ya existe en `raw_dir` se reutiliza; si no, `local_path=None` (descarga en memoria).
    """
    fuentes = _load_json_list(validated_dir / "fuentes.json")
    fuentes_by_id = {str(f["fuente_id"]): f for f in fuentes if f.get("fuente_id")}
    fuente_to_prods = map_fuentes_to_products(validated_dir)

    matched_ids = sorted(fid for fid, prods in fuente_to_prods.items() if producto_id in prods)
    specs: list[SourceSpec] = []
    for fid in matched_ids:
        f = fuentes_by_id.get(fid)
        if f is None:
            continue
        tipo = str(f.get("tipo", "oficial"))
        if only_types is not None and tipo not in only_types:
            continue
        url = str(f["url"])
        archivo_raw = f.get("archivo_raw")
        formato = infer_format_from_url(url, archivo_raw if isinstance(archivo_raw, str) else None)
        filename = _safe_filename(fid, url, formato)

        local_path: Path | None = None
        if raw_dir is not None:
            candidates = [raw_dir / filename]
            if isinstance(archivo_raw, str) and not archivo_raw.startswith("storage://"):
                candidates.insert(0, raw_dir.parent.parent / archivo_raw)
                candidates.insert(1, raw_dir / Path(archivo_raw).name)
            for cand in candidates:
                if cand.exists():
                    local_path = cand
                    filename = cand.name
                    break

        specs.append(
            SourceSpec(
                fuente_id=fid,
                nombre=str(f["nombre"]),
                organismo=str(f["organismo"]),
                tipo=tipo,  # type: ignore[arg-type]
                url=url,
                filename=filename,
                formato=formato,
                local_path=local_path,
                notas=f.get("notas"),
                fecha_descarga=f.get("fecha_descarga"),
            )
        )
    return specs


def build_product_catalog_context(validated_dir: Path, producto_id: str) -> str | None:
    """
    Construye un contexto de referencia liviano con IDs canónicos (provincias, departamentos,
    empresas, plantas y rutas) sin incluir cifras de producción ni comercio exterior, para que
    los Agentes 1 y 2 mantengan consistencia relacional sin sesgar sus extracciones.
    """
    productos = _load_json_list(validated_dir / "productos.json")
    product = next((p for p in productos if p.get("producto_id") == producto_id), None)
    if product is None:
        return None

    provincias = _load_json_list(validated_dir / "provincias.json")
    departamentos = _load_json_list(validated_dir / "departamentos.json")
    plantas = [p for p in _load_json_list(validated_dir / "plantas.json") if p.get("producto_id") == producto_id]
    zonas = [z for z in _load_json_list(validated_dir / "productos_zonas.json") if z.get("producto_id") == producto_id]
    procesos = [pr for pr in _load_json_list(validated_dir / "procesos.json") if pr.get("producto_id") == producto_id]

    prov_by_id = {str(p["provincia_id"]): str(p["nombre"]) for p in provincias if p.get("provincia_id")}
    depto_by_id = {
        str(d["departamento_id"]): f"{d.get('nombre')} (prov {d.get('provincia_id')})"
        for d in departamentos
        if d.get("departamento_id")
    }

    payload = {
        "producto": {
            "producto_id": product.get("producto_id"),
            "nombre": product.get("nombre"),
            "categoria": product.get("categoria"),
            "formula_quimica": product.get("formula_quimica"),
        },
        "zonas_canonicas": [
            {
                "provincia_id": z.get("provincia_id"),
                "provincia": prov_by_id.get(str(z.get("provincia_id")), ""),
                "departamento_id": z.get("departamento_id"),
                "departamento": depto_by_id.get(str(z.get("departamento_id")), ""),
                "rol_en_cadena": z.get("rol_en_cadena"),
            }
            for z in zonas
        ],
        "plantas_registradas": [
            {
                "planta_id": pl.get("planta_id"),
                "empresa_id": pl.get("empresa_id"),
                "nombre": pl.get("nombre"),
                "provincia_id": pl.get("provincia_id"),
                "departamento_id": pl.get("departamento_id"),
                "localidad": pl.get("localidad"),
            }
            for pl in plantas
        ],
        "procesos_existentes": [
            {
                "proceso_id": pr.get("proceso_id"),
                "nombre": pr.get("nombre"),
                "es_ruta_principal": pr.get("es_ruta_principal", True),
            }
            for pr in procesos
        ],
        "codigos_provincias_ign": prov_by_id,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)
