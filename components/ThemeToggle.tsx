import React from "react";
import { useTheme } from "../hooks/themeContext";

type Props = {
  className?: string;
  compact?: boolean; // when true, render icon-only
};

export default function ThemeToggle({ className = "", compact = false }: Props) {
  const { theme, resolvedTheme, toggle } = useTheme();

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        aria-label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title={resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
        onClick={toggle}
        className="btn-theme p-2 rounded-md"
      >
        {resolvedTheme === "dark" ? (
          // Moon icon for dark (white moon)
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
          </svg>
        ) : (
          // Sun icon for light
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 7a5 5 0 100 10 5 5 0 000-10z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {!compact && (
        <span className="text-xs muted" aria-hidden>
          {theme === "system" ? "Auto" : resolvedTheme === "dark" ? "Dark" : "Light"}
        </span>
      )}
    </div>
  );
}