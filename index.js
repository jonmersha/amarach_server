import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";
import dbRouter from "./routes/db.js";
import uploadRouter from "./routes/upload.js";
import dbAdminRouter from "./routes/db-admin.js";
import pool from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow static assets to be loaded cross-origin if needed
}));

// Rate Limiting (Global)
// In production, you might want to increase this or configure it behind a reverse proxy (trust proxy)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // limit each IP to 300 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Apply rate limiter to all /api routes
app.use("/api", limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logging
// In production, consider writing to a file or using a more robust logger service
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Compression
app.use(compression());

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);
app.use("/api/db", dbRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/db-admin", dbAdminRouter);

// Serve static files
app.use(express.static(path.join(process.cwd(), "public")));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", provider: "MySQL + Node.js Backend", env: process.env.NODE_ENV || 'development' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  // Don't expose stack traces in production
  const errorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// Start Server
const server = app.listen(() => {
  console.log(`Backend server running in ${process.env.NODE_ENV || 'development'} mode at http://0.0.0.0:${PORT}/`);
});

// Graceful Shutdown handling
const gracefulShutdown = async () => {
  console.log('\nReceived shutdown signal, initiating graceful shutdown...');

  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      console.log('Closing MySQL pool...');
      await pool.end();
      console.log('MySQL pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MySQL pool:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
