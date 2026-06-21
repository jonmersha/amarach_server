import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const docsTable = `
CREATE TABLE IF NOT EXISTS "documents" (
  "collection_name" VARCHAR(255) NOT NULL,
  "doc_id" VARCHAR(255) NOT NULL,
  "data" LONGTEXT,
  "updated_at" BIGINT,
  PRIMARY KEY ("collection_name", "doc_id")
);
`;

fs.appendFileSync(path.join(__dirname, 'schema.sql'), docsTable);
console.log('Appended documents table to schema.sql');
