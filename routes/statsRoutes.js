
import express from "express";
import { aggregationHandler } from "../middlewares/aggregationHandler.js";
import { aggregationHandler } from "../utils/pipelineBuilder.js";
import User from "../models/User.js";

const router = express.Router();



router.get("/top-users", aggregationHandler(User, topUsersPipeline), (req, res) => {
  res.status(200).json(res.aggregatedResults);
});

router.get("/user-stats", aggregationHandler(User, userStatsPipeline), (req, res) => {
  res.status(200).json(res.aggregatedResults);
});

router.get("/user-stats", aggregationHandler(User, analyticsPipeline), (req, res) => {
  res.status(200).json(res.aggregatedResults);
});

export default router;