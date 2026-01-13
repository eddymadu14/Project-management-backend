
import express from "express";
import {
  sendTelegramMessage,
  sendTelegramMedia,
} from "../controllers/telegramController.js";

const router = express.Router();

// POST /api/telegram/send
router.post("/send", sendTelegramMessage);

// POST /api/telegram/media
router.post("/media", sendTelegramMedia);

export default router;

