import express from "express";
import Team from "../models/Team.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

// 🟢 Create a team
router.post("/", protect, async (req, res) => {
  try {
    const { name, members } = req.body;
    const createdBy = req.user._id;

    const team = await Team.create({ name, members, createdBy });
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🟢 Get all teams for logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const teams = await Team.find({ createdBy: req.user._id }).populate("createdBy", "username email");
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Add member to team
router.put("/:teamId/add", protect, async (req, res) => {
  try {
    const { name, role, email } = req.body;

    const team = await Team.findOne({ _id: req.params.teamId, createdBy: req.user._id });
    if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

    team.members.push({ name, role, email });

    await team.save();

    // Return plain JS object to ensure React sees a new reference
    res.json(team.toObject());
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});





// 🟢 Remove member from team
router.put("/:teamId/members/:memberId", protect, async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.teamId, createdBy: req.user._id });
    if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

    team.members = team.members.filter(
      (member) => member._id.toString() !== req.params.memberId
    );
    await team.save();
    res.json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});





// 🟢 Delete entire team
router.delete("/:teamId", protect, async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({ _id: req.params.teamId, createdBy: req.user._id });
    if (!team) return res.status(404).json({ message: "Team not found or unauthorized" });

    res.json({ message: "Team deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;