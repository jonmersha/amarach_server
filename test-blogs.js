import pool from './db.js';
async function test() {
  const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
  const data = JSON.parse(rows[0].data);
  console.log("Type of blogs:", typeof data.blogs);
  console.log("Is array:", Array.isArray(data.blogs));
  if (typeof data.blogs === 'string') {
     console.log("String starts with:", data.blogs.substring(0, 5));
     try {
       const parsed = JSON.parse(data.blogs);
       console.log("Parsed type:", typeof parsed);
       console.log("Parsed isArray:", Array.isArray(parsed));
     } catch (e) {
       console.error("Parse error:", e);
     }
  }
  process.exit(0);
}
test();
