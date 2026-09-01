// ============================================================
// C·FLOW C / C++ STRUCTURAL PARSER
// ============================================================
//
// This parser is intentionally structural rather than a full C/C++
// compiler. It preserves the statement model used by the flow and
// execution builders while being much more tolerant of real-world
// formatting: multiline conditions, braces on separate lines,
// function signatures, comments, and nested blocks.
// ============================================================

function stripComments(source) {
  const text = String(source ?? "");
  let result = "";
  let inBlockComment = false;
  let quote = null;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        result += "  ";
        i += 1;
      } else {
        result += ch === "\n" ? "\n" : " ";
      }
      continue;
    }

    if (quote) {
      result += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if ((ch === '"' || ch === "'") && !inBlockComment) {
      quote = ch;
      result += ch;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      result += "  ";
      i += 1;
      continue;
    }

    if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      if (i < text.length) result += "\n";
      continue;
    }

    result += ch;
  }

  return result;
}

function cleanLine(line) {
  return String(line ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function parenDelta(text) {
  let delta = 0;
  let quote = null;
  let escaped = false;

  for (const ch of String(text ?? "")) {
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (ch === "(") delta += 1;
    if (ch === ")") delta -= 1;
  }

  return delta;
}

function braceDelta(text) {
  let delta = 0;
  let quote = null;
  let escaped = false;

  for (const ch of String(text ?? "")) {
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (ch === "{") delta += 1;
    if (ch === "}") delta -= 1;
  }

  return delta;
}

function isControlHeader(text) {
  const value = cleanLine(text).replace(/\s*\{\s*$/, "");
  return /^(?:for|while|if|else\s+if)\s*\(/.test(value) || /^else$/.test(value);
}

function isFunctionHeader(text) {
  const value = cleanLine(text).replace(/\s*\{\s*$/, "");
  if (!value || isControlHeader(value)) return false;
  if (!value.includes("(") || !value.includes(")")) return false;
  if (/[;]$/.test(value)) return false;

  return /^(?:(?:template\s*<.*?>)\s*)?(?:(?:static|inline|extern|constexpr|virtual|friend|unsigned|signed|long|short|const|volatile)\s+)*(?:[A-Za-z_][\w:<>~]*(?:\s*[*&])?\s+)+[A-Za-z_]\w*\s*\([^;]*\)$/.test(value);
}

function emitStatement(statements, data, depth, line) {
  const value = cleanLine(data);
  if (!value) return;

  statements.push({
    id: `statement_${statements.length}`,
    depth: Math.max(0, depth),
    line,
    code: value,
  });
}

function collectLogicalStatements(code) {
  const source = stripComments(code);
  const lines = source.split(/\r?\n/);
  const records = [];

  let braceDepth = 0;
  let parenDepth = 0;
  let buffer = "";
  let startLine = 1;

  const resetBuffer = () => {
    buffer = "";
    parenDepth = 0;
  };

  const pushBuffer = () => {
    const value = cleanLine(buffer);
    if (!value) {
      resetBuffer();
      return;
    }

    records.push({
      text: value,
      depth: Math.max(0, braceDepth),
      line: startLine,
    });
    resetBuffer();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const lineNumber = index + 1;
    let line = raw.trim();
    if (!line) continue;

    // A closing brace belongs to the block above the following statement.
    // This makes `} else {` land at the same lexical depth as its IF.
    while (line.startsWith("}")) {
      braceDepth = Math.max(0, braceDepth - 1);
      line = line.slice(1).trim();
    }

    if (!line) continue;

    if (!buffer) startLine = lineNumber;
    buffer = buffer ? `${buffer} ${line}` : line;
    parenDepth += parenDelta(line);

    const balanced = parenDepth <= 0;
    const value = cleanLine(buffer);
    const endsWithOpenBrace = /\{\s*$/.test(value);
    const endsWithSemicolon = /;\s*$/.test(value);
    const control = isControlHeader(value);
    const functionHeader = isFunctionHeader(value);

    if (balanced && endsWithOpenBrace) {
      if (control) {
        pushBuffer();
      } else if (functionHeader) {
        resetBuffer();
      } else {
        // Keep compound initializers / unusual statements intact, but do not
        // accidentally turn an opening brace into an execution node.
        pushBuffer();
      }

      braceDepth += 1;
      continue;
    }

    if (balanced && endsWithSemicolon) {
      pushBuffer();
      continue;
    }

    // C/C++ permits control statements without braces:
    //   if (ready)\n    //     work();
    // Emit the control header at the newline, but keep ordinary expressions
    // buffered until their semicolon.
    if (balanced && control && !endsWithSemicolon) {
      pushBuffer();
      continue;
    }

    // A standalone closing brace can terminate a statement that omitted its
    // semicolon (for example a return immediately before `}`).
    if (balanced && line.endsWith("}")) {
      pushBuffer();
    }
  }

  if (cleanLine(buffer)) pushBuffer();
  return records;
}

function parser(code, language) {
  const statements = [];
  const logical = collectLogicalStatements(code);

  const add = (data, depth, line) => {
    statements.push({
      id: `statement_${statements.length}`,
      depth: Math.max(0, depth),
      line,
      ...data,
    });
  };

  for (const record of logical) {
    const line = cleanLine(record.text);
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (/^using\s+namespace\s+/.test(line)) continue;

    const control = line.replace(/\s*\{\s*$/, "").trim();

    // ----------------------------------------------------------
    // FUNCTION DECLARATIONS / DEFINITIONS
    // ----------------------------------------------------------
    if (isFunctionHeader(control)) continue;

    // ----------------------------------------------------------
    // FOR
    // ----------------------------------------------------------
    const forMatch = control.match(/^for\s*\((.*)\)$/);
    if (forMatch) {
      const parts = forMatch[1].split(";");
      add(
        {
          type: "for",
          code: line,
          expression: forMatch[1].trim(),
          forInit: (parts[0] || "").trim(),
          forCondition: (parts[1] || "").trim(),
          forUpdate: (parts[2] || "").trim(),
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // WHILE
    // ----------------------------------------------------------
    const whileMatch = control.match(/^while\s*\((.*)\)$/);
    if (whileMatch) {
      add(
        {
          type: "while",
          code: line,
          expression: whileMatch[1].trim(),
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // ELSE IF
    // ----------------------------------------------------------
    const elseIfMatch = control.match(/^else\s+if\s*\((.*)\)$/);
    if (elseIfMatch) {
      add(
        {
          type: "else_if",
          code: line,
          expression: elseIfMatch[1].trim(),
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // IF
    // ----------------------------------------------------------
    const ifMatch = control.match(/^if\s*\((.*)\)$/);
    if (ifMatch) {
      add(
        {
          type: "condition",
          code: line,
          expression: ifMatch[1].trim(),
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // ELSE
    // ----------------------------------------------------------
    if (control === "else" || control === "else;") {
      add(
        {
          type: "else",
          code: line,
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // DECLARATION
    // ----------------------------------------------------------
    const declaration = control.match(
      /^(?:const\s+)?(?:(?:unsigned|signed)\s+)?(?:(?:long\s+long|long|short)\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)(?:\s*\[[^\]]*\])?\s*(?:=\s*(.*?))?;?$/
    );

    if (declaration) {
      add(
        {
          type: "declaration",
          code: line,
          variable: declaration[1],
          value:
            declaration[2] == null
              ? null
              : declaration[2].replace(/;$/, "").trim(),
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // ----------------------------------------------------------
    const compound = control.match(
      /^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=|%=)\s*(.+?);?$/
    );

    if (compound) {
      add(
        {
          type: "compound_assignment",
          code: line,
          variable: compound[1],
          operator: compound[2],
          value: compound[3].replace(/;$/, "").trim(),
        },
        record.depth,
        record.line
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
        increment[1] || increment[2] || increment[3] || increment[4];
      const operator = increment[1] || increment[2] ? "++" : "--";

      add(
        {
          type: "increment",
          code: line,
          variable,
          operator,
        },
        record.depth,
        record.line
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
          code: line,
          variable: assignment[1],
          value: assignment[2].replace(/;$/, "").trim(),
        },
        record.depth,
        record.line
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
          code: line,
        },
        record.depth,
        record.line
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
          code: line,
        },
        record.depth,
        record.line
      );
      continue;
    }

    // ----------------------------------------------------------
    // GENERIC STATEMENT
    // ----------------------------------------------------------
    add(
      {
        type: "statement",
        code: line,
      },
      record.depth,
      record.line
    );
  }

  return {
    language,
    code,
    statements,
  };
}

module.exports = parser;
