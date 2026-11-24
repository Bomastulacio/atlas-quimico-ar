# Pipeline offline de agentes (Etapas 4 y 5)

Esta carpeta alojará el pipeline en **Python + LangGraph** gestionado con `uv` (`pyproject.toml` + `uv.lock`). No corre en el sitio web ni tiene permisos de escritura sobre `main` ni sobre bases de producción.

## Arquitectura prevista

1. **Orquestador (LangGraph):** estado tipado con checkpointer persistente, máximo 2 reintentos por paso, límites de costo/RPM para cuota gratuita de Google Gemini API y pausa obligatoria con `interrupt` para aprobación humana.
2. **Nodos deterministas (código Python):** descarga con SHA-256, validación Pydantic, suite de verificación química (balance atómico con masas molares, balance de masa global, estequiometría/rendimiento, orden de magnitud energético, coherencia de grafo de flujo y plausibilidad geográfica/comercial), reporte y armado de PR.
3. **Agente 1 (Datos):** `AGENT1_MODEL` (ej. `gemini-2.5-flash`). Descarga y normaliza datasets oficiales citando archivo y celda/página. Trata todo documento como dato no confiable.
4. **Agente 2 (Procesos químicos):** `AGENT2_MODEL` (ej. `gemini-2.5-pro`). Redacta el JSON de pasos/reacciones desde bibliografía citada y lo somete a los verificadores deterministas.
5. **Agente 3 (Verificador independiente):** `AGENT3_MODEL` (ej. `gemini-2.5-pro`). Audita con contexto limpio sin acceso al razonamiento previo y emite únicamente `APROBADO`, `RECHAZADO` o `REQUIERE_REVISION_HUMANA` con motivo.

Se implementará en las **Etapas 4 y 5**, evaluado contra el **set de oro de Aluminio** construido a mano en la Etapa 3.
