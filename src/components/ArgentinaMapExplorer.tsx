import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule, geoPath, geoStereographic, geoTransverseMercator } from 'd3-geo';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Box, Minus, Move, Plus, RotateCcw } from 'lucide-react';
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

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 760;

const INSET_X = 432;
const INSET_Y = 532;
const INSET_W = 188;
const INSET_H = 206;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4.5;

const SPRING_TAB = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.85,
};

const PIN_OFFSETS: Record<string, [number, number]> = {
  '06': [12, 16],
  '26': [-6, 0],
  '38': [-5, -5],
  '66': [10, 8],
  '10': [-6, 5],
  '82': [4, 16],
  '22': [2, 2],
  '94': [-22, -4],
};

export function getCategoryAccent(categoria: Producto['categoria']): string {
  switch (categoria) {
    case 'metalurgia':
      return '#0A42E0'; // Azul cobalto
    case 'mineria_quimica':
      return '#0B7A53'; // Verde mineral
    case 'fertilizantes':
      return '#0A42E0';
    case 'agroindustria':
      return '#C86A11'; // Ocre industrial
    case 'petroquimica':
      return '#D93025'; // Rojo señal
    case 'bioenergia':
      return '#0B7A53';
  }
}

function getExtrusionSideColor(hex: string): string {
  switch (hex) {
    case '#0A42E0':
      return '#062685';
    case '#0B7A53':
      return '#064932';
    case '#C86A11':
      return '#7B3E08';
    case '#D93025':
      return '#8B1B14';
    default:
      return '#111214';
  }
}

interface TooltipState {
  provinciaId: string;
  x: number;
  y: number;
  plantaNombre?: string;
  plantaDetalle?: string;
}

interface ViewportTransform {
  zoom: number;
  x: number;
  y: number;
}

function clampTransform(next: ViewportTransform): ViewportTransform {
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next.zoom));
  const marginX = VIEW_WIDTH * 0.42;
  const marginY = VIEW_HEIGHT * 0.35;
  const minX = VIEW_WIDTH - VIEW_WIDTH * z - marginX;
  const maxX = marginX;
  const minY = VIEW_HEIGHT - VIEW_HEIGHT * z - marginY;
  const maxY = marginY;
  return {
    zoom: z,
    x: Math.max(minX, Math.min(maxX, next.x)),
    y: Math.max(minY, Math.min(maxY, next.y)),
  };
}

export function ArgentinaMapExplorer({
  continentalGeo,
  antartidaIslasGeo,
  provinciasData,
  productos,
  geoManifest,
  esEjemplo,
}: ArgentinaMapExplorerProps) {
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Transformación de vista (zoom + paneo por arrastre) y modo relieve 3D
  const [view, setView] = useState<ViewportTransform>({ zoom: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [userLocked2D, setUserLocked2D] = useState(false);

  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const dataById = useMemo(
    () => new Map(provinciasData.map((item) => [item.provincia.provincia_id, item])),
    [provinciasData]
  );

  // Proyección Gauss-Krüger / Transverse Mercator centrada en 64°O + recuadro polar IGN
  const { pathContinental, pathAntartida, graticulePath, centroids, cabaPoint, plantPins } = useMemo(() => {
    const projCont = geoTransverseMercator()
      .rotate([64, 0, 0])
      .fitExtent(
        [
          [38, 22],
          [532, 734],
        ],
        continentalGeo
      );
    const pCont = geoPath(projCont);

    const graticule = geoGraticule()
      .step([5, 5])
      .extent([
        [-78, -58],
        [-48, -20],
      ]);
    const gPath = pCont(graticule()) ?? '';

    const projAnt = geoStereographic()
      .rotate([50, 90, 0])
      .fitExtent(
        [
          [16, 28],
          [INSET_W - 16, INSET_H - 26],
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

    const cabaCoord = projCont([-58.44, -34.61]) ?? [350, 310];

    const projectedPlants = provinciasData.flatMap((provItem) =>
      provItem.plantas.flatMap((pl) => {
        const pt = projCont([pl.lon, pl.lat]);
        if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) return [];
        return [{ planta: pl, x: pt[0], y: pt[1] }];
      })
    );

    return {
      pathContinental: pCont,
      pathAntartida: pAnt,
      graticulePath: gPath,
      centroids: cMap,
      cabaPoint: cabaCoord as [number, number],
      plantPins: projectedPlants,
    };
  }, [continentalGeo, antartidaIslasGeo, provinciasData]);

  // Conversión precisa de coordenadas de pantalla al sistema viewBox usando el contenedor
  // exterior sin inclinar (evita saltos de escala al arrastrar o hacer zoom en modo 3D).
  const clientToSvgCoords = useCallback((clientX: number, clientY: number): [number, number] => {
    const container = mapViewportRef.current;
    if (!container) return [VIEW_WIDTH / 2, VIEW_HEIGHT / 2];
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return [VIEW_WIDTH / 2, VIEW_HEIGHT / 2];
    const scale = Math.min(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT);
    const renderedW = VIEW_WIDTH * scale;
    const renderedH = VIEW_HEIGHT * scale;
    const offsetX = rect.left + (rect.width - renderedW) / 2;
    const offsetY = rect.top + (rect.height - renderedH) / 2;
    return [(clientX - offsetX) / scale, (clientY - offsetY) / scale];
  }, []);

  // Zoom con la rueda del mouse centrado exactamente en el cursor (passive: false)
  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [svgX, svgY] = clientToSvgCoords(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0016);

      setView((prev) => {
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
        if (Math.abs(nextZoom - prev.zoom) < 0.001) return prev;
        // Mantener bajo el cursor el mismo punto del mapa
        const mapX = (svgX - prev.x) / prev.zoom;
        const mapY = (svgY - prev.y) / prev.zoom;
        return clampTransform({
          zoom: nextZoom,
          x: svgX - mapX * nextZoom,
          y: svgY - mapY * nextZoom,
        });
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [clientToSvgCoords]);

  // Tecla Escape limpia selección y restablece vista
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setIs3D(false);
        setView({ zoom: 1, x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const zoomToProvincia = useCallback(
    (provinciaId: string, targetZoom = 2.05) => {
      const pt = centroids.get(provinciaId);
      if (!pt) return;
      setView(
        clampTransform({
          zoom: targetZoom,
          x: VIEW_WIDTH / 2 - pt[0] * targetZoom,
          y: VIEW_HEIGHT / 2 - pt[1] * targetZoom,
        })
      );
    },
    [centroids]
  );

  const resetView = () => {
    setView({ zoom: 1, x: 0, y: 0 });
    setSelectedId(null);
    setIs3D(false);
  };

  const handleStepZoom = (factor: number) => {
    setView((prev) => {
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
      if (nextZoom <= 1.01) return { zoom: 1, x: 0, y: 0 };
      const cx = VIEW_WIDTH / 2;
      const cy = VIEW_HEIGHT / 2;
      const mapX = (cx - prev.x) / prev.zoom;
      const mapY = (cy - prev.y) / prev.zoom;
      return clampTransform({
        zoom: nextZoom,
        x: cx - mapX * nextZoom,
        y: cy - mapY * nextZoom,
      });
    });
  };

  // Arrastre directo (click sostenido + mover) en desktop y táctil
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Ignorar clicks sobre los botones de control flotantes
    if ((e.target as HTMLElement).closest('button')) return;

    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: view.x,
      startY: view.y,
      moved: false,
    };
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;

    const dxScreen = e.clientX - dragRef.current.startClientX;
    const dyScreen = e.clientY - dragRef.current.startClientY;

    if (!dragRef.current.moved && Math.hypot(dxScreen, dyScreen) > 5) {
      dragRef.current.moved = true;
      setIsDragging(true);
      setTooltip(null);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    if (dragRef.current.moved) {
      const container = mapViewportRef.current;
      const rect = container?.getBoundingClientRect();
      const scale = rect
        ? Math.min(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT)
        : 1;
      const dxSvg = dxScreen / (scale || 1);
      const dySvg = dyScreen / (scale || 1);

      setView((prev) =>
        clampTransform({
          zoom: prev.zoom,
          x: dragRef.current.startX + dxSvg,
          y: dragRef.current.startY + dySvg,
        })
      );
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    if (dragRef.current.moved && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current.active = false;
    setIsDragging(false);
    // Permitir que el click inmediatamente posterior ignore el arrastre
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
  };

  const handleStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;

    // Si el mapa está en relieve 3D, con provincia seleccionada o con zoom,
    // doble click vuelve suavemente a la vista normal 2D completa.
    if (is3D || selectedId !== null || view.zoom > 1.15) {
      resetView();
      return;
    }

    const [svgX, svgY] = clientToSvgCoords(e.clientX, e.clientY);
    setView((prev) => {
      const nextZoom = Math.min(MAX_ZOOM, prev.zoom * 1.6);
      const mapX = (svgX - prev.x) / prev.zoom;
      const mapY = (svgY - prev.y) / prev.zoom;
      return clampTransform({
        zoom: nextZoom,
        x: svgX - mapX * nextZoom,
        y: svgY - mapY * nextZoom,
      });
    });
  };

  const handleSelectProvincia = (provinciaId: string | null) => {
    if (dragRef.current.moved) return;

    // Volver a hacer click en la provincia ya seleccionada (o pasar null) vuelve a 2D normal
    if (provinciaId === null || provinciaId === selectedId) {
      setSelectedId(null);
      setIs3D(false);
      setView({ zoom: 1, x: 0, y: 0 });
      return;
    }

    setSelectedId(provinciaId);
    if (!userLocked2D) {
      setIs3D(true);
    }
    zoomToProvincia(provinciaId, Math.max(view.zoom, 1.65));
  };

  const handleProvincePointerMove = (
    e: React.PointerEvent,
    provinciaId: string,
    plantaMeta?: { nombre: string; detalle: string }
  ) => {
    if (isDragging) return;
    const rect = mapViewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredId(provinciaId);
    setTooltip({
      provinciaId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      plantaNombre: plantaMeta?.nombre,
      plantaDetalle: plantaMeta?.detalle,
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
          : '#2B2E36';

    let fill = 'url(#stone-sin-datos)';
    let stroke = '#9FA5B0';
    let strokeWidth = 0.85;

    if (info?.dominante) {
      fill = '#F8F8F5';
      stroke = '#1C1E22';
      strokeWidth = 1.05;
    }

    if (activeProductId !== null) {
      if (matchesFilter) {
        fill = activeAccent;
        stroke = '#111214';
        strokeWidth = 1.3;
      } else {
        fill = info?.dominante ? '#EEEEEC' : 'url(#stone-sin-datos)';
        stroke = '#B9BEC7';
        strokeWidth = 0.7;
      }
    }

    if (isHovered && !isSelected) {
      fill = info?.dominante ? activeAccent : '#CFD4DC';
      stroke = '#111214';
      strokeWidth = 1.35;
    }

    if (isSelected) {
      fill = activeAccent;
      stroke = '#F7F7F5';
      strokeWidth = 1.65;
    }

    return { fill, stroke, strokeWidth, isSelected, isHovered, matchesFilter, activeAccent };
  };

  const selectedData = selectedId ? (dataById.get(selectedId) ?? null) : null;
  const hoveredData = tooltip && !isDragging ? (dataById.get(tooltip.provinciaId) ?? null) : null;
  const selectedFeature = selectedId
    ? continentalGeo.features.find((f) => f.properties.id === selectedId) ?? null
    : null;

  const invScale = 1 / Math.sqrt(view.zoom);

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4">
        {/* Control segmentado conectado para filtrar cadenas productivas (sin pared de botones) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-rule py-2.5">
          <div
            role="tablist"
            aria-label="Filtrar mapa por cadena productiva"
            className="flex max-w-full items-center overflow-x-auto bg-stone-subtle p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeProductId === null}
              onClick={() => setActiveProductId(null)}
              className={`relative shrink-0 cursor-pointer px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${activeProductId === null ? 'text-white' : 'text-ink-muted hover:text-ink'
                }`}
            >
              {activeProductId === null && (
                <motion.span
                  layoutId="map-chain-filter"
                  transition={SPRING_TAB}
                  className="absolute inset-0 bg-ink"
                />
              )}
              <span className="relative z-10">Todas las cadenas</span>
            </button>

            {productos.map((prod) => {
              const isActive = activeProductId === prod.producto_id;
              const accent = getCategoryAccent(prod.categoria);
              return (
                <button
                  key={prod.producto_id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() =>
                    setActiveProductId((curr) =>
                      curr === prod.producto_id ? null : prod.producto_id
                    )
                  }
                  className={`relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${isActive ? 'text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="map-chain-filter"
                      transition={SPRING_TAB}
                      style={{ backgroundColor: accent }}
                      className="absolute inset-0"
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <ProductIcon iconId={prod.icono_id} size={14} />
                    <span>{prod.nombre.split(' ')[0]}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <p className="hidden items-center gap-1.5 text-[13px] text-ink-muted xl:flex">
            <Move className="h-3.5 w-3.5" />
            <span>Arrastrá para mover, rueda para zoom y doble click para volver a 2D</span>
          </p>
        </div>

        {/* Espacio principal widescreen: Mapa (62%) + Ficha territorial (38%) */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div
            ref={mapViewportRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={handleStageDoubleClick}
            className={`relative overflow-hidden border border-rule bg-sea-basin select-none lg:col-span-7 xl:col-span-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            style={{ touchAction: 'none' }}
          >
            {/* Controles integrados (2D/3D + zoom) en la esquina superior derecha */}
            <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
              {/* Switch conectado 2D / 3D */}
              <div
                role="group"
                aria-label="Perspectiva cartográfica"
                className="flex border border-rule bg-stone-surface/95 p-0.5 text-[13px] backdrop-blur-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIs3D(false);
                    setUserLocked2D(true);
                  }}
                  aria-pressed={!is3D}
                  className={`cursor-pointer px-2.5 py-1 font-medium transition-colors duration-150 ${!is3D ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                >
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIs3D(true);
                    setUserLocked2D(false);
                  }}
                  aria-pressed={is3D}
                  className={`inline-flex cursor-pointer items-center gap-1 px-2.5 py-1 font-medium transition-colors duration-150 ${is3D ? 'bg-cobalt text-white' : 'text-ink-muted hover:text-ink'
                    }`}
                >
                  <Box className="h-3.5 w-3.5" />
                  3D
                </button>
              </div>

              {/* Controles de zoom */}
              <div className="flex border border-rule bg-stone-surface/95 backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => handleStepZoom(1.4)}
                  aria-label="Acercar mapa"
                  className="cursor-pointer border-r border-rule px-2.5 py-1.5 text-ink transition-colors duration-150 hover:bg-ink hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepZoom(1 / 1.4)}
                  aria-label="Alejar mapa"
                  className="cursor-pointer border-r border-rule px-2.5 py-1.5 text-ink transition-colors duration-150 hover:bg-ink hover:text-white"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  aria-label="Restablecer vista del mapa"
                  title="Centrar mapa"
                  className="cursor-pointer px-2.5 py-1.5 text-ink transition-colors duration-150 hover:bg-ink hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Indicador limpio de escala y proyección arriba a la izquierda */}
            <div className="pointer-events-none absolute left-4 top-4 z-20 text-[13px] text-ink-muted">
              <span className="font-medium text-ink">República Argentina</span>
              <span className="mx-1.5 text-rule-strong/30">/</span>
              <span className="tabular-nums">{view.zoom.toFixed(1)}×</span>
            </div>

            {/* Escena con perspectiva 3D suave y recorte limpio sobre la leyenda inferior */}
            <div className="map-stage-3d relative flex h-[540px] items-center justify-center overflow-hidden sm:h-[640px] lg:h-[720px]">
              <div className={`map-plane h-full w-full ${is3D ? 'map-plane-tilted' : ''}`}>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                  role="img"
                  aria-label="Mapa interactivo bicontinental de provincias argentinas con cadenas productivas"
                  className="h-full w-full"
                  onPointerLeave={clearHover}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !dragRef.current.moved && selectedId) {
                      handleSelectProvincia(null);
                    }
                  }}
                >
                  <defs>
                    {/* Trama cartográfica sutil para jurisdicciones sin datos */}
                    <pattern
                      id="stone-sin-datos"
                      width="7"
                      height="7"
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width="7" height="7" fill="#EFEFED" />
                      <path d="M0 7L7 0" stroke="#D5D7DC" strokeWidth="0.7" />
                    </pattern>

                    {/* Sombra suave arquitectónica del territorio nacional sobre el mar */}
                    <filter id="land-shadow" x="-8%" y="-8%" width="120%" height="120%">
                      <feDropShadow
                        dx="0"
                        dy="4"
                        stdDeviation="4"
                        floodColor="#111214"
                        floodOpacity="0.1"
                      />
                    </filter>

                    {/* Sombra proyectada por la provincia elevada en 3D */}
                    <filter id="extrude-shadow" x="-15%" y="-15%" width="140%" height="140%">
                      <feDropShadow
                        dx="3"
                        dy="14"
                        stdDeviation="5"
                        floodColor="#090B10"
                        floodOpacity="0.34"
                      />
                    </filter>
                  </defs>

                  {/* Grupo paneable y zoomeable */}
                  <g
                    style={{
                      transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                      transformOrigin: '0px 0px',
                      transition: isDragging
                        ? 'none'
                        : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    {/* Retícula geográfica sutil (meridianos y paralelos cada 5°) */}
                    <path
                      d={graticulePath}
                      fill="none"
                      stroke="rgba(17, 18, 20, 0.08)"
                      strokeWidth={0.7 / Math.sqrt(view.zoom)}
                    />

                    {/* Base continental de las 24 jurisdicciones + Islas Malvinas */}
                    <g filter="url(#land-shadow)">
                      {continentalGeo.features.map((feat) => {
                        const id = feat.properties.id;
                        // Si está seleccionada en modo 3D, se dibuja elevada arriba en la capa de extrusión
                        if (selectedId === id && is3D) {
                          return (
                            <path
                              key={`${id}-socket`}
                              d={pathContinental(feat) ?? ''}
                              fill="#C6CCD4"
                              stroke="#8C939E"
                              strokeWidth={0.75 * invScale}
                            />
                          );
                        }

                        const d = pathContinental(feat) ?? '';
                        const visual = getProvinceVisual(id);

                        return (
                          <path
                            key={id}
                            d={d}
                            fill={visual.fill}
                            stroke={visual.stroke}
                            strokeWidth={visual.strokeWidth * invScale}
                            strokeLinejoin="round"
                            className="cursor-pointer transition-colors duration-150 focus:outline-none"
                            tabIndex={0}
                            role="button"
                            aria-label={`${feat.properties.nombre} (código Georef ${id})`}
                            aria-pressed={visual.isSelected}
                            onPointerMove={(e) => handleProvincePointerMove(e, id)}
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
                    </g>

                    {/* Capa de extrusión 3D arquitectónica animada para la provincia seleccionada */}
                    {selectedFeature && selectedId && is3D && (() => {
                      const d = pathContinental(selectedFeature) ?? '';
                      const visual = getProvinceVisual(selectedId);
                      const sideColor = getExtrusionSideColor(visual.fill);
                      const lift = 11 * invScale;
                      const steps = [5, 4, 3, 2, 1];

                      return (
                        <motion.g
                          key={`extrude-${selectedId}`}
                          initial={{ y: lift, opacity: 0.85 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="cursor-pointer"
                          onPointerMove={(e) => handleProvincePointerMove(e, selectedId)}
                          onPointerLeave={clearHover}
                          onClick={() => handleSelectProvincia(selectedId)}
                        >
                          {/* Sombra de elevación */}
                          <path
                            d={d}
                            fill={sideColor}
                            opacity="0.35"
                            filter="url(#extrude-shadow)"
                          />

                          {/* Paredes extruidas apiladas formando volumen arquitectónico */}
                          {steps.map((step) => {
                            const dy = -lift + (step / steps.length) * lift;
                            const dx = (step / steps.length) * 2.4 * invScale;
                            return (
                              <path
                                key={step}
                                d={d}
                                transform={`translate(${dx}, ${dy})`}
                                fill={sideColor}
                                stroke={sideColor}
                                strokeWidth={0.85 * invScale}
                                strokeLinejoin="round"
                              />
                            );
                          })}

                          {/* Cara superior elevada con color vivo y borde luminoso */}
                          <path
                            d={d}
                            transform={`translate(0, ${-lift})`}
                            fill={visual.fill}
                            stroke="#F7F7F5"
                            strokeWidth={1.65 * invScale}
                            strokeLinejoin="round"
                          />
                        </motion.g>
                      );
                    })()}

                    {/* Callout nítido para CABA (02) */}
                    {(() => {
                      const cabaVis = getProvinceVisual('02');
                      const boxX = cabaPoint[0] + 46 * invScale;
                      const boxY = cabaPoint[1] - 12 * invScale;
                      return (
                        <g
                          className="cursor-pointer"
                          onPointerMove={(e) => handleProvincePointerMove(e, '02')}
                          onPointerLeave={clearHover}
                          onClick={() => handleSelectProvincia('02')}
                        >
                          <line
                            x1={cabaPoint[0]}
                            y1={cabaPoint[1]}
                            x2={boxX}
                            y2={boxY + 11 * invScale}
                            stroke="#111214"
                            strokeWidth={0.9 * invScale}
                            strokeDasharray={`${2.5 * invScale} ${2.5 * invScale}`}
                          />
                          <circle
                            cx={cabaPoint[0]}
                            cy={cabaPoint[1]}
                            r={3 * invScale}
                            fill={cabaVis.isSelected ? '#0A42E0' : '#111214'}
                          />
                          <g transform={`translate(${boxX}, ${boxY}) scale(${invScale})`}>
                            <rect
                              width={58}
                              height={22}
                              fill={cabaVis.isSelected ? '#111214' : '#F7F7F5'}
                              stroke="#111214"
                              strokeWidth={1}
                            />
                            <text
                              x={29}
                              y={14.5}
                              textAnchor="middle"
                              fontSize="10"
                              fontFamily="Inter, sans-serif"
                              fontWeight="600"
                              fill={cabaVis.isSelected ? '#FFFFFF' : '#111214'}
                            >
                              CABA
                            </text>
                          </g>
                        </g>
                      );
                    })()}

                    {/* Pines con íconos propios (dominante + badge +N, elevados si la provincia está en 3D) */}
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
                          ? allProds.find((p) => p.producto_id === activeProductId) ??
                          item.dominante
                          : item.dominante;

                      const accent = getCategoryAccent(displayProduct.categoria);
                      const liftOffset = isSelected && is3D ? -22 * invScale : 0;
                      const showExpandedSecondary =
                        item.secundarios.length > 0 &&
                        activeProductId === null &&
                        (view.zoom >= 1.75 || isSelected);

                      return (
                        <g
                          key={`pin-${id}`}
                          transform={`translate(${pos[0]}, ${pos[1]})`}
                          className="cursor-pointer"
                          onPointerMove={(e) => handleProvincePointerMove(e, id)}
                          onPointerLeave={clearHover}
                          onClick={() => handleSelectProvincia(id)}
                        >
                          {/* Tallo arquitectónico vertical cuando la provincia está elevada en 3D */}
                          {isSelected && is3D && (
                            <g>
                              <line
                                x1={0}
                                y1={-10 * invScale}
                                x2={0}
                                y2={liftOffset + 12 * invScale}
                                stroke="#F7F7F5"
                                strokeWidth={1.5 * invScale}
                              />
                              <circle
                                cx={0}
                                cy={-10 * invScale}
                                r={2.4 * invScale}
                                fill="#F7F7F5"
                              />
                            </g>
                          )}

                          <g transform={`translate(0, ${liftOffset}) scale(${invScale})`}>
                            <rect
                              x={-14}
                              y={-14}
                              width={28}
                              height={28}
                              fill={isSelected || isHovered || matchesFilter ? '#111214' : '#F7F7F5'}
                              stroke={isSelected ? '#FFFFFF' : '#111214'}
                              strokeWidth={1.35}
                            />
                            <rect x={-14} y={-14} width={28} height={3.5} fill={accent} />

                            <g
                              transform="translate(-8, -6.5)"
                              color={isSelected || isHovered || matchesFilter ? '#FFFFFF' : '#111214'}
                            >
                              <ProductIcon iconId={displayProduct.icono_id} size={16} />
                            </g>

                            {item.secundarios.length > 0 &&
                              activeProductId === null &&
                              !showExpandedSecondary && (
                                <g transform="translate(10, -16)">
                                  <rect width={18} height={14} fill="#111214" />
                                  <text
                                    x={9}
                                    y={10.5}
                                    textAnchor="middle"
                                    fontSize="9.5"
                                    fontFamily="Inter, sans-serif"
                                    fontWeight="600"
                                    fill="#FFFFFF"
                                  >
                                    +{item.secundarios.length}
                                  </text>
                                </g>
                              )}

                            {showExpandedSecondary &&
                              item.secundarios.map((sec, sIdx) => (
                                <g
                                  key={sec.producto_id}
                                  transform={`translate(${29 * (sIdx + 1) + 4}, 0)`}
                                >
                                  <rect
                                    x={-12}
                                    y={-12}
                                    width={24}
                                    height={24}
                                    fill="#F7F7F5"
                                    stroke="#111214"
                                    strokeWidth={1.1}
                                  />
                                  <rect
                                    x={-12}
                                    y={-12}
                                    width={24}
                                    height={3}
                                    fill={getCategoryAccent(sec.categoria)}
                                  />
                                  <g transform="translate(-7, -5.5)" color="#111214">
                                    <ProductIcon iconId={sec.icono_id} size={14} />
                                  </g>
                                </g>
                              ))}
                          </g>
                        </g>
                      );
                    })}

                    {/* Marcadores georreferenciados exactos de plantas industriales verificadas */}
                    {plantPins.map(({ planta, x, y }) => {
                      const matchesFilter =
                        activeProductId === null || activeProductId === planta.producto_id;
                      if (!matchesFilter) return null;

                      const isProvSelected = selectedId === planta.provincia_id;
                      const liftY = isProvSelected && is3D ? -11 * invScale : 0;
                      const showLabel = isProvSelected || view.zoom >= 1.5;
                      const capDetalle =
                        planta.capacidad.estado === 'dato'
                          ? `${planta.localidad} · ${planta.capacidad.valor.toLocaleString('es-AR')} ${planta.capacidad.unidad}`
                          : planta.localidad;

                      return (
                        <g
                          key={`planta-${planta.planta_id}`}
                          transform={`translate(${x}, ${y + liftY})`}
                          className="cursor-pointer"
                          onPointerMove={(e) => {
                            e.stopPropagation();
                            handleProvincePointerMove(e, planta.provincia_id, {
                              nombre: planta.nombre,
                              detalle: capDetalle,
                            });
                          }}
                          onPointerLeave={clearHover}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selectedId !== planta.provincia_id) {
                              handleSelectProvincia(planta.provincia_id);
                            }
                          }}
                        >
                          <g transform={`scale(${invScale})`}>
                            <circle r={8} fill="#D93025" fillOpacity={isProvSelected ? 0.25 : 0.16} />
                            <rect
                              x={-4.5}
                              y={-4.5}
                              width={9}
                              height={9}
                              transform="rotate(45)"
                              fill="#D93025"
                              stroke="#F7F7F5"
                              strokeWidth={1.5}
                            />
                            {showLabel && (() => {
                              const labelWidth = Math.max(
                                88,
                                Math.round(planta.localidad.length * 5.6 + 16)
                              );
                              return (
                                <g transform="translate(10, -8)">
                                  <rect
                                    width={labelWidth}
                                    height={17}
                                    fill="#111214"
                                    stroke="#F7F7F5"
                                    strokeWidth={0.75}
                                  />
                                  <text
                                    x={labelWidth / 2}
                                    y={11.5}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontFamily="Inter, sans-serif"
                                    fontWeight="600"
                                    fill="#FFFFFF"
                                  >
                                    {planta.localidad}
                                  </text>
                                </g>
                              );
                            })()}
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Recuadro Bicontinental IGN: se oculta automáticamente al acercar (zoom > 1.3×) para no tapar provincias */}
                  {(() => {
                    const tdfVis = getProvinceVisual('94');
                    const showFullInset = view.zoom <= 1.3 && !is3D;
                    return (
                      <g
                        transform={`translate(${INSET_X}, ${INSET_Y})`}
                        style={{
                          opacity: showFullInset ? 1 : 0,
                          pointerEvents: showFullInset ? 'auto' : 'none',
                          transition: 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                        className="cursor-pointer"
                        onPointerMove={(e) => handleProvincePointerMove(e, '94')}
                        onPointerLeave={clearHover}
                        onClick={() => handleSelectProvincia('94')}
                      >
                        <rect
                          width={INSET_W}
                          height={INSET_H}
                          fill="#E6EBF0"
                          stroke={tdfVis.isSelected ? '#0A42E0' : '#1C1E22'}
                          strokeWidth={tdfVis.isSelected ? 1.8 : 1}
                        />
                        <rect width={INSET_W} height={22} fill="#111214" />
                        <text
                          x={10}
                          y={14.5}
                          fontSize="9.5"
                          fontFamily="Inter, sans-serif"
                          fontWeight="500"
                          fill="#F7F7F5"
                        >
                          Antártida e Islas del Atl. Sur
                        </text>

                        {antartidaIslasGeo.features.map((feat, idx) => (
                          <path
                            key={`ant-${idx}`}
                            d={pathAntartida(feat) ?? ''}
                            fill={tdfVis.fill}
                            stroke={tdfVis.stroke}
                            strokeWidth={0.95}
                            strokeLinejoin="round"
                          />
                        ))}

                        <text
                          x={10}
                          y={INSET_H - 8}
                          fontSize="9"
                          fontFamily="Inter, sans-serif"
                          fill="#52555E"
                        >
                          74°O a 25°O · Ley 26.651 IGN
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>

              {/* Acceso discreto en esquina cuando el recuadro bicontinental está replegado por zoom/3D */}
              {(view.zoom > 1.3 || is3D) && (
                <button
                  type="button"
                  onClick={resetView}
                  className="absolute bottom-3.5 right-3.5 z-20 cursor-pointer border border-rule bg-stone-surface/95 px-3 py-1.5 text-[13px] font-medium text-ink shadow-xs backdrop-blur-xs transition-colors duration-150 hover:bg-ink hover:text-white"
                >
                  Volver a vista 2D completa
                </button>
              )}
            </div>

            {/* Tooltip flotante al hover (desktop) */}
            <AnimatePresence>
              {tooltip && hoveredData && (
                <motion.div
                  key={hoveredData.provincia.provincia_id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    left: Math.min(
                      tooltip.x + 16,
                      (mapViewportRef.current?.clientWidth ?? 480) - 240
                    ),
                    top: Math.max(tooltip.y - 16, 56),
                  }}
                  className="pointer-events-none absolute z-30 hidden w-56 border border-ink bg-ink px-3.5 py-3 text-white shadow-lg sm:block"
                >
                  <p className="text-[13px] font-semibold leading-snug text-white">
                    {tooltip.plantaNombre ?? hoveredData.provincia.nombre}
                  </p>
                  {tooltip.plantaDetalle ? (
                    <p className="mt-1 text-[13px] text-white/80 tabular-nums">
                      {tooltip.plantaDetalle}
                    </p>
                  ) : hoveredData.dominante ? (
                    <div className="mt-1.5 flex items-center gap-2 text-[13px] text-white/80">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
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
                    <p className="mt-1 text-[13px] text-white/65">Sin datos cargados</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Leyenda discreta y clara en la base del mapa */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-stone-surface px-4 py-2.5 text-[13px] text-ink-muted">
              <div className="flex flex-wrap items-center gap-5">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border border-ink bg-[#F8F8F5]" />
                  Con cadenas activas
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border border-rule bg-[#EFEFED]" />
                  Sin datos cargados
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 bg-cobalt" />
                  Seleccionada
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rotate-45 bg-signal-red" />
                  Planta verificada
                </span>
              </div>
              <span className="tabular-nums">Fuente cartográfica: IGN / Georef v2.0</span>
            </div>
          </div>

          {/* Panel lateral territorial */}
          <div className="lg:col-span-5 xl:col-span-4">
            <ProvinceSidePanel
              selected={selectedData}
              allProvincias={provinciasData}
              onSelectProvincia={handleSelectProvincia}
              onZoomToSelected={selectedId ? () => zoomToProvincia(selectedId, 2.3) : undefined}
              esEjemplo={esEjemplo}
              geoManifest={geoManifest}
              categoryAccent={getCategoryAccent}
            />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
