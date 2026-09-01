import gsap from "gsap";

function findActiveFlowSource() {
  const nodes = Array.from(
    document.querySelectorAll("[data-flow-node]")
  );

  // FlowGraph marks the currently executing node with scale(1.025).
  // Prefer that exact node so repeated variables and loop updates
  // never point back to an earlier assignment.
  const activeNode = nodes.find((node) =>
    node.style.transform.includes("scale(1.025)")
  );

  return activeNode ?? null;
}

function findFlowSource(target) {
  const activeNode = findActiveFlowSource();
  if (activeNode) return activeNode;

  const nodes = Array.from(
    document.querySelectorAll("[data-flow-node]")
  );

  const variable = String(target ?? "").trim();
  if (!variable) return null;

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
      text.includes("*=") ||
      text.includes("/=")
    );
  });

  return operation ?? matches[0] ?? null;
}

function getVisibleCardRect(element) {
  let rect = element.getBoundingClientRect();
  let current = element.parentElement;

  // Clamp the target to the intersection of the card and its scrollable
  // ancestors. This keeps the arrow endpoint attached to the visible
  // portion of the Memory card instead of a clipped/off-screen location.
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const scrollableY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
    const scrollableX = /(auto|scroll|hidden|clip)/.test(style.overflowX);

    if (scrollableY || scrollableX) {
      const parentRect = current.getBoundingClientRect();
      const left = Math.max(rect.left, parentRect.left);
      const right = Math.min(rect.right, parentRect.right);
      const top = Math.max(rect.top, parentRect.top);
      const bottom = Math.min(rect.bottom, parentRect.bottom);

      if (right <= left || bottom <= top) return null;

      rect = {
        left,
        right,
        top,
        bottom,
        width: right - left,
        height: bottom - top,
      };
    }

    current = current.parentElement;
  }

  return rect;
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

  const targetMatch = targetSelector.match(
    /data-memory=["']([^"']+)["']/
  );

  const variableName = targetMatch?.[1] ?? "";
  const source =
    findFlowSource(variableName) ?? fallbackSource;

  if (!source) return;

  // Prevent two fast execution steps from leaving overlapping arrows.
  document
    .querySelectorAll("[data-cflow-memory-animation]")
    .forEach((element) => element.remove());

  const sourceRect = source.getBoundingClientRect();
  const targetRect = getVisibleCardRect(target);

  if (!targetRect) return;

  // Start at the visible right edge of the Flow node and land at the
  // visible left edge of the Memory card, vertically centered on the card.
  const startX = sourceRect.right + 6;
  const startY = sourceRect.top + sourceRect.height / 2;
  const endX = targetRect.left - 10;
  const endY = Math.min(
    Math.max(
      startY,
      targetRect.top + Math.min(targetRect.height * 0.5, 32)
    ),
    targetRect.bottom - Math.min(targetRect.height * 0.5, 32)
  );

  // Don't send the curve behind the Flow panel when the horizontal gap is
  // small or the panels overlap at unusual viewport sizes.
  const distanceX = Math.max(24, endX - startX);
  const distanceY = endY - startY;
  const curve = Math.min(
    105,
    Math.max(38, distanceX * 0.25)
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
  svg.setAttribute("data-cflow-memory-animation", "true");

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
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("marker-end", `url(#${marker.id})`);

  const label = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );

  const labelX = startX + distanceX * 0.5;
  const labelY =
    startY + distanceY * 0.5 - (distanceY >= 0 ? 9 : 5);

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
      duration: 0.5,
      delay: 0.12,
      ease: "power2.inOut",
    })
    .to(
      label,
      {
        opacity: 1,
        y: 0,
        duration: 0.16,
        ease: "power2.out",
      },
      "-=0.18"
    )
    .to({}, { duration: 0.3 })
    .to([path, label], {
      opacity: 0,
      duration: 0.2,
      ease: "power2.out",
    });

  return timeline;
}
