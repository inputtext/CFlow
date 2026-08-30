/* ============================================================
   C·FLOW — DYNAMIC FLOW GRAPH
   ============================================================ */

function FlowNode({
  id,
  label,
  type,
  active,
  conditionResult,
  x,
  y,
}) {
  const isCondition = type === "condition";

  const background =
    type === "condition"
      ? "bg-[#FFE3A3]"
      : type === "exit"
        ? "bg-[#FFD6E7]"
        : type === "start"
          ? "bg-[#FFF9F0]"
          : "bg-white";

  const result =
    isCondition && active
      ? conditionResult === true
        ? "true"
        : conditionResult === false
          ? "false"
          : "checking"
      : "idle";

  return (
    <div
      data-flow-node={id}
      className={`
        absolute
        z-10
        w-[220px]
        -translate-x-1/2
        border-2
        border-[#171717]
        px-5
        py-4
        text-center
        font-mono
        font-bold
        ${background}
        shadow-[4px_4px_0_#171717]
        transition-all
        duration-300
        ease-out

        ${
          active
            ? "translate-y-[-2px] scale-[1.035] shadow-[6px_6px_0_#171717]"
            : ""
        }

        ${
          result === "true" ||
          result === "false"
            ? "ring-2 ring-[#171717] ring-offset-2 ring-offset-[#E8DFFF]"
            : ""
        }
      `}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <span className="block text-[13px] leading-5">
        {label}
      </span>

      {isCondition && active && (
        <div
          className="
            mt-2
            flex
            items-center
            justify-center
            gap-2
            animate-[conditionIn_0.25s_ease-out]
          "
        >
          {result === "checking" && (
            <>
              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  bg-[#171717]
                  animate-pulse
                "
              />

              <span className="text-[9px] uppercase tracking-[0.18em] opacity-65">
                evaluating
              </span>
            </>
          )}

          {result === "true" && (
            <>
              <span className="text-sm">
                ✓
              </span>

              <span className="text-[10px] uppercase tracking-[0.18em]">
                TRUE
              </span>
            </>
          )}

          {result === "false" && (
            <>
              <span className="text-sm">
                ×
              </span>

              <span className="text-[10px] uppercase tracking-[0.18em]">
                FALSE
              </span>
            </>
          )}
        </div>
      )}

      {active && (
        <span
          className="
            pointer-events-none
            absolute
            inset-0
            border-2
            border-[#171717]
            animate-[nodePulse_1.2s_ease-out]
          "
        />
      )}
    </div>
  );
}


/* ============================================================
   TYPE
   ============================================================ */

function normalizeType(node) {
  if (!node) {
    return "operation";
  }

  if (node.type === "condition") {
    return "condition";
  }

  if (node.type === "start") {
    return "start";
  }

  if (node.type === "exit") {
    return "exit";
  }

  return "operation";
}


/* ============================================================
   LABEL
   ============================================================ */

function normalizeLabel(node) {
  if (!node) {
    return "";
  }

  return String(
    node.label ??
      node.code ??
      node.expression ??
      node.id ??
      ""
  )
    .replace(/\s+/g, " ")
    .trim();
}


/* ============================================================
   LAYOUT
   ============================================================ */

function makeLayout(nodes) {
  const layout = {};

  nodes.forEach((node, index) => {
    layout[node.id] = {
      x: 500,
      y: 30 + index * 115,
    };
  });

  return layout;
}


/* ============================================================
   EDGE PATH
   ============================================================ */

function edgePath(edge, layout) {
  const from = layout[edge.from];
  const to = layout[edge.to];

  if (!from || !to) {
    return "";
  }

  const startX = from.x;
  const startY = from.y + 67;

  const endX = to.x;
  const endY = to.y;

  const isBackEdge =
    to.y <= from.y ||
    edge.type === "loop" ||
    edge.type === "back";

  /*
   * Loop / back edge.
   */
  if (isBackEdge) {
    const right =
      Math.max(from.x, to.x) + 190;

    return `
      M ${startX} ${startY}
      C ${right} ${startY},
        ${right} ${endY - 25},
        ${endX} ${endY}
    `;
  }

  /*
   * Branch edge.
   */
  if (
    Math.abs(startX - endX) > 2
  ) {
    const middle =
      startY +
      (endY - startY) / 2;

    return `
      M ${startX} ${startY}
      C ${startX} ${middle},
        ${endX} ${middle},
        ${endX} ${endY}
    `;
  }

  /*
   * Normal edge.
   */
  return `
    M ${startX} ${startY}
    L ${endX} ${endY}
  `;
}


/* ============================================================
   EDGE COMPONENT
   ============================================================ */

function FlowPath({
  d,
  active,
  loop,
}) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="#171717"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#cflow-arrow)"
        opacity={active ? 1 : 0.8}
      />

      {active && (
        <>
          <path
            d={d}
            fill="none"
            stroke="#FFE3A3"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="12 18"
            markerEnd="url(#cflow-arrow-active)"
            className="
              animate-[flowTravel_0.8s_linear_infinite]
            "
          />

          <path
            d={d}
            fill="none"
            stroke="#171717"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="7 15"
            className="
              animate-[flowTravelDark_0.8s_linear_infinite]
            "
          />

          <circle
            r={loop ? 4 : 5}
            fill="#171717"
            className="
              animate-[flowDot_0.9s_ease-in-out_infinite]
            "
          >
            <animateMotion
              dur={
                loop
                  ? "1.1s"
                  : "0.9s"
              }
              repeatCount="indefinite"
              path={d}
            />
          </circle>
        </>
      )}
    </>
  );
}


/* ============================================================
   MAIN FLOWGRAPH
   ============================================================ */

export default function FlowGraph({
  nodes = [],
  edges = [],
  activeNode = null,
  activeEdge = null,
  conditionResult = null,
}) {
  /*
   * IMPORTANT:
   *
   * There is NO mock graph anymore.
   *
   * The graph exists only when the backend gives us nodes.
   */

  const safeNodes =
    Array.isArray(nodes)
      ? nodes
      : [];

  const safeEdges =
    Array.isArray(edges)
      ? edges
      : [];

  /*
   * Empty state.
   */

  if (safeNodes.length === 0) {
    return (
      <div
        className="
          flex
          min-h-[520px]
          w-full
          items-center
          justify-center
          px-8
        "
      >
        <div
          className="
            w-[300px]
            border-2
            border-[#171717]
            bg-white
            p-6
            text-center
            font-mono
            shadow-[4px_4px_0_#171717]
          "
        >
          <div
            className="
              text-[11px]
              font-black
              uppercase
              tracking-[0.18em]
            "
          >
            FLOWGRAPH
          </div>

          <div
            className="
              mt-3
              text-[10px]
              leading-5
              opacity-55
            "
          >
            Analyze C / C++ code to
            generate the flow graph.
          </div>
        </div>
      </div>
    );
  }

  const layout =
    makeLayout(safeNodes);

  const graphHeight =
    Math.max(
      620,
      safeNodes.length * 115 + 100
    );

  const activeCondition =
    safeNodes.find(
      (node) =>
        node.id === activeNode &&
        normalizeType(node) ===
          "condition"
    );

  return (
    <div
      className="
        relative
        min-h-[620px]
        w-full
        min-w-[760px]
        overflow-visible
      "
      style={{
        minHeight: graphHeight,
      }}
    >
      {/* ======================================================
          EDGES
      ====================================================== */}

      <svg
        className="
          pointer-events-none
          absolute
          inset-0
          h-full
          w-full
        "
        viewBox={`0 0 1000 ${graphHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="cflow-arrow"
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

          <marker
            id="cflow-arrow-active"
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

        {safeEdges.map(
          (edge) => {
            const d =
              edgePath(
                edge,
                layout
              );

            if (!d) {
              return null;
            }

            const loop =
              edge.type ===
                "loop" ||
              edge.type === "back" ||
              (
                layout[edge.to] &&
                layout[edge.from] &&
                layout[edge.to].y <=
                  layout[edge.from].y
              );

            return (
              <FlowPath
                key={edge.id}
                d={d}
                active={
                  edge.id ===
                  activeEdge
                }
                loop={loop}
              />
            );
          }
        )}
      </svg>


      {/* ======================================================
          NODES
      ====================================================== */}

      {safeNodes.map(
        (node) => {
          const position =
            layout[node.id];

          if (!position) {
            return null;
          }

          return (
            <FlowNode
              key={node.id}
              id={node.id}
              label={normalizeLabel(
                node
              )}
              type={normalizeType(
                node
              )}
              active={
                node.id ===
                activeNode
              }
              conditionResult={
                conditionResult
              }
              x={position.x}
              y={position.y}
            />
          );
        }
      )}


      {/* ======================================================
          TRUE / FALSE LABELS
      ====================================================== */}

      {safeEdges
        .filter(
          (edge) =>
            edge.type ===
              "true" ||
            edge.type ===
              "false"
        )
        .map((edge) => {
          const from =
            layout[edge.from];

          const to =
            layout[edge.to];

          if (!from || !to) {
            return null;
          }

          return (
            <span
              key={`branch-${edge.id}`}
              className={`
                absolute
                font-mono
                text-[9px]
                font-black
                uppercase
                tracking-[0.15em]
                transition-opacity
                duration-300
                ${
                  edge.id ===
                  activeEdge
                    ? "opacity-100"
                    : "opacity-55"
                }
              `}
              style={{
                left: `${
                  (from.x + to.x) /
                    2 +
                  12
                }px`,
                top: `${
                  (from.y + to.y) /
                  2
                }px`,
              }}
            >
              {edge.type}
            </span>
          );
        })}


      {/* ======================================================
          ACTIVE CONDITION STATUS
      ====================================================== */}

      {activeCondition &&
        conditionResult !==
          null && (
          <div
            className="
              absolute
              left-1/2
              font-mono
              text-[9px]
              font-black
              uppercase
              tracking-[0.16em]
              opacity-60
            "
            style={{
              top: `${
                layout[
                  activeCondition.id
                ].y + 82
              }px`,
              transform:
                "translateX(-50%)",
            }}
          >
            {conditionResult
              ? "condition passed"
              : "condition failed"}
          </div>
        )}


      {/* ======================================================
          ANIMATIONS
      ====================================================== */}

      <style>
        {`
          @keyframes nodePulse {
            0% {
              opacity: 0;
              transform: scale(1);
            }

            35% {
              opacity: 1;
              transform: scale(1.02);
            }

            100% {
              opacity: 0;
              transform: scale(1.08);
            }
          }

          @keyframes flowTravel {
            from {
              stroke-dashoffset: 30;
            }

            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes flowTravelDark {
            from {
              stroke-dashoffset: 22;
            }

            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes flowDot {
            0% {
              opacity: 0;
              transform: scale(0.7);
            }

            30% {
              opacity: 1;
              transform: scale(1);
            }

            70% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0;
              transform: scale(0.7);
            }
          }

          @keyframes conditionIn {
            from {
              opacity: 0;
              transform: translateY(-3px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
