import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.post('/requests/add', async (req, res) => {
    const { data } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    try {
        const dataString = JSON.stringify(data);
        await pool.execute(
            'INSERT INTO documents (collection_name, doc_id, data, updated_at) VALUES (?, ?, ?, ?)',
            ['marketplace_requests', id, dataString, Date.now()]
        );
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add marketplace request' });
    }
});

router.get('/requests', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT doc_id as id, data FROM documents WHERE collection_name = ?',
            ['marketplace_requests']
        );
        res.json({ docs: rows.map(r => ({ id: r.id, data: JSON.parse(r.data) })) });
    } catch (err) {
        console.error('Database fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch marketplace requests', details: err.message });
    }
});

export default router;
