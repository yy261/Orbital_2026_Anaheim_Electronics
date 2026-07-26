// Preset scenarios for the Compare page.
//
// Each non-free scenario defines BOTH an electrical circuit (left canvas) and
// its logic-gate equivalent (right canvas). Selecting a scenario loads both,
// so the two domains sit side by side and can be simulated together:
//
//   Switch → LED            ≡  buffer (a single input drives the output)
//   Two switches in series  ≡  AND    (both must be closed / HIGH)
//   Two switches in parallel≡  OR     (either one is enough)
//
// Electrical wiring convention (see ElectricalNodes.tsx): every component has
// terminal_a (left, target) and terminal_b (right, source). Edges run
// terminal_b → terminal_a, looping back to the voltage source's terminal_a.
// Logic wiring: INPUT/GATE outputs use the default handle; gate inputs are
// in-0, in-1 (see GateNode.tsx).

import type { Edge, Node } from 'reactflow';
import type { AnyNodeData } from '../types/circuit';

export type ScenarioCircuits = {
    elecNodes: Node<AnyNodeData>[];
    elecEdges: Edge[];
    logicNodes: Node<AnyNodeData>[];
    logicEdges: Edge[];
};

export type Scenario = {
    id: string;
    name: string;
    description: string;
    // null for the free-build scenario, which loads nothing.
    build: (() => ScenarioCircuits) | null;
};

// ----- Electrical node factories (defaults mirror store.addElecComponent) -----

function vSource(id: string, label: string, x: number, y: number): Node<AnyNodeData> {
    return {
        id,
        type: 'VOLTAGE_SOURCE',
        position: { x, y },
        data: { label, voltage: 5, computedCurrent: null },
    };
}

function led(id: string, label: string, x: number, y: number): Node<AnyNodeData> {
    return {
        id,
        type: 'LED',
        position: { x, y },
        data: { label, threshold: 0.01, lit: null, computedVoltage: null, computedCurrent: null },
    };
}

function sw(id: string, label: string, closed: boolean, x: number, y: number): Node<AnyNodeData> {
    return {
        id,
        type: 'SWITCH',
        position: { x, y },
        data: { label, closed },
    };
}

function elecEdge(id: string, source: string, target: string): Edge {
    return {
        id,
        source,
        sourceHandle: 'terminal_b',
        target,
        targetHandle: 'terminal_a',
        type: 'electrical',
    };
}

// ----- Logic node factories -----

function input(id: string, label: string, value: boolean, x: number, y: number): Node<AnyNodeData> {
    return {
        id,
        type: 'INPUT',
        position: { x, y },
        data: { label, value, output: null },
    };
}

function gate(id: string, gateType: 'AND' | 'OR', x: number, y: number): Node<AnyNodeData> {
    return {
        id,
        type: 'GATE',
        position: { x, y },
        data: { gateType, output: null },
    };
}

function output(id: string, label: string, x: number, y: number): Node<AnyNodeData> {
    return {
        id,
        type: 'OUTPUT',
        position: { x, y },
        data: { label, output: null },
    };
}

function logicEdge(id: string, source: string, target: string, targetHandle: string | null): Edge {
    const edge: Edge = { id, source, target };
    if (targetHandle !== null) {
        edge.targetHandle = targetHandle;
    }
    return edge;
}

// ----- Scenario builders -----

function buildSwitchLed(): ScenarioCircuits {
    return {
        elecNodes: [
            vSource('elec_1', 'V1', 40, 120),
            sw('elec_2', 'SW1', true, 240, 120),
            led('elec_3', 'LED1', 440, 120),
        ],
        elecEdges: [
            elecEdge('ce_1', 'elec_1', 'elec_2'),
            elecEdge('ce_2', 'elec_2', 'elec_3'),
            elecEdge('ce_3', 'elec_3', 'elec_1'),
        ],
        // Buffer: one input straight to the output.
        logicNodes: [input('in_1', 'A', true, 60, 120), output('out_2', 'Y1', 320, 120)],
        logicEdges: [logicEdge('cl_1', 'in_1', 'out_2', null)],
    };
}

function buildSeriesAnd(): ScenarioCircuits {
    return {
        elecNodes: [
            vSource('elec_1', 'V1', 40, 140),
            sw('elec_2', 'SW1', true, 200, 140),
            sw('elec_3', 'SW2', true, 360, 140),
            led('elec_4', 'LED1', 520, 140),
        ],
        elecEdges: [
            elecEdge('ce_1', 'elec_1', 'elec_2'),
            elecEdge('ce_2', 'elec_2', 'elec_3'),
            elecEdge('ce_3', 'elec_3', 'elec_4'),
            elecEdge('ce_4', 'elec_4', 'elec_1'),
        ],
        logicNodes: [
            input('in_1', 'A', true, 40, 60),
            input('in_2', 'B', true, 40, 200),
            gate('gate_3', 'AND', 260, 130),
            output('out_4', 'Y1', 460, 130),
        ],
        logicEdges: [
            logicEdge('cl_1', 'in_1', 'gate_3', 'in-0'),
            logicEdge('cl_2', 'in_2', 'gate_3', 'in-1'),
            logicEdge('cl_3', 'gate_3', 'out_4', null),
        ],
    };
}

function buildParallelOr(): ScenarioCircuits {
    return {
        elecNodes: [
            vSource('elec_1', 'V1', 40, 150),
            sw('elec_2', 'SW1', true, 260, 60),
            sw('elec_3', 'SW2', false, 260, 240),
            led('elec_4', 'LED1', 480, 150),
        ],
        // Both switches share the source-side and LED-side junctions → parallel.
        elecEdges: [
            elecEdge('ce_1', 'elec_1', 'elec_2'),
            elecEdge('ce_2', 'elec_1', 'elec_3'),
            elecEdge('ce_3', 'elec_2', 'elec_4'),
            elecEdge('ce_4', 'elec_3', 'elec_4'),
            elecEdge('ce_5', 'elec_4', 'elec_1'),
        ],
        logicNodes: [
            input('in_1', 'A', true, 40, 60),
            input('in_2', 'B', false, 40, 200),
            gate('gate_3', 'OR', 260, 130),
            output('out_4', 'Y1', 460, 130),
        ],
        logicEdges: [
            logicEdge('cl_1', 'in_1', 'gate_3', 'in-0'),
            logicEdge('cl_2', 'in_2', 'gate_3', 'in-1'),
            logicEdge('cl_3', 'gate_3', 'out_4', null),
        ],
    };
}

export const SCENARIOS: Scenario[] = [
    {
        id: 'free',
        name: 'Free Build',
        description: 'Build any circuit on either side.',
        build: null,
    },
    {
        id: 'switch_led',
        name: 'Switch → LED',
        description: 'One switch controls an LED. Equivalent to a buffer / single input.',
        build: buildSwitchLed,
    },
    {
        id: 'series',
        name: 'Two Switches in Series',
        description: 'Both switches must be closed for current to flow. Equivalent to AND.',
        build: buildSeriesAnd,
    },
    {
        id: 'parallel',
        name: 'Two Switches in Parallel',
        description: 'Either switch lights the LED. Equivalent to OR.',
        build: buildParallelOr,
    },
];
