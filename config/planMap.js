
// Map Stripe price IDs to internal plan names
export const STRIPE_PRICE_TO_PLAN = {
  "price_123PRO": "pro",
  "price_456AGENCY": "agency",
};

export const PLAN_DETAILS = {
  free:   { maxGuilds: 1,  maxTelegramGroups: 1 },
  pro:    { maxGuilds: 5,  maxTelegramGroups: 5 },
  agency: { maxGuilds: 20, maxTelegramGroups: 20 },
};

//Paystack plan 
export const PAYSTACK_AMOUNT_TO_PLAN = {
 50000: "pro",
 100000: "agency"
};
