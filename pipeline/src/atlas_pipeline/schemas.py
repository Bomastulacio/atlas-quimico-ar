"""Esquemas Pydantic v2 — espejo 1:1 de las 12 tablas SQL en Supabase y de src/schemas/."""

from __future__ import annotations

import math
import re
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SHA256_RE = re.compile(r"^sha256:[a-f0-9]{64}$", re.IGNORECASE)
ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PROV_ID_RE = re.compile(r"^\d{2}$")
DEPTO_ID_RE = re.compile(r"^\d{5}$")
ISO_AR_RE = re.compile(r"^AR-[A-Z]$")

Confianza = Literal["alta", "media", "baja", "ejemplo"]
TipoFuente = Literal["oficial", "tecnica", "empresa", "ejemplo"]
CoberturaDatos = Literal["completa", "parcial", "baja", "sin_datos"]
RegionArgentina = Literal["NOA", "NEA", "Cuyo", "Centro", "Pampeana", "Patagonia"]
CategoriaProducto = Literal[
    "metalurgia",
    "mineria_quimica",
    "fertilizantes",
    "agroindustria",
    "petroquimica",
    "bioenergia",
]
EstadoMvp = Literal["ejemplo", "en_curso", "validado", "pendiente"]
RolEnCadena = Literal["extraccion", "procesamiento", "refinacion", "sintesis", "logistica_export"]
TipoPaso = Literal[
    "materia_prima",
    "preparacion",
    "reaccion",
    "separacion",
    "refinacion",
    "producto",
    "subproducto",
    "emision",
]
TipoCorriente = Literal["principal", "insumo", "subproducto", "reciclo", "emision", "residuo"]
TipoCapital = Literal["nacional", "extranjero", "mixto", "estatal", "sin_datos"]
EstadoOperativo = Literal["operativa", "en_construccion", "ampliacion", "inactiva", "sin_datos"]
MetricaComex = Literal["valor_usd", "volumen_t"]
TipoZonaDepto = Literal["agro", "polo_industrial", "minero", "energetico", "mixto"]


def _check_slug(v: str, field_name: str) -> str:
    if not SLUG_RE.match(v):
        raise ValueError(f"{field_name} debe ser un slug estable (a-z, 0-9, -), recibido: {v!r}")
    return v


class Provenance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    anio: int = Field(ge=1900, le=2100)
    fuente_id: str = Field(min_length=2)
    fuente: str = Field(min_length=1)
    url: str = Field(pattern=r"^https?://")
    fecha_descarga: str = Field(pattern=ISO_DATE_RE.pattern)
    hash: str = Field(pattern=SHA256_RE.pattern)
    cita_ubicacion: str = Field(min_length=3)
    confianza: Confianza


class ValorMedidoDato(BaseModel):
    model_config = ConfigDict(extra="forbid")

    estado: Literal["dato"] = "dato"
    valor: float
    unidad: str = Field(min_length=1)
    procedencia: Provenance

    @field_validator("valor")
    @classmethod
    def _must_be_finite(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError("El valor numérico debe ser finito")
        return v


class ValorMedidoSinDatos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    estado: Literal["sin_datos"] = "sin_datos"
    valor: None = None
    unidad: str | None = None
    procedencia: Provenance | None = None


ValorMedido = Annotated[ValorMedidoDato | ValorMedidoSinDatos, Field(discriminator="estado")]


class Fuente(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fuente_id: str
    nombre: str = Field(min_length=1)
    organismo: str = Field(min_length=1)
    tipo: TipoFuente
    url: str = Field(pattern=r"^https?://")
    fecha_descarga: str = Field(pattern=ISO_DATE_RE.pattern)
    hash: str = Field(pattern=SHA256_RE.pattern)
    archivo_raw: str | None = None
    notas: str | None = None

    @field_validator("fuente_id")
    @classmethod
    def _slug(cls, v: str) -> str:
        return _check_slug(v, "fuente_id")


class Provincia(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provincia_id: str = Field(pattern=PROV_ID_RE.pattern)
    nombre: str = Field(min_length=1)
    iso_3166_2: str = Field(pattern=ISO_AR_RE.pattern)
    region: RegionArgentina
    cobertura_datos: CoberturaDatos
    nota_cobertura: str | None = None


class Departamento(BaseModel):
    model_config = ConfigDict(extra="forbid")

    departamento_id: str = Field(pattern=DEPTO_ID_RE.pattern)
    provincia_id: str = Field(pattern=PROV_ID_RE.pattern)
    nombre: str = Field(min_length=1)
    tipo_zona: TipoZonaDepto
    tiene_datos_confiables: bool
    cobertura_datos: CoberturaDatos
    nota_cobertura: str | None = None

    @model_validator(mode="after")
    def _prefix_matches(self) -> Departamento:
        if not self.departamento_id.startswith(self.provincia_id):
            raise ValueError(
                f"departamento_id {self.departamento_id} debe comenzar con provincia_id {self.provincia_id}"
            )
        return self


class Producto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    producto_id: str
    nombre: str = Field(min_length=1)
    categoria: CategoriaProducto
    formula_quimica: str | None = None
    icono_id: str
    descripcion_corta: str = Field(min_length=10)
    mdx_slug: str | None = None
    estado_mvp: EstadoMvp

    @field_validator("producto_id", "icono_id")
    @classmethod
    def _slug(cls, v: str, info) -> str:
        return _check_slug(v, info.field_name)


class ProductoZona(BaseModel):
    model_config = ConfigDict(extra="forbid")

    relacion_id: str
    producto_id: str
    provincia_id: str = Field(pattern=PROV_ID_RE.pattern)
    departamento_id: str | None = Field(default=None, pattern=DEPTO_ID_RE.pattern)
    es_dominante: bool
    rol_en_cadena: RolEnCadena
    procedencia: Provenance

    @field_validator("relacion_id", "producto_id")
    @classmethod
    def _slug(cls, v: str, info) -> str:
        return _check_slug(v, info.field_name)


class CorrienteEspecie(BaseModel):
    model_config = ConfigDict(extra="forbid")

    especie: str = Field(min_length=1)
    cantidad: float | None = None
    unidad: str = Field(min_length=1)


class Proceso(BaseModel):
    model_config = ConfigDict(extra="forbid")

    proceso_id: str
    producto_id: str
    nombre: str = Field(min_length=1)
    ruta_tecnologica: str = Field(min_length=1)
    reaccion_global: str | None = None
    energia_especifica: ValorMedido
    descripcion: str = Field(min_length=10)
    procedencia: Provenance


class PasoProceso(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paso_id: str
    proceso_id: str
    orden: int = Field(gt=0)
    nombre: str = Field(min_length=1)
    tipo_paso: TipoPaso
    reaccion_balanceada: str | None = None
    temperatura_c: str | None = None
    presion_bar: str | None = None
    reactivos: list[CorrienteEspecie] = Field(default_factory=list)
    productos: list[CorrienteEspecie] = Field(default_factory=list)
    insumos: list[CorrienteEspecie] = Field(default_factory=list)
    subproductos: list[CorrienteEspecie] = Field(default_factory=list)
    energia: ValorMedido
    descripcion: str = Field(min_length=10)
    pos_x: float
    pos_y: float
    procedencia: Provenance


class ConexionProceso(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conexion_id: str
    proceso_id: str
    origen_paso_id: str
    destino_paso_id: str
    corriente_nombre: str = Field(min_length=1)
    tipo_corriente: TipoCorriente
    flujo: ValorMedido
    procedencia: Provenance

    @model_validator(mode="after")
    def _no_self_loop(self) -> ConexionProceso:
        if self.origen_paso_id == self.destino_paso_id:
            raise ValueError("Una conexión no puede tener el mismo paso como origen y destino")
        return self


class Empresa(BaseModel):
    model_config = ConfigDict(extra="forbid")

    empresa_id: str
    razon_social: str = Field(min_length=1)
    tipo_capital: TipoCapital
    sitio_web_oficial: str | None = Field(default=None, pattern=r"^https?://")
    hechos_verificables: str = Field(min_length=10)
    procedencia: Provenance

    @field_validator("empresa_id")
    @classmethod
    def _slug(cls, v: str) -> str:
        return _check_slug(v, "empresa_id")


class Planta(BaseModel):
    model_config = ConfigDict(extra="forbid")

    planta_id: str
    empresa_id: str
    producto_id: str
    provincia_id: str = Field(pattern=PROV_ID_RE.pattern)
    departamento_id: str | None = Field(default=None, pattern=DEPTO_ID_RE.pattern)
    nombre: str = Field(min_length=1)
    localidad: str = Field(min_length=1)
    lat: float = Field(ge=-56.0, le=-21.0)
    lon: float = Field(ge=-74.0, le=-53.0)
    estado_operativo: EstadoOperativo
    capacidad: ValorMedido
    procedencia: Provenance


class ProduccionRegistro(BaseModel):
    model_config = ConfigDict(extra="forbid")

    registro_id: str
    producto_id: str
    provincia_id: str | None = Field(default=None, pattern=PROV_ID_RE.pattern)
    anio: int = Field(ge=1900, le=2100)
    medicion: ValorMedido
    procedencia: Provenance

    @field_validator("registro_id", "producto_id")
    @classmethod
    def _slug(cls, v: str, info) -> str:
        return _check_slug(v, info.field_name)


class ComercioExteriorRegistro(BaseModel):
    model_config = ConfigDict(extra="forbid")

    registro_id: str
    producto_id: str
    anio: int = Field(ge=1900, le=2100)
    ncm_codigo: str | None = Field(default=None, min_length=2)
    metrica: MetricaComex
    exportacion: ValorMedido
    importacion: ValorMedido
    saldo_comercial: ValorMedido
    procedencia: Provenance

    @field_validator("registro_id", "producto_id")
    @classmethod
    def _slug(cls, v: str, info) -> str:
        return _check_slug(v, info.field_name)

    @model_validator(mode="after")
    def _check_balance(self) -> ComercioExteriorRegistro:
        if (
            self.exportacion.estado == "dato"
            and self.importacion.estado == "dato"
            and self.saldo_comercial.estado == "dato"
        ):
            esperado = self.exportacion.valor - self.importacion.valor
            if abs(self.saldo_comercial.valor - esperado) > 0.01:
                raise ValueError(
                    f"saldo_comercial ({self.saldo_comercial.valor}) no coincide con "
                    f"exportacion - importacion ({esperado:.2f})"
                )
        return self


class StagingDataBundle(BaseModel):
    """Paquete estructurado que produce el Agente 1 (Datos) y valida el Gate determinista."""

    model_config = ConfigDict(extra="forbid")

    producto_id: str
    fuentes: list[Fuente] = Field(default_factory=list)
    empresas: list[Empresa] = Field(default_factory=list)
    plantas: list[Planta] = Field(default_factory=list)
    produccion: list[ProduccionRegistro] = Field(default_factory=list)
    comercio_exterior: list[ComercioExteriorRegistro] = Field(default_factory=list)
    notas_auditoria: list[str] = Field(default_factory=list)
    fuentes_descartadas: list[str] = Field(default_factory=list)


class ProcessDraftBundle(BaseModel):
    """Borrador de cadena de proceso químico redactado por el Agente 2."""

    model_config = ConfigDict(extra="forbid")

    producto_id: str
    fuentes: list[Fuente] = Field(default_factory=list)
    proceso: Proceso
    pasos: list[PasoProceso] = Field(min_length=1)
    conexiones: list[ConexionProceso] = Field(default_factory=list)
    notas_tecnicas: list[str] = Field(default_factory=list)


VeredictoItem = Literal["APROBADO", "RECHAZADO", "REQUIERE_REVISION_HUMANA"]


class VerificationVerdict(BaseModel):
    """Dictamen por ítem emitido por el Agente 3 (Verificador independiente)."""

    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(min_length=1)
    categoria: Literal["datos", "proceso", "empresa_planta", "comercio_exterior"]
    veredicto: VeredictoItem
    motivo: str = Field(min_length=5)
    citas_verificadas: bool


class VerifierAuditReport(BaseModel):
    """Salida estructurada del Agente 3 (no corrige, solo audita y dictamina)."""

    model_config = ConfigDict(extra="forbid")

    veredicto_global: VeredictoItem
    items: list[VerificationVerdict] = Field(min_length=1)
    resumen: str = Field(min_length=10)
