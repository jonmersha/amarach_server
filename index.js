import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";
import dbRouter from "./routes/db.js";
import dotenv from 'dotenv';
import pool from "./db.js";


dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  // Initialize Database
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const queries = schema.split(';\n').filter(q => q.trim().length > 0);
    await pool.execute("SET sql_mode = 'ANSI_QUOTES'");
    for (const q of queries) {
      await pool.execute(q);
    }
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/db", dbRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", provider: "MySQL + Node.js Backend" });
  });

  app.listen(PORT, "localhost", () => {
    console.log(`Backend server running at http://localhost:${PORT}/`);
  });
}

startServer();
