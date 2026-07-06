import { defineConfig } from 'vitest/config';

// Vitest configuration for the server-side simulation engines.
// Tests live next to the source in src/**/__tests__ and run in a Node
// environment (the engines are pure functions — no DOM needed).
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
