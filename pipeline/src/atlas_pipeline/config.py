"""Configuración tipada por variables de entorno (nunca modelos hardcodeados)."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def default_repo_root() -> Path:
    # pipeline/src/atlas_pipeline/config.py -> repo root (4 niveles arriba)
    return Path(__file__).resolve().parents[3]


class PipelineSettings(BaseSettings):
    """Parámetros de ejecución, enrutamiento de modelos y límites de cuota gratuita."""

    model_config = SettingsConfigDict(
        env_file=str(default_repo_root() / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Credenciales (opcionales en modo offline/mock o pruebas deterministas)
    google_api_key: str | None = Field(default=None, alias="GOOGLE_API_KEY")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_publishable_key: str | None = Field(default=None, alias="SUPABASE_PUBLISHABLE_KEY")

    # Modelos por rol (vía .env, nunca hardcodeados en agentes)
    agent1_model: str = Field(default="gemini-3.8-flash", alias="AGENT1_MODEL")
    agent2_model: str = Field(default="gemini-4-hydrogen", alias="AGENT2_MODEL")
    agent3_model: str = Field(default="gemini-4-neon", alias="AGENT3_MODEL")

    # Control Plane: límites estrictos de recursos para cuota gratuita
    max_retries_per_step: int = Field(default=2, ge=0, le=5, alias="PIPELINE_MAX_RETRIES_PER_STEP")
    max_steps_per_run: int = Field(default=25, ge=1, le=100, alias="PIPELINE_MAX_STEPS_PER_RUN")
    max_rpm: int = Field(default=5, ge=1, le=60, alias="PIPELINE_MAX_RPM")
    max_cost_usd: float = Field(default=0.0, ge=0.0, alias="PIPELINE_MAX_COST_USD")
    max_llm_calls_per_run: int = Field(default=12, ge=1, le=100, alias="PIPELINE_MAX_LLM_CALLS")
    http_timeout_seconds: float = Field(default=30.0, ge=5.0, le=120.0)

    # Rutas del repositorio
    repo_root: Path = Field(default_factory=default_repo_root)

    @property
    def raw_dir(self) -> Path:
        return self.repo_root / "data" / "raw"

    @property
    def staging_dir(self) -> Path:
        return self.repo_root / "data" / "staging"

    @property
    def validated_dir(self) -> Path:
        return self.repo_root / "data" / "validated"

    @property
    def golden_dir(self) -> Path:
        return self.repo_root / "data" / "golden"

    @property
    def cache_dir(self) -> Path:
        return self.repo_root / "pipeline" / ".cache"

    @property
    def state_dir(self) -> Path:
        return self.repo_root / "pipeline" / ".state"

    @property
    def checkpoint_db_path(self) -> Path:
        return self.state_dir / "checkpoints.db"

    @property
    def audit_log_path(self) -> Path:
        return self.state_dir / "audit_trail.jsonl"
