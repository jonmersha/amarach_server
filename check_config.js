import pool from './db.js';

async function check() {
  const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
  if (rows.length > 0) {
    const data = JSON.parse(rows[0].data);
    console.log(data.blogs[0]);
  } else {
    console.log("Config not found in documents table!");
  }
  process.exit(0);
}
check();
