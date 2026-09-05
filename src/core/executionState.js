/* ============================================================
   C·FLOW CANONICAL EXECUTION STATE

   Normalizes backend execution steps into the state shape used
   by the visualizer. This adapter is intentionally additive:
   existing execution fields remain available and older steps
   continue to work through safe fallbacks.
============================================================ */

export function getExecutionState(step, fallbackVariables = {}) {
  if (!step) {
    return {
      variables: fallbackVariables,
      previousVariables: {},
      changedVariables: [],
      variableLifecycle: {},
      readVariables: [],
      variableEvents: [],
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

  return {
    ...step,
    variables,
    previousVariables,
    changedVariables,
    variableLifecycle,
    readVariables,
    variableEvents,
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
