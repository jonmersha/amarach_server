import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Generic helper for query
const queryCollection = async (collectionName) => {
    const [rows] = await pool.execute(
        'SELECT doc_id as id, data FROM documents WHERE collection_name = ?',
        [collectionName]
    );
    return rows.map(r => ({ id: r.id, data: JSON.parse(r.data) }));
};

// Public routes for data like ads, blogs, partners
router.post('/ads', async (req, res) => {
    try {
        res.json({ docs: await queryCollection('ads') });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ads' });
    }
});

router.post('/blog', async (req, res) => {
    try {
        res.json({ docs: await queryCollection('news') });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

router.post('/partners', async (req, res) => {
    try {
        res.json({ docs: await queryCollection('partners') });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

export default router;
