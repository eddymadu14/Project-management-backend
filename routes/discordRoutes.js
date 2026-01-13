
import express from "express";
import {
  sendDiscordMessage,
  assignDiscordRole,
} from "../controllers/discordController.js";

const router = express.Router();

// POST /api/discord/send
router.post("/send", sendDiscordMessage);

// POST /api/discord/assign-role
router.post("/assign-role", assignDiscordRole);

export default router;
