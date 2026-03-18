const express = require("express");
const router = express.Router();
const EmailQueueManager = require("../utils/emailQueueManager");
const { sendAttendanceOtpEmail, verifyConnection } = require("../utils/emailService");

// GET /api/test/ping - Simple connectivity test
router.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Backend is reachable",
  });
});

// GET /api/test/health - Detailed health check
router.get("/health", async (req, res) => {
  try {
    console.log(`[HEALTH] Health check requested`);
    
    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      backend: "operational",
      services: {
        email: "unknown",
        queue: "unknown",
      },
    };

    // Check email service
    try {
      await verifyConnection();
      healthStatus.services.email = "operational";
    } catch (err) {
      healthStatus.services.email = `failed: ${err.message}`;
      healthStatus.status = "degraded";
    }

    // Check queue
    const queueStatus = EmailQueueManager.getQueueStatus();
    healthStatus.services.queue = `operational (${queueStatus.queueSize} in queue)`;

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// POST /api/test/send-email - Test email sending via queue
router.post("/send-email", async (req, res) => {
  try {
    const { toEmail, otp = "123456", action = "entry", memberName = "Test User" } = req.body;

    if (!toEmail) {
      return res.status(400).json({ error: "Email address required" });
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[TEST] 📧 TEST EMAIL ENDPOINT TRIGGERED`);
    console.log(`${'='.repeat(70)}`);
    console.log(`[TEST] To: ${toEmail}`);
    console.log(`[TEST] OTP: ${otp}`);
    console.log(`[TEST] Action: ${action}`);
    console.log(`[TEST] Member: ${memberName}`);

    // Add to queue
    const added = EmailQueueManager.addToQueue({
      toEmail,
      otp,
      action,
      memberName,
    });

    if (!added) {
      return res.status(500).json({
        error: "Queue is full. Try again later.",
        queueStatus: EmailQueueManager.getQueueStatus(),
      });
    }

    console.log(`[TEST] ✅ Email added to queue`);
    console.log(`[TEST] Queue Status:`, EmailQueueManager.getQueueStatus());
    console.log(`${'='.repeat(70)}\n`);

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      message: "Email queued for sending",
      queueStatus: EmailQueueManager.getQueueStatus(),
    });
  } catch (error) {
    console.error(`[TEST] ❌ Error:`, error);
    res.status(500).json({
      error: error.message,
      queueStatus: EmailQueueManager.getQueueStatus(),
    });
  }
});

// POST /api/test/send-email-direct - Test email sending directly (no queue)
router.post("/send-email-direct", async (req, res) => {
  try {
    const { toEmail, otp = "123456", action = "entry", memberName = "Test User" } = req.body;

    if (!toEmail) {
      return res.status(400).json({ error: "Email address required" });
    }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[TEST] 📧 DIRECT EMAIL TEST TRIGGERED`);
    console.log(`${'='.repeat(70)}`);

    const result = await sendAttendanceOtpEmail({
      toEmail,
      otp,
      action,
      memberName,
      userId: "test-user",
      expiresInMinutes: 5,
    });

    console.log(`[TEST] ✅ Email sent successfully`);
    console.log(`${'='.repeat(70)}\n`);

    res.json({
      success: true,
      message: "Email sent successfully",
      result,
    });
  } catch (error) {
    console.error(`[TEST] ❌ Error:`, error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    });
  }
});

// GET /api/test/queue-status - Check email queue status
router.get("/queue-status", (req, res) => {
  const status = EmailQueueManager.getQueueStatus();
  res.json(status);
});

// GET /api/test/verify-email - Verify SMTP connection
router.get("/verify-email", async (req, res) => {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[TEST] 🔍 VERIFYING SMTP CONNECTION`);
    console.log(`${'='.repeat(70)}`);

    const result = await verifyConnection();

    console.log(`[TEST] ✅ SMTP connection verified`);
    console.log(`${'='.repeat(70)}\n`);

    res.json({
      success: true,
      message: "SMTP connection verified",
      smtpConfig: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || "587",
        secure: process.env.SMTP_SECURE || "false",
        email: process.env.SMTP_EMAIL ? "***configured***" : "NOT CONFIGURED",
        password: process.env.SMTP_PASSWORD ? "***configured***" : "NOT CONFIGURED",
      },
    });
  } catch (error) {
    console.error(`[TEST] ❌ SMTP verification failed:`, error);
    console.log(`${'='.repeat(70)}\n`);

    res.status(500).json({
      success: false,
      error: error.message,
      smtpConfig: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || "587",
        secure: process.env.SMTP_SECURE || "false",
        email: process.env.SMTP_EMAIL ? "***configured***" : "NOT CONFIGURED",
        password: process.env.SMTP_PASSWORD ? "***configured***" : "NOT CONFIGURED",
      },
    });
  }
});

// GET /api/test/config - Check if SMTP credentials are configured
router.get("/config", (req, res) => {
  const smtpEmail = process.env.SMTP_EMAIL || "";
  const smtpPassword = process.env.SMTP_PASSWORD || "";
  
  res.json({
    environment: process.env.NODE_ENV || "development",
    smtp: {
      configured: !!(smtpEmail && smtpPassword),
      email: smtpEmail ? "✅ SET" : "❌ MISSING",
      password: smtpPassword ? "✅ SET" : "❌ MISSING",
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || "587",
    },
    warnings: [
      !smtpEmail && "⚠️ SMTP_EMAIL is not set",
      !smtpPassword && "⚠️ SMTP_PASSWORD is not set - THIS IS WHY EMAILS AREN'T SENDING",
    ].filter(Boolean),
  });
});

module.exports = router;
