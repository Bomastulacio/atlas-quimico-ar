"""Agentes LLM especializados (Agente 1 Datos, Agente 2 Procesos, Agente 3 Verificador)."""

from .data_agent import DataAgentResult, extract_deterministic_fastpath, run_agent1_data_extraction
from .process_agent import ProcessAgentResult, ProcessLLMExtractorFn, run_agent2_process_drafting
from .verifier_agent import (
    VerifierAgentResult,
    VerifierLLMFn,
    build_clean_verifier_prompt,
    run_agent3_independent_verification,
)

__all__ = [
    "DataAgentResult",
    "ProcessAgentResult",
    "ProcessLLMExtractorFn",
    "VerifierAgentResult",
    "VerifierLLMFn",
    "build_clean_verifier_prompt",
    "extract_deterministic_fastpath",
    "run_agent1_data_extraction",
    "run_agent2_process_drafting",
    "run_agent3_independent_verification",
]
