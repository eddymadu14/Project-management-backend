
import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: "Member" }, // optional role field
  email: { type: String, unique: true, sparse: true },
  joinedAt: { type: Date, default: Date.now },
});

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [teamMemberSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Team", teamSchema);
