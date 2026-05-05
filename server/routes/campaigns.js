import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { runQuery, getQuery, allQuery } from '../db/database.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await allQuery(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM recipients WHERE campaign_id = c.id) as total_recipients,
        (SELECT COUNT(*) FROM recipients WHERE campaign_id = c.id AND status = 'sent') as sent_count,
        (SELECT COUNT(*) FROM recipients WHERE campaign_id = c.id AND status = 'opened') as opened_count,
        (SELECT COUNT(*) FROM recipients WHERE campaign_id = c.id AND status = 'replied') as replied_count,
        (SELECT COUNT(*) FROM recipients WHERE campaign_id = c.id AND status = 'failed') as failed_count
      FROM campaigns c
      ORDER BY c.created_at DESC
    `);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get campaign details
router.get('/:id', async (req, res) => {
  try {
    const campaign = await getQuery('SELECT * FROM campaigns WHERE id = ?', [req.params.id]);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const recipients = await allQuery('SELECT * FROM recipients WHERE campaign_id = ? ORDER BY id ASC', [req.params.id]);
    
    // Parse merge fields for frontend use
    const parsedRecipients = recipients.map(r => ({
      ...r,
      merge_fields: r.merge_fields ? JSON.parse(r.merge_fields) : {}
    }));

    res.json({ ...campaign, recipients: parsedRecipients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign details' });
  }
});

// Create campaign with CSV
router.post('/', upload.single('csvFile'), async (req, res) => {
  const { name, subject, body, pacingSeconds } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }

  try {
    const csvData = file.buffer.toString('utf-8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'CSV is empty' });
    }

    // Validate that 'email' column exists
    const headers = Object.keys(records[0]).map(h => h.toLowerCase());
    const emailHeader = Object.keys(records[0]).find(h => h.toLowerCase() === 'email');
    
    if (!emailHeader) {
      return res.status(400).json({ error: 'CSV must contain an "email" column' });
    }

    // Insert campaign
    const campaignResult = await runQuery(
      'INSERT INTO campaigns (name, template_subject, template_body, pacing_seconds, status) VALUES (?, ?, ?, ?, ?)',
      [name, subject, body, parseInt(pacingSeconds) || 3, 'draft']
    );
    const campaignId = campaignResult.lastID;

    // Insert recipients
    for (const record of records) {
      const email = record[emailHeader];
      if (!email || !email.includes('@')) continue; // Skip invalid rows roughly
      
      const mergeFields = JSON.stringify(record);
      await runQuery(
        'INSERT INTO recipients (campaign_id, email, merge_fields) VALUES (?, ?, ?)',
        [campaignId, email, mergeFields]
      );
    }

    res.json({ success: true, campaignId });
  } catch (error) {
    console.error('Error creating campaign', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign status (e.g. to launch)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'running', 'paused', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await runQuery('UPDATE campaigns SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

export default router;
