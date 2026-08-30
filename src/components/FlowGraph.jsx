import { useEffect, useMemo, useRef } from "react";

const NODE_W = 240;
const NODE_H = 78;
const CONDITION_H = 92;
const TERMINAL_H = 64;
const GAP_Y = 126;
const TOP_Y = 34;
const VIEW_W = 1000;
const CENTER_X = 50;
const LEFT_X = 24;
const RIGHT_X = 76;
const LOOP_X = 76;

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
    case "condition": return CONDITION_H;
    case "start":
    case "exit": return TERMINAL_H;
    default: return NODE_H;
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
  const lines = wrapLabel(labelOf(node), type === "condition" ? 24 : 27);

  const background =
    type === "condition" ? "#FFE3A3" :
    type === "exit" ? "#FFD6E7" :
    type === "start" ? "#FFF9F0" :
    type === "output" ? "#DDF4EA" : "#FFFFFF";

  return (
    <div
      data-flow-node={node.id}
      className={`absolute z-10 flex items-center justify-center border-2 border-[#171717] px-5 text-center font-mono font-bold transition-all duration-300 ${
        type === "start" || type === "exit" ? "rounded-[34px]" : "rounded-[18px]"
      } ${active ? "shadow-[7px_7px_0_#171717]" : "shadow-[4px_4px_0_#171717]"}`}
      style={{
        width: NODE_W,
        height: nodeHeight(node),
        left: `${position.x}%`,
        top: position.y,
        transform: `translateX(-50%) ${active ? "scale(1.035)" : "scale(1)"}`,
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
          <div className="mt-2 text-[10px] uppercase tracking-[0.18em]">
            {conditionResult === true ? "✓ TRUE" : conditionResult === false ? "× FALSE" : "EVALUATING"}
          </div>
        )}
      </div>
    </div>
  );
}

function findEdge(edges, from, type) {
  return edges.find((edge) => edge.from === from && (!type || edge.type === type));
}

function makeLayout(nodes, edges) {
  const layout = {};
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const lane = new Map(nodes.map((node) => [node.id, 0]));

  // Reserve the right lane for loop bodies. This keeps the loop-back line
  // outside the main execution column without changing the backend graph.
  for (const control of nodes) {
    if (!["for", "while"].includes(control.controlType)) continue;
    const enter = findEdge(edges, control.id, "true");
    const back = edges.find((edge) => edge.to === control.id && edge.type === "loop");
    if (!enter || !back) continue;

    const first = index.get(enter.to);
    const last = index.get(back.from);
    if (first == null || last == null || first > last) continue;
    for (let i = first; i <= last; i++) lane.set(nodes[i].id, 1);
  }

  // Non-loop IF branches get their own side lanes. Only the branch entry is
  // moved; normal nodes remain in the central column, keeping the graph calm.
  for (const condition of nodes) {
    if (typeOf(condition) !== "condition" || ["for", "while"].includes(condition.controlType)) continue;
    const yes = findEdge(edges, condition.id, "true");
    const no = findEdge(edges, condition.id, "false");
    if (yes) lane.set(yes.to, 1);
    if (no) lane.set(no.to, -1);
  }

  nodes.forEach((node, i) => {
    const side = lane.get(node.id) || 0;
    layout[node.id] = {
      x: side > 0 ? RIGHT_X : side < 0 ? LEFT_X : CENTER_X,
      y: TOP_Y + i * GAP_Y,
    };
  });

  return layout;
}

function pointFor(node, position, side) {
  const h = nodeHeight(node);
  const x = position.x * 10;
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
    const end = pointFor(toNode, to, "left");
    const outerX = Math.min(VIEW_W - 28, Math.max(start.x, end.x) + 105);
    const upperY = Math.max(24, end.y - 48);
    return `M ${start.x} ${start.y} C ${outerX} ${start.y}, ${outerX} ${upperY}, ${end.x} ${upperY} L ${end.x} ${end.y}`;
  }

  if (edge.type === "true" || edge.type === "false") {
    const truth = edge.type === "true";
    const start = pointFor(fromNode, from, truth ? "right" : "left");
    const end = pointFor(toNode, to, truth ? "left" : "right");
    const bend = truth ? 72 : -72;
    return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
  }

  const start = pointFor(fromNode, from, "bottom");
  const end = pointFor(toNode, to, "top");
  if (Math.abs(start.x - end.x) < 2) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  const middleY = start.y + (end.y - start.y) / 2;
  return `M ${start.x} ${start.y} C ${start.x} ${middleY}, ${end.x} ${middleY}, ${end.x} ${end.y}`;
}

function edgeLabel(edge, nodesById, layout) {
  const from = layout[edge.from];
  const to = layout[edge.to];
  if (!from || !to) return null;

  if (edge.type === "loop") {
    return {
      x: Math.min(VIEW_W - 105, Math.max(from.x, to.x) * 10 + 72),
      y: Math.max(24, to.y - 22),
      text: "LOOP BACK",
    };
  }

  if (edge.type === "true" || edge.type === "false") {
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);
    const start = pointFor(fromNode, from, edge.type === "true" ? "right" : "left");
    const end = pointFor(toNode, to, edge.type === "true" ? "left" : "right");
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 - 8,
      text: edge.type === "true" ? "TRUE" : "FALSE",
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
        <path d={d} fill="none" stroke="#FFE3A3" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
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
          <rect x={label.x - (label.text === "LOOP BACK" ? 43 : 25)} y={label.y - 13} width={label.text === "LOOP BACK" ? 86 : 50} height="22" rx="11" fill="#FFF9F0" stroke="#171717" strokeWidth="2" />
          <text x={label.x} y={label.y + 2} textAnchor="middle" className="fill-[#171717] font-mono text-[9px] font-bold">
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

  const fallbackNodes = [
    { id: "start", label: "START", type: "start" },
    { id: "exit", label: "EXIT", type: "exit" },
  ];
  const fallbackEdges = [{ id: "fallback", from: "start", to: "exit", type: "normal" }];

  const graphNodes = Array.isArray(nodes) && nodes.length ? nodes : fallbackNodes;
  const graphEdges = Array.isArray(edges) && edges.length ? edges : fallbackEdges;

  const nodesById = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);
  const layout = useMemo(() => makeLayout(graphNodes, graphEdges), [graphNodes, graphEdges]);
  const graphHeight = Math.max(620, TOP_Y + graphNodes.length * GAP_Y + 70);
  const activeEdgeId = typeof activeEdge === "string" ? activeEdge : activeEdge?.id;

  useEffect(() => {
    if (!activeNode || !scrollRef.current) return;

    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const element = container?.querySelector(`[data-flow-node="${CSS.escape(String(activeNode))}"]`);

      if (!container || !element) return;

      const nodeTop = element.offsetTop;
      const nodeBottom = nodeTop + element.offsetHeight;
      const visibleTop = container.scrollTop;
      const visibleBottom = visibleTop + container.clientHeight;

      // Keep the current viewport stable while the active node is already visible.
      if (nodeTop >= visibleTop + 18 && nodeBottom <= visibleBottom - 18) return;

      // When the active node leaves the viewport, bring it near the center.
      const targetTop = nodeTop - Math.max(0, (container.clientHeight - element.offsetHeight) / 2);
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);

      container.scrollTo({
        top: Math.min(maxScroll, Math.max(0, targetTop)),
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeNode, graphHeight]);

  return (
    <div
      ref={scrollRef}
      className="relative h-full w-full min-w-0 overflow-auto rounded-[18px] bg-[#FFF9F0]"
      style={{ minHeight: graphHeight }}
    >
      <div className="relative w-full" style={{ height: graphHeight, minWidth: 620 }}>
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VIEW_W} ${graphHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <marker id="cflow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
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
  );
}
