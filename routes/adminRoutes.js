import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {admin, allowRoles} from '../middleware/adminMiddleware.js';
import {getAllUsers, registerAdmin, registerMod} from '../controllers/adminController.js';
// import { protect } from "../middlewares/authMiddleware.js";
import { adminProtect } from "../middleware/adminProtect.js";
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  listSubscriptions,
  getSubscription,
  getDashboardStats,
} from "../controllers/adminController.js";

const router = express.Router();

router.post('/register', registerAdmin);
router.post('/adminreg', registerAdmin);
router.get('/getallusers', protect, admin, getAllUsers);
router.post('/register/mod', protect, admin, registerMod)


router.use(protect, adminProtect);

// Users CRUD
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// Subscriptions
router.get("/subscriptions", listSubscriptions);
router.get("/subscriptions/:id", getSubscription);

// Analytics
router.get("/stats", getDashboardStats);

export default router;






