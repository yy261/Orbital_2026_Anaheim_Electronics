import type { DragEvent } from 'react';
import type { GateType } from '../../types/circuit';
import { useAppStore } from '../../store';

// Left-hand palette. The user drags an entry onto the canvas. LogicCanvas
// handles the actual drop (via onDragOver/onDrop) and asks the store to
// create the node.
//
// The drag payload format is "<kind>" or "GATE:<gateType>" or "CUSTOM:<id>":
//   - "INPUT"
//   - "OUTPUT"
//   - "GATE:AND" etc.
//   - "CUSTOM:<componentId>"
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

// Tile sizing mirrors the placed nodes so the browser's drag ghost matches
// what gets dropped.
function GateTile({ gateType }: { gateType: GateType }) {
    return (
        <div
            onDragStart={(e) => onDragStart(e, `GATE:${gateType}`)}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border border-line bg-surface px-5 py-3 font-display text-sm font-bold tracking-wide text-ink shadow-lift transition-colors hover:border-accent"
        >
            <div>{gateType}</div>
            <div className="mx-auto mt-1 h-2.5 w-2.5 rounded-full bg-sunken" />
        </div>
    );
}

function InputTile() {
    return (
        <div
            onDragStart={(e) => onDragStart(e, 'INPUT')}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border border-line bg-sunken px-5 py-3 font-mono text-sm font-semibold text-muted shadow-lift transition-colors hover:border-accent"
        >
            <div>IN</div>
            <div className="text-[10px] font-normal opacity-80">LOW</div>
        </div>
    );
}

function OutputTile() {
    return (
        <div
            onDragStart={(e) => onDragStart(e, 'OUTPUT')}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border border-line bg-surface px-5 py-3 shadow-lift transition-colors hover:border-accent"
        >
            <div className="h-5 w-5 rounded-full bg-sunken" />
            <div className="gf-label mt-1">OUT</div>
        </div>
    );
}

export default function GatePalette() {
    const customComponents = useAppStore((s) => s.customComponents);

    return (
        <aside className="flex w-48 flex-col gap-3 overflow-y-auto border-r border-line bg-paper p-4">
            <div className="gf-label">Sources</div>
            <InputTile />

            <div className="gf-label mt-2">Sinks</div>
            <OutputTile />

            <div className="gf-label mt-2">Gates</div>
            {GATES.map((g) => {
                return <GateTile key={g} gateType={g} />;
            })}

            {customComponents.length > 0 && (
                <>
                    <div className="gf-label mt-2">Custom</div>
                    {customComponents.map((comp) => (
                        <div
                            key={comp.id}
                            onDragStart={(e) => onDragStart(e, `CUSTOM:${comp.id}`)}
                            draggable
                            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border-2 border-dashed border-line bg-surface px-4 py-3 font-display text-sm font-bold tracking-wide text-ink shadow-lift transition-colors hover:border-accent"
                        >
                            <div className="text-xs">{comp.name}</div>
                            <div className="mt-1 font-mono text-[9px] text-muted">
                                {comp.inputLabels.length}→{comp.outputLabels.length}
                            </div>
                        </div>
                    ))}
                </>
            )}

            <div className="mt-auto border-t border-line pt-3 text-[10px] leading-snug text-muted">
                Drag onto canvas · click IN to toggle · Ctrl+C / Ctrl+V to duplicate · Backspace to delete
            </div>
        </aside>
    );
}