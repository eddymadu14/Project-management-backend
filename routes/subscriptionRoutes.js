
import express from "express";
import {
  createStripeSession,
  createPaystackTransaction,
  stripeWebhookHandler,
  paystackWebhookHandler,
  verifyPaystackReference,
  listAllSubscriptions
} from "../controllers/subscriptionController.js";
import bodyParser from "body-parser";
import  protect from "../middleware/authMiddleware.js";



const router = express.Router();

router.get("/admin/all", protect, listAllSubscriptions);

// Public endpoints
router.post("/create/stripe", createStripeSession);
router.post("/create/paystack", createPaystackTransaction);

// Note: For Stripe webhook we need raw body - handled in server.js (see below)
router.post("/webhook/stripe", stripeWebhookHandler);

// Paystack webhook delivers JSON
router.post("/webhook/paystack", bodyParser.json(), paystackWebhookHandler);

// Manual verify (optional)
router.get("/verify/paystack/:reference", verifyPaystackReference);

export default router;