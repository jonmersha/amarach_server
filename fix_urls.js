import pool from './db.js';

async function fixUrls() {
  try {
    const [rows] = await pool.execute('SELECT collection_name, doc_id, data FROM documents');
    
    let updated = 0;
    for (const row of rows) {
      let dataStr = row.data;
      if (dataStr.includes('http://localhost:3000')) {
        const newDataStr = dataStr.replace(/http:\/\/localhost:3000/g, 'https://main.amarachsacco.com');
        
        await pool.execute(
          'UPDATE documents SET data = ? WHERE collection_name = ? AND doc_id = ?',
          [newDataStr, row.collection_name, row.doc_id]
        );
        updated++;
      }
    }
    
    console.log(`Successfully updated ${updated} documents to remove localhost URLs.`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing URLs:', error);
    process.exit(1);
  }
}

fixUrls();
