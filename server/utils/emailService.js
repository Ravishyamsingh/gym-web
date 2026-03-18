const nodemailer = require("nodemailer");
const EmailQueueManager = require("./emailQueueManager");

/**
 * Email Service using Nodemailer with SMTP
 * Replaces Resend email service
 */

// Get SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_EMAIL = process.env.SMTP_EMAIL || "";
// Trim spaces from password (Gmail app passwords shouldn't have spaces)
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || "").replace(/\s/g, "");

// Create transporter instance
let transporter = null;
let lastTransporterReset = null;
const TRANSPORTER_RESET_INTERVAL = 60 * 60 * 1000; // Reset transporter every hour

function initializeTransporter(forceReset = false) {
  const now = Date.now();
  
  // Reset transporter every hour or if forced
  if (forceReset || !transporter || (lastTransporterReset && now - lastTransporterReset > TRANSPORTER_RESET_INTERVAL)) {
    if (transporter) {
      console.log(`[EMAIL] Closing existing transporter connection`);
      transporter.close();
    }
    transporter = null;
  }

  if (transporter) return transporter;

  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    throw new Error(
      "SMTP credentials not configured. Set SMTP_EMAIL and SMTP_PASSWORD in .env"
    );
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD,
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
    greetingTimeout: 10000,
    pool: {
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 4000,
      rateLimit: 14,
      idleTimeout: 30000,
    },
  });

  lastTransporterReset = now;
  console.log(`[EMAIL] Nodemailer transporter initialized`);
  console.log(`[EMAIL] SMTP Host: ${SMTP_HOST}:${SMTP_PORT} (secure: ${SMTP_SECURE})`);
  console.log(`[EMAIL] From Email: ${SMTP_EMAIL}`);

  return transporter;
}

/**
 * Send OTP email for gym attendance verification with retry logic
 * @param {Object} params - Email parameters
 * @param {string} params.toEmail - Recipient email address
 * @param {string} params.otp - 6-digit OTP code
 * @param {string} params.action - "entry" or "exit"
 * @param {string} params.memberName - Member's name
 * @param {string} params.userId - User ID for logging
 * @param {number} params.expiresInMinutes - OTP expiration time in minutes
 * @returns {Promise<Object>} Email send result
 */
async function sendAttendanceOtpEmail({
  toEmail,
  otp,
  action,
  memberName,
  userId,
  expiresInMinutes = 5,
}) {
  // Validate inputs
  if (!toEmail || !otp || !action) {
    const err = new Error("Missing required parameters: toEmail, otp, action");
    err.statusCode = 400;
    throw err;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    const err = new Error(`Invalid email address: ${toEmail}`);
    err.statusCode = 400;
    throw err;
  }

  if (!/^\d{6}$/.test(String(otp))) {
    const err = new Error(`Invalid OTP format: ${otp}`);
    err.statusCode = 400;
    throw err;
  }

  const maxRetries = 2;
  const MAX_TOTAL_TIME = 25000; // 25 second hard timeout
  let lastError = null;
  const startTime = Date.now();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[EMAIL] 📧 OTP EMAIL REQUEST STARTED`);
  console.log(`${'='.repeat(70)}`);
  console.log(`[EMAIL] Timestamp: ${new Date().toISOString()}`);
  console.log(`[EMAIL] To Email: ${toEmail}`);
  console.log(`[EMAIL] OTP: ${otp}`);
  console.log(`[EMAIL] Action: ${action}`);
  console.log(`[EMAIL] User ID: ${userId || "N/A"}`);
  console.log(`[EMAIL] Member Name: ${memberName || "N/A"}`);
  console.log(`[EMAIL] Expires In: ${expiresInMinutes} minutes`);
  console.log(`${'='.repeat(70)}\n`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Check if we've exceeded total time budget
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_TOTAL_TIME) {
      console.error(`[EMAIL] Hard timeout reached (${elapsedTime}ms). Aborting email send.`);
      break;
    }

    try {
      const trans = initializeTransporter();

      const actionLabel = action === "exit" ? "Exit" : "Entry";
      const safeMemberName = memberName || "Member";

      const subject = `${actionLabel} OTP - Gym Attendance Verification`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #111827;">Gym Attendance OTP Verification</h2>
          <p>Hello ${safeMemberName},</p>
          <p>Your OTP for <strong>${actionLabel}</strong> verification is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #16a34a; margin: 16px 0;">${otp}</div>
          <p>This OTP expires in ${expiresInMinutes} minutes and can be used only once.</p>
          <p>If you did not request this, please contact the gym desk immediately.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #6b7280; font-size: 12px;">
            Olympia Fitness | Secure Email Verification
          </p>
        </div>
      `;

      const plainText = `
Gym Attendance OTP Verification

Hello ${safeMemberName},

Your OTP for ${actionLabel} verification is: ${otp}

This OTP expires in ${expiresInMinutes} minutes and can be used only once.

If you did not request this, please contact the gym desk immediately.
      `.trim();

      console.log(`[EMAIL] Attempt ${attempt}/${maxRetries}: Sending ${actionLabel} OTP email to ${toEmail}`);
      console.log(`[EMAIL] SMTP Config: ${SMTP_EMAIL} via ${SMTP_HOST}:${SMTP_PORT} (TLS: ${SMTP_SECURE})`);

      const info = await trans.sendMail({
        from: SMTP_EMAIL,
        to: toEmail,
        subject,
        text: plainText,
        html,
        replyTo: SMTP_EMAIL,
      });

      const totalTime = Date.now() - startTime;
      console.log(`[EMAIL] ✅ Email sent successfully on attempt ${attempt} (${totalTime}ms)`);
      console.log(`[EMAIL] Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        attempt,
        totalTime,
      };
    } catch (error) {
      lastError = error;
      const elapsedTime = Date.now() - startTime;
      console.error(`\n${'='.repeat(60)}`);
      console.error(`[EMAIL] ❌ ATTEMPT ${attempt} FAILED`);
      console.error(`${'='.repeat(60)}`);
      console.error(`[EMAIL] Time Elapsed: ${elapsedTime}ms`);
      console.error(`[EMAIL] Error Message: ${error.message}`);
      console.error(`[EMAIL] Error Code: ${error.code}`);
      console.error(`[EMAIL] Error Type: ${error.name}`);
      if (error.command) console.error(`[EMAIL] SMTP Command: ${error.command}`);
      if (error.response) console.error(`[EMAIL] SMTP Response: ${error.response}`);
      console.error(`${'='.repeat(60)}\n`);
      console.error(`[EMAIL] Error Code: ${error.code}`);

      // If it's a connection error, reset transporter for next attempt
      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "EHOSTUNREACH" ||
        error.message.includes("Connection timeout") ||
        error.message.includes("SMTP")
      ) {
        console.log(`[EMAIL] Connection error detected. Resetting transporter for retry...`);
        initializeTransporter(true);

        // Wait before retrying (exponential backoff but capped)
        if (attempt < maxRetries) {
          const remainingTime = MAX_TOTAL_TIME - elapsedTime;
          const delayMs = Math.min(Math.pow(2, attempt - 1) * 500, remainingTime / 2); // 500ms, 1s, capped
          if (delayMs > 0) {
            console.log(`[EMAIL] Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      } else {
        // Non-retryable error
        console.log(`[EMAIL] Non-retryable error. Stopping retries.`);
        break;
      }
    }
  }

  // All retries failed
  console.error(`[EMAIL] All ${maxRetries} attempts failed after ${Date.now() - startTime}ms`);
  console.error(`[EMAIL] Final Error:`, lastError);

  const err = new Error(`Failed to send OTP email after ${maxRetries} attempts: ${lastError.message}`);
  err.statusCode = 500;
  err.originalError = lastError;
  err.attempts = maxRetries;
  throw err;
}

/**
 * Verify SMTP connection (for testing/debugging)
 * @returns {Promise<boolean>} True if connection successful
 */
async function verifyConnection() {
  try {
    const trans = initializeTransporter();
    await trans.verify();
    console.log(`[EMAIL] ✅ SMTP connection verified successfully`);
    return true;
  } catch (error) {
    console.error(`[EMAIL] ❌ SMTP connection verification failed:`, error.message);
    throw error;
  }
}

module.exports = {
  sendAttendanceOtpEmail,
  verifyConnection,
  initializeTransporter,
};
