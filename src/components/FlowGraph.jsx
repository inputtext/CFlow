/* ============================================================
   C·FLOW — DYNAMIC FLOW GRAPH
   ============================================================

   The graph is now driven by the backend's:
     nodes[]
     edges[]

   The old version had hardcoded nodes such as:
     INITIALIZE
     i <= 10 ?
     sum += evenNum
     evenNum += 2
     i++
     EXIT

   That meant changing the code in the editor could change Memory
   and execution while the middle graph stayed frozen.

   This component removes that limitation.
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
  const background =
    type === "condition"
      ? "bg-[#FFE3A3]"
      : type === "exit"
        ? "bg-[#FFD6E7]"
        : type === "start"
          ? "bg-[#FFF9F0]"
          : "bg-white";

  const isCondition = type === "condition";

  const conditionState =
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
            ? `
              translate-y-[-2px]
              scale-[1.035]
              shadow-[6px_6px_0_#171717]
            `
            : ""
        }

        ${
          conditionState === "true" ||
          conditionState === "false"
            ? "ring-2 ring-[#171717] ring-offset-2 ring-offset-[#E8DFFF]"
            : ""
        }
      `}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <span
        className={`
          block
          transition-all
          duration-300
          ${active ? "opacity-100" : "opacity-90"}
          ${active ? "tracking-[0.01em]" : ""}
        `}
      >
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
            animate-[conditionResultIn_0.3s_ease-out]
          "
        >
          {conditionState === "checking" && (
            <>
              <span
                className="
                  h-2
                  w-2
                  rounded-full
                  border
                  border-[#171717]
                  bg-[#171717]
                  animate-[conditionChecking_0.8s_ease-in-out_infinite]
                "
              />
              <span className="text-[9px] uppercase tracking-[0.18em] opacity-65">
                evaluating
              </span>
            </>
          )}

          {conditionState === "true" && (
            <>
              <span className="text-sm leading-none">✓</span>
              <span className="text-[10px] uppercase tracking-[0.18em]">
                TRUE
              </span>
            </>
          )}

          {conditionState === "false" && (
            <>
              <span className="text-sm leading-none">×</span>
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

      {isCondition &&
        active &&
        conditionResult !== null && (
          <span
            className="
              pointer-events-none
              absolute
              -right-[7px]
              -top-[7px]
              flex
              h-4
              w-4
              items-center
              justify-center
              border-2
              border-[#171717]
              bg-[#FFF9F0]
              font-mono
              text-[9px]
              font-black
              animate-[conditionBadgeIn_0.3s_ease-out]
            "
          >
            {conditionResult ? "T" : "F"}
          </span>
        )}
    </div>
  );
}


/* ============================================================
   EDGE
   ============================================================ */

function FlowPath({
  d,
  active = false,
  loop = false,
  conditionPath = false,
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
        opacity={active ? "1" : "0.8"}
        className="transition-opacity duration-300"
      />

      {active && (
        <>
          <path
            d={d}
            fill="none"
            stroke="#FFE3A3"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="12 18"
            markerEnd="url(#cflow-arrow-active)"
            className="
              opacity-90
              animate-[flowTravel_0.8s_linear_infinite]
            "
          />

          <path
            d={d}
            fill="none"
            stroke="#171717"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="7 15"
            className="
              animate-[flowTravelDark_0.8s_linear_infinite]
            "
          />

          {!loop && (
            <circle
              r="5"
              fill="#171717"
              className="animate-[flowDot_0.8s_ease-in-out_infinite]"
            >
              <animateMotion
                dur="0.9s"
                repeatCount="indefinite"
                path={d}
              />
            </circle>
          )}

          {loop && (
            <circle
              r="4"
              fill="#171717"
              className="animate-[loopDot_1.1s_ease-in-out_infinite]"
            >
              <animateMotion
                dur="1.1s"
                repeatCount="indefinite"
                path={d}
              />
            </circle>
          )}
        </>
      )}

      {active && conditionPath && (
        <circle
          r="3"
          fill="#171717"
          className="animate-[conditionPathPulse_0.8s_ease-in-out_infinite]"
        >
          <animateMotion
            dur="0.9s"
            repeatCount="indefinite"
            path={d}
          />
        </circle>
      )}
    </>
  );
}


/* ============================================================
   LABEL NORMALIZATION
   ============================================================ */

function displayLabel(node) {
  if (!node) return "";

  const label =
    node.label ??
    node.code ??
    node.id ??
    "";

  if (label === "START") return "START";
  if (label === "EXIT") return "EXIT";

  return String(label);
}


/* ============================================================
   NODE TYPE NORMALIZATION
   ============================================================ */

function displayType(node) {
  if (!node) return "operation";

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
   EDGE PATH GENERATOR
   ============================================================ */

function buildEdgePath(from, to, edge, layout) {
  const a = layout[from];
  const b = layout[to];

  if (!a || !b) return "";

  const startX = a.x;
  const startY = a.y + 65;

  const endX = b.x;
  const endY = b.y;

  // Loop/back edge.
  const isBackEdge =
    b.y < a.y ||
    edge?.type === "loop" ||
    edge?.type === "back";

  if (isBackEdge) {
    const rightX =
      Math.max(a.x, b.x) + 210;

    const controlY =
      Math.min(a.y, b.y) + 20;

    return `
      M ${startX} ${startY}
      C ${rightX} ${startY}
        ${rightX} ${controlY}
        ${endX} ${endY}
    `;
  }

  // Branching edge: use a slight horizontal curve.
  if (Math.abs(startX - endX) > 5) {
    const middleY =
      startY + (endY - startY) * 0.5;

    return `
      M ${startX} ${startY}
      C ${startX} ${middleY}
        ${endX} ${middleY}
        ${endX} ${endY}
    `;
  }

  // Normal vertical edge.
  return `
    M ${startX} ${startY}
    L ${endX} ${endY}
  `;
}


/* ============================================================
   FLOW GRAPH
   ============================================================ */

export default function FlowGraph({
  nodes = null,
  edges = null,
  activeNode,
  activeEdge,
  conditionResult = null,
}) {
  /*
   * Before backend analysis, keep the old visualizer visible.
   * Once backend nodes exist, everything below becomes dynamic.
   */
  const fallbackNodes = [
    {
      id: "initialize",
      label: "INITIALIZE",
      type: "operation",
    },
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

  const fallbackEdges = [
    {
      id: "initializeToCondition",
      from: "initialize",
      to: "condition",
    },
    {
      id: "conditionToSum",
      from: "condition",
      to: "sum",
    },
    {
      id: "sumToEven",
      from: "sum",
      to: "evenNum",
    },
    {
      id: "evenToIncrement",
      from: "evenNum",
      to: "increment",
    },
    {
      id: "incrementToCondition",
      from: "increment",
      to: "condition",
      type: "loop",
    },
    {
      id: "conditionToExit",
      from: "condition",
      to: "exit",
    },
  ];

  const usingBackendGraph =
    Array.isArray(nodes) &&
    nodes.length > 0;

  const graphNodes =
    usingBackendGraph
      ? nodes
      : fallbackNodes;

  const graphEdges =
    usingBackendGraph &&
    Array.isArray(edges)
      ? edges
      : fallbackEdges;

  /*
   * Put nodes into a clean vertical layout.
   *
   * We deliberately calculate this from the number of nodes
   * instead of hardcoding six positions.
   */
  const layout = {};

  const orderedNodes = [...graphNodes];

  orderedNodes.forEach((node, index) => {
    const isExit =
      displayType(node) === "exit";

    const isStart =
      displayType(node) === "start";

    layout[node.id] = {
      x: 500,
      y: isExit
        ? Math.max(
            24,
            (orderedNodes.length - 1) * 105
          )
        : index * 105 + 24,
    };

    // Start and exit stay in the center for
    // ordinary linear programs.
    if (isStart) {
      layout[node.id].y = 24;
    }
  });

  /*
   * Give an exit node a little breathing room.
   */
  const graphHeight =
    Math.max(
      620,
      orderedNodes.length * 105 + 70
    );

  const conditionIsActive =
    graphNodes.some(
      (node) =>
        node.id === activeNode &&
        displayType(node) === "condition"
    );

  const trueIsActive =
    conditionIsActive &&
    conditionResult === true;

  const falseIsActive =
    conditionIsActive &&
    conditionResult === false;

  return (
    <div
      className="
        relative
        w-full
        min-w-[760px]
        overflow-visible
      "
      style={{
        minHeight: `${graphHeight}px`,
      }}
    >
      {/* ======================================================
          NODES
      ====================================================== */}

      {orderedNodes.map((node) => {
        const type =
          displayType(node);

        return (
          <FlowNode
            key={node.id}
            id={node.id}
            label={displayLabel(node)}
            type={type}
            active={activeNode === node.id}
            conditionResult={conditionResult}
            x={layout[node.id].x}
            y={layout[node.id].y}
          />
        );
      })}

      {/* ======================================================
          CONNECTIONS
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

        {graphEdges.map((edge) => {
          const d = buildEdgePath(
            edge.from,
            edge.to,
            edge,
            layout
          );

          if (!d) return null;

          const isLoop =
            edge.type === "loop" ||
            edge.type === "back" ||
            layout[edge.to]?.y <
              layout[edge.from]?.y;

          const isConditionPath =
            edge.type === "true" ||
            edge.type === "false";

          return (
            <FlowPath
              key={edge.id}
              d={d}
              active={
                activeEdge === edge.id
              }
              loop={isLoop}
              conditionPath={
                isConditionPath
              }
            />
          );
        })}
      </svg>

      {/* ======================================================
          CONDITION LABELS
      ====================================================== */}

      {graphEdges
        .filter(
          (edge) =>
            edge.type === "true" ||
            edge.type === "false"
        )
        .map((edge) => {
          const from =
            layout[edge.from];

          const to =
            layout[edge.to];

          if (!from || !to) {
            return null;
          }

          const isTrue =
            edge.type === "true";

          return (
            <span
              key={`label-${edge.id}`}
              className={`
                absolute
                font-mono
                text-[10px]
                font-bold
                transition-all
                duration-300
                ${
                  (
                    isTrue &&
                    trueIsActive
                  ) ||
                  (
                    !isTrue &&
                    falseIsActive
                  )
                    ? "font-black opacity-100"
                    : "opacity-65"
                }
              `}
              style={{
                left: `${
                  (from.x + to.x) / 2 + 15
                }px`,
                top: `${
                  (from.y + to.y) / 2
                }px`,
              }}
            >
              {isTrue
                ? "TRUE"
                : "FALSE"}
            </span>
          );
        })}

      {/* ======================================================
          LOOP LABEL
      ====================================================== */}

      {graphEdges.some(
        (edge) =>
          edge.type === "loop" ||
          edge.type === "back" ||
          layout[edge.to]?.y <
            layout[edge.from]?.y
      ) && (
        <span
          className={`
            absolute
            right-[2%]
            top-[42%]
            rotate-[-78deg]
            font-mono
            text-[10px]
            font-bold
            transition-all
            duration-300
            ${
              graphEdges.some(
                (edge) =>
                  edge.id === activeEdge &&
                  (
                    edge.type === "loop" ||
                    edge.type === "back"
                  )
              )
                ? "font-black opacity-100 animate-[loopLabelPulse_1s_ease-in-out_infinite]"
                : "opacity-70"
            }
          `}
        >
          LOOP BACK
        </span>
      )}

      {/* ======================================================
          CONDITION STATUS
      ====================================================== */}

      {conditionIsActive &&
        conditionResult !== null && (
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
              animate-[conditionStatusIn_0.3s_ease-out]
            "
            style={{
              top: `${
                (layout[activeNode]?.y ?? 0) + 80
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

          @keyframes loopDot {
            0% {
              opacity: 0;
              transform: scale(0.65);
            }

            20% {
              opacity: 1;
              transform: scale(1);
            }

            80% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0;
              transform: scale(0.65);
            }
          }

          @keyframes loopLabelPulse {
            0% {
              opacity: 0.7;
            }

            50% {
              opacity: 1;
            }

            100% {
              opacity: 0.7;
            }
          }

          @keyframes conditionResultIn {
            0% {
              opacity: 0;
              transform: translateY(-3px);
            }

            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes conditionChecking {
            0% {
              opacity: 0.35;
              transform: scale(0.8);
            }

            50% {
              opacity: 1;
              transform: scale(1.15);
            }

            100% {
              opacity: 0.35;
              transform: scale(0.8);
            }
          }

          @keyframes conditionBadgeIn {
            0% {
              opacity: 0;
              transform: scale(0.65);
            }

            70% {
              opacity: 1;
              transform: scale(1.08);
            }

            100% {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes conditionPathPulse {
            0% {
              opacity: 0.2;
              transform: scale(0.75);
            }

            50% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0.2;
              transform: scale(0.75);
            }
          }

          @keyframes conditionStatusIn {
            from {
              opacity: 0;
              transform: translate(-50%, -3px);
            }

            to {
              opacity: 0.6;
              transform: translate(-50%, 0);
            }
          }
        `}
      </style>
    </div>
  );
}
