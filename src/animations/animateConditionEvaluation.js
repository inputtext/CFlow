import gsap from "gsap";

export function animateConditionEvaluation({
  conditionSelector,
  result,
}) {
  const condition = document.querySelector(conditionSelector);

  if (!condition) return;

  const rect = condition.getBoundingClientRect();

  const resultBadge = document.createElement("div");

  resultBadge.textContent = result ? "TRUE ✓" : "FALSE ✕";

  Object.assign(resultBadge.style, {
    position: "fixed",
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.bottom + 16}px`,
    transform: "translateX(-50%)",
    padding: "7px 12px",
    border: "2px solid #171717",
    background: result ? "#DFF7E8" : "#FFD6E7",
    color: "#171717",
    fontFamily: "monospace",
    fontSize: "13px",
    fontWeight: "700",
    boxShadow: "3px 3px 0 #171717",
    zIndex: "10000",
    pointerEvents: "none",
  });

  document.body.appendChild(resultBadge);

  const originalTransform = condition.style.transform;

  const timeline = gsap.timeline({
    onComplete: () => {
      resultBadge.remove();
      condition.style.transform = originalTransform;
    },
  });

  gsap.set(resultBadge, {
    opacity: 0,
    y: -6,
  });

  timeline
    // Condition receives focus
    .to(condition, {
      scale: 1.04,
      duration: 0.18,
      ease: "power2.out",
    })

    // Reveal TRUE / FALSE
    .to(
      resultBadge,
      {
        opacity: 1,
        y: 0,
        duration: 0.25,
        ease: "power2.out",
      },
      "-=0.05"
    )

    // Hold long enough to understand it
    .to({}, {
      duration: 0.45,
    })

    // Return condition to normal
    .to(condition, {
      scale: 1,
      duration: 0.25,
      ease: "power2.inOut",
    })

    .to(
      resultBadge,
      {
        opacity: 0,
        y: -4,
        duration: 0.2,
        ease: "power2.in",
      },
      "-=0.15"
    );

  return timeline;
}
