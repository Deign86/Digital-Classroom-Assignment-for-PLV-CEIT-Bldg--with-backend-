import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useDarkMode() {
    const [theme, setTheme] = useState<Theme>('system');

    useEffect(() => {
        // Check local storage on mount
        const stored = localStorage.getItem('smartDarkMode');
        // Migration from boolean to string if necessary, or just load string
        if (stored === 'true') {
            setTheme('dark');
        } else if (stored === 'false') {
            setTheme('light');
        } else if (stored === 'system' || stored === 'light' || stored === 'dark') {
            setTheme(stored as Theme);
        } else {
            setTheme('system');
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = () => {
            if (theme === 'dark') {
                root.classList.add('smart-dark-mode');
            } else if (theme === 'light') {
                root.classList.remove('smart-dark-mode');
            } else if (theme === 'system') {
                if (mediaQuery.matches) {
                    root.classList.add('smart-dark-mode');
                } else {
                    root.classList.remove('smart-dark-mode');
                }
            }
        };

        applyTheme();
        localStorage.setItem('smartDarkMode', theme);

        // Listener for system changes
        const handleChange = () => {
            if (theme === 'system') {
                applyTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    return { theme, setTheme };
}
