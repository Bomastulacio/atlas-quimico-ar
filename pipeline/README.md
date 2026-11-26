# Pipeline offline de agentes LangGraph (Multi-producto + Watchdog para crons)

Pipeline en **Python + LangGraph + Google GenAI (`google-genai` Interactions API)** gestionado con `uv` (`pyproject.toml` + `uv.lock`). Corre **exclusivamente offline**, nunca dentro del sitio Astro ni con escritura directa a `main` o a Supabase producción sin aprobación humana explícita (`interrupt()`).

## Arquitectura (Harness & Loop Engineering)

1. **Plano de control externo al modelo (`harness/budget.py` y `config.py`):**
   - `ExecutionBudget` con topes duros de pasos (`PIPELINE_MAX_STEPS_PER_RUN=40`), llamadas LLM (`PIPELINE_MAX_LLM_CALLS=18`) y costo (`PIPELINE_MAX_COST_USD=0.00`).
   - `TokenBucketRateLimiter` (`PIPELINE_MAX_RPM=5`), backoff exponencial con jitter ante `429 ResourceExhausted` y `CircuitBreaker`.
   - Modelos configurables por `.env` sobre familia Gemini 4 (ventana de 1M tokens): `AGENT1_MODEL=gemini-4-hydrogen`, `AGENT2_MODEL=gemini-4-argon`, `AGENT3_MODEL=gemini-4-neon`.
2. **Contexto ampliado y equilibrado (`harness/gemini_client.py`, `tools/parsers.py`, `tools/catalog.py`):**
   - Hasta `120.000` caracteres por fuente (`PIPELINE_MAX_SOURCE_CHARS`), `480.000` caracteres globales (`PIPELINE_MAX_TOTAL_CONTEXT_CHARS`), `12.000` por página PDF (`PIPELINE_MAX_PDF_PAGE_CHARS`), `2.000` líneas HTML (`PIPELINE_MAX_HTML_LINES`) y `16.384` tokens de salida (`PIPELINE_MAX_OUTPUT_TOKENS`).
   - Contexto canónico por producto (`build_product_catalog_context`) inyectado solo a Agentes 1 y 2 (códigos IGN de provincias/departamentos, plantas y rutas registradas, sin cifras previas). Agente 3 mantiene aislamiento estricto.
3. **Cache direccionado por contenido SHA-256 (`harness/cache.py`):**
   - Indexado por `sha256(source_hashes + prompt_version + model)`. Re-ejecutar sobre fuentes sin cambios consume **0 tokens**.
4. **Seguridad Zero-Trust (`harness/security.py`):**
   - Lista blanca estricta de herramientas por agente (`AGENT_TOOL_ALLOWLIST`) y de dominios oficiales, científicos y operadores auditados (`DEFAULT_ALLOWED_DOMAINS`: INDEC, Georef, CKAN Energía, SAGyP, Minería/SIACAM, BCRA, UN Comtrade, USGS, IPCC, EU BREF, DOE AFDC, PubChem, NIST, OpenAlex y Crossref).
   - Escáner y cercado XML (`<untrusted_source>`) contra *prompt injection*.
5. **Watchdog SHA-256 para crons (`tools/watchdog.py`):**
   - Audita en memoria las URLs de `data/validated/fuentes.json` con **0 tokens LLM**, detecta fuentes `UNCHANGED`, `CHANGED`, `BROKEN` o `BLOCKED_DOMAIN`, genera `pipeline/.state/watchdog_latest.{json,md}` y con `--trigger-changed` dispara el pipeline solo sobre los productos afectados.
6. **Orquestador cíclico + checkpointer SQLite (`graph.py`):**
   - `fetch_sources` -> `parse_sources` -> `agent1_extract` <-> `validate_data_gate` -> `agent2_draft_process` <-> `chemical_verify_gate` (6 verificadores deterministas) -> `agent3_verify` (contexto limpio y 0% falsos aprobados) -> `export_staging` -> `human_review` (`interrupt()`).

## Comandos

```bash
cd pipeline

# Instalar dependencias en entorno virtual aislado con uv
uv sync

# Ejecutar tests unitarios, harness, catálogo, watchdog y benchmark Aluminio
uv run pytest -v

# Linter estático
uv run ruff check src tests

# Listar los 11 productos validados y cuántas fuentes tiene cada uno
uv run atlas-pipeline list-products

# Watchdog de 0 tokens (ideal para cron semanal/diario)
uv run atlas-pipeline watch --only-official --fail-on-broken

# Watchdog que dispara el pipeline SOLO si alguna fuente cambió de SHA-256
uv run atlas-pipeline watch --only-official --trigger-changed --deterministic-only

# Correr cualquier producto del catálogo (ej. metanol, polipropileno, litio, bioetanol-maiz)
uv run atlas-pipeline run --producto metanol --only-official --deterministic-only

# Reanudar un thread pausado en human_review
uv run atlas-pipeline resume --thread-id <run_id> --producto metanol --approve --comment "OK para Supabase"
```
