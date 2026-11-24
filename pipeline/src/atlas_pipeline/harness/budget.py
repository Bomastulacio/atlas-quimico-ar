"""Plano de control externo: presupuesto, rate limiting, circuit breaker y backoff."""

from __future__ import annotations

import random
import time
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import TypeVar

T = TypeVar("T")


class BudgetExceededError(RuntimeError):
    """Se dispara cuando una corrida alcanza su tope de pasos, llamadas LLM o costo."""


class CircuitOpenError(RuntimeError):
    """Se dispara cuando fallos consecutivos abren el circuit breaker del proveedor LLM."""


@dataclass
class ExecutionBudget:
    """Límites duros externos al modelo (el agente nunca puede modificarlos)."""

    max_steps: int = 25
    max_llm_calls: int = 12
    max_cost_usd: float = 0.0
    steps_used: int = 0
    llm_calls_used: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    estimated_cost_usd: float = 0.0
    cache_hits: int = 0

    def consume_step(self, step_name: str) -> None:
        if self.steps_used >= self.max_steps:
            raise BudgetExceededError(
                f"Tope de pasos agotado ({self.steps_used}/{self.max_steps}) antes de '{step_name}'"
            )
        self.steps_used += 1

    def consume_llm_call(
        self,
        tokens_in: int = 0,
        tokens_out: int = 0,
        cost_usd: float = 0.0,
    ) -> None:
        if self.llm_calls_used >= self.max_llm_calls:
            raise BudgetExceededError(
                f"Tope de llamadas LLM agotado ({self.llm_calls_used}/{self.max_llm_calls})"
            )
        if self.estimated_cost_usd + cost_usd > self.max_cost_usd + 1e-9:
            raise BudgetExceededError(
                f"Tope de costo USD agotado ({self.estimated_cost_usd + cost_usd:.4f} > {self.max_cost_usd:.4f})"
            )
        self.llm_calls_used += 1
        self.tokens_in += max(0, tokens_in)
        self.tokens_out += max(0, tokens_out)
        self.estimated_cost_usd += max(0.0, cost_usd)

    def record_cache_hit(self) -> None:
        self.cache_hits += 1

    def to_dict(self) -> dict[str, int | float]:
        return {
            "max_steps": self.max_steps,
            "steps_used": self.steps_used,
            "max_llm_calls": self.max_llm_calls,
            "llm_calls_used": self.llm_calls_used,
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "estimated_cost_usd": round(self.estimated_cost_usd, 6),
            "cache_hits": self.cache_hits,
        }


class TokenBucketRateLimiter:
    """Rate limiter determinista por ventana deslizante (ideal para Gemini Free Tier RPM)."""

    def __init__(self, max_rpm: int, clock: Callable[[], float] | None = None, sleeper: Callable[[float], None] | None = None) -> None:
        if max_rpm < 1:
            raise ValueError("max_rpm debe ser >= 1")
        self.max_rpm = max_rpm
        self._clock = clock or time.monotonic
        self._sleep = sleeper or time.sleep
        self._timestamps: deque[float] = deque()

    def acquire(self) -> float:
        """Espera lo mínimo indispensable si se alcanzó `max_rpm`. Devuelve segundos esperados."""
        now = self._clock()
        window_start = now - 60.0
        while self._timestamps and self._timestamps[0] <= window_start:
            self._timestamps.popleft()

        waited = 0.0
        if len(self._timestamps) >= self.max_rpm:
            oldest = self._timestamps[0]
            wait_for = max(0.0, (oldest + 60.0) - now)
            if wait_for > 0:
                self._sleep(wait_for)
                waited = wait_for
                now = self._clock()
                window_start = now - 60.0
                while self._timestamps and self._timestamps[0] <= window_start:
                    self._timestamps.popleft()

        self._timestamps.append(self._clock())
        return waited


@dataclass
class CircuitBreaker:
    """Evita martillar la API gratuita cuando devuelve 429/503 repetidos."""

    failure_threshold: int = 3
    reset_timeout_seconds: float = 60.0
    consecutive_failures: int = 0
    opened_at: float | None = field(default=None)

    def check(self, now: float | None = None) -> None:
        current = now if now is not None else time.monotonic()
        if self.opened_at is not None:
            if current - self.opened_at < self.reset_timeout_seconds:
                raise CircuitOpenError(
                    f"Circuit breaker abierto tras {self.consecutive_failures} fallos consecutivos"
                )
            # Half-open: permitir un intento de prueba
            self.opened_at = None

    def record_success(self) -> None:
        self.consecutive_failures = 0
        self.opened_at = None

    def record_failure(self, now: float | None = None) -> None:
        self.consecutive_failures += 1
        if self.consecutive_failures >= self.failure_threshold:
            self.opened_at = now if now is not None else time.monotonic()


def retry_with_backoff[T](
    fn: Callable[[], T],
    max_retries: int = 2,
    base_delay: float = 1.5,
    retryable_exceptions: tuple[type[BaseException], ...] = (TimeoutError, ConnectionError),
    sleeper: Callable[[float], None] | None = None,
) -> T:
    """Backoff exponencial con jitter acotado (respeta cuota gratuita y errores 429/transitorios)."""
    sleep_fn = sleeper or time.sleep
    attempt = 0
    while True:
        try:
            return fn()
        except retryable_exceptions:
            if attempt >= max_retries:
                raise
            delay = base_delay * (2**attempt) + random.uniform(0.0, 0.5)
            sleep_fn(delay)
            attempt += 1
        except Exception as exc:
            # Detectar errores 429 / ResourceExhausted del SDK de Gemini sin acoplar a una versión fija
            msg = f"{type(exc).__name__}: {exc}".lower()
            is_rate_limit = "429" in msg or "resourceexhausted" in msg or "quota" in msg
            if not is_rate_limit or attempt >= max_retries:
                raise
            delay = base_delay * (2 ** (attempt + 1)) + random.uniform(0.2, 1.0)
            sleep_fn(delay)
            attempt += 1
