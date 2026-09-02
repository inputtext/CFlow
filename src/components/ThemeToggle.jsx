import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const STORAGE_KEY = "cflow-theme";
const THEME_CLASSES = ["stone", "moss", "mist", "clay", "dusk", "sakura", "ink"];
const THEMES = [
  { id: "stone", name: "Stone", color: "#E3D9CC", ink: "#292724" },
  { id: "moss", name: "Moss", color: "#AEBFA5", ink: "#253025" },
  { id: "mist", name: "Mist", color: "#C9CED0", ink: "#283033" },
  { id: "clay", name: "Clay", color: "#D5BA99", ink: "#352B25" },
  { id: "dusk", name: "Dusk", color: "#B9B1CC", ink: "#302B38" },
  { id: "sakura", name: "Sakura", color: "#D8B8AA", ink: "#392D31" },
  { id: "ink", name: "Ink", color: "#85837D", ink: "#000000" },
];

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.some((item) => item.id === stored) ? stored : "stone";
  } catch {
    return "stone";
  }
}

function applyTheme(themeId) {
  const root = document.getElementById("root");
  const elements = [root, document.documentElement, document.body].filter(Boolean);
  elements.forEach((element) => {
    THEME_CLASSES.forEach((id) => element.classList.remove(`cflow-theme-${id}`));
    element.classList.remove("cflow-dark");
    element.classList.add(`cflow-theme-${themeId}`);
  });
}

function themeMeta(id) {
  return THEMES.find((item) => item.id === id) ?? THEMES[0];
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readStoredTheme);
  const [transition, setTransition] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const timelineRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => () => timelineRef.current?.kill(), []);

  useEffect(() => {
    if (!pickerOpen || !pickerRef.current) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(pickerRef.current,
      { autoAlpha: 0, y: 10, scale: 0.97, transformOrigin: "bottom center" },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" }
    );
  }, [pickerOpen]);

  const animateThemeChange = (nextTheme) => {
    if (transition || nextTheme === theme) return;
    const nextMeta = themeMeta(nextTheme);
    setPickerOpen(false);
    setTransition(true);
    try { window.localStorage.setItem(STORAGE_KEY, nextTheme); } catch {}

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      applyTheme(nextTheme); setTheme(nextTheme); setTransition(false); return;
    }

    const wipe = document.createElement("div");
    wipe.className = "cflow-theme-wipe";
    wipe.style.setProperty("--wipe-color", nextMeta.id === "ink" ? "#202326" : nextMeta.color);
    wipe.style.setProperty("--wipe-ink", "#000000");
    wipe.innerHTML = `<div class="cflow-theme-wipe__shadow"></div><div class="cflow-theme-wipe__paper"></div><div class="cflow-theme-wipe__grain"></div><div class="cflow-theme-wipe__mark">C·FLOW&nbsp;&nbsp;/&nbsp;&nbsp;${nextMeta.name.toUpperCase()}</div>`;
    document.body.appendChild(wipe);

    const paper = wipe.querySelector(".cflow-theme-wipe__paper");
    const shadow = wipe.querySelector(".cflow-theme-wipe__shadow");
    const grain = wipe.querySelector(".cflow-theme-wipe__grain");
    const mark = wipe.querySelector(".cflow-theme-wipe__mark");
    timelineRef.current?.kill();
    timelineRef.current = gsap.timeline({
      onComplete: () => {
        applyTheme(nextTheme); setTheme(nextTheme);
        gsap.to([paper, shadow], { clipPath: "polygon(120% -5%,120% 105%,100% 105%,100% -5%)", duration: 1, ease: "power3.inOut", onComplete: () => { wipe.remove(); setTransition(false); } });
      },
    });
    gsap.set([paper, shadow], { clipPath: "polygon(-18% -5%,0 -5%,-12% 105%,-30% 105%)", rotation: -0.2, transformOrigin: "50% 50%" });
    gsap.set(mark, { opacity: 0, y: 16 });
    gsap.set(grain, { opacity: 0 });
    timelineRef.current.to([paper, shadow], { clipPath: "polygon(-18% -5%,100% -5%,112% 105%,-30% 105%)", duration: 1.15, ease: "power3.inOut" })
      .to(grain, { opacity: 0.08, duration: 0.35 }, "-=0.55")
      .to(mark, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, "-=0.35")
      .to({}, { duration: 0.25 })
      .to(mark, { opacity: 0, y: -8, duration: 0.25, ease: "power2.in" });
  };

  const current = themeMeta(theme);
  return (
    <>
      <div className="cflow-theme-control" style={{ position: "fixed", left: "50%", bottom: "12px", transform: "translateX(200px)", zIndex: 1200 }}>
        <button type="button" className="cflow-theme-palette-button" onClick={() => setPickerOpen((open) => !open)} aria-label="Choose C·FLOW theme" aria-expanded={pickerOpen} disabled={transition}>
          <span /><span /><span /><span className="sr-only">{current.name} theme</span>
        </button>
      </div>
      {pickerOpen && !transition && (
        <div ref={pickerRef} className="cflow-theme-picker" role="dialog" aria-label="C·FLOW themes" style={{ position: "fixed", left: "50%", bottom: "58px", transform: "translateX(200px)", zIndex: 1201 }}>
          <div className="cflow-theme-picker__title">Themes</div>
          <div className="cflow-theme-picker__grid">
            {THEMES.map((item) => (
              <button key={item.id} type="button" className={`cflow-theme-swatch ${theme === item.id ? "is-active" : ""}`} onClick={() => animateThemeChange(item.id)} aria-label={`Use ${item.name} theme`} aria-pressed={theme === item.id}>
                <span className="cflow-theme-swatch__dot" style={{ background: item.color }} /><span className="cflow-theme-swatch__name">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
