import express from 'express';
import dotenv from 'dotenv';
import cors from "cors";
import path from 'path';
import {fileURLToPath} from 'url';
import morgan from "morgan";

// Routes
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import logRoutes from "./routes/logRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";


import errorHandler from "./middleware/errorHandler.js";
import requestLogger from "./middleware/requestLogger.js";

dotenv.config();

const app = express();
app.use(express.static('public'));

app.use(cors());
app.use("/api/admin", adminRoutes);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Body parser middleware
app.use(express.json());

//discord and telegram
//app.use("/api/discord", discordRoutes);
//app.use("/api/telegram", telegramRoutes);
app.use("/api/teams", teamRoutes);

//for frontend 

app.use(morgan("dev"));
app.get("/", (req, res) => res.send("Project Management App is running"));


//errorLogger
app.use(requestLogger);



// For Stripe webhook - we need raw body



// Error Handling
app.use(errorHandler);

// Mount routes (stripe webhook route defined above will still be handled by subscriptionRoutes if mounted)
// app.use("/api/auth", authRoutes);
//app.use("/api/discord", discordRoutes);
//app.use("/api/telegram", telegramRoutes);
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

