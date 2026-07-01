import pool from './db.js';

async function fix() {
  try {
    const [rows] = await pool.execute('SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?', ['config', 'settings']);
    if (rows.length === 0) return console.log('Config not found');

    let data = JSON.parse(rows[0].data);
    let updated = false;

    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'string' && (data[key].startsWith('[') || data[key].startsWith('{'))) {
        try {
          // Replace literal newlines and tabs with escaped versions
          let cleaned = data[key]
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
            
          data[key] = JSON.parse(cleaned);
          updated = true;
          console.log(`Successfully parsed field: ${key}`);
        } catch (e) {
          console.log(`Still failed to parse field: ${key}`, e.message);
        }
      }
    }

    if (updated) {
      await pool.execute(
        'UPDATE documents SET data = ? WHERE collection_name = ? AND doc_id = ?',
        [JSON.stringify(data), 'config', 'settings']
      );
      console.log('Database updated with properly parsed JSON fields.');
    } else {
      console.log('No fields needed parsing.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
fix();
