import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
    const stored = localStorage.getItem('gf-theme');
    if (stored === 'dark') {
        return 'dark';
    }
    if (stored === 'light') {
        return 'light';
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('gf-theme', theme);
    }, [theme]);

    function toggleTheme() {
        setTheme((current) => {
            if (current === 'dark') {
                return 'light';
            }
            return 'dark';
        });
    }

    return { theme, toggleTheme };
}