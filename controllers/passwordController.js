import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";

// =============================
// 📩 Forgot Password Controller
// =============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // 3️⃣ Create password reset URL
    const resetUrl = `${process.env.BASE_URL}/api/users/reset-password/${resetToken}`;

    // 4️⃣ Compose email content (HTML like verify logic)
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name || "there"},</p>
        <p>You requested to reset your password. Click the link below to set a new one:</p>
        <a href="${resetUrl}" style="background:#007bff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn’t request this, please ignore this email.</p>
        <hr/>
        <small>&copy; ${new Date().getFullYear()} YourApp Team</small>
      </div>
    `;

    // 5️⃣ Send email
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html,
    });

    res.status(200).json({ message: "Password reset email sent successfully" });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Failed to send reset email", error: error.message });
  }
};

// =============================
// 🔐 Reset Password Controller
// =============================
export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // 1️⃣ Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // 2️⃣ Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);

    // 3️⃣ Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};