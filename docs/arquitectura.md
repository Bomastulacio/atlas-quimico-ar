# Arquitectura Técnica, Dirección Visual y Pipeline de Agentes

## 1. Stack confirmado

- **Framework web:** Astro (generación estática `output: 'static'`) + MDX para ensayos técnicos largos.
- **Islas interactivas:** React 19 + TypeScript estricto.
- **Estilos:** Tailwind CSS v4 con tokens de diseño propios.
- **Micro-interacciones y movimiento:** `motion` (`motion/react`), siguiendo principios táctiles de **Bencho** (`bencho.dev`): físicas spring calibradas, controles conectados y transiciones suaves respetando `prefers-reduced-motion`.
- **Mapa (Etapa 2 y 7):** D3 (`d3-geo`) + SVG/GeoJSON oficial del **IGN** con IDs Georef. Representación **bicontinental** (23 provincias + CABA + recuadro integrado del Sector Antártico e Islas del Atlántico Sur), paneo por arrastre (drag), zoom con rueda hacia el cursor, elevación 3D sutil de la provincia seleccionada y capa de **departamentos con datos confiables** (Etapa 7) al acercar o seleccionar provincia.
- **Diagramas de proceso (Etapa 3+):** React Flow alimentado exclusivamente desde `procesos.json`, `pasos_proceso.json` y `conexiones_proceso.json`.
- **Dioramas isométricos 3D estilo Anatomy (referencia para futuras cadenas):** implementado primero en Aluminio (`AluarProcessAnatomy` con `src/lib/iso-kit.ts`, `iso-lathe.js` e `iso-tube.js`, licencia MIT de `wheresryan22/anatomy`). Estándar guardado para replicar más adelante en Litio, Urea, Petroquímica, Soja, Algodón y Biodiésel: 4 tonos por material en paleta piedra del Atlas, ductos 3D, zoom suave por etapa (`01`..`05`) y vista despiece cuando aplica.
- **Fuente de verdad SQL:** Supabase (PostgreSQL 17, proyecto `rbjymgrimmrbetgbeios`) con las 12 tablas relacionales + `atlas_manifest`, RLS en lectura pública y sincronización a `data/validated/*.json` vía `npm run data:sync:supabase`.
- **Validación:** Zod en el build de Node/Astro y Pydantic v2 en el pipeline Python.

---

## 2. Dirección visual y principios UX/UI (`gemini-frontend-design` + `details.so` + `bencho.dev`)

El sitio adopta una estética de **Atlas Cartográfico Moderno y Clásico**: sobria, amplia en pantalla de escritorio, sin ruido decorativo ni clichés de plantillas genéricas.

1. **Superficie arquitectónica en piedra clara y tinta carbón + ruptura de color:**
   - Fondo de página en piedra clara (`#ECECE9`) para evitar el blanco clínico excesivo, combinado con paneles en piedra porcelana (`#F7F7F5`), cuenca marítima en gris pizarra suave (`#DFE4EA`), tinta carbón profunda (`#111214`), texto secundario de alto contraste (`#52555E`) y divisores exactos de `1px` (`#D2D4D8`).
   - El color rompe el monocromo únicamente donde expresa significado real (provincias activas, íconos de cadena y pasos seleccionados):
     - **Azul cobalto (`#0A42E0`):** metalurgia, fertilizantes y foco activo.
     - **Verde mineral (`#0B7A53`):** minería química de litio y bioenergía.
     - **Ocre industrial (`#C86A11`):** agroindustria.
     - **Rojo señal (`#D93025`):** petroquímica, emisiones y avisos de cobertura.
2. **Disciplina tipográfica estricta (2 familias, 3 escalas de cuerpo):**
   - `Space Grotesk` para marca y títulos principales; `Inter` con `tabular-nums` para cuerpo, controles, tablas y cifras (sin terceras fuentes innecesarias).
   - Etiquetas en tipo oración (*sentence case*), sin micro-textos ilegibles (`>= 13px` sobre el pliegue) ni encabezados decorativos numerados.
3. **Apertura directa al contenido vivo (formato Atlas):**
   - Sin banners de marketing ni filas genéricas de 4 KPIs. La pantalla inicial abre directamente en el **mapa bicontinental interactivo a ancho completo** acompañado por el panel territorial.
4. **Interacción cartográfica directa y relieve 3D:**
   - Arrastre continuo con click sostenido (desktop y táctil), zoom con rueda del mouse centrado en la posición del cursor, controles rápidos y elevación arquitectónica 3D sutil al seleccionar una provincia.
5. **Honestidad de datos en la interfaz:**
   - Todo dato faltante se muestra como «Sin datos» (jamás `0` ni estimaciones).
   - Los registros demostrativos de las etapas iniciales se indican con claridad sin interferir con la lectura del atlas.

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
