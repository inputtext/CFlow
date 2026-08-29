import gsap from "gsap";

export function animateVariableUpdate({
  sourceSelector,
  targetSelector,
  before,
  after,
}) {
  const source = document.querySelector(sourceSelector);
  const target = document.querySelector(targetSelector);

  if (!source || !target) return;

  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  /*
   * Start from the right-center of the operation card.
   */
  const startX = sourceRect.right;
  const startY = sourceRect.top + sourceRect.height / 2;

  /*
   * End at the left-center of the memory card.
   */
  const endX = targetRect.left;
  const endY = targetRect.top + targetRect.height / 2;

  /*
   * Keep the curve controlled.
   *
   * The previous version used a very large control offset,
   * which produced the huge sweeping curve visible in the screenshot.
   */
  const distanceX = endX - startX;
  const curve = Math.min(
    140,
    Math.max(50, Math.abs(distanceX) * 0.35)
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

  const defs = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "defs"
  );

  const marker = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "marker"
  );

  marker.setAttribute("id", `cflow-arrow-${Date.now()}`);
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "8");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");

  const arrowHead = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  arrowHead.setAttribute("d", "M0,0 L8,4 L0,8 Z");
  arrowHead.setAttribute("fill", "#171717");

  marker.appendChild(arrowHead);
  defs.appendChild(marker);

  const path = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  );

  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#171717");
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute(
    "marker-end",
    `url(#${marker.id})`
  );

  const label = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text"
  );

  const labelX = startX + distanceX * 0.5;
  const labelY = startY + (endY - startY) * 0.5 - 10;

  label.setAttribute("x", labelX);
  label.setAttribute("y", labelY);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-family", "monospace");
  label.setAttribute("font-size", "13");
  label.setAttribute("font-weight", "700");
  label.setAttribute("fill", "#171717");

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
    y: 5,
  });

  const timeline = gsap.timeline({
    onComplete: () => {
      svg.remove();
    },
  });

  timeline
    .to(path, {
      strokeDashoffset: 0,
      duration: 0.65,
      ease: "power2.inOut",
    })
    .to(
      label,
      {
        opacity: 1,
        y: 0,
        duration: 0.2,
        ease: "power2.out",
      },
      "-=0.25"
    )
    .to({}, {
      duration: 0.35,
    })
    .to([path, label], {
      opacity: 0,
      duration: 0.25,
      ease: "power2.out",
    });

  return timeline;
}
