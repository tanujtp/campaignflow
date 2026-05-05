import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

import oauthRoutes from './routes/oauth.js';
import campaignRoutes from './routes/campaigns.js';
import trackingRoutes from './routes/tracking.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/upload.js';
import { startOrchestrator } from './workers/orchestrator.js';
import { startReplyDetector } from './workers/reply_detector.js';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/oauth', oauthRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded images publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend files
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// Fallback to React router for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Start background workers
startOrchestrator();
startReplyDetector();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
