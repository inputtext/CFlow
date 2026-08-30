import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cflow-theme";
const DARK_CLASS = "cflow-dark";
const TRANSITION_FALLBACK_MS = 1500;

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
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    // Persisted theme is applied immediately on refresh; the transition is
    // only used for an intentional user click.
    applyTheme(dark);
  }, [dark]);

  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const clearFallback = () => {
    if (fallbackTimerRef.current) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const changeTheme = () => {
    const nextDark = !dark;

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        nextDark ? "dark" : "light",
      );
    } catch {
      // Keep the selected theme for the current session if storage is unavailable.
    }

    // The screen is fully covering the page at this point.
    setDark(nextDark);
    applyTheme(nextDark);
    setTransition("opening");
  };

  const handleAnimationEnd = (event) => {
    // Animation events bubble. Only the full-screen screen itself controls
    // the transition lifecycle; the logo/label must never end the transition.
    if (event.target !== event.currentTarget) return;

    clearFallback();

    if (transition === "closing") {
      changeTheme();
      return;
    }

    if (transition === "opening") {
      setTransition(null);
    }
  };

  const toggle = () => {
    if (transition) return;

    clearFallback();
    setTransition("closing");

    // Safety net: if CSS animations are disabled/interrupted by the browser,
    // never leave the UI permanently covered.
    fallbackTimerRef.current = window.setTimeout(() => {
      setTransition((current) => {
        if (current === "closing") {
          changeTheme();
          return "opening";
        }
        if (current === "opening") {
          return null;
        }
        return current;
      });
    }, TRANSITION_FALLBACK_MS);
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
          aria-hidden="true"
        >
          <div
            className="cflow-theme-curtain__screen"
            onAnimationEnd={handleAnimationEnd}
          />
          <div className="cflow-theme-curtain__mark">
            C·FLOW&nbsp;&nbsp;/&nbsp;&nbsp;{targetDark ? "DARK" : "LIGHT"}
          </div>
        </div>
      )}
    </>
  );
}
