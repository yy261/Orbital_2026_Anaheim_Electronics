import type { DragEvent } from 'react';
import type { GateType } from '../../types/circuit';

// Left-hand palette. The user drags an entry onto the canvas. LogicCanvas
// handles the actual drop (via onDragOver/onDrop) and asks the store to
// create the node. 
//
// The drag payload format is "<kind>" or "GATE:<gateType>":
//   - "INPUT"
//   - "OUTPUT"
//   - "GATE:AND" etc.
//
// Visual sizing: each tile is rendered at the same dimensions as the placed
// node it represents (min-w-[88px] px-5 py-3). This means the browser's
// default drag image — which is a translucent snapshot of the source
// element — already matches what the user is about to drop. No size jump
// at the moment of placement.

const GATES: GateType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'];

function onDragStart(e: DragEvent<HTMLDivElement>, payload: string) {
    e.dataTransfer.setData('application/reactflow', payload);
    e.dataTransfer.effectAllowed = 'move';
}

// Mini-preview tile that mirrors GateNode visuals (without React Flow handles
// — we don't need wire stubs on the palette).
function GateTile({ gateType }: { gateType: GateType }) {
    return (
        <div
            onDragStart={(e) => onDragStart(e, `GATE:${gateType}`)}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border-2 border-gray-400 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
        >
            <div>{gateType}</div>
            <div className="mx-auto mt-1 h-2.5 w-2.5 rounded-full bg-gray-300" />
        </div>
    );
}

// Matches InputNode dimensions and colour scheme (LOW state).
function InputTile() {
    return (
        <div
            onDragStart={(e) => onDragStart(e, 'INPUT')}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border-2 border-gray-400 bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-300"
        >
            <div>IN</div>
            <div className="text-[10px] font-normal opacity-80">LOW</div>
        </div>
    );
}

// Matches OutputNode dimensions (off state).
function OutputTile() {
    return (
        <div
            onDragStart={(e) => onDragStart(e, 'OUTPUT')}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border-2 border-gray-400 bg-white px-5 py-3 shadow-sm hover:bg-gray-50"
        >
            <div className="h-5 w-5 rounded-full bg-gray-300" />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                OUT
            </div>
        </div>
    );
}

export default function GatePalette() {
    return (
        <aside className="flex w-44 flex-col gap-3 overflow-y-auto border-r border-gray-200 bg-white p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sources
            </div>
            <InputTile />

            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sinks
            </div>
            <OutputTile />

            <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Gates
            </div>
            {GATES.map((g) => {
                return <GateTile key={g} gateType={g} />;
            })}

            <div className="mt-auto text-[10px] leading-snug text-gray-400">
                Drag onto canvas · click IN to toggle · Ctrl+C / Ctrl+V to duplicate · Backspace to delete
            </div>
        </aside>
    );
}
