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
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";

// Create transporter instance
let transporter = null;

function initializeTransporter() {
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
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });

  console.log(`[EMAIL] Nodemailer transporter initialized`);
  console.log(`[EMAIL] SMTP Host: ${SMTP_HOST}:${SMTP_PORT} (secure: ${SMTP_SECURE})`);
  console.log(`[EMAIL] From Email: ${SMTP_EMAIL}`);

  return transporter;
}

/**
 * Send OTP email for gym attendance verification
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

    console.log(`[EMAIL] Sending ${actionLabel} OTP email to ${toEmail}`);
    console.log(
      `[EMAIL] SMTP: ${SMTP_EMAIL} via ${SMTP_HOST}:${SMTP_PORT}`
    );

    const info = await trans.sendMail({
      from: SMTP_EMAIL,
      to: toEmail,
      subject,
      text: plainText,
      html,
      replyTo: SMTP_EMAIL,
    });

    console.log(`[EMAIL] Email sent successfully`);
    console.log(`[EMAIL] Message ID: ${info.messageId}`);
    console.log(`[EMAIL] Response: ${info.response}`);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error(`[EMAIL] Error sending OTP email to ${toEmail}:`);
    console.error(`[EMAIL] Error Message: ${error.message}`);
    console.error(`[EMAIL] Error Code: ${error.code}`);
    console.error(`[EMAIL] Full Error:`, error);

    const err = new Error(`Failed to send OTP email: ${error.message}`);
    err.statusCode = 500;
    err.originalError = error;
    throw err;
  }
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
