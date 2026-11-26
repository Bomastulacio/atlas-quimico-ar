import { useMemo, useRef, useState } from 'react';
import {
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
import type { Fuente, PfdCorriente, PfdEquipo, PfdProceso } from '@/schemas';
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
  proceso: { label: 'Proceso principal', color: '#111214', dashed: false, width: 2.1 },
  reciclo: { label: 'Reciclo cerrado', color: '#0B7A53', dashed: true, width: 2.1 },
  subproducto: { label: 'Subproducto / purga', color: '#C86A11', dashed: false, width: 1.7 },
  emision: { label: 'Emisión / gases', color: '#D93025', dashed: true, width: 1.8 },
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

  // Estado de cámara SVG (zoom + paneo suave por arrastre)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
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

  const selectedEquipo: PfdEquipo | null =
    selection.kind === 'equipo' ? (equipoMap.get(selection.tag) ?? null) : null;
  const selectedCorriente: PfdCorriente | null =
    selection.kind === 'corriente'
      ? (pfd.corrientes.find((c) => c.numero === selection.numero) ?? null)
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

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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
      x: Math.max(-420, Math.min(420, dragRef.current.origX + dx)),
      y: Math.max(-240, Math.min(240, dragRef.current.origY + dy)),
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

  // Cálculo del viewBox reactivo para zoom y paneo nítido vectorial
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
      {/* Cabecera técnica del PFD */}
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
            className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
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
            className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
              showCritFlags
                ? 'border-ink bg-ink text-white'
                : 'border-rule bg-stone-surface text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            Condiciones T/P
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.25).toFixed(2))))}
            aria-label="Acercar PFD"
            className="inline-flex cursor-pointer items-center border border-rule bg-stone-surface px-2 py-1 text-ink hover:border-ink"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
            aria-label="Alejar PFD"
            className="inline-flex cursor-pointer items-center border border-rule bg-stone-surface px-2 py-1 text-ink hover:border-ink"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Restablecer vista PFD"
            className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2 py-1 text-ink hover:border-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink hover:border-ink"
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{expanded ? 'Vista normal' : 'Ampliar plano'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex cursor-pointer items-center gap-1 border border-rule bg-stone-surface px-2.5 py-1 font-medium text-ink hover:border-ink"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Plano PFD vectorial + Inspector lateral de equipo o corriente */}
      <div className={`grid gap-5 ${expanded ? 'lg:grid-cols-1' : 'lg:grid-cols-12'}`}>
        <div
          className={`flex flex-col border border-rule bg-stone-surface ${
            expanded ? '' : 'lg:col-span-9'
          }`}
        >
          <div className={`relative w-full overflow-hidden ${expanded ? 'h-[620px]' : 'h-[470px] sm:h-[520px]'}`}>
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
                <pattern id={`pfd-grid-${pfd.producto_id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="rgba(17,18,20,0.045)"
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

              {/* Fondo milimetrado de plano de ingeniería */}
              <rect
                x={0}
                y={0}
                width={pfd.canvas_width}
                height={pfd.canvas_height}
                fill={`url(#pfd-grid-${pfd.producto_id})`}
              />

              {/* Áreas de proceso (Áreas 100..400) */}
              {pfd.secciones.map((sec) => (
                <g key={sec.area_id}>
                  <rect
                    x={sec.x}
                    y={sec.y}
                    width={sec.width}
                    height={sec.height}
                    fill="rgba(255,255,255,0.42)"
                    stroke="#D2D4D8"
                    strokeWidth={1.1}
                    strokeDasharray="6 4"
                  />
                  <text
                    x={sec.x + 12}
                    y={sec.y + 20}
                    fill="#52555E"
                    fontSize={12}
                    fontFamily="Space Grotesk, sans-serif"
                    fontWeight={500}
                  >
                    {sec.titulo}
                  </text>
                </g>
              ))}

              {/* Servicios auxiliares (Utilities) */}
              {showUtilities &&
                pfd.servicios.map((srv) => {
                  const x1 = srv.direccion === 'entrada' ? srv.x + srv.dx : srv.x;
                  const y1 = srv.direccion === 'entrada' ? srv.y + srv.dy : srv.y;
                  const x2 = srv.direccion === 'entrada' ? srv.x : srv.x + srv.dx;
                  const y2 = srv.direccion === 'entrada' ? srv.y : srv.y + srv.dy;
                  const labelX = srv.x + srv.dx;
                  const labelY = srv.y + srv.dy + (srv.dy < 0 ? -7 : srv.dy > 0 ? 13 : -7);

                  return (
                    <g key={srv.id}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#8B5A18"
                        strokeWidth={1.25}
                        strokeDasharray="3 2.5"
                        markerEnd={`url(#arrow-util-${pfd.producto_id})`}
                      />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor={srv.dx > 10 ? 'start' : srv.dx < -10 ? 'end' : 'middle'}
                        fill="#7A4D10"
                        fontSize={10.5}
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
                    {/* Área invisible ancha para facilitar el click sobre la cañería */}
                    <polyline
                      points={pointsToPolyline(cor.puntos)}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                    />
                    <polyline
                      points={pointsToPolyline(cor.puntos)}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={isSelected ? st.width + 1.2 : isHighlighted ? st.width + 0.5 : st.width}
                      strokeDasharray={st.dashed ? '6 4' : undefined}
                      opacity={isHighlighted || isSelected ? 1 : 0.72}
                      markerEnd={`url(#${markerId})`}
                    />

                    {/* Rombo / escudo numerado estándar PFD (<1>, <2>, ...) */}
                    <g transform={`translate(${fx}, ${fy})`}>
                      <polygon
                        points="0,-12 13,0 0,12 -13,0"
                        fill={isSelected ? '#0A42E0' : '#F7F7F5'}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? 1.8 : 1.3}
                      />
                      <text
                        x={0}
                        y={3.8}
                        textAnchor="middle"
                        fill={isSelected ? '#FFFFFF' : '#111214'}
                        fontSize={10.5}
                        fontFamily="Inter, sans-serif"
                        fontWeight={500}
                      >
                        {cor.numero}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Equipos principales ISO 10628 */}
              {pfd.equipos.map((eq) => {
                const isSelected = selection.kind === 'equipo' && selection.tag === eq.tag;
                const isConnected = connectedEquipmentTags.has(eq.tag);

                return (
                  <g
                    key={eq.tag}
                    transform={`translate(${eq.x}, ${eq.y})`}
                    data-pfd-interactive="true"
                    className="cursor-pointer"
                    onClick={() => setSelection({ kind: 'equipo', tag: eq.tag })}
                  >
                    <PfdEquipmentSymbol
                      simbolo={eq.simbolo}
                      selected={isSelected}
                      connected={isConnected}
                    />

                    {/* Tag oficial de equipo (F-101, R-201, T-302...) */}
                    <rect
                      x={-26}
                      y={-64}
                      width={52}
                      height={17}
                      fill={isSelected ? '#0A42E0' : '#111214'}
                    />
                    <text
                      x={0}
                      y={-52}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize={10.5}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {eq.tag}
                    </text>

                    {/* Nombre descriptivo del equipo debajo del símbolo */}
                    <text
                      x={0}
                      y={60}
                      textAnchor="middle"
                      fill={isSelected ? '#0A42E0' : '#111214'}
                      fontSize={11}
                      fontFamily="Inter, sans-serif"
                      fontWeight={500}
                    >
                      {eq.nombre}
                    </text>

                    {/* Bandera de condición crítica T / P (opcional) */}
                    {showCritFlags && eq.condicion_critica && (
                      <g transform="translate(0, 75)">
                        <rect
                          x={-36}
                          y={-10}
                          width={72}
                          height={15}
                          fill="#ECECE9"
                          stroke="#D2D4D8"
                          strokeWidth={0.9}
                        />
                        <text
                          x={0}
                          y={1}
                          textAnchor="middle"
                          fill="#52555E"
                          fontSize={9.5}
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

              {/* Leyenda compacta inferior dentro del plano técnico */}
              <g transform={`translate(24, ${pfd.canvas_height - 24})`}>
                <line x1={0} y1={0} x2={22} y2={0} stroke="#111214" strokeWidth={2.1} />
                <text x={28} y={3.5} fill="#52555E" fontSize={11} fontFamily="Inter, sans-serif">
                  Corriente de proceso
                </text>

                <line x1={165} y1={0} x2={187} y2={0} stroke="#0B7A53" strokeWidth={2.1} strokeDasharray="5 3" />
                <text x={193} y={3.5} fill="#52555E" fontSize={11} fontFamily="Inter, sans-serif">
                  Reciclo cerrado
                </text>

                <line x1={305} y1={0} x2={327} y2={0} stroke="#C86A11" strokeWidth={1.8} />
                <text x={333} y={3.5} fill="#52555E" fontSize={11} fontFamily="Inter, sans-serif">
                  Subproducto / condensado
                </text>

                <line x1={490} y1={0} x2={512} y2={0} stroke="#8B5A18" strokeWidth={1.3} strokeDasharray="3 2.5" />
                <text x={518} y={3.5} fill="#52555E" fontSize={11} fontFamily="Inter, sans-serif">
                  Servicios auxiliares (utilities)
                </text>

                <polygon points="710,-7 719,0 710,7 701,0" fill="#F7F7F5" stroke="#111214" strokeWidth={1.2} />
                <text x={726} y={3.5} fill="#52555E" fontSize={11} fontFamily="Inter, sans-serif">
                  N° de corriente (ver Tabla de Corrientes abajo)
                </text>
              </g>
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-stone-bg px-4 py-2 text-[12px] text-ink-muted">
            <span>Tocá cualquier equipo (ej. F-101) o rombo numerado para inspeccionar su balance</span>
            <span className="tabular-nums">
              {pfd.equipos.length} equipos ISO · {pfd.corrientes.length} corrientes numeradas · Zoom{' '}
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Panel inspector lateral */}
        <aside
          aria-live="polite"
          className={`flex flex-col border border-rule bg-stone-surface p-5 ${
            expanded ? '' : 'lg:col-span-3'
          }`}
        >
          {selection.kind === 'equipo' && selectedEquipo ? (
            <div className="space-y-4">
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

              {/* Corrientes conectadas a este equipo */}
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

              {/* Fuente técnica */}
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
            <div className="space-y-4">
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

      {/* Tabla de Corrientes (Stream Table) sincronizada bidireccionalmente con el PFD */}
      <div className="border border-rule bg-stone-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-stone-bg px-4 py-3">
          <div>
            <h3 className="font-display text-[16px] font-medium tracking-[-0.015em] text-ink">
              Tabla de corrientes (Stream Table)
            </h3>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {pfd.nota_metodologica}
            </p>
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
                className={`cursor-pointer border px-2.5 py-1 font-medium transition-colors duration-150 ${
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
