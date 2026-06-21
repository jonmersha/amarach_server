import pool from './db.js';

async function updateDb() {
  const queries = [
    "ALTER TABLE users ADD COLUMN role VARCHAR(50);",
    "ALTER TABLE users ADD COLUMN totalVisits INT;",
    "ALTER TABLE users ADD COLUMN photoURL VARCHAR(512);",
    "ALTER TABLE users ADD COLUMN uid VARCHAR(36);",
    "ALTER TABLE users ADD COLUMN lastLogin BIGINT;"
  ];

  for (const q of queries) {
    try {
      await pool.query(q);
      console.log('Success:', q);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists, skipping.');
      } else {
        console.error('Error on query:', q, e.message);
      }
    }
  }
  process.exit(0);
}

updateDb();
