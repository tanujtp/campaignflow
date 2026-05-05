import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'crm.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      // Create settings table
      db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )`);

      // Create campaigns table
      db.run(`CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        template_subject TEXT NOT NULL,
        template_body TEXT NOT NULL,
        pacing_seconds INTEGER DEFAULT 3,
        status TEXT DEFAULT 'draft', -- draft, running, paused, completed
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Create recipients table
      db.run(`CREATE TABLE IF NOT EXISTS recipients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER,
        email TEXT NOT NULL,
        merge_fields TEXT, -- JSON string
        status TEXT DEFAULT 'queued', -- queued, sent, failed, opened, replied, bounced
        message_id TEXT,
        thread_id TEXT,
        sent_at DATETIME,
        opened_at DATETIME,
        replied_at DATETIME,
        bounced_at DATETIME,
        error_reason TEXT,
        FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
      )`);

      // Create events table
      db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_id INTEGER,
        event_type TEXT NOT NULL, -- sent, opened, replied, bounced, failed
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT, -- JSON string
        FOREIGN KEY(recipient_id) REFERENCES recipients(id)
      )`);
    });
  }
});

// Helper for running queries with async/await
export const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error running query', sql, err);
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
};

export const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, result) => {
      if (err) {
        console.error('Error getting query', sql, err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

export const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Error running all query', sql, err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export default db;
