import Stripe from "stripe";
import axios from "axios";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import sendEmail from "../utils/sendEmail.js";
import { subscriptionSuccess, subscriptionFailed } from "../utils/emailTemplates.js";
import { STRIPE_PRICE_TO_PLAN } from "../config/planMap.js"; // ✅ import your plan mapping

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET, {
  apiVersion: "2022-11-15",
});

/* -----------------------------------------------
   STRIPE CHECKOUT: Create a subscription session
------------------------------------------------ */
export const createStripeCheckoutSession = async ({ userId, priceId }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/billing/cancel`,
    metadata: { userId, priceId }, // ✅ helpful for webhook fallback
  });

  return session;
};

/* -----------------------------------------------
   STRIPE WEBHOOK: Handle subscription lifecycle
------------------------------------------------ */
export const handleStripeEvent = async (event) => {
  const { type, data } = event;

  if (type === "checkout.session.completed") {
    const session = data.object;

    // ✅ Get user by email
    const customerEmail = session.customer_email || session.metadata?.email;
    const user = await User.findOne({ email: customerEmail });
    if (!user) return { ok: false, message: "User not found" };

    // ✅ Retrieve full session (if needed) to get line_items
    let priceId =
      session.line_items?.[0]?.price?.id || session.metadata?.priceId;

    // If line_items not expanded, fetch from Stripe
    if (!priceId) {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items.data.price"],
      });
      priceId = fullSession.line_items?.data?.[0]?.price?.id;
    }

    // ✅ Map Stripe priceId → internal plan
    const plan = STRIPE_PRICE_TO_PLAN[priceId] || "pro";

    // ✅ Create or update subscription record
    const subscriptionId = session.subscription;
    const sub = await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        provider: "stripe",
        providerSubscriptionId: subscriptionId,
        plan,
        status: "active",
        startDate: new Date(),
        raw: session,
      },
      { upsert: true, new: true }
    );

    // ✅ Update user plan info
    user.plan = plan;
    user.subscriptionId = subscriptionId;
    await user.save();

    return { ok: true, sub };
  }

  if (type === "invoice.payment_failed") {
    return { ok: true, message: "invoice.payment_failed handled" };
  }

  if (
    type === "customer.subscription.deleted" ||
    type === "customer.subscription.updated"
  ) {
    return { ok: true, message: `${type} handled` };
  }

  return { ok: true, message: "unhandled event type" };
};

/* -----------------------------------------------
   PAYSTACK: Initialize transaction
------------------------------------------------ */
export const initializePaystackTransaction = async ({
  userId,
  email,
  amountKobo,
  plan,
}) => {
  const payload = {
    email,
    amount: amountKobo,
    callback_url: `${process.env.BASE_URL}/billing/paystack/callback`,
    metadata: { userId, plan }, // ✅ keep plan for webhook mapping
  };

  const res = await axios.post(process.env.PAYSTACK_INITIALIZE_URL, payload, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
  });

  return res.data; // includes authorization_url and reference
};

/* -----------------------------------------------
   PAYSTACK: Verify transaction by reference
------------------------------------------------ */
export const verifyPaystackTransaction = async (reference) => {
  const url = `${process.env.PAYSTACK_VERIFY_URL}/${reference}`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
    },
  });

  return res.data;
};

/* -----------------------------------------------
   PAYSTACK: Handle webhook / callback
------------------------------------------------ */
export const handlePaystackEvent = async (payload) => {
  const eventType = payload.event;

  if (eventType === "charge.success") {
    const data = payload.data;
    const reference = data.reference;
    const email = data.customer?.email;
    const metadata = data.metadata || {};
    const userId = metadata.userId;
    const plan = metadata.plan || "pro"; // ✅ fallback to 'pro' if missing

    const user = userId
      ? await User.findById(userId)
      : await User.findOne({ email });
    if (!user) return { ok: false, message: "User not found" };

    const sub = await Subscription.findOneAndUpdate(
      { userId: user._id },
      {
        provider: "paystack",
        providerSubscriptionId: reference,
        plan,
        status: "active",
        startDate: new Date(),
        raw: data,
      },
      { upsert: true, new: true }
    );

    user.plan = plan;
    user.subscriptionId = reference;
    await user.save();

    return { ok: true, sub };
  }

  if (eventType === "charge.failed") {
    return { ok: true, message: "charge.failed handled" };
  }

  return { ok: true, message: "unhandled paystack event" };
};