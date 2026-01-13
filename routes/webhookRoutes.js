
import express from "express";
import { stripeWebhookHandler, paystackWebhookHandler } from "../controllers/webhookController.js";

const router = express.Router();

// Stripe will send signed events — raw body required!
router.post("/stripe", express.raw({ type: "application/json" }), stripeWebhookHandler);

//paystack
router.post("/paystack", express.json(), paystackWebhookHandler);

export default router;
