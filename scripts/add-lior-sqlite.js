const db = require('../server/db/database').db;
const cleanId = '547618877';
const existing = db.prepare('SELECT * FROM users WHERE id_number = ? OR id = ?').get(cleanId, cleanId);
if (existing) {
  console.log('Already in SQLite:', existing.id);
} else {
  const sql = `INSERT INTO users (
    id, id_number, phone, password, full_name, role, email,
    school_code, school_name, district, municipality, job_percentage,
    consent_signed, principal_name, principal_email, supervisor_id, created_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?, datetime('now')
  )`;
  db.prepare(sql).run(
    cleanId, cleanId, '', '1234', 'ליאור קפלן', 'teacher', `${cleanId}@education.gov.il`,
    '123456', 'תיכון מחוזי', 'מרכז', 'מרכז', 100,
    1, 'מנהל/ת מוסד', 'principal@school.gov.il', 'פנינה'
  );
  console.log('Added to SQLite successfully');
}
