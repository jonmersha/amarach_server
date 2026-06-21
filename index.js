import express from "express";

import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";
import dbRouter from "./routes/db.js";
import dotenv from 'dotenv';
import pool from "./db.js";


import cors from 'cors';

dotenv.config();



async function startServer() {


  const app = express();
  const PORT = process.env.PORT || 3000;

  // Allow cross-origin requests
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/db", dbRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", provider: "MySQL + Node.js Backend" });
  });

  app.listen("localhost", () => {
    console.log(`Backend server running at http://localhost:${PORT}/`);
  });
}

startServer();
