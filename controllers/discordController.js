
import axios from "axios";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

/**
 * Send message to Discord channel or assign roles.
 */
export const sendDiscordMessage = async (req, res) => {
  try {
    const { webhookUrl, content, embeds } = req.body;

    if (!webhookUrl || !content)
      return errorResponse(res, 400, "Missing required fields: webhookUrl or content");

    const response = await axios.post(webhookUrl, {
      content,
      embeds: embeds || [],
    });

    return successResponse(res, 200, "Message sent to Discord successfully", {
      discordResponse: response.data,
    });
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

/**
 * Assign a role to a Discord user (if your bot supports it).
 */
export const assignDiscordRole = async (req, res) => {
  try {
    const { botToken, guildId, userId, roleId } = req.body;

    if (!botToken || !guildId || !userId || !roleId)
      return errorResponse(res, 400, "Missing required parameters");

    const response = await axios.put(
      `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {},
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    return successResponse(res, 200, "Role assigned successfully", response.data);
  } catch (err) {
    return errorResponse(res, 500, err);
  }
};

