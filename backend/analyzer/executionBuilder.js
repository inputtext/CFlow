// ============================================================
// C·FLOW EXECUTION BUILDER
// ============================================================

const buildFlow = require("./flowBuilder");

function buildExecution(program) {
  const statements = Array.isArray(program?.statements) ? program.statements : [];
  const byId = new Map(statements.map((s) => [s.id, s]));
  const edges = buildFlow(program).edges;
  const variables = {};
  const execution = [];

  let step = 0;
  let current = statements.length ? statements[0].id : "exit";
  let guard = 0;
  const MAX_STEPS = 5000;
  const loopState = new Map();

  const push = (data) => {
    execution.push({ step: step++, variables: { ...variables }, ...data });
  };

  const next = (from, type = "normal") => {
    const edge = edges.find((e) => e.from === from && e.type === type);
    if (edge) return edge.to;

    // A loop edge is deliberately kept separate in the flow graph so it can
    // be styled as a back-edge. At runtime it is the normal continuation when
    // the current statement has no ordinary successor.
    if (type === "normal") {
      const loopEdge = edges.find((e) => e.from === from && e.type === "loop");
      if (loopEdge) return loopEdge.to;
    }

    return "exit";
  };

  push({ node: "start", line: null, type: "start", explanation: "Program execution begins." });

  while (current !== "exit" && guard++ < MAX_STEPS) {
    const s = byId.get(current);
    if (!s) break;

    // ----------------------------------------------------------
    // FOR LOOP
    // ----------------------------------------------------------
    if (s.type === "for") {
      let state = loopState.get(s.id);

      if (!state) {
        executeForInitializer(s.forInit, variables);
        state = { initialized: true };
        loopState.set(s.id, state);
      } else {
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

      current = next(s.id, result ? "true" : "false");
      continue;
    }

    // ----------------------------------------------------------
    // WHILE / IF
    // ----------------------------------------------------------
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
      current = next(s.id, result ? "true" : "false");
      continue;
    }

    // ----------------------------------------------------------
    // ELSE
    // ----------------------------------------------------------
    if (s.type === "else") {
      push({ node: s.id, line: s.line, type: "else", variables: { ...variables }, explanation: "The ELSE branch is executing." });
      current = next(s.id, "normal");
      continue;
    }

    // ----------------------------------------------------------
    // DECLARATION
    // ----------------------------------------------------------
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
      current = next(s.id);
      continue;
    }

    // ----------------------------------------------------------
    // ASSIGNMENT
    // ----------------------------------------------------------
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
      current = next(s.id);
      continue;
    }

    // ----------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // ----------------------------------------------------------
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
      current = next(s.id);
      continue;
    }

    // ----------------------------------------------------------
    // INCREMENT / DECREMENT
    // ----------------------------------------------------------
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
      current = next(s.id);
      continue;
    }

    // ----------------------------------------------------------
    // OUTPUT
    // ----------------------------------------------------------
    if (s.type === "output") {
      push({
        node: s.id,
        line: s.line,
        type: "output",
        expression: s.code,
        variables: { ...variables },
        explanation: "The program produces output.",
      });
      current = next(s.id);
      continue;
    }

    // ----------------------------------------------------------
    // RETURN
    // ----------------------------------------------------------
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

    // ----------------------------------------------------------
    // GENERIC STATEMENT
    // ----------------------------------------------------------
    push({ node: s.id, line: s.line, type: s.type, variables: { ...variables }, explanation: `Executing: ${s.code}` });
    current = next(s.id);
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

function evaluateValue(expression, variables) {
  if (expression == null) return 0;
  const clean = String(expression).replace(/;$/, "").trim();
  if (/^-?\d+(\.\d+)?$/.test(clean)) return Number(clean);
  if (Object.prototype.hasOwnProperty.call(variables, clean)) return variables[clean];

  const replaced = clean.replace(/\b[A-Za-z_]\w*\b/g, (name) => Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : "0");
  if (/^[0-9+\-*/().%\s]+$/.test(replaced)) {
    try { return Function(`"use strict"; return (${replaced})`)(); } catch { return 0; }
  }
  return 0;
}

function evaluateCondition(expression, variables) {
  if (!expression) return false;
  let condition = String(expression).trim();
  if (condition.includes(";")) condition = (condition.split(";")[1] || "").trim();
  if (condition.includes("&&")) return condition.split("&&").every((part) => evaluateCondition(part, variables));
  if (condition.includes("||")) return condition.split("||").some((part) => evaluateCondition(part, variables));
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
  const clean = String(update).trim().replace(/;$/, "");
  const increment = clean.match(/^(?:\+\+([A-Za-z_]\w*)|([A-Za-z_]\w*)\+\+)$|^(?:--([A-Za-z_]\w*)|([A-Za-z_]\w*)--)$|^([A-Za-z_]\w*)\s*(\+=|-=)\s*(.+)$/);
  if (!increment) return;

  const variable = increment[1] || increment[2] || increment[3] || increment[4] || increment[5];
  if (increment[1] || increment[2]) {
    variables[variable] = (variables[variable] ?? 0) + 1;
    return;
  }
  if (increment[3] || increment[4]) {
    variables[variable] = (variables[variable] ?? 0) - 1;
    return;
  }

  const amount = evaluateValue(increment[7], variables);
  variables[variable] = increment[6] === "+=" ? (variables[variable] ?? 0) + amount : (variables[variable] ?? 0) - amount;
}

module.exports = buildExecution;
