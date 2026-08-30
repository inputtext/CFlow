// ============================================================
// C·FLOW EXECUTION BUILDER
// ============================================================

function buildExecution(program) {
  const execution = [];

  const variables = {};

  let stepNumber = 0;

  // ----------------------------------------------------------
  // START
  // ----------------------------------------------------------

  execution.push({
    step: stepNumber++,
    node: "start",
    line: null,
    type: "start",
    variables: {
      ...variables,
    },
    explanation:
      "Program execution begins.",
  });

  // ----------------------------------------------------------
  // PROCESS STATEMENTS
  // ----------------------------------------------------------

  for (const statement of program.statements) {
    // --------------------------------------------------------
    // DECLARATION
    // --------------------------------------------------------

    if (
      statement.type ===
      "declaration"
    ) {
      const before =
        variables[statement.variable];

      let value =
        evaluateValue(
          statement.value,
          variables
        );

      variables[statement.variable] =
        value;

      execution.push({
        step: stepNumber++,
        node: statement.id,
        line: statement.line,
        type: "assignment",
        target: statement.variable,
        before,
        after: value,
        variables: {
          ...variables,
        },
        explanation:
          `${statement.variable} is initialized with the value ${value}.`,
      });

      continue;
    }

    // --------------------------------------------------------
    // ASSIGNMENT
    // --------------------------------------------------------

    if (
      statement.type ===
      "assignment"
    ) {
      const before =
        variables[statement.variable];

      const value =
        evaluateValue(
          statement.value,
          variables
        );

      variables[statement.variable] =
        value;

      execution.push({
        step: stepNumber++,
        node: statement.id,
        line: statement.line,
        type: "assignment",
        target: statement.variable,
        before,
        after: value,
        variables: {
          ...variables,
        },
        explanation:
          `${statement.variable} changes from ${before ?? "undefined"} to ${value}.`,
      });

      continue;
    }

    // --------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // --------------------------------------------------------

    if (
      statement.type ===
      "compound_assignment"
    ) {
      const before =
        variables[statement.variable] ?? 0;

      const amount =
        evaluateValue(
          statement.value,
          variables
        );

      let after = before;

      if (statement.operator === "+=") {
        after = before + amount;
      }

      if (statement.operator === "-=") {
        after = before - amount;
      }

      if (statement.operator === "*=") {
        after = before * amount;
      }

      if (statement.operator === "/=") {
        after = before / amount;
      }

      variables[statement.variable] =
        after;

      execution.push({
        step: stepNumber++,
        node: statement.id,
        line: statement.line,
        type: "compound_assignment",
        target: statement.variable,
        before,
        after,
        variables: {
          ...variables,
        },
        explanation:
          `${statement.variable} changes from ${before} to ${after}.`,
      });

      continue;
    }

    // --------------------------------------------------------
    // INCREMENT
    // --------------------------------------------------------

    if (
      statement.type ===
      "increment"
    ) {
      const before =
        variables[statement.variable] ?? 0;

      const after =
        statement.operator === "++"
          ? before + 1
          : before - 1;

      variables[statement.variable] =
        after;

      execution.push({
        step: stepNumber++,
        node: statement.id,
        line: statement.line,
        type: "increment",
        target: statement.variable,
        before,
        after,
        variables: {
          ...variables,
        },
        explanation:
          `${statement.variable} changes from ${before} to ${after}.`,
      });

      continue;
    }

    // --------------------------------------------------------
    // CONDITION
    // --------------------------------------------------------

    if (
      statement.type ===
        "condition" ||
      statement.type === "for" ||
      statement.type === "while"
    ) {
      const result =
        evaluateCondition(
          statement.expression,
          variables
        );

      execution.push({
        step: stepNumber++,
        node: statement.id,
        line: statement.line,
        type: "condition",
        result,
        variables: {
          ...variables,
        },
        explanation:
          `The condition ${statement.expression} evaluates to ${result}.`,
      });

      continue;
    }

    // --------------------------------------------------------
    // OUTPUT
    // --------------------------------------------------------

    if (
      statement.type === "output"
    ) {
      execution.push({
        step: stepNumber++,
        node: statement.id,
        line: statement.line,
        type: "output",
        variables: {
          ...variables,
        },
        explanation:
          "The program produces output.",
      });

      continue;
    }

    // --------------------------------------------------------
    // EVERYTHING ELSE
    // --------------------------------------------------------

    execution.push({
      step: stepNumber++,
      node: statement.id,
      line: statement.line,
      type: statement.type,
      variables: {
        ...variables,
      },
      explanation:
        `Executing: ${statement.code}`,
    });
  }

  // ----------------------------------------------------------
  // EXIT
  // ----------------------------------------------------------

  execution.push({
    step: stepNumber++,
    node: "exit",
    line: null,
    type: "exit",
    variables: {
      ...variables,
    },
    explanation:
      "Program execution has finished.",
  });

  return execution;
}

// ============================================================
// SIMPLE VALUE EVALUATOR
// ============================================================

function evaluateValue(
  expression,
  variables
) {
  if (
    expression === null ||
    expression === undefined
  ) {
    return 0;
  }

  const clean =
    expression
      .replace(/;$/, "")
      .trim();

  // Number
  if (
    /^-?\d+(\.\d+)?$/.test(clean)
  ) {
    return Number(clean);
  }

  // Existing variable
  if (
    Object.prototype.hasOwnProperty.call(
      variables,
      clean
    )
  ) {
    return variables[clean];
  }

  // Simple arithmetic
  try {
    let expressionForEval =
      clean.replace(
        /\b[A-Za-z_]\w*\b/g,
        (name) => {
          if (
            Object.prototype.hasOwnProperty.call(
              variables,
              name
            )
          ) {
            return variables[name];
          }

          return "0";
        }
      );

    if (
      /^[0-9+\-*/().\s]+$/.test(
        expressionForEval
      )
    ) {
      // eslint-disable-next-line no-new-func
      return Function(
        `"use strict"; return (${expressionForEval})`
      )();
    }
  } catch {
    // Fall through.
  }

  return 0;
}

// ============================================================
// SIMPLE CONDITION EVALUATOR
// ============================================================

function evaluateCondition(
  expression,
  variables
) {
  if (!expression) {
    return false;
  }

  let condition =
    expression.trim();

  // Handle FOR condition:
  // int i = 0; i <= 10; i++
  if (condition.includes(";")) {
    const parts =
      condition.split(";");

    if (parts.length >= 2) {
      condition =
        parts[1].trim();
    }
  }

  const operators = [
    "<=",
    ">=",
    "==",
    "!=",
    "<",
    ">",
  ];

  for (const operator of operators) {
    if (
      condition.includes(operator)
    ) {
      const [left, right] =
        condition.split(operator);

      const leftValue =
        evaluateValue(
          left,
          variables
        );

      const rightValue =
        evaluateValue(
          right,
          variables
        );

      switch (operator) {
        case "<=":
          return leftValue <= rightValue;

        case ">=":
          return leftValue >= rightValue;

        case "==":
          return leftValue === rightValue;

        case "!=":
          return leftValue !== rightValue;

        case "<":
          return leftValue < rightValue;

        case ">":
          return leftValue > rightValue;

        default:
          return false;
      }
    }
  }

  return false;
}

module.exports = buildExecution;
