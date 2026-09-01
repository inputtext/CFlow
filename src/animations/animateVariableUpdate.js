import gsap from "gsap";

function findFlowSource(target) {
  const nodes = Array.from(
    document.querySelectorAll("[data-flow-node]")
  );

  if (!nodes.length) return null;

  const variable = String(target ?? "").trim();
  if (!variable) return null;

  // Prefer the flow operation whose label contains the variable
  // being changed. This keeps the arrow tied to the current
  // execution operation instead of the first operation in the graph.
  const matches = nodes.filter((node) => {
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return text.includes(variable);
  });

  const operation = matches.find((node) => {
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return (
      text.includes("=") ||
      text.includes("++") ||
      text.includes("--") ||
      text.includes("+=") ||
      text.includes("-=") ||
      text.includes("*= ") ||
      text.includes("/=")
    );
  });

  return operation ?? matches[0] ?? null;
}

export function animateVariableUpdate({
  sourceSelector,
  targetSelector,
  before,
  after,
}) {
  const fallbackSource = sourceSelector
    ? document.querySelector(sourceSelector)
    : null;

  const target = document.querySelector(targetSelector);
  if (!target) return;

  const source =
    findFlowSource(targetSelector.match(/data-memory=\\\"([^\\\"]+)/)?.[1]) ??
    fallbackSource;

  if (!source) return;

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  // The arrow lives in viewport coordinates so it can cross the
  // FLOW → MEMORY panel gap without affecting either layout.
  const startX = sourceRect.right + 4;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left - 8;
  const endY = targetRect.top + targetRect.height / 2;

  const distanceX = Math.max(20, endX - startX);
  const curve = Math.min(
    110,
    Math.max(35, Math.abs(distanceX) * 0.28)
  );

  const pathD = `
    M ${startX} ${startY}
    C ${startX + curve} ${startY},
      ${endX - curve} ${endY},
      ${endX} ${endY}
  `;

  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );

  svg.setAttribute("width", window.innerWidth);
  svg.setAttribute("height", window.innerHeight);

  Object.assign(svg.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999",
    overflow: "visible",
  });

  const isDark =
    document.documentElement.classList.contains("cflow-dark") ||
    document.body.classList.contains("cflow-dark") ||
    Boolean(document.querySelector(".cflow-dark"));

  const ink = isDark ? "#E8E4DC" : "#171717";
  const accent = isDark ? "#D2B878" : "#171717";

  const defs = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "defs"
  );

  const marker = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "marker"
  );

  marker.setAttribute("id", `cflow-memory-arrow-${Date.now()}`);
  marker.setAttribute("markerWidth", "9");
  marker.setAttribute("markerHeight", "9");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");

  const arrowHead = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  arrowHead.setAttribute("d", "M0,0 L8,4 L0,8 Z");
  arrowHead.setAttribute("fill", ink);

  marker.appendChild(arrowHead);
  defs.appendChild(marker);

  const path = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", accent);
  path.setAttribute("stroke-width", "2.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("marker-end", `url(#${marker.id})`);

  const label = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );

  const labelX = startX + distanceX * 0.5;
  const labelY = startY + (endY - startY) * 0.5 - 8;

  label.setAttribute("x", labelX);
  label.setAttribute("y", labelY);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-family", "monospace");
  label.setAttribute("font-size", "11");
  label.setAttribute("font-weight", "700");
  label.setAttribute("fill", ink);

  label.textContent = `${before} → ${after}`;

  svg.appendChild(defs);
  svg.appendChild(path);
  svg.appendChild(label);
  document.body.appendChild(svg);

  const length = path.getTotalLength();

  gsap.set(path, {
    strokeDasharray: length,
    strokeDashoffset: length,
  });

  gsap.set(label, {
    opacity: 0,
    y: 4,
  });

  const timeline = gsap.timeline({
    onComplete: () => svg.remove(),
  });

  timeline
    .to(path, {
      strokeDashoffset: 0,
      duration: 0.55,
      ease: "power2.inOut",
    })
    .to(
      label,
      {
        opacity: 1,
        y: 0,
        duration: 0.18,
        ease: "power2.out",
      },
      "-=0.2"
    )
    .to({}, { duration: 0.35 })
    .to([path, label], {
      opacity: 0,
      duration: 0.22,
      ease: "power2.out",
    });

  return timeline;
}
