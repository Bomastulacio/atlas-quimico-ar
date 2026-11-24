# Arquitectura Técnica, Dirección Visual y Pipeline de Agentes

## 1. Stack confirmado

- **Framework web:** Astro (generación estática `output: 'static'`) + MDX para ensayos técnicos largos.
- **Islas interactivas:** React 19 + TypeScript estricto.
- **Estilos:** Tailwind CSS v4 con tokens de diseño propios.
- **Micro-interacciones y movimiento:** `motion` (`motion/react`), siguiendo principios de **Bencho** (`bencho.dev`): físicas de resorte reales (`spring`), transiciones de estado sin saltos bruscos, tarjetas táctiles y controles adaptados tanto a desktop como a mobile.
- **Mapa (Etapa 2 y 7):** D3 (`d3-geo`) + SVG/GeoJSON simplificado del **IGN** con IDs oficiales Georef. Representación **bicontinental** (23 provincias + CABA + recuadro integrado del Sector Antártico e Islas del Atlántico Sur según normativa IGN).
- **Diagramas de proceso (Etapa 3+):** React Flow alimentado exclusivamente desde `procesos.json`, `pasos_proceso.json` y `conexiones_proceso.json`, enriquecido con micro-interacciones y esquemas visuales/ASCII por unidad operativa.
- **Validación:** Zod en el build de Node/Astro y Pydantic v2 en el pipeline Python.

---

## 2. Dirección visual y principios UX/UI (Taste Skill + Bencho + ASCII)

Para evitar la estética genérica de plantillas («AI slop»: gradientes violetas repetitivos, tarjetas brillantes idénticas, héroes centrados genéricos), el sitio adopta una dirección **Atlas Técnico Editorial & Laboratorio Industrial**:

1. **Paleta de alto contraste y papel técnico:**
   - Superficie principal tipo papel cartográfico cálido (`#F5F3EE`) con tinta carbón profunda (`#141513`), grillas de precisión de 1px (`#DCD7CC`) y acentos inspirados en ingeniería química e instrumentación industrial: cobre/óxido (`#C84B31`), cobalto de proceso (`#1D4E89`) y verde reactivo (`#246A4F`).
   - Modo de contraste limpio sin glassmorphism innecesario ni sombras difusas artificiales.
2. **Tipografía editorial + telemetría monoespaciada:**
   - Títulos con contraste editorial fuerte y cifras/fórmulas/códigos NCM/coordenadas en fuente monoespaciada con `tabular-nums` para alineación exacta en tablas y balances.
3. **Lenguaje ASCII funcional (no decorativo barato):**
   - Esquemas de flujo en texto/ASCII (`Al2O3 ──[960°C / Hall-Héroult]──▶ Al + CO2`), divisores de sección con marcas de registro (`+---`, `│`, `├─`), indicadores de estado y diagramas de bloques compactos que refuerzan la identidad de manual de ingeniería y funcionan perfecto incluso en pantallas angostas (mobile).
4. **Movimiento con propósito (inspiración `bencho.dev`):**
   - Tarjetas de producto, paneles laterales del mapa y pasos de proceso con físicas spring suaves (`stiffness: 380, damping: 32`), layouts compartidos (`layoutId`) para pestañas y selectores, y gestos cómodos en mobile (drawer deslizable + tap targets generosos).
   - Respeto estricto de `prefers-reduced-motion`.
5. **Honestidad de datos en la UI:**
   - Todo dato faltante se muestra como `SIN DATOS` con estilo técnico neutro (jamás `0` ni celdas vacías engañosas).
   - Mientras existan datos de prueba, un indicador visible de `MODO EJEMPLO — DATOS FICTICIOS` marca claramente qué proviene de fixtures de Etapa 1.

---

## 3. Estrategia de agentes offline con cuota gratuita de Google Gemini (Etapas 4–5)

El pipeline en `pipeline/` (Python + **LangGraph**, gestionado con `uv`) sigue prácticas de ingeniería de producción optimizadas para **cuotas gratuitas de Google Gemini API**:

1. **Código determinista primero, LLM solo donde aporta valor:**
   - Descarga de archivos, hashing SHA-256, parseo de CSV/Excel, cálculo de balances atómicos/másicos/estequiométricos y generación de diffs/PRs son **100% código Python determinista** (cero tokens consumidos).
2. **Enrutamiento por costo y capacidad vía variables de entorno:**
   - `AGENT1_MODEL` (`gemini-2.5-flash`): extracción estructurada y normalización de tablas oficiales.
   - `AGENT2_MODEL` (`gemini-2.5-pro`): modelado de procesos químicos a partir de bibliografía técnica citada.
   - `AGENT3_MODEL` (`gemini-2.5-pro`): **Verificador independiente** con contexto completamente limpio (sin ver el razonamiento ni mensajes intermedios de los Agentes 1 y 2).
3. **Control estricto de cuotas y confiabilidad:**
   - Rate limiter integrado (`PIPELINE_MAX_RPM`), backoff exponencial con jitter ante `429 ResourceExhausted`, cache local por hash de documento para no re-procesar entradas idénticas y tope duro de 2 reintentos por paso (`PIPELINE_MAX_RETRIES_PER_STEP=2`).
   - Checkpointer persistente de LangGraph (SQLite local) para reanudar corridas tras pausas `interrupt` o límites diarios sin repetir llamadas ya completadas.
   - Salidas estructuradas nativas con Pydantic (`with_structured_output`), herramientas con lista blanca estricta por agente y aislamiento de contenido web/PDF como dato no confiable (defensa contra prompt injection).
4. **Observabilidad gratuita y evals:**
   - Trazas estructuradas vía **OpenTelemetry** (compatible con Langfuse self-hosted o LangSmith free tier).
   - Suite de evaluación automática contra el **set de oro de Aluminio** (Etapa 3) midiendo tasa de rechazo y tasa de falsos aprobados del Verificador ante cada cambio de prompt, herramienta o modelo.
