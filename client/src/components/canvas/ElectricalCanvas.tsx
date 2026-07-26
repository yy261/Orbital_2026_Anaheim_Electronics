import { useCallback, useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type DefaultEdgeOptions,
    type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useAppStore } from '../../store';
import type { ElectricalComponentType } from '../../types/circuit';
import {
    VoltageSourceNode,
    ResistorNode,
    LEDNode,
    SwitchNode,
} from './nodes/ElectricalNodes';
import ElectricalWire from './ElectricalWire';

const nodeTypes = {
    VOLTAGE_SOURCE: VoltageSourceNode,
    RESISTOR: ResistorNode,
    LED: LEDNode,
    SWITCH: SwitchNode,
};

// Custom edge that spreads parallel wires into lanes and routes return wires
// (e.g. back to the voltage source) around the bottom instead of straight
// across the middle of the circuit — see ElectricalWire.tsx.
const edgeTypes = {
    electrical: ElectricalWire,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
    type: 'electrical',
};

function Inner() {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const rfInstance = useRef<ReactFlowInstance | null>(null);

    const elecNodes = useAppStore((s) => s.elecNodes);
    const elecEdges = useAppStore((s) => s.elecEdges);
    const onElecNodesChange = useAppStore((s) => s.onElecNodesChange);
    const onElecEdgesChange = useAppStore((s) => s.onElecEdgesChange);
    const onElecConnect = useAppStore((s) => s.onElecConnect);
    const addElecComponent = useAppStore((s) => s.addElecComponent);

    const { screenToFlowPosition } = useReactFlow();

    const onDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            const payload = event.dataTransfer.getData('application/reactflow');
            if (!payload) {
                return;
            }
            if (!payload.startsWith('ELEC:')) {
                return;
            }

            const compType = payload.slice('ELEC:'.length) as ElectricalComponentType;
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            addElecComponent(compType, position);
        },
        [addElecComponent, screenToFlowPosition]
    );

    const nodeTypesMemo = useMemo(() => nodeTypes, []);
    const edgeTypesMemo = useMemo(() => edgeTypes, []);

    return (
        <div ref={wrapperRef} className="h-full w-full">
            <ReactFlow
                nodes={elecNodes}
                edges={elecEdges}
                onNodesChange={onElecNodesChange}
                onEdgesChange={onElecEdgesChange}
                onConnect={onElecConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={(inst) => (rfInstance.current = inst)}
                nodeTypes={nodeTypesMemo}
                edgeTypes={edgeTypesMemo}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineType={ConnectionLineType.SmoothStep}
                snapToGrid
                snapGrid={[16, 16]}
                fitView
                deleteKeyCode={['Backspace', 'Delete']}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={24}
                    size={1}
                    color="var(--line)"
                />
                <Controls
                    className="!border !border-line !bg-surface"
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                />
                <MiniMap
                    pannable
                    zoomable
                    maskColor="var(--grid-dot)"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--line)',
                        borderRadius: 8,
                    }}
                    nodeColor="var(--muted)"
                />
            </ReactFlow>
        </div>
    );
}

export default function ElectricalCanvas() {
    return (
        <ReactFlowProvider>
            <Inner />
        </ReactFlowProvider>
    );
}
