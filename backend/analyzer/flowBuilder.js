// ============================================================
// C·FLOW FLOW BUILDER
// ============================================================
// Converts parser statements into a control-flow graph.
//
// Supported:
// - sequential execution
// - if
// - else if
// - else
// - for
// - while
// - loop-back edges
// - true / false edges
// - start / exit
// ============================================================

function buildFlow(program) {
  const nodes = [];
  const edges = [];

  const statements = Array.isArray(
    program?.statements
  )
    ? program.statements
    : [];

  // ----------------------------------------------------------
  // EDGE HELPER
  // ----------------------------------------------------------

  const addEdge = (
    from,
    to,
    type = "normal",
    id
  ) => {
    if (!from || !to) return;

    const exists = edges.some(
      (edge) =>
        edge.from === from &&
        edge.to === to &&
        edge.type === type
    );

    if (exists) return;

    edges.push({
      id:
        id ??
        `edge_${edges.length}`,
      from,
      to,
      type,
    });
  };

  // ----------------------------------------------------------
  // NODE CREATOR
  // ----------------------------------------------------------

  const createNode = (statement) => {
    if (
      statement.type === "for" ||
      statement.type === "while" ||
      statement.type === "condition" ||
      statement.type === "else_if"
    ) {
      return {
        id: statement.id,
        label:
          statement.expression
            ? `${statement.expression} ?`
            : statement.code,
        type: "condition",
        line: statement.line,
      };
    }

    if (statement.type === "else") {
      return {
        id: statement.id,
        label: "ELSE",
        type: "condition",
        line: statement.line,
      };
    }

    if (
      statement.type === "declaration"
    ) {
      return {
        id: statement.id,
        label:
          statement.value !== null &&
          statement.value !== undefined
            ? `${statement.variable} = ${statement.value}`
            : statement.variable,
        type: "operation",
        line: statement.line,
      };
    }

    if (
      statement.type === "output"
    ) {
      return {
        id: statement.id,
        label: "OUTPUT",
        type: "output",
        line: statement.line,
      };
    }

    return {
      id: statement.id,
      label: String(
        statement.code ?? ""
      ).replace(/;$/, ""),
      type: "operation",
      line: statement.line,
    };
  };

  // ----------------------------------------------------------
  // START
  // ----------------------------------------------------------

  nodes.push({
    id: "start",
    label: "START",
    type: "start",
  });

  // ----------------------------------------------------------
  // STATEMENT NODES
  // ----------------------------------------------------------

  statements.forEach(
    (statement) => {
      nodes.push(
        createNode(statement)
      );
    }
  );

  // ----------------------------------------------------------
  // EMPTY PROGRAM
  // ----------------------------------------------------------

  if (statements.length === 0) {
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

    return {
      nodes,
      edges,
    };
  }

  // ----------------------------------------------------------
  // START → FIRST STATEMENT
  // ----------------------------------------------------------

  addEdge(
    "start",
    statements[0].id,
    "normal",
    "edge_start"
  );

  // ----------------------------------------------------------
  // FIND BLOCK END
  // ----------------------------------------------------------

  /*
   * The parser gives us statements in source order.
   *
   * We use the source line numbers to determine where a control
   * block finishes.
   *
   * This is intentionally conservative. It handles the common
   * simple C/C++ structures used by C·FLOW without pretending to
   * be a full C++ compiler.
   */

  function findLoopBodyEnd(index) {
    const control =
      statements[index];

    let end = index + 1;

    while (
      end < statements.length
    ) {
      const current =
        statements[end];

      /*
       * A new top-level control statement
       * indicates the previous simple block
       * has ended.
       */
      if (
        end > index + 1 &&
        (
          current.type === "for" ||
          current.type === "while" ||
          current.type === "condition" ||
          current.type === "else_if" ||
          current.type === "else"
        )
      ) {
        break;
      }

      end++;
    }

    return end - 1;
  }

  // ----------------------------------------------------------
  // BUILD EDGES
  // ----------------------------------------------------------

  for (
    let index = 0;
    index < statements.length;
    index++
  ) {
    const statement =
      statements[index];

    const current =
      statement.id;

    const next =
      statements[index + 1]?.id ??
      "exit";

    // ========================================================
    // FOR / WHILE
    // ========================================================

    if (
      statement.type === "for" ||
      statement.type === "while"
    ) {
      const bodyIndex =
        index + 1;

      const body =
        statements[bodyIndex];

      if (body) {
        // condition → body
        addEdge(
          current,
          body.id,
          "true",
          `edge_${current}_true`
        );

        /*
         * Find the last statement belonging
         * to the simple loop body.
         */
        const bodyEndIndex =
          findLoopBodyEnd(index);

        const bodyEnd =
          statements[
            bodyEndIndex
          ];

        if (bodyEnd) {
          // body → condition
          addEdge(
            bodyEnd.id,
            current,
            "loop",
            `edge_${current}_loop`
          );

          const afterLoop =
            statements[
              bodyEndIndex + 1
            ]?.id ?? "exit";

          // condition → after loop
          addEdge(
            current,
            afterLoop,
            "false",
            `edge_${current}_false`
          );
        }
      } else {
        addEdge(
          current,
          "exit",
          "false",
          `edge_${current}_false`
        );
      }

      continue;
    }

    // ========================================================
    // IF / ELSE-IF
    // ========================================================

    if (
      statement.type ===
        "condition" ||
      statement.type ===
        "else_if"
    ) {
      const trueTarget =
        statements[index + 1];

      if (trueTarget) {
        addEdge(
          current,
          trueTarget.id,
          "true",
          `edge_${current}_true`
        );
      }

      /*
       * Look ahead for an ELSE.
       */
      let elseStatement =
        null;

      for (
        let j = index + 1;
        j < statements.length;
        j++
      ) {
        if (
          statements[j].type ===
          "else"
        ) {
          elseStatement =
            statements[j];

          break;
        }

        /*
         * Don't search through another
         * independent control structure.
         */
        if (
          j > index + 1 &&
          (
            statements[j].type ===
              "condition" ||
            statements[j].type ===
              "for" ||
            statements[j].type ===
              "while"
          )
        ) {
          break;
        }
      }

      if (elseStatement) {
        addEdge(
          current,
          elseStatement.id,
          "false",
          `edge_${current}_false`
        );
      } else {
        /*
         * No explicit ELSE.
         *
         * The false branch skips the immediate
         * body statement.
         */
        const falseTarget =
          statements[index + 2];

        addEdge(
          current,
          falseTarget?.id ??
            "exit",
          "false",
          `edge_${current}_false`
        );
      }

      continue;
    }

    // ========================================================
    // ELSE
    // ========================================================

    if (
      statement.type === "else"
    ) {
      addEdge(
        current,
        next,
        "normal",
        `edge_${current}_next`
      );

      continue;
    }

    // ========================================================
    // NORMAL STATEMENT
    // ========================================================

    addEdge(
      current,
      next,
      "normal",
      `edge_${current}_next`
    );
  }

  // ----------------------------------------------------------
  // EXIT
  // ----------------------------------------------------------

  nodes.push({
    id: "exit",
    label: "EXIT",
    type: "exit",
  });

  /*
   * If the last executable statement isn't
   * a loop, connect it to EXIT.
   */
  const last =
    statements[
      statements.length - 1
    ];

  if (
    last &&
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
