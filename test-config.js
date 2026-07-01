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
  const [rows] = await connection.query('SELECT data FROM documents WHERE collection_name = "config"');
  console.log(JSON.stringify(JSON.parse(rows[0].data), null, 2));
  connection.end();
}
run();
