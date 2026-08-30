// ============================================================
// C·FLOW C / C++ BASIC PARSER
// ============================================================
//
// First-stage parser.
//
// Supports:
// - variable declarations
// - assignments
// - += -= *= /=
// - ++ / --
// - if
// - else
// - for
// - while
// - printf / cout
// - return
//
// IMPORTANT:
// This parser is intentionally small.
// We will later replace/expand it with a proper AST parser.
//
// ============================================================


// ============================================================
// SPLIT CODE INTO STATEMENTS
// ============================================================
//
// Normal semicolons separate statements.
//
// BUT:
//
// for (int i = 0; i < 10; i++)
//
// contains semicolons that must NOT split the statement.
//
// So we keep track of parentheses depth.
//

function splitStatements(code) {
  const statements = [];

  let current = "";
  let lineNumber = 1;

  let statementStartLine = 1;

  let parenthesesDepth = 0;

  let inString = false;
  let stringQuote = null;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    // --------------------------------------------------------
    // TRACK NEW LINES
    // --------------------------------------------------------

    if (char === "\n") {
      current += char;
      lineNumber++;
      continue;
    }

    // --------------------------------------------------------
    // TRACK STRINGS
    // --------------------------------------------------------

    if (
      (char === '"' || char === "'") &&
      code[i - 1] !== "\\"
    ) {
      if (!inString) {
        inString = true;
        stringQuote = char;
      } else if (stringQuote === char) {
        inString = false;
        stringQuote = null;
      }
    }

    // --------------------------------------------------------
    // PARENTHESES
    // --------------------------------------------------------

    if (!inString) {
      if (char === "(") {
        parenthesesDepth++;
      }

      if (char === ")") {
        parenthesesDepth--;
      }
    }

    current += char;

    // --------------------------------------------------------
    // SEMICOLON = END OF STATEMENT
    //
    // Only split when we're NOT inside parentheses.
    // --------------------------------------------------------

    if (
      char === ";" &&
      parenthesesDepth === 0 &&
      !inString
    ) {
      statements.push({
        code: current.trim(),
        line: statementStartLine,
      });

      current = "";
      statementStartLine = lineNumber;
    }

    // --------------------------------------------------------
    // OPEN/CLOSE BRACES
    //
    // We don't split here because constructs such as:
    //
    // if (x > 5) {
    //
    // need to stay together.
    // --------------------------------------------------------
  }

  // ----------------------------------------------------------
  // REMAINING CODE
  // ----------------------------------------------------------

  if (current.trim()) {
    statements.push({
      code: current.trim(),
      line: statementStartLine,
    });
  }

  return statements;
}


// ============================================================
// CLEAN STATEMENT
// ============================================================

function cleanStatement(code) {
  return code
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


// ============================================================
// PARSER
// ============================================================

function parser(code, language) {
  const rawStatements =
    splitStatements(code);

  const statements = [];

  let id = 0;

  for (const raw of rawStatements) {
    const originalCode =
      raw.code;

    const lineNumber =
      raw.line;

    const line =
      cleanStatement(
        originalCode
      );

    // --------------------------------------------------------
    // EMPTY
    // --------------------------------------------------------

    if (!line) {
      continue;
    }

    // --------------------------------------------------------
    // COMMENTS
    // --------------------------------------------------------

    if (
      line.startsWith("//")
    ) {
      continue;
    }

    if (
      line.startsWith("/*") &&
      line.endsWith("*/")
    ) {
      continue;
    }

    // --------------------------------------------------------
    // OPENING / CLOSING BRACES
    // --------------------------------------------------------

    if (
      line === "{" ||
      line === "}"
    ) {
      continue;
    }

    // --------------------------------------------------------
    // FOR LOOP
    // --------------------------------------------------------

    const forMatch =
      line.match(
        /^for\s*\((.*?)\)\s*\{?$/
      );

    if (forMatch) {
      statements.push({
        id: `statement_${id++}`,
        type: "for",
        line: lineNumber,
        code: line,
        expression:
          forMatch[1].trim(),
      });

      continue;
    }

    // --------------------------------------------------------
    // WHILE LOOP
    // --------------------------------------------------------

    const whileMatch =
      line.match(
        /^while\s*\((.*?)\)\s*\{?$/
      );

    if (whileMatch) {
      statements.push({
        id: `statement_${id++}`,
        type: "while",
        line: lineNumber,
        code: line,
        expression:
          whileMatch[1].trim(),
      });

      continue;
    }

    // --------------------------------------------------------
    // IF
    // --------------------------------------------------------

    const ifMatch =
      line.match(
        /^if\s*\((.*?)\)\s*\{?$/
      );

    if (ifMatch) {
      statements.push({
        id: `statement_${id++}`,
        type: "condition",
        line: lineNumber,
        code: line,
        expression:
          ifMatch[1].trim(),
      });

      continue;
    }

    // --------------------------------------------------------
    // ELSE
    // --------------------------------------------------------

    if (
      line === "else" ||
      line === "else {"
    ) {
      statements.push({
        id: `statement_${id++}`,
        type: "else",
        line: lineNumber,
        code: line,
      });

      continue;
    }

    // --------------------------------------------------------
    // VARIABLE DECLARATION
    // --------------------------------------------------------

    const declarationMatch =
      line.match(
        /^(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:long\s+long\s+|long\s+|short\s+)?(?:int|float|double|char|bool|string)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*?))?;?$/
      );

    if (declarationMatch) {
      const variable =
        declarationMatch[1];

      const value =
        declarationMatch[2] !== undefined
          ? declarationMatch[2]
              .replace(/;$/, "")
              .trim()
          : null;

      statements.push({
        id: `statement_${id++}`,
        type: "declaration",
        line: lineNumber,
        code: line,
        variable,
        value,
      });

      continue;
    }

    // --------------------------------------------------------
    // COMPOUND ASSIGNMENT
    // --------------------------------------------------------

    const compoundMatch =
      line.match(
        /^([A-Za-z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+?);?$/
      );

    if (compoundMatch) {
      statements.push({
        id: `statement_${id++}`,
        type: "compound_assignment",
        line: lineNumber,
        code: line,
        variable:
          compoundMatch[1],
        operator:
          compoundMatch[2],
        value:
          compoundMatch[3]
            .replace(/;$/, "")
            .trim(),
      });

      continue;
    }

    // --------------------------------------------------------
    // INCREMENT / DECREMENT
    // --------------------------------------------------------

    const incrementMatch =
      line.match(
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

      statements.push({
        id: `statement_${id++}`,
        type: "increment",
        line: lineNumber,
        code: line,
        variable,
        operator,
      });

      continue;
    }

    // --------------------------------------------------------
    // NORMAL ASSIGNMENT
    // --------------------------------------------------------

    const assignmentMatch =
      line.match(
        /^([A-Za-z_]\w*)\s*=\s*(.+?);?$/
      );

    if (assignmentMatch) {
      statements.push({
        id: `statement_${id++}`,
        type: "assignment",
        line: lineNumber,
        code: line,
        variable:
          assignmentMatch[1],
        value:
          assignmentMatch[2]
            .replace(/;$/, "")
            .trim(),
      });

      continue;
    }

    // --------------------------------------------------------
    // OUTPUT
    // --------------------------------------------------------

    if (
      line.includes("printf") ||
      line.includes("cout") ||
      line.includes("puts") ||
      line.includes("putchar")
    ) {
      statements.push({
        id: `statement_${id++}`,
        type: "output",
        line: lineNumber,
        code: line,
      });

      continue;
    }

    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------

    if (
      line.startsWith("return")
    ) {
      statements.push({
        id: `statement_${id++}`,
        type: "return",
        line: lineNumber,
        code: line,
      });

      continue;
    }

    // --------------------------------------------------------
    // OTHER
    // --------------------------------------------------------

    statements.push({
      id: `statement_${id++}`,
      type: "statement",
      line: lineNumber,
      code: line,
    });
  }

  return {
    language,
    code,
    statements,
  };
}

module.exports = parser;
