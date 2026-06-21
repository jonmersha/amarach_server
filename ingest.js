import { Firestore } from '@google-cloud/firestore';
import pool from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const db = new Firestore({
  projectId: 'amarach-sacco',
  databaseId: 'ai-studio-3e95b127-821b-45e5-bccb-27cb3feb4673'
});

async function ingest() {
  console.log('Starting ingestion from Firebase Firestore...');
  
  try {
    const collections = await db.listCollections();
    console.log(`Found ${collections.length} collections.`);

    for (const collection of collections) {
      console.log(`Processing collection: ${collection.id}...`);
      const snapshot = await collection.get();
      
      let count = 0;
      for (const doc of snapshot.docs) {
        const id = doc.id;
        const data = doc.data();
        
        const dataString = JSON.stringify(data);
        const query = 'INSERT INTO documents (collection_name, doc_id, data, updated_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)';
        await pool.execute(query, [collection.id, id, dataString, Date.now()]);
        
        count++;
      }
      console.log(`Ingested ${count} documents for collection: ${collection.id}.`);
    }

    console.log('Ingestion completed successfully.');
  } catch (error) {
    console.error('Error during ingestion:', error);
  } finally {
    process.exit(0);
  }
}

ingest();
