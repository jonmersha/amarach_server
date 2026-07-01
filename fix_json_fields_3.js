import pool from './db.js';

async function fix() {
  try {
    const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
    if (rows.length === 0) return console.log('Config not found');

    let data = JSON.parse(rows[0].data);
    let updated = false;

    if (typeof data.blogs === 'string') {
        delete data.blogs;
        updated = true;
        console.log('Deleted corrupted blogs string');
    }

    if (updated) {
      await pool.execute(
        'UPDATE documents SET data = ? WHERE collection_name = ? AND doc_id = ?',
        [JSON.stringify(data), 'config', 'settings']
      );
      console.log('Database updated, corrupted blogs removed.');
    } else {
      console.log('No fields needed fixing.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
