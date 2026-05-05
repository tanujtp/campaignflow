import express from 'express';
import { google } from 'googleapis';
import { runQuery, getQuery } from '../db/database.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const getOAuth2Client = () => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Required scopes for sending email and checking replies
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

router.get('/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Google Client ID or Secret is missing in backend configuration.' });
  }

  const url = getOAuth2Client().generateAuthUrl({
    access_type: 'offline', // Ensures we get a refresh token
    scope: SCOPES,
    prompt: 'consent' // Forces consent screen to ensure refresh token is returned
  });
  
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get the user's email address
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    // Save tokens and email to the settings table
    if (tokens.refresh_token) {
      await runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['google_refresh_token', tokens.refresh_token]);
    }
    
    if (tokens.access_token) {
      // In a real app we'd also store access token + expiry, but the googleapis library 
      // can handle refresh automatically if we just give it the refresh token.
      await runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['google_access_token', tokens.access_token]);
      await runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['google_access_token_expiry', tokens.expiry_date.toString()]);
    }

    await runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['connected_email', emailAddress]);

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error) {
    console.error('Error during OAuth callback', error);
    res.status(500).send('Authentication failed');
  }
});

router.get('/status', async (req, res) => {
  try {
    const emailRow = await getQuery("SELECT value FROM settings WHERE key = 'connected_email'");
    if (emailRow && emailRow.value) {
      res.json({ connected: true, email: emailRow.value });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    // Optionally revoke the token from Google using oauth2Client.revokeToken()
    // For V1, we'll just clear it locally
    await runQuery("DELETE FROM settings WHERE key IN ('google_refresh_token', 'google_access_token', 'google_access_token_expiry', 'connected_email')");
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;
