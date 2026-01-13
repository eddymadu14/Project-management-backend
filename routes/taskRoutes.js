import express from "express";
import Task from "../models/Task.js";
import protect from "../middleware/authMiddleware.js";
import mongoose from "mongoose";

const router = express.Router();

// 🔹 Create Task
router.post("/", protect, async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      createdBy: req.user.id, // from JWT payload
    });
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: "Error creating task", details: err.message });
  }
});

// 🔹 Get all tasks for logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const tasks = await Task.find({ createdBy: req.user.id }).populate("dependencies");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Error fetching tasks", details: err.message });
  }
});

// 🔹 Get tasks by project ID
router.get("/project/:projectId", protect, async (req, res) => {
  const { projectId } = req.params;
  if (!mongoose.isValidObjectId(projectId))
    return res.status(400).json({ message: "Invalid project ID" });

  try {
    const tasks = await Task.find({
      project: projectId,
      createdBy: req.user.id,
    }).populate("dependencies");
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tasks for project", details: err.message });
  }
});

// 🔹 Update task (partial updates + history)
router.put("/:id", protect, async (req, res) => {
  try {
    const { reason, changedBy, ...updates } = req.body;
    const prev = await Task.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!prev) return res.status(404).json({ message: "Task not found" });

    const changes = [];
    if (updates.status && updates.status !== prev.status) changes.push({ action: "Status changed", from: prev.status, to: updates.status });
    if (updates.assignedTo && updates.assignedTo !== prev.assignedTo) changes.push({ action: "Assigned", from: prev.assignedTo, to: updates.assignedTo });
    if (typeof updates.isCompleted === "boolean" && updates.isCompleted !== prev.isCompleted) changes.push({ action: "Completed toggled", from: prev.isCompleted, to: updates.isCompleted });
    if (updates.title && updates.title !== prev.title) changes.push({ action: "Title edited", from: prev.title, to: updates.title });

    Object.assign(prev, updates);

    changes.forEach(c => prev.history.push({
      action: c.action,
      from: c.from,
      to: c.to,
      reason: reason || "",
      changedBy: changedBy || "system",
    }));

    await prev.save();
    res.json(prev);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// 🔹 Delete task
router.delete("/:id", protect, async (req, res) => {
  try {
    const deleted = await Task.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id,
    });
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (err) { res.status(500).json({ error: "Error deleting task", details: err.message }); }
});

export default router;