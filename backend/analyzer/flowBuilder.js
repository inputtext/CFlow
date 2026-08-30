// ============================================================
// C·FLOW FLOW BUILDER
// ============================================================

function buildFlow(program) {
  const statements = Array.isArray(program?.statements)
    ? program.statements
    : [];

  const nodes = [
    { id: "start", label: "START", type: "start" },
  ];
  const edges = [];

  const controlTypes = new Set([
    "for",
    "while",
    "condition",
    "else_if",
    "else",
  ]);

  const isControl = (s) =>
    Boolean(s && controlTypes.has(s.type));

  const addEdge = (
    from,
    to,
    type = "normal",
    id = null
  ) => {
    if (!from || !to || from === to && type !== "loop") return;

    if (
      edges.some(
        (e) =>
          e.from === from &&
          e.to === to &&
          e.type === type
      )
    ) {
      return;
    }

    edges.push({
      id: id || `edge_${edges.length}`,
      from,
      to,
      type,
    });
  };

  const makeNode = (s) => {
    if (s.type === "for") {
      return {
        id: s.id,
        label: `for (${s.expression})`,
        type: "condition",
        controlType: "for",
        line: s.line,
      };
    }

    if (s.type === "while") {
      return {
        id: s.id,
        label: `while (${s.expression})`,
        type: "condition",
        controlType: "while",
        line: s.line,
      };
    }

    if (
      s.type === "condition" ||
      s.type === "else_if"
    ) {
      return {
        id: s.id,
        label: `${s.expression || "condition"} ?`,
        type: "condition",
        controlType: s.type,
        line: s.line,
      };
    }

    if (s.type === "else") {
      return {
        id: s.id,
        label: "ELSE",
        type: "condition",
        controlType: "else",
        line: s.line,
      };
    }

    if (s.type === "output") {
      return {
        id: s.id,
        label: "OUTPUT",
        type: "output",
        line: s.line,
      };
    }

    if (s.type === "return") {
      return {
        id: s.id,
        label: "RETURN",
        type: "operation",
        line: s.line,
      };
    }

    if (s.type === "declaration") {
      return {
        id: s.id,
        label:
          s.value == null
            ? s.variable
            : `${s.variable} = ${s.value}`,
        type: "operation",
        line: s.line,
      };
    }

    return {
      id: s.id,
      label: String(s.code || "").replace(/;$/, ""),
      type: "operation",
      line: s.line,
    };
  };

  statements.forEach((s) =>
    nodes.push(makeNode(s))
  );

  if (!statements.length) {
    nodes.push({
      id: "exit",
      label: "EXIT",
      type: "exit",
    });

    addEdge(
      "start",
      "exit",
      "normal",
      "edge_start_exit"
    );

    return { nodes, edges };
  }

  addEdge(
    "start",
    statements[0].id,
    "normal",
    "edge_start"
  );

  // Find the complete direct body of a control statement.
  // The parser supplies lexical brace depth.
  const bodyRange = (index) => {
    const control = statements[index];
    const first = statements[index + 1];

    if (!first) return null;

    // Braced body.
    if (first.depth > control.depth) {
      let end = index + 1;

      while (
        end + 1 < statements.length &&
        statements[end + 1].depth > control.depth
      ) {
        end++;
      }

      return {
        start: index + 1,
        end,
      };
    }

    // Single statement body without braces.
    return {
      start: index + 1,
      end: index + 1,
    };
  };

  const nextAtOrAbove = (index, depth) => {
    for (
      let i = index + 1;
      i < statements.length;
      i++
    ) {
      if (statements[i].depth <= depth) {
        return i;
      }
    }

    return -1;
  };

  // ----------------------------------------------------------
  // NORMAL SEQUENTIAL EDGES
  // ----------------------------------------------------------
  for (
    let i = 0;
    i < statements.length - 1;
    i++
  ) {
    const current = statements[i];
    const next = statements[i + 1];

    if (current.type === "return") continue;
    if (isControl(current)) continue;

    // Same lexical block = ordinary execution.
    if (current.depth === next.depth) {
      addEdge(
        current.id,
        next.id,
        "normal",
        `edge_${current.id}_next`
      );
    }
  }

  // ----------------------------------------------------------
  // CONTROL FLOW
  // ----------------------------------------------------------
  for (
    let i = 0;
    i < statements.length;
    i++
  ) {
    const s = statements[i];

    // ========================================================
    // FOR / WHILE
    // ========================================================
    if (
      s.type === "for" ||
      s.type === "while"
    ) {
      const range = bodyRange(i);

      if (!range) {
        const after = nextAtOrAbove(i, s.depth);
        addEdge(
          s.id,
          after >= 0
            ? statements[after].id
            : "exit",
          "false",
          `edge_${s.id}_false`
        );
        continue;
      }

      const first = statements[range.start];
      const last = statements[range.end];
      const after = nextAtOrAbove(
        range.end,
        s.depth
      );

      addEdge(
        s.id,
        first.id,
        "true",
        `edge_${s.id}_true`
      );

      // Last statement in the loop returns to the condition.
      addEdge(
        last.id,
        s.id,
        "loop",
        `edge_${last.id}_loop`
      );

      addEdge(
        s.id,
        after >= 0
          ? statements[after].id
          : "exit",
        "false",
        `edge_${s.id}_false`
      );

      continue;
    }

    // ========================================================
    // IF / ELSE IF
    // ========================================================
    if (
      s.type === "condition" ||
      s.type === "else_if"
    ) {
      const range = bodyRange(i);

      if (!range) continue;

      const bodyFirst = statements[range.start];
      const bodyLast = statements[range.end];
      const afterBody = nextAtOrAbove(
        range.end,
        s.depth
      );

      addEdge(
        s.id,
        bodyFirst.id,
        "true",
        `edge_${s.id}_true`
      );

      const nextStatement =
        afterBody >= 0
          ? statements[afterBody]
          : null;

      // An ELSE belonging to this IF.
      if (
        nextStatement &&
        nextStatement.type === "else" &&
        nextStatement.depth === s.depth
      ) {
        const elseIndex = afterBody;
        const elseRange = bodyRange(elseIndex);
        const elseNode = statements[elseIndex];

        addEdge(
          s.id,
          elseNode.id,
          "false",
          `edge_${s.id}_false`
        );

        if (elseRange) {
          const elseFirst =
            statements[elseRange.start];
          const elseLast =
            statements[elseRange.end];
          const join = nextAtOrAbove(
            elseRange.end,
            s.depth
          );
          const joinId =
            join >= 0
              ? statements[join].id
              : "exit";

          addEdge(
            elseNode.id,
            elseFirst.id,
            "normal",
            `edge_${elseNode.id}_body`
          );

          addEdge(
            bodyLast.id,
            joinId,
            "normal",
            `edge_${bodyLast.id}_join`
          );

          addEdge(
            elseLast.id,
            joinId,
            "normal",
            `edge_${elseLast.id}_join`
          );
        }
      } else {
        // No ELSE: false goes to the first statement after the IF.
        const joinId =
          afterBody >= 0
            ? statements[afterBody].id
            : "exit";

        addEdge(
          s.id,
          joinId,
          "false",
          `edge_${s.id}_false`
        );

        addEdge(
          bodyLast.id,
          joinId,
          "normal",
          `edge_${bodyLast.id}_join`
        );
      }
    }
  }

  nodes.push({
    id: "exit",
    label: "EXIT",
    type: "exit",
  });

  // Explicit returns always terminate execution.
  statements.forEach((s) => {
    if (s.type === "return") {
      addEdge(
        s.id,
        "exit",
        "normal",
        `edge_${s.id}_exit`
      );
    }
  });

  const last =
    statements[statements.length - 1];

  if (
    last &&
    last.type !== "return" &&
    last.type !== "for" &&
    last.type !== "while"
  ) {
    addEdge(
      last.id,
      "exit",
      "normal",
      "edge_exit"
    );
  }

  return {
    nodes,
    edges,
  };
}

module.exports = buildFlow;
