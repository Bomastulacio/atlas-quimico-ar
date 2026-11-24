"""Extractores deterministas de CSV, JSON, PDF y HTML con citas exactas de ubicación."""

from __future__ import annotations

import csv
import io
import json
import re
from dataclasses import dataclass, field
from typing import Any

from pypdf import PdfReader

from atlas_pipeline.harness.security import InjectionFinding, fence_untrusted_content
from atlas_pipeline.tools.fetcher import FetchedSource


@dataclass(frozen=True)
class CitedRow:
    """Fila o fragmento extraído de una fuente con su ubicación auditable exacta."""

    cita_ubicacion: str
    data: dict[str, Any]


@dataclass
class ParsedSource:
    fuente_id: str
    formato: str
    sha256_hash: str
    url: str
    filename: str
    rows: list[CitedRow] = field(default_factory=list)
    fenced_text: str = ""
    injection_findings: list[InjectionFinding] = field(default_factory=list)


def _strip_html(html_text: str) -> str:
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html_text, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r"<[^>]+>", "\n", cleaned)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in cleaned.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def parse_source(fetched: FetchedSource) -> ParsedSource:
    """Convierte archivos crudos (en memoria o disco) a filas citadas y texto cercado."""
    fmt = fetched.spec.formato.lower()
    raw_bytes = fetched.raw_bytes if fetched.raw_bytes else (
        fetched.raw_path.read_bytes() if fetched.raw_path is not None else b""
    )
    filename = fetched.raw_path.name if fetched.raw_path is not None else fetched.spec.filename
    rows: list[CitedRow] = []
    plain_chunks: list[str] = []

    if fmt == "csv":
        text = raw_bytes.decode("utf-8-sig", errors="replace")
        reader = csv.DictReader(io.StringIO(text))
        for idx, row in enumerate(reader, start=2):
            clean_row = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items() if k}
            first_key = next(iter(clean_row.keys()), "")
            key_val = clean_row.get(first_key, "")
            cita = f"{filename} fila {idx}" + (f" ({first_key}={key_val})" if key_val else "")
            rows.append(CitedRow(cita_ubicacion=cita, data=clean_row))
            plain_chunks.append(f"[fila {idx}] {json.dumps(clean_row, ensure_ascii=False)}")

    elif fmt == "json":
        text = raw_bytes.decode("utf-8-sig", errors="replace")
        payload = json.loads(text)
        records = payload.get("data") if isinstance(payload, dict) and isinstance(payload.get("data"), list) else (
            payload if isinstance(payload, list) else [payload]
        )
        for idx, item in enumerate(records):
            if isinstance(item, dict):
                cmd = item.get("cmdCode")
                flow = item.get("flowCode")
                period = item.get("period")
                tag = f"cmdCode={cmd} flow={flow} period={period}" if cmd else f"item[{idx}]"
                rows.append(CitedRow(cita_ubicacion=f"{filename} {tag}", data=item))
                plain_chunks.append(f"[{tag}] {json.dumps(item, ensure_ascii=False)}")

    elif fmt == "pdf":
        reader = PdfReader(io.BytesIO(raw_bytes))
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = (page.extract_text() or "").strip()
            if not page_text:
                continue
            rows.append(
                CitedRow(
                    cita_ubicacion=f"{filename} pág. {page_num}",
                    data={"pagina": page_num, "texto": page_text[:4000]},
                )
            )
            plain_chunks.append(f"[pág. {page_num}]\n{page_text[:2500]}")

    elif fmt == "html":
        text = raw_bytes.decode("utf-8", errors="replace")
        stripped = _strip_html(text)
        for line_num, line in enumerate(stripped.splitlines()[:400], start=1):
            rows.append(CitedRow(cita_ubicacion=f"{filename} línea {line_num}", data={"texto": line}))
        plain_chunks.append(stripped)

    else:
        text = raw_bytes.decode("utf-8", errors="replace")
        plain_chunks.append(text)

    combined_text = "\n".join(plain_chunks)
    fenced, findings = fence_untrusted_content(
        combined_text,
        fuente_id=fetched.fuente.fuente_id,
        url=fetched.fuente.url,
        content_hash=fetched.sha256_hash,
    )

    return ParsedSource(
        fuente_id=fetched.fuente.fuente_id,
        formato=fmt,
        sha256_hash=fetched.sha256_hash,
        url=fetched.fuente.url,
        filename=filename,
        rows=rows,
        fenced_text=fenced,
        injection_findings=findings,
    )
