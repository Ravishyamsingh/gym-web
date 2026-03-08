const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ── Route imports ──────────────────
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const attendanceRoutes = require("./routes/attendance");
const paymentRoutes = require("./routes/payments");
const reportRoutes = require("./routes/reports");

// ── Initialise app ─────────────────────────
const app = express();

// ── Middleware ──────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" })); // larger limit for face-descriptor payloads

// ── Health check ────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// ── API routes ──────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);

// ── Global error handler ────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// ── Start ───────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`⚡ GymWeb server running on port ${PORT}`);
  });
});
