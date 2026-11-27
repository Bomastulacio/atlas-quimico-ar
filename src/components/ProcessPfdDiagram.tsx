import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Camera,
  ExternalLink,
  Flame,
  Gauge,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Fuente, PfdCorriente, PfdEquipo, PfdLimiteBateria, PfdProceso } from '@/schemas';
import { PfdEquipmentSymbol } from './pfd/PfdEquipmentSymbol';

interface ProcessPfdDiagramProps {
  pfd: PfdProceso;
  fuentesMap: Record<string, Fuente>;
}

type SelectionState =
  | { kind: 'equipo'; tag: string }
  | { kind: 'corriente'; numero: number };

type StreamFilter = 'todas' | 'proceso' | 'reciclo' | 'subproducto';

const STREAM_STYLE: Record<
  PfdCorriente['tipo'],
  { label: string; color: string; dashed: boolean; width: number }
> = {
  proceso: { label: 'Proceso principal', color: '#111214', dashed: false, width: 2.2 },
  reciclo: { label: 'Reciclo cerrado', color: '#0B7A53', dashed: true, width: 2.2 },
  subproducto: { label: 'Subproducto / condensado', color: '#C86A11', dashed: false, width: 1.8 },
  emision: { label: 'Emisión / gases', color: '#D93025', dashed: true, width: 1.8 },
};

const LIMITE_ACCENT: Record<PfdLimiteBateria['categoria'], string> = {
  materia_prima: '#0A42E0',
  servicio: '#52555E',
  producto: '#0B7A53',
  subproducto: '#C86A11',
  emision: '#D93025',
};

function pointsToPolyline(points: Array<[number, number]>): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function formatFlujo(flujo: PfdCorriente['flujo_especifico']): string {
  if (flujo.estado === 'sin_datos') return 's/d';
  return `${flujo.valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} ${flujo.unidad}`;
}

/** Divide títulos de equipos en máximo 2 líneas limpias (~18 chars) para evitar cualquier superposición */
function wrapSvgLines(text: string, maxChars = 19): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= 2) return lines;
  return [lines[0]!, lines.slice(1).join(' ')];
}

export function ProcessPfdDiagram({ pfd, fuentesMap }: ProcessPfdDiagramProps) {
  const defaultEquipmentTag = pfd.equipos[0]?.tag ?? '';
  const [selection, setSelection] = useState<SelectionState>({
    kind: 'equipo',
    tag: defaultEquipmentTag,
  });
  const [hoveredStream, setHoveredStream] = useState<number | null>(null);
  const [showUtilities, setShowUtilities] = useState(true);
  const [showCritFlags, setShowCritFlags] = useState(true);
  const [streamFilter, setStreamFilter] = useState<StreamFilter>('todas');
  const [expanded, setExpanded] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [wheelZoomEnabled, setWheelZoomEnabled] = useState(false);
  const [showWheelHint, setShowWheelHint] = useState(false);
  const wheelHintTimerRef = useRef<number | null>(null);
  const showWheelHintRef = useRef(false);
  showWheelHintRef.current = showWheelHint;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  viewRef.current = { zoom, pan };

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const svgRef = useRef<SVGSVGElement | null>(null);

  const equipoMap = useMemo(
    () => new Map(pfd.equipos.map((e) => [e.tag, e])),
    [pfd.equipos]
  );

  const corrienteMap = useMemo(
    () => new Map(pfd.corrientes.map((c) => [c.numero, c])),
    [pfd.corrientes]
  );

  const entradasBateria = useMemo(
    () => pfd.limites_bateria.filter((l) => l.lado === 'entrada'),
    [pfd.limites_bateria]
  );
  const salidasBateria = useMemo(
    () => pfd.limites_bateria.filter((l) => l.lado === 'salida'),
    [pfd.limites_bateria]
  );

  const selectedEquipo: PfdEquipo | null =
    selection.kind === 'equipo' ? (equipoMap.get(selection.tag) ?? null) : null;
  const selectedCorriente: PfdCorriente | null =
    selection.kind === 'corriente'
      ? (corrienteMap.get(selection.numero) ?? null)
      : null;

  const connectedStreamNums = useMemo(() => {
    const nums = new Set<number>();
    if (selection.kind === 'corriente') {
      nums.add(selection.numero);
    } else if (selection.kind === 'equipo') {
      for (const c of pfd.corrientes) {
        if (c.origen_tag === selection.tag || c.destino_tag === selection.tag) {
          nums.add(c.numero);
        }
      }
    }
    if (hoveredStream !== null) nums.add(hoveredStream);
    return nums;
  }, [selection, hoveredStream, pfd.corrientes]);

  const connectedEquipmentTags = useMemo(() => {
    const tags = new Set<string>();
    if (selection.kind === 'equipo') {
      tags.add(selection.tag);
    } else if (selectedCorriente) {
      if (selectedCorriente.origen_tag) tags.add(selectedCorriente.origen_tag);
      if (selectedCorriente.destino_tag) tags.add(selectedCorriente.destino_tag);
    }
    return tags;
  }, [selection, selectedCorriente]);

  const filteredStreams = useMemo(() => {
    if (streamFilter === 'todas') return pfd.corrientes;
    if (streamFilter === 'subproducto') {
      return pfd.corrientes.filter((c) => c.tipo === 'subproducto' || c.tipo === 'emision');
    }
    return pfd.corrientes.filter((c) => c.tipo === streamFilter);
  }, [pfd.corrientes, streamFilter]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Zoom suave anclado al cursor (estilo CAD/Figma) con Ctrl+rueda o en modo "Rueda libre"
  const applyWheelZoom = useCallback(
    (clientX: number, clientY: number, deltaY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const { zoom: curZoom, pan: curPan } = viewRef.current;
      const factor = Math.exp(-deltaY * 0.0014);
      const nextZoom = Math.max(0.85, Math.min(3.2, Number((curZoom * factor).toFixed(3))));
      if (nextZoom === curZoom) return;

      const curVbW = pfd.canvas_width / curZoom;
      const curVbH = pfd.canvas_height / curZoom;
      const curVbX = (pfd.canvas_width - curVbW) / 2 - curPan.x;
      const curVbY = (pfd.canvas_height - curVbH) / 2 - curPan.y;

      const scale = Math.min(rect.width / curVbW, rect.height / curVbH);
      const renderedW = curVbW * scale;
      const renderedH = curVbH * scale;
      const offsetX = (rect.width - renderedW) / 2;
      const offsetY = (rect.height - renderedH) / 2;

      const fracX = Math.max(0, Math.min(1, (clientX - rect.left - offsetX) / renderedW));
      const fracY = Math.max(0, Math.min(1, (clientY - rect.top - offsetY) / renderedH));

      const worldX = curVbX + fracX * curVbW;
      const worldY = curVbY + fracY * curVbH;

      const nextVbW = pfd.canvas_width / nextZoom;
      const nextVbH = pfd.canvas_height / nextZoom;
      const rawPanX = (pfd.canvas_width - nextVbW) / 2 - (worldX - fracX * nextVbW);
      const rawPanY = (pfd.canvas_height - nextVbH) / 2 - (worldY - fracY * nextVbH);

      setZoom(nextZoom);
      setPan({
        x: Math.max(-640, Math.min(640, rawPanX)),
        y: Math.max(-340, Math.min(340, rawPanY)),
      });
    },
    [pfd.canvas_width, pfd.canvas_height]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || wheelZoomEnabled) {
        e.preventDefault();
        applyWheelZoom(e.clientX, e.clientY, e.deltaY);
        if (showWheelHintRef.current) setShowWheelHint(false);
        return;
      }

      // Aviso discreto y no invasivo la primera vez que se scrollea sobre el plano
      setShowWheelHint(true);
      if (wheelHintTimerRef.current !== null) {
        window.clearTimeout(wheelHintTimerRef.current);
      }
      wheelHintTimerRef.current = window.setTimeout(() => {
        setShowWheelHint(false);
      }, 2200);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && wheelZoomEnabled) {
        setWheelZoomEnabled(false);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      if (wheelHintTimerRef.current !== null) {
        window.clearTimeout(wheelHintTimerRef.current);
      }
    };
  }, [wheelZoomEnabled, applyWheelZoom]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).closest('[data-pfd-interactive="true"]')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return;
    const dx = (e.clientX - dragRef.current.startX) / zoom;
    const dy = (e.clientY - dragRef.current.startY) / zoom;
    setPan({
      x: Math.max(-640, Math.min(640, dragRef.current.origX + dx)),
      y: Math.max(-340, Math.min(340, dragRef.current.origY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragRef.current.active = false;
  };

  const handleDownloadPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(pfd.canvas_width * 2));
    clone.setAttribute('height', String(pfd.canvas_height * 2));
    clone.setAttribute('viewBox', `0 0 ${pfd.canvas_width} ${pfd.canvas_height}`);
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pfd.canvas_width * 2;
      canvas.height = pfd.canvas_height * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#F7F7F5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `pfd-${pfd.producto_id}-iso10628.png`;
        a.click();
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const vbW = pfd.canvas_width / zoom;
  const vbH = pfd.canvas_height / zoom;
  const vbX = (pfd.canvas_width - vbW) / 2 - pan.x;
  const vbY = (pfd.canvas_height - vbH) / 2 - pan.y;

  const activeFuente =
    selection.kind === 'equipo' && selectedEquipo
      ? fuentesMap[selectedEquipo.fuente_id]
      : selectedCorriente
        ? fuentesMap[selectedCorriente.fuente_id]
        : null;

  return (
    <div className="space-y-6">
      {/* Barra superior técnica */}
      <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-stone-bg px-4 py-3 text-[12px]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="bg-ink px-2 py-0.5 font-medium text-white">
            PFD · {pfd.norma_simbologia}
          </span>
          <span className="text-ink-muted">
            Base de cálculo: <strong className="font-medium text-ink">{pfd.base_calculo}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={showUtilities}
            onClick={() => setShowUtilities((v) => !v)}
            className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium ${
              showUtilities
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Servicios ({pfd.servicios.length})
          </button>

          <button
            type="button"
            aria-pressed={showCritFlags}
            onClick={() => setShowCritFlags((v) => !v)}
            className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium ${
              showCritFlags
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Condiciones T/P
          </button>

          <button
            type="button"
            aria-pressed={wheelZoomEnabled}
            onClick={() => setWheelZoomEnabled((v) => !v)}
            title="Si está activo, la rueda del mouse hace zoom directo sobre el plano sin necesidad de apretar Ctrl"
            className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium ${
              wheelZoomEnabled
                ? 'border-cobalt bg-cobalt text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            {wheelZoomEnabled ? 'Rueda: zoom activo' : 'Rueda libre'}
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.2, Number((z + 0.25).toFixed(2))))}
            aria-label="Acercar PFD"
            className="bencho-press inline-flex cursor-pointer items-center border border-rule bg-stone-surface px-2 py-1 text-ink hover:border-ink"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
            aria-label="Alejar PFD"
            className="bencho-press inline-flex cursor-pointer items-center border border-rule bg-stone-surface px-2 py-1 text-ink hover:border-ink"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Restablecer vista PFD"
            className="bencho-press inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2 py-1 text-ink hover:border-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="bencho-press inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink hover:border-ink"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{expanded ? 'Ver con panel lateral' : 'Ampliar plano'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="bencho-press inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink hover:border-ink"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Plano PFD a la izquierda (8 cols) + Inspector técnico con descripción siempre visible al costado (4 cols) */}
      <div className={`grid gap-5 ${expanded ? 'lg:grid-cols-1' : 'lg:grid-cols-12 lg:items-stretch'}`}>
      <div
        className={`flex flex-col border border-rule bg-stone-surface ${
          expanded ? '' : 'lg:col-span-8'
        }`}
      >
        <div
          ref={viewportRef}
          onMouseLeave={() => setShowWheelHint(false)}
          className={`relative w-full overflow-hidden ${
            expanded ? 'h-[660px]' : 'h-[430px] sm:h-[500px] lg:h-[540px]'
          }`}
        >
          <svg
            ref={svgRef}
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            role="img"
            aria-label={pfd.titulo}
            className="h-full w-full cursor-grab select-none bg-[#F7F7F5] active:cursor-grabbing"
          >
            <defs>
              <pattern
                id={`pfd-grid-${pfd.producto_id}`}
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="rgba(17,18,20,0.042)"
                  strokeWidth="1"
                />
              </pattern>
              <marker
                id={`arrow-proceso-${pfd.producto_id}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#111214" />
              </marker>
              <marker
                id={`arrow-active-${pfd.producto_id}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0A42E0" />
              </marker>
              <marker
                id={`arrow-reciclo-${pfd.producto_id}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0B7A53" />
              </marker>
              <marker
                id={`arrow-subproducto-${pfd.producto_id}`}
                viewBox="0 0 10 10"
                refX="8.5"
                refY="5"
                markerWidth="6.5"
                markerHeight="6.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#C86A11" />
              </marker>
              <marker
                id={`arrow-util-${pfd.producto_id}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 9 5 L 0 8 z" fill="#8B5A18" />
              </marker>
            </defs>

            {/* Fondo milimetrado de plano técnico */}
            <rect
              x={0}
              y={0}
              width={pfd.canvas_width}
              height={pfd.canvas_height}
              fill={`url(#pfd-grid-${pfd.producto_id})`}
            />

            {/* Columna izquierda integrada: ENTRADAS AL PROCESO (Límite de batería) */}
            <g>
              <rect
                x={14}
                y={40}
                width={194}
                height={665}
                fill="#ECECE9"
                fillOpacity={0.7}
                stroke="#D2D4D8"
                strokeWidth={1.1}
              />
              <rect x={14} y={40} width={194} height={28} fill="#111214" />
              <text
                x={26}
                y={58}
                fill="#FFFFFF"
                fontSize={12}
                fontFamily="Space Grotesk, sans-serif"
                fontWeight={500}
              >
                ENTRADAS (LÍMITE BAT.)
              </text>

              {entradasBateria.map((lb) => {
                const accent = LIMITE_ACCENT[lb.categoria];
                const isLinked =
                  lb.corriente_num !== null &&
                  selection.kind === 'corriente' &&
                  selection.numero === lb.corriente_num;
                const titleLines = wrapSvgLines(lb.nombre, 22);

                return (
                  <g
                    key={lb.id}
                    transform={`translate(22, ${lb.y})`}
                    data-pfd-interactive="true"
                    className={lb.corriente_num ? 'cursor-pointer' : ''}
                    onClick={() => {
                      if (lb.corriente_num) {
                        setSelection({ kind: 'corriente', numero: lb.corriente_num });
                      }
                    }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={178}
                      height={118}
                      fill={isLinked ? '#EEF3FE' : '#F7F7F5'}
                      stroke={isLinked ? '#0A42E0' : '#D2D4D8'}
                      strokeWidth={isLinked ? 1.6 : 1}
                    />
                    <rect x={0} y={0} width={4} height={118} fill={accent} />

                    <text
                      x={12}
                      y={18}
                      fill="#111214"
                      fontSize={11.5}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {titleLines[0]}
                    </text>
                    {titleLines[1] && (
                      <text
                        x={12}
                        y={32}
                        fill="#111214"
                        fontSize={11.5}
                        fontFamily="Inter, sans-serif"
                        fontWeight={500}
                      >
                        {titleLines[1]}
                      </text>
                    )}

                    <text
                      x={12}
                      y={titleLines[1] ? 49 : 36}
                      fill={accent}
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {lb.formula}
                    </text>

                    <line x1={12} y1={58} x2={166} y2={58} stroke="#E2E3E0" strokeWidth={1} />

                    <text
                      x={12}
                      y={75}
                      fill="#111214"
                      fontSize={11.5}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {lb.cantidad_masa}
                    </text>
                    {lb.cantidad_molar && (
                      <text
                        x={12}
                        y={91}
                        fill="#52555E"
                        fontSize={10.5}
                        fontFamily="Inter, sans-serif"
                      >
                        {lb.cantidad_molar}
                      </text>
                    )}
                    {lb.fraccion_pureza && (
                      <text
                        x={12}
                        y={107}
                        fill="#52555E"
                        fontSize={10}
                        fontFamily="Inter, sans-serif"
                      >
                        {lb.fraccion_pureza}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Columna derecha integrada: SALIDAS, PRODUCTOS Y EMISIONES */}
            <g>
              <rect
                x={1672}
                y={40}
                width={194}
                height={665}
                fill="#ECECE9"
                fillOpacity={0.7}
                stroke="#D2D4D8"
                strokeWidth={1.1}
              />
              <rect x={1672} y={40} width={194} height={28} fill="#111214" />
              <text
                x={1684}
                y={58}
                fill="#FFFFFF"
                fontSize={12}
                fontFamily="Space Grotesk, sans-serif"
                fontWeight={500}
              >
                SALIDAS Y PRODUCTOS
              </text>

              {salidasBateria.map((lb) => {
                const accent = LIMITE_ACCENT[lb.categoria];
                const isLinked =
                  lb.corriente_num !== null &&
                  selection.kind === 'corriente' &&
                  selection.numero === lb.corriente_num;
                const titleLines = wrapSvgLines(lb.nombre, 22);

                return (
                  <g
                    key={lb.id}
                    transform={`translate(1680, ${lb.y})`}
                    data-pfd-interactive="true"
                    className={lb.corriente_num ? 'cursor-pointer' : ''}
                    onClick={() => {
                      if (lb.corriente_num) {
                        setSelection({ kind: 'corriente', numero: lb.corriente_num });
                      }
                    }}
                  >
                    <rect
                      x={0}
                      y={0}
                      width={178}
                      height={118}
                      fill={isLinked ? '#EEF3FE' : '#F7F7F5'}
                      stroke={isLinked ? '#0A42E0' : '#D2D4D8'}
                      strokeWidth={isLinked ? 1.6 : 1}
                    />
                    <rect x={0} y={0} width={4} height={118} fill={accent} />

                    <text
                      x={12}
                      y={18}
                      fill="#111214"
                      fontSize={11.5}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {titleLines[0]}
                    </text>
                    {titleLines[1] && (
                      <text
                        x={12}
                        y={32}
                        fill="#111214"
                        fontSize={11.5}
                        fontFamily="Inter, sans-serif"
                        fontWeight={500}
                      >
                        {titleLines[1]}
                      </text>
                    )}

                    <text
                      x={12}
                      y={titleLines[1] ? 49 : 36}
                      fill={accent}
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {lb.formula}
                    </text>

                    <line x1={12} y1={58} x2={166} y2={58} stroke="#E2E3E0" strokeWidth={1} />

                    <text
                      x={12}
                      y={75}
                      fill="#111214"
                      fontSize={11.5}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {lb.cantidad_masa}
                    </text>
                    {lb.cantidad_molar && (
                      <text
                        x={12}
                        y={91}
                        fill="#52555E"
                        fontSize={10.5}
                        fontFamily="Inter, sans-serif"
                      >
                        {lb.cantidad_molar}
                      </text>
                    )}
                    {lb.fraccion_pureza && (
                      <text
                        x={12}
                        y={107}
                        fill="#52555E"
                        fontSize={10}
                        fontFamily="Inter, sans-serif"
                      >
                        {lb.fraccion_pureza}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Áreas de proceso (Áreas 100..400) */}
            {pfd.secciones.map((sec) => (
              <g key={sec.area_id}>
                <rect
                  x={sec.x}
                  y={sec.y}
                  width={sec.width}
                  height={sec.height}
                  fill="rgba(255,255,255,0.45)"
                  stroke="#D2D4D8"
                  strokeWidth={1.1}
                  strokeDasharray="6 4"
                />
                <text
                  x={sec.x + 14}
                  y={sec.y + 22}
                  fill="#52555E"
                  fontSize={12.5}
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight={500}
                >
                  {sec.titulo}
                </text>
              </g>
            ))}

            {/* Servicios auxiliares (Utilities) con separación limpia */}
            {showUtilities &&
              pfd.servicios.map((srv) => {
                const x1 = srv.direccion === 'entrada' ? srv.x + srv.dx : srv.x;
                const y1 = srv.direccion === 'entrada' ? srv.y + srv.dy : srv.y;
                const x2 = srv.direccion === 'entrada' ? srv.x : srv.x + srv.dx;
                const y2 = srv.direccion === 'entrada' ? srv.y : srv.y + srv.dy;
                const labelX = srv.x + srv.dx;
                const labelY = srv.y + srv.dy + (srv.dy < 0 ? -8 : srv.dy > 0 ? 15 : -8);
                const anchor = srv.dx > 12 ? 'start' : srv.dx < -12 ? 'end' : 'middle';

                return (
                  <g key={srv.id}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#8B5A18"
                      strokeWidth={1.3}
                      strokeDasharray="3 2.5"
                      markerEnd={`url(#arrow-util-${pfd.producto_id})`}
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor={anchor}
                      fill="#7A4D10"
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {srv.etiqueta}
                    </text>
                  </g>
                );
              })}

            {/* Corrientes numeradas ortogonales */}
            {pfd.corrientes.map((cor) => {
              const st = STREAM_STYLE[cor.tipo];
              const isSelected =
                selection.kind === 'corriente' && selection.numero === cor.numero;
              const isHighlighted = connectedStreamNums.has(cor.numero);
              const strokeColor = isSelected ? '#0A42E0' : st.color;
              const markerId = isSelected
                ? `arrow-active-${pfd.producto_id}`
                : cor.tipo === 'reciclo'
                  ? `arrow-reciclo-${pfd.producto_id}`
                  : cor.tipo === 'subproducto'
                    ? `arrow-subproducto-${pfd.producto_id}`
                    : `arrow-proceso-${pfd.producto_id}`;
              const [fx, fy] = cor.flag_pos;

              return (
                <g
                  key={cor.numero}
                  data-pfd-interactive="true"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredStream(cor.numero)}
                  onMouseLeave={() => setHoveredStream(null)}
                  onClick={() => setSelection({ kind: 'corriente', numero: cor.numero })}
                >
                  <polyline
                    points={pointsToPolyline(cor.puntos)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                  />
                  <polyline
                    points={pointsToPolyline(cor.puntos)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={
                      isSelected ? st.width + 1.3 : isHighlighted ? st.width + 0.5 : st.width
                    }
                    strokeDasharray={st.dashed ? '6 4' : undefined}
                    className={st.dashed || isSelected ? 'pfd-stream-flow' : ''}
                    opacity={isHighlighted || isSelected ? 1 : 0.76}
                    markerEnd={`url(#${markerId})`}
                  />

                  {/* Rombo numerado estándar PFD (<1>, <2>, ...) */}
                  <g transform={`translate(${fx}, ${fy})`}>
                    <polygon
                      points="0,-13 14,0 0,13 -14,0"
                      fill={isSelected ? '#0A42E0' : '#F7F7F5'}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 1.8 : 1.35}
                    />
                    <text
                      x={0}
                      y={4}
                      textAnchor="middle"
                      fill={isSelected ? '#FFFFFF' : '#111214'}
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {cor.numero}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Equipos principales ISO 10628 con nombres envueltos en 2 líneas y fondo opaco anti-colisión */}
            {pfd.equipos.map((eq) => {
              const isSelected = selection.kind === 'equipo' && selection.tag === eq.tag;
              const isConnected = connectedEquipmentTags.has(eq.tag);
              const lines = wrapSvgLines(eq.nombre, 19);
              const boxHeight = lines.length === 2 ? 32 : 20;
              const boxWidth = 148;

              return (
                <g
                  key={eq.tag}
                  transform={`translate(${eq.x}, ${eq.y})`}
                  data-pfd-interactive="true"
                  className="pfd-svg-target cursor-pointer"
                  onClick={() => setSelection({ kind: 'equipo', tag: eq.tag })}
                >
                  <PfdEquipmentSymbol
                    simbolo={eq.simbolo}
                    selected={isSelected}
                    connected={isConnected}
                  />

                  {/* Tag oficial de equipo (F-101, R-201, T-302...) */}
                  <rect
                    x={-28}
                    y={-68}
                    width={56}
                    height={19}
                    fill={isSelected ? '#0A42E0' : '#111214'}
                  />
                  <text
                    x={0}
                    y={-55}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize={11}
                    fontFamily="Inter, sans-serif"
                    fontWeight={500}
                  >
                    {eq.tag}
                  </text>

                  {/* Cartucho opaco con el nombre en 1 o 2 líneas (nunca choca con cañerías ni equipos vecinos) */}
                  <rect
                    x={-boxWidth / 2}
                    y={52}
                    width={boxWidth}
                    height={boxHeight}
                    fill="#F7F7F5"
                    fillOpacity={0.96}
                    stroke={isSelected ? '#0A42E0' : '#E2E3E0'}
                    strokeWidth={isSelected ? 1.2 : 0.9}
                  />
                  <text
                    x={0}
                    y={lines.length === 2 ? 65 : 66}
                    textAnchor="middle"
                    fill={isSelected ? '#0A42E0' : '#111214'}
                    fontSize={11}
                    fontFamily="Inter, sans-serif"
                    fontWeight={500}
                  >
                    {lines[0]}
                  </text>
                  {lines[1] && (
                    <text
                      x={0}
                      y={79}
                      textAnchor="middle"
                      fill={isSelected ? '#0A42E0' : '#111214'}
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {lines[1]}
                    </text>
                  )}

                  {/* Bandera de condición crítica T / P */}
                  {showCritFlags && eq.condicion_critica && (
                    <g transform={`translate(0, ${52 + boxHeight + 13})`}>
                      <rect
                        x={-44}
                        y={-10}
                        width={88}
                        height={17}
                        fill="#ECECE9"
                        stroke="#D2D4D8"
                        strokeWidth={0.9}
                      />
                      <text
                        x={0}
                        y={2}
                        textAnchor="middle"
                        fill="#52555E"
                        fontSize={10}
                        fontFamily="Inter, sans-serif"
                        fontWeight={500}
                      >
                        {eq.condicion_critica}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Leyenda inferior del plano */}
            <g transform={`translate(226, ${pfd.canvas_height - 22})`}>
              <line x1={0} y1={0} x2={24} y2={0} stroke="#111214" strokeWidth={2.2} />
              <text x={30} y={4} fill="#52555E" fontSize={12} fontFamily="Inter, sans-serif">
                Corriente de proceso
              </text>

              <line
                x1={182}
                y1={0}
                x2={206}
                y2={0}
                stroke="#0B7A53"
                strokeWidth={2.2}
                strokeDasharray="6 4"
              />
              <text x={212} y={4} fill="#52555E" fontSize={12} fontFamily="Inter, sans-serif">
                Reciclo cerrado
              </text>

              <line x1={340} y1={0} x2={364} y2={0} stroke="#C86A11" strokeWidth={1.8} />
              <text x={370} y={4} fill="#52555E" fontSize={12} fontFamily="Inter, sans-serif">
                Subproducto / condensado
              </text>

              <line
                x1={556}
                y1={0}
                x2={580}
                y2={0}
                stroke="#8B5A18"
                strokeWidth={1.3}
                strokeDasharray="3 2.5"
              />
              <text x={586} y={4} fill="#52555E" fontSize={12} fontFamily="Inter, sans-serif">
                Servicios auxiliares (utilities)
              </text>

              <polygon
                points="795,-8 805,0 795,8 785,0"
                fill="#F7F7F5"
                stroke="#111214"
                strokeWidth={1.2}
              />
              <text x={814} y={4} fill="#52555E" fontSize={12} fontFamily="Inter, sans-serif">
                N° de corriente (tocá para inspeccionar)
              </text>
            </g>
          </svg>

          {showWheelHint && !wheelZoomEnabled && (
            <div className="bencho-card-enter pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 border border-rule-strong/30 bg-ink/92 px-3 py-1.5 text-[12px] text-white shadow-xs">
              Mantené <kbd className="border border-white/30 px-1 py-0.5 font-mono text-[11px]">Ctrl</kbd> + rueda para zoom, o activá <span className="font-medium">Rueda libre</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-stone-bg px-4 py-2 text-[12px] text-ink-muted">
          <span>
            Arrastrá para mover el plano · {wheelZoomEnabled ? 'Rueda del mouse: zoom directo (Esc para salir)' : 'Ctrl + rueda para zoom al cursor'}
          </span>
          <span className="tabular-nums">
            {pfd.equipos.length} equipos ISO · {pfd.corrientes.length} corrientes · Zoom{' '}
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

        {/* Panel inspector siempre visible al costado derecho del plano */}
        <aside
          aria-live="polite"
          className={`flex flex-col border border-rule bg-stone-surface p-5 ${
            expanded ? '' : 'lg:col-span-4'
          }`}
        >
          {selection.kind === 'equipo' && selectedEquipo ? (
            <div key={`eq-${selectedEquipo.tag}`} className="bencho-card-enter space-y-4">
              <div className="border-b border-rule pb-3">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="bg-cobalt px-2 py-0.5 font-medium text-white tabular-nums">
                    {selectedEquipo.tag}
                  </span>
                  <span className="text-ink-muted">Equipo mayor</span>
                </div>
                <h3 className="mt-2 font-display text-[17px] font-medium leading-snug tracking-[-0.015em] text-ink">
                  {selectedEquipo.nombre}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                  {selectedEquipo.descripcion}
                </p>
              </div>

              {selectedEquipo.reaccion && (
                <div className="border-l-2 border-cobalt bg-stone-bg px-3 py-2 text-[12px]">
                  <p className="text-ink-muted">Reacción principal</p>
                  <p className="mt-0.5 font-medium text-ink tabular-nums">
                    {selectedEquipo.reaccion}
                  </p>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-2.5 text-[12px] tabular-nums">
                <div className="border border-rule bg-stone-bg p-2.5">
                  <dt className="flex items-center gap-1 text-ink-muted">
                    <Flame className="h-3.5 w-3.5 text-ochre" />
                    <span>Temperatura</span>
                  </dt>
                  <dd className="mt-1 font-medium text-ink">
                    {selectedEquipo.temperatura_op ?? 's/d'}
                  </dd>
                </div>
                <div className="border border-rule bg-stone-bg p-2.5">
                  <dt className="flex items-center gap-1 text-ink-muted">
                    <Gauge className="h-3.5 w-3.5 text-cobalt" />
                    <span>Presión</span>
                  </dt>
                  <dd className="mt-1 font-medium text-ink">
                    {selectedEquipo.presion_op ?? 's/d'}
                  </dd>
                </div>
              </dl>

              <div className="space-y-2 border-t border-rule pt-3 text-[12px]">
                <p className="font-medium text-ink">Corrientes vinculadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {pfd.corrientes
                    .filter(
                      (c) =>
                        c.origen_tag === selectedEquipo.tag ||
                        c.destino_tag === selectedEquipo.tag
                    )
                    .map((c) => (
                      <button
                        key={c.numero}
                        type="button"
                        onClick={() => setSelection({ kind: 'corriente', numero: c.numero })}
                        className="cursor-pointer border border-rule bg-stone-bg px-2 py-1 text-left text-[12px] text-ink transition-colors duration-150 hover:border-cobalt hover:text-cobalt tabular-nums"
                      >
                        &lt;{c.numero}&gt; {c.destino_tag === selectedEquipo.tag ? 'Entra' : 'Sale'}
                      </button>
                    ))}
                </div>
              </div>

              <div className="border-t border-rule pt-3 text-[12px] text-ink-muted">
                <p className="font-medium text-ink">Referencia técnica</p>
                <p className="mt-1">{selectedEquipo.cita_ubicacion}</p>
                {activeFuente && (
                  <a
                    href={activeFuente.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-medium text-cobalt hover:underline"
                  >
                    <span>{activeFuente.organismo}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ) : selectedCorriente ? (
            <div key={`st-${selectedCorriente.numero}`} className="bencho-card-enter space-y-4">
              <div className="border-b border-rule pb-3">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="bg-cobalt px-2 py-0.5 font-medium text-white tabular-nums">
                    Corriente &lt;{selectedCorriente.numero}&gt;
                  </span>
                  <span className="text-ink-muted">
                    {STREAM_STYLE[selectedCorriente.tipo].label}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-[17px] font-medium leading-snug tracking-[-0.015em] text-ink">
                  {selectedCorriente.nombre}
                </h3>
                <p className="mt-1 text-[13px] font-medium text-cobalt tabular-nums">
                  {selectedCorriente.especies}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-2.5 text-[12px] tabular-nums">
                <div className="border border-rule bg-stone-bg p-2.5">
                  <dt className="text-ink-muted">Fase</dt>
                  <dd className="mt-0.5 font-medium text-ink">{selectedCorriente.fase}</dd>
                </div>
                <div className="border border-rule bg-stone-bg p-2.5">
                  <dt className="text-ink-muted">Balance específico</dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    {formatFlujo(selectedCorriente.flujo_especifico)}
                  </dd>
                </div>
                <div className="border border-rule bg-stone-bg p-2.5">
                  <dt className="text-ink-muted">Temperatura</dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    {selectedCorriente.temperatura_c ? `${selectedCorriente.temperatura_c} °C` : 's/d'}
                  </dd>
                </div>
                <div className="border border-rule bg-stone-bg p-2.5">
                  <dt className="text-ink-muted">Presión</dt>
                  <dd className="mt-0.5 font-medium text-ink">
                    {selectedCorriente.presion_bar ? `${selectedCorriente.presion_bar} bar` : 's/d'}
                  </dd>
                </div>
              </dl>

              <p className="text-[13px] leading-relaxed text-ink-muted">
                {selectedCorriente.nota_tecnica}
              </p>

              <div className="flex flex-wrap gap-1.5 border-t border-rule pt-3 text-[12px]">
                {selectedCorriente.origen_tag && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelection({ kind: 'equipo', tag: selectedCorriente.origen_tag! })
                    }
                    className="cursor-pointer border border-rule bg-stone-bg px-2.5 py-1 font-medium text-ink hover:border-cobalt hover:text-cobalt"
                  >
                    Origen: {selectedCorriente.origen_tag}
                  </button>
                )}
                {selectedCorriente.destino_tag && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelection({ kind: 'equipo', tag: selectedCorriente.destino_tag! })
                    }
                    className="cursor-pointer border border-rule bg-stone-bg px-2.5 py-1 font-medium text-ink hover:border-cobalt hover:text-cobalt"
                  >
                    Destino: {selectedCorriente.destino_tag}
                  </button>
                )}
              </div>

              <div className="border-t border-rule pt-3 text-[12px] text-ink-muted">
                <p className="font-medium text-ink">Referencia técnica</p>
                <p className="mt-1">{selectedCorriente.cita_ubicacion}</p>
                {activeFuente && (
                  <a
                    href={activeFuente.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-medium text-cobalt hover:underline"
                  >
                    <span>{activeFuente.organismo}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ) : null}
        </aside>

      </div>

      {/* Balance Global de Materia (Entradas vs Salidas en t/t, kmol/t y %) */}
      <div className="grid gap-6 border border-rule bg-stone-surface p-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-2 border-b border-rule pb-2.5">
              <ArrowDownToLine className="h-4 w-4 text-cobalt" />
              <h3 className="font-display text-[16px] font-medium tracking-[-0.015em] text-ink">
                Entradas al proceso
              </h3>
            </div>
            <ul className="mt-3 divide-y divide-rule text-[13px]">
              {entradasBateria.map((lb) => (
                <li key={lb.id} className="py-2.5 first:pt-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{lb.nombre}</span>
                    <span className="shrink-0 text-[12px] font-medium text-cobalt tabular-nums">
                      {lb.formula}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-ink tabular-nums">
                    {lb.cantidad_masa}
                    {lb.cantidad_molar ? ` · ${lb.cantidad_molar}` : ''}
                  </p>
                  {lb.fraccion_pureza && (
                    <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                      {lb.fraccion_pureza}
                    </p>
                  )}
                  <p className="mt-0.5 text-[12px] text-ink-muted">{lb.nota}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-rule pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <div className="flex items-center gap-2 border-b border-rule pb-2.5">
              <ArrowUpFromLine className="h-4 w-4 text-emerald-react" />
              <h3 className="font-display text-[16px] font-medium tracking-[-0.015em] text-ink">
                Salidas, productos y emisiones
              </h3>
            </div>
            <ul className="mt-3 divide-y divide-rule text-[13px]">
              {salidasBateria.map((lb) => (
                <li key={lb.id} className="py-2.5 first:pt-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{lb.nombre}</span>
                    <span
                      className="shrink-0 text-[12px] font-medium tabular-nums"
                      style={{ color: LIMITE_ACCENT[lb.categoria] }}
                    >
                      {lb.formula}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] font-medium text-ink tabular-nums">
                    {lb.cantidad_masa}
                    {lb.cantidad_molar ? ` · ${lb.cantidad_molar}` : ''}
                  </p>
                  {lb.fraccion_pureza && (
                    <p className="mt-0.5 text-[12px] text-ink-muted tabular-nums">
                      {lb.fraccion_pureza}
                    </p>
                  )}
                  <p className="mt-0.5 text-[12px] text-ink-muted">{lb.nota}</p>
                </li>
              ))}
            </ul>
          </div>
      </div>

      {/* Tabla de Corrientes (Stream Table) sincronizada bidireccionalmente con el PFD */}
      <div className="border border-rule bg-stone-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-stone-bg px-4 py-3">
          <div>
            <h3 className="font-display text-[16px] font-medium tracking-[-0.015em] text-ink">
              Tabla de corrientes (Stream Table)
            </h3>
            <p className="mt-0.5 text-[12px] text-ink-muted">{pfd.nota_metodologica}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1 text-[12px]">
            {(
              [
                ['todas', `Todas (${pfd.corrientes.length})`],
                ['proceso', 'Proceso'],
                ['reciclo', 'Reciclos'],
                ['subproducto', 'Subproductos'],
              ] as Array<[StreamFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStreamFilter(key)}
                className={`bencho-press cursor-pointer border px-2.5 py-1 font-medium ${
                  streamFilter === key
                    ? 'border-ink bg-ink text-white'
                    : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-rule bg-stone-bg/60 text-[12px] font-medium text-ink-muted">
                <th className="px-4 py-2.5 font-medium">N°</th>
                <th className="px-3 py-2.5 font-medium">Corriente y especies químicas</th>
                <th className="px-3 py-2.5 font-medium">Ruta</th>
                <th className="px-3 py-2.5 font-medium">Fase</th>
                <th className="px-3 py-2.5 font-medium">T (°C)</th>
                <th className="px-3 py-2.5 font-medium">P (bar)</th>
                <th className="px-3 py-2.5 font-medium">Balance específico</th>
                <th className="px-4 py-2.5 font-medium">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filteredStreams.map((cor) => {
                const isSelected =
                  selection.kind === 'corriente' && selection.numero === cor.numero;
                const st = STREAM_STYLE[cor.tipo];
                const fuente = fuentesMap[cor.fuente_id];

                return (
                  <tr
                    key={cor.numero}
                    onMouseEnter={() => setHoveredStream(cor.numero)}
                    onMouseLeave={() => setHoveredStream(null)}
                    onClick={() => setSelection({ kind: 'corriente', numero: cor.numero })}
                    className={`cursor-pointer transition-colors duration-100 ${
                      isSelected ? 'bg-[#EEF3FE]' : 'hover:bg-stone-bg/70'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center border text-[12px] font-medium ${
                          isSelected
                            ? 'border-cobalt bg-cobalt text-white'
                            : 'border-rule-strong/40 bg-stone-surface text-ink'
                        }`}
                      >
                        {cor.numero}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-ink">{cor.nombre}</p>
                      <p className="text-[12px] text-ink-muted">{cor.especies}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-ink-muted">
                      {cor.origen_tag ?? 'Batería'} → {cor.destino_tag ?? 'Salida'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-ink">{cor.fase}</td>
                    <td className="px-3 py-2.5 text-[12px] text-ink">
                      {cor.temperatura_c ?? 's/d'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-ink">
                      {cor.presion_bar ?? 's/d'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px]">
                      <span
                        className={
                          cor.flujo_especifico.estado === 'dato'
                            ? 'font-medium text-cobalt'
                            : 'text-ink-muted'
                        }
                      >
                        {formatFlujo(cor.flujo_especifico)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px]">
                      <span
                        className="inline-block h-2 w-2 align-middle"
                        style={{ backgroundColor: st.color }}
                      />{' '}
                      <span className="text-ink-muted">
                        {fuente?.organismo.split('·')[0]?.trim() ?? cor.fuente_id}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
