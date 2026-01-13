
import express from "express";
import Project from "../models/projectModel.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// 📦 Get all projects
router.get("/", protect, async (req, res) => {
  const projects = await Project.find({ createdBy: req.user._id }).sort("-createdAt");
  res.json(projects);
});

// ➕ Add project
router.post("/", protect, async (req, res) => {
  const { name, desc } = req.body;
  const project = await Project.create({
    name,
    desc,
    createdBy: req.user._id,
  });
  res.status(201).json(project);
});

// ✏️ Edit project
router.put("/:id", protect, async (req, res) => {
  const { id } = req.params;
  const { name, desc } = req.body;
  const project = await Project.findOneAndUpdate(
    { _id: id, createdBy: req.user._id },
    { name, desc },
    { new: true }
  );
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(project);
});

// ❌ Delete project
router.delete("/:id", protect, async (req, res) => {
  const { id } = req.params;
  const project = await Project.findOneAndDelete({ _id: id, createdBy: req.user._id });
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json({ message: "Project deleted successfully" });
});

export default router;

