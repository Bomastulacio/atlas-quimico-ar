"""Watchdog determinista por SHA-256 (0 tokens LLM) para crons de monitoreo de fuentes."""

from __future__ import annotations

import json
from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

import httpx

from atlas_pipeline.harness.cache import compute_sha256_bytes
from atlas_pipeline.harness.security import enforce_tool_allowlist, validate_source_url
from atlas_pipeline.tools.catalog import map_fuentes_to_products

WatchStatus = Literal["UNCHANGED", "CHANGED", "BROKEN", "BLOCKED_DOMAIN"]

# Firma inyectable para tests deterministas: (url, timeout_seconds) -> (http_status, body_bytes)
HttpGetterFn = Callable[[str, float], tuple[int, bytes]]


@dataclass(frozen=True)
class SourceWatchResult:
    fuente_id: str
    nombre: str
    tipo: str
    url: str
    productos_afectados: list[str]
    expected_hash: str
    actual_hash: str | None
    http_status: int | None
    status: WatchStatus
    size_bytes: int
    error: str | None = None


@dataclass(frozen=True)
class WatchdogReport:
    checked_at: str
    total_checked: int
    unchanged: int
    changed: int
    broken: int
    blocked_domain: int
    affected_products: list[str]
    results: list[SourceWatchResult]

    def to_dict(self) -> dict[str, Any]:
        return {
            "checked_at": self.checked_at,
            "total_checked": self.total_checked,
            "unchanged": self.unchanged,
            "changed": self.changed,
            "broken": self.broken,
            "blocked_domain": self.blocked_domain,
            "affected_products": self.affected_products,
            "results": [asdict(r) for r in self.results],
        }

    def to_markdown(self) -> str:
        lines = [
            f"# Reporte Watchdog de Fuentes Oficiales ({self.checked_at})",
            "",
            f"- Fuentes auditadas: **{self.total_checked}** (consumo LLM: **0 tokens**)",
            f"- Sin cambios (`UNCHANGED`): **{self.unchanged}**",
            f"- Con cambios (`CHANGED`): **{self.changed}**",
            f"- Rotas o inaccesibles (`BROKEN`): **{self.broken}**",
            f"- Dominio fuera de allowlist (`BLOCKED_DOMAIN`): **{self.blocked_domain}**",
            f"- Productos afectados para re-proceso: `{', '.join(self.affected_products) or 'ninguno'}`",
            "",
        ]
        actionable = [r for r in self.results if r.status != "UNCHANGED"]
        if actionable:
            lines.extend(
                [
                    "## Novedades y alertas",
                    "",
                    "| Estado | Fuente | Productos | HTTP | Detalle |",
                    "| --- | --- | --- | --- | --- |",
                ]
            )
            for r in actionable:
                prods = ", ".join(r.productos_afectados) or "-"
                http_s = str(r.http_status) if r.http_status is not None else "-"
                detail = r.error or f"{r.expected_hash[:18]} -> {(r.actual_hash or '')[:18]}"
                lines.append(f"| `{r.status}` | `{r.fuente_id}` | {prods} | {http_s} | {detail} |")
            lines.append("")
        else:
            lines.append("Todas las fuentes verificadas coinciden bit a bit con `data/validated/fuentes.json`.")
            lines.append("")
        return "\n".join(lines)


def _default_http_getter(url: str, timeout_seconds: float) -> tuple[int, bytes]:
    with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
        resp = client.get(
            url,
            headers={"User-Agent": "AtlasQuimicoAR-Watchdog/0.2 (monitoreo-datos-publicos)"},
        )
        return resp.status_code, resp.content


def run_source_watchdog(
    *,
    validated_dir: Path,
    state_dir: Path | None = None,
    producto_id: str | None = None,
    only_types: set[str] | None = None,
    timeout_seconds: float = 30.0,
    extra_allowed_domains: frozenset[str] | None = None,
    http_getter: HttpGetterFn | None = None,
) -> WatchdogReport:
    """
    Audita las fuentes registradas en `data/validated/fuentes.json` descargando en memoria
    (0 MB en disco local, 0 tokens LLM) y comparando SHA-256 contra el hash validado.
    """
    enforce_tool_allowlist("orchestrator", "watch_sources")

    fuentes_path = validated_dir / "fuentes.json"
    fuentes: list[dict[str, Any]] = json.loads(fuentes_path.read_text(encoding="utf-8"))
    fuente_to_prods = map_fuentes_to_products(validated_dir)
    getter = http_getter or _default_http_getter

    results: list[SourceWatchResult] = []
    affected: set[str] = set()

    for f in fuentes:
        fid = str(f["fuente_id"])
        tipo = str(f.get("tipo", "oficial"))
        url = str(f["url"])
        expected_hash = str(f.get("hash", ""))
        prods = sorted(fuente_to_prods.get(fid, set()))

        if producto_id is not None and producto_id not in prods:
            continue
        if only_types is not None and tipo not in only_types:
            continue

        try:
            validate_source_url(url, extra_allowed_domains=extra_allowed_domains)
        except ValueError as exc:
            results.append(
                SourceWatchResult(
                    fuente_id=fid,
                    nombre=str(f.get("nombre", fid)),
                    tipo=tipo,
                    url=url,
                    productos_afectados=prods,
                    expected_hash=expected_hash,
                    actual_hash=None,
                    http_status=None,
                    status="BLOCKED_DOMAIN",
                    size_bytes=0,
                    error=str(exc),
                )
            )
            continue

        try:
            http_status, body = getter(url, timeout_seconds)
        except (httpx.HTTPError, OSError) as exc:
            results.append(
                SourceWatchResult(
                    fuente_id=fid,
                    nombre=str(f.get("nombre", fid)),
                    tipo=tipo,
                    url=url,
                    productos_afectados=prods,
                    expected_hash=expected_hash,
                    actual_hash=None,
                    http_status=None,
                    status="BROKEN",
                    size_bytes=0,
                    error=f"{type(exc).__name__}: {exc}",
                )
            )
            continue

        if http_status < 200 or http_status >= 300:
            results.append(
                SourceWatchResult(
                    fuente_id=fid,
                    nombre=str(f.get("nombre", fid)),
                    tipo=tipo,
                    url=url,
                    productos_afectados=prods,
                    expected_hash=expected_hash,
                    actual_hash=None,
                    http_status=http_status,
                    status="BROKEN",
                    size_bytes=len(body),
                    error=f"HTTP {http_status}",
                )
            )
            continue

        actual_hash = compute_sha256_bytes(body)
        if actual_hash == expected_hash:
            status: WatchStatus = "UNCHANGED"
        else:
            status = "CHANGED"
            affected.update(prods)

        results.append(
            SourceWatchResult(
                fuente_id=fid,
                nombre=str(f.get("nombre", fid)),
                tipo=tipo,
                url=url,
                productos_afectados=prods,
                expected_hash=expected_hash,
                actual_hash=actual_hash,
                http_status=http_status,
                status=status,
                size_bytes=len(body),
            )
        )

    report = WatchdogReport(
        checked_at=datetime.now(UTC).isoformat(timespec="seconds"),
        total_checked=len(results),
        unchanged=sum(1 for r in results if r.status == "UNCHANGED"),
        changed=sum(1 for r in results if r.status == "CHANGED"),
        broken=sum(1 for r in results if r.status == "BROKEN"),
        blocked_domain=sum(1 for r in results if r.status == "BLOCKED_DOMAIN"),
        affected_products=sorted(affected),
        results=results,
    )

    if state_dir is not None:
        state_dir.mkdir(parents=True, exist_ok=True)
        (state_dir / "watchdog_latest.json").write_text(
            json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        (state_dir / "watchdog_latest.md").write_text(report.to_markdown(), encoding="utf-8")

    return report
