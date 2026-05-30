import { useCallback, useMemo, useRef } from 'react';
import type { DragEvent } from 'react';
import ReactFlow, {
    Background,
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

// React Flow needs the node-type registry as a stable reference, otherwise
// it warns every render. Defined outside the component so the object
// identity doesn't change between renders.
const nodeTypes = {
    GATE: GateNode,
    INPUT: InputNode,
    OUTPUT: OutputNode,
};

// Right-angled (orthogonal) wires. `smoothstep` rounds the corners slightly
// so they read as "circuit-board-ish" rather than blocky. Note: this does
// NOT pathfind around other nodes — if a wire visually overlaps a node,
// drag that node aside and the wire reroutes.
const defaultEdgeOptions: DefaultEdgeOptions = {
    type: 'smoothstep',
};

// Inner component runs INSIDE the ReactFlowProvider so it can use
// `useReactFlow().screenToFlowPosition` for converting drop coordinates.
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

    // onDragOver must call preventDefault() otherwise the browser refuses
    // to fire onDrop. This is a known HTML5 drag-and-drop quirk.
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

            // Convert mouse coordinates into flow (canvas) coordinates so
            // the new node lands where the cursor was, even after pan/zoom.
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
            >
                <Background />
                <Controls />
                <MiniMap pannable zoomable />
            </ReactFlow>
        </div>
    );
}

// Wraps Inner in the provider so useReactFlow() works.
export default function LogicCanvas() {
    return (
        <ReactFlowProvider>
            <Inner />
        </ReactFlowProvider>
    );
}
