// ============================================================
// C·FLOW EXECUTION BUILDER
// ============================================================
// Executes the same graph produced by flowBuilder.js.
// The execution node IDs therefore always match FlowGraph IDs.
// ============================================================

function buildExecution(program) {
  const statements = Array.isArray(program?.statements) ? program.statements : [];
  const statementById = new Map(statements.map((s) => [s.id, s]));
  const variables = {};
  const execution = [];
  let step = 0;
  let currentNode = "start";
  let guard = 0;
  const MAX_STEPS = 2000;
  const initializedForLoops = new Set();

  // Build the same control-flow edges locally so execution follows
  // exactly the same decisions as the FlowGraph.
  const edges = buildRuntimeEdges(statements);

  const push = (data) => {
    execution.push({
      step: step++,
      variables: { ...variables },
      ...data,
    });
  };

  push({
    node: "start",
    line: null,
    type: "start",
    explanation: "Program execution begins.",
  });

  while (currentNode !== "exit" && guard++ < MAX_STEPS) {
    const statement = statementById.get(currentNode);
    if (!statement) break;

    // --------------------------------------------------------
    // FOR
    // --------------------------------------------------------
    if (statement.type === "for") {
      if (!initializedForLoops.has(statement.id)) {
        executeForInitializer(statement.forInit, variables);
        initializedForLoops.add(statement.id);
      }

      const result = evaluateCondition(statement.forCondition, variables);

      push({
        node: statement.id,
        line: statement.line,
        type: "condition",
        expression: statement.forCondition,
        result,
        variables: { ...variables },
        explanation: `The loop condition ${statement.forCondition} evaluates to ${result}.`,
      });

      currentNode = chooseEdge(edges, statement.id, result ? "true" : "false");
      continue;
    }

    // --------------------------------------------------------
    // WHILE / IF / ELSE-IF
    // --------------------------------------------------------
    if (statement.type === "while" || statement.type === "condition" || statement.type === "else_if") {
      const result = evaluateCondition(statement.expression, variables);

      push({
        node: statement.id,
        line: statement.line,
        type: "condition",
        expression: statement.expression,
        result,
        variables: { ...variables },
        explanation: `The condition ${statement.expression} evaluates to ${result}.`,
      });

      currentNode = chooseEdge(edges, statement.id, result ? "true" : "false");
      continue;
    }

    // --------------------------------------------------------
    // DECLARATION
    // --------------------------------------------------------
    if (statement.type === "declaration") {
      const before = variables[statement.variable];
      const after = evaluateValue(statement.value, variables);
      variables[statement.variable] = after;

      push({
        node: statement.id,
        line: statement.line,
        type: "assignment",
        target: statement.variable,
        before,
        after,
        variables: { ...variables },
        explanation: `${statement.variable} is initialized with the value ${after}.`,
      });

      currentNode = chooseEdge(edges, statement.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // ASSIGNMENT
    // --------------------------------------------------------
    if (statement.type === "assignment") {
      const before = variables[statement.variable];
      const after = evaluateValue(statement.value, variables);
      variables[statement.variable] = after;

      push({
        node: statement.id,
        line: statement.line,
        type: "assignment",
        target: statement.variable,
        before,
        after,
        variables: { ...variables },
        explanation: `${statement.variable} changes from ${before ?? "undefined"} to ${after}.`,
      });

      currentNode = chooseEdge(edges, statement.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // --------------------------------------------------------
    if (statement.type === "compound_assignment") {
      const before = variables[statement.variable] ?? 0;
      const amount = evaluateValue(statement.value, variables);
      let after = before;

      if (statement.operator === "+=") after = before + amount;
      if (statement.operator === "-=") after = before - amount;
      if (statement.operator === "*=") after = before * amount;
      if (statement.operator === "/=") after = amount === 0 ? before : before / amount;

      variables[statement.variable] = after;

      push({
        node: statement.id,
        line: statement.line,
        type: "compound_assignment",
        target: statement.variable,
        before,
        operand: amount,
        after,
        expression: `${statement.variable} ${statement.operator} ${statement.value}`,
        variables: { ...variables },
        explanation: `${statement.variable} changes from ${before} to ${after}.`,
      });

      currentNode = chooseEdge(edges, statement.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // INCREMENT / DECREMENT
    // --------------------------------------------------------
    if (statement.type === "increment") {
      const before = variables[statement.variable] ?? 0;
      const after = statement.operator === "++" ? before + 1 : before - 1;
      variables[statement.variable] = after;

      push({
        node: statement.id,
        line: statement.line,
        type: "increment",
        target: statement.variable,
        before,
        operand: 1,
        after,
        expression: `${statement.variable}${statement.operator}`,
        variables: { ...variables },
        explanation: `${statement.variable} changes from ${before} to ${after}.`,
      });

      currentNode = chooseEdge(edges, statement.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // OUTPUT
    // --------------------------------------------------------
    if (statement.type === "output") {
      push({
        node: statement.id,
        line: statement.line,
        type: "output",
        expression: statement.code,
        variables: { ...variables },
        explanation: "The program produces output.",
      });

      currentNode = chooseEdge(edges, statement.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------
    if (statement.type === "return") {
      push({
        node: statement.id,
        line: statement.line,
        type: "return",
        variables: { ...variables },
        explanation: `Returning from the program: ${statement.code}`,
      });

      currentNode = "exit";
      continue;
    }

    // --------------------------------------------------------
    // ELSE / GENERIC
    // --------------------------------------------------------
    push({
      node: statement.id,
      line: statement.line,
      type: statement.type,
      variables: { ...variables },
      explanation: `Executing: ${statement.code}`,
    });

    currentNode = chooseEdge(edges, statement.id, "normal");
  }

  push({
    node: "exit",
    line: null,
    type: "exit",
    variables: { ...variables },
    explanation:
      guard >= MAX_STEPS
        ? "Execution stopped after reaching the safety limit."
        : "Program execution has finished.",
  });

  return execution;
}

// ============================================================
// RUNTIME GRAPH
// ============================================================

function buildRuntimeEdges(statements) {
  const edges = [];
  const add = (from, to, type) => {
    if (!from || !to) return;
    if (edges.some((e) => e.from === from && e.to === to && e.type === type)) return;
    edges.push({ from, to, type });
  };

  const isControl = (s) => s && ["for", "while", "condition", "else_if", "else"].includes(s.type);

  function bodyRange(index) {
    const control = statements[index];
    const next = statements[index + 1];
    if (!next) return null;

    if (next.depth <= control.depth) return { start: index + 1, end: index + 1 };

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

  add("start", statements[0]?.id, "normal");

  for (let i = 0; i < statements.length - 1; i++) {
    const current = statements[i];
    const next = statements[i + 1];
    if (!isControl(current) && current.type !== "return" && current.depth === next.depth) {
      add(current.id, next.id, "normal");
    }
  }

  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];

    if (s.type === "for" || s.type === "while") {
      const range = bodyRange(i);
      if (!range) {
        const after = nextAtOrAbove(i, s.depth);
        add(s.id, after >= 0 ? statements[after].id : "exit", "false");
        continue;
      }

      const first = statements[range.start];
      const last = statements[range.end];
      const after = nextAtOrAbove(range.end, s.depth);
      add(s.id, first.id, "true");
      add(last.id, s.id, "loop");
      add(s.id, after >= 0 ? statements[after].id : "exit", "false");
      continue;
    }

    if (s.type === "condition" || s.type === "else_if") {
      const range = bodyRange(i);
      const first = range ? statements[range.start] : statements[i + 1];
      const lastIndex = range ? range.end : i + 1;
      const last = statements[lastIndex];
      if (first) add(s.id, first.id, "true");

      const afterBody = nextAtOrAbove(lastIndex, s.depth);
      const elseIndex = afterBody >= 0 && statements[afterBody].type === "else" ? afterBody : -1;

      if (elseIndex >= 0) {
        const e = statements[elseIndex];
        add(s.id, e.id, "false");
        const er = bodyRange(elseIndex);
        if (er) {
          add(e.id, statements[er.start].id, "normal");
          const join = nextAtOrAbove(er.end, s.depth);
          add(statements[er.end].id, join >= 0 ? statements[join].id : "exit", "normal");
          if (last && !isControl(last)) {
            add(last.id, join >= 0 ? statements[join].id : "exit", "normal");
          }
        }
      } else {
        add(s.id, afterBody >= 0 ? statements[afterBody].id : "exit", "false");
        if (last && !isControl(last)) add(last.id, afterBody >= 0 ? statements[afterBody].id : "exit", "normal");
      }
    }

    if (s.type === "else") {
      const range = bodyRange(i);
      if (range) add(s.id, statements[range.start].id, "normal");
    }

    if (s.type === "return") add(s.id, "exit", "normal");
  }

  const last = statements[statements.length - 1];
  if (last && !["for", "while", "return"].includes(last.type)) add(last.id, "exit", "normal");

  return edges;
}

function chooseEdge(edges, from, preferredType) {
  const preferred = edges.find((edge) => edge.from === from && edge.type === preferredType);
  if (preferred) return preferred.to;

  const fallback = edges.find((edge) => edge.from === from);
  return fallback?.to || "exit";
}

// ============================================================
// VALUE EVALUATION
// ============================================================

function evaluateValue(expression, variables) {
  if (expression == null) return 0;

  const clean = String(expression)
    .replace(/;$/, "")
    .trim();

  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);

  if (Object.prototype.hasOwnProperty.call(variables, clean)) return variables[clean];

  const replaced = clean.replace(/\b[A-Za-z_]\w*\b/g, (name) => {
    return Object.prototype.hasOwnProperty.call(variables, name)
      ? String(variables[name])
      : "0";
  });

  if (/^[0-9+\-*/().\s]+$/.test(replaced)) {
    try {
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${replaced})`)();
    } catch {
      return 0;
    }
  }

  return 0;
}

// ============================================================
// CONDITION EVALUATION
// ============================================================

function evaluateCondition(expression, variables) {
  if (!expression) return false;

  let condition = String(expression).trim();

  if (condition.includes(";")) {
    const parts = condition.split(";");
    condition = (parts[1] || "").trim();
  }

  const operators = ["<=", ">=", "==", "!=", "<", ">"]; 

  for (const operator of operators) {
    const position = condition.indexOf(operator);
    if (position === -1) continue;

    const left = condition.slice(0, position).trim();
    const right = condition.slice(position + operator.length).trim();
    const leftValue = evaluateValue(left, variables);
    const rightValue = evaluateValue(right, variables);

    if (operator === "<=") return leftValue <= rightValue;
    if (operator === ">=") return leftValue >= rightValue;
    if (operator === "==") return leftValue === rightValue;
    if (operator === "!=") return leftValue !== rightValue;
    if (operator === "<") return leftValue < rightValue;
    if (operator === ">") return leftValue > rightValue;
  }

  return false;
}

function executeForInitializer(init, variables) {
  if (!init) return;

  const declaration = init.match(
    /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:(?:long\s+long|long|short)\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*))?$/
  );

  if (declaration) {
    variables[declaration[1]] = evaluateValue(declaration[2] ?? "0", variables);
    return;
  }

  const assignment = init.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
  if (assignment) {
    variables[assignment[1]] = evaluateValue(assignment[2], variables);
  }
}

module.exports = buildExecution;
