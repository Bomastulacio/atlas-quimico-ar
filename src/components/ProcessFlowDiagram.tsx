import { useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { ExternalLink, Flame, Gauge, Zap } from 'lucide-react';
import type { ConexionProceso, CorrienteEspecie, PasoProceso } from '@/schemas';
import type { ProcesoCompleto } from '@/data';
import { ProcessPfdDiagram } from './ProcessPfdDiagram';

interface ProcessFlowDiagramProps {
  procesoCompleto: ProcesoCompleto;
}

type StepNodeData = {
  paso: PasoProceso;
  isSelected: boolean;
};

type StepFlowNode = Node<StepNodeData, 'processStep'>;

const EASE = [0.22, 1, 0.36, 1] as const;

const TIPO_PASO_META: Record<
  PasoProceso['tipo_paso'],
  { label: string; accent: string }
> = {
  materia_prima: { label: 'Materia prima', accent: '#C86A11' },
  preparacion: { label: 'Preparación', accent: '#52555E' },
  reaccion: { label: 'Reacción principal', accent: '#0A42E0' },
  separacion: { label: 'Separación', accent: '#0B7A53' },
  refinacion: { label: 'Refinación', accent: '#0A42E0' },
  producto: { label: 'Producto final', accent: '#0B7A53' },
  subproducto: { label: 'Subproducto', accent: '#C86A11' },
  emision: { label: 'Tratamiento y emisiones', accent: '#D93025' },
};

const TIPO_CORRIENTE_STYLE: Record<
  ConexionProceso['tipo_corriente'],
  { label: string; color: string; dashed: boolean; animated: boolean; width: number }
> = {
  principal: {
    label: 'Corriente principal',
    color: '#0A42E0',
    dashed: false,
    animated: false,
    width: 2.2,
  },
  insumo: {
    label: 'Insumo crítico',
    color: '#C86A11',
    dashed: false,
    animated: false,
    width: 1.8,
  },
  emision: {
    label: 'Emisión / gases',
    color: '#D93025',
    dashed: false,
    animated: false,
    width: 1.8,
  },
  reciclo: {
    label: 'Reciclo cerrado',
    color: '#0B7A53',
    dashed: true,
    animated: true,
    width: 1.9,
  },
  subproducto: {
    label: 'Subproducto',
    color: '#52555E',
    dashed: true,
    animated: false,
    width: 1.6,
  },
  residuo: {
    label: 'Residuo',
    color: '#8B1B14',
    dashed: true,
    animated: false,
    width: 1.6,
  },
};

function formatCantidad(cantidad: number | null, unidad: string): string {
  if (cantidad === null) return unidad;
  const formatted = cantidad.toLocaleString('es-AR', {
    maximumFractionDigits: cantidad < 0.01 ? 5 : 3,
  });
  return `${formatted} ${unidad}`;
}

function ProcessStepNode({ data }: NodeProps<StepFlowNode>) {
  const { paso, isSelected } = data;
  const meta = TIPO_PASO_META[paso.tipo_paso];

  return (
    <div
      className={`w-[254px] cursor-pointer border bg-stone-surface text-left transition-colors duration-150 ${
        isSelected
          ? 'border-ink ring-2 ring-cobalt/35'
          : 'border-rule-strong/30 hover:border-ink'
      }`}
    >
      {/* Conectores geométricos discretos (soportan flujos horizontales, verticales y reciclos) */}
      <Handle
        id="left-in"
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !rounded-none !border !border-ink !bg-stone-surface"
      />
      <Handle
        id="top-in"
        type="target"
        position={Position.Top}
        style={{ left: '34%' }}
        className="!h-2 !w-2 !rounded-none !border !border-ink !bg-stone-surface"
      />
      <Handle
        id="top-recycle-in"
        type="target"
        position={Position.Top}
        style={{ left: '74%' }}
        className="!h-2 !w-2 !rounded-none !border !border-emerald-react !bg-stone-surface"
      />

      {/* Filete superior de ruptura semántica por tipo de operación */}
      <div className="h-1 w-full" style={{ backgroundColor: meta.accent }} />

      <div className="p-3.5">
        <div className="flex items-baseline justify-between gap-2 text-[12px] text-ink-muted tabular-nums">
          <span className="font-medium text-ink">Paso {paso.orden}</span>
          <span>{meta.label}</span>
        </div>

        <h3 className="mt-1.5 font-display text-[15px] font-medium leading-snug text-ink">
          {paso.nombre}
        </h3>

        {paso.reaccion_balanceada && (
          <p className="mt-2 border-l-2 border-cobalt bg-stone-bg px-2 py-1 text-[12px] font-medium text-ink tabular-nums">
            {paso.reaccion_balanceada}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-rule pt-2 text-[12px] text-ink-muted tabular-nums">
          <span>{paso.temperatura_c ? `${paso.temperatura_c} °C` : 'T ambiente'}</span>
          <span
            className={
              paso.energia.estado === 'dato' ? 'font-medium text-cobalt' : 'text-ink-muted'
            }
          >
            {paso.energia.estado === 'dato'
              ? `${paso.energia.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${paso.energia.unidad}`
              : 'Energía s/d'}
          </span>
        </div>
      </div>

      <Handle
        id="right-out"
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !rounded-none !border !border-ink !bg-stone-surface"
      />
      <Handle
        id="bottom-out"
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !rounded-none !border !border-ink !bg-stone-surface"
      />
    </div>
  );
}

const NODE_TYPES = {
  processStep: ProcessStepNode,
};

function computeHandles(
  conexion: ConexionProceso,
  pasoMap: Map<string, PasoProceso>
): { sourceHandle: string; targetHandle: string } {
  const origen = pasoMap.get(conexion.origen_paso_id);
  const destino = pasoMap.get(conexion.destino_paso_id);

  if (!origen || !destino) {
    return { sourceHandle: 'right-out', targetHandle: 'left-in' };
  }

  if (conexion.tipo_corriente === 'reciclo' || destino.pos_x < origen.pos_x) {
    return { sourceHandle: 'bottom-out', targetHandle: 'top-recycle-in' };
  }

  // Misma columna vertical (ej. planta de ánodos sobre celdas de electrólisis)
  if (Math.abs(destino.pos_x - origen.pos_x) < 60 && destino.pos_y > origen.pos_y) {
    return { sourceHandle: 'bottom-out', targetHandle: 'top-in' };
  }

  return { sourceHandle: 'right-out', targetHandle: 'left-in' };
}

function SpeciesTable({
  title,
  items,
  emptyLabel = 'Sin corrientes declaradas',
}: {
  title: string;
  items: CorrienteEspecie[];
  emptyLabel?: string;
}) {
  return (
    <div>
      <h4 className="text-[13px] font-medium text-ink-muted">{title}</h4>
      {items.length === 0 ? (
        <p className="mt-1 text-[13px] text-ink-muted/80">{emptyLabel}</p>
      ) : (
        <ul className="mt-1.5 divide-y divide-rule border-t border-rule text-[13px]">
          {items.map((item, idx) => (
            <li
              key={`${item.especie}-${idx}`}
              className="flex items-baseline justify-between gap-3 py-1.5"
            >
              <span className="text-ink">{item.especie}</span>
              <span className="shrink-0 font-medium text-ink-muted tabular-nums">
                {formatCantidad(item.cantidad, item.unidad)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProcessFlowDiagram({ procesoCompleto }: ProcessFlowDiagramProps) {
  const { proceso, pasos, conexiones, pfd, pfdFuentes } = procesoCompleto;
  const [viewMode, setViewMode] = useState<'pfd' | 'bfd'>(pfd ? 'pfd' : 'bfd');

  // Seleccionar por defecto el paso de reacción principal (o el primero si no hay)
  const defaultStepId =
    pasos.find((p) => p.tipo_paso === 'reaccion')?.paso_id ?? pasos[0]?.paso_id ?? '';
  const [selectedStepId, setSelectedStepId] = useState<string>(defaultStepId);

  const pasoMap = useMemo(
    () => new Map(pasos.map((p) => [p.paso_id, p])),
    [pasos]
  );

  // Ampliamos el espaciado horizontal efectivo en vista BFD (1.36x) para que las etiquetas de corriente jamás pisen las cajas
  const nodes: StepFlowNode[] = useMemo(
    () =>
      pasos.map((paso) => ({
        id: paso.paso_id,
        type: 'processStep',
        position: { x: Math.round(paso.pos_x * 1.36), y: paso.pos_y },
        data: {
          paso,
          isSelected: paso.paso_id === selectedStepId,
        },
        draggable: false,
      })),
    [pasos, selectedStepId]
  );

  const edges: Edge[] = useMemo(
    () =>
      conexiones.map((con) => {
        const styleMeta = TIPO_CORRIENTE_STYLE[con.tipo_corriente];
        const handles = computeHandles(con, pasoMap);
        const touchesSelected =
          con.origen_paso_id === selectedStepId || con.destino_paso_id === selectedStepId;

        const labelText =
          con.flujo.estado === 'dato'
            ? `${con.flujo.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${con.flujo.unidad}`
            : con.corriente_nombre;

        return {
          id: con.conexion_id,
          source: con.origen_paso_id,
          target: con.destino_paso_id,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'smoothstep',
          animated: styleMeta.animated,
          label: labelText,
          labelStyle: {
            fill: touchesSelected ? '#111214' : '#52555E',
            fontSize: 11,
            fontFamily: 'Inter, sans-serif',
            fontWeight: touchesSelected ? 600 : 500,
          },
          labelBgStyle: {
            fill: '#F7F7F5',
            fillOpacity: 0.94,
            stroke: touchesSelected ? styleMeta.color : '#D2D4D8',
            strokeWidth: 1,
          },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 0,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: styleMeta.color,
            width: 16,
            height: 16,
          },
          style: {
            stroke: styleMeta.color,
            strokeWidth: touchesSelected ? styleMeta.width + 0.7 : styleMeta.width,
            strokeDasharray: styleMeta.dashed ? '6 4' : undefined,
            opacity: touchesSelected ? 1 : 0.78,
          },
        };
      }),
    [conexiones, pasoMap, selectedStepId]
  );

  const selectedStep = pasoMap.get(selectedStepId) ?? pasos[0] ?? null;

  const incomingEdges = useMemo(
    () => conexiones.filter((c) => c.destino_paso_id === selectedStep?.paso_id),
    [conexiones, selectedStep]
  );
  const outgoingEdges = useMemo(
    () => conexiones.filter((c) => c.origen_paso_id === selectedStep?.paso_id),
    [conexiones, selectedStep]
  );

  const activeCorrienteTypes = useMemo(() => {
    const present = new Set(conexiones.map((c) => c.tipo_corriente));
    return Array.from(present);
  }, [conexiones]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="space-y-4">
        {/* Switch de modo: PFD técnico ISO 10628 (cuando existe) + Vista resumida en bloques (BFD) */}
        {pfd && (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-stone-surface px-4 py-2.5">
            <div className="inline-flex border border-rule bg-stone-bg p-0.5 text-[13px]">
              <button
                type="button"
                onClick={() => setViewMode('pfd')}
                className={`bencho-press cursor-pointer px-3 py-1 font-medium ${
                  viewMode === 'pfd' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                PFD de ingeniería (ISO 10628)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('bfd')}
                className={`bencho-press cursor-pointer px-3 py-1 font-medium ${
                  viewMode === 'bfd' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Vista resumida en bloques (BFD)
              </button>
            </div>
            <p className="text-[12px] text-ink-muted">
              {viewMode === 'pfd'
                ? 'Equipos normalizados, corrientes numeradas, servicios auxiliares y Tabla de Corrientes'
                : 'Resumen por etapas con entradas, reacciones y salidas agregadas'}
            </p>
          </div>
        )}

        {pfd && viewMode === 'pfd' ? (
          <ProcessPfdDiagram pfd={pfd} fuentesMap={pfdFuentes} />
        ) : (
        <>
        {/* Barra superior de selección rápida accesible (útil en teclado y mobile) */}
        <div
          role="tablist"
          aria-label="Seleccionar etapa del proceso químico"
          className="flex items-center gap-1 overflow-x-auto border border-rule bg-stone-subtle p-1"
        >
          {pasos.map((paso) => {
            const isActive = selectedStep?.paso_id === paso.paso_id;
            const meta = TIPO_PASO_META[paso.tipo_paso];
            return (
              <button
                key={paso.paso_id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedStepId(paso.paso_id)}
                className={`inline-flex shrink-0 cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'text-ink-muted hover:bg-stone-surface hover:text-ink'
                }`}
              >
                <span
                  className="h-2 w-2 shrink-0"
                  style={{ backgroundColor: meta.accent }}
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {paso.orden}. {paso.nombre}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lienzo React Flow (65%) + Inspector técnico clickeable (35%) */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="atlas-flow flex flex-col border border-rule bg-[#E6E7E3] lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-stone-surface px-4 py-2.5 text-[13px]">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-ink">{proceso.nombre}</span>
                {proceso.reaccion_global && (
                  <span className="font-medium text-cobalt tabular-nums">
                    {proceso.reaccion_global}
                  </span>
                )}
              </div>
              <span className="text-ink-muted">
                Hacé click en cualquier etapa para inspeccionar su balance
              </span>
            </div>

            <div className="h-[460px] w-full sm:h-[520px] lg:h-[590px]">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={NODE_TYPES}
                onNodeClick={(_event, node) => setSelectedStepId(node.id)}
                fitView
                fitViewOptions={{ padding: 0.16 }}
                minZoom={0.45}
                maxZoom={1.75}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                proOptions={{ hideAttribution: false }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1.2}
                  color="#B8BCC4"
                />
                <Controls showInteractive={false} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(node) => {
                    const p = (node.data as StepNodeData | undefined)?.paso;
                    return p ? TIPO_PASO_META[p.tipo_paso].accent : '#52555E';
                  }}
                  maskColor="rgba(236, 236, 233, 0.7)"
                />
              </ReactFlow>
            </div>

            {/* Leyenda de corrientes */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule bg-stone-surface px-4 py-2.5 text-[13px] text-ink-muted">
              <div className="flex flex-wrap items-center gap-4">
                {activeCorrienteTypes.map((tipo) => {
                  const s = TIPO_CORRIENTE_STYLE[tipo];
                  return (
                    <span key={tipo} className="inline-flex items-center gap-2">
                      <span
                        className="inline-block w-5"
                        style={{
                          borderTop: `2px ${s.dashed ? 'dashed' : 'solid'} ${s.color}`,
                        }}
                      />
                      <span>{s.label}</span>
                    </span>
                  );
                })}
              </div>
              <span className="tabular-nums">
                {pasos.length} etapas · {conexiones.length} corrientes desde JSON
              </span>
            </div>
          </div>

          {/* Panel inspector del paso seleccionado */}
          <aside
            aria-label="Detalle del paso de proceso seleccionado"
            className="flex flex-col border border-rule bg-stone-surface lg:col-span-4"
          >
            <AnimatePresence mode="wait">
              {selectedStep && (
                <motion.div
                  key={selectedStep.paso_id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className="flex h-full flex-col justify-between"
                >
                  <div>
                    <div
                      className="h-1 w-full"
                      style={{ backgroundColor: TIPO_PASO_META[selectedStep.tipo_paso].accent }}
                    />

                    <div className="border-b border-rule px-5 py-4">
                      <p className="text-[13px] font-medium text-ink-muted tabular-nums">
                        Paso {selectedStep.orden} de {pasos.length} ·{' '}
                        {TIPO_PASO_META[selectedStep.tipo_paso].label}
                      </p>
                      <h3 className="mt-1 font-display text-[22px] font-medium leading-snug tracking-tight text-ink">
                        {selectedStep.nombre}
                      </h3>
                      <p className="mt-2 text-[15px] text-ink-muted">{selectedStep.descripcion}</p>
                    </div>

                    <div className="space-y-5 px-5 py-5">
                      {selectedStep.reaccion_balanceada && (
                        <div className="border-l-2 border-cobalt bg-stone-bg px-3.5 py-2.5">
                          <p className="text-[12px] font-medium text-ink-muted">
                            Reacción química balanceada
                          </p>
                          <p className="mt-1 font-display text-[16px] font-medium text-ink tabular-nums">
                            {selectedStep.reaccion_balanceada}
                          </p>
                        </div>
                      )}

                      {/* Condiciones operativas */}
                      <dl className="grid grid-cols-3 gap-3 border-y border-rule py-3.5 tabular-nums">
                        <div>
                          <dt className="flex items-center gap-1 text-[12px] text-ink-muted">
                            <Flame className="h-3.5 w-3.5" />
                            <span>Temp.</span>
                          </dt>
                          <dd className="mt-1 text-[14px] font-medium text-ink">
                            {selectedStep.temperatura_c
                              ? `${selectedStep.temperatura_c} °C`
                              : 'Sin datos'}
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[12px] text-ink-muted">
                            <Gauge className="h-3.5 w-3.5" />
                            <span>Presión</span>
                          </dt>
                          <dd className="mt-1 text-[14px] font-medium text-ink">
                            {selectedStep.presion_bar
                              ? `${selectedStep.presion_bar} bar`
                              : 'Sin datos'}
                          </dd>
                        </div>
                        <div>
                          <dt className="flex items-center gap-1 text-[12px] text-ink-muted">
                            <Zap className="h-3.5 w-3.5" />
                            <span>Energía</span>
                          </dt>
                          <dd className="mt-1 text-[14px] font-medium text-cobalt">
                            {selectedStep.energia.estado === 'dato'
                              ? `${selectedStep.energia.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${selectedStep.energia.unidad}`
                              : 'Sin datos'}
                          </dd>
                        </div>
                      </dl>

                      <SpeciesTable title="Reactivos / entradas" items={selectedStep.reactivos} />
                      <SpeciesTable title="Productos / salidas" items={selectedStep.productos} />

                      {selectedStep.insumos.length > 0 && (
                        <SpeciesTable title="Insumos auxiliares y servicios" items={selectedStep.insumos} />
                      )}

                      {selectedStep.subproductos.length > 0 && (
                        <SpeciesTable
                          title="Subproductos, residuos y emisiones"
                          items={selectedStep.subproductos}
                        />
                      )}

                      {(incomingEdges.length > 0 || outgoingEdges.length > 0) && (
                        <div className="border-t border-rule pt-4">
                          <h4 className="text-[13px] font-medium text-ink-muted">
                            Corrientes conectadas
                          </h4>
                          <ul className="mt-2 space-y-1.5 text-[13px]">
                            {incomingEdges.map((edge) => (
                              <li key={edge.conexion_id} className="text-ink-muted">
                                <span className="font-medium text-ink">Entra:</span>{' '}
                                {edge.corriente_nombre}
                                {edge.flujo.estado === 'dato' && (
                                  <span className="tabular-nums">
                                    {' '}
                                    ({edge.flujo.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{' '}
                                    {edge.flujo.unidad})
                                  </span>
                                )}
                              </li>
                            ))}
                            {outgoingEdges.map((edge) => (
                              <li key={edge.conexion_id} className="text-ink-muted">
                                <span className="font-medium text-ink">Sale:</span>{' '}
                                {edge.corriente_nombre}
                                {edge.flujo.estado === 'dato' && (
                                  <span className="tabular-nums">
                                    {' '}
                                    ({edge.flujo.valor.toLocaleString('es-AR', { minimumFractionDigits: 2 })}{' '}
                                    {edge.flujo.unidad})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trazabilidad completa de la etapa */}
                  <div className="border-t border-rule bg-stone-bg px-5 py-3.5 text-[13px] text-ink-muted">
                    <p className="font-medium text-ink">
                      Fuente ({selectedStep.procedencia.anio}): {selectedStep.procedencia.fuente}
                    </p>
                    <p className="mt-1">{selectedStep.procedencia.cita_ubicacion}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] tabular-nums">
                      <span>
                        Hash: {selectedStep.procedencia.hash.slice(0, 19)}...
                      </span>
                      <a
                        href={selectedStep.procedencia.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-cobalt hover:underline"
                      >
                        <span>Fuente original</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>
        </>
        )}
      </div>
    </MotionConfig>
  );
}
