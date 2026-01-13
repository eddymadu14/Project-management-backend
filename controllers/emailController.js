import nodemailer from "nodemailer";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

dotenv.config();

// ================================
// JWT TOKEN GENERATOR
// ================================
export const generateVerificationToken = (userId) => {
  // Make sure to use the same secret as in verify controller
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// ================================
// MAIL TRANSPORTER SETUP (GMAIL)
// ================================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for 465
  auth: {
    user: process.env.EMAIL_USER, // Gmail account
    pass: process.env.EMAIL_PASS, // App password if 2FA enabled
  },
  tls: { rejectUnauthorized: false }, // dev only, ignore invalid certs
  family: 4, // force IPv4
});

// ================================
// SEND VERIFICATION EMAIL
// ================================
export const sendVerificationEmail = async (recipientEmail, token) => {
  if (!recipientEmail) throw new Error("Recipient email missing");

  const verifyUrl = `${process.env.BASE_URL}/api/users/verify/${token}`;

  const mailOptions = {
    from: `"NoReply" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: "Verify your email address",
    html: `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${recipientEmail}`);
  } catch (err) {
    console.error("❌ Error sending verification email:", err);
    throw err;
  }
};



// Optional: resend verification
export const resendVerificationEmail = async (recipientEmail, token) => {
  await sendVerificationEmail(recipientEmail, token);
};


// ================================
// VERIFY EMAIL CONTROLLER
// ================================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.redirect(`${process.env.FRONTEND_URL}/verify-failed`);

    if (user.isVerified)
      return res.redirect(`${process.env.FRONTEND_URL}/verify-success`);

    user.isVerified = true;
    await user.save();

    // ✅ Redirect to React success page
    res.redirect(`${process.env.FRONTEND_URL}/verify-success`);
  } catch (err) {
    console.error("Error in verifyEmail:", err);
    // ✅ Redirect to React failure page if token invalid/expired
    res.redirect(`${process.env.FRONTEND_URL}/verify-failed`);
  }
};