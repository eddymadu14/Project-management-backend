
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from '../models/userModel.js';

dotenv.config();

export const generateVerificationToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Setup mail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    family: 4,
  },
});

// Send verification email
export const sendVerificationEmail = async (recipientEmail, token) => {
  if (!recipientEmail) throw new Error("Recipient email missing");

  const verifyUrl = `${process.env.BASE_URL}/api/users/verify/${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail, // 👈 make sure this uses the argument
    subject: "Verify your email address",
    html: `
      <h2>Email Verification</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log( `✅ Verification email sent to ${recipientEmail}`);
};

// Optional: resend verification
export const resendVerificationEmail = async (recipientEmail, token) => {
  await sendVerificationEmail(recipientEmail, token);
};


// =============================
// VERIFY EMAIL CONTROLLER
// =============================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // 1️⃣ Verify and decode the token
    const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);

    // 2️⃣ Find user by ID in decoded payload
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    // 3️⃣ If already verified
    if (user.isVerified) {
      return res.status(200).send("Your email is already verified. You can log in now.");
    }

    // 4️⃣ Mark as verified and save
    user.isVerified = true;
    await user.save();

    // 5️⃣ Respond success message (you can later redirect to frontend)
    res.status(200).send("Email verified successfully! You can now log in.");
  } catch (error) {
    console.error("Error in verifyEmail:", error);
    res.status(400).send("Invalid or expired token.");
  }
};


////latest//////



import express from "express";
import User from "../models/userModel.js";
import {
  registerUser,
  authUser,
  getUserProfile,
  logout,
  addDiscordServer,
} from "../controllers/userController.js";
import protect from "../middleware/authMiddleware.js";
import {
  sendVerificationEmail,
  verifyEmail,
} from "../controllers/emailController.js";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/passwordController.js";
import { AuthSchemas, UserSchemas } from "../validators/index.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { queryHandler } from "../middleware/queryHandler.js";
import { planGuard } from "../middleware/planGuard.js";
import { generateVerificationToken } from "../utils/generateVerificationToken.js";

const router = express.Router();

//
// ==========================
// 🔹 AUTH ROUTES
// ==========================
router.post(
  "/register",
  validateRequest(UserSchemas.registerSchema),
  registerUser
);
router.post("/login", validateRequest(AuthSchemas.loginSchema), authUser);
router.post("/logout", logout);

//
// ==========================
// 🔹 USER PROFILE
// ==========================
router.get("/profile", protect, getUserProfile);

//
// ==========================
// 🔹 EMAIL VERIFICATION
// ==========================

// 1️⃣ Verify email from token
router.get(
  "/verify/:token",
  (req, res, next) => {
    // attach token to req.body for schema validation
    req.body.token = req.params.token;
    next();
  },
  validateRequest(AuthSchemas.verifyEmailSchema),
  verifyEmail
);

// 2️⃣ Resend verification email (manual route)
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    if (user.isVerified)
      return res
        .status(200)
        .json({ success: true, message: "User is already verified." });

    const token = generateVerificationToken(user._id);
    await sendVerificationEmail(user.email, token);

    return res.status(200).json({
      success: true,
      message: `Verification email resent to ${user.email}`,
    });
  } catch (err) {
    console.error("Error resending verification email:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to resend verification email" });
  }
});

//
// ==========================
// 🔹 PASSWORD RESET
// ==========================
router.post(
  "/forgot-password",
  validateRequest(AuthSchemas.forgotPasswordSchema),
  forgotPassword
);

router.post(
  "/reset/:token",
  validateRequest(AuthSchemas.resetPasswordSchema),
  resetPassword
);

//
// ==========================
// 🔹 DISCORD SERVER MANAGEMENT
// ==========================
router.post(
  "/discord/add",
  protect,
  planGuard("discord"),
  addDiscordServer
);

//
// ==========================
// 🔹 ADMIN QUERY HANDLER
// ==========================
router.get("/", queryHandler(User), (req, res) => {
  res.status(200).json(res.filteredResults);
});

export default router;
////////
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
  return jwt.sign({ id: userId }, process.env.EMAIL_VERIFICATION_SECRET, { expiresIn: "1h" });
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

// ================================
// VERIFY EMAIL CONTROLLER
// ================================
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Decode token using the same secret
    const decoded = jwt.verify(token, process.env.EMAIL_VERIFICATION_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).send("Invalid or expired verification link.");

    if (user.isVerified) return res.status(200).send("Email already verified. You can log in now.");

    user.isVerified = true;
    await user.save();

    res.status(200).send("Email verified successfully! You can now log in.");
  } catch (err) {
    console.error("Error in verifyEmail:", err);
    res.status(400).send("Invalid or expired token.");
  }
};