import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cflow-theme";
const DARK_CLASS = "cflow-dark";
const CLOSE_MS = 620;
const OPEN_MS = 620;

function readStoredTheme() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "dark";
  } catch {
    return false;
  }
}

function applyTheme(dark) {
  document.documentElement.classList.toggle(DARK_CLASS, dark);
  document.body.classList.toggle(DARK_CLASS, dark);
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(readStoredTheme);
  const [curtainVisible, setCurtainVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const busyRef = useRef(false);
  const timersRef = useRef([]);

  useEffect(() => {
    applyTheme(dark);

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [dark]);

  const toggle = () => {
    if (busyRef.current) return;

    busyRef.current = true;
    setCurtainVisible(true);
    setOpening(false);

    const closeTimer = window.setTimeout(() => {
      setDark((current) => {
        const next = !current;

        try {
          window.localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
        } catch {
          // Keep the selected theme for this session if storage is unavailable.
        }

        applyTheme(next);
        return next;
      });

      const openTimer = window.setTimeout(() => {
        setOpening(true);

        const cleanupTimer = window.setTimeout(() => {
          setCurtainVisible(false);
          setOpening(false);
          busyRef.current = false;
        }, OPEN_MS);

        timersRef.current.push(cleanupTimer);
      }, 140);

      timersRef.current.push(openTimer);
    }, CLOSE_MS);

    timersRef.current.push(closeTimer);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={curtainVisible}
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

      {curtainVisible && (
        <div
          className={`cflow-theme-curtain${opening ? " is-opening" : ""}`}
          aria-hidden="true"
        >
          <div className="cflow-theme-curtain__panel cflow-theme-curtain__panel--top" />
          <div className="cflow-theme-curtain__panel cflow-theme-curtain__panel--bottom" />
          <div className="cflow-theme-curtain__mark">
            C·FLOW / {dark ? "LIGHT" : "DARK"}
          </div>
        </div>
      )}
    </>
  );
}
