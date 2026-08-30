// ============================================================
// C·FLOW FLOW BUILDER
// ============================================================

function buildFlow(program) {
  const nodes = [];
  const edges = [];

  // ----------------------------------------------------------
  // START
  // ----------------------------------------------------------

  nodes.push({
    id: "start",
    label: "START",
    type: "start",
  });

  let previousNode = "start";

  // ----------------------------------------------------------
  // STATEMENTS
  // ----------------------------------------------------------

  program.statements.forEach(
    (statement, index) => {
      let node;

      // ------------------------------------------------------
      // DECLARATION
      // ------------------------------------------------------

      if (
        statement.type ===
        "declaration"
      ) {
        node = {
          id: statement.id,
          label: statement.value
            ? `${statement.variable} = ${statement.value}`
            : statement.variable,
          type: "operation",
          line: statement.line,
        };
      }

      // ------------------------------------------------------
      // CONDITION
      // ------------------------------------------------------

      else if (
        statement.type ===
          "condition" ||
        statement.type === "for" ||
        statement.type === "while"
      ) {
        node = {
          id: statement.id,
          label: `${statement.expression} ?`,
          type: "condition",
          line: statement.line,
        };
      }

      // ------------------------------------------------------
      // ELSE
      // ------------------------------------------------------

      else if (
        statement.type === "else"
      ) {
        node = {
          id: statement.id,
          label: "ELSE",
          type: "condition",
          line: statement.line,
        };
      }

      // ------------------------------------------------------
      // OUTPUT
      // ------------------------------------------------------

      else if (
        statement.type === "output"
      ) {
        node = {
          id: statement.id,
          label: "OUTPUT",
          type: "output",
          line: statement.line,
        };
      }

      // ------------------------------------------------------
      // RETURN
      // ------------------------------------------------------

      else if (
        statement.type === "return"
      ) {
        node = {
          id: statement.id,
          label: statement.code,
          type: "operation",
          line: statement.line,
        };
      }

      // ------------------------------------------------------
      // NORMAL OPERATION
      // ------------------------------------------------------

      else {
        node = {
          id: statement.id,
          label: statement.code.replace(
            /;$/,
            ""
          ),
          type: "operation",
          line: statement.line,
        };
      }

      nodes.push(node);

      // ------------------------------------------------------
      // NORMAL EDGE
      // ------------------------------------------------------

      if (previousNode) {
        edges.push({
          id: `edge_${index}`,
          from: previousNode,
          to: node.id,
          type: "normal",
        });
      }

      previousNode = node.id;
    }
  );

  // ----------------------------------------------------------
  // EXIT
  // ----------------------------------------------------------

  nodes.push({
    id: "exit",
    label: "EXIT",
    type: "exit",
  });

  if (previousNode) {
    edges.push({
      id: "edge_exit",
      from: previousNode,
      to: "exit",
      type: "normal",
    });
  }

  return {
    nodes,
    edges,
  };
}

module.exports = buildFlow;
