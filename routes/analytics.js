
import express from "express";
import Task from "../models/Task.js";
import mongoose from "mongoose";
const router = express.Router();

/**
 * GET /api/analytics/workload
 * returns workload per user in hours grouped by week or overall
 * query: ?weekStart=2025-11-01
 */
router.get("/workload", async (req, res) => {
  try {
    // simple aggregation: total estimatedHours per assignedTo for tasks not done
    const match = { status: { $ne: "done" } };
    const agg = await Task.aggregate([
      { $match: match },
      { $group: { _id: "$assignedTo", totalHours: { $sum: "$estimatedHours" }, count: { $sum: 1 } } },
      { $sort: { totalHours: -1 } },
    ]);
    res.json(agg);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

/**
 * GET /api/analytics/risk (optional)
 * returns tasks sorted by riskScore descending
 */
router.get("/risk", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ riskScore: -1, dueDate: 1 }).limit(200);
    res.json(tasks);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;
