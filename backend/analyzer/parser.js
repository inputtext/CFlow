// ============================================================
// C·FLOW C / C++ PARSER
// ============================================================
// Lightweight structural parser for the visualizer.
// It intentionally is NOT a C/C++ compiler. Its job is to keep
// executable statements, control blocks, and source structure
// consistent for FlowGraph + executionBuilder.
// ============================================================

function cleanLine(line) {
  return String(line ?? "")
    .replace(/\/\/.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countChar(text, char) {
  return [...text].filter((value) => value === char).length;
}

function parser(code, language) {
  const statements = [];
  const lines = String(code ?? "").split(/\r?\n/);
  let id = 0;
  let braceDepth = 0;

  const add = (statement) => {
    statements.push({
      id: `statement_${id++}`,
      depth: braceDepth,
      ...statement,
    });
  };

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    const line = cleanLine(rawLine);

    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (/^using\s+namespace\s+/.test(line)) continue;

    // Closing braces belong to the block above the current line.
    const leadingClosers = line.match(/^}+/?/);
    if (leadingClosers) {
      braceDepth = Math.max(
        0,
        braceDepth - leadingClosers[0].replace(/[^}]/g, "").length
      );
    }

    const normalized = line
      .replace(/^}+/, "")
      .replace(/^\{+/, "")
      .trim();

    if (!normalized) {
      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    const controlLine = normalized
      .replace(/\s*\{\s*$/, "")
      .trim();

    // Function declaration: do not turn main() into a flow node.
    const functionMatch = controlLine.match(
      /^(?:static\s+)?(?:inline\s+)?(?:unsigned\s+|signed\s+)?(?:long\s+long\s+|long\s+|short\s+)?(?:int|void|float|double|char|bool|string)\s+[A-Za-z_]\w*\s*\([^;]*\)$/
    );

    if (functionMatch) {
      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // FOR
    // ----------------------------------------------------------
    const forMatch = controlLine.match(/^for\s*\((.*)\)$/);
    if (forMatch) {
      const parts = forMatch[1].split(";");
      add({
        type: "for",
        line: lineNumber,
        code: line,
        expression: forMatch[1].trim(),
        forInit: (parts[0] ?? "").trim(),
        forCondition: (parts[1] ?? "").trim(),
        forUpdate: (parts[2] ?? "").trim(),
        opensBlock: line.includes("{"),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // WHILE
    // ----------------------------------------------------------
    const whileMatch = controlLine.match(/^while\s*\((.*)\)$/);
    if (whileMatch) {
      add({
        type: "while",
        line: lineNumber,
        code: line,
        expression: whileMatch[1].trim(),
        opensBlock: line.includes("{"),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // ELSE IF BEFORE IF
    // ----------------------------------------------------------
    const elseIfMatch = controlLine.match(/^else\s+if\s*\((.*)\)$/);
    if (elseIfMatch) {
      add({
        type: "else_if",
        line: lineNumber,
        code: line,
        expression: elseIfMatch[1].trim(),
        opensBlock: line.includes("{"),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // IF
    // ----------------------------------------------------------
    const ifMatch = controlLine.match(/^if\s*\((.*)\)$/);
    if (ifMatch) {
      add({
        type: "condition",
        line: lineNumber,
        code: line,
        expression: ifMatch[1].trim(),
        opensBlock: line.includes("{"),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // ELSE
    // ----------------------------------------------------------
    if (controlLine === "else" || controlLine === "else;") {
      add({
        type: "else",
        line: lineNumber,
        code: line,
        opensBlock: line.includes("{"),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // DECLARATION
    // ----------------------------------------------------------
    const declarationMatch = controlLine.match(
      /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:long\s+long\s+|long\s+|short\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*?))?;?$/
    );

    if (declarationMatch) {
      let value = declarationMatch[2];
      if (value !== undefined) value = value.replace(/;$/, "").trim();

      add({
        type: "declaration",
        line: lineNumber,
        code: line,
        variable: declarationMatch[1],
        value: value ?? null,
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // ----------------------------------------------------------
    const compoundMatch = controlLine.match(
      /^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+?);?$/
    );

    if (compoundMatch) {
      add({
        type: "compound_assignment",
        line: lineNumber,
        code: line,
        variable: compoundMatch[1],
        operator: compoundMatch[2],
        value: compoundMatch[3].replace(/;$/, "").trim(),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // INCREMENT / DECREMENT
    // ----------------------------------------------------------
    const incrementMatch = controlLine.match(
      /^(?:\+\+([A-Za-z_]\w*)|([A-Za-z_]\w*)\+\+|--([A-Za-z_]\w*)|([A-Za-z_]\w*)--);?$/
    );

    if (incrementMatch) {
      const variable =
        incrementMatch[1] || incrementMatch[2] || incrementMatch[3] || incrementMatch[4];
      const operator = incrementMatch[1] || incrementMatch[2] ? "++" : "--";

      add({
        type: "increment",
        line: lineNumber,
        code: line,
        variable,
        operator,
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // ASSIGNMENT
    // ----------------------------------------------------------
    const assignmentMatch = controlLine.match(
      /^([A-Za-z_]\w*)\s*=\s*(.+?);?$/
    );

    if (assignmentMatch) {
      add({
        type: "assignment",
        line: lineNumber,
        code: line,
        variable: assignmentMatch[1],
        value: assignmentMatch[2].replace(/;$/, "").trim(),
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // OUTPUT
    // ----------------------------------------------------------
    if (
      /\bprintf\s*\(/.test(controlLine) ||
      /\bcout\b/.test(controlLine) ||
      /\bputs\s*\(/.test(controlLine) ||
      /\bputchar\s*\(/.test(controlLine)
    ) {
      add({
        type: "output",
        line: lineNumber,
        code: line,
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // RETURN
    // ----------------------------------------------------------
    if (/^return\b/.test(controlLine)) {
      add({
        type: "return",
        line: lineNumber,
        code: line,
      });

      braceDepth += countChar(line, "{");
      braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
      continue;
    }

    // ----------------------------------------------------------
    // GENERIC STATEMENT
    // ----------------------------------------------------------
    add({
      type: "statement",
      line: lineNumber,
      code: line,
    });

    braceDepth += countChar(line, "{");
    braceDepth = Math.max(0, braceDepth - countChar(line, "}") + (leadingClosers ? leadingClosers[0].replace(/[^}]/g, "").length : 0));
  }

  return {
    language,
    code,
    statements,
  };
}

module.exports = parser;
