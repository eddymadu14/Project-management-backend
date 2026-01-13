
import express from 'express';
import User from '../models/userModel.js';
import { registerUser, authUser, getUserProfile, logout} from '../controllers/userController.js';
import protect from '../middleware/authMiddleware.js';
import { sendVerificationEmail, verifyEmail, resendVerificationEmail } from "../controllers/emailController.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
import { AuthSchemas, UserSchemas} from "../validators/index.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { queryHandler } from "../middleware/queryHandler.js";
import { planGuard } from "../middleware/planGuard.js";
import { addDiscordServer } from "../controllers/userController.js";


const router = express.Router();

// Register and Login validation
router.post("/register", validateRequest(UserSchemas.registerSchema), registerUser);
router.post("/login", validateRequest(AuthSchemas.loginSchema), authUser);
// router.post("/logout", verifyToken, logout);
router.post("/logout", logout);
// Protected routes
router.get('/profile', protect, getUserProfile);

//router.get('/profile', protect, getUserProfile);
router.post("/resend-verification", resendVerificationEmail);
router.post("/verification", sendVerificationEmail);
router.post("/discord/add", protect, planGuard("discord"), addDiscordServer);
// router.get("/verify/:token", verifyEmail);

//password reset
router.post("/forgot-password", validateRequest(AuthSchemas.forgotPasswordSchema), forgotPassword);
router.post("/reset/:token", validateRequest(AuthSchemas.resetPasswordSchema), resetPassword);

// Verify Email
router.get("/verify/:token",(req, res, next) => {
    // Pass the token as req.body for Joi validation convenience
    req.body = {token: req.params.token};
    next();
  }, validateRequest(AuthSchemas.verifyEmailSchema), verifyEmail);

  //query Handler
  router.get("/", queryHandler(User), (req, res) => {
    res.status(200).json(res.filteredResults);
  });
  

export default router;