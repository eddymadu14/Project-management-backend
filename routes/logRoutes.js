
import express from "express";
import {
  createLog,
  getAllLogs,
  getLogsByUser,
  deleteLog,
} from "../controllers/logController.js";

const router = express.Router();

// POST /api/logs
router.post("/", createLog);

// GET /api/logs
router.get("/", getAllLogs);

// GET /api/logs/:userId
router.get("/:userId", getLogsByUser);

// DELETE /api/logs/:id
router.delete("/:id", deleteLog);

export default router;
