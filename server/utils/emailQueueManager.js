/**
 * Email Queue Service
 * Ensures all emails are sent with retry logic and tracking
 * Uses the main emailService for actual sending
 */

const { sendAttendanceOtpEmail } = require("./emailService");

// In-memory email queue
const emailQueue = [];
let isProcessing = false;
const MAX_QUEUE_SIZE = 100;
const PROCESS_INTERVAL = 1000; // Process queue every 1 second

class EmailQueueManager {
  static async addToQueue(emailData) {
    if (emailQueue.length >= MAX_QUEUE_SIZE) {
      console.error(`[EMAIL-QUEUE] Queue is full (${MAX_QUEUE_SIZE}). Rejecting email.`);
      return false;
    }

    const queueItem = {
      ...emailData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      attempts: 0,
      status: "pending",
    };

    emailQueue.push(queueItem);
    
    console.log(`[EMAIL-QUEUE] ✅ Email added to queue`);
    console.log(`[EMAIL-QUEUE] To: ${emailData.toEmail}`);
    console.log(`[EMAIL-QUEUE] OTP: ${emailData.otp}`);
    console.log(`[EMAIL-QUEUE] Action: ${emailData.action}`);
    console.log(`[EMAIL-QUEUE] Queue size: ${emailQueue.length}`);

    // Start processing queue (non-blocking)
    setImmediate(() => this.processQueue());
    
    return true;
  }

  static async processQueue() {
    if (isProcessing) {
      console.log(`[EMAIL-QUEUE] Already processing. Skipping.`);
      return;
    }

    if (emailQueue.length === 0) {
      return;
    }

    isProcessing = true;
    console.log(`[EMAIL-QUEUE] Starting queue processing (${emailQueue.length} items)`);

    while (emailQueue.length > 0) {
      const email = emailQueue[0];

      try {
        console.log(`\n[EMAIL-QUEUE] Processing: ${email.id}`);
        console.log(`[EMAIL-QUEUE] To: ${email.toEmail}`);
        console.log(`[EMAIL-QUEUE] Attempt: ${email.attempts + 1}/3`);

        email.status = "sending";
        email.attempts++;

        // Use the main email service
        const result = await sendAttendanceOtpEmail({
          toEmail: email.toEmail,
          otp: email.otp,
          action: email.action,
          memberName: email.memberName,
          userId: email.userId,
          expiresInMinutes: email.expiresInMinutes || 5,
        });

        email.status = "sent";
        email.sentAt = Date.now();
        email.messageId = result.messageId;

        console.log(`[EMAIL-QUEUE] ✅ Email sent successfully`);
        console.log(`[EMAIL-QUEUE] Message ID: ${result.messageId}`);
        console.log(`[EMAIL-QUEUE] Time taken: ${result.totalTime}ms`);

        emailQueue.shift();
        console.log(`[EMAIL-QUEUE] Remaining in queue: ${emailQueue.length}`);

      } catch (error) {
        console.error(`\n[EMAIL-QUEUE] ❌ Send failed`);
        console.error(`[EMAIL-QUEUE] Error: ${error.message}`);
        console.error(`[EMAIL-QUEUE] Attempt: ${email.attempts}/3`);

        if (email.attempts < 3) {
          email.status = "retry_pending";
          console.log(`[EMAIL-QUEUE] ⚠️  Will retry (${3 - email.attempts} attempts remaining)`);
          
          // Move to end of queue for retry
          emailQueue.shift();
          emailQueue.push(email);
          
          // Wait before next attempt
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          email.status = "failed";
          email.failedAt = Date.now();
          email.lastError = error.message;

          console.error(`[EMAIL-QUEUE] ❌ Max attempts reached. Removing from queue.`);
          console.error(`[EMAIL-QUEUE] Email will NOT be retried.`);
          
          emailQueue.shift();
        }
      }

      // Small delay between emails
      if (emailQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    isProcessing = false;
    console.log(`[EMAIL-QUEUE] Queue processing complete`);
  }

  static getQueueStatus() {
    return {
      queueSize: emailQueue.length,
      isProcessing,
      maxQueueSize: MAX_QUEUE_SIZE,
      emails: emailQueue.map((e) => ({
        id: e.id,
        to: e.toEmail,
        otp: e.otp,
        action: e.action,
        status: e.status,
        attempts: e.attempts,
        age: Date.now() - e.createdAt,
        createdAt: new Date(e.createdAt).toISOString(),
        sentAt: e.sentAt ? new Date(e.sentAt).toISOString() : null,
        messageId: e.messageId || null,
      })),
    };
  }

  static clearQueue() {
    const cleared = emailQueue.length;
    emailQueue.length = 0;
    console.log(`[EMAIL-QUEUE] Queue cleared (${cleared} items removed)`);
    return cleared;
  }
}

module.exports = EmailQueueManager;
