import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'plv_theme';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored === 'dark';
    } catch (e) {
      // ignore
    }
    // default to system preference
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');

    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (e) {
      // ignore storage errors
    }
  }, [isDark]);

  return (
    <button
      aria-pressed={isDark}
      onClick={() => setIsDark(v => !v)}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-white/90 dark:bg-black/80 text-sm"
      title="Toggle theme"
    >
      {isDark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
