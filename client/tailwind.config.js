/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                paper: 'var(--paper)',
                surface: 'var(--surface)',
                sunken: 'var(--sunken)',
                ink: 'var(--ink)',
                muted: 'var(--muted)',
                line: 'var(--line)',
                accent: 'var(--accent)',
                'accent-ink': 'var(--accent-ink)',
                scope: 'var(--scope)',
                danger: 'var(--danger)',
            },
            fontFamily: {
                display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
                mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
            },
            boxShadow: {
                glow: '0 0 18px var(--glow)',
                lift: '0 1px 2px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.05)',
            },
        },
    },
    plugins: [],
};