import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule, geoPath, geoStereographic, geoTransverseMercator } from 'd3-geo';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { Box, MapPin, Minus, Move, Plus, RotateCcw } from 'lucide-react';
import type { Departamento, Producto } from '@/schemas';
import type {
  DepartamentosFeatureCollection,
  GeoManifest,
  MapaDepartamentoResumen,
  MapaProvinciaResumen,
  ProvinciasFeatureCollection,
} from '@/data';
import { MapProductTotem3D } from './MapProductTotem3D';
import { ProductIcon } from './ProductIcon';
import { ProvinceSidePanel } from './ProvinceSidePanel';

interface ArgentinaMapExplorerProps {
  continentalGeo: ProvinciasFeatureCollection;
  antartidaIslasGeo: ProvinciasFeatureCollection;
  departamentosGeo: DepartamentosFeatureCollection;
  provinciasData: MapaProvinciaResumen[];
  departamentosData: MapaDepartamentoResumen[];
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
const MAX_ZOOM = 18;

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
      return '#0A42E0';
    case 'mineria_quimica':
      return '#0B7A53';
    case 'fertilizantes':
      return '#0A42E0';
    case 'agroindustria':
      return '#C86A11';
    case 'petroquimica':
      return '#D93025';
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
      return '#7B808A';
  }
}

function getTipoZonaColor(tipo: Departamento['tipo_zona']): string {
  switch (tipo) {
    case 'polo_industrial':
      return '#0A42E0';
    case 'minero':
      return '#0B7A53';
    case 'agro':
      return '#C86A11';
    case 'energetico':
      return '#D93025';
    default:
      return '#111214';
  }
}

const TIPO_ZONA_LABEL: Record<Departamento['tipo_zona'], string> = {
  polo_industrial: 'Polo industrial',
  minero: 'Zona minera',
  agro: 'Núcleo agroindustrial',
  energetico: 'Zona energética',
  mixto: 'Zona mixta',
};

interface TooltipState {
  provinciaId: string;
  departamentoId?: string;
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

type BoundsBox = [[number, number], [number, number]];

interface ScreenRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function rectsOverlap(a: ScreenRect, b: ScreenRect, pad = 6): boolean {
  return !(
    a.x1 + pad < b.x0 ||
    a.x0 - pad > b.x1 ||
    a.y1 + pad < b.y0 ||
    a.y0 - pad > b.y1
  );
}

function clampTransform(next: ViewportTransform): ViewportTransform {
  const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next.zoom));
  const marginX = VIEW_WIDTH * 0.45;
  const marginY = VIEW_HEIGHT * 0.4;
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
  departamentosGeo,
  provinciasData,
  departamentosData,
  productos,
  geoManifest,
  esEjemplo,
}: ArgentinaMapExplorerProps) {
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredDeptId, setHoveredDeptId] = useState<string | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [showAllDeptos, setShowAllDeptos] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

  const deptById = useMemo(
    () => new Map(departamentosData.map((item) => [item.departamento.departamento_id, item])),
    [departamentosData]
  );

  const prodById = useMemo(
    () => new Map(productos.map((p) => [p.producto_id, p])),
    [productos]
  );

  // Proyección Gauss-Krüger / Transverse Mercator + cajas envolventes exactas para auto-fit por provincia y departamento
  const {
    pathContinental,
    pathAntartida,
    graticulePath,
    centroids,
    provBounds,
    deptCentroids,
    deptBounds,
    cabaPoint,
    plantPins,
  } = useMemo(() => {
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
    const pBounds = new Map<string, BoundsBox>();
    for (const feat of continentalGeo.features) {
      const id = feat.properties.id;
      const raw = pCont.centroid(feat);
      if (Number.isFinite(raw[0]) && Number.isFinite(raw[1])) {
        const [dx, dy] = PIN_OFFSETS[id] ?? [0, 0];
        cMap.set(id, [raw[0] + dx, raw[1] + dy]);
      }
      const b = pCont.bounds(feat);
      if (Number.isFinite(b[0][0]) && Number.isFinite(b[1][0])) {
        pBounds.set(id, b as BoundsBox);
      }
    }

    const dMap = new Map<string, [number, number]>();
    const dBounds = new Map<string, BoundsBox>();
    for (const feat of departamentosGeo.features) {
      const id = feat.properties.id;
      const raw = pCont.centroid(feat);
      if (Number.isFinite(raw[0]) && Number.isFinite(raw[1])) {
        dMap.set(id, [raw[0], raw[1]]);
      }
      const b = pCont.bounds(feat);
      if (Number.isFinite(b[0][0]) && Number.isFinite(b[1][0])) {
        dBounds.set(id, b as BoundsBox);
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
      provBounds: pBounds,
      deptCentroids: dMap,
      deptBounds: dBounds,
      cabaPoint: cabaCoord as [number, number],
      plantPins: projectedPlants,
    };
  }, [continentalGeo, antartidaIslasGeo, departamentosGeo, provinciasData]);

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

  useEffect(() => {
    const el = mapViewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const [svgX, svgY] = clientToSvgCoords(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0018);

      setView((prev) => {
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * factor));
        if (Math.abs(nextZoom - prev.zoom) < 0.001) return prev;
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedDeptId(null);
        setSelectedId(null);
        setIs3D(false);
        setView({ zoom: 1, x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Auto-fit cartográfico preciso según el tamaño real de cada provincia o departamento
  const fitBoundsView = useCallback(
    (bounds: BoundsBox | undefined, fallbackPt: [number, number] | undefined, fillRatio: number, minZ: number, maxZ: number) => {
      if (bounds) {
        const bw = Math.max(4, bounds[1][0] - bounds[0][0]);
        const bh = Math.max(4, bounds[1][1] - bounds[0][1]);
        const cx = (bounds[0][0] + bounds[1][0]) / 2;
        const cy = (bounds[0][1] + bounds[1][1]) / 2;
        const rawZ = Math.min((VIEW_WIDTH * fillRatio) / bw, (VIEW_HEIGHT * fillRatio) / bh);
        const z = Math.max(minZ, Math.min(maxZ, rawZ));
        setView(
          clampTransform({
            zoom: z,
            x: VIEW_WIDTH / 2 - cx * z,
            y: VIEW_HEIGHT * 0.52 - cy * z,
          })
        );
        return;
      }
      if (fallbackPt) {
        setView(
          clampTransform({
            zoom: minZ,
            x: VIEW_WIDTH / 2 - fallbackPt[0] * minZ,
            y: VIEW_HEIGHT * 0.52 - fallbackPt[1] * minZ,
          })
        );
      }
    },
    []
  );

  const zoomToProvincia = useCallback(
    (provinciaId: string, boost = 1) => {
      const b = provBounds.get(provinciaId);
      const pt = centroids.get(provinciaId);
      fitBoundsView(b, pt, 0.56 * boost, 2.0 * boost, 5.4 * boost);
    },
    [provBounds, centroids, fitBoundsView]
  );

  const zoomToDepartamento = useCallback(
    (deptId: string, boost = 1) => {
      const b = deptBounds.get(deptId);
      const pt = deptCentroids.get(deptId);
      fitBoundsView(b, pt, 0.42 * boost, 5.2 * boost, 14.5);
    },
    [deptBounds, deptCentroids, fitBoundsView]
  );

  // Selección directa desde URL (?provincia=22&departamento=22105) o buscador Ctrl+K
  useEffect(() => {
    const selectFromExternal = (provId: string | null) => {
      if (!provId || !dataById.has(provId)) return;
      setSelectedDeptId(null);
      setSelectedId(provId);
      if (!userLocked2D) setIs3D(true);
      zoomToProvincia(provId);
    };

    const selectDeptFromExternal = (deptId: string | null) => {
      if (!deptId) return;
      const info = deptById.get(deptId);
      if (!info) return;
      setSelectedId(info.provincia.provincia_id);
      setSelectedDeptId(deptId);
      if (!userLocked2D) setIs3D(true);
      zoomToDepartamento(deptId);
    };

    const params = new URLSearchParams(window.location.search);
    const initialDept = params.get('departamento');
    const initialProv = params.get('provincia');
    if (initialDept) {
      selectDeptFromExternal(initialDept);
    } else if (initialProv) {
      selectFromExternal(initialProv);
    }

    const onExternalSelect = (ev: Event) => {
      const detail = (ev as CustomEvent<{ provinciaId?: string }>).detail;
      if (detail?.provinciaId) selectFromExternal(detail.provinciaId);
    };

    const onExternalDeptSelect = (ev: Event) => {
      const detail = (ev as CustomEvent<{ provinciaId?: string; departamentoId?: string }>).detail;
      if (detail?.departamentoId) selectDeptFromExternal(detail.departamentoId);
    };

    window.addEventListener('atlas:select-provincia', onExternalSelect);
    window.addEventListener('atlas:select-departamento', onExternalDeptSelect);
    return () => {
      window.removeEventListener('atlas:select-provincia', onExternalSelect);
      window.removeEventListener('atlas:select-departamento', onExternalDeptSelect);
    };
  }, [dataById, deptById, userLocked2D, zoomToProvincia, zoomToDepartamento]);

  const resetView = () => {
    setView({ zoom: 1, x: 0, y: 0 });
    setSelectedDeptId(null);
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

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
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
      const scale = rect ? Math.min(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT) : 1;
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
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
  };

  const handleStageDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;

    if (selectedDeptId !== null && selectedId !== null) {
      setSelectedDeptId(null);
      zoomToProvincia(selectedId);
      return;
    }

    if (is3D || selectedId !== null || view.zoom > 1.15) {
      resetView();
      return;
    }

    const [svgX, svgY] = clientToSvgCoords(e.clientX, e.clientY);
    setView((prev) => {
      const nextZoom = Math.min(MAX_ZOOM, prev.zoom * 1.8);
      const mapX = (svgX - prev.x) / prev.zoom;
      const mapY = (svgY - prev.y) / prev.zoom;
      return clampTransform({
        zoom: nextZoom,
        x: svgX - mapX * nextZoom,
        y: svgY - mapY * nextZoom,
      });
    });
  };

  // Drill-down progresivo por click: 1° click -> Provincia | 2° click -> Departamento (zoom profundo + 3D)
  const handleSelectProvincia = (provinciaId: string | null) => {
    if (dragRef.current.moved) return;

    if (provinciaId === null) {
      resetView();
      return;
    }

    // Si estaba en un departamento de esta provincia, un click sobre el resto de la provincia sube al nivel provincial
    if (provinciaId === selectedId && selectedDeptId !== null) {
      setSelectedDeptId(null);
      zoomToProvincia(provinciaId);
      return;
    }

    if (provinciaId === selectedId && selectedDeptId === null) {
      resetView();
      return;
    }

    setSelectedDeptId(null);
    setSelectedId(provinciaId);
    if (!userLocked2D) setIs3D(true);
    zoomToProvincia(provinciaId);
  };

  const handleSelectDepartamento = (deptId: string | null) => {
    if (dragRef.current.moved) return;
    if (deptId === null) {
      setSelectedDeptId(null);
      if (selectedId) zoomToProvincia(selectedId);
      return;
    }
    const info = deptById.get(deptId);
    if (!info) return;
    setSelectedId(info.provincia.provincia_id);
    setSelectedDeptId(deptId);
    if (!userLocked2D) setIs3D(true);
    zoomToDepartamento(deptId);
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
    setHoveredDeptId(null);
    setTooltip({
      provinciaId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      plantaNombre: plantaMeta?.nombre,
      plantaDetalle: plantaMeta?.detalle,
    });
  };

  const handleDeptPointerMove = (
    e: React.PointerEvent,
    deptId: string,
    provinciaId: string
  ) => {
    if (isDragging) return;
    const rect = mapViewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoveredId(provinciaId);
    setHoveredDeptId(deptId);
    setTooltip({
      provinciaId,
      departamentoId: deptId,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const clearHover = () => {
    setHoveredId(null);
    setHoveredDeptId(null);
    setTooltip(null);
  };

  const getProvinceVisual = (provinciaId: string) => {
    const info = dataById.get(provinciaId);
    const isSelected = selectedId === provinciaId;
    const isHovered = hoveredId === provinciaId && hoveredDeptId === null;
    const hasReliableDepts = (info?.departamentosConfiables.length ?? 0) > 0;
    const allProds = info?.dominante ? [info.dominante, ...info.secundarios] : [];

    const matchesFilter =
      activeProductId !== null && allProds.some((p) => p.producto_id === activeProductId);
    const filteredProduct = activeProductId ? (prodById.get(activeProductId) ?? null) : null;

    const activeAccent =
      matchesFilter && filteredProduct
        ? getCategoryAccent(filteredProduct.categoria)
        : info?.dominante
          ? getCategoryAccent(info.dominante.categoria)
          : '#2B2E36';

    let fill = 'url(#stone-sin-datos)';
    let stroke = '#A5ABB5';
    let strokeWidth = 0.85;

    if (info?.dominante) {
      fill = '#F8F8F5';
      stroke = '#1C1E22';
      strokeWidth = 1.05;
    }

    // Atenuar suavemente provincias vecinas cuando hay una provincia enfocada (evita ruido visual al hacer zoom)
    if (selectedId !== null && !isSelected) {
      fill = info?.dominante ? '#EAEAE5' : 'url(#stone-sin-datos)';
      stroke = '#B7BCC6';
      strokeWidth = 0.7;
    }

    if (activeProductId !== null && selectedId === null) {
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
      // Si la provincia tiene departamentos con datos, usamos superficie piedra luminosa
      // con borde cromático fuerte para que sus departamentos resalten con nitidez total!
      fill = hasReliableDepts ? '#F6F5F0' : activeAccent;
      stroke = hasReliableDepts ? activeAccent : '#F7F7F5';
      strokeWidth = 1.9;
    }

    return { fill, stroke, strokeWidth, isSelected, isHovered, matchesFilter, activeAccent };
  };

  const selectedData = selectedId ? (dataById.get(selectedId) ?? null) : null;
  const selectedDeptData = selectedDeptId ? (deptById.get(selectedDeptId) ?? null) : null;
  const hoveredData = tooltip && !isDragging ? (dataById.get(tooltip.provinciaId) ?? null) : null;
  const hoveredDeptData =
    tooltip?.departamentoId && !isDragging ? (deptById.get(tooltip.departamentoId) ?? null) : null;
  const selectedFeature = selectedId
    ? continentalGeo.features.find((f) => f.properties.id === selectedId) ?? null
    : null;
  const selectedDeptFeature = selectedDeptId
    ? departamentosGeo.features.find((f) => f.properties.id === selectedDeptId) ?? null
    : null;

  // Escala constante en píxeles de pantalla (1/zoom): evita que íconos o carteles exploten al acercar a 10x-18x!
  const unitScale = 1 / view.zoom;
  const provLift = 9 * unitScale;
  const deptLift = 7 * unitScale;

  const showDepartamentosLayer = showAllDeptos || view.zoom >= 1.75 || selectedId !== null;

  const visibleDepartamentoFeatures = useMemo(() => {
    if (!showDepartamentosLayer) return [];
    return departamentosGeo.features.filter((feat) => {
      const info = deptById.get(feat.properties.id);
      if (!info) return false;
      if (activeProductId !== null) {
        if (!info.productos.some((p) => p.producto_id === activeProductId)) return false;
      }
      // Si hay una provincia seleccionada (y no se activó "ver todos"), mostrar solo los departamentos de esa provincia!
      if (selectedId !== null && !showAllDeptos) {
        return feat.properties.provincia_id === selectedId;
      }
      return true;
    });
  }, [showDepartamentosLayer, departamentosGeo, deptById, activeProductId, selectedId, showAllDeptos]);

  // Motor determinista de tótems 3D y etiquetas con detección de colisiones 2D en pantalla
  // (Preparado para escalar a 24 provincias y cientos de departamentos/plantas sin superposiciones!)
  const { visibleTotems, approvedLabels } = useMemo(() => {
    const isLocalFocus = selectedDeptId !== null || view.zoom >= 4.0;
    const placed: ScreenRect[] = [];

    const toScreen = (mx: number, my: number): [number, number] => [
      mx * view.zoom + view.x,
      my * view.zoom + view.y,
    ];

    const totems: Array<{
      key: string;
      x: number;
      y: number;
      liftY: number;
      productoId: string;
      categoria: Producto['categoria'];
      isSelected: boolean;
      provinciaId: string;
      deptId: string | null;
      title: string;
      subtitle: string;
    }> = [];

    if (isLocalFocus) {
      // 1) Tótems 3D en plantas georreferenciadas del ámbito enfocado
      for (const { planta, x, y } of plantPins) {
        if (activeProductId !== null && planta.producto_id !== activeProductId) continue;
        if (selectedDeptId !== null && planta.departamento_id !== selectedDeptId) continue;
        if (selectedDeptId === null && selectedId !== null && planta.provincia_id !== selectedId) continue;

        const [sx, sy] = toScreen(x, y);
        if (sx < -40 || sx > VIEW_WIDTH + 40 || sy < -40 || sy > VIEW_HEIGHT + 40) continue;

        const isSelPlanta = selectedDeptId !== null && selectedDeptId === planta.departamento_id;
        const totemRect: ScreenRect = isSelPlanta
          ? { x0: sx - 26, y0: sy - 32, x1: sx + 26, y1: sy + 18 }
          : { x0: sx - 20, y0: sy - 24, x1: sx + 20, y1: sy + 14 };
        if (placed.some((r) => rectsOverlap(r, totemRect, 4))) continue;
        placed.push(totemRect);

        const prod = prodById.get(planta.producto_id);
        if (!prod) continue;
        const parentProvLift = selectedId === planta.provincia_id && is3D ? -provLift : 0;
        const parentDeptLift =
          selectedDeptId && planta.departamento_id === selectedDeptId && is3D ? -deptLift : 0;

        const cleanPlantSubtitle = planta.nombre
          .replace(` (${planta.localidad})`, '')
          .trim();

        totems.push({
          key: `totem-pl-${planta.planta_id}`,
          x,
          y,
          liftY: parentProvLift + parentDeptLift,
          productoId: prod.producto_id,
          categoria: prod.categoria,
          isSelected: isSelPlanta,
          provinciaId: planta.provincia_id,
          deptId: planta.departamento_id ?? null,
          title: planta.localidad,
          subtitle: cleanPlantSubtitle,
        });
      }

      // 2) Tótems 3D en departamentos productivos sin planta puntual (ej. Mayor L. J. Fontana en Chaco)
      for (const feat of visibleDepartamentoFeatures) {
        const deptId = feat.properties.id;
        if (selectedDeptId !== null && deptId !== selectedDeptId) continue;
        const info = deptById.get(deptId);
        if (!info || info.plantas.length > 0 || info.productos.length === 0) continue;
        const pt = deptCentroids.get(deptId);
        if (!pt) continue;

        const [sx, sy] = toScreen(pt[0], pt[1]);
        if (sx < -40 || sx > VIEW_WIDTH + 40 || sy < -40 || sy > VIEW_HEIGHT + 40) continue;

        const isSelDept = selectedDeptId === deptId;
        const totemRect: ScreenRect = isSelDept
          ? { x0: sx - 26, y0: sy - 32, x1: sx + 26, y1: sy + 18 }
          : { x0: sx - 20, y0: sy - 24, x1: sx + 20, y1: sy + 14 };
        if (placed.some((r) => rectsOverlap(r, totemRect, 4))) continue;
        placed.push(totemRect);

        const prod = info.productos[0]!;
        const parentProvLift = selectedId === info.provincia.provincia_id && is3D ? -provLift : 0;
        const ownDeptLift = isSelDept && is3D ? -deptLift : 0;

        totems.push({
          key: `totem-dept-${deptId}`,
          x: pt[0],
          y: pt[1],
          liftY: parentProvLift + ownDeptLift,
          productoId: prod.producto_id,
          categoria: prod.categoria,
          isSelected: isSelDept,
          provinciaId: info.provincia.provincia_id,
          deptId,
          title: info.departamento.nombre,
          subtitle: TIPO_ZONA_LABEL[info.departamento.tipo_zona],
        });
      }
    }

    // Candidatos de etiquetas ordenados por prioridad jerárquica
    interface LabelCandidate {
      key: string;
      priority: number;
      x: number;
      y: number;
      liftY: number;
      offsetYScreen: number;
      text: string;
      subtext?: string;
      variant: 'selected-dept' | 'dept' | 'plant';
    }

    const candidates: LabelCandidate[] = [];

    // Etiquetas de tótems activos (cuando hay foco local)
    for (const t of totems) {
      candidates.push({
        key: `lbl-${t.key}`,
        priority: t.isSelected ? 100 : 80,
        x: t.x,
        y: t.y,
        liftY: t.liftY,
        offsetYScreen: t.isSelected ? -44 : -34,
        text: t.title,
        subtext: view.zoom >= 5.2 ? t.subtitle : undefined,
        variant: t.isSelected ? 'selected-dept' : 'plant',
      });
    }

    // Etiquetas de departamentos visibles (en nivel provincial o zoom intermedio)
    if (selectedId !== null || view.zoom >= 2.2) {
      for (const feat of visibleDepartamentoFeatures) {
        const deptId = feat.properties.id;
        const info = deptById.get(deptId);
        const pt = deptCentroids.get(deptId);
        if (!info || !pt) continue;
        // Si ya tiene tótem en este departamento, el tótem ya aporta su etiqueta limpia
        if (totems.some((t) => t.deptId === deptId)) continue;

        const isSel = selectedDeptId === deptId;
        const isHov = hoveredDeptId === deptId;
        if (selectedDeptId !== null && !isSel && !isHov && view.zoom < 5.5) continue;

        const parentProvLift = selectedId === info.provincia.provincia_id && is3D ? -provLift : 0;
        const ownDeptLift = isSel && is3D ? -deptLift : 0;

        candidates.push({
          key: `lbl-dept-${deptId}`,
          priority: isSel ? 95 : isHov ? 90 : info.plantas.length > 0 ? 68 : 60,
          x: pt[0],
          y: pt[1],
          liftY: parentProvLift + ownDeptLift,
          offsetYScreen: isSel ? -16 : 0,
          text: info.departamento.nombre,
          variant: isSel ? 'selected-dept' : 'dept',
        });
      }
    }

    candidates.sort((a, b) => b.priority - a.priority);

    const finalLabels: Array<LabelCandidate & { width: number; height: number }> = [];
    for (const c of candidates) {
      const [sx, sy] = toScreen(c.x, c.y + c.liftY);
      if (sx < 24 || sx > VIEW_WIDTH - 24 || sy < 36 || sy > VIEW_HEIGHT - 20) continue;

      const textLen = Math.max(c.text.length, c.subtext ? Math.min(38, c.subtext.length) * 0.84 : 0);
      const w = Math.round(Math.max(68, textLen * 6.3 + 18));
      const h = c.subtext ? 28 : 18;

      // Posicionamiento multi-ancla determinista: si el centro colisiona con un vecino cercano,
      // prueba desplazamiento superior o inferior antes de descartar la etiqueta
      const candidateOffsets =
        c.variant === 'dept'
          ? [c.offsetYScreen, c.offsetYScreen - 20, c.offsetYScreen + 20]
          : [c.offsetYScreen];

      for (const tryOffsetY of candidateOffsets) {
        const cy = sy + tryOffsetY;
        const rect: ScreenRect = {
          x0: sx - w / 2,
          y0: cy - h / 2,
          x1: sx + w / 2,
          y1: cy + h / 2,
        };
        if (!placed.some((r) => rectsOverlap(r, rect, 5))) {
          placed.push(rect);
          finalLabels.push({ ...c, offsetYScreen: tryOffsetY, width: w, height: h });
          break;
        }
      }
    }

    return { visibleTotems: totems, approvedLabels: finalLabels };
  }, [
    selectedDeptId,
    selectedId,
    hoveredDeptId,
    view.zoom,
    view.x,
    view.y,
    plantPins,
    activeProductId,
    prodById,
    is3D,
    provLift,
    deptLift,
    visibleDepartamentoFeatures,
    deptById,
    deptCentroids,
  ]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="border border-rule bg-stone-surface shadow-[0_24px_64px_-28px_rgba(17,18,20,0.28)]">
        {/* Cabecera integrada de la hoja del mapa */}
        <div className="flex flex-col gap-4 border-b border-rule px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-[24px] font-bold leading-none tracking-[-0.025em] text-ink sm:text-[28px]">
                Mapa productivo
              </h2>
              <span className="text-[13px] text-ink-muted tabular-nums">
                {productos.length} cadenas · 24 jurisdicciones · {departamentosData.length}{' '}
                departamentos con datos
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={showAllDeptos}
                onClick={() => setShowAllDeptos((prev) => !prev)}
                className={`inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  showAllDeptos
                    ? 'border-ink bg-ink text-white'
                    : 'border-rule bg-stone-bg text-ink hover:border-ink'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Deptos ({departamentosData.length})</span>
              </button>

              <div
                role="group"
                aria-label="Perspectiva cartográfica"
                className="flex border border-rule bg-stone-bg p-0.5 text-[13px]"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIs3D(false);
                    setUserLocked2D(true);
                  }}
                  aria-pressed={!is3D}
                  className={`cursor-pointer px-2.5 py-1 font-medium transition-colors duration-150 ${
                    !is3D ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
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
                  className={`inline-flex cursor-pointer items-center gap-1 px-2.5 py-1 font-medium transition-colors duration-150 ${
                    is3D ? 'bg-cobalt text-white' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <Box className="h-3.5 w-3.5" />
                  3D
                </button>
              </div>

              <div className="flex border border-rule bg-stone-surface">
                <button
                  type="button"
                  onClick={() => handleStepZoom(1.5)}
                  aria-label="Acercar mapa"
                  className="cursor-pointer border-r border-rule px-2.5 py-1.5 text-ink transition-colors duration-150 hover:bg-ink hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepZoom(1 / 1.5)}
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
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
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
                className={`relative shrink-0 cursor-pointer px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  activeProductId === null ? 'text-white' : 'text-ink-muted hover:text-ink'
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
                    className={`relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                      isActive ? 'text-white' : 'text-ink-muted hover:text-ink'
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
              <span>1° click provincia · 2° click departamento (zoom + modelo 3D)</span>
            </p>
          </div>
        </div>

        {/* Espacio principal widescreen: Mapa + Panel lateral */}
        <div className="grid lg:grid-cols-12 lg:items-stretch">
          <div
            ref={mapViewportRef}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={handleStageDoubleClick}
            className={`relative overflow-hidden bg-sea-basin select-none lg:col-span-7 lg:border-r lg:border-rule xl:col-span-8 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ touchAction: 'none' }}
          >
            {/* Breadcrumb cartográfico vivo arriba a la izquierda */}
            <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap items-center gap-x-2 border border-rule/80 bg-stone-surface/92 px-3 py-1.5 text-[13px] text-ink-muted backdrop-blur-xs">
              <span className="font-medium text-ink">
                {selectedDeptData
                  ? `${selectedDeptData.provincia.nombre} · ${selectedDeptData.departamento.nombre}`
                  : selectedData
                    ? selectedData.provincia.nombre
                    : 'República Argentina'}
              </span>
              <span className="text-rule-strong/30">/</span>
              <span className="tabular-nums">{view.zoom.toFixed(1)}×</span>
              {selectedDeptData && (
                <>
                  <span className="text-rule-strong/30">·</span>
                  <span className="font-medium text-cobalt">
                    {TIPO_ZONA_LABEL[selectedDeptData.departamento.tipo_zona]}
                  </span>
                </>
              )}
            </div>

            <div className="map-stage-3d relative flex h-[540px] items-center justify-center overflow-hidden sm:h-[640px] lg:h-[720px]">
              <div className={`map-plane h-full w-full ${is3D ? 'map-plane-tilted' : ''}`}>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                  role="img"
                  aria-label="Mapa interactivo bicontinental de provincias y departamentos argentinos con cadenas productivas"
                  className="h-full w-full"
                  onPointerLeave={clearHover}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !dragRef.current.moved && selectedId) {
                      resetView();
                    }
                  }}
                >
                  <defs>
                    <pattern
                      id="stone-sin-datos"
                      width="7"
                      height="7"
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width="7" height="7" fill="#EFEFED" />
                      <path d="M0 7L7 0" stroke="#D5D7DC" strokeWidth="0.7" />
                    </pattern>

                    <filter id="land-shadow" x="-8%" y="-8%" width="120%" height="120%">
                      <feDropShadow
                        dx="0"
                        dy="4"
                        stdDeviation="4"
                        floodColor="#111214"
                        floodOpacity="0.1"
                      />
                    </filter>

                    <filter id="extrude-shadow" x="-20%" y="-20%" width="150%" height="150%">
                      <feDropShadow
                        dx="2"
                        dy="8"
                        stdDeviation="4"
                        floodColor="#090B10"
                        floodOpacity="0.3"
                      />
                    </filter>
                  </defs>

                  <g
                    style={{
                      transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                      transformOrigin: '0px 0px',
                      transition: isDragging
                        ? 'none'
                        : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  >
                    <path
                      d={graticulePath}
                      fill="none"
                      stroke="rgba(17, 18, 20, 0.07)"
                      strokeWidth={0.7 * unitScale}
                    />

                    {/* 1. Base continental de las 24 jurisdicciones */}
                    <g filter="url(#land-shadow)">
                      {continentalGeo.features.map((feat) => {
                        const id = feat.properties.id;
                        if (selectedId === id && is3D) {
                          return (
                            <path
                              key={`${id}-socket`}
                              d={pathContinental(feat) ?? ''}
                              fill="#C6CCD4"
                              stroke="#8C939E"
                              strokeWidth={0.8 * unitScale}
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
                            strokeWidth={visual.strokeWidth * unitScale}
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

                    {/* 2. Extrusión 3D de la provincia seleccionada */}
                    {selectedFeature && selectedId && is3D && (() => {
                      const d = pathContinental(selectedFeature) ?? '';
                      const visual = getProvinceVisual(selectedId);
                      const sideColor = getExtrusionSideColor(visual.activeAccent);
                      const steps = [4, 3, 2, 1];

                      return (
                        <g
                          key={`extrude-prov-${selectedId}`}
                          className="cursor-pointer"
                          onPointerMove={(e) => handleProvincePointerMove(e, selectedId)}
                          onPointerLeave={clearHover}
                          onClick={() => handleSelectProvincia(selectedId)}
                        >
                          <path
                            d={d}
                            fill={sideColor}
                            opacity="0.28"
                            filter="url(#extrude-shadow)"
                          />
                          {steps.map((step) => {
                            const dy = -provLift + (step / steps.length) * provLift;
                            const dx = (step / steps.length) * 1.8 * unitScale;
                            return (
                              <path
                                key={step}
                                d={d}
                                transform={`translate(${dx}, ${dy})`}
                                fill={sideColor}
                                stroke={sideColor}
                                strokeWidth={0.8 * unitScale}
                                strokeLinejoin="round"
                              />
                            );
                          })}
                          <path
                            d={d}
                            transform={`translate(0, ${-provLift})`}
                            fill={visual.fill}
                            stroke={visual.stroke}
                            strokeWidth={2.0 * unitScale}
                            strokeLinejoin="round"
                          />
                        </g>
                      );
                    })()}

                    {/* 3. Polígonos departamentales no seleccionados (claros y nítidos sobre la piedra provincial) */}
                    {visibleDepartamentoFeatures.length > 0 && (
                      <g aria-label="Departamentos con datos productivos confiables">
                        {visibleDepartamentoFeatures.map((feat) => {
                          const deptId = feat.properties.id;
                          if (deptId === selectedDeptId) return null;

                          const provId = feat.properties.provincia_id;
                          const info = deptById.get(deptId);
                          if (!info) return null;

                          const d = pathContinental(feat) ?? '';
                          const isDeptHovered = hoveredDeptId === deptId;
                          const isParentLifted = selectedId === provId && is3D;
                          const liftY = isParentLifted ? -provLift : 0;
                          const zonaColor = getTipoZonaColor(info.departamento.tipo_zona);

                          return (
                            <g
                              key={`dept-${deptId}`}
                              transform={liftY !== 0 ? `translate(0, ${liftY})` : undefined}
                              className="cursor-pointer"
                              role="button"
                              tabIndex={0}
                              aria-label={`Departamento ${info.departamento.nombre}, ${info.provincia.nombre} (Georef ${deptId})`}
                              onPointerMove={(e) => {
                                e.stopPropagation();
                                handleDeptPointerMove(e, deptId, provId);
                              }}
                              onPointerLeave={clearHover}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDepartamento(deptId);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleSelectDepartamento(deptId);
                                }
                              }}
                            >
                              <path
                                d={d}
                                fill={zonaColor}
                                fillOpacity={isDeptHovered ? 0.58 : 0.28}
                                stroke={isDeptHovered ? '#111214' : zonaColor}
                                strokeWidth={(isDeptHovered ? 1.8 : 1.25) * unitScale}
                                strokeLinejoin="round"
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* 4. Extrusión 3D propia del Departamento Seleccionado (escalón elevado sobre la provincia!) */}
                    {selectedDeptFeature && selectedDeptData && (() => {
                      const d = pathContinental(selectedDeptFeature) ?? '';
                      const zonaColor = getTipoZonaColor(selectedDeptData.departamento.tipo_zona);
                      const sideColor = getExtrusionSideColor(zonaColor);
                      const baseLift = selectedId === selectedDeptData.provincia.provincia_id && is3D ? -provLift : 0;
                      const ownLift = is3D ? deptLift : 0;
                      const steps = [4, 3, 2, 1];

                      return (
                        <g
                          key={`extrude-dept-${selectedDeptData.departamento.departamento_id}`}
                          transform={baseLift !== 0 ? `translate(0, ${baseLift})` : undefined}
                          className="cursor-pointer"
                          onPointerMove={(e) => {
                            e.stopPropagation();
                            handleDeptPointerMove(
                              e,
                              selectedDeptData.departamento.departamento_id,
                              selectedDeptData.provincia.provincia_id
                            );
                          }}
                          onPointerLeave={clearHover}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectDepartamento(null);
                          }}
                        >
                          {is3D &&
                            steps.map((step) => {
                              const dy = -ownLift + (step / steps.length) * ownLift;
                              const dx = (step / steps.length) * 1.4 * unitScale;
                              return (
                                <path
                                  key={step}
                                  d={d}
                                  transform={`translate(${dx}, ${dy})`}
                                  fill={sideColor}
                                  stroke={sideColor}
                                  strokeWidth={0.9 * unitScale}
                                  strokeLinejoin="round"
                                />
                              );
                            })}
                          <path
                            d={d}
                            transform={ownLift !== 0 ? `translate(0, ${-ownLift})` : undefined}
                            fill={zonaColor}
                            fillOpacity={0.82}
                            stroke="#FFFFFF"
                            strokeWidth={2.2 * unitScale}
                            strokeLinejoin="round"
                          />
                        </g>
                      );
                    })()}

                    {/* 5. Callout de CABA (solo en vista nacional / sin foco en otra provincia) */}
                    {(selectedId === null || selectedId === '02') && view.zoom < 3.2 && (() => {
                      const cabaVis = getProvinceVisual('02');
                      const boxX = cabaPoint[0] + 44 * unitScale;
                      const boxY = cabaPoint[1] - 11 * unitScale;
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
                            y2={boxY + 11 * unitScale}
                            stroke="#111214"
                            strokeWidth={0.9 * unitScale}
                            strokeDasharray={`${2.5 * unitScale} ${2.5 * unitScale}`}
                          />
                          <circle
                            cx={cabaPoint[0]}
                            cy={cabaPoint[1]}
                            r={3 * unitScale}
                            fill={cabaVis.isSelected ? '#0A42E0' : '#111214'}
                          />
                          <g transform={`translate(${boxX}, ${boxY}) scale(${unitScale})`}>
                            <rect
                              width={56}
                              height={21}
                              fill={cabaVis.isSelected ? '#111214' : '#F7F7F5'}
                              stroke="#111214"
                              strokeWidth={1}
                            />
                            <text
                              x={28}
                              y={14}
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

                    {/* 6. Pines provinciales (solo en nivel nacional; se ocultan dentro de la provincia enfocada para no tapar sus departamentos!) */}
                    {view.zoom < 4.0 &&
                      selectedDeptId === null &&
                      provinciasData.map((item) => {
                        const id = item.provincia.provincia_id;
                        if (!item.dominante) return null;
                        // Si la provincia está seleccionada y tiene departamentos, liberar su interior para ver los departamentos limpios
                        if (selectedId === id && item.departamentosConfiables.length > 0) return null;
                        // Si hay otra provincia seleccionada, atenuar/ocultar pines lejanos para evitar ruido
                        if (selectedId !== null && selectedId !== id) return null;

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
                        const liftOffset = isSelected && is3D ? -provLift : 0;

                        return (
                          <g
                            key={`pin-${id}`}
                            transform={`translate(${pos[0]}, ${pos[1] + liftOffset}) scale(${unitScale})`}
                            className="cursor-pointer"
                            onPointerMove={(e) => handleProvincePointerMove(e, id)}
                            onPointerLeave={clearHover}
                            onClick={() => handleSelectProvincia(id)}
                          >
                            <rect
                              x={-13}
                              y={-13}
                              width={26}
                              height={26}
                              fill={isSelected || isHovered || matchesFilter ? '#111214' : '#F7F7F5'}
                              stroke={isSelected ? '#FFFFFF' : '#111214'}
                              strokeWidth={1.25}
                            />
                            <rect x={-13} y={-13} width={26} height={3.2} fill={accent} />
                            <g
                              transform="translate(-7.5, -5.5)"
                              color={isSelected || isHovered || matchesFilter ? '#FFFFFF' : '#111214'}
                            >
                              <ProductIcon iconId={displayProduct.icono_id} size={15} />
                            </g>
                            {item.secundarios.length > 0 && activeProductId === null && (
                              <g transform="translate(9, -15)">
                                <rect width={17} height={13} fill="#111214" />
                                <text
                                  x={8.5}
                                  y={9.8}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontFamily="Inter, sans-serif"
                                  fontWeight="600"
                                  fill="#FFFFFF"
                                >
                                  +{item.secundarios.length}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                    {/* 7. Puntos discretos de plantas cuando NO hay foco local 3D (sin carteles gigantes!) */}
                    {plantPins.map(({ planta, x, y }) => {
                      if (activeProductId !== null && activeProductId !== planta.producto_id) {
                        return null;
                      }
                      // Si ya se está renderizando un tótem 3D en esta planta, no duplicar el rombo
                      if (visibleTotems.some((t) => t.key === `totem-pl-${planta.planta_id}`)) {
                        return null;
                      }
                      // Si hay un departamento enfocado, ocultar plantas fuera de ese departamento
                      if (selectedDeptId !== null && planta.departamento_id !== selectedDeptId) {
                        return null;
                      }

                      const isProvSelected = selectedId === planta.provincia_id;
                      const liftY = isProvSelected && is3D ? -provLift : 0;
                      const capDetalle =
                        planta.capacidad.estado === 'dato'
                          ? `${planta.localidad} · ${planta.capacidad.valor.toLocaleString('es-AR')} ${planta.capacidad.unidad}`
                          : planta.localidad;

                      return (
                        <g
                          key={`planta-dot-${planta.planta_id}`}
                          transform={`translate(${x}, ${y + liftY}) scale(${unitScale})`}
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
                            if (planta.departamento_id) {
                              handleSelectDepartamento(planta.departamento_id);
                            } else {
                              handleSelectProvincia(planta.provincia_id);
                            }
                          }}
                        >
                          <circle
                            r={isProvSelected ? 7.5 : 5.5}
                            fill="#D93025"
                            fillOpacity={isProvSelected ? 0.24 : 0.14}
                          />
                          <rect
                            x={-3.8}
                            y={-3.8}
                            width={7.6}
                            height={7.6}
                            transform="rotate(45)"
                            fill="#D93025"
                            stroke="#F7F7F5"
                            strokeWidth={1.3}
                          />
                        </g>
                      );
                    })}

                    {/* 8. Tótems isométricos 3D por actividad productiva (en zoom departamental / local) */}
                    {visibleTotems.map((totem) => (
                      <g
                        key={totem.key}
                        transform={`translate(${totem.x}, ${totem.y + totem.liftY}) scale(${unitScale * (totem.isSelected ? 1.32 : 1)})`}
                        className="cursor-pointer"
                        onPointerMove={(e) => {
                          e.stopPropagation();
                          if (totem.deptId) {
                            handleDeptPointerMove(e, totem.deptId, totem.provinciaId);
                          } else {
                            handleProvincePointerMove(e, totem.provinciaId, {
                              nombre: totem.title,
                              detalle: totem.subtitle,
                            });
                          }
                        }}
                        onPointerLeave={clearHover}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (totem.deptId) {
                            handleSelectDepartamento(totem.deptId);
                          } else {
                            handleSelectProvincia(totem.provinciaId);
                          }
                        }}
                      >
                        <MapProductTotem3D
                          productoId={totem.productoId}
                          categoria={totem.categoria}
                          isSelected={totem.isSelected}
                        />
                      </g>
                    ))}

                    {/* 9. Capa única de etiquetas sin colisiones (tamaño constante en pantalla) */}
                    {approvedLabels.map((lbl) => {
                      const isPrimary = lbl.variant === 'selected-dept';
                      return (
                        <g
                          key={lbl.key}
                          transform={`translate(${lbl.x}, ${lbl.y + lbl.liftY}) scale(${unitScale})`}
                          className="pointer-events-none"
                        >
                          <g transform={`translate(0, ${lbl.offsetYScreen})`}>
                            <rect
                              x={-lbl.width / 2}
                              y={-lbl.height / 2}
                              width={lbl.width}
                              height={lbl.height}
                              fill={isPrimary ? '#111214' : '#F7F7F5'}
                              fillOpacity={0.96}
                              stroke={isPrimary ? '#FFFFFF' : '#111214'}
                              strokeWidth={isPrimary ? 1.2 : 0.9}
                            />
                            {isPrimary && (
                              <rect
                                x={-lbl.width / 2}
                                y={-lbl.height / 2}
                                width={lbl.width}
                                height={2.5}
                                fill="#0A42E0"
                              />
                            )}
                            <text
                              x={0}
                              y={lbl.subtext ? -1.5 : 3.5}
                              textAnchor="middle"
                              fontSize="10.5"
                              fontFamily="Inter, sans-serif"
                              fontWeight="600"
                              fill={isPrimary ? '#FFFFFF' : '#111214'}
                            >
                              {lbl.text}
                            </text>
                            {lbl.subtext && (
                              <text
                                x={0}
                                y={10}
                                textAnchor="middle"
                                fontSize="8.8"
                                fontFamily="Inter, sans-serif"
                                fill={isPrimary ? '#D5D8E0' : '#52555E'}
                              >
                                {lbl.subtext.length > 38
                                  ? `${lbl.subtext.slice(0, 37)}…`
                                  : lbl.subtext}
                              </text>
                            )}
                          </g>
                        </g>
                      );
                    })}
                  </g>

                  {/* Recuadro Bicontinental IGN (solo en vista general) */}
                  {(() => {
                    const tdfVis = getProvinceVisual('94');
                    const showFullInset = view.zoom <= 1.3 && !is3D && selectedId === null;
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

              {/* Botones contextuales de retorno por nivel (Departamento -> Provincia -> País) */}
              {(view.zoom > 1.25 || is3D || selectedId !== null) && (
                <div className="absolute bottom-3.5 right-3.5 z-20 flex items-center gap-2">
                  {selectedDeptId && selectedData && (
                    <button
                      type="button"
                      onClick={() => handleSelectDepartamento(null)}
                      className="cursor-pointer border border-rule bg-stone-surface/95 px-3 py-1.5 text-[13px] font-medium text-ink shadow-xs backdrop-blur-xs transition-colors duration-150 hover:bg-ink hover:text-white"
                    >
                      ← Nivel {selectedData.provincia.nombre}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetView}
                    className="cursor-pointer border border-rule bg-ink px-3 py-1.5 text-[13px] font-medium text-white shadow-xs transition-colors duration-150 hover:bg-cobalt"
                  >
                    País completo
                  </button>
                </div>
              )}
            </div>

            {/* Tooltip flotante al hover (desktop) */}
            <AnimatePresence>
              {tooltip && hoveredData && (
                <motion.div
                  key={`${hoveredData.provincia.provincia_id}-${tooltip.departamentoId ?? 'prov'}`}
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
                    {tooltip.plantaNombre ??
                      (hoveredDeptData
                        ? `${hoveredDeptData.departamento.nombre} (${hoveredDeptData.provincia.nombre})`
                        : hoveredData.provincia.nombre)}
                  </p>
                  {tooltip.plantaDetalle ? (
                    <p className="mt-1 text-[13px] text-white/80 tabular-nums">
                      {tooltip.plantaDetalle}
                    </p>
                  ) : hoveredDeptData ? (
                    <div className="mt-1.5 space-y-1 text-[13px] text-white/80">
                      <p className="font-medium text-white/95">
                        {TIPO_ZONA_LABEL[hoveredDeptData.departamento.tipo_zona]} · Georef{' '}
                        {hoveredDeptData.departamento.departamento_id}
                      </p>
                      <p className="truncate text-white/75">
                        Click para acercar y ver modelo 3D
                      </p>
                    </div>
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

            {/* Leyenda en la base del mapa */}
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
                  <span className="inline-block h-3 w-3 border border-cobalt bg-cobalt/35" />
                  Depto con datos ({departamentosData.length})
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rotate-45 bg-signal-red" />
                  Planta / modelo 3D al acercar
                </span>
              </div>
              <span className="tabular-nums">Fuente cartográfica: IGN / Georef v2.0</span>
            </div>
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <ProvinceSidePanel
              selected={selectedData}
              selectedDepartamento={selectedDeptData}
              allProvincias={provinciasData}
              onSelectProvincia={handleSelectProvincia}
              onSelectDepartamento={handleSelectDepartamento}
              onZoomToSelected={selectedId ? () => zoomToProvincia(selectedId, 1.25) : undefined}
              onZoomToDepartamento={
                selectedDeptId ? () => zoomToDepartamento(selectedDeptId, 1.35) : undefined
              }
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
