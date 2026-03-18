const express = require("express");
const router = express.Router();
const EmailQueueManager = require("../utils/emailQueueManager");

// POST /api/test/send-email - Test email sending
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
    EmailQueueManager.addToQueue({
      toEmail,
      otp,
      action,
      memberName,
    });

    console.log(`[TEST] ✅ Email added to queue`);
    console.log(`[TEST] Queue Status:`, EmailQueueManager.getQueueStatus());
    console.log(`${'='.repeat(70)}\n`);

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

// GET /api/test/queue-status - Check email queue status
router.get("/queue-status", (req, res) => {
  const status = EmailQueueManager.getQueueStatus();
  res.json(status);
});

module.exports = router;
