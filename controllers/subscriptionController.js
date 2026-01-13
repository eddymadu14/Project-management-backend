
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import Subscription from "../models/subscriptionModel.js";
import {
  createStripeCheckoutSession,
  handleStripeEvent,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  handlePaystackEvent,
} from "../services/subscriptionService.js";
import bodyParser from "body-parser";

/**
 * POST /api/subscriptions/create/stripe
 * { userId, priceId }
 */
export const createStripeSession = async (req, res, next) => {
  try {
    const { userId, priceId } = req.body;
    if (!userId || !priceId) return errorResponse(res, "userId and priceId required");

    const session = await createStripeCheckoutSession({ userId, priceId });
    successResponse(res, "Stripe session created", { url: session.url, id: session.id });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/create/paystack
 * { userId, amount }  // amount in Naira (float or integer)
 */
export const createPaystackTransaction = async (req, res, next) => {
  try {
    const { userId, amount } = req.body;
    if (!userId || !amount) return errorResponse(res, "userId and amount required");

    // find user email over DB if you want; or pass email in body
    // For simplicity, expect email in body or derive from userId
    const email = req.body.email;
    if (!email) return errorResponse(res, "email required");

    const amountKobo = Math.round(Number(amount) * 100);
    const data = await initializePaystackTransaction({ userId, email, amountKobo });

    // returns data.data.authorization_url and data.data.reference
    successResponse(res, "Paystack transaction initialized", data.data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/webhook/stripe
 * Stripe requires raw body verification -> see server change notes
 */
export const stripeWebhookHandler = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    if (webhookSecret) {
      // verify signature
      try {
        event = require("stripe")(process.env.STRIPE_SECRET).webhooks.constructEvent(
          req.rawBody,
          sig,
          webhookSecret
        );
      } catch (err) {
        console.error("⚠️  Stripe signature verification failed.", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // If no webhook secret configured, trust the body (less secure)
      event = req.body;
    }

    const result = await handleStripeEvent(event);
    // respond 200 quickly
    res.json({ received: true, result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/webhook/paystack
 * Paystack sends JSON body via webhook
 */
export const paystackWebhookHandler = async (req, res, next) => {
  try {
    const event = req.body;
    // Optionally validate Paystack signature in headers: x-paystack-signature
    // For now we assume the endpoint is secret and Paystack is configured.

    const result = await handlePaystackEvent(event);
    res.json({ received: true, result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/subscriptions/verify-paystack/:reference
 * manual verify endpoint (server-to-server)
 */
export const verifyPaystackReference = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const data = await verifyPaystackTransaction(reference);
    successResponse(res, "Paystack verification result", data);
  } catch (err) {
    next(err);
  }
};

export const listAllSubscriptions = async (req, res, next) => {
  try {
    // Optional: check if req.user.role === "admin"
    const subs = await Subscription.find().populate("userId", "email plan");
    successResponse(res, "All subscriptions", subs);
  } catch (err) {
    next(err);
  }
};

