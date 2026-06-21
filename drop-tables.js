import pool from './db.js';

async function dropTables() {
  const tables = ["users", "membershipApplications", "loans", "ads", "config", "blog_comments", "membership_applications"];
  
  for (const t of tables) {
    try {
      await pool.query(`DROP TABLE IF EXISTS \`${t}\`;`);
      console.log(`Dropped ${t}`);
    } catch (e) {
      console.error(`Error dropping ${t}:`, e.message);
    }
  }
  process.exit(0);
}

dropTables();
