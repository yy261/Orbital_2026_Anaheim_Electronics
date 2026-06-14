import { useCallback, useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type DefaultEdgeOptions,
    type ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useAppStore } from '../../store';
import type { GateType } from '../../types/circuit';
import GateNode from './nodes/GateNode';
import InputNode from './nodes/InputNode';
import OutputNode from './nodes/OutputNode';

const nodeTypes = {
    GATE: GateNode,
    INPUT: InputNode,
    OUTPUT: OutputNode,
};

// Right-angled wires. smoothstep rounds the corners slightly for the
// circuit-board look. Does not pathfind around nodes — drag a node aside if a
// wire overlaps it.
const defaultEdgeOptions: DefaultEdgeOptions = {
    type: 'smoothstep',
};

function Inner() {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const rfInstance = useRef<ReactFlowInstance | null>(null);

    const nodes = useAppStore((s) => s.nodes);
    const edges = useAppStore((s) => s.edges);
    const onNodesChange = useAppStore((s) => s.onNodesChange);
    const onEdgesChange = useAppStore((s) => s.onEdgesChange);
    const onConnect = useAppStore((s) => s.onConnect);
    const addGate = useAppStore((s) => s.addGate);
    const addInput = useAppStore((s) => s.addInput);
    const addOutput = useAppStore((s) => s.addOutput);

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

            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            if (payload === 'INPUT') {
                addInput(position);
                return;
            }

            if (payload === 'OUTPUT') {
                addOutput(position);
                return;
            }

            if (payload.startsWith('GATE:')) {
                const gateType = payload.slice('GATE:'.length) as GateType;
                addGate(gateType, position);
                return;
            }
        },
        [addGate, addInput, addOutput, screenToFlowPosition]
    );

    const nodeTypesMemo = useMemo(() => nodeTypes, []);

    return (
        <div ref={wrapperRef} className="h-full w-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={(inst) => (rfInstance.current = inst)}
                nodeTypes={nodeTypesMemo}
                defaultEdgeOptions={defaultEdgeOptions}
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

export default function LogicCanvas() {
    return (
        <ReactFlowProvider>
            <Inner />
        </ReactFlowProvider>
    );
}