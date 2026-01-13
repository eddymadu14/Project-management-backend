import mongoose from "mongoose";

// Subdocument for task history
const HistorySchema = new mongoose.Schema({
  action: { type: String, required: true },       // e.g., "Created", "Status changed", etc.
  from: String,                                  // previous value (optional)
  to: String,                                    // new value (optional)
  reason: String,                                // why the change was made
  changedBy: String,                             // who made the change
  timestamp: { type: Date, default: Date.now },  // change timestamp
}, { _id: false });

// Main Task schema
const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  assignedTo: { type: String, trim: true, default: "" }, // or ObjectId reference to User
  status: {
    type: String,
    enum: ["todo", "in-progress", "done"],
    default: "todo",
  },
  isCompleted: { type: Boolean, default: false },
  estimatedHours: { type: Number, default: 1 },
  dueDate: { type: Date, default: null },
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  riskScore: { type: Number, default: 0 }, 
      dependencies: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Task",
        },
      ],           // 0..1
  dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }], // task dependencies
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who created the task
  order: { type: Number, default: 0 },               // ordering within column
  history: { type: [HistorySchema], default: [] },   // array of subdocuments
}, { timestamps: true });

// Indexes for faster queries
TaskSchema.index({ status: 1, order: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ riskScore: -1 });

export default mongoose.model("Task", TaskSchema);
