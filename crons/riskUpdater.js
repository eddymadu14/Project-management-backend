
// jobs/riskUpdater.js
import cron from "node-cron";
import Task from "../models/Task.js";
import { calcRisk } from "../utils/riskCalc.js";

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("Running risk updater...");
  try {
    const tasks = await Task.find().lean();
    // you may compute workload per user to pass workloadFactor; simple constant for now
    const baselineWorkloadFactor = 1.0;

    const ops = tasks.map(t => {
      const daysStagnant = 0; // could compute from history timestamp difference
      const newRisk = calcRisk(t, { workloadFactor: baselineWorkloadFactor, daysStagnant });
      return {
        updateOne: {
          filter: { _id: t._id },
          update: { $set: { riskScore: newRisk } },
        },
      };
    });
    if (ops.length) await Task.bulkWrite(ops);
    console.log("Risk update complete.");
  } catch (err) {
    console.error("Risk updater error:", err);
  }
});
