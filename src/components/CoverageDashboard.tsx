import { useMemo, useState } from 'react';
import { motion, MotionConfig } from 'motion/react';
import { AlertCircle, ArrowRight, CheckCircle2, MapPin, ShieldCheck, X } from 'lucide-react';
import type { CoberturaDatos, Provincia } from '@/schemas';
import type { CoberturaDetallada } from '@/data';

interface CoverageDashboardProps {
  cobertura: CoberturaDetallada;
}

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

const NIVEL_META: Record<
  CoberturaDatos,
  { label: string; dotClass: string; badgeClass: string }
> = {
  completa: {
    label: 'Completa',
    dotClass: 'bg-emerald-react',
    badgeClass: 'text-emerald-react',
  },
  parcial: {
    label: 'Parcial',
    dotClass: 'bg-cobalt',
    badgeClass: 'text-cobalt',
  },
  baja: {
    label: 'Baja',
    dotClass: 'bg-ochre-metal',
    badgeClass: 'text-ochre-metal',
  },
  sin_datos: {
    label: 'Sin datos',
    dotClass: 'bg-ink-muted',
    badgeClass: 'text-ink-muted',
  },
};

export function CoverageDashboard({ cobertura }: CoverageDashboardProps) {
  const [selectedNivel, setSelectedNivel] = useState<CoberturaDatos | 'todas'>('todas');
  const [selectedRegion, setSelectedRegion] = useState<Provincia['region'] | 'todas'>('todas');

  const filteredProvincias = useMemo(() => {
    return cobertura.provincias.filter((item) => {
      if (selectedNivel !== 'todas' && item.provincia.cobertura_datos !== selectedNivel) {
        return false;
      }
      if (selectedRegion !== 'todas' && item.provincia.region !== selectedRegion) {
        return false;
      }
      return true;
    });
  }, [cobertura.provincias, selectedNivel, selectedRegion]);

  const pctNacional = Math.round(
    (cobertura.totales.provinciasConDatos / cobertura.totales.totalProvincias) * 100
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-10">
        {/* 1. Matriz regional interactiva: expone con claridad qué regiones faltan cubrir */}
        <section aria-labelledby="cobertura-regional-heading">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
            <div>
              <h2
                id="cobertura-regional-heading"
                className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink"
              >
                Cobertura por región argentina
              </h2>
              <p className="mt-1 text-[14px] text-ink-muted">
                Hacé click en cualquier región para filtrar la tabla de las 24 jurisdicciones.
                Actualmente el atlas cubre {pctNacional}% de las jurisdicciones ({cobertura.totales.provinciasConDatos} de 24).
              </p>
            </div>
            {selectedRegion !== 'todas' && (
              <button
                type="button"
                onClick={() => setSelectedRegion('todas')}
                className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-cobalt hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                <span>Ver todas las regiones</span>
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cobertura.porRegion.map((reg) => {
              const isSelected = selectedRegion === reg.region;
              const isEmpty = reg.conDatos === 0;
              return (
                <button
                  key={reg.region}
                  type="button"
                  onClick={() =>
                    setSelectedRegion((curr) => (curr === reg.region ? 'todas' : reg.region))
                  }
                  aria-pressed={isSelected}
                  className={`flex cursor-pointer flex-col justify-between border p-5 text-left transition-colors duration-150 ${
                    isSelected
                      ? 'border-ink bg-ink text-white'
                      : 'border-rule bg-stone-surface text-ink hover:border-ink'
                  }`}
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2 tabular-nums">
                      <span className="font-display text-[18px] font-bold">{reg.region}</span>
                      <span
                        className={`text-[13px] font-semibold ${
                          isSelected
                            ? 'text-white/90'
                            : isEmpty
                              ? 'text-ink-muted'
                              : 'text-cobalt'
                        }`}
                      >
                        {reg.conDatos} de {reg.total} ({reg.porcentaje}%)
                      </span>
                    </div>

                    <div
                      className={`mt-3 h-1.5 w-full ${
                        isSelected ? 'bg-white/20' : 'bg-stone-subtle'
                      }`}
                    >
                      <div
                        className={`h-full transition-[width] duration-300 ${
                          isSelected
                            ? 'bg-white'
                            : isEmpty
                              ? 'bg-ink-muted/30'
                              : 'bg-cobalt'
                        }`}
                        style={{ width: `${reg.porcentaje}%` }}
                      />
                    </div>
                  </div>

                  <p
                    className={`mt-3.5 text-[13px] ${
                      isSelected ? 'text-white/80' : 'text-ink-muted'
                    }`}
                  >
                    {reg.conDatos > 0
                      ? `Cubiertas: ${reg.provinciasConDatos.join(', ')}. Restan ${reg.sinDatos} sin datos.`
                      : `Sin cadenas cargadas todavía (${reg.sinDatos} jurisdicciones en estado sin datos).`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Tabla filtrable de las 24 jurisdicciones oficiales Georef */}
        <section aria-labelledby="tabla-jurisdicciones-heading">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
            <div>
              <h2
                id="tabla-jurisdicciones-heading"
                className="font-display text-[22px] font-bold tracking-[-0.02em] text-ink"
              >
                Estado por jurisdicción (24 códigos Georef)
              </h2>
              <p className="mt-1 text-[14px] text-ink-muted">
                Si una provincia o departamento todavía no cuenta con fuentes primarias verificadas,
                el atlas declara explícitamente su estado sin datos.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Filtrar jurisdicciones por nivel de cobertura"
              className="inline-flex flex-wrap bg-stone-subtle p-1 text-[13px]"
            >
              {(
                [
                  { id: 'todas', label: `Todas (${cobertura.totales.totalProvincias})` },
                  { id: 'completa', label: `Completa (${cobertura.resumen.porNivel.completa})` },
                  { id: 'parcial', label: `Parcial (${cobertura.resumen.porNivel.parcial})` },
                  { id: 'baja', label: `Baja (${cobertura.resumen.porNivel.baja})` },
                  { id: 'sin_datos', label: `Sin datos (${cobertura.resumen.porNivel.sin_datos})` },
                ] as const
              ).map((tab) => {
                const isActive = selectedNivel === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSelectedNivel(tab.id)}
                    className={`relative cursor-pointer px-3 py-1.5 font-medium transition-colors duration-150 ${
                      isActive ? 'text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="cov-level-tab"
                        transition={SPRING_TAB}
                        className="absolute inset-0 bg-ink"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 overflow-x-auto border border-rule bg-stone-surface">
            <table className="w-full border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-rule bg-stone-subtle text-[13px] text-ink-muted">
                  <th className="px-4 py-3 font-medium">Jurisdicción</th>
                  <th className="px-4 py-3 font-medium">Región</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Cadenas y cobertura</th>
                  <th className="px-4 py-3 text-right font-medium">Deptos</th>
                  <th className="px-4 py-3 text-right font-medium">Plantas</th>
                  <th className="px-4 py-3 text-right font-medium">Mapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {filteredProvincias.length > 0 ? (
                  filteredProvincias.map((item) => {
                    const meta = NIVEL_META[item.provincia.cobertura_datos];
                    return (
                      <tr key={item.provincia.provincia_id} className="align-top">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-ink">{item.provincia.nombre}</p>
                          <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                            Georef {item.provincia.provincia_id} · {item.provincia.iso_3166_2}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-ink-muted">{item.provincia.region}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-2 text-[13px] font-medium ${meta.badgeClass}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
                            <span>{meta.label}</span>
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-3.5">
                          {item.cadenas.length > 0 && (
                            <div className="mb-1.5 flex flex-wrap gap-1.5">
                              {item.cadenas.map((c) => (
                                <a
                                  key={c.producto_id}
                                  href={`/productos/${c.producto_id}`}
                                  className="border border-rule bg-stone-bg px-2 py-0.5 text-[12px] font-medium text-ink transition-colors duration-150 hover:border-ink hover:text-cobalt"
                                >
                                  {c.nombre}
                                </a>
                              ))}
                            </div>
                          )}
                          <p className="text-[13px] text-ink-muted">
                            {item.provincia.nota_cobertura ??
                              'Sin cadenas productivas cargadas todavía.'}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-ink">
                          {item.departamentosConfiables.length}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-ink">
                          {item.plantasCount}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <a
                            href={`/?provincia=${item.provincia.provincia_id}#mapa`}
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Abrir</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[14px] text-ink-muted">
                      No hay jurisdicciones con nivel "{selectedNivel}" en este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Transparencia de vacíos y auditoría de datos faltantes */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="border border-rule bg-stone-surface p-6">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <AlertCircle className="h-4 w-4 text-ochre-metal" />
              <h3>Faltantes declarados explícitamente como sin datos</h3>
            </div>
            <p className="mt-2 text-[14px] text-ink-muted">
              Por regla de integridad del proyecto, ningún algoritmo ni editor estima cifras
              faltantes. Cuando un organismo oficial o una memoria auditada no publica un dato,
              queda registrado como <code className="bg-stone-subtle px-1 py-0.5 text-ink">sin_datos</code>:
            </p>
            <ul className="mt-4 divide-y divide-rule text-[14px] tabular-nums">
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-ink-muted">Jurisdicciones todavía sin cadenas relevadas</span>
                <span className="font-semibold text-ink">
                  {cobertura.totales.provinciasSinDatos} de {cobertura.totales.totalProvincias}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-ink-muted">Plantas sin capacidad nominal pública oficial</span>
                <span className="font-semibold text-ink">
                  {cobertura.totales.plantasSinCapacidadPublica} de{' '}
                  {cobertura.totales.plantasGeorreferenciadas}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-ink-muted">Series de producción sin reporte público oficial</span>
                <span className="font-semibold text-ink">
                  {cobertura.totales.seriesProduccionSinDatos} registros
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-ink-muted">
                  Series de comercio exterior con algún componente sin reporte
                </span>
                <span className="font-semibold text-ink">
                  {cobertura.totales.seriesComexParciales} registros
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-between border border-rule bg-stone-surface p-6">
            <div>
              <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-emerald-react" />
                <h3>Criterio para pasar una zona a cobertura verificada</h3>
              </div>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-muted">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-react" />
                  <span>
                    Fuentes primarias descargadas y verificadas con hash criptográfico SHA-256
                    ({cobertura.totales.fuentesVerificadas} fuentes auditadas actualmente).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-react" />
                  <span>
                    Procesos químicos validados por los 6 verificadores deterministas (balance
                    atómico, balance de masa, estequiometría, energía, grafo y comercio exterior).
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-react" />
                  <span>
                    Polígonos departamentales IGN incorporados solo donde existen plantas o zonas
                    productivas con respaldo oficial ({cobertura.totales.departamentosConDatos}{' '}
                    departamentos activos).
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-rule pt-4 text-[14px]">
              <a
                href="/empresas"
                className="inline-flex items-center gap-2 bg-ink px-4 py-2 font-medium text-white transition-colors duration-150 hover:bg-cobalt"
              >
                <span>Ver directorio de empresas</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/#mapa" className="font-medium text-ink hover:text-cobalt">
                Explorar en el mapa territorial →
              </a>
            </div>
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
