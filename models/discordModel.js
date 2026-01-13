
import mongoose from "mongoose";

const discordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  discordUserId: {
    type: String,
    required: true,
  },
  username: String,
  discriminator: String,
  guildId: String,
  roles: [String],
  accessToken: String,
  refreshToken: String,
  linkedAt: {
    type: Date,
    default: Date.now,
  },
  lastSync: Date,
});

export default mongoose.model("Discord", discordSchema);

