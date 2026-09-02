import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const STORAGE_KEY = "cflow-theme";
const DARK_CLASS = "cflow-dark";
const THEME_CLASSES = ["stone", "moss", "mist", "clay", "dusk", "sakura", "ink"];
const THEMES = [
  { id: "stone", name: "Stone", color: "#E3D9CC", ink: "#292724" },
  { id: "moss", name: "Moss", color: "#AEBFA5", ink: "#253025" },
  { id: "mist", name: "Mist", color: "#C9CED0", ink: "#283033" },
  { id: "clay", name: "Clay", color: "#D5BA99", ink: "#352B25" },
  { id: "dusk", name: "Dusk", color: "#B9B1CC", ink: "#302B38" },
  { id: "sakura", name: "Sakura", color: "#D8B8AA", ink: "#392D31" },
  { id: "ink", name: "Ink", color: "#85837D", ink: "#F1EEE8" },
];

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark") return "ink";
    if (stored === "light") return "stone";
    return THEMES.some((item) => item.id === stored) ? stored : "stone";
  } catch {
    return "stone";
  }
}

function applyTheme(themeId) {
  const elements = [document.getElementById("root"), document.documentElement, document.body].filter(Boolean);
  elements.forEach((element) => {
    THEME_CLASSES.forEach((id) => element.classList.remove(`cflow-theme-${id}`));
    element.classList.add(`cflow-theme-${themeId}`);
    element.classList.toggle(DARK_CLASS, themeId === "ink");
  });
}

function themeMeta(id) {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readStoredTheme);
  const [transition, setTransition] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const timelineRef = useRef(null);

  const dark = theme === "ink";
  const current = themeMeta(theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => () => timelineRef.current?.kill(), []);

  const animateThemeChange = (nextTheme) => {
    if (transition || nextTheme === theme) {
      setPickerOpen(false);
      return;
    }

    const nextMeta = themeMeta(nextTheme);
    const wipe = document.createElement("div");
    wipe.className = "cflow-theme-wipe";
    wipe.style.setProperty("--wipe-color", nextTheme === "ink" ? "#202326" : nextMeta.color);
    wipe.style.setProperty("--wipe-ink", nextMeta.ink);
    wipe.innerHTML = `
      <div class="cflow-theme-wipe__shadow"></div>
      <div class="cflow-theme-wipe__paper"></div>
      <div class="cflow-theme-wipe__grain"></div>
      <div class="cflow-theme-wipe__mark">C·FLOW&nbsp;&nbsp;/&nbsp;&nbsp;${nextMeta.name.toUpperCase()}</div>
    `;
    document.body.appendChild(wipe);

    const paper = wipe.querySelector(".cflow-theme-wipe__paper");
    const shadow = wipe.querySelector(".cflow-theme-wipe__shadow");
    const grain = wipe.querySelector(".cflow-theme-wipe__grain");
    const mark = wipe.querySelector(".cflow-theme-wipe__mark");

    setTransition(true);
    setPickerOpen(false);
    timelineRef.current?.kill();

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      applyTheme(nextTheme);
      setTheme(nextTheme);
      try { window.localStorage.setItem(STORAGE_KEY, nextTheme); } catch {}
      wipe.remove();
      setTransition(false);
      return;
    }

    gsap.set([paper, shadow], { clipPath: "polygon(-22% -5%, -4% -5%, -18% 105%, -36% 105%)" });
    gsap.set(shadow, { x: -10, y: 12 });
    gsap.set(mark, { opacity: 0, y: 10 });
    gsap.set(grain, { opacity: 0 });

    const timeline = gsap.timeline({
      onComplete: () => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
        try { window.localStorage.setItem(STORAGE_KEY, nextTheme); } catch {}

        gsap.to([paper, shadow], {
          clipPath: "polygon(118% -5%, 136% -5%, 118% 105%, 100% 105%)",
          duration: 0.62,
          ease: "power4.inOut",
          onComplete: () => {
            wipe.remove();
            setTransition(false);
          },
        });
      },
    });

    timeline
      .to([paper, shadow], {
        clipPath: "polygon(-22% -5%, 104% -5%, 122% 105%, -36% 105%)",
        duration: 0.72,
        ease: "power4.inOut",
      })
      .to(grain, { opacity: 0.09, duration: 0.16 }, "-=0.34")
      .to(mark, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, "-=0.24")
      .to({}, { duration: 0.12 })
      .to(mark, { opacity: 0, y: -6, duration: 0.14, ease: "power2.in" });

    timelineRef.current = timeline;
  };

  const toggleLightDark = () => animateThemeChange(dark ? "stone" : "ink");

  return (
    <>
      <div
        className="cflow-theme-control"
        style={{ position: "fixed", top: "18px", left: "50%", transform: "translateX(200px)", zIndex: 1200 }}
      >
        <button
          type="button"
          onClick={toggleLightDark}
          disabled={transition}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={dark}
          className="cflow-theme-toggle"
        >
          <span className="cflow-theme-toggle-track" aria-hidden="true">
            <span className="cflow-theme-toggle-icon">{dark ? "☾" : "☀"}</span>
            <span className="cflow-theme-toggle-thumb" />
          </span>
          <span className="cflow-theme-toggle-label">{current.name.toUpperCase()}</span>
        </button>

        <button
          type="button"
          className="cflow-theme-palette-button"
          onClick={() => setPickerOpen((open) => !open)}
          aria-label="Choose C·FLOW theme"
          aria-expanded={pickerOpen}
          disabled={transition}
        >
          <span /><span /><span />
        </button>
      </div>

      {pickerOpen && !transition && (
        <div className="cflow-theme-picker" role="dialog" aria-label="C·FLOW themes">
          <div className="cflow-theme-picker__title">Themes</div>
          <div className="cflow-theme-picker__grid">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`cflow-theme-swatch ${theme === item.id ? "is-active" : ""}`}
                onClick={() => animateThemeChange(item.id)}
                aria-label={`Use ${item.name} theme`}
                aria-pressed={theme === item.id}
              >
                <span className="cflow-theme-swatch__dot" style={{ background: item.color }} />
                <span className="cflow-theme-swatch__name">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
