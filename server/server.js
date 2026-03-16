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
const webhookRoutes = require("./routes/webhooks");
const reportRoutes = require("./routes/reports");

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is required. Set it in server/.env or deployment env vars.");
  process.exit(1);
}

// ── Initialise app ─────────────────────────
const app = express();

// ── Middleware ──────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (["POST", "PUT", "PATCH"].includes(req.method) && Object.keys(req.body || {}).length > 0) {
    console.log("Body:", JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

// ════════════════════════════════════════════════════════════════════
// IMPORTANT: Webhook middleware must come BEFORE json parsing
// This preserves raw body for signature verification
// ════════════════════════════════════════════════════════════════════
// Capture raw body for webhook signature verification
app.use((req, res, next) => {
  if (req.path.startsWith("/api/webhooks")) {
    // Store raw body for webhooks
    let rawBody = "";
    req.on("data", (chunk) => {
      rawBody += chunk.toString();
    });
    req.on("end", () => {
      req.rawBody = rawBody;
      next();
    });
  } else {
    next();
  }
});

// Parse JSON for all routes
app.use(express.json({ limit: "10mb" })); // larger limit for face-descriptor payloads

// ── Health check ────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// ── API routes ──────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/reports", reportRoutes);


// ── Global error handler ────────────────────
app.use((err, _req, res, _next) => {
  console.error("\n❌ UNHANDLED ERROR:");
  console.error("Message:", err.message);
  console.error("Code:", err.code);
  console.error("Stack:", err.stack);
  console.error("\n");
  
  const statusCode = err.status || err.statusCode || 500;
  const errorResponse = {
    error: err.message || "Internal Server Error",
    code: err.code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };
  
  res.status(statusCode).json(errorResponse);
});

// ── Start ───────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`⚡ Om Muruga Olympia Fitness server running on port ${PORT}`);
    console.log(`💳 Razorpay integration: ${process.env.RAZORPAY_PAYMENT_MODE || "test"} mode`);
    console.log(`🔗 Webhook endpoint: POST /api/webhooks/payment`);
  });
});

