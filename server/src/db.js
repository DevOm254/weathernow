const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'weathernow.db');
const db = new Database(dbPath);

// Enable WAL mode for high performance & concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anonymous_user_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_weather_check DATETIME,
      location_sharing_enabled INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS location_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL,
      city TEXT,
      state TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS weather_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      location TEXT NOT NULL,
      temperature REAL,
      weather_condition TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      admin_email TEXT,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_anon ON users(anonymous_user_id);
    CREATE INDEX IF NOT EXISTS idx_location_updates_user ON location_updates(user_id);
    CREATE INDEX IF NOT EXISTS idx_weather_checks_user ON weather_checks(user_id);
  `);

  // Seed default admin if none exists
  const existingAdmin = db.prepare('SELECT id FROM admins WHERE email = ?').get('admin@weathernow.local');
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('AdminPass@123', salt);
    db.prepare(`
      INSERT INTO admins (email, password_hash, role)
      VALUES (?, ?, ?)
    `).run('admin@weathernow.local', hash, 'superadmin');
    console.log('[DB] Seeded default admin: admin@weathernow.local / AdminPass@123');
  }
}

initDb();

module.exports = db;
