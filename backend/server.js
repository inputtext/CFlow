const express = require("express");
const cors = require("cors");

const analyzeRoute = require("./routes/analyze");

const app = express();

const PORT = 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "C·FLOW backend is running",
  });
});

// ============================================================
// ANALYZE ROUTE
// ============================================================

app.use("/api/analyze", analyzeRoute);

// ============================================================
// 404
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(
    `C·FLOW backend running on http://localhost:${PORT}`
  );
});
