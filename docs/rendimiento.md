# Guía de Rendimiento y Construcción Optimizada

Este documento fija los estándares de rendimiento del **Atlas Químico Argentino** para que cada nueva provincia, cadena industrial, visor 3D, diagrama PFD o consulta hacia Supabase mantenga tiempos bajos de carga, cero bloqueos de interfaz y bundles controlados.

---

## 1. Eliminación de renders innecesarios (React)

- **Memoizar subárboles costosos o repetitivos:** envolver con `React.memo` paneles laterales, tarjetas de empresa/mercado, símbolos SVG de PFD y nodos de grafos:
  - `src/components/ProvinceSidePanel.tsx`
  - `src/components/CompanyMarketCard.tsx`
  - `src/components/pfd/PfdEquipmentSymbol.tsx`
  - `src/components/ProcessBfdReactFlow.tsx` (`ProcessStepNode`, `SpeciesTable`)
- **Estabilizar props desde padres con eventos frecuentes:** cualquier componente con pan, zoom, drag o hover (`ArgentinaMapExplorer`, `ProcessPfdDiagram`) debe pasar callbacks con `useCallback` y objetos/funciones derivadas con `useMemo`; de lo contrario, las funciones inline rompen `React.memo`.
- **Pre-indexar búsquedas y tablas de consulta:**
  - Normalizar texto Unicode (`toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')`) **una sola vez** en `useMemo` al recibir los datos (`SiteHeader`, `EmpresasExplorer`), nunca dentro del `.filter()` por cada tecla.
  - Usar `Map` memoizados (`equipoMap`, `corrienteMap`, `pasoMap`) en lugar de `.find()` repetidos en cada render.
- **Listeners globales limpios:**
  - Usar `useRef` para leer estado mutable dentro de listeners globales (`keydown`, `wheel`) y evitar desmontar/remontar eventos en cada cambio de estado.
  - En listeners de scroll, usar actualizaciones funcionales con guarda (`setScrolled((prev) => (prev === next ? prev : next))`).

---

## 2. Reducción de bundle y lazy loading (Astro + Vite)

- **Separar vistas opcionales pesadas con `React.lazy` + `<Suspense>`:**
  - `ProcessFlowDiagram.tsx` renderiza `ProcessPfdDiagram` (SVG nativo) por defecto y carga `ProcessBfdReactFlow.tsx` (`@xyflow/react`) únicamente si el usuario cambia a la vista BFD.
- **Evitar acoplamiento accidental entre módulos grandes:**
  - Nunca importar helpers pequeños desde un componente grande (ej. importar colores desde `ArgentinaMapExplorer.tsx` arrastraba D3 y 1.900 líneas hacia `/empresas`). Extraer utilidades puras a `src/lib/` (como `src/lib/categoryAccent.ts`).
- **Directivas de hidratación en páginas `.astro`:**
  - `client:load`: solo para el componente interactivo principal sobre el pliegue (ej. `ArgentinaMapExplorer` en `/`, explorador principal en `/empresas`, `/comparar`, `/cobertura`).
  - `client:idle`: para elementos globales de navegación (`SiteHeader`).
  - `client:visible={{ rootMargin: '250px' }}` / `'300px'`: obligatorio para todos los visores 3D (`*ProcessAnatomy` -> `three-vendor`), `ProcessDeckPreview`, `ProcessFlowDiagram` y tarjetas `StandaloneCompanyMarket` debajo del pliegue.
- **Vendor chunking (`astro.config.mjs`):**
  - Mantener separados en `manualChunks`: `three-vendor`, `xyflow-vendor`, `d3-vendor` y `motion-vendor` para maximizar el reuso de caché entre rutas.

---

## 3. Requests y caching

- **Deduplicación y caché compartida en cliente (`src/lib/useLiveMarket.ts`):**
  - Toda consulta externa compartida por múltiples islas en una misma página debe usar caché en memoria + `sessionStorage` con TTL (5 min) y una promesa `inFlight` compartida, garantizando **1 sola solicitud** aunque haya varias tarjetas montadas.
  - Sincronizar suscriptores en memoria cuando el usuario dispara un refresco manual (`Actualizar`) y proteger cada `fetch` con timeout (`AbortController`, `3800 ms`) y guarda de desmontaje.
- **Edge Functions (`supabase/functions/market-quotes/index.ts`):**
  - Ejecutar todas las consultas a APIs externas independientes en una sola ola `Promise.all` con `AbortSignal.timeout(4500)`.
  - Responder con `Cache-Control: public, max-age=120, stale-while-revalidate=600`.

---

## 4. Queries lentas y eliminación de N+1

- **Capa de datos estática (`src/data/index.ts`):**
  - Construir un índice único `DatasetIndexes` (`loadIndexes()`) en `O(N)` con `Map` por entidad y relación (`zonasByProvincia`, `plantasByEmpresa`, `pasosByProceso`, etc.).
  - Memoizar todas las agregaciones (`getMapaProvinciasData`, `getMapaDepartamentosData`, `getSearchIndex`, `getEmpresasConPlantas`, `getCoberturaDetallada`, `getComparadorProductosData`, `getComparadorProvinciasData`, `getCadenaValorTransversalData`) y los getters por ID (`getFichaProducto`, `getProceso`, `getProductosPorProvincia`).
  - Nunca hacer `.filter()` o `.find()` anidados sobre arreglos completos dentro de un `.map()`.
- **Base de datos y Edge Functions (Supabase Postgres 17):**
  - Agrupar escrituras múltiples en un **único `upsert` por tabla** (prohibido hacer `N` llamadas `UPDATE` dentro de un loop).
  - Evitar `SELECT *` redundantes si ya se dispone de los registros actualizados en memoria.
  - Verificar con `get_advisors(type="performance")` que existan **0 `unindexed_foreign_keys`** y **0 `multiple_permissive_policies`**.

---

## 5. Imágenes, fuentes y scripts

- **Imágenes fotográficas:**
  - Generar versión `.webp` (calidad `75-80`, `effort: 6`) y fallback `.jpg` progresivo (`mozjpeg`, calidad `80`) usando `sharp`.
  - Renderizar siempre con `<picture>`, atributos explícitos `width` y `height` (evita CLS), `decoding="async"`, y `fetchpriority="high"` únicamente en la imagen hero LCP.
  - Pre-cargar la imagen LCP en `BaseLayout.astro` pasando `preloadImage={{ href: '...', type: 'image/webp' }}`.
- **Fuentes tipográficas (`BaseLayout.astro`):**
  - Mantener máximo 2 familias (`Space Grotesk` + `Inter`), con `preconnect` a `fonts.googleapis.com` y `fonts.gstatic.com`, `display=swap` y carga no bloqueante:
    ```html
    <link rel="preload" as="style" href={GOOGLE_FONTS_URL} />
    <link
      href={GOOGLE_FONTS_URL}
      rel="stylesheet"
      media="print"
      onload="this.setAttribute('media','all')"
    />
    <noscript><link href={GOOGLE_FONTS_URL} rel="stylesheet" /></noscript>
    ```

---

## 6. Línea base medida y checklist antes de cada PR

Referencia verificada en commit `5704928`:

| Métrica | Antes | Después | Mejora |
| --- | ---: | ---: | ---: |
| `ProcessFlowDiagram.*.js` (carga inicial PFD) | `304,72 kB` (`99,00 kB` gzip) | `45,41 kB` (`11,13 kB` gzip) | **-85,1%** |
| `@xyflow/react` en carga inicial de PFD | Cargado siempre (`eager`) | Lazy solo al abrir vista BFD | **-195,8 kB** iniciales |
| `/empresas` acoplado a `ArgentinaMapExplorer` + D3 | Sí (`~136 kB` extra) | Desacoplado (`categoryAccent` `0,25 kB`) | **0 kB D3/Mapa** |
| `three-vendor` (`772,61 kB`) en fichas de producto | `client:load` | `client:visible` (`rootMargin: 250px`) | Diferido fuera de TTI |
| Imagen hero (`hero-atlas-industria`) | `669,8 KB` (JPG) | `61,8 KB` (WebP) / `92,0 KB` (JPG) | **-90,8%** WebP |
| Escrituras en `market-quotes` Edge Function | `N` updates + 2° `SELECT` | 1 batch `upsert` + 0 `SELECT` extra | **O(1)** round-trips |

### Comandos de verificación obligatorios
```powershell
npm run data:validate:strict
npm test
pipeline\.venv\Scripts\pytest.exe pipeline\tests -q
npm run check
npm run build
node .agents/skills/atlas-bocetos-proceso/scripts/verify-3d-scene.mjs /productos/aluminio/#anatomia
```
