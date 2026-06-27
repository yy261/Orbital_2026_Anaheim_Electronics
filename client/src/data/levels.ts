// Each level defines an objective and the expected truth table.
// Validation compares the user's simulated truth table against this.
// Levels unlock in order — level N requires level N-1 to be completed.

export type ExpectedRow = {
    inputs: boolean[];
    outputs: boolean[];
};

export type Level = {
    id: string;
    title: string;
    description: string;
    objective: string;
    inputCount: number;
    outputCount: number;
    expectedRows: ExpectedRow[];
};

export const LEVELS: Level[] = [
    {
        id: 'level_1',
        title: 'The AND Gate',
        description:
            'The AND gate outputs HIGH only when all inputs are HIGH. Start with two inputs and one AND gate.',
        objective: 'Build a circuit where the output is HIGH only when both inputs A and B are HIGH.',
        inputCount: 2,
        outputCount: 1,
        expectedRows: [
            { inputs: [false, false], outputs: [false] },
            { inputs: [false, true], outputs: [false] },
            { inputs: [true, false], outputs: [false] },
            { inputs: [true, true], outputs: [true] },
        ],
    },
    {
        id: 'level_2',
        title: 'The OR Gate',
        description:
            'The OR gate outputs HIGH when at least one input is HIGH.',
        objective: 'Build a circuit where the output is HIGH when either input A or B (or both) is HIGH.',
        inputCount: 2,
        outputCount: 1,
        expectedRows: [
            { inputs: [false, false], outputs: [false] },
            { inputs: [false, true], outputs: [true] },
            { inputs: [true, false], outputs: [true] },
            { inputs: [true, true], outputs: [true] },
        ],
    },
    {
        id: 'level_3',
        title: 'The NOT Gate',
        description:
            'The NOT gate inverts its input — HIGH becomes LOW, LOW becomes HIGH.',
        objective: 'Build a circuit with one input where the output is the inverse of the input.',
        inputCount: 1,
        outputCount: 1,
        expectedRows: [
            { inputs: [false], outputs: [true] },
            { inputs: [true], outputs: [false] },
        ],
    },
    {
        id: 'level_4',
        title: 'The NAND Gate',
        description:
            'NAND is "NOT AND" — it outputs LOW only when all inputs are HIGH. You can build it using AND + NOT, or use the NAND gate directly.',
        objective: 'Build a circuit where the output is LOW only when both inputs are HIGH.',
        inputCount: 2,
        outputCount: 1,
        expectedRows: [
            { inputs: [false, false], outputs: [true] },
            { inputs: [false, true], outputs: [true] },
            { inputs: [true, false], outputs: [true] },
            { inputs: [true, true], outputs: [false] },
        ],
    },
    {
        id: 'level_5',
        title: 'The NOR Gate',
        description:
            'NOR is "NOT OR" — it outputs HIGH only when all inputs are LOW.',
        objective: 'Build a circuit where the output is HIGH only when both inputs are LOW.',
        inputCount: 2,
        outputCount: 1,
        expectedRows: [
            { inputs: [false, false], outputs: [true] },
            { inputs: [false, true], outputs: [false] },
            { inputs: [true, false], outputs: [false] },
            { inputs: [true, true], outputs: [false] },
        ],
    },
    {
        id: 'level_6',
        title: 'The XOR Gate',
        description:
            'XOR outputs HIGH when the inputs are different, and LOW when they are the same.',
        objective: 'Build a circuit where the output is HIGH only when exactly one input is HIGH.',
        inputCount: 2,
        outputCount: 1,
        expectedRows: [
            { inputs: [false, false], outputs: [false] },
            { inputs: [false, true], outputs: [true] },
            { inputs: [true, false], outputs: [true] },
            { inputs: [true, true], outputs: [false] },
        ],
    },
    {
        id: 'level_7',
        title: 'NAND from AND + NOT',
        description:
            'Build a NAND gate without using the NAND block. Use only AND and NOT gates to achieve the same truth table.',
        objective: 'Produce the NAND truth table using only AND and NOT gates — no NAND gate allowed.',
        inputCount: 2,
        outputCount: 1,
        expectedRows: [
            { inputs: [false, false], outputs: [true] },
            { inputs: [false, true], outputs: [true] },
            { inputs: [true, false], outputs: [true] },
            { inputs: [true, true], outputs: [false] },
        ],
    },
    {
        id: 'level_8',
        title: 'The Half Adder',
        description:
            'A half adder adds two single bits. It has two outputs: Sum (the XOR of the inputs) and Carry (the AND of the inputs).',
        objective: 'Build a circuit with two inputs and two outputs. The first output is the Sum (XOR), the second is the Carry (AND).',
        inputCount: 2,
        outputCount: 2,
        expectedRows: [
            { inputs: [false, false], outputs: [false, false] },
            { inputs: [false, true], outputs: [true, false] },
            { inputs: [true, false], outputs: [true, false] },
            { inputs: [true, true], outputs: [false, true] },
        ],
    },
];