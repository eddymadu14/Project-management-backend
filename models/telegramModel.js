
import mongoose from "mongoose";

const telegramSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  telegramUserId: {
    type: String,
    required: true,
  },
  username: String,
  firstName: String,
  lastName: String,
  chatId: {
    type: String,
    required: true,
  },
  linkedAt: {
    type: Date,
    default: Date.now,
  },
  lastMessageAt: Date,
  isBot: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model("Telegram", telegramSchema);
