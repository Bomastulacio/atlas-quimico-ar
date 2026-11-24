"""Trazabilidad estructurada (Attribution Trail estilo Uber / OpenTelemetry-ready JSONL)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AuditEvent:
    run_id: str
    node: str
    actor: str
    action: str
    status: str
    input_hash: str | None = None
    output_hash: str | None = None
    latency_ms: float = 0.0
    tokens_in: int = 0
    tokens_out: int = 0
    cache_hit: bool = False
    details: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


class AuditTrail:
    """Registra cada paso del loop con atribución completa en JSONL persistente."""

    def __init__(self, log_path: Path | None = None) -> None:
        self.log_path = log_path
        self.events: list[AuditEvent] = []
        if self.log_path is not None:
            self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, event: AuditEvent) -> None:
        self.events.append(event)
        if self.log_path is not None:
            with self.log_path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(asdict(event), ensure_ascii=False) + "\n")
