/**
 * PostgreSQL Seeder for Shalah Reporting System
 * מערכת דיווח שעות של"ח - זריעת נתוני דמו למסד נתונים PostgreSQL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function seedPostgres() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shalah';
  console.log('Connecting to PostgreSQL database:', connectionString.replace(/:[^:@]+@/, ':****@'));

  const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : false
  });

  const client = await pool.connect();

  try {
    console.log('--- Applying PostgreSQL Schema ---');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema-pg.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✓ Schema applied successfully.');

    console.log('--- Clearing Existing Data ---');
    await client.query('TRUNCATE users, teacher_schedules, reports, report_days, report_attachments, audit_logs CASCADE;');

    console.log('--- Seeding Users ---');
    const users = [
      ['usr-teacher-01', 'teacher', '012345678', '0501234567', 'ישראל ישראלי', 'israel@rabin-kfs.org.il', '123456', 'תיכון רבין', 'מרכז', 'כפר סבא', 100, 1, '2026-08-01 08:00:00+03', 'usr-principal-01', 'שרה כהן', 'principal@rabin-kfs.org.il', 'usr-supervisor-01'],
      ['usr-teacher-02', 'teacher', '023456789', '0523456789', 'מיכל לוי', 'michal@rabin-kfs.org.il', '123456', 'תיכון רבין', 'מרכז', 'כפר סבא', 80, 1, '2026-08-01 08:30:00+03', 'usr-principal-01', 'שרה כהן', 'principal@rabin-kfs.org.il', 'usr-supervisor-01'],
      ['usr-teacher-03', 'teacher', '034567812', '0541234567', 'דניאל כהן', 'daniel@ironi-a-tlv.org.il', '654321', 'עירוני א\'', 'תל אביב', 'תל אביב-יפו', 100, 1, '2026-08-01 09:00:00+03', 'usr-principal-02', 'יורם פרידמן', 'principal@ironi-a.org.il', 'usr-supervisor-02'],
      ['usr-principal-01', 'principal', '034567890', '0534567890', 'שרה כהן (מנהלת)', 'principal@rabin-kfs.org.il', '123456', 'תיכון רבין', 'מרכז', 'כפר סבא', 100, 1, '2026-08-01 07:00:00+03', null, null, null, null],
      ['usr-principal-02', 'principal', '045678912', '0539876543', 'יורם פרידמן (מנהל)', 'principal@ironi-a.org.il', '654321', 'עירוני א\'', 'תל אביב', 'תל אביב-יפו', 100, 1, '2026-08-01 07:00:00+03', null, null, null, null],
      ['usr-supervisor-01', 'supervisor', '045678901', '0545678901', 'אברהם מנחה (מחוז מרכז)', 'avraham.sup@education.gov.il', null, null, 'מרכז', null, 100, 1, '2026-08-01 07:00:00+03', null, null, null, null],
      ['usr-supervisor-02', 'supervisor', '056789012', '0547654321', 'רחל שלום (מחוז תל אביב)', 'rachel.sup@education.gov.il', null, null, 'תל אביב', null, 100, 1, '2026-08-01 07:00:00+03', null, null, null, null],
      ['usr-admin-01', 'admin', '099999999', '0549999999', 'רונן ממונה ארצי', 'ronen.manager@education.gov.il', null, null, 'ארצי', null, 100, 1, '2026-08-01 06:00:00+03', null, null, null, null]
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, role, id_number, phone, full_name, email, school_code, school_name, district, municipality, job_percentage, consent_signed, consent_timestamp, principal_id, principal_name, principal_email, supervisor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      `, u);
    }
    console.log(`✓ Seeded ${users.length} users.`);

    console.log('--- Seeding Teacher Schedules ---');
    const schedules = [
      ['sch-01-0', 'usr-teacher-01', 0, 4, 0],
      ['sch-01-1', 'usr-teacher-01', 1, 6, 1], // יום שדה
      ['sch-01-2', 'usr-teacher-01', 2, 4, 0],
      ['sch-01-3', 'usr-teacher-01', 3, 6, 1], // יום שדה
      ['sch-01-4', 'usr-teacher-01', 4, 4, 0],
      ['sch-01-5', 'usr-teacher-01', 5, 0, 0],
      ['sch-02-0', 'usr-teacher-02', 0, 4, 0],
      ['sch-02-1', 'usr-teacher-02', 1, 4, 0],
      ['sch-02-2', 'usr-teacher-02', 2, 6, 1], // יום שדה
      ['sch-02-3', 'usr-teacher-02', 3, 4, 0],
      ['sch-02-4', 'usr-teacher-02', 4, 0, 0],
      ['sch-02-5', 'usr-teacher-02', 5, 0, 0]
    ];

    for (const s of schedules) {
      await client.query(`
        INSERT INTO teacher_schedules (id, user_id, day_of_week, regular_hours, is_field_day)
        VALUES ($1, $2, $3, $4, $5)
      `, s);
    }
    console.log(`✓ Seeded ${schedules.length} teacher schedules.`);

    console.log('--- Seeding Sample Report with RSA Signature ---');
    await client.query(`
      INSERT INTO reports (id, user_id, year, month, status, digital_signature_id, signature_hash, signed_by_role, signed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      'rep-2026-06-israel',
      'usr-teacher-01',
      2026,
      6,
      'approved_for_payment',
      'SHALAH-202606-A17F9D',
      'sha256-rsa2048-mock-hash-valid-payload',
      'admin'
    ]);

    await client.query(`
      INSERT INTO report_days (id, report_id, day_number, day_of_week, date_str, is_field_day, regular_hours, absence_hours, overtime_hours, grade_class, activity_description)
      VALUES 
        ('rd-2026-06-01', 'rep-2026-06-israel', 1, 0, '2026-06-01', 0, 4, 0, 0, 'ט1', 'שיעור של"ח עיוני'),
        ('rd-2026-06-02', 'rep-2026-06-israel', 2, 1, '2026-06-02', 1, 6, 0, 2, 'י2', 'סיור של"ח הרי ירושלים (שעות שדה)')
    `);

    console.log('✓ PostgreSQL Seed Completed Successfully!');
  } catch (err) {
    console.error('Error during PostgreSQL seed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedPostgres()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedPostgres };
