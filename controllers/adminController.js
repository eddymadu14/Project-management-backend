import User from '../models/userModel.js';
import {generateAccessToken} from '../utils/generateAccessToken.js';
import asyncHandler from 'express-async-handler';
import Subscription from "../models/subscriptionModel.js";


// Register
export const registerAdmin = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required." });
    }

    // 1️⃣ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // 3️⃣ Create user (isVerified default false)
    const newUser = await User.create({
      name,
      email,
      password: password,
      isVerified: false,
      role: 'admin'
    });

    console.log(`User created: ${newUser._id} - ${newUser.email}`);

    // 4️⃣ Generate and send email verification
    try {
      const token = generateVerificationToken(newUser._id);
      await sendVerificationEmail(newUser.email, token);
      console.log(`Verification email sent to ${newUser.email}`);
    } catch (emailErr) {
      // If email fails, don't delete the user — inform frontend so it can show next steps
      console.error("Failed to send verification email:", emailErr);
      return res.status(201).json({
        success: true,
        message: "User created but verification email could not be sent. Contact support or try resending verification.",
      });
    }

    // 5️⃣ Respond to frontend
    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    res.status(500).json({ success: false, message: "Server error during registration." });
  }
});


// Admin: get all users
export const getAllUsers = async (req, res) => {
  const users = await User.find({});
  res.json(users);
};

export const registerMod = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const moderator = await User.create({
    name,
    email,
    password,
    role: 'moderator',
  });

  if (moderator) {
    res.status(201).json({
      _id: moderator._id,
      name: moderator.name,
      email: moderator.email,
      role: moderator.role,
      token: generateAccessToken(moderator._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid moderator data');
  }
});

//new logics
// 🧍 1. List All Users
export const listUsers = async (req, res, next) => {
  try {
    const { search, plan, role, page = 1, limit = 10 } = req.query;

    const query = {};

    // 🔍 Search by name or email (case-insensitive)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // 🎯 Filter by plan (basic, pro, premium, etc.)
    if (plan) query.plan = plan;

    // 🎯 Filter by role (admin/user)
    if (role) query.role = role;

    const totalUsers = await User.countDocuments(query);

    // 📄 Pagination
    const users = await User.find(query)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: totalUsers,
      page: Number(page),
      pages: Math.ceil(totalUsers / limit),
      users,
    });
  } catch (err) {
    next(err);
  }
};

// 🔍 2. Get Single User
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ✏️ 3. Update User (role, plan, etc.)
export const updateUser = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User updated", user });
  } catch (err) {
    next(err);
  }
};

// 🗑️ 4. Delete User
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
};

// 💳 5. List Subscriptions

export const listSubscriptions = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const query = {};

    // 🎯 Filter by subscription status
    if (status) query.status = status; // e.g. active, cancelled, expired

    // 🔍 If searching by user email, we need to lookup users first
    let userIds = [];
    if (search) {
      const users = await User.find({
        email: { $regex: search, $options: "i" },
      }).select("_id");
      userIds = users.map((u) => u._id);
      query.userId = { $in: userIds };
    }

    const totalSubs = await Subscription.countDocuments(query);

    const subs = await Subscription.find(query)
      .populate("userId", "email plan")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: totalSubs,
      page: Number(page),
      pages: Math.ceil(totalSubs / limit),
      subs,
    });
  } catch (err) {
    next(err);
  }
};

// 🔍 6. Get Single Subscription
export const getSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findById(req.params.id).populate(
      "userId",
      "email plan"
    );
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    res.json({ success: true, sub });
  } catch (err) {
    next(err);
  }
};

// 📊 7. Get Analytics Stats
export const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSubs = await Subscription.countDocuments({ status: "active" });

    const totalRevenue = await Subscription.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }, // ensure you store amount in Subscription schema
        },
      },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalSubs,
        totalRevenue: totalRevenue[0]?.total || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};






