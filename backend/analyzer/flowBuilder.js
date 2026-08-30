// ============================================================
// C·FLOW FLOW BUILDER
// ============================================================

function buildFlow(program) {
  const statements = Array.isArray(program?.statements) ? program.statements : [];
  const nodes = [{ id: "start", label: "START", type: "start" }];
  const edges = [];

  const isControl = (s) => s && ["for", "while", "condition", "else_if", "else"].includes(s.type);

  const addEdge = (from, to, type = "normal", id = null) => {
    if (!from || !to) return;
    if (edges.some((e) => e.from === from && e.to === to && e.type === type)) return;
    edges.push({ id: id || `edge_${edges.length}`, from, to, type });
  };

  const makeNode = (s) => {
    if (s.type === "for") return { id: s.id, label: `for (${s.expression})`, type: "condition", line: s.line, controlType: "for" };
    if (s.type === "while") return { id: s.id, label: `while (${s.expression})`, type: "condition", line: s.line, controlType: "while" };
    if (s.type === "condition" || s.type === "else_if") return { id: s.id, label: `${s.expression || "condition"} ?`, type: "condition", line: s.line, controlType: s.type };
    if (s.type === "else") return { id: s.id, label: "ELSE", type: "condition", line: s.line, controlType: "else" };
    if (s.type === "output") return { id: s.id, label: "OUTPUT", type: "output", line: s.line };
    if (s.type === "declaration") return { id: s.id, label: s.value == null ? s.variable : `${s.variable} = ${s.value}`, type: "operation", line: s.line };
    return { id: s.id, label: String(s.code || "").replace(/;$/, ""), type: "operation", line: s.line };
  };

  statements.forEach((s) => nodes.push(makeNode(s)));

  if (!statements.length) {
    nodes.push({ id: "exit", label: "EXIT", type: "exit" });
    addEdge("start", "exit", "normal", "edge_start_exit");
    return { nodes, edges };
  }

  addEdge("start", statements[0].id, "normal", "edge_start");

  // Statements deeper than a control node's depth belong to that block.
  function bodyRange(index) {
    const control = statements[index];
    const next = statements[index + 1];
    if (!next) return null;

    if (next.depth <= control.depth) {
      // Conservative support for a single statement without braces.
      return { start: index + 1, end: index + 1 };
    }

    let end = index + 1;
    while (end + 1 < statements.length && statements[end + 1].depth > control.depth) end++;
    return { start: index + 1, end };
  }

  function nextAtOrAbove(index, depth) {
    for (let i = index + 1; i < statements.length; i++) {
      if (statements[i].depth <= depth) return i;
    }
    return -1;
  }

  // Ordinary edges stay inside the same block. Control nodes are handled below.
  for (let i = 0; i < statements.length - 1; i++) {
    const current = statements[i];
    const next = statements[i + 1];
    if (isControl(current) || current.type === "return") continue;
    if (current.depth === next.depth) {
      addEdge(current.id, next.id, "normal", `edge_${current.id}_next`);
    }
  }

  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];

    if (s.type === "for" || s.type === "while") {
      const range = bodyRange(i);
      if (!range) {
        const after = nextAtOrAbove(i, s.depth);
        addEdge(s.id, after >= 0 ? statements[after].id : "exit", "false", `edge_${s.id}_false`);
        continue;
      }

      const first = statements[range.start];
      const last = statements[range.end];
      const after = nextAtOrAbove(range.end, s.depth);
      const afterId = after >= 0 ? statements[after].id : "exit";

      addEdge(s.id, first.id, "true", `edge_${s.id}_true`);
      addEdge(last.id, s.id, "loop", `edge_${s.id}_loop`);
      addEdge(s.id, afterId, "false", `edge_${s.id}_false`);
      continue;
    }

    if (s.type === "condition" || s.type === "else_if") {
      const range = bodyRange(i);
      const bodyFirst = range ? statements[range.start] : statements[i + 1];
      const bodyLastIndex = range ? range.end : i + 1;
      const bodyLast = statements[bodyLastIndex];
      if (bodyFirst) addEdge(s.id, bodyFirst.id, "true", `edge_${s.id}_true`);

      const afterBody = nextAtOrAbove(bodyLastIndex, s.depth);
      const maybeElse = afterBody >= 0 && statements[afterBody].type === "else" ? afterBody : -1;

      if (maybeElse >= 0) {
        const e = statements[maybeElse];
        addEdge(s.id, e.id, "false", `edge_${s.id}_false`);
        const er = bodyRange(maybeElse);
        if (er) {
          const ef = statements[er.start];
          const el = statements[er.end];
          const join = nextAtOrAbove(er.end, s.depth);
          const joinId = join >= 0 ? statements[join].id : "exit";
          addEdge(e.id, ef.id, "normal", `edge_${e.id}_body`);
          addEdge(el.id, joinId, "normal", `edge_${el.id}_join`);
          if (bodyLast && !isControl(bodyLast)) addEdge(bodyLast.id, joinId, "normal", `edge_${bodyLast.id}_join`);
        }
      } else {
        const joinId = afterBody >= 0 ? statements[afterBody].id : "exit";
        addEdge(s.id, joinId, "false", `edge_${s.id}_false`);
        if (bodyLast && !isControl(bodyLast)) addEdge(bodyLast.id, joinId, "normal", `edge_${bodyLast.id}_join`);
      }
    }
  }

  nodes.push({ id: "exit", label: "EXIT", type: "exit" });
  statements.forEach((s, i) => {
    if (s.type === "return") addEdge(s.id, "exit", "normal", `edge_${s.id}_exit`);
  });

  const last = statements[statements.length - 1];
  if (last && last.type !== "for" && last.type !== "while" && last.type !== "return") {
    addEdge(last.id, "exit", "normal", "edge_exit");
  }

  return { nodes, edges };
}

module.exports = buildFlow;
