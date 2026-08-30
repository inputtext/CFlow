import { useEffect, useState } from "react";

const STORAGE_KEY = "cflow-theme";
const DARK_CLASS = "cflow-dark";

function readStoredTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

function applyTheme(dark) {
  const root = document.getElementById("root");
  root?.classList.toggle(DARK_CLASS, dark);
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  document.body.classList.toggle(DARK_CLASS, dark);
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(readStoredTheme);
  const [transition, setTransition] = useState(null);

  useEffect(() => {
    // Apply the saved theme on refresh. No transition screen is shown on load.
    applyTheme(dark);
  }, [dark]);

  const finishThemeChange = () => {
    if (transition !== "closing") return;

    const nextDark = !dark;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        nextDark ? "dark" : "light",
      );
    } catch {
      // Theme still works for the current session if storage is unavailable.
    }

    // Change the actual UI only while it is completely covered.
    setDark(nextDark);
    applyTheme(nextDark);
    setTransition("opening");
  };

  const finishOpening = () => {
    if (transition === "opening") {
      setTransition(null);
    }
  };

  const toggle = () => {
    if (transition) return;

    // The overlay starts above the viewport. CSS animation then drops it
    // down over the whole UI before the theme changes.
    setTransition("closing");
  };

  const targetDark = !dark;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={Boolean(transition)}
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

      {transition && (
        <div
          className={`cflow-theme-curtain is-${transition} ${
            targetDark ? "is-target-dark" : "is-target-light"
          }`}
          onAnimationEnd={
            transition === "closing"
              ? finishThemeChange
              : finishOpening
          }
          aria-hidden="true"
        >
          <div className="cflow-theme-curtain__screen" />
          <div className="cflow-theme-curtain__mark">
            C·FLOW&nbsp;&nbsp;/&nbsp;&nbsp;{targetDark ? "DARK" : "LIGHT"}
          </div>
        </div>
      )}
    </>
  );
}
