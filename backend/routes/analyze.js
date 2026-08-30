const express = require("express");

const parser = require("../analyzer/parser");
const buildFlow = require("../analyzer/flowBuilder");
const buildExecution = require("../analyzer/executionBuilder");

const router = express.Router();

// ============================================================
// POST /api/analyze
// ============================================================

router.post("/", (req, res) => {
  try {
    const { language, code } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!language) {
      return res.status(400).json({
        success: false,
        error: "Language is required.",
      });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: "Code is required.",
      });
    }

    const normalizedLanguage =
      language.toLowerCase() === "c++"
        ? "cpp"
        : language.toLowerCase();

    if (!["c", "cpp"].includes(normalizedLanguage)) {
      return res.status(400).json({
        success: false,
        error: "Only C and C++ are supported.",
      });
    }

    // --------------------------------------------------------
    // PARSE
    // --------------------------------------------------------

    const parsedProgram = parser(
      code,
      normalizedLanguage
    );

    // --------------------------------------------------------
    // BUILD FLOWGRAPH
    // --------------------------------------------------------

    const flow = buildFlow(parsedProgram);

    // --------------------------------------------------------
    // BUILD EXECUTION
    // --------------------------------------------------------

    const execution = buildExecution(
      parsedProgram
    );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.json({
      success: true,

      language: normalizedLanguage,

      source: {
        code,
        lines: code.split("\n").length,
      },

      nodes: flow.nodes,
      edges: flow.edges,

      execution,
    });
  } catch (error) {
    console.error(
      "ANALYZE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Failed to analyze code.",
    });
  }
});

module.exports = router;
