import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initDB() {
  console.log("Starting database initialization...");
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error("schema.sql file not found!");
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    const queries = schema.split(';\n').filter(q => q.trim().length > 0);
    
    await pool.execute("SET sql_mode = 'ANSI_QUOTES'");
    
    console.log(`Found ${queries.length} queries to execute. This may take a minute...`);
    
    let executed = 0;
    for (const q of queries) {
      try {
        await pool.execute(q);
        executed++;
      } catch (err) {
        console.error(`Error executing query #${executed + 1}:`, err.message);
        // We continue executing to insert as much as possible
      }
    }
    console.log(`✅ Database successfully initialized. Executed ${executed}/${queries.length} queries.`);
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
  } finally {
    process.exit(0);
  }
}

initDB();
