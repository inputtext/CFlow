import { useEffect, useMemo, useRef, useState } from "react";

const NODE_W = 220;
const NODE_H = 72;
const CONDITION_H = 88;
const TERMINAL_H = 62;
// Keep the large canvas for complex DSA graphs, but make the default
// arrangement compact enough to read as one connected flow.
const GAP_Y = 116;
const TOP_Y = 34;
const VIEW_W = 1400;
const CENTER_X = 50;
const LEFT_X = 30;
const RIGHT_X = 70;
const LOOP_OUTER_X = 1370;
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
  const type = typeOf(node);
  return type === "condition" ? CONDITION_H : type === "start" || type === "exit" ? TERMINAL_H : NODE_H;
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
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function outgoing(edges, id, type) {
  return edges.find((edge) => edge.from === id && (!type || edge.type === type));
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
  const yes = reachableFrom(yesId, edges);
  const no = reachableFrom(noId, edges);
  for (const edge of edges) {
    if (yes.has(edge.from) && no.has(edge.from)) return edge.from;
    if (yes.has(edge.to) && no.has(edge.to)) return edge.to;
  }
  for (const id of yes) if (no.has(id)) return id;
  return null;
}

function makeRanks(nodes, edges) {
  const rank = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]));
  const start = nodes.find((node) => typeOf(node) === "start") ?? nodes[0];
  if (start) rank.set(start.id, 0);
  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const edge of edges) {
      if (edge.type === "loop") continue;
      const from = rank.get(edge.from);
      if (!Number.isFinite(from)) continue;
      const next = from + 1;
      if (next < (rank.get(edge.to) ?? Infinity)) {
        rank.set(edge.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  nodes.forEach((node, index) => {
    if (!Number.isFinite(rank.get(node.id))) rank.set(node.id, index);
  });
  return rank;
}

function makeLayout(nodes, edges) {
  const ranks = makeRanks(nodes, edges);
  const lane = new Map(nodes.map((node) => [node.id, 0]));

  for (const condition of nodes) {
    if (typeOf(condition) !== "condition" || LOOP_TYPES.has(condition.controlType)) continue;
    const yes = outgoing(edges, condition.id, "true");
    const no = outgoing(edges, condition.id, "false");
    if (!yes || !no) continue;
    const merge = findMergeNode(edges, yes.to, no.to);
    const yesReach = reachableFrom(yes.to, edges);
    const noReach = reachableFrom(no.to, edges);
    for (const node of nodes) {
      if (node.id === condition.id || node.id === merge) continue;
      const inYes = yesReach.has(node.id);
      const inNo = noReach.has(node.id);
      if (inYes && !inNo) lane.set(node.id, 1);
      if (inNo && !inYes) lane.set(node.id, -1);
    }
  }

  const groups = new Map();
  for (const node of nodes) {
    const r = ranks.get(node.id) ?? 0;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(node);
  }

  const layout = {};
  for (const [rank, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const assign = (items, positions) => {
      items.forEach((node, index) => {
        const x = positions[Math.min(index, positions.length - 1)];
        layout[node.id] = {
          x,
          y: TOP_Y + rank * GAP_Y + (index >= positions.length ? (index - positions.length + 1) * 76 : 0),
        };
      });
    };

    if (group.length <= 3) {
      if (group.length === 1) assign(group, [CENTER_X]);
      else if (group.length === 2) {
        const ordered = [...group].sort((a, b) => (lane.get(a.id) ?? 0) - (lane.get(b.id) ?? 0));
        assign(ordered, [LEFT_X, RIGHT_X]);
      } else {
        const ordered = [...group].sort((a, b) => (lane.get(a.id) ?? 0) - (lane.get(b.id) ?? 0));
        assign(ordered, [18, CENTER_X, 82]);
      }
    } else {
      const ordered = [...group].sort((a, b) => (lane.get(a.id) ?? 0) - (lane.get(b.id) ?? 0));
      assign(ordered, [14, 32, 50, 68, 86]);
    }
  }
  return layout;
}

function pointFor(node, position, side) {
  const h = nodeHeight(node);
  const x = (position.x / 100) * VIEW_W;
  const half = NODE_W / 2;
  if (side === "top") return { x, y: position.y };
  if (side === "bottom") return { x, y: position.y + h };
  if (side === "left") return { x: x - half, y: position.y + h / 2 };
  return { x: x + half, y: position.y + h / 2 };
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
    const outer = Math.max(LOOP_OUTER_X, start.x + 110);
    return `M ${start.x} ${start.y} C ${outer} ${start.y}, ${outer} ${end.y}, ${end.x} ${end.y}`;
  }

  const below = to.y > from.y;
  if (!below) {
    const start = pointFor(fromNode, from, "right");
    const end = pointFor(toNode, to, "right");
    const outer = Math.max(start.x, end.x) + 90;
    return `M ${start.x} ${start.y} C ${outer} ${start.y}, ${outer} ${end.y}, ${end.x} ${end.y}`;
  }

  const start = pointFor(fromNode, from, "bottom");
  const end = pointFor(toNode, to, "top");
  if (Math.abs(start.x - end.x) < 3) return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  const mid = start.y + Math.max(32, (end.y - start.y) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x} ${mid}, ${end.x} ${mid}, ${end.x} ${end.y}`;
}

function edgeLabel(edge, nodesById, layout) {
  const from = layout[edge.from];
  const to = layout[edge.to];
  if (!from || !to) return null;
  if (edge.type === "loop") return { x: VIEW_W - 105, y: Math.max(25, Math.min(from.y, to.y) + 22), text: "LOOP BACK", width: 94 };
  if (edge.type !== "true" && edge.type !== "false") return null;
  const node = nodesById.get(edge.from);
  const start = pointFor(node, from, "bottom");
  const end = pointFor(nodesById.get(edge.to), to, "top");
  const mid = start.y + Math.max(30, (end.y - start.y) * 0.42);
  const truth = edge.type === "true";
  return { x: truth ? start.x + 55 : start.x - 55, y: mid, text: truth ? "TRUE" : "FALSE", width: 56 };
}

function FlowEdge({ edge, nodesById, layout, active }) {
  const d = pathFor(edge, nodesById, layout);
  if (!d) return null;
  const label = edgeLabel(edge, nodesById, layout);
  return (
    <g>
      {active && <path d={d} fill="none" stroke="#FFE3A3" strokeWidth="10" strokeLinecap="round" />}
      <path d={d} fill="none" stroke="#171717" strokeWidth={active ? 4 : 3} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#cflow-arrow)" />
      {label && (
        <g>
          <rect x={label.x - label.width / 2} y={label.y - 13} width={label.width} height="24" rx="12" fill="#FFF9F0" stroke="#171717" strokeWidth="2" />
          <text x={label.x} y={label.y + 3} textAnchor="middle" className="fill-[#171717] font-mono text-[9px] font-bold">{label.text}</text>
        </g>
      )}
    </g>
  );
}

function NodeBox({ node, position, active, conditionResult, onPointerDown, dragging }) {
  const type = typeOf(node);
  const lines = wrapLabel(labelOf(node), type === "condition" ? 23 : 27);
  const background = type === "condition" ? "#FFE3A3" : type === "exit" ? "#FFD6E7" : type === "start" ? "#FFF9F0" : type === "output" ? "#DDF4EA" : "#FFFFFF";
  return (
    <div
      data-flow-node={node.id}
      onPointerDown={(event) => onPointerDown(event, node.id)}
      className={`cflow-flow-node cflow-flow-node--${type} absolute z-10 flex select-none touch-none items-center justify-center border-2 border-[#171717] px-4 text-center font-mono font-bold transition-[box-shadow,transform] duration-300 ease-out ${dragging ? "cursor-grabbing shadow-[8px_8px_0_#171717]" : "cursor-grab shadow-[4px_4px_0_#171717] hover:-translate-y-1 hover:shadow-[6px_6px_0_#171717]"} ${type === "start" || type === "exit" ? "rounded-[32px]" : "rounded-[16px]"}`}
      style={{ width: NODE_W, height: nodeHeight(node), left: `${position.x}%`, top: position.y, transform: active && !dragging ? "translateX(-50%) scale(1.025)" : "translateX(-50%)", background }}
      title="Drag to reposition"
    >
      <div className="max-w-full">
        {lines.map((line, index) => <div key={`${node.id}-${index}`} className="leading-tight">{line}</div>)}
        {type === "condition" && active && <div className="mt-2 text-[10px] uppercase tracking-[0.16em]">{conditionResult === true ? "✓ TRUE" : conditionResult === false ? "× FALSE" : "EVALUATING"}</div>}
      </div>
    </div>
  );
}

export default function FlowGraph({ nodes = null, edges = null, activeNode = null, activeEdge = null, conditionResult = null }) {
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [manualPositions, setManualPositions] = useState({});
  const [isMaximized, setIsMaximized] = useState(false);

  const fallbackNodes = [{ id: "start", label: "START", type: "start" }, { id: "exit", label: "EXIT", type: "exit" }];
  const fallbackEdges = [{ id: "fallback", from: "start", to: "exit", type: "normal" }];
  const graphNodes = Array.isArray(nodes) && nodes.length ? nodes : fallbackNodes;
  const graphEdges = Array.isArray(edges) && edges.length ? edges : fallbackEdges;
  const nodesById = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);
  const autoLayout = useMemo(() => makeLayout(graphNodes, graphEdges), [graphNodes, graphEdges]);
  const layout = useMemo(() => Object.fromEntries(graphNodes.map((node) => [node.id, manualPositions[node.id] ?? autoLayout[node.id]])), [graphNodes, autoLayout, manualPositions]);
  const maxY = graphNodes.reduce((max, node) => Math.max(max, (layout[node.id]?.y ?? TOP_Y) + nodeHeight(node)), TOP_Y);
  const graphHeight = Math.max(620, maxY + 120);
  const activeEdgeId = typeof activeEdge === "string" ? activeEdge : activeEdge?.id;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      container.scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
    });

    return () => cancelAnimationFrame(frame);
  }, [graphNodes.length, graphHeight, isMaximized]);

  useEffect(() => {
    if (!isMaximized) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") setIsMaximized(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMaximized]);

  useEffect(() => {
    if (!activeNode || !scrollRef.current) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const element = container?.querySelector(`[data-flow-node="${activeNode}"]`);
      if (!container || !element) return;
      const top = element.offsetTop;
      const bottom = top + element.offsetHeight;
      if (top >= container.scrollTop + 24 && bottom <= container.scrollTop + container.clientHeight - 24) return;
      const target = top - Math.max(0, (container.clientHeight - element.offsetHeight) / 2);
      container.scrollTo({ top: Math.min(container.scrollHeight - container.clientHeight, Math.max(0, target)), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeNode, graphHeight, isMaximized]);

  const resetLayout = () => setManualPositions({});

  const handlePointerDown = (event, id) => {
    if (event.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / VIEW_W || zoom;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const pos = layout[id] ?? autoLayout[id] ?? { x: 50, y: 34 };
    dragRef.current = { id, dx: x - (pos.x / 100) * VIEW_W, dy: y - pos.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const move = (event) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / VIEW_W || zoom;
      const x = (event.clientX - rect.left) / scale - drag.dx;
      const y = (event.clientY - rect.top) / scale - drag.dy;
      const clampedX = Math.max(8, Math.min(92, (x / VIEW_W) * 100));
      const clampedY = Math.max(8, y);
      setManualPositions((current) => ({ ...current, [drag.id]: { x: clampedX, y: clampedY } }));
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [zoom]);

  return (
    <div className={`cflow-flow-shell relative h-full w-full min-w-0 transition-[opacity,transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isMaximized ? "fixed inset-3 z-[100] rounded-[18px] border-2 border-[#171717] bg-[#FFF9F0] p-2 shadow-[12px_12px_0_#171717]" : ""}`}>
      <div className="pointer-events-auto absolute right-2 top-2 z-30 flex items-center gap-0.5 rounded-[9px] border-2 border-[#171717] bg-[#FFF9F0] p-0.5 shadow-[2px_2px_0_#171717]" aria-label="Flowchart controls">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((v) => Math.max(0.5, Number((v - 0.1).toFixed(1))))} className="h-6 w-6 rounded-[5px] font-mono text-xs font-bold transition-transform duration-200 hover:-translate-y-0.5">−</button>
        <span className="min-w-[38px] text-center font-mono text-[10px] font-bold">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((v) => Math.min(1.2, Number((v + 0.1).toFixed(1))))} className="h-6 w-6 rounded-[5px] font-mono text-xs font-bold transition-transform duration-200 hover:-translate-y-0.5">+</button>
        <button type="button" onClick={resetLayout} className="ml-0.5 h-6 rounded-[5px] border border-[#171717] px-1.5 font-mono text-[8px] font-bold uppercase tracking-wider transition-transform duration-200 hover:-translate-y-0.5">RESET</button>
        <button type="button" aria-label={isMaximized ? "Minimize flowchart" : "Maximize flowchart"} onClick={() => setIsMaximized((value) => !value)} className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#171717] font-mono text-xs font-bold transition-transform duration-200 hover:-translate-y-0.5" title={isMaximized ? "Minimize" : "Maximize"}>
          {isMaximized ? "↙" : "↗"}
        </button>
      </div>

      <div ref={scrollRef} className="h-full w-full overflow-auto rounded-[18px]">
        <div className="relative mx-auto" style={{ width: `${VIEW_W}px`, height: `${graphHeight * zoom}px` }}>
          <div ref={canvasRef} className="relative origin-top" style={{ width: `${VIEW_W}px`, height: `${graphHeight}px`, transform: `scale(${zoom})` }}>
            <svg className="pointer-events-none absolute inset-0 z-0" width={VIEW_W} height={graphHeight} viewBox={`0 0 ${VIEW_W} ${graphHeight}`} aria-hidden="true">
              <defs>
                <marker id="cflow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="#171717" /></marker>
              </defs>
              {graphEdges.map((edge) => <FlowEdge key={edge.id ?? `${edge.from}-${edge.to}-${edge.type}`} edge={edge} nodesById={nodesById} layout={layout} active={edge.id === activeEdgeId} />)}
            </svg>
            {graphNodes.map((node) => <NodeBox key={node.id} node={node} position={layout[node.id]} active={node.id === activeNode} conditionResult={conditionResult} dragging={dragRef.current?.id === node.id} onPointerDown={handlePointerDown} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
