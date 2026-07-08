import { defineConfig } from 'vitest/config';

// Vitest configuration for the client.
// jsdom is used because some tested modules import reactflow (which expects a
// DOM); the tests themselves do not render components. No Firebase or network
// is touched — Firestore access is mocked in the tests that need it.
export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['src/**/*.test.ts'],
        css: false,
    },
});