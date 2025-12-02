import { useEffect, useState } from 'react';
import { logger } from '../lib/logger';

type Theme = 'light' | 'dark' | 'system';

// Initialize theme from localStorage synchronously to prevent flash
const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'system';
    
    try {
        const stored = localStorage.getItem('smartDarkMode');
        logger.debug('[useDarkMode] Reading from localStorage:', stored);
        
        // Migration from boolean to string if necessary, or just load string
        if (stored === 'true') {
            return 'dark';
        } else if (stored === 'false') {
            return 'light';
        } else if (stored === 'system' || stored === 'light' || stored === 'dark') {
            return stored as Theme;
        }
    } catch (e) {
        logger.error('[useDarkMode] Failed to read from localStorage:', e);
    }
    
    logger.debug('[useDarkMode] No stored theme found, defaulting to system');
    return 'system';
};

export function useDarkMode() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const applyTheme = (isDarkMode?: boolean) => {
            if (theme === 'dark') {
                root.classList.add('smart-dark-mode');
            } else if (theme === 'light') {
                root.classList.remove('smart-dark-mode');
            } else if (theme === 'system') {
                // Use provided value or read current state
                const prefersDark = isDarkMode !== undefined ? isDarkMode : mediaQuery.matches;
                if (prefersDark) {
                    root.classList.add('smart-dark-mode');
                } else {
                    root.classList.remove('smart-dark-mode');
                }
            }
        };

        logger.debug('[useDarkMode] Applying theme:', theme);
        applyTheme();
        localStorage.setItem('smartDarkMode', theme);
        logger.debug('[useDarkMode] Saved to localStorage:', theme);

        // Listener for system changes - pass the event's matches value
        const handleChange = (e: MediaQueryListEvent) => {
            if (theme === 'system') {
                logger.debug('[useDarkMode] System theme changed to:', e.matches ? 'dark' : 'light');
                applyTheme(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    return { theme, setTheme };
}
