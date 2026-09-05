// ============================================================
// C·FLOW CONTROL-FLOW EXECUTION STATE
// ============================================================
//
// Converts parser/execution decisions into a small canonical state
// object. The execution builder remains responsible for traversal;
// this module only describes what control-flow decision was made.
// ============================================================

function buildControlFlowState(data) {
  const type = data?.type ?? null;

  if (type === "condition") {
    const isLoop = data.loopIteration != null;
    const result = typeof data.result === "boolean" ? data.result : null;

    return {
      kind: isLoop ? "loop" : "branch",
      node: data.node ?? null,
      expression: data.expression ?? null,
      decision: result,
      branch: result == null ? null : result ? "true" : "false",
      loopIteration: isLoop ? data.loopIteration : null,
    };
  }

  if (type === "else") {
    return {
      kind: "branch",
      node: data.node ?? null,
      expression: null,
      decision: true,
      branch: "else",
      loopIteration: null,
    };
  }

  if (type === "start" || type === "exit") {
    return {
      kind: "program",
      node: data.node ?? type,
      expression: null,
      decision: null,
      branch: type,
      loopIteration: null,
    };
  }

  return {
    kind: "sequence",
    node: data?.node ?? null,
    expression: data?.expression ?? null,
    decision: null,
    branch: null,
    loopIteration: null,
  };
}

module.exports = buildControlFlowState;
