import express from 'express';
import { runQuery, getQuery } from '../db/database.js';

const router = express.Router();

// The 1x1 transparent GIF buffer
const trackingPixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

router.get('/:tracking_id.gif', async (req, res) => {
  const { tracking_id } = req.params;
  
  // tracking_id is simply the recipient_id in this V1
  const recipientId = parseInt(tracking_id);

  if (!isNaN(recipientId)) {
    try {
      const recipient = await getQuery('SELECT * FROM recipients WHERE id = ?', [recipientId]);
      
      if (recipient && ['sent', 'opened', 'replied'].includes(recipient.status)) {
        // Log the open event
        const details = JSON.stringify({
          userAgent: req.headers['user-agent'],
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        });
        
        await runQuery(
          'INSERT INTO events (recipient_id, event_type, details) VALUES (?, ?, ?)',
          [recipientId, 'opened', details]
        );

        // Update recipient status to opened if it's currently just 'sent'
        if (recipient.status === 'sent') {
          await runQuery(
            'UPDATE recipients SET status = ?, opened_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['opened', recipientId]
          );
        } else if (recipient.status === 'opened') {
           // just update opened_at to be the last open
           await runQuery(
            'UPDATE recipients SET opened_at = CURRENT_TIMESTAMP WHERE id = ?',
            [recipientId]
          );
        }
      }
    } catch (error) {
      console.error('Error tracking open', error);
      // Fail silently to the client
    }
  }

  // Always return the GIF, disable caching so every open is recorded
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': trackingPixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(trackingPixel);
});

export default router;
