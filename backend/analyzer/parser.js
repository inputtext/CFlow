// ============================================================
// C·FLOW C / C++ STRUCTURAL PARSER
// ============================================================

function cleanLine(line) {
  return String(line ?? "")
    .replace(/\/\/.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parser(code, language) {
  const statements = [];
  const lines = String(code ?? "").split(/\r?\n/);
  let nextId = 0;
  let braceDepth = 0;

  const add = (data, depth) => {
    statements.push({
      id: `statement_${nextId++}`,
      depth,
      ...data,
    });
  };

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index];
    const lineNumber = index + 1;
    const line = cleanLine(raw);
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (/^using\s+namespace\s+/.test(line)) continue;

    const leadingClose = (line.match(/^}+\s*/) || [""])[0];
    const leadingCloseCount =
      (leadingClose.match(/}/g) || []).length;

    const statementDepth = Math.max(
      0,
      braceDepth - leadingCloseCount
    );

    const normalized = line
      .replace(/^}+\s*/, "")
      .trim();

    const openCount =
      (line.match(/{/g) || []).length;
    const closeCount =
      (line.match(/}/g) || []).length;

    if (!normalized || normalized === ";") {
      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    const control = normalized
      .replace(/\s*\{\s*$/, "")
      .trim();

    // Function declarations are containers, not executable nodes.
    if (
      /^(?:(?:static|inline)\s+)*(?:(?:unsigned|signed)\s+)?(?:(?:long|short)\s+)*(?:int|void|float|double|char|bool|string)\s+[A-Za-z_]\w*\s*\([^;]*\)$/.test(control)
    ) {
      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // FOR
    // ----------------------------------------------------------
    const forMatch = control.match(/^for\s*\((.*)\)$/);
    if (forMatch) {
      const parts = forMatch[1].split(";");

      add(
        {
          type: "for",
          line: lineNumber,
          code: line,
          expression: forMatch[1].trim(),
          forInit: (parts[0] || "").trim(),
          forCondition: (parts[1] || "").trim(),
          forUpdate: (parts[2] || "").trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // WHILE
    // ----------------------------------------------------------
    const whileMatch = control.match(
      /^while\s*\((.*)\)$/
    );

    if (whileMatch) {
      add(
        {
          type: "while",
          line: lineNumber,
          code: line,
          expression: whileMatch[1].trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // ELSE IF
    // ----------------------------------------------------------
    const elseIfMatch = control.match(
      /^else\s+if\s*\((.*)\)$/
    );

    if (elseIfMatch) {
      add(
        {
          type: "else_if",
          line: lineNumber,
          code: line,
          expression: elseIfMatch[1].trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // IF
    // ----------------------------------------------------------
    const ifMatch = control.match(
      /^if\s*\((.*)\)$/
    );

    if (ifMatch) {
      add(
        {
          type: "condition",
          line: lineNumber,
          code: line,
          expression: ifMatch[1].trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // ELSE
    // ----------------------------------------------------------
    if (
      control === "else" ||
      control === "else;"
    ) {
      add(
        {
          type: "else",
          line: lineNumber,
          code: line,
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // DECLARATION
    // ----------------------------------------------------------
    const declaration = control.match(
      /^(?:const\s+)?(?:(?:unsigned|signed)\s+)?(?:(?:long\s+long|long|short)\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*?))?;?$/
    );

    if (declaration) {
      add(
        {
          type: "declaration",
          line: lineNumber,
          code: line,
          variable: declaration[1],
          value:
            declaration[2] == null
              ? null
              : declaration[2]
                  .replace(/;$/, "")
                  .trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // ----------------------------------------------------------
    const compound = control.match(
      /^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+?);?$/
    );

    if (compound) {
      add(
        {
          type: "compound_assignment",
          line: lineNumber,
          code: line,
          variable: compound[1],
          operator: compound[2],
          value: compound[3]
            .replace(/;$/, "")
            .trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // INCREMENT / DECREMENT
    // ----------------------------------------------------------
    const increment = control.match(
      /^(?:\+\+([A-Za-z_]\w*)|([A-Za-z_]\w*)\+\+|--([A-Za-z_]\w*)|([A-Za-z_]\w*)--);?$/
    );

    if (increment) {
      const variable =
        increment[1] ||
        increment[2] ||
        increment[3] ||
        increment[4];

      const operator =
        increment[1] || increment[2]
          ? "++"
          : "--";

      add(
        {
          type: "increment",
          line: lineNumber,
          code: line,
          variable,
          operator,
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // ASSIGNMENT
    // ----------------------------------------------------------
    const assignment = control.match(
      /^([A-Za-z_]\w*)\s*=\s*(.+?);?$/
    );

    if (assignment) {
      add(
        {
          type: "assignment",
          line: lineNumber,
          code: line,
          variable: assignment[1],
          value: assignment[2]
            .replace(/;$/, "")
            .trim(),
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // OUTPUT
    // ----------------------------------------------------------
    if (
      /\bprintf\s*\(/.test(control) ||
      /\bcout\b/.test(control) ||
      /\bputs\s*\(/.test(control) ||
      /\bputchar\s*\(/.test(control)
    ) {
      add(
        {
          type: "output",
          line: lineNumber,
          code: line,
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // RETURN
    // ----------------------------------------------------------
    if (/^return\b/.test(control)) {
      add(
        {
          type: "return",
          line: lineNumber,
          code: line,
        },
        statementDepth
      );

      braceDepth = Math.max(
        0,
        braceDepth + openCount - closeCount
      );
      continue;
    }

    // ----------------------------------------------------------
    // GENERIC STATEMENT
    // ----------------------------------------------------------
    add(
      {
        type: "statement",
        line: lineNumber,
        code: line,
      },
      statementDepth
    );

    braceDepth = Math.max(
      0,
      braceDepth + openCount - closeCount
    );
  }

  return {
    language,
    code,
    statements,
  };
}

module.exports = parser;
