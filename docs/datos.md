# Diseño de Datos y Esquema de Google Sheets

> **Estado:** `PENDIENTE DE APROBACIÓN` (Etapa 1).  
> No se cargará ningún dato real ni oficial hasta que revises y apruebes esta estructura. Los valores que aparecen en las filas de ejemplo y en `data/fixtures/ejemplo_sheets/` son **ficticios** y llevan explícitamente `confianza = "ejemplo"` y `es_ejemplo = true`.

---

## 1. Principios del modelo relacional

1. **Listo para migrar a PostgreSQL / Supabase sin tocar componentes:**
   - Cada pestaña de Google Sheets corresponde 1:1 a una tabla relacional con **claves primarias estables** (IDs de texto deterministas o códigos oficiales Georef, nunca índices de fila de la planilla).
   - La web jamás consulta Google Sheets: `scripts/sheets-to-json.ts` descarga las pestañas, valida esquemas y relaciones con Zod y genera los archivos en `data/validated/`. Toda la interfaz lee únicamente a través de `src/data/`.
2. **Identificadores territoriales oficiales (API Georef — `datos.gob.ar`):**
   - `provincias.provincia_id`: código oficial Georef de 2 dígitos (`"02"` CABA hasta `"94"` Tierra del Fuego, Antártida e Islas del Atlántico Sur — 24 jurisdicciones).
   - `departamentos.departamento_id`: código oficial Georef de 5 dígitos (`provincia_id` + 3 dígitos, p. ej. `"26007"` Biedma, Chubut). Solo se cargan departamentos donde existan datos confiables (zonas agroindustriales y polos industriales).
3. **Regla de hierro de integridad y procedencia:**
   - **Prohibido inventar o estimar cifras.** Cuando una cifra no exista o no esté verificada, la celda numérica queda vacía y su columna `*_estado` debe decir `sin_datos`.
   - **Toda cifra numérica debe resolverse con procedencia completa:** `anio`, `fuente` (resuelta vía `fuente_id`), `url`, `fecha_descarga`, `hash` (`sha256:<64 hex>`), `cita_ubicacion` (archivo + hoja/celda o página/tabla) y `confianza` (`alta` | `media` | `baja` | `ejemplo`).
   - El script `npm run data:validate` (ejecutado automáticamente antes de `astro build`) **falla el build** si falta cualquiera de estos campos o si se rompe una clave foránea.
4. **Separación de `produccion` y `comercio_exterior`:**
   - En fuentes argentinas, la producción (Secretaría de Minería, SAGyP, cámaras sectoriales) y el comercio exterior (INDEC, UN Comtrade) suelen venir de organismos, años y unidades distintas (`t` vs `USD FOB/CIF`). Separar ambas tablas evita mezclar fuentes distintas en una misma fila.

---

## 2. Diagrama relacional de pestañas

```text
fuentes (PK: fuente_id)
  ▲
  │ (FK en toda tabla con cifras o hechos verificables)
  │
provincias (PK: provincia_id [Georef 2d])
  ▲
  ├── departamentos (PK: departamento_id [Georef 5d], FK: provincia_id)
  ├── productos_zonas (FK: producto_id, provincia_id, departamento_id?)
  ├── plantas (PK: planta_id, FK: empresa_id, producto_id, provincia_id, departamento_id?)
  └── produccion (PK: registro_id, FK: producto_id, provincia_id?)

productos (PK: producto_id)
  ▲
  ├── productos_zonas
  ├── procesos (PK: proceso_id, FK: producto_id)
  │     ▲
  │     ├── pasos_proceso (PK: paso_id, FK: proceso_id)
  │     └── conexiones_proceso (PK: conexion_id, FK: proceso_id, origen_paso_id, destino_paso_id)
  ├── plantas (FK: empresa_id, producto_id)
  ├── produccion (FK: producto_id)
  └── comercio_exterior (PK: registro_id, FK: producto_id)

empresas (PK: empresa_id) ◄── plantas (FK: empresa_id)
```

---

## 3. Especificación de las 12 pestañas de Google Sheets

### Convenciones globales de formato en Google Sheets
- **Separador decimal:** punto (`.`), sin separador de miles (ej. `14500.5`, nunca `14.500,5`).
- **Fechas:** ISO 8601 `YYYY-MM-DD` (ej. `2026-03-15`).
- **Booleanos:** `true` o `false` en minúsculas.
- **Vacíos / sin datos:** celda vacía para campos opcionales o numéricos faltantes; cuando el campo es una cifra, su columna paralela `*_estado` debe ser `dato` (si tiene valor numérico) o `sin_datos` (si está vacía).
- **Niveles de `confianza`:**
  - `alta`: dato oficial primario (INDEC, SAGyP, IGN, UN Comtrade, Secretaría de Energía/Minería).
  - `media`: publicación técnica peer-reviewed, informe de cámara oficial o dato oficial con desagregación parcial.
  - `baja`: fuente secundaria documentada que requiere verificación adicional.
  - `ejemplo`: **exclusivo para pruebas de Etapa 1** (bloqueado en producción con `--strict-real`).

---

### Pestaña 1: `fuentes`
Catálogo central de procedencia. Evita repetir URLs y hashes SHA-256 en decenas de filas; al compilar a JSON, el pipeline hidrata cada cifra con el objeto completo de procedencia.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `fuente_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | ID estable, ej. `indec-ica-2024`, `ejemplo-aluminio-01` |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Título completo del dataset o publicación |
| `organismo` | texto | `TEXT NOT NULL` | Sí | Ej. `INDEC`, `IGN`, `UN Comtrade`, `SAGyP` |
| `tipo` | enum | `TEXT NOT NULL` | Sí | `oficial` \| `tecnica` \| `empresa` \| `ejemplo` |
| `url` | URL | `TEXT NOT NULL` | Sí | URL exacta de descarga o publicación (`https://...`) |
| `fecha_descarga` | fecha ISO | `DATE NOT NULL` | Sí | `YYYY-MM-DD` en que se obtuvo el archivo |
| `hash` | texto | `TEXT NOT NULL` | Sí | Formato `sha256:<64 caracteres hex>` del archivo en `data/raw/` |
| `archivo_raw` | texto | `TEXT` | No | Ruta relativa en `data/raw/` (si aplica) |
| `notas` | texto | `TEXT` | No | Licencia, periodicidad o aclaraciones metodológicas |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`ejemplo-fuente-01` | `[EJEMPLO] Dataset ficticio de prueba Etapa 1` | `Fixture Local de Prueba` | `ejemplo` | `https://example.org/atlas-quimico-ar/ejemplo-etapa-1` | `2026-11-24` | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `data/fixtures/ejemplo_sheets/` | `Solo para validar esquema Zod en Etapa 1`

---

### Pestaña 2: `provincias`
Las 24 jurisdicciones oficiales de Argentina según Georef / IGN.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `provincia_id` | texto (2 dígitos) | `CHAR(2) PRIMARY KEY` | Sí | Código Georef (`02`, `06`, ..., `94`) |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Nombre oficial IGN |
| `iso_3166_2` | texto | `TEXT NOT NULL UNIQUE` | Sí | Ej. `AR-U` (Chubut), `AR-B` (Buenos Aires) |
| `region` | enum | `TEXT NOT NULL` | Sí | `NOA` \| `NEA` \| `Cuyo` \| `Centro` \| `Pampeana` \| `Patagonia` |
| `cobertura_datos` | enum | `TEXT NOT NULL` | Sí | `completa` \| `parcial` \| `baja` \| `sin_datos` |
| `nota_cobertura` | texto | `TEXT` | No | Explicación visible al usuario si hay poca información |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`26` | `Chubut` | `AR-U` | `Patagonia` | `parcial` | `[EJEMPLO] Cobertura demostrativa de Etapa 1; datos reales pendientes de Etapa 3.`

---

### Pestaña 3: `departamentos`
Solo departamentos con datos confiables (zonas agroindustriales, polos petroquímicos/industriales o mineros). Nunca todos los municipios del país.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `departamento_id` | texto (5 dígitos) | `CHAR(5) PRIMARY KEY` | Sí | Código oficial Georef (`26007`, `06056`, etc.) |
| `provincia_id` | texto (2 dígitos) | `CHAR(2) NOT NULL REFERENCES provincias` | Sí | Debe coincidir con los primeros 2 dígitos de `departamento_id` |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Nombre oficial Georef |
| `tipo_zona` | enum | `TEXT NOT NULL` | Sí | `agro` \| `polo_industrial` \| `minero` \| `energetico` \| `mixto` |
| `tiene_datos_confiables` | booleano | `BOOLEAN NOT NULL` | Sí | Solo `true` se renderiza en el zoom departamental (Etapa 7) |
| `cobertura_datos` | enum | `TEXT NOT NULL` | Sí | `completa` \| `parcial` \| `baja` \| `sin_datos` |
| `nota_cobertura` | texto | `TEXT` | No | Detalle del alcance de los datos disponibles |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`26007` | `26` | `Biedma` | `polo_industrial` | `true` | `parcial` | `[EJEMPLO] Polo alumínico de prueba.`

---

### Pestaña 4: `productos`
Catálogo de cadenas productivas y químicas cubiertas por el atlas.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `producto_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `aluminio`, `litio`, `urea`, `algodon`, `soja`, `petroquimica`, `biodiesel` |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Nombre visible (ej. `Aluminio primario`) |
| `categoria` | enum | `TEXT NOT NULL` | Sí | `metalurgia` \| `mineria_quimica` \| `fertilizantes` \| `agroindustria` \| `petroquimica` \| `bioenergia` |
| `formula_quimica` | texto | `TEXT` | No | Ej. `Al`, `Li2CO3`, `CO(NH2)2` (vacío si es mezcla/complejo) |
| `icono_id` | texto (slug) | `TEXT NOT NULL` | Sí | Referencia a ícono SVG propio (nunca logo de marca) |
| `descripcion_corta` | texto | `TEXT NOT NULL` | Sí | Resumen de 1–2 oraciones para tooltip y tarjeta |
| `mdx_slug` | texto | `TEXT` | No | Slug del ensayo técnico en `src/content/productos/` |
| `estado_mvp` | enum | `TEXT NOT NULL` | Sí | `ejemplo` \| `en_curso` \| `validado` \| `pendiente` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`aluminio` | `Aluminio primario` | `metalurgia` | `Al` | `aluminio-lingote` | `[EJEMPLO] Metal ligero obtenido por electrólisis de alúmina en Puerto Madryn.` | `aluminio` | `ejemplo`

---

### Pestaña 5: `productos_zonas`
Tabla puente N:M entre productos y provincias (y opcionalmente departamentos) para resolver qué ícono se muestra como dominante en el mapa y cuáles aparecen al hacer zoom o click.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `relacion_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `aluminio-26-26007` |
| `producto_id` | texto | `TEXT NOT NULL REFERENCES productos` | Sí | Producto |
| `provincia_id` | texto (2d) | `CHAR(2) NOT NULL REFERENCES provincias` | Sí | Provincia |
| `departamento_id` | texto (5d) | `CHAR(5) REFERENCES departamentos` | No | Opcional; si se completa debe pertenecer a `provincia_id` |
| `es_dominante` | booleano | `BOOLEAN NOT NULL` | Sí | Define el ícono visible antes de hacer zoom/click |
| `rol_en_cadena` | enum | `TEXT NOT NULL` | Sí | `extraccion` \| `procesamiento` \| `refinacion` \| `sintesis` \| `logistica_export` |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año de referencia del vínculo |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente del vínculo territorial |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Archivo + hoja/celda o página exacta |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`aluminio-26-26007` | `aluminio` | `26` | `26007` | `true` | `refinacion` | `2024` | `ejemplo-fuente-01` | `fixture:productos_zonas.csv fila 2` | `ejemplo`

---

### Pestaña 6: `procesos`
Cabecera de cada ruta de proceso químico/industrial asociada a un producto.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `proceso_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `aluminio-hall-heroult` |
| `producto_id` | texto | `TEXT NOT NULL REFERENCES productos` | Sí | Producto principal que fabrica |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Ej. `Electrólisis Hall-Héroult` |
| `ruta_tecnologica` | texto | `TEXT NOT NULL` | Sí | Resumen técnico de la ruta (ej. `Alúmina importada → reducción electrolítica`) |
| `reaccion_global` | texto | `TEXT` | No | Reacción global balanceada (ej. `2 Al2O3 + 3 C -> 4 Al + 3 CO2`) |
| `energia_especifica_valor` | número | `DOUBLE PRECISION` | No | Consumo energético específico (vacío si `sin_datos`) |
| `energia_especifica_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `energia_especifica_unidad` | texto | `TEXT` | No | Ej. `MWh/t` o `GJ/t` (requerida si `estado = dato`) |
| `descripcion` | texto | `TEXT NOT NULL` | Sí | Descripción general del diagrama |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año de referencia |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente técnica |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Página/tabla/celda exacta |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`aluminio-hall-heroult` | `aluminio` | `Reducción electrolítica Hall-Héroult` | `Alúmina calcinada en criolita fundida con ánodos de carbono` | `2 Al2O3 + 3 C -> 4 Al + 3 CO2` | `14.2` | `dato` | `MWh/t Al` | `[EJEMPLO] Ruta demostrativa para probar React Flow y validador químico.` | `2024` | `ejemplo-fuente-01` | `fixture:procesos.csv fila 2` | `ejemplo`

---

### Pestaña 7: `pasos_proceso`
Nodos del diagrama React Flow (100% dirigidos por datos) y entrada directa para los verificadores químicos deterministas de la Etapa 5.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `paso_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `al-p1-alumina`, `al-p2-electrolisis` |
| `proceso_id` | texto | `TEXT NOT NULL REFERENCES procesos` | Sí | Proceso al que pertenece |
| `orden` | entero | `SMALLINT NOT NULL` | Sí | Orden lógico (1, 2, 3...) |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Título corto del nodo |
| `tipo_paso` | enum | `TEXT NOT NULL` | Sí | `materia_prima` \| `preparacion` \| `reaccion` \| `separacion` \| `refinacion` \| `producto` \| `subproducto` \| `emision` |
| `reaccion_balanceada` | texto | `TEXT` | No | Ecuación balanceada del paso (si ocurre reacción química) |
| `temperatura_c` | texto | `TEXT` | No | Rango o valor en °C (ej. `950-970` o vacío) |
| `presion_bar` | texto | `TEXT` | No | Rango o valor en bar (ej. `1.0` o vacío) |
| `reactivos_json` | JSON array | `JSONB NOT NULL` | Sí | Lista estructurada `[{"especie":"Al2O3","masa_especifica_t_por_t":1.93}]` |
| `productos_json` | JSON array | `JSONB NOT NULL` | Sí | Lista de productos del paso |
| `insumos_json` | JSON array | `JSONB NOT NULL` | Sí | Catalizadores, fundentes, agua, electricidad, ánodos |
| `subproductos_json` | JSON array | `JSONB NOT NULL` | Sí | Subproductos, emisiones o residuos (toda corriente sin destino debe figurar) |
| `energia_valor` | número | `DOUBLE PRECISION` | No | Consumo/aporte energético del paso |
| `energia_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `energia_unidad` | texto | `TEXT` | No | Ej. `MWh/t` o `GJ/t` |
| `descripcion` | texto | `TEXT NOT NULL` | Sí | Explicación mostrada al hacer click en el nodo |
| `pos_x` | número | `DOUBLE PRECISION NOT NULL` | Sí | Coordenada X inicial sugerida para React Flow |
| `pos_y` | número | `DOUBLE PRECISION NOT NULL` | Sí | Coordenada Y inicial sugerida para React Flow |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año de referencia |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente técnica del paso |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Archivo + página/tabla |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`al-p2-electrolisis` | `aluminio-hall-heroult` | `2` | `Celda electrolítica Hall-Héroult` | `reaccion` | `2 Al2O3 + 3 C -> 4 Al + 3 CO2` | `960` | `1.0` | `[{"especie":"Al2O3","cantidad":1.93,"unidad":"t/t Al"},{"especie":"C","cantidad":0.42,"unidad":"t/t Al"}]` | `[{"especie":"Al","cantidad":1.0,"unidad":"t/t Al"}]` | `[{"especie":"Na3AlF6 (criolita)","cantidad":null,"unidad":"baño"}]` | `[{"especie":"CO2","cantidad":1.54,"unidad":"t/t Al"}]` | `14.2` | `dato` | `MWh/t Al` | `[EJEMPLO] Reducción catódica de alúmina disuelta en criolita fundida.` | `340` | `120` | `2024` | `ejemplo-fuente-01` | `fixture:pasos_proceso.csv fila 3` | `ejemplo`

---

### Pestaña 8: `conexiones_proceso`
Aristas del diagrama React Flow y base del balance de masa entre pasos (regla 6.2.5: cada paso consume lo que produce el anterior; sin nodos huérfanos).

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `conexion_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `al-c1-alumina-a-celda` |
| `proceso_id` | texto | `TEXT NOT NULL REFERENCES procesos` | Sí | Debe coincidir con el `proceso_id` de origen y destino |
| `origen_paso_id` | texto | `TEXT NOT NULL REFERENCES pasos_proceso` | Sí | Nodo origen |
| `destino_paso_id` | texto | `TEXT NOT NULL REFERENCES pasos_proceso` | Sí | Nodo destino |
| `corriente_nombre` | texto | `TEXT NOT NULL` | Sí | Etiqueta de la corriente (ej. `Alúmina calcinada (Al2O3)`) |
| `tipo_corriente` | enum | `TEXT NOT NULL` | Sí | `principal` \| `insumo` \| `subproducto` \| `reciclo` \| `emision` \| `residuo` |
| `flujo_valor` | número | `DOUBLE PRECISION` | No | Valor específico de corriente (vacío si `sin_datos`) |
| `flujo_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `flujo_unidad` | texto | `TEXT` | No | Ej. `t/t Al` |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año de referencia |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente técnica |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Referencia exacta |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`al-c1-alumina-a-celda` | `aluminio-hall-heroult` | `al-p1-alumina` | `al-p2-electrolisis` | `Alúmina calcinada (Al2O3)` | `principal` | `1.93` | `dato` | `t/t Al` | `2024` | `ejemplo-fuente-01` | `fixture:conexiones_proceso.csv fila 2` | `ejemplo`

---

### Pestaña 9: `empresas`
Solo hechos verificables. Prohibido cargar facturación o cuotas de mercado estimadas.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `empresa_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `ejemplo-empresa-aluminio` |
| `razon_social` | texto | `TEXT NOT NULL` | Sí | Denominación verificable |
| `tipo_capital` | enum | `TEXT NOT NULL` | Sí | `nacional` \| `extranjero` \| `mixto` \| `estatal` \| `sin_datos` |
| `sitio_web_oficial` | URL | `TEXT` | No | URL institucional oficial |
| `hechos_verificables` | texto | `TEXT NOT NULL` | Sí | Hechos concretos verificables (sin cuotas ni facturación estimada) |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año del registro verificado |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente documental |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Documento + página/sección |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`ejemplo-empresa-al` | `[EJEMPLO] Productora de Aluminio Demo S.A.` | `nacional` | `https://example.org/empresa-demo` | `[EJEMPLO] Opera planta de reducción electrolítica en Puerto Madryn (dato ficticio de Etapa 1).` | `2024` | `ejemplo-fuente-01` | `fixture:empresas.csv fila 2` | `ejemplo`

---

### Pestaña 10: `plantas`
Ubicación georreferenciada de instalaciones productivas verificables.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `planta_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `ejemplo-planta-madryn` |
| `empresa_id` | texto | `TEXT NOT NULL REFERENCES empresas` | Sí | Empresa operadora |
| `producto_id` | texto | `TEXT NOT NULL REFERENCES productos` | Sí | Producto principal de la planta |
| `provincia_id` | texto (2d) | `CHAR(2) NOT NULL REFERENCES provincias` | Sí | Provincia (Georef) |
| `departamento_id` | texto (5d) | `CHAR(5) REFERENCES departamentos` | No | Departamento (Georef), opcional si no está cargado |
| `nombre` | texto | `TEXT NOT NULL` | Sí | Nombre de la planta o complejo |
| `localidad` | texto | `TEXT NOT NULL` | Sí | Ciudad o paraje |
| `lat` | número | `DOUBLE PRECISION NOT NULL` | Sí | Latitud WGS84 (rango Argentina: `-56` a `-21`) |
| `lon` | número | `DOUBLE PRECISION NOT NULL` | Sí | Longitud WGS84 (rango Argentina: `-74` a `-53`) |
| `estado_operativo` | enum | `TEXT NOT NULL` | Sí | `operativa` \| `en_construccion` \| `ampliacion` \| `inactiva` \| `sin_datos` |
| `capacidad_valor` | número | `DOUBLE PRECISION` | No | Capacidad instalada nominal (vacío si `sin_datos`) |
| `capacidad_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `capacidad_unidad` | texto | `TEXT` | No | Ej. `t/año` |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año del dato de planta |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente oficial/institucional |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Página/tabla/registro |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`ejemplo-planta-madryn` | `ejemplo-empresa-al` | `aluminio` | `26` | `26007` | `[EJEMPLO] Planta Puerto Madryn` | `Puerto Madryn` | `-42.735` | `-65.039` | `operativa` | `460000` | `dato` | `t/año` | `2024` | `ejemplo-fuente-01` | `fixture:plantas.csv fila 2` | `ejemplo`

---

### Pestaña 11: `produccion`
Series anuales de producción nacional o provincial (con fuente independiente del comercio exterior).

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `registro_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `prod-aluminio-nac-2024` |
| `producto_id` | texto | `TEXT NOT NULL REFERENCES productos` | Sí | Producto |
| `provincia_id` | texto (2d) | `CHAR(2) REFERENCES provincias` | No | Vacío = total nacional; con código Georef = dato provincial |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año calendario |
| `valor` | número | `DOUBLE PRECISION` | No | Valor numérico (vacío si `sin_datos`) |
| `estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `unidad` | texto | `TEXT NOT NULL` | Sí | Ej. `t`, `kt`, `m3` |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente oficial |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Archivo + hoja/celda o cuadro |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`prod-ejemplo-aluminio-nac-2024` | `aluminio` | *(vacío)* | `2024` | `410000` | `dato` | `t` | `ejemplo-fuente-01` | `fixture:produccion.csv fila 2` | `ejemplo`

---

### Pestaña 12: `comercio_exterior`
Series anuales de exportación, importación y saldo comercial por producto (INDEC / UN Comtrade), con trazabilidad de nomenclatura NCM/HS.

| Columna | Tipo Sheets | Tipo Postgres | Req. | Reglas / Descripción |
| --- | --- | --- | --- | --- |
| `registro_id` | texto (slug) | `TEXT PRIMARY KEY` | Sí | Ej. `comex-aluminio-2024-usd` |
| `producto_id` | texto | `TEXT NOT NULL REFERENCES productos` | Sí | Producto |
| `anio` | entero | `SMALLINT NOT NULL` | Sí | Año calendario |
| `ncm_codigo` | texto | `TEXT` | No | Posición arancelaria NCM/HS (ej. `7601.10.00`) |
| `metrica` | enum | `TEXT NOT NULL` | Sí | `valor_usd` \| `volumen_t` |
| `exportacion_valor` | número | `DOUBLE PRECISION` | No | Exportación (vacío si `sin_datos`) |
| `exportacion_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `importacion_valor` | número | `DOUBLE PRECISION` | No | Importación (vacío si `sin_datos`) |
| `importacion_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `saldo_comercial_valor` | número | `DOUBLE PRECISION` | No | Exportación − Importación (si ambos existen, el validador chequea coherencia) |
| `saldo_comercial_estado` | enum | `TEXT NOT NULL` | Sí | `dato` \| `sin_datos` |
| `unidad` | texto | `TEXT NOT NULL` | Sí | Ej. `USD FOB/CIF` o `t` |
| `fuente_id` | texto | `TEXT NOT NULL REFERENCES fuentes` | Sí | Fuente oficial |
| `cita_ubicacion` | texto | `TEXT NOT NULL` | Sí | Archivo + hoja/celda o consulta Comtrade |
| `confianza` | enum | `TEXT NOT NULL` | Sí | `alta` \| `media` \| `baja` \| `ejemplo` |

**Fila de ejemplo (EJEMPLO — NO OFICIAL):**
`comex-ejemplo-aluminio-2024-usd` | `aluminio` | `2024` | `7601` | `valor_usd` | `850000000` | `dato` | `320000000` | `dato` | `530000000` | `dato` | `USD` | `ejemplo-fuente-01` | `fixture:comercio_exterior.csv fila 2` | `ejemplo`

---

## 4. Cómo conectar tu planilla de Google Sheets

Una vez que apruebes este diseño:

1. Creás una planilla de Google Sheets con exactamente estas **12 pestañas** (los nombres en minúsculas tal como figuran arriba).
2. La compartís como **«Cualquier persona con el enlace puede ver»** (solo lectura).
3. Copiás el ID de la URL (`https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit`) en tu `.env` local:
   ```env
   GOOGLE_SHEET_ID=tu_id_aqui
   ```
4. Ejecutás `npm run data:sync`. El script descarga cada pestaña en CSV mediante el endpoint GViz (`gviz/tq?tqx=out:csv&sheet=<pestaña>`), calcula el hash SHA-256 de la descarga en `data/raw/`, valida todas las reglas con Zod y escribe los JSON validados en `data/validated/`.

> **Modo offline / Etapa 1:** mientras no haya planilla real aprobada, `npm run data:sync:example` lee los CSV de `data/fixtures/ejemplo_sheets/` usando exactamente el mismo parser y el mismo validador.

---

## 5. Checklist de aprobación antes de Etapa 3

- [ ] ¿Confirmás los nombres y columnas de las 12 pestañas?
- [ ] ¿Te parece bien separar `produccion` de `comercio_exterior` y centralizar las fuentes en `fuentes`?
- [ ] ¿Querés agregar o quitar alguna columna en `pasos_proceso` o `plantas` antes de armar la planilla real?
