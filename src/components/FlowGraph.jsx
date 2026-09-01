import { useEffect, useMemo, useRef, useState } from "react";

const NODE_W = 220;
const NODE_H = 72;
const CONDITION_H = 88;
const TERMINAL_H = 62;
const GAP_Y = 104;
const TOP_Y = 34;
const VIEW_W = 900;
const CENTER_X = 50;
const LEFT_X = 24;
const RIGHT_X = 70;

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
  switch (typeOf(node)) {
    case "condition":
      return CONDITION_H;
    case "start":
    case "exit":
      return TERMINAL_H;
    default:
      return NODE_H;
  }
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
  const lines = wrapLabel(labelOf(node), type === "condition" ? 23 : 27);

  const background =
    type === "condition"
      ? "#FFE3A3"
      : type === "exit"
        ? "#FFD6E7"
        : type === "start"
          ? "#FFF9F0"
          : type === "output"
            ? "#DDF4EA"
            : "#FFFFFF";

  return (
    <div
      data-flow-node={node.id}
      className={`cflow-flow-node cflow-flow-node--${type} absolute z-10 flex items-center justify-center border-2 border-[#171717] px-4 text-center font-mono font-bold transition-all duration-300 ${
        type === "start" || type === "exit" ? "rounded-[32px]" : "rounded-[16px]"
      } ${active ? "shadow-[6px_6px_0_#171717]" : "shadow-[4px_4px_0_#171717]"}`}
      style={{
        width: NODE_W,
        height: nodeHeight(node),
        left: `${position.x}%`,
        top: position.y,
        transform: `translateX(-50%) ${active ? "scale(1.025)" : "scale(1)"}`,
        transformOrigin: "center center",
        background,
      }}
    >
      <div className="max-w-full">
        {lines.map((line, index) => (
          <div key={`${node.id}-${index}`} className="leading-tight">
            {line}
          </div>
        ))}

        {type === "condition" && active && (
          <div className="mt-2 text-[10px] uppercase tracking-[0.16em]">
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

function outgoing(edges, id, type) {
  return edges.find(
    (edge) => edge.from === id && (!type || edge.type === type),
  );
}

function reachableFrom(startId, edges) {
  const seen = new Set();
  const queue = [startId];

  while (queue.length) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    for (const edge of edges) {
      if (edge.from === id && edge.type !== "loop") queue.push(edge.to);
    }
  }

  return seen;
}

function findMergeNode(edges, yesId, noId) {
  if (!yesId || !noId) return null;

  const yesReachable = reachableFrom(yesId, edges);
  const noReachable = reachableFrom(noId, edges);

  for (const edge of edges) {
    if (yesReachable.has(edge.from) && noReachable.has(edge.from)) {
      return edge.from;
    }
  }

  for (const id of yesReachable) {
    if (noReachable.has(id)) return id;
  }

  return null;
}

function makeLayout(nodes, edges) {
  const layout = {};
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const lanes = new Map(nodes.map((node) => [node.id, 0]));

  for (const condition of nodes) {
    if (typeOf(condition) !== "condition") continue;
    if (["for", "while", "do", "loop"].includes(condition.controlType)) continue;

    const yes = outgoing(edges, condition.id, "true");
    const no = outgoing(edges, condition.id, "false");
    if (!yes || !no) continue;

    const mergeId = findMergeNode(edges, yes.to, no.to);
    const conditionIndex = index.get(condition.id);
    const mergeIndex = mergeId == null ? null : index.get(mergeId);

    const end = mergeIndex != null && conditionIndex != null
      ? mergeIndex
      : nodes.length;

    const yesIndex = index.get(yes.to);
    const noIndex = index.get(no.to);

    if (yesIndex != null) {
      for (let i = yesIndex; i < end; i++) {
        const node = nodes[i];
        if (node.id !== mergeId) lanes.set(node.id, 1);
      }
    }

    if (noIndex != null) {
      for (let i = noIndex; i < end; i++) {
        const node = nodes[i];
        if (node.id !== mergeId) lanes.set(node.id, -1);
      }
    }
  }

  nodes.forEach((node) => {
    if (["for", "while", "do", "loop"].includes(node.controlType)) {
      lanes.set(node.id, 0);
    }
  });

  nodes.forEach((node, i) => {
    const side = lanes.get(node.id) || 0;
    layout[node.id] = {
      x: side > 0 ? RIGHT_X : side < 0 ? LEFT_X : CENTER_X,
      y: TOP_Y + i * GAP_Y,
    };
  });

  return layout;
}

function pointFor(node, position, side) {
  const h = nodeHeight(node);
  const x = (position.x / 100) * VIEW_W;
  const halfW = NODE_W / 2;

  if (side === "top") return { x, y: position.y };
  if (side === "bottom") return { x, y: position.y + h };
  if (side === "left") return { x: x - halfW, y: position.y + h / 2 };
  return { x: x + halfW, y: position.y + h / 2 };
}

function pathFor(edge, nodesById, layout) {
  const fromNode = nodesById.get(edge.from);
  const toNode = nodesById.get(edge.to);
  const from = layout[edge.from];
  const to = layout[edge.to];

  if (!fromNode || !toNode || !from || !to) return null;

  if (edge.type === "loop") {
    const start = pointFor(fromNode, from, "right");
    const end = pointFor(toNode, to, "right");
    const outerX = VIEW_W - 74;
    const returnY = end.y;

    return `M ${start.x} ${start.y}
      C ${outerX} ${start.y}, ${outerX} ${returnY}, ${end.x} ${returnY}`;
  }

  if (edge.type === "true" || edge.type === "false") {
    const truth = edge.type === "true";
    const isLoopCondition =
      typeOf(fromNode) === "condition" &&
      ["for", "while", "do", "loop"].includes(fromNode.controlType);

    if (isLoopCondition && to.y > from.y) {
      const start = pointFor(fromNode, from, truth ? "bottom" : "left");
      const end = pointFor(toNode, to, "top");

      if (truth) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
      }

      const sideX = Math.max(26, start.x - 92);

      return `M ${start.x} ${start.y}
        C ${sideX} ${start.y}, ${sideX} ${end.y}, ${end.x} ${end.y}`;
    }

    const start = pointFor(fromNode, from, truth ? "right" : "left");
    const end = pointFor(toNode, to, truth ? "left" : "right");
    const horizontal = truth ? 70 : -70;

    return `M ${start.x} ${start.y} C ${start.x + horizontal} ${start.y}, ${end.x - horizontal} ${end.y}, ${end.x} ${end.y}`;
  }

  const start = pointFor(fromNode, from, "bottom");
  const end = pointFor(toNode, to, "top");

  if (Math.abs(start.x - end.x) < 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const middleY = start.y + (end.y - start.y) / 2;
  return `M ${start.x} ${start.y} C ${start.x} ${middleY}, ${end.x} ${middleY}, ${end.x} ${end.y}`;
}

function edgeLabel(edge, nodesById, layout) {
  const from = layout[edge.from];
  const to = layout[edge.to];
  if (!from || !to) return null;

  if (edge.type === "loop") {
    return {
      x: VIEW_W - 148,
      y: Math.max(28, to.y - 18),
      text: "LOOP BACK",
      width: 88,
    };
  }

  if (edge.type === "true" || edge.type === "false") {
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);
    const truth = edge.type === "true";
    const start = pointFor(
      fromNode,
      from,
      truth ? "bottom" : "left",
    );
    const end = pointFor(toNode, to, "top");

    return {
      x: truth
        ? (start.x + end.x) / 2
        : (start.x + end.x) / 2 - 6,
      y: (start.y + end.y) / 2 - 10,
      text: truth ? "TRUE" : "FALSE",
      width: 52,
    };
  }

  return null;
}

function FlowEdge({ edge, nodesById, layout, active }) {
  const d = pathFor(edge, nodesById, layout);
  if (!d) return null;

  const label = edgeLabel(edge, nodesById, layout);

  return (
    <g>
      {active && (
        <path
          d={d}
          fill="none"
          stroke="#FFE3A3"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      <path
        d={d}
        fill="none"
        stroke="#171717"
        strokeWidth={active ? 4 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd="url(#cflow-arrow)"
      />

      {label && (
        <g>
          <rect
            x={label.x - label.width / 2}
            y={label.y - 13}
            width={label.width}
            height="22"
            rx="11"
            fill="#FFF9F0"
            stroke="#171717"
            strokeWidth="2"
          />
          <text
            x={label.x}
            y={label.y + 2}
            textAnchor="middle"
            className="fill-[#171717] font-mono text-[9px] font-bold"
          >
            {label.text}
          </text>
        </g>
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
  const scrollRef = useRef(null);
  const [zoom, setZoom] = useState(1);

  const fallbackNodes = [
    { id: "start", label: "START", type: "start" },
    { id: "exit", label: "EXIT", type: "exit" },
  ];

  const fallbackEdges = [
    { id: "fallback", from: "start", to: "exit", type: "normal" },
  ];

  const graphNodes = Array.isArray(nodes) && nodes.length ? nodes : fallbackNodes;
  const graphEdges = Array.isArray(edges) && edges.length ? edges : fallbackEdges;

  const nodesById = useMemo(
    () => new Map(graphNodes.map((node) => [node.id, node])),
    [graphNodes],
  );

  const layout = useMemo(
    () => makeLayout(graphNodes, graphEdges),
    [graphNodes, graphEdges],
  );

  const graphHeight = Math.max(
    620,
    TOP_Y + graphNodes.reduce((height, node) => height + nodeHeight(node) + GAP_Y, 0),
  );

  const activeEdgeId = typeof activeEdge === "string" ? activeEdge : activeEdge?.id;

  useEffect(() => {
    if (!activeNode || !scrollRef.current) return undefined;

    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;

      const nodesInGraph = Array.from(
        container.querySelectorAll("[data-flow-node]"),
      );

      const element = nodesInGraph.find(
        (item) => item.getAttribute("data-flow-node") === String(activeNode),
      );

      if (!element) return;

      const nodeTop = element.offsetTop;
      const nodeBottom = nodeTop + element.offsetHeight;
      const visibleTop = container.scrollTop;
      const visibleBottom = visibleTop + container.clientHeight;

      if (nodeTop >= visibleTop + 24 && nodeBottom <= visibleBottom - 24) {
        return;
      }

      const targetTop =
        nodeTop - Math.max(0, (container.clientHeight - element.offsetHeight) / 2);
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

      container.scrollTo({
        top: Math.min(maxScroll, Math.max(0, targetTop)),
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeNode, graphHeight]);

  return (
    <div className="relative h-full w-full min-w-0">
      <div
        className="pointer-events-none absolute right-3 top-3 z-30 flex items-center gap-1 rounded-[12px] border-2 border-[#171717] bg-[#FFF9F0] p-1 shadow-[3px_3px_0_#171717]"
        aria-label="Flowchart zoom controls"
      >
        <button
          type="button"
          onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.1).toFixed(1))))}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-[8px] font-mono text-sm font-black transition-transform hover:scale-105 active:translate-y-px"
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>

        <button
          type="button"
          onClick={() => setZoom(1)}
          className="pointer-events-auto min-w-[52px] rounded-[8px] px-2 py-1 font-mono text-[10px] font-black tracking-wide transition-transform hover:scale-105"
          aria-label="Reset flowchart zoom"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.1).toFixed(1))))}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-[8px] font-mono text-sm font-black transition-transform hover:scale-105 active:translate-y-px"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
      </div>

      <div
        ref={scrollRef}
        className="relative h-full w-full min-w-0 overflow-auto rounded-[18px] bg-[#FFF9F0]"
      >
        <div
          className="relative mx-auto origin-top"
          style={{
            height: graphHeight,
            width: "100%",
            minWidth: 640,
            maxWidth: 900,
            zoom,
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
                <path d="M0,0 L8,4 L0,8 Z" fill="#171717" />
              </marker>
            </defs>

            {graphEdges.map((edge) => (
              <FlowEdge
                key={edge.id || `${edge.from}-${edge.to}-${edge.type}`}
                edge={edge}
                nodesById={nodesById}
                layout={layout}
                active={edge.id === activeEdgeId}
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
      </div>
    </div>
  );
}
