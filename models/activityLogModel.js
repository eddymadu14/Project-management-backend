
import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  platform: {
    type: String,
    enum: ["discord", "telegram", "whatsapp", "web", "system"],
    default: "web",
  },
  action: {
    type: String,
    required: true,
  },
  details: {
    type: Object, // You can store flexible metadata here
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending"],
    default: "success",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("ActivityLog", activityLogSchema);

