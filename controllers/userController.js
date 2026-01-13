// controllers/userController.js
import User from '../models/userModel.js';
import asyncHandler from 'express-async-handler';
import parseDuration from 'parse-duration';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateVerificationToken } from '../utils/generateVerificationToken.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/generateAccessToken.js';
import { sendVerificationEmail, resendVerificationEmail } from './emailController.js';
import { forgotPassword, resetPassword } from './passwordController.js';
import ApiError from "../utils/ApiError.js";
import catchAsync from "../utils/catchAsync.js";

// =============================
// REGISTER CONTROLLER
// =============================

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email and password are required." });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "User already exists." });
  }

  // Create new user (password is already handled in model)
  const newUser = await User.create({
    name,
    email,
    password,
    isVerified: false,
  });
  
 console.log(`User created: ${newUser._id} - ${newUser.email}`);

  // Send verification email
  try {
    const token = generateVerificationToken(newUser._id);
    await sendVerificationEmail(newUser.email, token);
    console.log(`Verification email sent to ${newUser.email}`);

    // ✅ Respond with email verification success
    return res.status(201).json({
      success: true,
      message: `Verification email sent to ${newUser.email}.`,
    });
  } catch (emailErr) {
    console.error("Failed to send verification email:", emailErr);

    // ⚠️ Respond with email verification failure
    return res.status(201).json({
      success: true,
      message: `Failed to send verification email. Please try resending verification.`,
    });
  }
});
// =============================
// LOGIN + RESEND VERIFICATION LOGIC (authUser)
// =============================
// This is the main auth endpoint that issues access + refresh tokens.
// If user exists but isn't verified, we generate a fresh verification token
const authUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400);
      throw new Error('Email and password are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401);
      throw new Error('password is incorrect');
    }

    // If not verified -> resend verification and block login
    if (!user.isVerified) {
      try {
        const token = generateVerificationToken(user._id);
        // assume resendVerificationEmail(email, token)
        await resendVerificationEmail(user.email, token);
        console.log(`Resent verification email to ${user.email}`);
      } catch (resendErr) {
        console.error("Error resending verification email:", resendErr);
        // still inform user that they are unverified; avoid leaking internal details
        return res.status(403).json({
          success: false,
          message: "Account not verified. Failed to resend verification email — try again later.",
        });
      }

      // tell the frontend that we've resent a verification email
      return res.status(403).json({
        success: false,
        message: "Account not verified. A new verification email has been sent to your inbox.",
      });
    }

    // At this point user exists, password matches, and is verified -> issue tokens
    const accessToken = generateAccessToken(user._id);

    // create refresh token
    const rawRefreshToken = generateRefreshToken(user._id);
    const refreshHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + (parseDuration(process.env.REFRESH_TOKEN_EXPIRES || '7d')));

    // push refresh token to user (optionally limit number of tokens)
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({
      tokenHash: refreshHash,
      createdAt: new Date(),
      expiresAt
    });
    await user.save();

    // set cookie: httpOnly, secure in production, sameSite strict
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: 1000 * 60 * 60 * 24 * 7 // e.g. 7 days, match REFRESH_TOKEN_EXPIRES
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      token: accessToken
    });

  } catch (err) {
    // if asyncHandler threw, it will be handled, but we log for extra clarity
    console.error("Error in authUser:", err);
    // let asyncHandler handle throwing the error response
    throw err;
  }
});

// =============================
// refreshToken, logout, getUserProfile
// (kept your logic mostly intact — slight safety checks added)
// =============================
const refreshToken = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (!rawRefreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  const refreshHash = hashToken(rawRefreshToken);

  // find user with that refresh hash (and not expired)
  const user = await User.findOne({
    'refreshTokens.tokenHash': refreshHash,
    'refreshTokens.expiresAt': { $gt: new Date() }
  });

  if (!user) {
    // possible reuse or stolen token — force logout or alert
    return res.status(403).json({ message: 'Invalid refresh token' });
  }

  // Optionally: remove this refresh token (rotation)
  user.refreshTokens = user.refreshTokens.filter(rt => rt.tokenHash !== refreshHash);

  // issue new refresh token & access token
  const newRawRefreshToken = generateRefreshToken(user._id);
  const newRefreshHash = hashToken(newRawRefreshToken);
  const expiresAt = new Date(Date.now() + (parseDuration(process.env.REFRESH_TOKEN_EXPIRES || '7d')));

  user.refreshTokens.push({ tokenHash: newRefreshHash, createdAt: new Date(), expiresAt });
  await user.save();

  const newAccessToken = generateAccessToken(user._id);

  // set cookie again (rotated)
  res.cookie('refreshToken', newRawRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
    maxAge: 1000 * 60 * 60 * 24 * 7
  });

  res.json({ token: newAccessToken });
});

const logout = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies?.refreshToken;
  if (rawRefreshToken) {
    const refreshHash = hashToken(rawRefreshToken);
    // remove that token from user(s)
    await User.updateOne({}, { $pull: { refreshTokens: { tokenHash: refreshHash } } });
  }
  // clear cookie
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out' });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    // avoid returning password & refresh tokens
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    };
    res.json(safeUser);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});



/**
 * Add or update a Discord server for a user
 * Also logs the action to ActivityLog
 */
export const addDiscordServer = async (req, res) => {
  try {
    const { userId, guildId, guildName } = req.body;

    if (!userId || !guildId)
      return errorResponse(res, 400, "Missing required fields: userId or guildId");

    const user = await User.findById(userId);
    if (!user) return errorResponse(res, 404, "User not found");

    // Ensure user.discordServers exists
    if (!user.discordServers) user.discordServers = [];

    const existingServer = user.discordServers.find(
      (server) => server.guildId === guildId
    );

    let actionType;
    if (existingServer) {
      existingServer.guildName = guildName || existingServer.guildName;
      actionType = "updated_discord_server";
    } else {
      user.discordServers.push({ guildId, guildName });
      actionType = "added_discord_server";
    }

    await user.save();

    // ✅ Log the action
    await ActivityLog.create({
      user: userId,
      action: actionType,
      details: {
        guildId,
        guildName,
        timestamp: new Date(),
      },
    });

    return successResponse(res, 200, "Discord server processed successfully", {
      action: actionType,
      discordServers: user.discordServers,
    });
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};








export { registerUser, authUser, refreshToken, logout, getUserProfile };