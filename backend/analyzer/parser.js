// ============================================================
// C·FLOW C / C++ PARSER
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

  let id = 0;

  const add = (statement) => {
    statements.push({
      id: `statement_${id++}`,
      ...statement,
    });
  };

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = cleanLine(rawLine);

    if (!line) return;

    // Ignore preprocessor directives.
    if (line.startsWith("#")) return;

    // Ignore standalone braces.
    if (
      line === "{" ||
      line === "}" ||
      line === "};"
    ) {
      return;
    }

    // ----------------------------------------------------------
    // FUNCTION DECLARATION
    // ----------------------------------------------------------

    const functionMatch = line.match(
      /^(?:static\s+)?(?:inline\s+)?(?:int|void|float|double|char|bool|long|short|string)\s+[A-Za-z_]\w*\s*\([^;]*\)\s*\{?$/
    );

    if (functionMatch) {
      return;
    }

    // using namespace std;
    if (/^using\s+namespace\s+/.test(line)) {
      return;
    }

    // Remove opening brace for control statements.
    const controlLine = line
      .replace(/\s*\{\s*$/, "")
      .trim();

    // ----------------------------------------------------------
    // FOR LOOP
    // ----------------------------------------------------------

    const forMatch = controlLine.match(
      /^for\s*\((.*)\)$/
    );

    if (forMatch) {
      const expression = forMatch[1].trim();

      add({
        type: "for",
        line: lineNumber,
        code: line,
        expression,
      });

      return;
    }

    // ----------------------------------------------------------
    // WHILE LOOP
    // ----------------------------------------------------------

    const whileMatch = controlLine.match(
      /^while\s*\((.*)\)$/
    );

    if (whileMatch) {
      add({
        type: "while",
        line: lineNumber,
        code: line,
        expression: whileMatch[1].trim(),
      });

      return;
    }

    // ----------------------------------------------------------
    // IF
    // ----------------------------------------------------------

    const ifMatch = controlLine.match(
      /^if\s*\((.*)\)$/
    );

    if (ifMatch) {
      add({
        type: "condition",
        line: lineNumber,
        code: line,
        expression: ifMatch[1].trim(),
      });

      return;
    }

    // ----------------------------------------------------------
    // ELSE IF
    // ----------------------------------------------------------

    const elseIfMatch = controlLine.match(
      /^else\s+if\s*\((.*)\)$/
    );

    if (elseIfMatch) {
      add({
        type: "else_if",
        line: lineNumber,
        code: line,
        expression: elseIfMatch[1].trim(),
      });

      return;
    }

    // ----------------------------------------------------------
    // ELSE
    // ----------------------------------------------------------

    if (
      controlLine === "else" ||
      controlLine === "else;"
    ) {
      add({
        type: "else",
        line: lineNumber,
        code: line,
      });

      return;
    }

    // ----------------------------------------------------------
    // VARIABLE DECLARATION
    // ----------------------------------------------------------

    const declarationMatch = line.match(
      /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:long\s+long\s+|long\s+|short\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*?))?;?$/
    );

    if (declarationMatch) {
      const variable =
        declarationMatch[1];

      let value =
        declarationMatch[2];

      if (value !== undefined) {
        value = value
          .replace(/;$/, "")
          .trim();
      } else {
        value = null;
      }

      add({
        type: "declaration",
        line: lineNumber,
        code: line,
        variable,
        value,
      });

      return;
    }

    // ----------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // ----------------------------------------------------------

    const compoundMatch = line.match(
      /^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+?);?$/
    );

    if (compoundMatch) {
      add({
        type: "compound_assignment",
        line: lineNumber,
        code: line,
        variable: compoundMatch[1],
        operator: compoundMatch[2],
        value: compoundMatch[3]
          .replace(/;$/, "")
          .trim(),
      });

      return;
    }

    // ----------------------------------------------------------
    // INCREMENT / DECREMENT
    // ----------------------------------------------------------

    const incrementMatch = line.match(
      /^(?:\+\+([A-Za-z_]\w*)|([A-Za-z_]\w*)\+\+|--([A-Za-z_]\w*)|([A-Za-z_]\w*)--);?$/
    );

    if (incrementMatch) {
      const variable =
        incrementMatch[1] ||
        incrementMatch[2] ||
        incrementMatch[3] ||
        incrementMatch[4];

      const operator =
        incrementMatch[1] ||
        incrementMatch[2]
          ? "++"
          : "--";

      add({
        type: "increment",
        line: lineNumber,
        code: line,
        variable,
        operator,
      });

      return;
    }

    // ----------------------------------------------------------
    // ASSIGNMENT
    // ----------------------------------------------------------

    const assignmentMatch = line.match(
      /^([A-Za-z_]\w*)\s*=\s*(.+?);?$/
    );

    if (assignmentMatch) {
      add({
        type: "assignment",
        line: lineNumber,
        code: line,
        variable: assignmentMatch[1],
        value: assignmentMatch[2]
          .replace(/;$/, "")
          .trim(),
      });

      return;
    }

    // ----------------------------------------------------------
    // OUTPUT
    // ----------------------------------------------------------

    if (
      /\bprintf\s*\(/.test(line) ||
      /\bcout\b/.test(line) ||
      /\bputs\s*\(/.test(line) ||
      /\bputchar\s*\(/.test(line)
    ) {
      add({
        type: "output",
        line: lineNumber,
        code: line,
      });

      return;
    }

    // ----------------------------------------------------------
    // RETURN
    // ----------------------------------------------------------

    if (/^return\b/.test(line)) {
      add({
        type: "return",
        line: lineNumber,
        code: line,
      });

      return;
    }

    // ----------------------------------------------------------
    // GENERIC EXECUTABLE STATEMENT
    // ----------------------------------------------------------

    add({
      type: "statement",
      line: lineNumber,
      code: line,
    });
  });

  return {
    language,
    code,
    statements,
  };
}

module.exports = parser;
