-- =========================================================================
-- Shalah Monthly Activity Hours Reporting System - PostgreSQL Schema
-- מערכת דיווח שעות פעילות חודשית של"ח - סכמת בסיס נתונים ל-PostgreSQL
-- =========================================================================

-- 1. טבלת משתמשים והרשאות
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  role VARCHAR(32) NOT NULL CHECK(role IN ('teacher', 'principal', 'supervisor', 'admin')),
  id_number VARCHAR(16) UNIQUE NOT NULL,
  phone VARCHAR(32) NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  email VARCHAR(128) NOT NULL,
  school_code VARCHAR(32),
  school_name VARCHAR(128),
  district VARCHAR(64),
  municipality VARCHAR(64),
  job_percentage NUMERIC(5, 2) DEFAULT 100,
  consent_signed SMALLINT DEFAULT 0,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  principal_id VARCHAR(64),
  principal_name VARCHAR(128),
  principal_email VARCHAR(128),
  supervisor_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. טבלת מערכת שעות שבועית קבועה של המורה (א'-ו')
CREATE TABLE IF NOT EXISTS teacher_schedules (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK(day_of_week BETWEEN 0 AND 5),
  regular_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,
  is_field_day SMALLINT NOT NULL DEFAULT 0,
  UNIQUE(user_id, day_of_week)
);

-- 3. טבלת דוחות חודשיים ומחזור חיים
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted_to_principal', 'principal_approved', 'supervisor_approved', 'approved_for_payment', 'returned_to_teacher', 'returned_to_supervisor')),
  principal_token VARCHAR(128) UNIQUE,
  principal_notes TEXT,
  supervisor_notes TEXT,
  admin_notes TEXT,
  digital_signature_id VARCHAR(128) UNIQUE,
  signature_hash TEXT,
  signature_data TEXT,
  signed_by_role VARCHAR(32),
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

-- 4. טבלת שורות דיווח יומיות בחודש (א'-ו' ללא שבתות)
CREATE TABLE IF NOT EXISTS report_days (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  day_number SMALLINT NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK(day_of_week BETWEEN 0 AND 5),
  date_str VARCHAR(16) NOT NULL,
  is_field_day SMALLINT NOT NULL DEFAULT 0,
  is_holiday SMALLINT NOT NULL DEFAULT 0,
  holiday_name VARCHAR(128),
  regular_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,
  absence_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,
  absence_reason TEXT,
  overtime_hours NUMERIC(4, 2) NOT NULL DEFAULT 0,
  overtime_reason TEXT,
  grade_class VARCHAR(64),
  activity_description TEXT,
  supervisor_edited SMALLINT NOT NULL DEFAULT 0,
  original_overtime_hours NUMERIC(4, 2),
  original_absence_hours NUMERIC(4, 2),
  supervisor_note TEXT,
  UNIQUE(report_id, day_number)
);

-- 5. טבלת נספחים ואישורים (עד 10MB לקובץ)
CREATE TABLE IF NOT EXISTS report_attachments (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  original_filename VARCHAR(256) NOT NULL,
  stored_filename VARCHAR(256) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. טבלת יומן ביקורת (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  report_id VARCHAR(64) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  performed_by_user_id VARCHAR(64),
  performed_by_name VARCHAR(128),
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- אינדקסים לביצועים מרביים
CREATE INDEX IF NOT EXISTS idx_pg_reports_user_year_month ON reports(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pg_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_pg_reports_principal_token ON reports(principal_token);
CREATE INDEX IF NOT EXISTS idx_pg_report_days_report_id ON report_days(report_id);
CREATE INDEX IF NOT EXISTS idx_pg_audit_logs_report_id ON audit_logs(report_id);
