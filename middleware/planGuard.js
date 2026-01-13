
import { PLAN_DETAILS } from "../config/planMap.js";
import User from "../models/userModel.js";

export const planGuard = (actionType) => {
  return async (req, res, next) => {
    const user = await User.findById(req.user._id);
    const plan = user.plan || "free";
    const limits = PLAN_DETAILS[plan] || {};

    if (actionType === "discord") {
      const current = user.discordConnections?.length || 0;
      if (current >= limits.maxGuilds)
        return res.status(403).json({
          success: false,
          message: `Plan limit reached (${limits.maxGuilds} Discord servers allowed for ${plan} plan)`,
        });
    }

    if (actionType === "telegram") {
      const current = user.telegramConnections?.length || 0;
      if (current >= limits.maxTelegramGroups)
        return res.status(403).json({
          success: false,
          message: `Plan limit reached (${limits.maxTelegramGroups} Telegram groups allowed for ${plan} plan)`,
        });
    }

    next();
  };
};

