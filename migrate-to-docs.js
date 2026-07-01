import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test'
  });

  try {
    await connection.query("SET sql_mode = 'ANSI_QUOTES';");
    
    // The list of tables that need to be migrated into the generic `documents` table
    // (Note: we use the exact names from schema.sql)
    const collections = ["users", "membershipApplications", "loans", "ads", "config", "blog_comments", "marketplace_requests", "partners", "jobs", "news", "user_notifications", "contact_messages", "supplier_registrations", "page_visits", "marketplaceProducts", "blogs", "blog_presence"];
    
    // Let's get actual existing tables
    const [existingTablesRows] = await connection.query("SHOW TABLES");
    const existingTables = existingTablesRows.map(r => Object.values(r)[0]);
    
    for (const collection of collections) {
      if (!existingTables.includes(collection) && !existingTables.includes(collection.toLowerCase())) {
        console.log(`Skipping ${collection}, table does not exist.`);
        continue;
      }
      
      const tableName = existingTables.find(t => t === collection || t === collection.toLowerCase());
      
      console.log(`Migrating data from native table '${tableName}' to documents table as collection '${collection}'...`);
      
      const [rows] = await connection.query(`SELECT * FROM "${tableName}"`);
      
      for (const row of rows) {
        let finalRow = { ...row };

        if (collection === 'blogs') {
          const blogId = row.id;
          
          if (existingTables.includes('blog_media')) {
            const [mediaRows] = await connection.query(`SELECT * FROM "blog_media" WHERE "blogId" = ?`, [blogId]);
            finalRow.media = mediaRows;
          }
          
          if (existingTables.includes('blog_references')) {
            const [referencesRows] = await connection.query(`SELECT * FROM "blog_references" WHERE "blogId" = ?`, [blogId]);
            finalRow.references = referencesRows;
          }
        }

        // The frontend expects the document ID to be in the "id" field.
        // Some tables might use a different primary key, but the export has "id".
        const docId = finalRow.id || Math.random().toString(36).substring(2, 15);
        const dataJson = JSON.stringify(finalRow);
        
        await connection.query(
          'INSERT INTO documents (collection_name, doc_id, data, updated_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)',
          [collection, docId, dataJson, Date.now()]
        );
      }
      console.log(`  -> Migrated ${rows.length} rows.`);
    }
    
    console.log('Migration completed successfully.');
  } catch (e) {
    console.error('Error during migration:', e.message);
  } finally {
    await connection.end();
  }
}

run();
