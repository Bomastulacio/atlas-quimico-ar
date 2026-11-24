# Pipeline offline de agentes LangGraph (Etapa 4 + base para Etapa 5)

Pipeline en **Python + LangGraph** gestionado con `uv` (`pyproject.toml` + `uv.lock`). Corre **exclusivamente offline**, nunca dentro del sitio Astro ni con escritura directa a `main` o a Supabase producción sin aprobación humana explícita (`interrupt`).

## Arquitectura (Harness & Loop Engineering)

Inspirado en prácticas de ingeniería de loops en producción (Uber Engineering / LangGraph `StateGraph`):

1. **Plano de control externo al modelo (`harness/budget.py`):**
   - `ExecutionBudget` con topes duros de pasos (`PIPELINE_MAX_STEPS_PER_RUN`), llamadas LLM (`PIPELINE_MAX_LLM_CALLS`) y costo (`PIPELINE_MAX_COST_USD=0.00`).
   - `TokenBucketRateLimiter` (`PIPELINE_MAX_RPM=5`), backoff exponencial con jitter ante `429 ResourceExhausted` y `CircuitBreaker` para cuidar la cuota gratuita de Google Gemini API.
2. **Cache direccionado por contenido SHA-256 (`harness/cache.py`):**
   - Indexado por `sha256(source_hashes + prompt_version + model + feedback)`. Re-ejecutar sobre fuentes sin cambios consume **0 tokens**.
3. **Seguridad Zero-Trust (`harness/security.py`):**
   - Lista blanca estricta de herramientas por agente (`AGENT_TOOL_ALLOWLIST`) y de dominios oficiales (`DEFAULT_ALLOWED_DOMAINS`).
   - Escáner y cercado XML de datos externos (`<untrusted_source>`) para detectar y neutralizar intentos de *prompt injection*.
4. **Trazabilidad completa (`harness/telemetry.py`):**
   - Cada nodo emite un `AuditEvent` en `pipeline/.state/audit_trail.jsonl` (atribución de actor, hashes de salida, latencia, tokens y cache hits).
5. **Orquestador cíclico + checkpointer SQLite (`graph.py`):**
   - `fetch_sources` → `parse_sources` → `agent1_extract` ⇄ `validate_data_gate` → `agent2_draft_process` ⇄ `chemical_verify_gate` (6 verificadores deterministas de Sección 6.2 en `chem/verifiers.py`) → `agent3_verify` (Verificador independiente con contexto limpio y barrera anti falsos-aprobados) → `export_staging` (`data/staging/<producto>/upsert_supabase.sql` con tablas de datos + `procesos`, `pasos_proceso` y `conexiones_proceso`, más `reporte_revision.md`) → `human_review` (`interrupt()`).

## Comandos

```bash
cd pipeline

# Instalar dependencias en entorno virtual aislado con uv
uv sync

# Ejecutar tests unitarios, harness, orquestador y benchmark contra Set de Oro de Aluminio
uv run pytest -v

# Linter estático
uv run ruff check src tests

# Corrida offline (0 tokens) sobre fuentes crudas oficiales de Aluminio hasta pausa interrupt()
uv run atlas-pipeline run-aluminio --deterministic-only

# Reanudar un thread pausado en human_review
uv run atlas-pipeline resume --thread-id <run_id> --approve --comment "OK para subir a Supabase"
```
