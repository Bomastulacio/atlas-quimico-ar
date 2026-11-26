"""Cliente unificado para Google Gemini (SDK oficial `google-genai` Interactions API)."""

from __future__ import annotations

from collections.abc import Callable

from pydantic import BaseModel

from atlas_pipeline.config import PipelineSettings


def assemble_context_blocks(blocks: list[str], max_total_chars: int) -> str:
    """
    Ensambla bloques cercados distribuyendo el presupuesto total de contexto de forma equilibrada
    para evitar que una fuente muy extensa trunque por completo a las demás.
    """
    if not blocks:
        return ""

    joined = "\n\n".join(blocks)
    if len(joined) <= max_total_chars:
        return joined

    per_block = max(2_000, (max_total_chars - 64 * len(blocks)) // len(blocks))
    trimmed: list[str] = []
    for block in blocks:
        if len(block) <= per_block:
            trimmed.append(block)
        else:
            suffix = "\n...[BLOQUE RECORTADO POR PRESUPUESTO GLOBAL DE CONTEXTO]...\n</untrusted_source>"
            keep = max(500, per_block - len(suffix))
            trimmed.append(block[:keep] + suffix)
    return "\n\n".join(trimmed)[:max_total_chars]


def create_structured_gemini_invoker[TModel: BaseModel](
    *,
    settings: PipelineSettings,
    output_model: type[TModel],
    default_model: str,
    agent_label: str,
) -> Callable[[str, str, str], tuple[TModel, int, int]]:
    """
    Construye un invocador tipado sobre `google-genai` (`client.interactions.create`)
    con salida JSON estricta validada contra Pydantic, `temperature=0.0` y `store=False`.
    """
    if not settings.google_api_key:
        raise RuntimeError(
            f"Falta GOOGLE_API_KEY en el entorno para ejecutar {agent_label} con Gemini."
        )

    from google import genai

    client = genai.Client(api_key=settings.google_api_key)
    schema = output_model.model_json_schema()

    def _invoke(system_prompt: str, user_prompt: str, model_name: str) -> tuple[TModel, int, int]:
        interaction = client.interactions.create(
            model=model_name or default_model,
            system_instruction=system_prompt,
            input=user_prompt,
            response_format={
                "type": "text",
                "mime_type": "application/json",
                "schema": schema,
            },
            generation_config={
                "temperature": 0.0,
                "max_output_tokens": settings.max_output_tokens,
            },
            store=False,
        )
        raw_text = interaction.output_text
        if not raw_text:
            raise RuntimeError(f"{agent_label} devolvió una respuesta vacía desde Gemini.")

        parsed = output_model.model_validate_json(raw_text)

        usage = getattr(interaction, "usage", None)
        tokens_in = (
            getattr(usage, "total_input_tokens", None)
            or getattr(usage, "input_tokens", None)
            or max(1, (len(system_prompt) + len(user_prompt)) // 4)
        )
        tokens_out = (
            getattr(usage, "total_output_tokens", None)
            or getattr(usage, "output_tokens", None)
            or max(1, len(raw_text) // 4)
        )
        return parsed, int(tokens_in), int(tokens_out)

    return _invoke
