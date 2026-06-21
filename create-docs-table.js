import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test'
  });

  try {
    console.log('Creating documents table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        collection_name VARCHAR(255) NOT NULL,
        doc_id VARCHAR(255) NOT NULL,
        data LONGTEXT,
        updated_at BIGINT,
        PRIMARY KEY (collection_name, doc_id)
      );
    `);
    console.log('Documents table created successfully.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await connection.end();
  }
}

run();
