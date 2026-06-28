import type { DragEvent } from 'react';

// Left-hand palette for the electrical canvas. Drag payload format: "ELEC:<TYPE>"
// where TYPE is one of VOLTAGE_SOURCE | RESISTOR | LED | SWITCH.

function onDragStart(e: DragEvent<HTMLDivElement>, payload: string) {
    e.dataTransfer.setData('application/reactflow', payload);
    e.dataTransfer.effectAllowed = 'move';
}

function ComponentTile({ type, label, sub }: { type: string; label: string; sub: string }) {
    return (
        <div
            onDragStart={(e) => onDragStart(e, `ELEC:${type}`)}
            draggable
            className="flex min-w-[88px] cursor-grab flex-col items-center justify-center rounded-md border border-line bg-surface px-4 py-3 font-display text-sm font-bold tracking-wide text-ink shadow-lift transition-colors hover:border-accent"
        >
            <div>{label}</div>
            <div className="mt-1 font-mono text-[10px] font-normal text-muted">{sub}</div>
        </div>
    );
}

export default function ElectricalPalette() {
    return (
        <aside className="flex w-48 flex-col gap-3 overflow-y-auto border-r border-line bg-paper p-4">
            <div className="gf-label">Sources</div>
            <ComponentTile type="VOLTAGE_SOURCE" label="V SRC" sub="5V DC" />

            <div className="gf-label mt-2">Components</div>
            <ComponentTile type="RESISTOR" label="RES" sub="100Ω" />
            <ComponentTile type="LED" label="LED" sub="diode" />
            <ComponentTile type="SWITCH" label="SW" sub="toggle" />

            <div className="mt-auto border-t border-line pt-3 text-[10px] leading-snug text-muted">
                Wire terminal_b → terminal_a · complete the loop back to V SRC · click SW to toggle
            </div>
        </aside>
    );
}