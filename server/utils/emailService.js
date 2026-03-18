const nodemailer = require("nodemailer");

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
 * @param {number} params.expiresInMinutes - OTP expiration time in minutes
 * @returns {Promise<Object>} Email send result
 */
async function sendAttendanceOtpEmail({
  toEmail,
  otp,
  action,
  memberName,
  expiresInMinutes = 5,
}) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
      console.log(`[EMAIL] SMTP: ${SMTP_EMAIL} via ${SMTP_HOST}:${SMTP_PORT}`);

      const info = await trans.sendMail({
        from: SMTP_EMAIL,
        to: toEmail,
        subject,
        text: plainText,
        html,
        replyTo: SMTP_EMAIL,
      });

      console.log(`[EMAIL] ✅ Email sent successfully on attempt ${attempt}`);
      console.log(`[EMAIL] Message ID: ${info.messageId}`);
      console.log(`[EMAIL] Response: ${info.response}`);

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
        attempt,
      };
    } catch (error) {
      lastError = error;
      console.error(`[EMAIL] ❌ Attempt ${attempt} failed: ${error.message}`);
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

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[EMAIL] Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } else {
        // Non-retryable error
        break;
      }
    }
  }

  // All retries failed
  console.error(`[EMAIL] All ${maxRetries} attempts failed`);
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
