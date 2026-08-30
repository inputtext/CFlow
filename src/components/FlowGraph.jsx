import { useMemo } from "react";

const NODE_W = 240;
const NODE_H = 78;
const CONDITION_H = 92;
const START_H = 64;
const GAP_Y = 118;
const CENTER_X = 500;
const LANE_GAP = 270;

function typeOf(node) {
  if (!node) return "operation";
  if (node.type === "condition") return "condition";
  if (node.type === "start") return "start";
  if (node.type === "exit") return "exit";
  return "operation";
}

function labelOf(node) {
  return String(node?.label ?? node?.code ?? node?.id ?? "");
}

function wrapLabel(label, max = 25) {
  const words = String(label).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function NodeBox({ node, pos, active, conditionResult }) {
  const type = typeOf(node);
  const label = labelOf(node);
  const lines = wrapLabel(label, type === "condition" ? 27 : 30);
  const height = type === "condition" ? CONDITION_H : type === "start" || type === "exit" ? START_H : NODE_H;
  const bg = type === "condition" ? "#FFE3A3" : type === "exit" ? "#FFD6E7" : type === "start" ? "#FFF9F0" : "#FFFFFF";
  const rounded = type === "start" || type === "exit";

  return (
    <div
      data-flow-node={node.id}
      className={`absolute z-10 flex items-center justify-center border-2 border-[#171717] px-5 text-center font-mono font-bold transition-all duration-300 ${active ? "scale-[1.035] shadow-[6px_6px_0_#171717]" : "shadow-[4px_4px_0_#171717]"} ${rounded ? "rounded-[32px]" : ""}`}
      style={{
        width: `${NODE_W}px`,
        height: `${height}px`,
        left: `${pos.x - NODE_W / 2}px`,
        top: `${pos.y}px`,
        background: bg,
      }}
    >
      <div>
        {lines.map((line, index) => (
          <div key={index} className="leading-tight">
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

function nodeHeight(node) {
  const type = typeOf(node);
  if (type === "condition") return CONDITION_H;
  if (type === "start" || type === "exit") return START_H;
  return NODE_H;
}

function edgeFor(edges, from, type) {
  return edges.find((edge) => edge.from === from && (!type || edge.type === type));
}

function makeLayout(nodes, edges) {
  const ordered = [...nodes];
  const index = new Map(ordered.map((node, i) => [node.id, i]));
  const lane = new Map(ordered.map((node) => [node.id, 0]));

  // Indent loop bodies so the loop-back wire has a real visual route.
  for (const control of ordered) {
    if (typeOf(control) !== "condition" || !["for", "while"].includes(control.controlType)) continue;
    const trueEdge = edgeFor(edges, control.id, "true");
    const loopEdge = edges.find((edge) => edge.to === control.id && edge.type === "loop");
    if (!trueEdge || !loopEdge) continue;
    const start = index.get(trueEdge.to);
    const end = index.get(loopEdge.from);
    const controlLane = lane.get(control.id) || 0;
    if (start == null || end == null) continue;
    for (let i = start; i <= end; i++) {
      const id = ordered[i].id;
      lane.set(id, Math.max(lane.get(id) || 0, controlLane + 1));
    }
  }

  // Give IF true branches a smaller right-hand offset and ELSE a left offset.
  for (const control of ordered) {
    if (typeOf(control) !== "condition" || ["for", "while"].includes(control.controlType)) continue;
    const t = edgeFor(edges, control.id, "true");
    const f = edgeFor(edges, control.id, "false");
    if (t) lane.set(t.to, Math.max(lane.get(t.to) || 0, 1));
    if (f) lane.set(f.to, Math.min(lane.get(f.to) || 0, -1));
  }

  const layout = {};
  ordered.forEach((node, i) => {
    const rawLane = lane.get(node.id) || 0;
    const x = Math.max(155, Math.min(845, CENTER_X + rawLane * LANE_GAP));
    layout[node.id] = { x, y: 30 + i * GAP_Y };
  });

  return layout;
}

function pathFor(edge, layout) {
  const a = layout[edge.from];
  const b = layout[edge.to];
  if (!a || !b) return null;

  const aH = nodeHeight({ type: edge.from === "start" ? "start" : undefined });
  const fromNode = { type: undefined };
  const startY = a.y + NODE_H;
  const endY = b.y;
  const sameLane = Math.abs(a.x - b.x) < 5;

  if (edge.type === "loop") {
    const right = Math.min(955, Math.max(a.x, b.x) + 155);
    const top = Math.max(20, b.y + 25);
    return `M ${a.x + NODE_W / 2 - 8} ${a.y + NODE_H / 2} C ${right} ${a.y + NODE_H / 2}, ${right} ${top}, ${b.x + NODE_W / 2 - 8} ${top}`;
  }

  if (edge.type === "true") {
    const sx = a.x + NODE_W / 2;
    const sy = a.y + nodeHeight({ type: "condition" }) / 2;
    const ex = b.x - NODE_W / 2;
    const ey = b.y + nodeHeight({ type: "operation" }) / 2;
    return `M ${sx} ${sy} C ${sx + 90} ${sy}, ${ex - 90} ${ey}, ${ex} ${ey}`;
  }

  if (edge.type === "false") {
    const sx = a.x - NODE_W / 2;
    const sy = a.y + nodeHeight({ type: "condition" }) / 2;
    const ex = b.x + NODE_W / 2;
    const ey = b.y + nodeHeight({ type: "operation" }) / 2;
    return `M ${sx} ${sy} C ${sx - 90} ${sy}, ${ex + 90} ${ey}, ${ex} ${ey}`;
  }

  if (sameLane) return `M ${a.x} ${a.y + nodeHeight({ type: "operation" })} L ${b.x} ${endY}`;

  return `M ${a.x} ${a.y + nodeHeight({ type: "operation" }) / 2} C ${a.x} ${a.y + 70}, ${b.x} ${b.y - 35}, ${b.x} ${b.y}`;
}

function FlowEdge({ edge, layout, active }) {
  const d = pathFor(edge, layout);
  if (!d) return null;
  const loop = edge.type === "loop";
  return (
    <g>
      <path d={d} fill="none" stroke="#171717" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#cflow-arrow)" opacity={active ? 1 : 0.78} />
      {active && (
        <path d={d} fill="none" stroke="#FFE3A3" strokeWidth="8" strokeDasharray="12 18" strokeLinecap="round" markerEnd="url(#cflow-arrow)" className="animate-[flowTravel_0.8s_linear_infinite]" />
      )}
      {edge.type === "true" && <text x="0" y="0" className="fill-[#171717] font-mono text-[11px] font-bold">TRUE</text>}
      {edge.type === "false" && <text x="0" y="0" className="fill-[#171717] font-mono text-[11px] font-bold">FALSE</text>}
    </g>
  );
}

export default function FlowGraph({ nodes = null, edges = null, activeNode = null, activeEdge = null, conditionResult = null }) {
  const fallbackNodes = [
    { id: "start", label: "START", type: "start" },
    { id: "exit", label: "EXIT", type: "exit" },
  ];
  const fallbackEdges = [{ id: "fallback", from: "start", to: "exit", type: "normal" }];

  const graphNodes = Array.isArray(nodes) && nodes.length ? nodes : fallbackNodes;
  const graphEdges = Array.isArray(edges) && edges.length ? edges : fallbackEdges;
  const layout = useMemo(() => makeLayout(graphNodes, graphEdges), [graphNodes, graphEdges]);
  const graphHeight = Math.max(620, graphNodes.length * GAP_Y + 90);

  return (
    <div className="relative h-full w-full min-w-0 overflow-visible" style={{ minHeight: `${graphHeight}px` }}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 1000 ${graphHeight}`} preserveAspectRatio="none">
        <defs>
          <marker id="cflow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#171717" />
          </marker>
        </defs>
        {graphEdges.map((edge) => (
          <FlowEdge key={edge.id || `${edge.from}-${edge.to}-${edge.type}`} edge={edge} layout={layout} active={edge.id === activeEdge} />
        ))}
      </svg>

      {graphNodes.map((node) => (
        <NodeBox key={node.id} node={node} pos={layout[node.id]} active={node.id === activeNode} conditionResult={conditionResult} />
      ))}
    </div>
  );
}
