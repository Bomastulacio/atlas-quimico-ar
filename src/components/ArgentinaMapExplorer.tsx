import { useEffect, useMemo, useRef, useState } from 'react';
import { geoPath, geoStereographic, geoTransverseMercator } from 'd3-geo';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { Producto } from '@/schemas';
import type {
  GeoManifest,
  MapaProvinciaResumen,
  ProvinciasFeatureCollection,
} from '@/data';
import { ProductIcon } from './ProductIcon';
import { ProvinceSidePanel } from './ProvinceSidePanel';

interface ArgentinaMapExplorerProps {
  continentalGeo: ProvinciasFeatureCollection;
  antartidaIslasGeo: ProvinciasFeatureCollection;
  provinciasData: MapaProvinciaResumen[];
  productos: Producto[];
  geoManifest: GeoManifest;
  esEjemplo: boolean;
}

const VIEW_WIDTH = 520;
const VIEW_HEIGHT = 720;

const INSET_X = 322;
const INSET_Y = 504;
const INSET_W = 180;
const INSET_H = 196;

const SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

// Ajustes ópticos puntuales para que los íconos dominantes queden centrados
// dentro de cada provincia sin pisarse entre jurisdicciones vecinas.
const PIN_OFFSETS: Record<string, [number, number]> = {
  '06': [10, 14],   // Buenos Aires
  '26': [-6, 0],    // Chubut
  '38': [-4, -4],   // Jujuy
  '66': [8, 6],     // Salta
  '10': [-6, 4],    // Catamarca
  '82': [4, 14],    // Santa Fe (polo Rosario al sur)
  '22': [2, 2],     // Chaco
  '94': [-22, -4],  // Tierra del Fuego (Isla Grande)
};

export function getCategoryAccent(categoria: Producto['categoria']): string {
  switch (categoria) {
    case 'metalurgia':
      return '#0038FF'; // Azul cobalto
    case 'mineria_quimica':
      return '#00A859'; // Verde reactivo
    case 'fertilizantes':
      return '#0038FF';
    case 'agroindustria':
      return '#F59E0B'; // Ámbar fundición/grano
    case 'petroquimica':
      return '#FF331F'; // Rojo señal
    case 'bioenergia':
      return '#00A859';
  }
}

interface TooltipState {
  provinciaId: string;
  x: number;
  y: number;
}

export function ArgentinaMapExplorer({
  continentalGeo,
  antartidaIslasGeo,
  provinciasData,
  productos,
  geoManifest,
  esEjemplo,
}: ArgentinaMapExplorerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dataById = useMemo(
    () => new Map(provinciasData.map((item) => [item.provincia.provincia_id, item])),
    [provinciasData]
  );

  // Proyección Gauss-Krüger / Transverse Mercator centrada en 64°O (estándar IGN)
  const { pathContinental, pathAntartida, centroids, cabaPoint } = useMemo(() => {
    const projCont = geoTransverseMercator()
      .rotate([64, 0, 0])
      .fitExtent(
        [
          [24, 20],
          [440, 696],
        ],
        continentalGeo
      );
    const pCont = geoPath(projCont);

    const projAnt = geoStereographic()
      .rotate([50, 90, 0])
      .fitExtent(
        [
          [14, 26],
          [INSET_W - 14, INSET_H - 22],
        ],
        antartidaIslasGeo
      );
    const pAnt = geoPath(projAnt);

    const cMap = new Map<string, [number, number]>();
    for (const feat of continentalGeo.features) {
      const id = feat.properties.id;
      const raw = pCont.centroid(feat);
      if (Number.isFinite(raw[0]) && Number.isFinite(raw[1])) {
        const [dx, dy] = PIN_OFFSETS[id] ?? [0, 0];
        cMap.set(id, [raw[0] + dx, raw[1] + dy]);
      }
    }

    const cabaCoord = projCont([-58.44, -34.61]) ?? [285, 290];

    return {
      pathContinental: pCont,
      pathAntartida: pAnt,
      centroids: cMap,
      cabaPoint: cabaCoord as [number, number],
    };
  }, [continentalGeo, antartidaIslasGeo]);

  // Cerrar selección con Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const selectedData = selectedId ? (dataById.get(selectedId) ?? null) : null;
  const hoveredData = tooltip ? (dataById.get(tooltip.provinciaId) ?? null) : null;

  const zoomToProvincia = (provinciaId: string) => {
    const pt = centroids.get(provinciaId);
    if (!pt) return;
    const targetZoom = 2.15;
    setZoom(targetZoom);
    setPan({
      x: VIEW_WIDTH / 2 - pt[0] * targetZoom,
      y: VIEW_HEIGHT / 2 - pt[1] * targetZoom,
    });
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleStepZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.max(1, Math.min(3.2, Number((prev + delta).toFixed(2))));
      if (next === 1) {
        setPan({ x: 0, y: 0 });
      } else {
        const anchor = selectedId ? centroids.get(selectedId) : [VIEW_WIDTH / 2, VIEW_HEIGHT / 2];
        const [ax, ay] = anchor ?? [VIEW_WIDTH / 2, VIEW_HEIGHT / 2];
        setPan({
          x: VIEW_WIDTH / 2 - ax * next,
          y: VIEW_HEIGHT / 2 - ay * next,
        });
      }
      return next;
    });
  };

  const handleSelectProvincia = (provinciaId: string | null) => {
    setSelectedId(provinciaId);
    if (!provinciaId) {
      resetView();
    }
  };

  const handlePointerMove = (e: React.PointerEvent, provinciaId: string) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredId(provinciaId);
    setTooltip({
      provinciaId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const clearHover = () => {
    setHoveredId(null);
    setTooltip(null);
  };

  const getProvinceVisual = (provinciaId: string) => {
    const info = dataById.get(provinciaId);
    const isSelected = selectedId === provinciaId;
    const isHovered = hoveredId === provinciaId;
    const allProds = info?.dominante ? [info.dominante, ...info.secundarios] : [];

    const matchesFilter =
      activeProductId !== null && allProds.some((p) => p.producto_id === activeProductId);
    const filteredProduct = activeProductId
      ? productos.find((p) => p.producto_id === activeProductId) ?? null
      : null;

    const activeAccent =
      matchesFilter && filteredProduct
        ? getCategoryAccent(filteredProduct.categoria)
        : info?.dominante
          ? getCategoryAccent(info.dominante.categoria)
          : '#09090B';

    // Paleta estricta B&W en reposo + ruptura de color en selección, hover o filtro activo
    let fill = 'url(#halftone-sin-datos)';
    let stroke = '#A1A1AA';
    let strokeWidth = 0.75;

    if (info?.dominante) {
      fill = '#F4F4F6';
      stroke = '#18181B';
      strokeWidth = 0.9;
    }

    if (activeProductId !== null) {
      if (matchesFilter) {
        fill = activeAccent;
        stroke = '#09090B';
        strokeWidth = 1.25;
      } else {
        fill = info?.dominante ? '#FAFAFB' : 'url(#halftone-sin-datos)';
        stroke = '#D4D4D8';
        strokeWidth = 0.65;
      }
    }

    if (isHovered && !isSelected) {
      fill = info?.dominante ? activeAccent : '#E4E4E7';
      stroke = '#09090B';
      strokeWidth = 1.3;
    }

    if (isSelected) {
      fill = activeAccent;
      stroke = '#09090B';
      strokeWidth = 1.6;
    }

    return { fill, stroke, strokeWidth, isSelected, isHovered, matchesFilter, activeAccent };
  };

  return (
    <MotionConfig reducedMotion="user">
      <section aria-label="Mapa productivo e industrial de Argentina" className="space-y-4">
        {/* Barra de filtros por cadena MVP (Bencho spring pill) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-canvas px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
            <span className="inline-block h-2 w-2 bg-cobalt" />
            <span>Filtrar cadena</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtro por producto MVP">
            <button
              type="button"
              onClick={() => setActiveProductId(null)}
              className={`relative cursor-pointer border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                activeProductId === null
                  ? 'border-ink bg-ink text-white'
                  : 'border-rule bg-canvas text-ink-muted hover:border-ink hover:text-ink'
              }`}
            >
              Todas (24)
            </button>

            {productos.map((prod) => {
              const isActive = activeProductId === prod.producto_id;
              const accent = getCategoryAccent(prod.categoria);
              return (
                <button
                  key={prod.producto_id}
                  type="button"
                  onClick={() =>
                    setActiveProductId((curr) => (curr === prod.producto_id ? null : prod.producto_id))
                  }
                  style={isActive ? { backgroundColor: accent, borderColor: accent } : undefined}
                  className={`inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                    isActive
                      ? 'text-white font-medium'
                      : 'border-rule bg-canvas text-ink hover:border-ink'
                  }`}
                >
                  <ProductIcon iconId={prod.icono_id} size={13} />
                  <span>{prod.nombre.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grilla principal: Mapa bicontinental (7 cols) + Panel lateral táctil (5 cols) */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div
            ref={mapContainerRef}
            className="relative overflow-hidden border border-rule bg-canvas lg:col-span-7"
          >
            {/* Cabecera sutil sobre el lienzo del mapa */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-surface px-4 py-2.5 font-mono text-[11px]">
              <span className="text-ink font-medium">
                REPÚBLICA ARGENTINA · MAPA BICONTINENTAL (IGN)
              </span>
              <span className="tabular-nums text-ink-muted">
                ZOOM {zoom.toFixed(1)}× · 24 JURISDICCIONES
              </span>
            </div>

            {/* Controles de zoom flotantes */}
            <div className="absolute right-3 top-14 z-20 flex flex-col border border-rule bg-canvas shadow-xs">
              <button
                type="button"
                onClick={() => handleStepZoom(0.55)}
                aria-label="Acercar mapa"
                className="cursor-pointer border-b border-rule p-2 text-ink transition-colors hover:bg-ink hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleStepZoom(-0.55)}
                aria-label="Alejar mapa"
                className="cursor-pointer border-b border-rule p-2 text-ink transition-colors hover:bg-ink hover:text-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={resetView}
                aria-label="Restablecer vista del mapa"
                className="cursor-pointer p-2 text-ink transition-colors hover:bg-ink hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Lienzo SVG D3 */}
            <div className="relative flex items-center justify-center bg-canvas p-2 sm:p-4">
              <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label="Mapa interactivo bicontinental de provincias argentinas con cadenas productivas"
                className="h-auto max-h-[680px] w-full select-none"
                onPointerLeave={clearHover}
              >
                <defs>
                  {/* Trama halftone/dithered para jurisdicciones sin datos cargados */}
                  <pattern
                    id="halftone-sin-datos"
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="6" height="6" fill="#FFFFFF" />
                    <circle cx="2" cy="2" r="0.85" fill="#D4D4D8" />
                  </pattern>
                </defs>

                {/* Grupo con zoom/pan suave spring */}
                <motion.g
                  animate={{ x: pan.x, y: pan.y, scale: zoom }}
                  transition={SPRING}
                  style={{ transformOrigin: '0px 0px' }}
                >
                  {/* 24 jurisdicciones continentales + Islas Malvinas */}
                  {continentalGeo.features.map((feat) => {
                    const id = feat.properties.id;
                    const d = pathContinental(feat) ?? '';
                    const visual = getProvinceVisual(id);

                    return (
                      <path
                        key={id}
                        d={d}
                        fill={visual.fill}
                        stroke={visual.stroke}
                        strokeWidth={visual.strokeWidth / Math.sqrt(zoom)}
                        strokeLinejoin="round"
                        className="cursor-pointer transition-colors duration-150 focus:outline-none"
                        tabIndex={0}
                        role="button"
                        aria-label={`${feat.properties.nombre} (Georef ${id})`}
                        aria-pressed={visual.isSelected}
                        onPointerMove={(e) => handlePointerMove(e, id)}
                        onPointerLeave={clearHover}
                        onClick={() => handleSelectProvincia(id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectProvincia(id);
                          }
                        }}
                      />
                    );
                  })}

                  {/* Callout dedicado para CABA (02) para facilitar click/tap */}
                  {(() => {
                    const cabaVis = getProvinceVisual('02');
                    const boxX = cabaPoint[0] + 42;
                    const boxY = cabaPoint[1] - 18;
                    return (
                      <g
                        className="cursor-pointer"
                        onPointerMove={(e) => handlePointerMove(e, '02')}
                        onPointerLeave={clearHover}
                        onClick={() => handleSelectProvincia('02')}
                      >
                        <line
                          x1={cabaPoint[0]}
                          y1={cabaPoint[1]}
                          x2={boxX}
                          y2={boxY + 10}
                          stroke="#18181B"
                          strokeWidth={0.85 / Math.sqrt(zoom)}
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={cabaPoint[0]}
                          cy={cabaPoint[1]}
                          r={2.8 / Math.sqrt(zoom)}
                          fill={cabaVis.isSelected || cabaVis.isHovered ? '#0038FF' : '#09090B'}
                        />
                        <rect
                          x={boxX}
                          y={boxY}
                          width={54}
                          height={20}
                          fill={cabaVis.isSelected ? '#09090B' : '#FFFFFF'}
                          stroke="#18181B"
                          strokeWidth={0.9 / Math.sqrt(zoom)}
                        />
                        <text
                          x={boxX + 27}
                          y={boxY + 13}
                          textAnchor="middle"
                          fontSize="8.5"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight="600"
                          fill={cabaVis.isSelected ? '#FFFFFF' : '#09090B'}
                        >
                          02·CABA
                        </text>
                      </g>
                    );
                  })()}

                  {/* Pines con íconos propios (dominante + badge "+N", expande al zoom o selección) */}
                  {provinciasData.map((item) => {
                    const id = item.provincia.provincia_id;
                    if (!item.dominante) return null;
                    const pos = centroids.get(id);
                    if (!pos) return null;

                    const isSelected = selectedId === id;
                    const isHovered = hoveredId === id;
                    const allProds = [item.dominante, ...item.secundarios];
                    const matchesFilter =
                      activeProductId !== null &&
                      allProds.some((p) => p.producto_id === activeProductId);

                    if (activeProductId !== null && !matchesFilter) return null;

                    const displayProduct =
                      activeProductId !== null
                        ? allProds.find((p) => p.producto_id === activeProductId) ?? item.dominante
                        : item.dominante;

                    const accent = getCategoryAccent(displayProduct.categoria);
                    const invScale = 1 / Math.sqrt(zoom);
                    const showExpandedSecondary =
                      item.secundarios.length > 0 &&
                      activeProductId === null &&
                      (zoom >= 1.75 || isSelected);

                    return (
                      <g
                        key={`pin-${id}`}
                        transform={`translate(${pos[0]}, ${pos[1]}) scale(${invScale})`}
                        className="cursor-pointer"
                        onPointerMove={(e) => handlePointerMove(e, id)}
                        onPointerLeave={clearHover}
                        onClick={() => handleSelectProvincia(id)}
                      >
                        {/* Pin principal del producto dominante */}
                        <rect
                          x={-13}
                          y={-13}
                          width={26}
                          height={26}
                          fill={isSelected || isHovered || matchesFilter ? '#09090B' : '#FFFFFF'}
                          stroke={isSelected || isHovered || matchesFilter ? '#FFFFFF' : '#09090B'}
                          strokeWidth={1.35}
                        />
                        {/* Franja de color en el borde superior del pin */}
                        <rect x={-13} y={-13} width={26} height={3} fill={accent} />

                        <g
                          transform="translate(-8, -7)"
                          color={isSelected || isHovered || matchesFilter ? '#FFFFFF' : '#09090B'}
                        >
                          <ProductIcon iconId={displayProduct.icono_id} size={16} />
                        </g>

                        {/* Badge +N cuando hay productos secundarios sin expandir */}
                        {item.secundarios.length > 0 &&
                          activeProductId === null &&
                          !showExpandedSecondary && (
                            <g transform="translate(9, -15)">
                              <rect width={16} height={13} fill="#09090B" />
                              <text
                                x={8}
                                y={9.5}
                                textAnchor="middle"
                                fontSize="8"
                                fontFamily="IBM Plex Mono, monospace"
                                fontWeight="600"
                                fill="#FFFFFF"
                              >
                                +{item.secundarios.length}
                              </text>
                            </g>
                          )}

                        {/* Al hacer zoom o click, revelar íconos secundarios */}
                        {showExpandedSecondary &&
                          item.secundarios.map((sec, sIdx) => (
                            <g
                              key={sec.producto_id}
                              transform={`translate(${26 * (sIdx + 1) + 4}, 0)`}
                            >
                              <rect
                                x={-11}
                                y={-11}
                                width={22}
                                height={22}
                                fill="#FFFFFF"
                                stroke="#09090B"
                                strokeWidth={1.1}
                              />
                              <rect
                                x={-11}
                                y={-11}
                                width={22}
                                height={2.5}
                                fill={getCategoryAccent(sec.categoria)}
                              />
                              <g transform="translate(-7, -6)" color="#09090B">
                                <ProductIcon iconId={sec.icono_id} size={14} />
                              </g>
                            </g>
                          ))}
                      </g>
                    );
                  })}
                </motion.g>

                {/* Recuadro fijo Bicontinental IGN: Sector Antártico e Islas del Atlántico Sur */}
                {(() => {
                  const tdfVis = getProvinceVisual('94');
                  return (
                    <g
                      transform={`translate(${INSET_X}, ${INSET_Y})`}
                      className="cursor-pointer"
                      onPointerMove={(e) => handlePointerMove(e, '94')}
                      onPointerLeave={clearHover}
                      onClick={() => handleSelectProvincia('94')}
                    >
                      <rect
                        width={INSET_W}
                        height={INSET_H}
                        fill="#FFFFFF"
                        stroke={tdfVis.isSelected ? '#0038FF' : '#18181B'}
                        strokeWidth={tdfVis.isSelected ? 1.8 : 1}
                      />
                      {/* Cabecera del recuadro */}
                      <rect width={INSET_W} height={19} fill="#09090B" />
                      <text
                        x={8}
                        y={12.5}
                        fontSize="7.5"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="600"
                        fill="#FFFFFF"
                      >
                        ANTÁRTIDA E ISLAS DEL ATL. SUR
                      </text>

                      {/* Grilla polar sutil */}
                      <line
                        x1={INSET_W / 2}
                        y1={24}
                        x2={INSET_W / 2}
                        y2={INSET_H - 18}
                        stroke="#E4E4E7"
                        strokeWidth={0.6}
                        strokeDasharray="2 2"
                      />

                      {antartidaIslasGeo.features.map((feat, idx) => (
                        <path
                          key={`ant-${idx}`}
                          d={pathAntartida(feat) ?? ''}
                          fill={tdfVis.fill}
                          stroke={tdfVis.stroke}
                          strokeWidth={0.9}
                          strokeLinejoin="round"
                        />
                      ))}

                      <text
                        x={8}
                        y={INSET_H - 7}
                        fontSize="7"
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#63636E"
                      >
                        94 · 74°O–25°O · LEY 26.651 IGN
                      </text>
                    </g>
                  );
                })()}
              </svg>

              {/* Tooltip flotante al hover (desktop) */}
              <AnimatePresence>
                {tooltip && hoveredData && (
                  <motion.div
                    key={hoveredData.provincia.provincia_id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      left: Math.min(tooltip.x + 14, (mapContainerRef.current?.clientWidth ?? 420) - 210),
                      top: Math.max(tooltip.y - 12, 48),
                    }}
                    className="pointer-events-none absolute z-30 hidden w-52 border border-ink bg-ink p-3 text-white shadow-md sm:block"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-white/65">
                      <span>GEOREF {hoveredData.provincia.provincia_id}</span>
                      <span>{hoveredData.provincia.iso_3166_2}</span>
                    </div>
                    <p className="mt-1 font-display text-sm font-semibold leading-snug text-white">
                      {hoveredData.provincia.nombre}
                    </p>
                    {hoveredData.dominante ? (
                      <div className="mt-2 flex items-center gap-2 border-t border-white/15 pt-2 font-mono text-[11px]">
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{
                            backgroundColor: getCategoryAccent(hoveredData.dominante.categoria),
                          }}
                        />
                        <span className="truncate">
                          {hoveredData.dominante.nombre}
                          {hoveredData.secundarios.length > 0
                            ? ` (+${hoveredData.secundarios.length})`
                            : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 border-t border-white/15 pt-2 font-mono text-[10px] text-white/60">
                        SIN DATOS PRODUCTIVOS CARGADOS
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Leyenda técnica inferior */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-surface px-4 py-2.5 font-mono text-[10px] text-ink-muted">
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 border border-ink bg-[#F4F4F6]" />
                  Con cadenas MVP
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="dot-matrix-bg inline-block h-3 w-3 border border-rule bg-canvas" />
                  Sin datos cargados
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 bg-cobalt" />
                  Activa / filtro
                </span>
              </div>
              <span>Click para abrir panel · Esc para limpiar</span>
            </div>
          </div>

          {/* Panel lateral interactivo */}
          <div className="lg:col-span-5">
            <ProvinceSidePanel
              selected={selectedData}
              allProvincias={provinciasData}
              onSelectProvincia={handleSelectProvincia}
              onZoomToSelected={selectedId ? () => zoomToProvincia(selectedId) : undefined}
              esEjemplo={esEjemplo}
              geoManifest={geoManifest}
              categoryAccent={getCategoryAccent}
            />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
