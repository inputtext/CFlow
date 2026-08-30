import { useMemo } from "react";

const NODE_W = 240;
const NODE_H = 78;
const CONDITION_H = 92;
const TERMINAL_H = 64;
const GAP_Y = 112;
const VIEW_W = 1000;
const CENTER_X = 500;
const LOOP_X = 730;
const BRANCH_X = 760;

function typeOf(node) {
  if (!node) return "operation";
  if (node.type === "condition") return "condition";
  if (node.type === "start") return "start";
  if (node.type === "exit") return "exit";
  if (node.type === "output") return "output";
  return "operation";
}

function labelOf(node) {
  return String(node?.label ?? node?.code ?? node?.id ?? "");
}

function nodeHeight(node) {
  const type = typeOf(node);
  if (type === "condition") return CONDITION_H;
  if (type === "start" || type === "exit") return TERMINAL_H;
  return NODE_H;
}

function wrapLabel(label, maxChars) {
  const words = String(label).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function NodeBox({ node, position, active, conditionResult }) {
  const type = typeOf(node);
  const label = labelOf(node);
  const lines = wrapLabel(label, type === "condition" ? 25 : 28);

  const background =
    type === "condition"
      ? "#FFE3A3"
      : type === "exit"
        ? "#FFD6E7"
        : type === "start"
          ? "#FFF9F0"
          : "#FFFFFF";

  const activeCondition =
    type === "condition" && active;

  return (
    <div
      data-flow-node={node.id}
      className={`absolute z-10 flex items-center justify-center border-2 border-[#171717] px-5 text-center font-mono font-bold transition-all duration-300 ${
        type === "start" || type === "exit"
          ? "rounded-[34px]"
          : ""
      } ${
        active
          ? "scale-[1.035] shadow-[6px_6px_0_#171717]"
          : "shadow-[4px_4px_0_#171717]"
      }`}
      style={{
        width: `${NODE_W}px`,
        height: `${nodeHeight(node)}px`,
        left: `${position.x}%`,
        top: `${position.y}px`,
        transform: `translateX(-50%) ${active ? "scale(1.035)" : "scale(1)"}`,
        background,
      }}
    >
      <div className="max-w-full">
        {lines.map((line, index) => (
          <div key={`${node.id}-${index}`} className="leading-tight">
            {line}
          </div>
        ))}

        {activeCondition && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em]">
            {conditionResult === true
              ? "✓ TRUE"
              : conditionResult === false
                ? "× FALSE"
                : "EVALUATING"}
          </div>
        )}
      </div>
    </div>
  );
}

function findEdge(edges, from, type) {
  return edges.find(
    (edge) =>
      edge.from === from &&
      (!type || edge.type === type)
  );
}

function makeLayout(nodes, edges) {
  const ordered = [...nodes];
  const index = new Map(
    ordered.map((node, i) => [node.id, i])
  );

  const lane = new Map(
    ordered.map((node) => [node.id, 0])
  );

  /*
   * A loop is represented by:
   * condition --true--> first body node
   * last body node --loop--> condition
   * condition --false--> node after loop
   *
   * Put the body in a dedicated right-hand lane. This keeps the
   * loop-back edge visible instead of drawing it through the nodes.
   */
  for (const condition of ordered) {
    if (
      !["for", "while"].includes(
        condition.controlType
      )
    ) {
      continue;
    }

    const trueEdge = findEdge(
      edges,
      condition.id,
      "true"
    );

    const loopEdge = edges.find(
      (edge) =>
        edge.to === condition.id &&
        edge.type === "loop"
    );

    if (!trueEdge || !loopEdge) continue;

    const firstIndex = index.get(trueEdge.to);
    const lastIndex = index.get(loopEdge.from);

    if (
      firstIndex == null ||
      lastIndex == null ||
      firstIndex > lastIndex
    ) {
      continue;
    }

    for (
      let i = firstIndex;
      i <= lastIndex;
      i++
    ) {
      lane.set(
        ordered[i].id,
        1
      );
    }
  }

  /*
   * For ordinary if/else branches, put the TRUE branch to the
   * right and the FALSE branch to the left. The branch nodes then
   * rejoin the normal center lane.
   */
  for (const condition of ordered) {
    if (
      typeOf(condition) !== "condition" ||
      ["for", "while"].includes(
        condition.controlType
      )
    ) {
      continue;
    }

    const trueEdge = findEdge(
      edges,
      condition.id,
      "true"
    );
    const falseEdge = findEdge(
      edges,
      condition.id,
      "false"
    );

    if (trueEdge) {
      lane.set(
        trueEdge.to,
        1
      );
    }

    if (falseEdge) {
      lane.set(
        falseEdge.to,
        -1
      );
    }
  }

  const layout = {};

  ordered.forEach((node, i) => {
    const nodeLane = lane.get(node.id) || 0;

    const x =
      nodeLane > 0
        ? LOOP_X
        : nodeLane < 0
          ? 100 - (BRANCH_X / 10)
          : CENTER_X;

    layout[node.id] = {
      x,
      y: 30 + i * GAP_Y,
    };
  });

  return layout;
}

function pointFor(node, position, side) {
  const height = nodeHeight(node);
  const halfW = NODE_W / 2;

  if (side === "top") {
    return {
      x: position.x * 10,
      y: position.y,
    };
  }

  if (side === "bottom") {
    return {
      x: position.x * 10,
      y: position.y + height,
    };
  }

  if (side === "left") {
    return {
      x: position.x * 10 - halfW,
      y: position.y + height / 2,
    };
  }

  return {
    x: position.x * 10 + halfW,
    y: position.y + height / 2,
  };
}

function pathFor(edge, nodesById, layout) {
  const fromNode = nodesById.get(edge.from);
  const toNode = nodesById.get(edge.to);
  const from = layout[edge.from];
  const to = layout[edge.to];

  if (!fromNode || !toNode || !from || !to) {
    return null;
  }

  const isLoop = edge.type === "loop";
  const isTrue = edge.type === "true";
  const isFalse = edge.type === "false";

  if (isLoop) {
    const start = pointFor(
      fromNode,
      from,
      "right"
    );
    const end = pointFor(
      toNode,
      to,
      "left"
    );

    const loopX = Math.min(
      965,
      Math.max(start.x, end.x) + 105
    );

    const topY = Math.max(
      20,
      end.y - 38
    );

    return `M ${start.x} ${start.y}
      C ${loopX} ${start.y},
        ${loopX} ${topY},
        ${end.x} ${topY}
      C ${end.x - 18} ${topY},
        ${end.x - 18} ${end.y},
        ${end.x} ${end.y}`;
  }

  if (isTrue || isFalse) {
    const start = pointFor(
      fromNode,
      from,
      isTrue ? "right" : "left"
    );

    const end = pointFor(
      toNode,
      to,
      isTrue ? "left" : "right"
    );

    const direction = isTrue ? 1 : -1;
    const bend = 85 * direction;

    return `M ${start.x} ${start.y}
      C ${start.x + bend} ${start.y},
        ${end.x - bend} ${end.y},
        ${end.x} ${end.y}`;
  }

  const start = pointFor(
    fromNode,
    from,
    "bottom"
  );
  const end = pointFor(
    toNode,
    to,
    "top"
  );

  if (Math.abs(start.x - end.x) < 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const middleY =
    start.y + (end.y - start.y) / 2;

  return `M ${start.x} ${start.y}
    C ${start.x} ${middleY},
      ${end.x} ${middleY},
      ${end.x} ${end.y}`;
}

function FlowEdge({
  edge,
  nodesById,
  layout,
  active,
}) {
  const d = pathFor(
    edge,
    nodesById,
    layout
  );

  if (!d) return null;

  const isLoop =
    edge.type === "loop";

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#171717"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#cflow-arrow)"
        opacity={active ? 1 : 0.78}
      />

      {active && (
        <path
          d={d}
          fill="none"
          stroke="#FFE3A3"
          strokeWidth="8"
          strokeDasharray="12 18"
          strokeLinecap="round"
          className="animate-[flowTravel_0.8s_linear_infinite]"
        />
      )}

      {(edge.type === "true" ||
        edge.type === "false") && (
        <text
          x={0}
          y={0}
          className="fill-[#171717] font-mono text-[11px] font-bold"
        >
          {edge.type === "true"
            ? "TRUE"
            : "FALSE"}
        </text>
      )}

      {isLoop && (
        <text
          x={760}
          y={Math.max(
            30,
            layout[edge.to]?.y - 12
          )}
          className="fill-[#171717] font-mono text-[10px] font-bold"
        >
          LOOP BACK
        </text>
      )}
    </g>
  );
}

export default function FlowGraph({
  nodes = null,
  edges = null,
  activeNode = null,
  activeEdge = null,
  conditionResult = null,
}) {
  const fallbackNodes = [
    {
      id: "start",
      label: "START",
      type: "start",
    },
    {
      id: "exit",
      label: "EXIT",
      type: "exit",
    },
  ];

  const fallbackEdges = [
    {
      id: "fallback",
      from: "start",
      to: "exit",
      type: "normal",
    },
  ];

  const graphNodes =
    Array.isArray(nodes) && nodes.length
      ? nodes
      : fallbackNodes;

  const graphEdges =
    Array.isArray(edges) && edges.length
      ? edges
      : fallbackEdges;

  const nodesById = useMemo(
    () =>
      new Map(
        graphNodes.map((node) => [
          node.id,
          node,
        ])
      ),
    [graphNodes]
  );

  const layout = useMemo(
    () =>
      makeLayout(
        graphNodes,
        graphEdges
      ),
    [graphNodes, graphEdges]
  );

  const graphHeight = Math.max(
    620,
    graphNodes.length * GAP_Y + 90
  );

  return (
    <div
      className="relative h-full w-full min-w-0 overflow-visible"
      style={{
        minHeight: `${graphHeight}px`,
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${graphHeight}`}
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
        </defs>

        {graphEdges.map((edge) => (
          <FlowEdge
            key={
              edge.id ||
              `${edge.from}-${edge.to}-${edge.type}`
            }
            edge={edge}
            nodesById={nodesById}
            layout={layout}
            active={edge.id === activeEdge}
          />
        ))}
      </svg>

      {graphNodes.map((node) => (
        <NodeBox
          key={node.id}
          node={node}
          position={layout[node.id]}
          active={node.id === activeNode}
          conditionResult={conditionResult}
        />
      ))}
    </div>
  );
}
