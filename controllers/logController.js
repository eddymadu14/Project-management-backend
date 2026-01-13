
import ActivityLog from "../models/activityLogModel.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

/**
 * Create a new activity log entry
 */
export const createLog = async (req, res) => {
  try {
    const { userId, action, platform, details } = req.body;

    if (!action) return errorResponse(res, 400, "Action field is required");

    const log = await ActivityLog.create({
      userId,
      action,
      platform,
      details,
      ipAddress: req.ip,
    });

    return successResponse(res, 201, "Log created successfully", log);
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

/**
 * Get all activity logs (for admin dashboard)
 */
export const getAllLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 });
    return successResponse(res, 200, "Logs fetched successfully", logs);
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

/**
 * Get logs by userId
 */
export const getLogsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return errorResponse(res, 400, "User ID is required");

    const logs = await ActivityLog.find({ userId }).sort({ createdAt: -1 });
    return successResponse(res, 200, "User logs fetched successfully", logs);
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

/**
 * Delete a log entry by ID
 */
export const deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ActivityLog.findByIdAndDelete(id);

    if (!deleted) return errorResponse(res, 404, "Log not found");

    return successResponse(res, 200, "Log deleted successfully");
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

