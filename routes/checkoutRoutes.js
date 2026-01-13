import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createCheckoutSession } from "../controllers/checkoutController.js";

const router = express.Router();

router.post("/create-session", protect, createCheckoutSession);

router.post("/verify-session", verifySession);

export default router;