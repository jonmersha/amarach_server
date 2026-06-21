import pool from './db.js';

async function updateDb() {
  const queries = [
    "ALTER TABLE users MODIFY COLUMN createdAt VARCHAR(50);",
    "ALTER TABLE users MODIFY COLUMN lastLogin VARCHAR(50);"
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log('Success:', q);
    } catch (e) {
      console.error('Error on query:', q, e.message);
    }
  }
  process.exit(0);
}

updateDb();
