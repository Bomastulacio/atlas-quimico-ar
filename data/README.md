# Zonas de datos

El flujo de datos sigue una separación estricta por zonas para garantizar auditabilidad y evitar que contenido sin verificar llegue a producción:

```text
Google Sheets / Datasets oficiales
            │
            ▼
      data/raw/         ← Descargas crudas + manifiestos con URL, fecha y SHA-256
            │
            ▼
     data/staging/      ← Transformaciones normalizadas pendientes de verificación / PR
            │
            ▼
    data/validated/     ← ÚNICA zona consumida por la web (vía src/data/)
```

## Reglas

- **Nunca editar `data/validated/` a mano** sin regenerar hashes y correr `npm run data:validate`.
- **`data/fixtures/ejemplo_sheets/`** contiene únicamente filas ficticias marcadas con `confianza: "ejemplo"` y `es_ejemplo: true` para probar el contrato de Etapa 1 antes de aprobar `docs/datos.md`.
- Todo commit que modifique `data/` debe ir separado de los commits de código y declarar la fuente exacta en el mensaje (Conventional Commits: `data(alcance): ...`).
