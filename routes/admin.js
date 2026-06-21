import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// Generic helper for admin actions
const updateCollection = async (collectionName, id, data) => {
    const dataString = JSON.stringify(data);
    await pool.execute(
        'INSERT INTO documents (collection_name, doc_id, data, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(collection_name, doc_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
        [collectionName, id, dataString, Date.now()]
    );
    return { success: true, id };
};

router.post('/jobs/add', async (req, res) => {
    const { data } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    try {
        await updateCollection('jobs', id, data);
        res.json({ success: true, id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add job' });
    }
});

router.post('/settings/update', async (req, res) => {
    const { data } = req.body;
    try {
        await updateCollection('config', 'settings', data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;
