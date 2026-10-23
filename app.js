import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { notFound } from './middlewares/notFoundMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { apiLimiter } from './middlewares/rateLimitMiddleware.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5000',
  'https://prismatic-choux-9092e7.netlify.app',
];

if (env.CLIENT_URL && env.CLIENT_URL !== '*') {
  env.CLIENT_URL.split(',').forEach((url) => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (env.CLIENT_URL === '*') return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');

    // Match exact allowed origins (without trailing slash)
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Automatically allow all Netlify subdomains (production & deploy previews)
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.netlify.app')) {
        return callback(null, true);
      }
    } catch {
      // Ignore URL parsing errors
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiter
app.use('/api', apiLimiter);

// Serve static uploaded files
const uploadPath = path.join(__dirname, env.UPLOAD_DIR);
app.use('/uploads', express.static(uploadPath));

// Mount main API v1 router
app.use('/api/v1', routes);

// Base route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the LMS API Server',
    documentation: '/api/v1/health'
  });
});

// 404 & Centralized Error Handlers
app.use(notFound);
app.use(errorHandler);

export default app;
