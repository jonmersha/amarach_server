import pool from './db.js';
async function test() {
  const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
  const data = JSON.parse(rows[0].data);
  const str = data.blogs.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  console.log("String around pos 4050-4100:", JSON.stringify(str.substring(4050, 4100)));
  process.exit(0);
}
test();
