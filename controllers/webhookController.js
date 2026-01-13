
import Stripe from "stripe";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import sendEmail from "../utils/sendEmail.js";
import { subscriptionSuccess } from "../utils/emailTemplates.js";
import { STRIPE_PRICE_TO_PLAN } from "../config/planMap.js";

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event types we care about
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).send("Received");
};

async function handleCheckoutCompleted(session) {
  try {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    const subscriptionId = session.subscription;

    const user = await User.findById(userId);
    if (!user) return console.error("User not found for session:", session.id);

    await Subscription.findOneAndUpdate(
      { userId },
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

    user.plan = plan;
    user.isSubscribed = true;
    await user.save();

    await sendEmail({
      to: user.email,
      ...subscriptionSuccess(plan),
    });

    console.log(`✅ Subscription activated for ${user.email} (${plan})`);
  } catch (err) {
    console.error("Error in handleCheckoutCompleted:", err);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const customerEmail = invoice.customer_email;
    if (!customerEmail) return;

    const user = await User.findOne({ email: customerEmail });
    if (user) {
      user.isSubscribed = false;
      await user.save();
    }

    console.log(`⚠️ Payment failed for ${customerEmail}`);
  } catch (err) {
    console.error("Error in handlePaymentFailed:", err);
  }
}


export const paystackWebhookHandler = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const crypto = await import("crypto");
    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const { userId, plan } = event.data.metadata;

      const user = await User.findById(userId);
      if (!user) return console.log("User not found for Paystack webhook");

      await Subscription.findOneAndUpdate(
        { userId },
        {
          provider: "paystack",
          providerSubscriptionId: event.data.id,
          plan,
          status: "active",
          startDate: new Date(),
          raw: event,
        },
        { upsert: true, new: true }
      );

      user.plan = plan;
      user.isSubscribed = true;
      await user.save();

      await sendEmail({
        to: user.email,
        ...subscriptionSuccess(plan),
      });

      console.log(`✅ Paystack subscription activated for ${user.email}`);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Paystack webhook error:", err);
    res.status(500).send("Server error");
  }
};
