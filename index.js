import express from "express";

import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";
import dbRouter from "./routes/db.js";
import uploadRouter from "./routes/upload.js";
import dbAdminRouter from "./routes/db-admin.js";
import dotenv from 'dotenv';
import path from 'path';
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
  app.use("/api/upload", uploadRouter);
  app.use("/api/db-admin", dbAdminRouter);

  // Serve static files (like uploaded images)
  app.use(express.static(path.join(process.cwd(), "public")));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", provider: "MySQL + Node.js Backend" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend server running at http://0.0.0.0:${PORT}/`);
  });
}

startServer();
