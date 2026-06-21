import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
    multipleStatements: true
  });

  try {
    console.log('Preparing schema.sql...');
    let schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    schema = schema.replace(/ JSON,/g, ' LONGTEXT,');
    schema = schema.replace(/ JSON\n/g, ' LONGTEXT\n');
    schema = schema.replace(/"id" TEXT,/g, '"id" VARCHAR(36) PRIMARY KEY,');
    schema = schema.replace(/INSERT INTO/g, 'INSERT IGNORE INTO');
    
    console.log('Setting ANSI_QUOTES and FOREIGN_KEY_CHECKS=0...');
    await connection.query("SET sql_mode = 'ANSI_QUOTES';");
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
    
    console.log('Dropping existing tables to do a clean import...');
    const [rows] = await connection.query("SHOW TABLES");
    const tables = rows.map(r => Object.values(r)[0]);
    for (const t of tables) {
      await connection.query(`DROP TABLE IF EXISTS "${t}";`);
    }

    console.log('Executing schema (' + schema.length + ' bytes)...');
    await connection.query(schema);
    console.log('Schema imported successfully.');
    
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    
    // Save the fixed schema back to schema.sql so it runs perfectly on next server start
    fs.writeFileSync(path.join(__dirname, 'schema.sql'), schema);
    console.log('schema.sql updated with fixes.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await connection.end();
  }
}

run();
