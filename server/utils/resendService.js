const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function sendAttendanceOtpEmail({ toEmail, otp, action, memberName }) {
  if (!resend) {
    const err = new Error("RESEND_API_KEY is not configured");
    err.statusCode = 500;
    throw err;
  }

  const actionLabel = action === "exit" ? "Exit" : "Entry";
  const safeMemberName = memberName || "Member";

  const subject = `${actionLabel} OTP - Gym Attendance Verification`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #111827;">Gym Attendance OTP Verification</h2>
      <p>Hello ${safeMemberName},</p>
      <p>Your OTP for <strong>${actionLabel}</strong> verification is:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #16a34a; margin: 16px 0;">${otp}</div>
      <p>This OTP expires in 10 minutes and can be used only once.</p>
      <p>If you did not request this, please contact the gym desk immediately.</p>
    </div>
  `;

  await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: [toEmail],
    subject,
    html,
  });
}

module.exports = {
  sendAttendanceOtpEmail,
};
