# Atlas Químico y Productivo de Argentina

Sitio web interactivo de ingeniería de procesos, producción y comercio exterior de Argentina. Muestra qué se produce en el país, mediante qué **procesos químicos e industriales**, cuánto valor genera y cuánto se importa y exporta, con trazabilidad verificable en cada cifra.

## Principios del proyecto

1. **Cero cifras inventadas:** toda cifra numérica proviene de una fuente oficial o técnica citada con `anio`, `fuente`, `url`, `fecha_descarga`, `hash` (SHA-256), `cita_ubicacion` y `confianza`. Si un dato no existe, se registra explícitamente como `sin_datos`.
2. **Validación dura en build:** `npm run build` ejecuta automáticamente `npm run data:validate`. Si falta trazabilidad o falla la integridad referencial, el build se detiene.
3. **Capa única de datos (`src/data/`):** la interfaz nunca lee Google Sheets directamente ni importa JSONs dispersos; toda lectura pasa por `src/data/` para permitir una migración limpia a Supabase/Postgres.
4. **Pipeline offline con verificación determinista:** los agentes (Etapas 4–5) nunca corren en producción ni escriben en `main`. Toda modificación de datos pasa por zonas `raw/` → `staging/` → `validated/` y revisión humana vía PR.

## Comandos principales

```bash
# Instalar dependencias
npm install

# Compilar y validar datos de ejemplo desde fixtures CSV (Etapa 1)
npm run data:sync:example

# Compilar y validar desde Google Sheets (requiere GOOGLE_SHEET_ID en .env)
npm run data:sync

# Validar JSONs en data/validated/ (esquema Zod + integridad referencial)
npm run data:validate

# Ejecutar tests de esquema y capa de datos
npm test

# Levantar servidor de desarrollo
npm run dev

# Build de producción (corre data:validate antes de compilar Astro)
npm run build
```

## Documentación clave

- [Diseño relacional de hojas y esquema de datos](docs/datos.md) *(pendiente de aprobación antes de cargar datos reales)*
- [Arquitectura técnica, diseño visual y roadmap de agentes](docs/arquitectura.md)
- [Flujo de zonas de datos (`raw/`, `staging/`, `validated/`)](data/README.md)
- [Pipeline de agentes LangGraph (Etapas 4–5)](pipeline/README.md)
