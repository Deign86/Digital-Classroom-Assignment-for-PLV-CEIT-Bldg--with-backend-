import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const STORAGE_KEY = "plv-theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      return stored ?? "system";
    } catch {
      return "system";
    }
  });

  const getSystem = () =>
    typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const resolvedTheme = theme === "system" ? getSystem() : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      // re-evaluate resolvedTheme when system preference changes (no state change needed unless theme === 'system')
      setThemeState(prev => prev);
    };

    if ("addEventListener" in mq) {
      mq.addEventListener("change", handler as EventListener);
      return () => mq.removeEventListener("change", handler as EventListener);
    } else if ("addListener" in mq) {
      (mq as any).addListener(handler);
      return () => (mq as any).removeListener(handler);
    }
    return;
  }, []);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState(s => (s === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolvedTheme as "light" | "dark", setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}