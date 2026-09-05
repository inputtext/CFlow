// ============================================================
// C·FLOW VARIABLE LIFECYCLE
//
// Additive execution metadata only. Existing primitive `variables`
// snapshots remain untouched so the current visualizer continues
// to consume the same data shape.
// ============================================================

const RESERVED_WORDS = new Set([
  "if", "else", "for", "while", "do", "return", "switch", "case",
  "break", "continue", "true", "false", "int", "float", "double",
  "char", "bool", "long", "short", "unsigned", "signed", "const",
  "void", "auto", "static", "struct", "class", "string",
]);

function extractIdentifiers(expression) {
  if (!expression) return [];

  return [...String(expression).matchAll(/\b[A-Za-z_]\w*\b/g)]
    .map((match) => match[0])
    .filter((name) => !RESERVED_WORDS.has(name));
}

function getReadVariables(data, previousVariables, variables) {
  const type = data?.type;
  if (!["condition", "output", "return"].includes(type)) return [];

  const source = data.expression ?? data.code ?? "";
  const knownNames = new Set([
    ...Object.keys(previousVariables),
    ...Object.keys(variables),
  ]);

  return [...new Set(extractIdentifiers(source))]
    .filter((name) => knownNames.has(name));
}

function buildVariableLifecycle(previousVariables, variables, data) {
  const previous = previousVariables || {};
  const current = variables || {};
  const allNames = new Set([
    ...Object.keys(previous),
    ...Object.keys(current),
  ]);

  const changedVariables = Object.keys({ ...previous, ...current })
    .filter((name) => !Object.is(previous[name], current[name]));

  const readVariables = getReadVariables(data, previous, current);
  const lifecycle = {};

  for (const name of allNames) {
    const wasPresent = Object.prototype.hasOwnProperty.call(previous, name);
    const isPresent = Object.prototype.hasOwnProperty.call(current, name);
    const changed = changedVariables.includes(name);
    const read = readVariables.includes(name);

    let status = "stable";
    if (!wasPresent && isPresent) status = "declared";
    else if (wasPresent && !isPresent) status = "out_of_scope";
    else if (changed) status = "updated";
    else if (read) status = "read";

    lifecycle[name] = {
      value: isPresent ? current[name] : previous[name],
      previousValue: wasPresent ? previous[name] : undefined,
      status,
      changed,
      read,
    };
  }

  const variableEvents = [
    ...changedVariables.map((name) => ({
      name,
      type: Object.prototype.hasOwnProperty.call(previous, name)
        ? "update"
        : "declare",
      previousValue: previous[name],
      value: current[name],
    })),
    ...readVariables
      .filter((name) => !changedVariables.includes(name))
      .map((name) => ({
        name,
        type: "read",
        value: current[name],
      })),
  ];

  return {
    lifecycle,
    readVariables,
    variableEvents,
  };
}

module.exports = buildVariableLifecycle;
