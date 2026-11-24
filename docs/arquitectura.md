# Arquitectura Técnica, Dirección Visual y Pipeline de Agentes

## 1. Stack confirmado

- **Framework web:** Astro (generación estática `output: 'static'`) + MDX para ensayos técnicos largos.
- **Islas interactivas:** React 19 + TypeScript estricto.
- **Estilos:** Tailwind CSS v4 con tokens de diseño propios.
- **Micro-interacciones y movimiento:** `motion` (`motion/react`), siguiendo principios de **Bencho** (`bencho.dev`): físicas de resorte reales (`spring`), transiciones de estado sin saltos bruscos, tarjetas táctiles y controles adaptados tanto a desktop como a mobile.
- **Arte generativo ASCII / Halftone:** renderizador liviano en Canvas 2D con dithering ordenado (matriz Bayer 4×4, halftone por puntos, glifos ASCII y Braille), inspirado en `devault.design/ascii-art-generator`.
- **Mapa (Etapa 2 y 7):** D3 (`d3-geo`) + SVG/GeoJSON simplificado del **IGN** con IDs oficiales Georef. Representación **bicontinental** (23 provincias + CABA + recuadro integrado del Sector Antártico e Islas del Atlántico Sur según normativa IGN).
- **Diagramas de proceso (Etapa 3+):** React Flow alimentado exclusivamente desde `procesos.json`, `pasos_proceso.json` y `conexiones_proceso.json`, combinando precisión de ingeniería de procesos con viñetas artísticas dithered/ASCII y micro-interacciones spring.
- **Validación:** Zod en el build de Node/Astro y Pydantic v2 en el pipeline Python.

---

## 2. Dirección visual y principios UX/UI (`details.so` + `bencho.dev` + `devault.design` + `tasteskill.dev`)

El sitio combina rigor industrial con criterio editorial de galería, evitando plantillas genéricas («AI slop»):

1. **Base estricta en Blanco y Negro + Rupturas de Color intencionales:**
   - **95% de la interfaz en monocromo nítido:** fondo blanco puro (`#FFFFFF`), superficies secundarias gris hielo (`#F6F6F7`), tinta negra profunda (`#09090B`), texto secundario neutro (`#6B7280`) y divisores exactos de `1px` (`#E4E4E7`), al estilo granular y limpio de `details.so`.
   - **Colores que rompen el blanco y negro con significado:** el color entra únicamente en el arte ASCII/halftone, las regiones activas del mapa, los estados de reacción y las tarjetas seleccionadas:
     - **Azul cobalto (`#0038FF`):** señal primaria, energía eléctrica, electrólisis, focos de navegación.
     - **Ámbar fundición (`#F59E0B`):** alta temperatura, metalurgia, hornos y minerales.
     - **Verde reactivo (`#00A859`):** cadenas agroindustriales, bioenergía y estados verificados.
     - **Rojo señal (`#FF331F`):** alertas, emisiones, reacciones exotérmicas y advertencias de datos.
2. **Visuales ASCII / Halftone / Dithering (estilo `devault.design`):**
   - Ilustraciones y viñetas de procesos generadas mediante tramas halftone, dithering ordenado Bayer y matrices de glifos ASCII/Braille donde contrastan el negro profundo y golpes de azul cobalto, ámbar y verde.
   - Pensadas para convivir con datos reales sin competir con la legibilidad de cifras y tablas.
3. **Tipografía de precisión:**
   - Sans-serif geométrica/neo-grotesca con tracking ajustado en titulares (`Inter` / `Space Grotesk`) combinada con monoespaciada (`IBM Plex Mono`, `tabular-nums`) para fórmulas químicas, códigos Georef/NCM, coordenadas y metadatos de fuentes.
4. **Movimiento táctil en web y mobile (inspiración `bencho.dev`):**
   - Físicas spring calibradas (`stiffness: 420, damping: 34`), pestañas con indicador compartido (`layoutId`), hover reactivo en tarjetas y paneles deslizables cómodos en pantallas móviles.
   - Respeto total de `prefers-reduced-motion`.
5. **Honestidad de datos en la UI:**
   - Todo dato faltante se renderiza como `SIN DATOS` (jamás `0` ni estimaciones silenciosas).
   - Mientras existan datos de prueba de Etapa 1, una franja visible marca `MODO EJEMPLO — DATOS FICTICIOS`.

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
