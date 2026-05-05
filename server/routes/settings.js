import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Get current OAuth config from .env (and process.env)
router.get('/env', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 8001}/api/oauth/callback`
  });
});

// Update .env with new OAuth config
router.post('/env', (req, res) => {
  const { clientId, clientSecret } = req.body;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required' });
  }

  try {
    // Read current .env
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Helper to replace or append env vars
    const updateEnvVar = (content, key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`);
      } else {
        return content + `\n${key}=${value}`;
      }
    };

    envContent = updateEnvVar(envContent, 'GOOGLE_CLIENT_ID', clientId);
    envContent = updateEnvVar(envContent, 'GOOGLE_CLIENT_SECRET', clientSecret);

    // Write back to .env
    fs.writeFileSync(envPath, envContent, 'utf8');

    // Update in-memory process.env so it takes effect immediately without restart
    process.env.GOOGLE_CLIENT_ID = clientId;
    process.env.GOOGLE_CLIENT_SECRET = clientSecret;

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to update .env', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
