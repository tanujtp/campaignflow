import { google } from 'googleapis';
import { runQuery, getQuery, allQuery } from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

const getOAuth2Client = () => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const startReplyDetector = () => {
  console.log('Starting Reply Detector worker...');

  // Poll every 5 minutes (300,000 ms)
  setInterval(async () => {
    console.log('Running reply detection poll...');
    try {
      // Need tokens and connected email
      const refreshTokenRow = await getQuery("SELECT value FROM settings WHERE key = 'google_refresh_token'");
      const emailRow = await getQuery("SELECT value FROM settings WHERE key = 'connected_email'");
      
      if (!refreshTokenRow || !emailRow) return;

      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: refreshTokenRow.value });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const connectedEmail = emailRow.value;

      // Find recipients that are 'sent' or 'opened' but not yet 'replied'
      // To optimize, only look at ones sent in the last 30 days
      const recipients = await allQuery(`
        SELECT id, thread_id 
        FROM recipients 
        WHERE status IN ('sent', 'opened') 
        AND thread_id IS NOT NULL
        AND sent_at >= datetime('now', '-30 days')
      `);

      for (const recipient of recipients) {
        try {
          // Check thread
          const threadRes = await gmail.users.threads.get({
            userId: 'me',
            id: recipient.thread_id,
            format: 'metadata',
            metadataHeaders: ['From']
          });

          const messages = threadRes.data.messages || [];
          
          // Check if there are messages in the thread NOT from the connected email
          let hasReply = false;
          let replyMessageId = null;

          // Start from the second message, as first is the one we sent
          for (let i = 1; i < messages.length; i++) {
            const msg = messages[i];
            const fromHeader = msg.payload.headers.find(h => h.name.toLowerCase() === 'from');
            if (fromHeader && !fromHeader.value.includes(connectedEmail)) {
              hasReply = true;
              replyMessageId = msg.id;
              break;
            }
          }

          if (hasReply) {
            console.log(`Reply detected for recipient ${recipient.id}!`);
            await runQuery(
              "UPDATE recipients SET status = 'replied', replied_at = CURRENT_TIMESTAMP WHERE id = ?",
              [recipient.id]
            );
            await runQuery(
              "INSERT INTO events (recipient_id, event_type, details) VALUES (?, ?, ?)",
              [recipient.id, 'replied', JSON.stringify({ replyMessageId })]
            );
          }
        } catch (err) {
          // Ignore thread fetch errors (e.g. thread deleted)
          console.error(`Error checking thread ${recipient.thread_id}`, err.message);
        }
      }

    } catch (error) {
      console.error('Reply Detector error', error);
    }
  }, 300000); 
};
