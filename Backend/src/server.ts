import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import connectDB from './config/db.ts';
import authRoutes from './routes/authRoutes.ts';
import projectRoutes from './routes/projectRoutes.ts';
import taskRoutes from './routes/taskRoutes.ts';
import userRoutes from './routes/userRoutes.ts';

dotenv.config();

const PREFIX = process.env.PREFIX || '/api';

const app = express();

// Security
app.use(helmet());

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);

// Body & cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
app.use(
    PREFIX,
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts, please try again later.' },
});
app.use(`${PREFIX}/auth/login`, authLimiter);
app.use(`${PREFIX}/auth/register`, authLimiter);

// Database Connection
void connectDB();

// Routes
app.use(`${PREFIX}/auth`, authRoutes);
app.use(`${PREFIX}/users`, userRoutes);
app.use(`${PREFIX}/projects`, projectRoutes);
app.use(`${PREFIX}/tasks`, taskRoutes);
// app.use(`${PREFIX}/reports`, reportRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
