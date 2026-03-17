#!/usr/bin/env node

/**
 * Diagnostic Script: Test Nodemailer Email Service
 * Usage: node scripts/testEmailService.js <recipientEmail>
 * 
 * This script tests the Nodemailer SMTP configuration.
 * It verifies SMTP connection and sends a test email.
 */

require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

const { verifyConnection, sendAttendanceOtpEmail } = require("../utils/emailService");

const recipientEmail = process.argv[2] || process.env.SMTP_EMAIL || "test@example.com";

async function testEmailService() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║      NODEMAILER EMAIL SERVICE DIAGNOSTIC TEST      ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  console.log(`📧 Recipient Email: ${recipientEmail}`);
  console.log(`📤 SMTP Host: ${process.env.SMTP_HOST || "smtp.gmail.com"}`);
  console.log(`🔑 SMTP Email: ${process.env.SMTP_EMAIL || "NOT SET"}\n`);

  // Check configuration
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.error("❌ ERROR: SMTP_EMAIL and SMTP_PASSWORD must be configured in .env\n");
    console.log("Quick Setup Guide:");
    console.log("─────────────────");
    console.log("1. Go to https://myaccount.google.com/apppasswords");
    console.log("2. Select 'Mail' and 'Windows Computer'");
    console.log("3. Copy the 16-character app password");
    console.log("4. Update .env.local with:");
    console.log("   SMTP_EMAIL=your-email@gmail.com");
    console.log("   SMTP_PASSWORD=<16-char-app-password>\n");
    process.exit(1);
  }

  try {
    // Step 1: Verify SMTP Connection
    console.log("⏳ Step 1: Verifying SMTP connection...\n");
    await verifyConnection();
    console.log("✅ SMTP connection verified!\n");

    // Step 2: Send Test OTP Email
    console.log("⏳ Step 2: Sending test OTP email...\n");
    const testOtp = "123456";

    const result = await sendAttendanceOtpEmail({
      toEmail: recipientEmail,
      otp: testOtp,
      action: "entry",
      memberName: "Test User",
      expiresInMinutes: 5,
    });

    console.log("\n✅ TEST EMAIL SENT SUCCESSFULLY!\n");
    console.log("Email Details:");
    console.log(`  Message ID: ${result.messageId}`);
    console.log(`  Response: ${result.response}\n`);

    console.log("📋 Next Steps:");
    console.log(`  1. Check your inbox at ${recipientEmail}`);
    console.log("  2. Look in spam/promotions folder if not in inbox");
    console.log("  3. Verify the OTP code is visible in the email");
    console.log("  4. Test end-to-end OTP flow in the gym app\n");

    console.log("💡 Troubleshooting:");
    console.log("  ❌ Email not received?");
    console.log("     - Verify SMTP_PASSWORD is correct");
    console.log("     - Check Gmail 2FA is enabled and app password is generated");
    console.log("     - Verify SMTP_EMAIL has correct Gmail address");
    console.log("     - Check Gmail is not blocking the connection\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR TESTING EMAIL SERVICE:\n");
    console.error("Error Message:", error.message);
    if (error.code) {
      console.error("Error Code:", error.code);
    }
    console.error("\nFull Error:", error);

    console.log("\n🔍 Common Issues & Solutions:");
    console.log("─────────────────────────────");
    console.log("1. Connection timeout (ETIMEDOUT):");
    console.log("   - Check firewall allows outbound SMTP (port 587)");
    console.log("   - Verify VPN is not blocking SMTP");
    console.log("   - Try changing SMTP_PORT to 465 (SSL)\n");

    console.log("2. Invalid login (535 error):");
    console.log("   - App password should be 16 characters (no spaces)");
    console.log("   - 2-Step Verification must be enabled");
    console.log("   - Regenerate app password if expired\n");

    console.log("3. TLS error:");
    console.log("   - For port 587: set SMTP_SECURE=false");
    console.log("   - For port 465: set SMTP_SECURE=true\n");

    console.log("📚 Gmail Setup Instructions:");
    console.log("  Visit: https://support.google.com/mail/answer/185833");
    console.log("  OR: https://myaccount.google.com/apppasswords\n");

    process.exit(1);
  }
}

testEmailService();
