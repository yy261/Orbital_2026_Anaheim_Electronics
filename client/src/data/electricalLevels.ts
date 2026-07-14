// Electrical learning levels.
//
// Unlike logic levels (which validate a truth table), an electrical level is
// validated against the SIMULATED result of the circuit the user builds: which
// LEDs ended up lit, plus which component types the circuit contains. Levels
// unlock in order, the same way logic levels do, and completion is stored in
// the same Firestore `progress` collection (ids are prefixed `elec_level_` so
// they never collide with the logic level ids).

import type { ElectricalComponentType } from '../types/circuit';

// A declarative, machine-checkable success condition for a level.
export type ElectricalGoal = {
    // At least this many LEDs must be lit. Defaults to 1 when allLedsLit is not set.
    minLitLeds?: number;
    // Every LED on the canvas must be lit.
    allLedsLit?: boolean;
    // Minimum count of each component type the circuit must contain.
    requireComponents?: Partial<Record<ElectricalComponentType, number>>;
};

export type ElectricalLevel = {
    id: string;
    title: string;
    description: string;
    objective: string;
    goal: ElectricalGoal;
};

export const ELECTRICAL_LEVELS: ElectricalLevel[] = [
    {
        id: 'elec_level_1',
        title: 'Close the Loop',
        description:
            'Current only flows around a complete loop. Connect a voltage source to an LED and back again.',
        objective:
            'Wire a voltage source to an LED in a complete loop (source terminal_b → LED → back to source terminal_a) so the LED lights.',
        goal: { minLitLeds: 1 },
    },
    {
        id: 'elec_level_2',
        title: 'Current Limiting',
        description:
            'A resistor limits how much current flows. Light an LED with a resistor in series.',
        objective: 'Light an LED, but place a resistor in series with it in the loop.',
        goal: { minLitLeds: 1, requireComponents: { RESISTOR: 1 } },
    },
    {
        id: 'elec_level_3',
        title: 'The Switch',
        description:
            'A switch opens or closes the circuit. Add a switch that turns the LED on when closed.',
        objective: 'Add a switch in series with the LED and close it so the LED lights.',
        goal: { minLitLeds: 1, requireComponents: { SWITCH: 1 } },
    },
    {
        id: 'elec_level_4',
        title: 'Two in Series',
        description:
            'In a series circuit the same current flows through every component. Light two LEDs in series.',
        objective: 'Wire two LEDs in series in a single loop so that both light up.',
        goal: { allLedsLit: true, requireComponents: { LED: 2 } },
    },
    {
        id: 'elec_level_5',
        title: 'Protected Pair',
        description:
            'Combine what you have learned: two LEDs and a resistor, all working together.',
        objective: 'Light two LEDs while including a resistor in the circuit. Both LEDs must be lit.',
        goal: { allLedsLit: true, requireComponents: { LED: 2, RESISTOR: 1 } },
    },
    {
        id: 'elec_level_6',
        title: 'Full Control',
        description:
            'The complete picture: a switch, a resistor, and two LEDs — all lit, all under control.',
        objective:
            'Build a circuit with a switch, a resistor, and two LEDs. Close the switch so both LEDs light.',
        goal: { allLedsLit: true, requireComponents: { LED: 2, RESISTOR: 1, SWITCH: 1 } },
    },
];

// The shape of a simulated component result (from applyElecResults / the API).
export type ElecValue = { voltage: number; current: number; lit?: boolean };

// The minimal node shape the validator needs (id + type).
export type ElecNodeLike = { id: string; type?: string };

export type ElecValidationResult = { status: 'pass' } | { status: 'fail'; message: string };

// Human-readable component names for messages.
const COMPONENT_NAMES: Record<string, string> = {
    VOLTAGE_SOURCE: 'voltage source',
    RESISTOR: 'resistor',
    LED: 'LED',
    SWITCH: 'switch',
};

// Validates the simulated result of an electrical circuit against a level goal.
// Pure function — easy to unit test and reuse.
export function validateElectrical(
    values: Record<string, ElecValue>,
    nodes: ElecNodeLike[],
    goal: ElectricalGoal
): ElecValidationResult {
    // 1. Required components present?
    if (goal.requireComponents !== undefined) {
        for (const key of Object.keys(goal.requireComponents)) {
            const type = key as ElectricalComponentType;
            const needed = goal.requireComponents[type] ?? 0;
            const have = nodes.filter((n) => n.type === type).length;
            if (have < needed) {
                const name = COMPONENT_NAMES[type] ?? type;
                let plural = '';
                if (needed !== 1) {
                    plural = 's';
                }
                return {
                    status: 'fail',
                    message: `This level needs at least ${needed} ${name}${plural}, but your circuit has ${have}.`,
                };
            }
        }
    }

    // 2. LED lighting condition.
    const ledNodes = nodes.filter((n) => n.type === 'LED');
    if (ledNodes.length === 0) {
        return { status: 'fail', message: 'Add an LED to your circuit — a level is complete when the LED lights.' };
    }

    const litCount = ledNodes.filter((n) => values[n.id]?.lit === true).length;

    if (goal.allLedsLit === true) {
        if (litCount < ledNodes.length) {
            return {
                status: 'fail',
                message: `All LEDs must be lit. ${litCount} of ${ledNodes.length} are on — check your wiring and that any switch is closed.`,
            };
        }
        return { status: 'pass' };
    }

    let minLit = 1;
    if (goal.minLitLeds !== undefined) {
        minLit = goal.minLitLeds;
    }
    if (litCount < minLit) {
        return {
            status: 'fail',
            message: `The LED is not lit. Make sure the loop is complete, any switch is closed, and the source is connected.`,
        };
    }
    return { status: 'pass' };
}
