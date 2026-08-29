import { useEffect, useRef } from "react";
import gsap from "gsap";

const nodes = [
  {
    id: "condition",
    label: "i <= 10 ?",
    type: "condition",
  },
  {
    id: "sum",
    label: "sum += evenNum",
    type: "operation",
  },
  {
    id: "evenNum",
    label: "evenNum += 2",
    type: "operation",
  },
  {
    id: "increment",
    label: "i++",
    type: "operation",
  },
  {
    id: "exit",
    label: "EXIT",
    type: "exit",
  },
];

function FlowNode({ node, active }) {
  const styles = {
    condition: "bg-[#FFE3A3]",
    operation: "bg-white",
    exit: "bg-[#FFD6E7]",
  };

  return (
    <div
      data-flow-node={node.id}
      className={`
        relative z-10
        min-w-[210px]
        px-6 py-4
        border-2 border-[#171717]
        shadow-[4px_4px_0_#171717]
        font-mono font-bold
        text-center
        transition-all duration-300
        ${styles[node.type]}
        ${
          active
            ? "scale-[1.04] shadow-[7px_7px_0_#171717]"
            : ""
        }
      `}
    >
      {node.label}
    </div>
  );
}

export default function FlowGraph({ activeNode }) {
  const pulseRef = useRef(null);

  /*
   * Animate the execution pulse whenever
   * the active node changes.
   */
  useEffect(() => {
    const pulse = pulseRef.current;

    if (!pulse || !activeNode) return;

    const node = document.querySelector(
      `[data-flow-node="${activeNode}"]`
    );

    if (!node) return;

    const parent = pulse.parentElement;

    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();

    const x =
      nodeRect.left -
      parentRect.left +
      nodeRect.width / 2;

    const y =
      nodeRect.top -
      parentRect.top +
      nodeRect.height / 2;

    gsap.killTweensOf(pulse);

    gsap.fromTo(
      pulse,
      {
        x: x,
        y: y - 14,
        scale: 0.4,
        opacity: 0,
      },
      {
        x: x,
        y: y,
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: "power3.out",
        onComplete: () => {
          gsap.to(pulse, {
            scale: 1.8,
            opacity: 0,
            duration: 0.25,
            ease: "power2.out",
          });
        },
      }
    );
  }, [activeNode]);

  return (
    <div className="relative min-h-[720px] w-full">

      {/* SVG CONNECTION LAYER */}
      <svg
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 600 720"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="flow-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path
              d="M0,0 L8,4 L0,8 Z"
              fill="#171717"
            />
          </marker>
        </defs>

        {/* CONDITION → SUM */}
        <path
          d="
            M 300 105
            L 300 185
          "
          fill="none"
          stroke="#171717"
          strokeWidth="3"
          markerEnd="url(#flow-arrow)"
        />

        {/* SUM → EVEN NUM */}
        <path
          d="
            M 300 265
            L 300 345
          "
          fill="none"
          stroke="#171717"
          strokeWidth="3"
          markerEnd="url(#flow-arrow)"
        />

        {/* EVEN NUM → I++ */}
        <path
          d="
            M 300 425
            L 300 505
          "
          fill="none"
          stroke="#171717"
          strokeWidth="3"
          markerEnd="url(#flow-arrow)"
        />

        {/* LOOP BACK */}
        <path
          d="
            M 405 545
            C 535 545,
              545 145,
              405 145
          "
          fill="none"
          stroke="#171717"
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd="url(#flow-arrow)"
        />

        {/* FALSE → EXIT */}
        <path
          d="
            M 300 105
            C 160 105,
              120 600,
              220 650
          "
          fill="none"
          stroke="#171717"
          strokeWidth="2"
          strokeDasharray="7 7"
          markerEnd="url(#flow-arrow)"
        />

        <text
          x="485"
          y="350"
          fontFamily="monospace"
          fontSize="12"
          fontWeight="700"
          fill="#171717"
          transform="rotate(-82 485 350)"
        >
          LOOP
        </text>

        <text
          x="145"
          y="430"
          fontFamily="monospace"
          fontSize="12"
          fontWeight="700"
          fill="#171717"
          transform="rotate(-72 145 430)"
        >
          FALSE
        </text>
      </svg>


      {/* NODE LAYER */}
      <div className="relative z-10 flex min-h-[720px] flex-col items-center pt-8">

        <FlowNode
          node={nodes[0]}
          active={activeNode === "condition"}
        />

        <div className="h-20" />

        <FlowNode
          node={nodes[1]}
          active={activeNode === "sum"}
        />

        <div className="h-20" />

        <FlowNode
          node={nodes[2]}
          active={activeNode === "evenNum"}
        />

        <div className="h-20" />

        <FlowNode
          node={nodes[3]}
          active={activeNode === "increment"}
        />

        <div className="mt-20">
          <FlowNode
            node={nodes[4]}
            active={activeNode === "exit"}
          />
        </div>

      </div>


      {/* EXECUTION PULSE */}
      <div
        ref={pulseRef}
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          z-20
          h-3
          w-3
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#171717]
          opacity-0
        "
      />

    </div>
  );
}
