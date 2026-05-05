import { google } from 'googleapis';
import { runQuery, getQuery, allQuery } from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

const getOAuth2Client = () => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Basic templating function
const renderTemplate = (template, mergeFields) => {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, field) => {
    const key = field.trim().toLowerCase();
    // Case-insensitive match for the field
    const valueKey = Object.keys(mergeFields).find(k => k.toLowerCase() === key);
    return valueKey ? mergeFields[valueKey] : match;
  });
};

const sendEmail = async (gmail, to, subject, htmlBody) => {
  // Construct RFC 2822 email
  const str = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    htmlBody,
  ].join('\n');

  const encodedMessage = Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });

  return res.data;
};

export const startOrchestrator = () => {
  console.log('Starting Campaign Orchestrator...');

  // The orchestrator runs repeatedly
  setInterval(async () => {
    try {
      // Find running campaigns
      const campaigns = await allQuery("SELECT * FROM campaigns WHERE status = 'running'");
      if (campaigns.length === 0) return;

      for (const campaign of campaigns) {
        // Find one queued recipient
        const recipient = await getQuery("SELECT * FROM recipients WHERE campaign_id = ? AND status = 'queued' ORDER BY id ASC LIMIT 1", [campaign.id]);

        if (!recipient) {
          // If no queued recipients left, mark campaign as completed
          await runQuery("UPDATE campaigns SET status = 'completed' WHERE id = ?", [campaign.id]);
          console.log(`Campaign ${campaign.id} completed.`);
          continue;
        }

        // Get OAuth tokens
        const refreshTokenRow = await getQuery("SELECT value FROM settings WHERE key = 'google_refresh_token'");
        if (!refreshTokenRow) {
          console.log('No Google refresh token found. Pausing campaign.');
          await runQuery("UPDATE campaigns SET status = 'paused' WHERE id = ?", [campaign.id]);
          continue;
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshTokenRow.value });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        try {
          const mergeFields = JSON.parse(recipient.merge_fields || '{}');
          const subject = renderTemplate(campaign.template_subject, mergeFields);

          // Inject tracking pixel
          const frontendUrl = process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 8001}`;
          const pixelUrl = `${frontendUrl}/api/tracking/${recipient.id}.gif`;
          const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" />`;

          let htmlBody = renderTemplate(campaign.template_body, mergeFields);
          if (htmlBody.includes('</body>')) {
            htmlBody = htmlBody.replace('</body>', `${pixelHtml}</body>`);
          } else {
            htmlBody += pixelHtml;
          }

          console.log(`Sending email to ${recipient.email}...`);
          const result = await sendEmail(gmail, recipient.email, subject, htmlBody);

          // Update status
          await runQuery(
            "UPDATE recipients SET status = 'sent', message_id = ?, thread_id = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?",
            [result.id, result.threadId, recipient.id]
          );

          await runQuery(
            "INSERT INTO events (recipient_id, event_type, details) VALUES (?, ?, ?)",
            [recipient.id, 'sent', JSON.stringify({ messageId: result.id, threadId: result.threadId })]
          );

          // Pacing is technically handled here by simply returning and letting the next interval pick it up
          // Wait, if interval is fast, it might send too fast.
          // Since we use setInterval, if we set it to run every X seconds, we get implicit pacing.
          // However, different campaigns might have different pacing.
          // For V1, let's just sleep for the pacing duration.
          await new Promise(resolve => setTimeout(resolve, (campaign.pacing_seconds * 1000) || 3000));

        } catch (sendError) {
          console.error(`Failed to send to ${recipient.email}`, sendError);
          await runQuery(
            "UPDATE recipients SET status = 'failed', error_reason = ? WHERE id = ?",
            [sendError.message, recipient.id]
          );
          await runQuery(
            "INSERT INTO events (recipient_id, event_type, details) VALUES (?, ?, ?)",
            [recipient.id, 'failed', JSON.stringify({ error: sendError.message })]
          );
        }
      }
    } catch (error) {
      console.error('Orchestrator error', error);
    }
  }, 5000); // Check for work every 5 seconds
};
