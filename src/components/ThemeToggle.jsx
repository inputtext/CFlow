import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "cflow-theme";
const DARK_CLASS = "cflow-dark";
const CLOSE_MS = 1250;
const HOLD_MS = 420;
const OPEN_MS = 1050;

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
  const [curtain, setCurtain] = useState(null);
  const busyRef = useRef(false);
  const timersRef = useRef([]);

  useEffect(() => {
    // Persisted theme is applied on refresh without replaying the curtain.
    applyTheme(dark);

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dark]);

  const toggle = () => {
    if (busyRef.current) return;

    busyRef.current = true;
    const nextDark = !dark;

    // Mount off-screen first. The next frame starts the actual slow pull.
    setCurtain("prepare");

    const startClose = window.requestAnimationFrame(() => {
      setCurtain("closing");
    });

    const changeTheme = window.setTimeout(() => {
      setDark(nextDark);

      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          nextDark ? "dark" : "light",
        );
      } catch {
        // Keep the selected theme for this session if storage is unavailable.
      }

      applyTheme(nextDark);

      const openTimer = window.setTimeout(() => {
        setCurtain("opening");

        const cleanupTimer = window.setTimeout(() => {
          setCurtain(null);
          busyRef.current = false;
        }, OPEN_MS);

        timersRef.current.push(cleanupTimer);
      }, HOLD_MS);

      timersRef.current.push(openTimer);
    }, CLOSE_MS + 40);

    timersRef.current.push(changeTheme);

    // requestAnimationFrame IDs are not timeout IDs, so cancel it separately on unmount.
    timersRef.current.push(startClose);
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={Boolean(curtain)}
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

      {curtain && (
        <div
          className={`cflow-theme-curtain is-${curtain}`}
          aria-hidden="true"
        >
          <div className="cflow-theme-curtain__panel cflow-theme-curtain__panel--top" />
          <div className="cflow-theme-curtain__panel cflow-theme-curtain__panel--bottom" />
          <div className="cflow-theme-curtain__mark">
            C·FLOW&nbsp;&nbsp;/&nbsp;&nbsp;{dark ? "LIGHT" : "DARK"}
          </div>
        </div>
      )}
    </>
  );
}
