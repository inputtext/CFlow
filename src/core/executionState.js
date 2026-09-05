/* ============================================================
   C·FLOW CANONICAL EXECUTION STATE

   Normalizes backend execution steps into the state shape used
   by the visualizer. This adapter is intentionally additive:
   existing execution fields remain available and older steps
   continue to work through safe fallbacks.
============================================================ */

const RESERVED_WORDS = new Set([
  "if", "else", "for", "while", "do", "return", "switch", "case",
  "break", "continue", "true", "false", "int", "float", "double",
  "char", "bool", "long", "short", "unsigned", "signed", "const",
  "void", "auto", "static", "struct", "class", "string", "cout",
  "cin", "std", "endl",
]);

function extractIdentifiers(expression) {
  if (!expression) return [];

  return [...String(expression).matchAll(/\b[A-Za-z_]\w*\b/g)]
    .map((match) => match[0])
    .filter((name) => !RESERVED_WORDS.has(name));
}

function buildDataFlow(step, previousVariables, variables) {
  const source = step.expression ?? step.value ?? step.code ?? "";
  if (!source) return null;

  const target = step.target ?? null;
  const knownNames = new Set([
    ...Object.keys(previousVariables),
    ...Object.keys(variables),
  ]);

  const dependencies = [...new Set(extractIdentifiers(source))]
    .filter((name) => knownNames.has(name) && name !== target);

  const inputs = {};
  for (const name of dependencies) {
    if (Object.prototype.hasOwnProperty.call(previousVariables, name)) {
      inputs[name] = previousVariables[name];
    } else {
      inputs[name] = variables[name];
    }
  }

  let result;
  if (Object.prototype.hasOwnProperty.call(step, "after")) {
    result = step.after;
  } else if (step.type === "condition" && Object.prototype.hasOwnProperty.call(step, "result")) {
    result = step.result;
  }

  return {
    target,
    expression: String(source).replace(/;$/, "").trim(),
    dependencies,
    inputs,
    result,
  };
}

export function getExecutionState(step, fallbackVariables = {}) {
  if (!step) {
    return {
      variables: fallbackVariables,
      previousVariables: {},
      changedVariables: [],
      variableLifecycle: {},
      readVariables: [],
      variableEvents: [],
      dataFlow: null,
      activeNode: null,
      line: null,
      type: null,
    };
  }

  const canonical = step.state || {};

  const variables =
    canonical.variables ??
    step.variables ??
    fallbackVariables;

  const previousVariables =
    canonical.previousVariables ??
    step.previousVariables ??
    {};

  const changedVariables =
    Array.isArray(canonical.changedVariables)
      ? canonical.changedVariables
      : Array.isArray(step.changedVariables)
        ? step.changedVariables
        : Object.keys({
            ...previousVariables,
            ...variables,
          }).filter(
            (name) =>
              !Object.is(
                previousVariables[name],
                variables[name]
              )
          );

  const variableLifecycle =
    canonical.variableLifecycle ??
    step.variableLifecycle ??
    {};

  const readVariables =
    Array.isArray(canonical.readVariables)
      ? canonical.readVariables
      : Array.isArray(step.readVariables)
        ? step.readVariables
        : [];

  const variableEvents =
    Array.isArray(canonical.variableEvents)
      ? canonical.variableEvents
      : Array.isArray(step.variableEvents)
        ? step.variableEvents
        : [];

  const dataFlow =
    canonical.dataFlow ??
    step.dataFlow ??
    buildDataFlow(step, previousVariables, variables);

  return {
    ...step,
    variables,
    previousVariables,
    changedVariables,
    variableLifecycle,
    readVariables,
    variableEvents,
    dataFlow,
    state: {
      ...canonical,
      dataFlow,
    },
    activeNode:
      canonical.activeNode ??
      step.node ??
      null,
    line:
      canonical.line ??
      step.line ??
      null,
    type:
      canonical.type ??
      step.type ??
      null,
  };
}

export function hasVariableChange(executionState, name) {
  return Boolean(
    executionState?.changedVariables?.includes(name)
  );
}

export function getVariableLifecycle(executionState, name) {
  return executionState?.variableLifecycle?.[name] ?? null;
}

export function getDataFlow(executionState) {
  return executionState?.dataFlow ?? null;
}
