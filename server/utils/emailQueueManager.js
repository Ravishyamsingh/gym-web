/**
 * Email Queue Service
 * Ensures all emails are sent with retry logic and tracking
 */

const nodemailer = require("nodemailer");
require("../config/loadEnv");

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_EMAIL = process.env.SMTP_EMAIL || "";
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || "").replace(/\s/g, "");

// In-memory email queue
const emailQueue = [];
let isProcessing = false;

class EmailQueueManager {
  static async addToQueue(emailData) {
    emailQueue.push({
      ...emailData,
      createdAt: Date.now(),
      attempts: 0,
    });
    
    console.log(`[EMAIL-QUEUE] Email added to queue. Queue size: ${emailQueue.length}`);
    this.processQueue();
  }

  static async processQueue() {
    if (isProcessing || emailQueue.length === 0) return;

    isProcessing = true;

    while (emailQueue.length > 0) {
      const email = emailQueue[0];

      try {
        console.log(`\n[EMAIL-QUEUE] Processing queue item (${emailQueue.length} in queue)`);
        await this.sendEmail(email);
        emailQueue.shift();
        console.log(`[EMAIL-QUEUE] ✅ Email processed. Remaining: ${emailQueue.length}`);
      } catch (error) {
        email.attempts++;

        if (email.attempts < 3) {
          console.error(`[EMAIL-QUEUE] ⚠️  Attempt ${email.attempts} failed. Retrying...`);
          // Move to end of queue
          emailQueue.shift();
          emailQueue.push(email);
        } else {
          console.error(`[EMAIL-QUEUE] ❌ Max attempts reached. Removing from queue.`);
          emailQueue.shift();
        }

        // Wait before processing next
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    isProcessing = false;
  }

  static async sendEmail(emailData) {
    const { toEmail, otp, action, memberName } = emailData;

    console.log(`[EMAIL-QUEUE] Sending email to: ${toEmail}`);

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
      connectionTimeout: 20000,
      socketTimeout: 20000,
    });

    const actionLabel = action === "exit" ? "Exit" : "Entry";
    const safeMemberName = memberName || "Member";

    const subject = `${actionLabel} OTP - Gym Attendance Verification`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #111827;">Gym Attendance OTP Verification</h2>
        <p>Hello ${safeMemberName},</p>
        <p>Your OTP for <strong>${actionLabel}</strong> verification is:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #16a34a; margin: 16px 0;">${otp}</div>
        <p>This OTP expires in 5 minutes and can be used only once.</p>
        <p>If you did not request this, please contact the gym desk immediately.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">
          Olympia Fitness | Secure Email Verification
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: SMTP_EMAIL,
      to: toEmail,
      subject,
      text: `Your OTP is: ${otp}`,
      html,
    });

    console.log(`[EMAIL-QUEUE] ✅ Email sent successfully`);
    console.log(`[EMAIL-QUEUE] Message ID: ${info.messageId}`);

    transporter.close();
    return info;
  }

  static getQueueStatus() {
    return {
      queueSize: emailQueue.length,
      isProcessing,
      emails: emailQueue.map((e) => ({
        to: e.toEmail,
        attempts: e.attempts,
        age: Date.now() - e.createdAt,
      })),
    };
  }
}

module.exports = EmailQueueManager;
