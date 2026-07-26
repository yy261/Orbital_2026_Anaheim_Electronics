import { BaseEdge, getSmoothStepPath, Position, type EdgeProps } from 'reactflow';

// A custom edge for the electrical canvas that makes wiring far more readable:
//
//  1. Forward wires (source is left of target) route as orthogonal smoothstep
//     lines, each nudged into one of several "lanes" so that parallel runs no
//     longer stack exactly on top of one another.
//  2. Backward / return wires (source is right of target — e.g. the loop back
//     to the voltage source's left terminal) are routed AROUND the bottom of
//     the diagram instead of straight across the middle, so they stop cutting
//     through the components in between.
//
// React Flow has no built-in obstacle avoidance, so this is a heuristic rather
// than a full autorouter, but it removes the two worst sources of clutter.

// A small stable hash of the edge id → a lane index, so a given wire always
// picks the same lane (no jitter on re-render).
function hashId(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i = i + 1) {
        h = (h * 31 + id.charCodeAt(i)) & 0xffff;
    }
    return h;
}

// Spread parallel forward wires across a few offsets.
function laneOffset(id: string): number {
    const lanes = [12, 22, 32, 42, 52];
    return lanes[hashId(id) % lanes.length];
}

export default function ElectricalWire(props: EdgeProps) {
    const {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        markerEnd,
        style,
    } = props;

    const wireStyle = { stroke: 'var(--line, #9a8f78)', strokeWidth: 2, ...style };

    // Treat a clearly right-to-left edge as a "return" wire and route it under
    // everything. The 40px threshold avoids catching near-vertical wires.
    const isReturn = sourceX - targetX > 40;

    if (isReturn === true) {
        const off = 26;
        // Drop below whichever endpoint is lower, with clearance.
        const dipY = Math.max(sourceY, targetY) + 90;
        // Step out from each handle in the direction it faces, then run along
        // the bottom lane and back up. Rounded corners via short arcs.
        const sOut = sourcePosition === Position.Left ? sourceX - off : sourceX + off;
        const tOut = targetPosition === Position.Left ? targetX - off : targetX + off;
        const path = [
            `M ${sourceX},${sourceY}`,
            `L ${sOut},${sourceY}`,
            `L ${sOut},${dipY}`,
            `L ${tOut},${dipY}`,
            `L ${tOut},${targetY}`,
            `L ${targetX},${targetY}`,
        ].join(' ');
        return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={wireStyle} />;
    }

    const [path] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 8,
        offset: laneOffset(id),
    });

    return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={wireStyle} />;
}
