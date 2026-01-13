import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: String, enum: ["stripe", "paystack"], required: true },
  providerSubscriptionId: String, // stripe subscription id or paystack reference
  plan: { type: String, enum: ["free", "pro", "agency"], default: "free" },
  status: { type: String, enum: ["active", "pending", "canceled", "expired"], default: "pending" },
  startDate: Date,
  endDate: Date,
  raw: Object, // store provider webhook payload for audit
}, { timestamps: true });

export default mongoose.model("Subscription", subscriptionSchema);