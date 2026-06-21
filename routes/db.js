import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.post('/query', async (req, res) => {
  const { path } = req.body;
  try {
    let query = `SELECT doc_id as id, data FROM documents WHERE collection_name = ?`;
    let params = [path];
    
    const [rows] = await pool.execute(query, params);
    
    res.json({ docs: rows.map(r => ({ id: r.id, data: JSON.parse(r.data) })) });
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

router.post('/get', async (req, res) => {
  const { path, id } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?',
      [path, id]
    );
    if (rows.length === 0) return res.json({ exists: false });
    res.json({ exists: true, data: JSON.parse(rows[0].data) });
  } catch (err) {
    console.error('Database get error:', err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

router.post('/set', async (req, res) => {
  const { path, id, data } = req.body;
  try {
    const dataString = JSON.stringify(data);
    await pool.execute(
      'INSERT INTO documents (collection_name, doc_id, data, updated_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)',
      [path, id, dataString, Date.now()]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Database set error:', err);
    res.status(500).json({ error: 'Database set failed' });
  }
});

router.post('/add', async (req, res) => {
  const { path, data } = req.body;
  const id = Math.random().toString(36).substring(2, 15);
  try {
    const dataString = JSON.stringify(data);
    await pool.execute(
      'INSERT INTO documents (collection_name, doc_id, data, updated_at) VALUES (?, ?, ?, ?)',
      [path, id, dataString, Date.now()]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Database add error:', err);
    res.status(500).json({ error: 'Database add failed' });
  }
});

router.post('/update', async (req, res) => {
  const { path, id, data } = req.body;
  try {
    const [rows] = await pool.execute(
      'SELECT data FROM documents WHERE collection_name = ? AND doc_id = ?',
      [path, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    
    // Simple overwrite for now
    const newData = { ...JSON.parse(rows[0].data), ...data };
    const dataString = JSON.stringify(newData);
    await pool.execute(
      'UPDATE documents SET data = ?, updated_at = ? WHERE collection_name = ? AND doc_id = ?',
      [dataString, Date.now(), path, id]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Database update error:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

router.post('/delete', async (req, res) => {
  const { path, id } = req.body;
  try {
    await pool.execute('DELETE FROM documents WHERE collection_name = ? AND doc_id = ?', [path, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Database delete error:', err);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

export default router;
