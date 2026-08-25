
import "dotenv/config";
import { BrevoClient } from "@getbrevo/brevo";

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const FRONTEND_URL = process.env.FRONTEND_URL;
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME || "Task Orbit";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const sendVerificationEmail = async ({
  recipientEmail,
  recipientName,
  token,
}) => {
  if (!recipientEmail) {
    throw new Error("Recipient email is required");
  }

  if (!token) {
    throw new Error("Verification token is required");
  }

  const verifyUrl =
    `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;

  const safeName = escapeHtml(recipientName || "there");

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Task Orbit email</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#07111f;
  font-family:Arial,Helvetica,sans-serif;
  color:#ffffff;
">

  <div style="
    width:100%;
    padding:48px 16px;
    box-sizing:border-box;
    background:
      radial-gradient(circle at 85% 10%, rgba(34,211,238,.12), transparent 30%),
      radial-gradient(circle at 10% 90%, rgba(139,92,246,.10), transparent 30%),
      #07111f;
  ">

    <div style="
      max-width:560px;
      margin:0 auto;
    ">

      <!-- Logo -->
      <div style="
        margin-bottom:28px;
        text-align:center;
      ">
        <div style="
          display:inline-block;
          padding:10px 16px;
          border:1px solid rgba(103,232,249,.25);
          border-radius:14px;
          background:rgba(103,232,249,.06);
          color:#67e8f9;
          font-size:18px;
          font-weight:700;
          letter-spacing:-.02em;
        ">
          TASK <span style="color:#ffffff;">ORBIT</span>
        </div>
      </div>

      <!-- Card -->
      <div style="
        background:#0b1728;
        border:1px solid rgba(255,255,255,.08);
        border-radius:24px;
        padding:40px 32px;
        box-shadow:0 24px 70px rgba(0,0,0,.35);
      ">

        <div style="
          width:48px;
          height:48px;
          line-height:48px;
          text-align:center;
          border-radius:14px;
          background:rgba(103,232,249,.08);
          border:1px solid rgba(103,232,249,.18);
          color:#67e8f9;
          font-size:22px;
          margin-bottom:24px;
        ">
          ✓
        </div>

        <h1 style="
          margin:0 0 12px;
          font-size:28px;
          line-height:1.2;
          color:#ffffff;
        ">
          Verify your email
        </h1>

        <p style="
          margin:0 0 20px;
          color:#94a3b8;
          font-size:15px;
          line-height:1.7;
        ">
          Hi ${safeName},
        </p>

        <p style="
          margin:0 0 28px;
          color:#94a3b8;
          font-size:15px;
          line-height:1.7;
        ">
          You're almost ready to start using Task Orbit.
          Confirm your email address to activate your account.
        </p>

        <div style="text-align:center; margin:32px 0;">
          <a
            href="${verifyUrl}"
            style="
              display:inline-block;
              padding:14px 24px;
              border-radius:12px;
              background:#67e8f9;
              color:#07111f;
              font-size:14px;
              font-weight:700;
              text-decoration:none;
            "
          >
            Verify my email
          </a>
        </div>

        <p style="
          margin:28px 0 8px;
          color:#64748b;
          font-size:12px;
          line-height:1.6;
        ">
          This verification link expires in 24 hours.
        </p>

        <p style="
          margin:0;
          color:#64748b;
          font-size:12px;
          line-height:1.6;
        ">
          If you didn't create a Task Orbit account, you can safely ignore
          this email.
        </p>

      </div>

      <p style="
        margin:24px 0 0;
        text-align:center;
        color:#475569;
        font-size:11px;
      ">
        © ${new Date().getFullYear()} Task Orbit. All rights reserved.
      </p>

    </div>
  </div>

</body>
</html>
`;

  const result =
    await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: EMAIL_FROM_NAME,
        email: EMAIL_FROM,
      },

      to: [
        {
          email: recipientEmail,
          name: recipientName || recipientEmail,
        },
      ],

      subject: "Verify your Task Orbit email",

      htmlContent,

      textContent: `
Hi ${recipientName || "there"},

Verify your Task Orbit email by opening:

${verifyUrl}

This link expires in 24 hours.

If you didn't create a Task Orbit account, you can ignore this email.
      `.trim(),

      tags: ["email-verification"],
    });

  console.log(
    `Verification email sent to ${recipientEmail}. Message ID: ${result.messageId}`
  );

  return result;
};