
import mongoose from "mongoose";
import Task from "../models/Task.js";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Task.updateMany(
    { riskScore: { $exists: false } },
    {
      $set: {
        riskScore: 0,
        estimatedHours: 1,
        order: 0,
        history: [],
      },
    }
  );
  console.log("Migration result:", res);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });

