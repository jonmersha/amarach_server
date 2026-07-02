import pool from './db.js';

async function checkAds() {
  try {
    const [rows] = await pool.execute("SELECT data FROM documents WHERE collection_name = 'ads'");
    for (const row of rows) {
      console.log(row.data);
    }
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkAds();
