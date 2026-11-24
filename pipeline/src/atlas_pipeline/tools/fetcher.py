"""Descarga determinista (o lectura local en data/raw) con cálculo obligatorio de SHA-256."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

import httpx

from atlas_pipeline.harness.cache import compute_sha256_bytes
from atlas_pipeline.harness.security import validate_source_url
from atlas_pipeline.schemas import Fuente, TipoFuente


@dataclass(frozen=True)
class SourceSpec:
    """Declaración de una fuente primaria a descargar o leer desde data/raw/."""

    fuente_id: str
    nombre: str
    organismo: str
    tipo: TipoFuente
    url: str
    filename: str
    formato: str  # "csv" | "json" | "pdf" | "html"
    local_path: Path | None = None
    notas: str | None = None
    fecha_descarga: str | None = None


@dataclass(frozen=True)
class FetchedSource:
    spec: SourceSpec
    raw_path: Path
    sha256_hash: str
    size_bytes: int
    fuente: Fuente
    from_local_cache: bool


def fetch_source(
    spec: SourceSpec,
    raw_dir: Path,
    *,
    timeout_seconds: float = 30.0,
    extra_allowed_domains: frozenset[str] | None = None,
    prefer_existing: bool = True,
) -> FetchedSource:
    """
    Obtiene bytes crudos de una fuente primaria, persiste en `data/raw/` y calcula SHA-256.
    Si `spec.local_path` existe (o ya existe en `raw_dir` y `prefer_existing=True`), evita
    descargas repetidas manteniendo 100% de reproducibilidad.
    """
    raw_dir.mkdir(parents=True, exist_ok=True)
    target_path = spec.local_path if spec.local_path is not None else (raw_dir / spec.filename)
    from_local_cache = False

    if target_path.exists() and prefer_existing:
        raw_bytes = target_path.read_bytes()
        from_local_cache = True
    else:
        validate_source_url(spec.url, extra_allowed_domains=extra_allowed_domains)
        with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
            resp = client.get(
                spec.url,
                headers={"User-Agent": "AtlasQuimicoAR-Pipeline/0.1 (datos-publicos)"},
            )
            resp.raise_for_status()
            raw_bytes = resp.content
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(raw_bytes)

    digest = compute_sha256_bytes(raw_bytes)
    fecha = spec.fecha_descarga or date.today().isoformat()

    try:
        rel_path = target_path.resolve().relative_to(raw_dir.resolve().parent.parent).as_posix()
    except ValueError:
        rel_path = f"data/raw/{target_path.name}"

    fuente = Fuente(
        fuente_id=spec.fuente_id,
        nombre=spec.nombre,
        organismo=spec.organismo,
        tipo=spec.tipo,
        url=spec.url,
        fecha_descarga=fecha,
        hash=digest,
        archivo_raw=rel_path,
        notas=spec.notas,
    )

    return FetchedSource(
        spec=spec,
        raw_path=target_path,
        sha256_hash=digest,
        size_bytes=len(raw_bytes),
        fuente=fuente,
        from_local_cache=from_local_cache,
    )
