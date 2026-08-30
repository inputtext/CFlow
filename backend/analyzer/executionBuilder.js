// ============================================================
// C·FLOW EXECUTION BUILDER
// ============================================================

function buildExecution(program) {
  const statements = Array.isArray(program?.statements) ? program.statements : [];
  const byId = new Map(statements.map((s) => [s.id, s]));
  const edges = buildRuntimeEdges(statements);
  const variables = {};
  const execution = [];
  const initializedLoops = new Set();
  let current = "start";
  let step = 0;
  let guard = 0;
  const MAX_STEPS = 5000;

  const push = (data) => execution.push({ step: step++, variables: { ...variables }, ...data });

  push({ node: "start", line: null, type: "start", explanation: "Program execution begins." });

  while (current !== "exit" && guard++ < MAX_STEPS) {
    const s = byId.get(current);
    if (!s) break;

    // --------------------------------------------------------
    // FOR
    // --------------------------------------------------------
    if (s.type === "for") {
      if (!initializedLoops.has(s.id)) {
        executeForInitializer(s.forInit, variables);
        initializedLoops.add(s.id);
      } else {
        // We only reach the FOR node again through its loop edge,
        // so execute the C/C++ for-update before rechecking it.
        executeForUpdate(s.forUpdate, variables);
      }

      const result = evaluateCondition(s.forCondition, variables);
      push({
        node: s.id,
        line: s.line,
        type: "condition",
        expression: s.forCondition,
        result,
        variables: { ...variables },
        explanation: `The loop condition ${s.forCondition} evaluates to ${result}.`,
      });
      current = chooseEdge(edges, s.id, result ? "true" : "false");
      continue;
    }

    // --------------------------------------------------------
    // WHILE / IF / ELSE-IF
    // --------------------------------------------------------
    if (s.type === "while" || s.type === "condition" || s.type === "else_if") {
      const result = evaluateCondition(s.expression, variables);
      push({
        node: s.id,
        line: s.line,
        type: "condition",
        expression: s.expression,
        result,
        variables: { ...variables },
        explanation: `The condition ${s.expression} evaluates to ${result}.`,
      });
      current = chooseEdge(edges, s.id, result ? "true" : "false");
      continue;
    }

    // --------------------------------------------------------
    // DECLARATION
    // --------------------------------------------------------
    if (s.type === "declaration") {
      const before = variables[s.variable];
      const after = evaluateValue(s.value, variables);
      variables[s.variable] = after;
      push({
        node: s.id,
        line: s.line,
        type: "assignment",
        target: s.variable,
        before,
        after,
        variables: { ...variables },
        explanation: `${s.variable} is initialized with the value ${after}.`,
      });
      current = chooseEdge(edges, s.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // ASSIGNMENT
    // --------------------------------------------------------
    if (s.type === "assignment") {
      const before = variables[s.variable];
      const after = evaluateValue(s.value, variables);
      variables[s.variable] = after;
      push({
        node: s.id,
        line: s.line,
        type: "assignment",
        target: s.variable,
        before,
        after,
        variables: { ...variables },
        explanation: `${s.variable} changes from ${before ?? "undefined"} to ${after}.`,
      });
      current = chooseEdge(edges, s.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // --------------------------------------------------------
    if (s.type === "compound_assignment") {
      const before = variables[s.variable] ?? 0;
      const amount = evaluateValue(s.value, variables);
      let after = before;
      if (s.operator === "+=") after = before + amount;
      if (s.operator === "-=") after = before - amount;
      if (s.operator === "*=") after = before * amount;
      if (s.operator === "/=") after = amount === 0 ? before : before / amount;
      variables[s.variable] = after;
      push({
        node: s.id,
        line: s.line,
        type: "compound_assignment",
        target: s.variable,
        before,
        operand: amount,
        after,
        expression: `${s.variable} ${s.operator} ${s.value}`,
        variables: { ...variables },
        explanation: `${s.variable} changes from ${before} to ${after}.`,
      });
      current = chooseEdge(edges, s.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // INCREMENT / DECREMENT
    // --------------------------------------------------------
    if (s.type === "increment") {
      const before = variables[s.variable] ?? 0;
      const after = s.operator === "++" ? before + 1 : before - 1;
      variables[s.variable] = after;
      push({
        node: s.id,
        line: s.line,
        type: "increment",
        target: s.variable,
        before,
        operand: 1,
        after,
        expression: `${s.variable}${s.operator}`,
        variables: { ...variables },
        explanation: `${s.variable} changes from ${before} to ${after}.`,
      });
      current = chooseEdge(edges, s.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // OUTPUT
    // --------------------------------------------------------
    if (s.type === "output") {
      push({
        node: s.id,
        line: s.line,
        type: "output",
        expression: s.code,
        variables: { ...variables },
        explanation: "The program produces output.",
      });
      current = chooseEdge(edges, s.id, "normal");
      continue;
    }

    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------
    if (s.type === "return") {
      push({
        node: s.id,
        line: s.line,
        type: "return",
        variables: { ...variables },
        explanation: `Returning from the program: ${s.code}`,
      });
      current = "exit";
      continue;
    }

    // ELSE / generic statement
    push({
      node: s.id,
      line: s.line,
      type: s.type,
      variables: { ...variables },
      explanation: `Executing: ${s.code}`,
    });
    current = chooseEdge(edges, s.id, "normal");
  }

  push({
    node: "exit",
    line: null,
    type: "exit",
    variables: { ...variables },
    explanation: guard >= MAX_STEPS ? "Execution stopped after reaching the safety limit." : "Program execution has finished.",
  });

  return execution;
}

// ============================================================
// RUNTIME GRAPH — mirrors flowBuilder.js
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

  if (statements.length) add("start", statements[0].id, "normal");

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
          if (last && !isControl(last)) add(last.id, join >= 0 ? statements[join].id : "exit", "normal");
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
  return edges.find((edge) => edge.from === from)?.to || "exit";
}

// ============================================================
// EXPRESSIONS
// ============================================================

function evaluateValue(expression, variables) {
  if (expression == null) return 0;
  const clean = String(expression).replace(/;$/, "").trim();
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);
  if (Object.prototype.hasOwnProperty.call(variables, clean)) return variables[clean];

  const replaced = clean.replace(/\b[A-Za-z_]\w*\b/g, (name) =>
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : "0"
  );

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

function evaluateCondition(expression, variables) {
  if (!expression) return false;
  let condition = String(expression).trim();
  if (condition.includes(";")) condition = (condition.split(";")[1] || "").trim();
  if (condition.includes("&&")) return condition.split("&&").every((p) => evaluateCondition(p, variables));
  if (condition.includes("||")) return condition.split("||").some((p) => evaluateCondition(p, variables));
  if (condition.startsWith("!")) return !evaluateCondition(condition.slice(1), variables);

  for (const op of ["<=", ">=", "==", "!=", "<", ">"]) {
    const pos = condition.indexOf(op);
    if (pos < 0) continue;
    const left = evaluateValue(condition.slice(0, pos), variables);
    const right = evaluateValue(condition.slice(pos + op.length), variables);
    if (op === "<=") return left <= right;
    if (op === ">=") return left >= right;
    if (op === "==") return left === right;
    if (op === "!=") return left !== right;
    if (op === "<") return left < right;
    if (op === ">") return left > right;
  }
  return Boolean(evaluateValue(condition, variables));
}

function executeForInitializer(init, variables) {
  if (!init) return;
  const declaration = init.match(/^(?:const\s+)?(?:(?:unsigned|signed)\s+)?(?:(?:long\s+long|long|short)\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*))?$/);
  if (declaration) {
    variables[declaration[1]] = evaluateValue(declaration[2] ?? "0", variables);
    return;
  }
  const assignment = init.match(/^([A-Za-z_]\w*)\s*=\s*(.*)$/);
  if (assignment) variables[assignment[1]] = evaluateValue(assignment[2], variables);
}

function executeForUpdate(update, variables) {
  if (!update) return;
  const clean = String(update).trim();
  const inc = clean.match(/^(?:\+\+([A-Za-z_]\w*)|([A-Za-z_]\w*)\+\+|--([A-Za-z_]\w*)|([A-Za-z_]\w*)--)$|^([A-Za-z_]\w*)\s*(\+=|-=)\s*(.+)$/);

  if (inc) {
    const variable = inc[1] || inc[2] || inc[3] || inc[4] || inc[5];
    if (inc[1] || inc[2]) variables[variable] = (variables[variable] ?? 0) + 1;
    else if (inc[3] || inc[4]) variables[variable] = (variables[variable] ?? 0) - 1;
    else {
      const amount = evaluateValue(inc[7], variables);
      variables[variable] = inc[6] === "+=" ? (variables[variable] ?? 0) + amount : (variables[variable] ?? 0) - amount;
    }
  }
}

module.exports = buildExecution;
