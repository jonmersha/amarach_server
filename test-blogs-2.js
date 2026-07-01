import pool from './db.js';
async function test() {
  const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
  const data = JSON.parse(rows[0].data);
  const str = data.blogs;
  console.log("String around pos 130-150:", JSON.stringify(str.substring(130, 160)));
  process.exit(0);
}
test();
