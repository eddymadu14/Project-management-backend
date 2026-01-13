import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import path from 'path';
import {fileURLToPath} from 'url';
import morgan from "morgan";

// Routes
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import discordRoutes from "./routes/discordRoutes.js";
import telegramRoutes from "./routes/telegramRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";


import errorHandler from "./middleware/errorHandler.js";
import requestLogger from "./middleware/requestLogger.js";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();
app.use(express.static('public'));

app.use(cors());
app.use("/api/webhooks", webhookRoutes);
app.use("/api/admin", adminRoutes);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Body parser middleware
app.use(express.json());

//discord and telegram
app.use("/api/discord", discordRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/teams", teamRoutes);

//for frontend 

app.use(morgan("dev"));
app.get("/", (req, res) => res.send("Project Management App is running"));


//errorLogger
app.use(requestLogger);



// For Stripe webhook - we need raw body
app.post(
  "/api/subscriptions/webhook/stripe",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // delegate to route handler imported from subscriptionRoutes
    // but since we used raw here we must call the controller directly or let routing forward
    // We'll forward to the controller by attaching to req.rawBody:
    req.rawBody = req.body;
    // require the controller to handle - but easiest is to mount the router below; this route will be handled by controller reading req.rawBody
    next();
  }
);


// Error Handling
app.use(errorHandler);

// Mount routes (stripe webhook route defined above will still be handled by subscriptionRoutes if mounted)
// app.use("/api/auth", authRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/discord", discordRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/logs", logRoutes);

// Mount routes
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/projects", projectRoutes);

app.use("/api/tasks", taskRoutes);

//static routes
app.get('/login',(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register',(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/adminreg',(req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'adminreg.html'));
});


export default app;

