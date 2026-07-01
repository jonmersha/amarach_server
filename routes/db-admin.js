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

router.get('/backup', async (req, res) => {
  const { format } = req.query;

  if (!['csv', 'sql'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format. Must be csv or sql' });
  }

  try {
    const [tablesRow] = await pool.query('SHOW TABLES');
    const tables = tablesRow.map(r => Object.values(r)[0]);
    
    if (format === 'csv') {
      let csvData = '';
      
      for (const table of tables) {
        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        if (rows.length === 0) continue;
        
        csvData += `\n--- TABLE: ${table} ---\n`;
        const headers = Object.keys(rows[0]);
        csvData += headers.join(',') + '\n';
        
        rows.forEach(row => {
          const line = headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object' || typeof val === 'string') {
              const strVal = typeof val === 'object' ? JSON.stringify(val) : val;
              return `"${strVal.replace(/"/g, '""')}"`;
            }
            return val;
          }).join(',');
          csvData += line + '\n';
        });
      }
      
      if (!csvData) return res.send('No data in any tables');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=full_backup_${new Date().getTime()}.csv`);
      return res.send(csvData.trim());
    } 
    else if (format === 'sql') {
      let sqlData = `-- Full Database Backup with Schema\n`;
      sqlData += `-- Generated at: ${new Date().toISOString()}\n\n`;
      sqlData += `SET FOREIGN_KEY_CHECKS=0;\n\n`;
      
      for (const table of tables) {
        // Fetch Table Creation Query
        const [createTableRows] = await pool.query(`SHOW CREATE TABLE \`${table}\``);
        const createTableSql = createTableRows[0]['Create Table'];
        
        sqlData += `-- --------------------------------------------------------\n`;
        sqlData += `-- Table structure for table \`${table}\`\n`;
        sqlData += `-- --------------------------------------------------------\n\n`;
        sqlData += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sqlData += `${createTableSql};\n\n`;

        const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
        if (rows.length === 0) {
          sqlData += `-- No data found in ${table}\n\n`;
          continue;
        }

        sqlData += `-- Dumping data for table \`${table}\`\n`;
        const headers = Object.keys(rows[0]);
        
        rows.forEach(row => {
          const values = headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'object') val = JSON.stringify(val);
            // Escape single quotes for SQL
            return `'${val.replace(/'/g, "''")}'`;
          }).join(', ');
          
          sqlData += `INSERT INTO \`${table}\` (\`${headers.join('`, `')}\`) VALUES (${values});\n`;
        });
        sqlData += '\n';
      }

      sqlData += `SET FOREIGN_KEY_CHECKS=1;\n`;

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename=full_backup_${new Date().getTime()}.sql`);
      return res.send(sqlData);
    }
  } catch (error) {
    console.error('Backup Error:', error);
    res.status(500).json({ error: 'Failed to generate backup: ' + error.message });
  }
});

export default router;
