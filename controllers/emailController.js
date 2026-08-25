
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import {
  generateVerificationToken,
} from "../utils/generateVerificationToken.js";
import {
  sendVerificationEmail,
} from "../services/emailService.js";

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/verify-failed`
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.EMAIL_TOKEN_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/verify-failed`
      );
    }

    if (user.isVerified) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/verify-success`
      );
    }

    user.isVerified = true;
    user.updatedAt = new Date();

    await user.save();

    return res.redirect(
      `${process.env.FRONTEND_URL}/verify-success`
    );

  } catch (error) {
    console.error(
      "Email verification failed:",
      error.message
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}/verify-failed`
    );
  }
};


export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    /*
      Don't reveal whether an email exists.
      This prevents simple account enumeration.
    */
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an unverified account exists for that email, a new verification email has been sent.",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "This email is already verified.",
      });
    }

    const token = generateVerificationToken(user._id);

    await sendVerificationEmail({
      recipientEmail: user.email,
      recipientName: user.name,
      token,
    });

    return res.status(200).json({
      success: true,
      message:
        "A new verification email has been sent.",
    });

  } catch (error) {
    console.error(
      "Resend verification failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to resend verification email. Please try again later.",
    });
  }
};