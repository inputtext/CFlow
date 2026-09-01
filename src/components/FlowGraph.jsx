import { useEffect, useMemo, useRef, useState } from "react";

const NODE_W = 220;
const NODE_H = 72;
const CONDITION_H = 88;
const TERMINAL_H = 62;
const GAP_Y = 104;
const TOP_Y = 34;
const VIEW_W = 900;
const CENTER_X = 50;
const LEFT_X = 27;
const RIGHT_X = 73;
const LOOP_OUTER_X = 835;

const LOOP_TYPES = new Set(["for", "while", "do", "loop"]);

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
      if (edge.from === id && edge.type !== "loop") {
        queue.push(edge.to);
      }
    }
  }

  return seen;
}

function findMergeNode(edges, yesId, noId) {
  if (!yesId || !noId) return null;

  const yesReachable = reachableFrom(yesId, edges);
  const noReachable = reachableFrom(noId, edges);
  const common = [];

  for (const id of yesReachable) {
    if (noReachable.has(id)) common.push(id);
  }

  if (!common.length) return null;

  // The graph builder keeps nodes in execution order. Choosing the first
  // common node gives us the nearest visual merge point instead of sending
  // one branch all the way to the bottom of the graph.
  const index = new Map();
  for (let i = 0; i < common.length; i += 1) index.set(common[i], i);

  for (const edge of edges) {
    if (common.includes(edge.from)) return edge.from;
    if (common.includes(edge.to)) return edge.to;
  }

  return common.sort((a, b) => String(a).localeCompare(String(b)))[0] ?? null;
}

function makeRanks(nodes, edges) {
  const rank = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const start = nodes.find((node) => typeOf(node) === "start") ?? nodes[0];

  if (start) rank.set(start.id, 0);

  // Relax only non-loop edges. A small bounded number of passes keeps this
  // safe even when an unusual backend graph contains another cycle.
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;

    for (const edge of edges) {
      if (edge.type === "loop") continue;

      const fromRank = rank.get(edge.from);
      if (!Number.isFinite(fromRank)) continue;

      const nextRank = fromRank + 1;
      if (nextRank < (rank.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        rank.set(edge.to, nextRank);
        changed = true;
      }
    }

    if (!changed) break;
  }

  let fallbackRank = 0;
  nodes.forEach((node, index) => {
    if (!Number.isFinite(rank.get(node.id))) {
      rank.set(node.id, fallbackRank + index);
    }
    fallbackRank = Math.max(fallbackRank, rank.get(node.id));
  });

  return rank;
}

function makeLayout(nodes, edges) {
  const layout = {};
  const ranks = makeRanks(nodes, edges);
  const laneSets = new Map(nodes.map((node) => [node.id, new Set()]));

  // First allocate explicit TRUE/FALSE lanes. We stop each lane at the
  // nearest common node so branches do not drag unrelated downstream nodes
  // to the side of the graph.
  for (const condition of nodes) {
    if (typeOf(condition) !== "condition") continue;
    if (LOOP_TYPES.has(condition.controlType)) continue;

    const yes = outgoing(edges, condition.id, "true");
    const no = outgoing(edges, condition.id, "false");
    if (!yes || !no) continue;

    const mergeId = findMergeNode(edges, yes.to, no.to);
    const yesReachable = reachableFrom(yes.to, edges);
    const noReachable = reachableFrom(no.to, edges);

    for (const node of nodes) {
      if (node.id === mergeId || node.id === condition.id) continue;

      const inYes = yesReachable.has(node.id);
      const inNo = noReachable.has(node.id);

      if (inYes && !inNo) laneSets.get(node.id)?.add(1);
      if (inNo && !inYes) laneSets.get(node.id)?.add(-1);
    }
  }

  // A node reachable from both sides is a merge and must return to center.
  const rankGroups = new Map();
  for (const node of nodes) {
    const nodeRank = ranks.get(node.id) ?? 0;
    if (!rankGroups.has(nodeRank)) rankGroups.set(nodeRank, []);
    rankGroups.get(nodeRank).push(node);
  }

  const sortedRanks = [...rankGroups.keys()].sort((a, b) => a - b);

  for (const nodeRank of sortedRanks) {
    const group = rankGroups.get(nodeRank);

    group.sort((a, b) => {
      const aLane = laneSets.get(a.id)?.size === 1 ? [...laneSets.get(a.id)][0] : 0;
      const bLane = laneSets.get(b.id)?.size === 1 ? [...laneSets.get(b.id)][0] : 0;
      return aLane - bLane;
    });

    const laneCounts = new Map();

    group.forEach((node) => {
      const lanes = laneSets.get(node.id) ?? new Set();
      let lane = lanes.size === 1 ? [...lanes][0] : 0;

      if (typeOf(node) === "condition" && !LOOP_TYPES.has(node.controlType)) {
        lane = 0;
      }

      if (typeOf(node) === "start" || typeOf(node) === "exit" || typeOf(node) === "output") {
        // Merge/terminal nodes are visually strongest in the center.
        if (lanes.size !== 1) lane = 0;
      }

      const count = laneCounts.get(lane) ?? 0;
      laneCounts.set(lane, count + 1);

      let x = CENTER_X;
      if (lane < 0) x = LEFT_X;
      if (lane > 0) x = RIGHT_X;

      // If the backend gives multiple nodes the same rank/lane, keep them
      // readable without changing the overall branch geometry.
      if (count > 0) {
        const offset = Math.min(8, count * 7);
        x = lane < 0 ? LEFT_X - offset : lane > 0 ? RIGHT_X + offset : CENTER_X + (count % 2 ? 8 : -8);
      }

      layout[node.id] = {
        x: Math.max(15, Math.min(85, x)),
        y: TOP_Y + nodeRank * GAP_Y,
      };
    });
  }

  // Any nodes omitted from the ranked pass still receive a stable position.
  nodes.forEach((node, index) => {
    if (layout[node.id]) return;
    layout[node.id] = {
      x: CENTER_X,
      y: TOP_Y + index * GAP_Y,
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

function branchPath(edge, fromNode, toNode, from, to) {
  const truth = edge.type === "true";
  const start = pointFor(fromNode, from, "bottom");
  const end = pointFor(toNode, to, "top");
  const direction = truth ? 1 : -1;

  // If a branch points backward, route it around the appropriate side.
  if (to.y <= from.y) {
    const sideX = (truth ? RIGHT_X : LEFT_X) / 100 * VIEW_W;
    const startX = direction > 0 ? start.x + 28 : start.x - 28;
    return `M ${start.x} ${start.y}
      C ${startX} ${start.y + 30}, ${sideX} ${end.y - 30}, ${sideX} ${end.y - 12}
      C ${sideX} ${end.y - 4}, ${end.x} ${end.y - 4}, ${end.x} ${end.y}`;
  }

  const verticalGap = Math.max(34, end.y - start.y);
  const branchY = start.y + Math.min(48, verticalGap * 0.45);
  const laneX = end.x;

  return `M ${start.x} ${start.y}
    C ${start.x} ${branchY}, ${laneX} ${branchY}, ${laneX} ${end.y}`;
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
    const outerX = Math.max(start.x + 80, LOOP_OUTER_X);
    const returnY = end.y;

    return `M ${start.x} ${start.y}
      C ${outerX} ${start.y}, ${outerX} ${returnY}, ${end.x} ${returnY}`;
  }

  if (edge.type === "true" || edge.type === "false") {
    return branchPath(edge, fromNode, toNode, from, to);
  }

  const start = pointFor(fromNode, from, "bottom");
  const end = pointFor(toNode, to, "top");

  if (Math.abs(start.x - end.x) < 2) {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const middleY = start.y + Math.max(30, (end.y - start.y) / 2);
  return `M ${start.x} ${start.y}
    C ${start.x} ${middleY}, ${end.x} ${middleY}, ${end.x} ${end.y}`;
}

function edgeLabel(edge, nodesById, layout) {
  const from = layout[edge.from];
  const to = layout[edge.to];
  if (!from || !to) return null;

  if (edge.type === "loop") {
    return {
      x: VIEW_W - 130,
      y: Math.max(28, to.y - 18),
      text: "LOOP BACK",
      width: 88,
    };
  }

  if (edge.type === "true" || edge.type === "false") {
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);
    const truth = edge.type === "true";
    const start = pointFor(fromNode, from, "bottom");
    const end = pointFor(toNode, to, "top");
    const branchY = start.y + Math.min(48, Math.max(34, (end.y - start.y) * 0.45));

    return {
      x: truth ? end.x - 34 : end.x + 34,
      y: Math.max(start.y + 20, branchY - 10),
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

  const maxY = graphNodes.reduce(
    (max, node) => Math.max(max, (layout[node.id]?.y ?? TOP_Y) + nodeHeight(node)),
    TOP_Y,
  );

  const graphHeight = Math.max(620, maxY + 110);
  const activeEdgeId = typeof activeEdge === "string" ? activeEdge : activeEdge?.id;

  useEffect(() => {
    if (!activeNode || !scrollRef.current) return undefined;

    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;

      const element = container.querySelector(
        `[data-flow-node="${activeNode}"]`,
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
        className="pointer-events-auto absolute right-3 top-3 z-30 flex items-center gap-1 rounded-[12px] border-2 border-[#171717] bg-[#FFF9F0] p-1 shadow-[3px_3px_0_#171717]"
        aria-label="Flowchart zoom controls"
      >
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.1).toFixed(1))))}
          className="h-8 w-8 font-mono text-lg font-bold hover:-translate-y-0.5"
        >
          −
        </button>

        <span className="min-w-[54px] text-center font-mono text-sm font-bold">
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom((value) => Math.min(1.2, Number((value + 0.1).toFixed(1))))}
          className="h-8 w-8 font-mono text-lg font-bold hover:-translate-y-0.5"
        >
          +
        </button>
      </div>

      <div
        ref={scrollRef}
        className="h-full w-full overflow-auto rounded-[18px]"
      >
        <div
          className="relative mx-auto"
          style={{
            width: `${VIEW_W}px`,
            height: `${graphHeight * zoom}px`,
          }}
        >
          <div
            className="relative origin-top"
            style={{
              width: `${VIEW_W}px`,
              height: `${graphHeight}px`,
              transform: `scale(${zoom})`,
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0 z-0"
              width={VIEW_W}
              height={graphHeight}
              viewBox={`0 0 ${VIEW_W} ${graphHeight}`}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="cflow-arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="5"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#171717" />
                </marker>
              </defs>

              {graphEdges.map((edge) => (
                <FlowEdge
                  key={edge.id ?? `${edge.from}-${edge.to}-${edge.type}`}
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
    </div>
  );
}
