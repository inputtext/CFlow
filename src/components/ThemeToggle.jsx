import { useEffect, useState } from "react";

const STORAGE_KEY = "cflow-theme";

export default function ThemeToggle({ onThemeChange }) {
  const [dark, setDark] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    onThemeChange?.(dark);
  }, [dark, onThemeChange]);

  const toggle = () => {
    setDark((current) => {
      const next = !current;

      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
      } catch {
        // Theme still works for the current session if storage is unavailable.
      }

      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      className="cflow-theme-toggle"
    >
      <span className="cflow-theme-toggle-track" aria-hidden="true">
        <span className="cflow-theme-toggle-icon">
          {dark ? "☾" : "☀"}
        </span>
        <span className="cflow-theme-toggle-thumb" />
      </span>
      <span className="cflow-theme-toggle-label">
        {dark ? "DARK" : "LIGHT"}
      </span>
    </button>
  );
}
