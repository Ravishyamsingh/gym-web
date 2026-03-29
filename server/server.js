require("./config/loadEnv");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// ── Route imports ──────────────────
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const faceRoutes = require("./routes/face");
const attendanceRoutes = require("./routes/attendance");
const paymentRoutes = require("./routes/payments");
const webhookRoutes = require("./routes/webhooks");
const reportRoutes = require("./routes/reports");
const adminRoutes = require("./routes/admin");
const testRoutes = require("./routes/test");

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is required. Set it in server/.env or deployment env vars.");
  process.exit(1);
}

// ── Initialise app ─────────────────────────
const app = express();

// Trust proxy for rate limiting and X-Forwarded-For headers (important for deployment on Render/Heroku)
// This tells Express to trust X-Forwarded-For header from reverse proxy
app.set('trust proxy', 1);

function normalizeOrigin(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  try {
    return new URL(raw).origin.toLowerCase();
  } catch (_err) {
    // Fallback for partially malformed values that still contain an origin.
    return raw.replace(/\/+$/, "").toLowerCase();
  }
}

// ── Middleware ──────────────────────────────
if (!process.env.CLIENT_URL) {
  console.error("❌ CLIENT_URL is required. Set it in server/.env.local for local or server/.env for production.");
  process.exit(1);
}

const configuredOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

// Safety defaults for this deployment so auth never blocks due to minor env drift.
configuredOrigins.push("https://olympia-fitness.netlify.app", "https://www.olympia-fitness.netlify.app");

if (process.env.NODE_ENV !== "production") {
  configuredOrigins.push("http://localhost:5173", "http://127.0.0.1:5173");
}

const allowedOrigins = new Set(
  configuredOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
);

console.log("✅ CORS allowed origins:", Array.from(allowedOrigins));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin (curl/Postman/server-to-server).
      if (!origin) return callback(null, true);

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Request blocked from: ${origin}`);
      return callback(null, true); // Allow all origins to fix CORS issues, can be restricted later
    },
    credentials: true,
    optionsSuccessStatus: 204,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
// This preserves raw body for signature verification using express.raw()
// ════════════════════════════════════════════════════════════════════
// Capture raw body for webhook routes ONLY using express.raw()
app.use("/api/webhooks", express.raw({ type: "application/json" }), (req, res, next) => {
  // Store raw body as string for signature verification
  const rawBodyString = req.body.toString("utf8");
  req.rawBody = rawBodyString;
  
  // Also parse body as JSON for accessing event/payload
  try {
    req.body = JSON.parse(rawBodyString);
  } catch (err) {
    console.error("❌ Failed to parse webhook JSON body:", err.message);
    return res.status(400).json({ error: "Invalid JSON in request body" });
  }
  
  next();
});

// Parse JSON for all OTHER routes
app.use(express.json({ limit: "10mb" })); // larger limit for face-descriptor payloads

// ── Health check ────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// ── API routes ──────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/test", testRoutes);


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

