import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

// Ensure uploads dir exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer to save to disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const router = express.Router();

router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // Determine the base URL. If we have a configured FRONTEND_URL or just use the host.
  // We'll use the API's current host to construct the absolute URL so it works in emails.
  const protocol = req.protocol;
  const host = req.get('host');
  // For local development, this will be http://localhost:8001/uploads/filename.ext
  // When deployed behind a proxy, ensure "trust proxy" is set in express if needed.
  const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  res.json({ success: true, url: imageUrl });
});

export default router;
