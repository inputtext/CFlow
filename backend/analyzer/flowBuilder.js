// ============================================================
// C·FLOW FLOW BUILDER
// ============================================================
//
// Builds a structural control-flow graph from parser statements.
// Branches explicitly merge after the complete IF/ELSE block. When a
// branch or nested loop reaches the end of an enclosing loop body, the
// continuation returns to the enclosing loop condition instead of EXIT.
// ============================================================

function buildFlow(program) {
  const statements = Array.isArray(program?.statements) ? program.statements : [];
  const nodes = [{ id: "start", label: "START", type: "start" }];
  const edges = [];

  const controlTypes = new Set(["for", "while", "condition", "else_if", "else"]);
  const loopTypes = new Set(["for", "while"]);
  const isControl = (s) => Boolean(s && controlTypes.has(s.type));

  const addEdge = (from, to, type = "normal", id = null) => {
    if (!from || !to || (from === to && type !== "loop")) return;
    if (edges.some((e) => e.from === from && e.to === to && e.type === type)) return;
    edges.push({ id: id || `edge_${edges.length}`, from, to, type });
  };

  const makeNode = (s) => {
    if (s.type === "for") return { id: s.id, label: `for (${s.expression})`, type: "condition", controlType: "for", line: s.line };
    if (s.type === "while") return { id: s.id, label: `while (${s.expression})`, type: "condition", controlType: "while", line: s.line };
    if (s.type === "condition" || s.type === "else_if") return { id: s.id, label: `${s.expression || "condition"} ?`, type: "condition", controlType: s.type, line: s.line };
    if (s.type === "else") return { id: s.id, label: "ELSE", type: "condition", controlType: "else", line: s.line };
    if (s.type === "output") return { id: s.id, label: "OUTPUT", type: "output", line: s.line };
    if (s.type === "return") return { id: s.id, label: "RETURN", type: "operation", line: s.line };
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

  const bodyRange = (index) => {
    const control = statements[index];
    const first = statements[index + 1];
    if (!first || first.depth <= control.depth) return null;
    let end = index + 1;
    while (end + 1 < statements.length && statements[end + 1].depth > control.depth) end += 1;
    return { start: index + 1, end };
  };

  const nextAtOrAbove = (index, depth) => {
    for (let i = index + 1; i < statements.length; i += 1) {
      if (statements[i].depth <= depth) return i;
    }
    return -1;
  };

  const directParentControl = (index, depth) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      const candidate = statements[i];
      if (!isControl(candidate) || candidate.depth >= depth) continue;
      const range = bodyRange(i);
      if (range && index >= range.start && index <= range.end) return i;
    }
    return -1;
  };

  const directElse = (conditionIndex) => {
    const condition = statements[conditionIndex];
    const range = bodyRange(conditionIndex);
    if (!range) return -1;

    const candidateIndex = range.end + 1;
    if (
      candidateIndex < statements.length &&
      statements[candidateIndex].type === "else" &&
      statements[candidateIndex].depth === condition.depth
    ) {
      return candidateIndex;
    }
    return -1;
  };

  const branchContinuation = (conditionIndex, branchEndIndex, elseIndex = -1) => {
    const condition = statements[conditionIndex];
    let endIndex = branchEndIndex;

    if (elseIndex >= 0) {
      const elseRange = bodyRange(elseIndex);
      endIndex = elseRange ? elseRange.end : elseIndex;
    }

    const next = nextAtOrAbove(endIndex, condition.depth);
    const parent = directParentControl(conditionIndex, condition.depth);

    if (parent >= 0) {
      const parentStatement = statements[parent];
      if (next < 0 || statements[next].depth <= parentStatement.depth) {
        if (loopTypes.has(parentStatement.type)) return parentStatement.id;
      }
    }

    if (next >= 0) return statements[next].id;
    if (parent >= 0 && loopTypes.has(statements[parent].type)) return statements[parent].id;
    return "exit";
  };

  // Ordinary sequential edges only connect true lexical siblings. Control
  // nodes are wired explicitly so there is no accidental branch fall-through.
  for (let i = 0; i < statements.length - 1; i += 1) {
    const current = statements[i];
    const next = statements[i + 1];
    if (current.type === "return" || isControl(current)) continue;
    if (current.depth === next.depth) {
      addEdge(current.id, next.id, "normal", `edge_${current.id}_next`);
    }
  }

  for (let i = 0; i < statements.length; i += 1) {
    const s = statements[i];

    // --------------------------------------------------------
    // FOR / WHILE
    // --------------------------------------------------------
    if (loopTypes.has(s.type)) {
      const range = bodyRange(i);
      const after = range ? nextAtOrAbove(range.end, s.depth) : nextAtOrAbove(i, s.depth);

      const parent = directParentControl(i, s.depth);
      const afterId = after >= 0
        ? statements[after].id
        : (parent >= 0 && loopTypes.has(statements[parent].type)
            ? statements[parent].id
            : "exit");

      if (!range) {
        addEdge(s.id, afterId, "false", `edge_${s.id}_false`);
        continue;
      }

      const first = statements[range.start];
      const last = statements[range.end];
      addEdge(s.id, first.id, "true", `edge_${s.id}_true`);
      addEdge(last.id, s.id, "loop", `edge_${last.id}_loop`);
      addEdge(s.id, afterId, "false", `edge_${s.id}_false`);
      continue;
    }

    // --------------------------------------------------------
    // IF / ELSE IF
    // --------------------------------------------------------
    if (s.type === "condition" || s.type === "else_if") {
      const range = bodyRange(i);

      if (!range) {
        const continuation = branchContinuation(i, i);
        addEdge(s.id, continuation, "true", `edge_${s.id}_true`);
        addEdge(s.id, continuation, "false", `edge_${s.id}_false`);
        continue;
      }

      const bodyFirst = statements[range.start];
      const bodyLast = statements[range.end];
      const elseIndex = directElse(i);

      addEdge(s.id, bodyFirst.id, "true", `edge_${s.id}_true`);

      if (elseIndex >= 0) {
        const elseNode = statements[elseIndex];
        const elseRange = bodyRange(elseIndex);
        addEdge(s.id, elseNode.id, "false", `edge_${s.id}_false`);

        if (elseRange) {
          const elseFirst = statements[elseRange.start];
          const elseLast = statements[elseRange.end];
          const continuation = branchContinuation(i, range.end, elseIndex);

          addEdge(bodyLast.id, continuation, "normal", `edge_${bodyLast.id}_join`);
          addEdge(elseNode.id, elseFirst.id, "normal", `edge_${elseNode.id}_body`);
          addEdge(elseLast.id, continuation, "normal", `edge_${elseLast.id}_join`);
        } else {
          const continuation = branchContinuation(i, range.end, elseIndex);
          addEdge(bodyLast.id, continuation, "normal", `edge_${bodyLast.id}_join`);
          addEdge(elseNode.id, continuation, "normal", `edge_${elseNode.id}_join`);
        }
      } else {
        const continuation = branchContinuation(i, range.end);
        addEdge(s.id, continuation, "false", `edge_${s.id}_false`);
        addEdge(bodyLast.id, continuation, "normal", `edge_${bodyLast.id}_join`);
      }
    }
  }

  nodes.push({ id: "exit", label: "EXIT", type: "exit" });

  statements.forEach((s) => {
    if (s.type === "return") {
      addEdge(s.id, "exit", "normal", `edge_${s.id}_exit`);
    }
  });

  const last = statements[statements.length - 1];
  // Do not add a lexical EXIT edge when the final statement already has a
  // loop back-edge. The executor intentionally prefers the first normal edge;
  // adding EXIT here would terminate a loop after its first iteration.
  if (
    last &&
    last.type !== "return" &&
    !loopTypes.has(last.type) &&
    !edges.some((edge) => edge.from === last.id && edge.type === "loop")
  ) {
    addEdge(last.id, "exit", "normal", "edge_exit");
  }

  return { nodes, edges };
}

module.exports = buildFlow;
