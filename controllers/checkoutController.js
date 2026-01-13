
import Stripe from "stripe";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res, next) => {
  const { plan } = req.body;
  const { PAYMENT_MODE } = process.env;
  const user = req.user;

  try {
    if (PAYMENT_MODE === "STRIPE") {
      const priceMap = {
        pro: process.env.STRIPE_PRICE_PRO,
        agency: process.env.STRIPE_PRICE_AGENCY,
      };
      const priceId = priceMap[plan];
      if (!priceId) return res.status(400).json({ message: "Invalid plan" });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        metadata: { userId: user._id, plan },
      });

      return res.json({ url: session.url });
    }

    if (PAYMENT_MODE === "PAYSTACK") {
      const planAmount = {
        pro: 1000, // ₦10.00 (for testing use kobo)
        agency: 2500,
      }[plan];
      if (!planAmount) return res.status(400).json({ message: "Invalid plan" });

      const paystackUrl = "https://api.paystack.co/transaction/initialize";

      const response = await axios.post(
        paystackUrl,
        {
          email: user.email,
          amount: planAmount * 100, // Paystack requires kobo
          callback_url: process.env.PAYSTACK_CALLBACK_URL,
          metadata: { userId: user._id, plan },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return res.json({ url: response.data.data.authorization_url });
    }

    res.status(400).json({ message: "Invalid payment mode" });
  } catch (err) {
    console.error("Checkout error:", err.response?.data || err.message);
    next(err);
  }
};
