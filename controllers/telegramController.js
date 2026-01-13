
import axios from "axios";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

/**
 * Send Telegram message to a chat or user.
 */
export const sendTelegramMessage = async (req, res) => {
  try {
    const { botToken, chatId, message } = req.body;

    if (!botToken || !chatId || !message)
      return errorResponse(res, 400, "Missing required fields: botToken, chatId, or message");

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }
    );

    return successResponse(res, 200, "Message sent to Telegram successfully", {
      telegramResponse: response.data,
    });
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

/**
 * Send photo or media to Telegram chat.
 */
export const sendTelegramMedia = async (req, res) => {
  try {
    const { botToken, chatId, photoUrl, caption } = req.body;

    if (!botToken || !chatId || !photoUrl)
      return errorResponse(res, 400, "Missing required fields: botToken, chatId, or photoUrl");

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption || "",
      }
    );

    return successResponse(res, 200, "Photo sent to Telegram successfully", {
      telegramResponse: response.data,
    });
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

