export const subscriptionSuccess = (plan) => ({
  subject: "🎉 Subscription Activated!",
  html: `<h2>Welcome to the ${plan.toUpperCase()} plan!</h2>
         <p>Your subscription is active. Enjoy your new features.</p>`,
});

export const subscriptionFailed = () => ({
  subject: "⚠️ Payment Failed",
  html: `<h2>We couldn’t process your payment</h2>
         <p>Please update your billing info to continue enjoying your benefits.</p>`,
});
