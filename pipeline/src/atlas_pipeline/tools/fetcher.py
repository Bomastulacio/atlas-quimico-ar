"""Descarga determinista en memoria + archivado en Supabase Storage (0 MB en disco local)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

import httpx

from atlas_pipeline.harness.cache import compute_sha256_bytes
from atlas_pipeline.harness.security import validate_source_url
from atlas_pipeline.schemas import Fuente, TipoFuente

_MIME_BY_FORMAT: dict[str, str] = {
    "pdf": "application/pdf",
    "csv": "text/csv",
    "json": "application/json",
    "html": "text/html",
    "txt": "text/plain",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


@dataclass(frozen=True)
class SourceSpec:
    """Declaración de una fuente primaria a descargar en memoria o leer de disco."""

    fuente_id: str
    nombre: str
    organismo: str
    tipo: TipoFuente
    url: str
    filename: str
    formato: str  # "csv" | "json" | "pdf" | "html" | "txt"
    local_path: Path | None = None
    notas: str | None = None
    fecha_descarga: str | None = None


@dataclass(frozen=True)
class FetchedSource:
    spec: SourceSpec
    raw_path: Path | None
    raw_bytes: bytes
    sha256_hash: str
    size_bytes: int
    fuente: Fuente
    from_local_cache: bool
    storage_uri: str | None = None


def upload_raw_to_supabase_storage(
    *,
    raw_bytes: bytes,
    object_path: str,
    content_type: str,
    supabase_url: str,
    service_role_key: str,
    bucket: str = "atlas-raw-sources",
    timeout_seconds: float = 60.0,
) -> str:
    """Sube un archivo crudo al bucket privado de Supabase Storage con upsert idempotente."""
    endpoint = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path.lstrip('/')}"
    with httpx.Client(timeout=timeout_seconds) as client:
        resp = client.post(
            endpoint,
            content=raw_bytes,
            headers={
                "apikey": service_role_key,
                "Authorization": f"Bearer {service_role_key}",
                "Content-Type": content_type,
                "x-upsert": "true",
            },
        )
        resp.raise_for_status()
    return f"storage://{bucket}/{object_path.lstrip('/')}"


def fetch_source(
    spec: SourceSpec,
    raw_dir: Path | None = None,
    *,
    timeout_seconds: float = 30.0,
    extra_allowed_domains: frozenset[str] | None = None,
    prefer_existing: bool = True,
    persist_local: bool = False,
    supabase_url: str | None = None,
    supabase_service_role_key: str | None = None,
    supabase_bucket: str = "atlas-raw-sources",
) -> FetchedSource:
    """
    Descarga bytes crudos en memoria, calcula SHA-256 y:
    - Si `supabase_url` y `supabase_service_role_key` están configurados, archiva en el bucket
      privado de Supabase Storage (`storage://atlas-raw-sources/...`) sin ocupar disco local.
    - Solo escribe en `raw_dir` si `persist_local=True` (por defecto False para no llenar la PC).
    """
    target_path: Path | None = spec.local_path
    if target_path is None and raw_dir is not None:
        candidate = raw_dir / spec.filename
        if candidate.exists() or persist_local:
            target_path = candidate

    from_local_cache = False
    if target_path is not None and target_path.exists() and prefer_existing:
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
        if persist_local and target_path is not None:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(raw_bytes)
        elif not persist_local:
            target_path = None

    digest = compute_sha256_bytes(raw_bytes)
    fecha = spec.fecha_descarga or date.today().isoformat()

    storage_uri: str | None = None
    if supabase_url and supabase_service_role_key:
        object_path = f"{spec.fuente_id}/{spec.filename}"
        mime = _MIME_BY_FORMAT.get(spec.formato.lower(), "application/octet-stream")
        storage_uri = upload_raw_to_supabase_storage(
            raw_bytes=raw_bytes,
            object_path=object_path,
            content_type=mime,
            supabase_url=supabase_url,
            service_role_key=supabase_service_role_key,
            bucket=supabase_bucket,
            timeout_seconds=max(timeout_seconds, 60.0),
        )

    archivo_raw: str | None = storage_uri
    if archivo_raw is None and target_path is not None:
        if raw_dir is not None:
            try:
                archivo_raw = target_path.resolve().relative_to(raw_dir.resolve().parent.parent).as_posix()
            except ValueError:
                archivo_raw = f"data/raw/{target_path.name}"
        else:
            archivo_raw = f"data/raw/{target_path.name}"

    fuente = Fuente(
        fuente_id=spec.fuente_id,
        nombre=spec.nombre,
        organismo=spec.organismo,
        tipo=spec.tipo,
        url=spec.url,
        fecha_descarga=fecha,
        hash=digest,
        archivo_raw=archivo_raw,
        notas=spec.notas,
    )

    return FetchedSource(
        spec=spec,
        raw_path=target_path,
        raw_bytes=raw_bytes,
        sha256_hash=digest,
        size_bytes=len(raw_bytes),
        fuente=fuente,
        from_local_cache=from_local_cache,
        storage_uri=storage_uri,
    )
