// r existing success/failure routes are already there, so this fits the existing architecture. �
// GitHub
// 11. Make resend verification actually useful
// You have two good places to expose it.
// Option A — Login
// If an unverified user attempts login, your backend already detects:
// if (!user.isVerified)
// and currently attempts to resend verification automatically. �
// GitHub
// I'd keep that behavior.
// But make the frontend understand the 403:
// Account not verified.
// A new verification email has been sent.
// Then show:
// Didn't receive it?
// [Resend verification email]
// Option B — Dedicated verification screen
// After registration:
// Account created

// We've sent a verification link to:
// edward@example.com

// [Open your email]

// Didn't receive it?
// [Resend verification email]
// That is the better UX.
// 12. Resend mutation on frontend
// Create:
// src/hooks/mutations/useResendVerification.js
// import { useMutation } from "@tanstack/react-query";
// import api from "../../utils/api";
// import toast from "react-hot-toast";

// export const useResendVerification = () => {
//   return useMutation({
//     mutationFn: async (email) => {
//       const { data } = await api.post(
//         "users/resend-verification",
//         { email }
//       );

//       return data;
//     },

//     onSuccess: (data) => {
//       toast.success(
//         data.message ||
//           "Verification email sent."
//       );
//     },

//     onError: (error) => {
//       toast.error(
//         error?.response?.data?.message ||
//           "Unable to resend verification email."
//       );
//     },
//   });
// };
// One frontend bug you should fix immediately
// While inspecting the current frontend, I found this in useSignup.js:
// onSuccess: (data) => {
//   toast.success("Registration successful! 🎉");
//   navigate("/login");
// }
// but there is no navigate defined or imported in that hook. �
// GitHub
// Your Register.jsx already has:
// const navigate = useNavigate();
// but its current handleSubmit doesn't navigate after mutateAsync(). �
// GitHub
// So the clean fix is:
// useSignup.js
// Remove navigation entirely:
// export const useRegisterUser = () => {
//   return useMutation({
//     mutationFn: async (userData) => {
//       const { data } = await api.post(
//         "users/register",
//         userData
//       );

//       return data;
//     },

//     onSuccess: () => {
//       toast.success(
//         "Account created! Check your email."
//       );
//     },

//     onError: (error) => {
//       toast.error(
//         error?.response?.data?.message ||
//           "Registration failed."
//       );
//     },
//   });
// };
// Register.jsx
// After successful registration:
// try {
//   const result =
//     await registerMutation.mutateAsync({
//       name: form.name.trim(),
//       email: form.email.trim().toLowerCase(),
//       password: form.password,
//     });

//   navigate(
//     `/verify-email-sent?email=${encodeURIComponent(
//       form.email.trim().toLowerCase()
//     )}`,
//     { replace: true }
//   );

// } catch (error) {
//   console.error(error);
// }
// Even better, create a dedicated VerifyEmailSent.jsx page.
// Final backend structure
// I'd end up with:
// Project-management-backend/
// │
// ├── controllers/
// │   ├── userController.js
// │   ├── emailController.js
// │   └── ...
// │
// ├── services/
// │   ├── emailService.js        ← Brevo
// │   ├── authService.js
// │   └── ...
// │
// ├── utils/
// │   └── generateVerificationToken.js
// │
// ├── routes/
// │   └── userRoutes.js
// │
// └── models/
//     └── userModel.js
// And the email architecture:
//                     ┌─────────────────┐
//                     │   Register      │
//                     └────────┬────────┘
//                              │
//                              ▼
//                      Create User
//                     isVerified=false
//                              │
//                              ▼
//                   generateVerificationToken
//                              │
//                              ▼
//                      emailService.js
//                              │
//                              ▼
//                        Brevo API
//                              │
//                              ▼
//                        User Inbox
//                              │
//                              ▼
//                 /verify-email?token=...
//                              │
//                              ▼
//                   GET /users/verify/:token
//                              │
//                              ▼
//                      JWT verification
//                              │
//                              ▼
//                    user.isVerified=true
//                              │
//                              ▼
//                   /verify-success
//                              │
//                              ▼
//                            Login
// And your resend flow:
// User
//  │
//  ▼
// "Resend verification"
//  │
//  ▼
// POST /api/users/resend-verification
//  │
//  ▼
// Find user
//  │
//  ├── doesn't exist → generic success
//  │
//  ├── already verified → 400
//  │
//  └── unverified
//         │
//         ▼
//   generate NEW token
//         │
//         ▼
//     Brevo email
//         │
//         ▼
//      success
// One final production consideration: add a resend rate limit/cooldown before deploying this. Otherwise somebody can hammer /resend-verification and burn your Brevo quota. Brevo supports transactional sending, but your application should still control how frequently users can request new messages. �
// Brevo API Documentation
// The current repository is small enough that this is a good moment to fix the architecture rather than layering another mailer patch onto the existing Gmail implementation. The current backend has only 4 commits, so cleaning this now will save you pain later. �
// GitHub
// Open your backend repository⁠�
// Brevo transactional email documentation⁠�