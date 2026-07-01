import { Router } from 'express';
import multer from 'multer';
import pool from '../db.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Custom lightweight CSV parser
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Basic regex to split by comma but ignore commas inside quotes
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const values = lines[i].split(regex).map(v => {
      let val = v.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      return val;
    });
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : null;
    });
    rows.push(row);
  }
  return { headers, rows };
}

router.post('/restore-sql', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No SQL file uploaded' });
  }

  try {
    const sqlContent = req.file.buffer.toString('utf8');
    const queries = sqlContent.split(/;\s*\n/).filter(q => q.trim().length > 0);

    await pool.execute("SET sql_mode = 'ANSI_QUOTES'");

    let executed = 0;
    const errors = [];

    for (const q of queries) {
      try {
        await pool.execute(q);
        executed++;
      } catch (err) {
        errors.push({ query: q.substring(0, 50) + '...', error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Executed ${executed} of ${queries.length} queries.`,
      executedCount: executed,
      totalCount: queries.length,
      errors: errors.slice(0, 10) // Return top 10 errors if any
    });
  } catch (error) {
    console.error('SQL Restore Error:', error);
    res.status(500).json({ error: 'Failed to process SQL file: ' + error.message });
  }
});

router.post('/restore-csv', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  const { targetTable } = req.body;
  if (!targetTable || (targetTable !== 'documents' && targetTable !== 'users')) {
    return res.status(400).json({ error: 'Invalid or missing target table' });
  }

  try {
    const csvContent = req.file.buffer.toString('utf8');
    const { headers, rows } = parseCSV(csvContent);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty or invalid' });
    }

    let inserted = 0;
    const errors = [];

    // Dynamically build the insert query based on the CSV headers
    const columns = headers.join(', ');
    const placeholders = headers.map(() => '?').join(', ');
    
    let updateClause = '';
    if (targetTable === 'documents') {
      updateClause = 'ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)';
    } else if (targetTable === 'users') {
      updateClause = 'ON DUPLICATE KEY UPDATE email = VALUES(email), displayName = VALUES(displayName), role = VALUES(role), isMember = VALUES(isMember)';
    }

    const query = `INSERT INTO ${targetTable} (${columns}) VALUES (${placeholders}) ${updateClause}`;

    for (const row of rows) {
      try {
        const values = headers.map(h => row[h]);
        await pool.query(query, values);
        inserted++;
      } catch (err) {
        errors.push({ row: row, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${inserted} of ${rows.length} rows.`,
      insertedCount: inserted,
      totalCount: rows.length,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('CSV Restore Error:', error);
    res.status(500).json({ error: 'Failed to process CSV file: ' + error.message });
  }
});

export default router;
