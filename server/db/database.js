const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'shalah.db');

let db = null;
let isNodeSqlite = false;

try {
  // Try better-sqlite3 first if installed
  const BetterSqlite3 = require('better-sqlite3');
  db = new BetterSqlite3(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (err) {
  // Fall back to built-in node:sqlite (Node.js 22.5+)
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON;');
    isNodeSqlite = true;
  } catch (innerErr) {
    console.error('Failed to initialize SQLite database:', err, innerErr);
    throw new Error('SQLite engine not available. Please install better-sqlite3 or use Node.js 22.5+');
  }
}

/**
 * Universal Database Wrapper for uniform API
 * Provides .prepare(sql).all(), .get(), .run(), and .exec(sql)
 */
class DatabaseWrapper {
  constructor(rawDb) {
    this.raw = rawDb;
  }

  exec(sql) {
    return this.raw.exec(sql);
  }

  prepare(sql) {
    const rawStmt = this.raw.prepare(sql);
    return {
      all: (...params) => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return rawStmt.all(...flatParams);
      },
      get: (...params) => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return rawStmt.get(...flatParams);
      },
      run: (...params) => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
        return rawStmt.run(...flatParams);
      }
    };
  }

  transaction(fn) {
    return (...args) => {
      this.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        this.exec('COMMIT');
        return result;
      } catch (err) {
        this.exec('ROLLBACK');
        throw err;
      }
    };
  }
}

const dbWrapper = new DatabaseWrapper(db);

/**
 * Initialize Schema
 */
function initSchema() {
  dbWrapper.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'principal', 'supervisor', 'admin')),
      id_number TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      school_code TEXT,
      school_name TEXT,
      district TEXT,
      municipality TEXT,
      job_percentage REAL DEFAULT 100,
      consent_signed INTEGER DEFAULT 0,
      consent_timestamp TEXT,
      principal_id TEXT,
      principal_name TEXT,
      principal_email TEXT,
      supervisor_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS teacher_schedules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 5),
      regular_hours REAL NOT NULL DEFAULT 0,
      is_field_day INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, day_of_week)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted_to_principal', 'principal_approved', 'supervisor_approved', 'approved_for_payment', 'returned_to_teacher', 'returned_to_supervisor')),
      principal_token TEXT UNIQUE,
      principal_notes TEXT,
      supervisor_notes TEXT,
      admin_notes TEXT,
      digital_signature_id TEXT UNIQUE,
      signature_hash TEXT,
      signature_data TEXT,
      signed_by_role TEXT,
      signed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS report_days (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 5),
      date_str TEXT NOT NULL,
      is_field_day INTEGER NOT NULL DEFAULT 0,
      is_holiday INTEGER NOT NULL DEFAULT 0,
      holiday_name TEXT,
      regular_hours REAL NOT NULL DEFAULT 0,
      absence_hours REAL NOT NULL DEFAULT 0,
      absence_reason TEXT,
      overtime_hours REAL NOT NULL DEFAULT 0,
      overtime_reason TEXT,
      grade_class TEXT,
      activity_description TEXT,
      supervisor_edited INTEGER NOT NULL DEFAULT 0,
      original_overtime_hours REAL,
      original_absence_hours REAL,
      supervisor_note TEXT,
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
      UNIQUE(report_id, day_number)
    );

    CREATE TABLE IF NOT EXISTS report_attachments (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      action TEXT NOT NULL,
      performed_by_user_id TEXT,
      performed_by_name TEXT,
      details TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_reports_user_year_month ON reports(user_id, year, month);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_principal_token ON reports(principal_token);
    CREATE INDEX IF NOT EXISTS idx_report_days_report_id ON report_days(report_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_report_id ON audit_logs(report_id);
  `);
}

// Initialize tables
initSchema();

module.exports = {
  db: dbWrapper,
  initSchema
};
