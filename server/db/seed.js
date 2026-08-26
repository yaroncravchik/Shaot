/**
 * Database Seed Script for Shalah Monthly Activity Hours Reporting System
 * Seeds realistic Israeli users, teacher weekly schedules, reports across various statuses,
 * days with overtime & absences, supervisor edits, attachments, and audit logs.
 */

const { db, initSchema } = require('./database');
const { generateMonthDays } = require('../services/calendarService');
const { signReport, generateSignatureId } = require('../services/cryptoService');

function seed() {
  console.log('--- Initializing Database Schema & Seeding Data ---');
  initSchema();

  // Clean existing data for fresh seed
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM report_attachments;
    DELETE FROM report_days;
    DELETE FROM reports;
    DELETE FROM teacher_schedules;
    DELETE FROM users;
  `);

  // 1. Seed Users
  const users = [
    // Teachers
    {
      id: 'usr_teacher_1',
      role: 'teacher',
      id_number: '012345678',
      phone: '0501234567',
      full_name: 'ישראל ישראלי',
      email: 'israel.y@school.org.il',
      school_code: '123456',
      school_name: 'תיכון רבין כפר סבא',
      district: 'מרכז',
      municipality: 'כפר סבא',
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 08:00:00',
      principal_id: 'usr_principal_1',
      principal_name: 'שרה כהן',
      principal_email: 'sara.cohen@rabin-school.k12.il',
      supervisor_id: 'usr_supervisor_1'
    },
    {
      id: 'usr_teacher_2',
      role: 'teacher',
      id_number: '023456789',
      phone: '0523456789',
      full_name: 'מיכל לוי',
      email: 'michal.levi@school.org.il',
      school_code: '123456',
      school_name: 'תיכון רבין כפר סבא',
      district: 'מרכז',
      municipality: 'כפר סבא',
      job_percentage: 80,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 08:30:00',
      principal_id: 'usr_principal_1',
      principal_name: 'שרה כהן',
      principal_email: 'sara.cohen@rabin-school.k12.il',
      supervisor_id: 'usr_supervisor_1'
    },
    {
      id: 'usr_teacher_3',
      role: 'teacher',
      id_number: '034567812',
      phone: '0541234567',
      full_name: 'דניאל כהן',
      email: 'daniel.c@school.org.il',
      school_code: '654321',
      school_name: 'עירוני א׳ תל אביב',
      district: 'תל אביב',
      municipality: 'תל אביב',
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-02 09:00:00',
      principal_id: 'usr_principal_2',
      principal_name: 'יורם פרידמן',
      principal_email: 'yoram@ironi-a.k12.il',
      supervisor_id: 'usr_supervisor_2'
    },
    // Principals
    {
      id: 'usr_principal_1',
      role: 'principal',
      id_number: '034567890',
      phone: '0534567890',
      full_name: 'שרה כהן',
      email: 'sara.cohen@rabin-school.k12.il',
      school_code: '123456',
      school_name: 'תיכון רבין כפר סבא',
      district: 'מרכז',
      municipality: 'כפר סבא',
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 07:30:00',
      principal_id: null,
      principal_name: null,
      principal_email: null,
      supervisor_id: 'usr_supervisor_1'
    },
    {
      id: 'usr_principal_2',
      role: 'principal',
      id_number: '045678912',
      phone: '0539876543',
      full_name: 'יורם פרידמן',
      email: 'yoram@ironi-a.k12.il',
      school_code: '654321',
      school_name: 'עירוני א׳ תל אביב',
      district: 'תל אביב',
      municipality: 'תל אביב',
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 07:30:00',
      principal_id: null,
      principal_name: null,
      principal_email: null,
      supervisor_id: 'usr_supervisor_2'
    },
    // Supervisors
    {
      id: 'usr_supervisor_1',
      role: 'supervisor',
      id_number: '045678901',
      phone: '0545678901',
      full_name: 'אברהם מנחה',
      email: 'avraham.supervisor@education.gov.il',
      school_code: null,
      school_name: null,
      district: 'מרכז',
      municipality: null,
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 07:00:00',
      principal_id: null,
      principal_name: null,
      principal_email: null,
      supervisor_id: null
    },
    {
      id: 'usr_supervisor_2',
      role: 'supervisor',
      id_number: '056789012',
      phone: '0547654321',
      full_name: 'רחל שלום',
      email: 'rachel.shalom@education.gov.il',
      school_code: null,
      school_name: null,
      district: 'תל אביב',
      municipality: null,
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 07:00:00',
      principal_id: null,
      principal_name: null,
      principal_email: null,
      supervisor_id: null
    },
    // Super Admin
    {
      id: 'usr_admin_1',
      role: 'admin',
      id_number: '099999999',
      phone: '0549999999',
      full_name: 'רונן ממונה ארצי',
      email: 'ronen.manager@education.gov.il',
      school_code: null,
      school_name: null,
      district: 'ארצי',
      municipality: 'ירושלים',
      job_percentage: 100,
      consent_signed: 1,
      consent_timestamp: '2026-08-01 07:00:00',
      principal_id: null,
      principal_name: null,
      principal_email: null,
      supervisor_id: null
    }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, role, id_number, phone, full_name, email, school_code, school_name,
      district, municipality, job_percentage, consent_signed, consent_timestamp,
      principal_id, principal_name, principal_email, supervisor_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  users.forEach(u => {
    insertUser.run([
      u.id, u.role, u.id_number, u.phone, u.full_name, u.email, u.school_code, u.school_name,
      u.district, u.municipality, u.job_percentage, u.consent_signed, u.consent_timestamp,
      u.principal_id, u.principal_name, u.principal_email, u.supervisor_id
    ]);
  });
  console.log(`✓ Seeded ${users.length} users.`);

  // 2. Seed Weekly Schedules
  const schedules = [
    // Teacher 1 (ישראל ישראלי): Field days on Mon(1) & Wed(3)
    { id: 'sch_t1_0', user_id: 'usr_teacher_1', day_of_week: 0, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t1_1', user_id: 'usr_teacher_1', day_of_week: 1, regular_hours: 8, is_field_day: 1 },
    { id: 'sch_t1_2', user_id: 'usr_teacher_1', day_of_week: 2, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t1_3', user_id: 'usr_teacher_1', day_of_week: 3, regular_hours: 8, is_field_day: 1 },
    { id: 'sch_t1_4', user_id: 'usr_teacher_1', day_of_week: 4, regular_hours: 4, is_field_day: 0 },
    { id: 'sch_t1_5', user_id: 'usr_teacher_1', day_of_week: 5, regular_hours: 0, is_field_day: 0 },

    // Teacher 2 (מיכל לוי): Field day on Tue(2)
    { id: 'sch_t2_0', user_id: 'usr_teacher_2', day_of_week: 0, regular_hours: 5, is_field_day: 0 },
    { id: 'sch_t2_1', user_id: 'usr_teacher_2', day_of_week: 1, regular_hours: 5, is_field_day: 0 },
    { id: 'sch_t2_2', user_id: 'usr_teacher_2', day_of_week: 2, regular_hours: 8, is_field_day: 1 },
    { id: 'sch_t2_3', user_id: 'usr_teacher_2', day_of_week: 3, regular_hours: 4, is_field_day: 0 },
    { id: 'sch_t2_4', user_id: 'usr_teacher_2', day_of_week: 4, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t2_5', user_id: 'usr_teacher_2', day_of_week: 5, regular_hours: 0, is_field_day: 0 },

    // Teacher 3 (דניאל כהן): Field day on Thu(4)
    { id: 'sch_t3_0', user_id: 'usr_teacher_3', day_of_week: 0, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t3_1', user_id: 'usr_teacher_3', day_of_week: 1, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t3_2', user_id: 'usr_teacher_3', day_of_week: 2, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t3_3', user_id: 'usr_teacher_3', day_of_week: 3, regular_hours: 6, is_field_day: 0 },
    { id: 'sch_t3_4', user_id: 'usr_teacher_3', day_of_week: 4, regular_hours: 8, is_field_day: 1 },
    { id: 'sch_t3_5', user_id: 'usr_teacher_3', day_of_week: 5, regular_hours: 0, is_field_day: 0 }
  ];

  const insertSchedule = db.prepare(`
    INSERT INTO teacher_schedules (id, user_id, day_of_week, regular_hours, is_field_day)
    VALUES (?, ?, ?, ?, ?)
  `);

  schedules.forEach(s => {
    insertSchedule.run([s.id, s.user_id, s.day_of_week, s.regular_hours, s.is_field_day]);
  });
  console.log(`✓ Seeded ${schedules.length} teacher schedules.`);

  // 3. Helper to insert a full report
  const insertReport = db.prepare(`
    INSERT INTO reports (
      id, user_id, year, month, status, principal_token, principal_notes,
      supervisor_notes, admin_notes, digital_signature_id, signature_hash,
      signature_data, signed_by_role, signed_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDay = db.prepare(`
    INSERT INTO report_days (
      id, report_id, day_number, day_of_week, date_str, is_field_day, is_holiday, holiday_name,
      regular_hours, absence_hours, absence_reason, overtime_hours, overtime_reason,
      grade_class, activity_description, supervisor_edited, original_overtime_hours,
      original_absence_hours, supervisor_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Report 1: Teacher 1 - June 2026 -> APPROVED FOR PAYMENT (Fully Signed with RSA)
  const rep1Id = 'rep_2026_06_usr_teacher_1';
  const t1Schedule = schedules.filter(s => s.user_id === 'usr_teacher_1');
  const juneDays = generateMonthDays(2026, 6, t1Schedule);

  // Add some realistic activities
  let rep1Reg = 0, rep1Abs = 0, rep1Ot = 0;
  juneDays.forEach(d => {
    rep1Reg += d.regular_hours;
    if (d.is_field_day && d.day_number === 8) {
      d.overtime_hours = 3;
      d.overtime_reason = 'הדרכת סיור שדה כרמל חוף';
      d.grade_class = 'שכבה ט׳';
      d.activity_description = 'סיור של"ח בנושא התיישבות ונוף בכרמל';
      rep1Ot += 3;
    } else if (d.is_field_day && d.day_number === 17) {
      d.overtime_hours = 4;
      d.overtime_reason = 'הכנת מסלול והובלת סיור נחל שופט';
      d.grade_class = 'שכבה י׳';
      d.activity_description = 'סיור שדה בנחל שופט ורמות מנשה';
      rep1Ot += 4;
    } else if (d.day_number === 21) {
      d.absence_hours = 6;
      d.absence_reason = 'השתלמות של"ח ארצית';
      rep1Abs += 6;
    }
  });

  const rep1SignResult = signReport({
    id: rep1Id,
    user_id: 'usr_teacher_1',
    teacher_name: 'ישראל ישראלי',
    id_number: '012345678',
    school_code: '123456',
    school_name: 'תיכון רבין כפר סבא',
    district: 'מרכז',
    year: 2026,
    month: 6,
    total_regular_hours: rep1Reg,
    total_absence_hours: rep1Abs,
    total_overtime_hours: rep1Ot,
    total_approved_overtime_hours: rep1Ot,
    days: juneDays
  }, 'admin');

  insertReport.run([
    rep1Id,
    'usr_teacher_1',
    2026,
    6,
    'approved_for_payment',
    'token-sec-rep1-approved',
    'מאושר. עבודה מצוינת.',
    'הדוח נבדק ותואם את תוכנית הסיורים השנתית.',
    'מאושר לתשלום שכר.',
    rep1SignResult.signatureId,
    rep1SignResult.signatureHash,
    rep1SignResult.signatureData,
    'admin',
    rep1SignResult.signedAt,
    '2026-06-25 10:00:00',
    '2026-07-03 14:30:00'
  ]);

  juneDays.forEach(d => {
    insertDay.run([
      `day_${rep1Id}_${d.day_number}`,
      rep1Id,
      d.day_number,
      d.day_of_week,
      d.date_str,
      d.is_field_day,
      d.is_holiday,
      d.holiday_name,
      d.regular_hours,
      d.absence_hours,
      d.absence_reason,
      d.overtime_hours,
      d.overtime_reason,
      d.grade_class,
      d.activity_description,
      0,
      null,
      null,
      null
    ]);
  });

  insertAudit.run(['aud_1_1', rep1Id, 'created_draft', 'usr_teacher_1', 'ישראל ישראלי', 'יצירת טיוטת דוח', '2026-06-25 10:00:00']);
  insertAudit.run(['aud_1_2', rep1Id, 'submitted_to_principal', 'usr_teacher_1', 'ישראל ישראלי', 'הגשת דוח למנהלת בי"ס', '2026-06-28 12:15:00']);
  insertAudit.run(['aud_1_3', rep1Id, 'principal_approved', 'usr_principal_1', 'שרה כהן', 'אישור מנהלת', '2026-06-29 09:30:00']);
  insertAudit.run(['aud_1_4', rep1Id, 'supervisor_approved', 'usr_supervisor_1', 'אברהם מנחה', 'אישור מנחה מחוזי', '2026-07-01 11:00:00']);
  insertAudit.run(['aud_1_5', rep1Id, 'admin_approved_payment', 'usr_admin_1', 'רונן ממונה ארצי', `אישור סופי לתשלום וחתימה דיגיטלית (${rep1SignResult.signatureId})`, '2026-07-03 14:30:00']);

  // Report 2: Teacher 1 - July 2026 -> SUPERVISOR APPROVED (with supervisor edits highlighted)
  const rep2Id = 'rep_2026_07_usr_teacher_1';
  const julyDays = generateMonthDays(2026, 7, t1Schedule);

  julyDays.forEach(d => {
    if (d.day_number === 6) {
      d.overtime_hours = 2; // Edited down by supervisor from 4 to 2
      d.original_overtime_hours = 4;
      d.overtime_reason = 'הכנת מפת ניווט';
      d.grade_class = 'שכבה ח׳';
      d.activity_description = 'הכנת מסלול ניווט בית ספרי';
      d.supervisor_edited = 1;
      d.supervisor_note = 'אושר חלקי: לפי נוהל של"ח שעות הכנה מאושרות עד 2 שעות.';
    } else if (d.day_number === 15) {
      d.overtime_hours = 3;
      d.overtime_reason = 'סדנת מנהיגות צעירה';
      d.grade_class = 'שכבה ט׳';
      d.activity_description = 'הדרכת מש"צים';
    }
  });

  insertReport.run([
    rep2Id,
    'usr_teacher_1',
    2026,
    7,
    'supervisor_approved',
    'token-sec-rep2-july',
    'מאושר על ידי המנהלת.',
    'בוצע תיקון שעות ביום 6/7 בהתאם להנחיות חוזר מפמ"ר.',
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-07-25 11:00:00',
    '2026-08-02 16:00:00'
  ]);

  julyDays.forEach(d => {
    insertDay.run([
      `day_${rep2Id}_${d.day_number}`,
      rep2Id,
      d.day_number,
      d.day_of_week,
      d.date_str,
      d.is_field_day,
      d.is_holiday,
      d.holiday_name,
      d.regular_hours,
      d.absence_hours,
      d.absence_reason,
      d.overtime_hours,
      d.overtime_reason,
      d.grade_class,
      d.activity_description,
      d.supervisor_edited || 0,
      d.original_overtime_hours || null,
      d.original_absence_hours || null,
      d.supervisor_note || null
    ]);
  });

  insertAudit.run(['aud_2_1', rep2Id, 'created_draft', 'usr_teacher_1', 'ישראל ישראלי', 'יצירת טיוטה', '2026-07-25 11:00:00']);
  insertAudit.run(['aud_2_2', rep2Id, 'submitted_to_principal', 'usr_teacher_1', 'ישראל ישראלי', 'הגשה למנהלת', '2026-07-28 09:00:00']);
  insertAudit.run(['aud_2_3', rep2Id, 'principal_approved', 'usr_principal_1', 'שרה כהן', 'אישור מנהלת', '2026-07-29 10:30:00']);
  insertAudit.run(['aud_2_4', rep2Id, 'supervisor_edited', 'usr_supervisor_1', 'אברהם מנחה', 'עדכון שעות שדה ביום 6/7 מ-4 שעות ל-2 שעות', '2026-08-02 15:45:00']);
  insertAudit.run(['aud_2_5', rep2Id, 'supervisor_approved', 'usr_supervisor_1', 'אברהם מנחה', 'אישור מנחה והעברה לממונה ארצי', '2026-08-02 16:00:00']);

  // Report 3: Teacher 1 - August 2026 -> DRAFT (Current Month)
  const rep3Id = 'rep_2026_08_usr_teacher_1';
  const augDays = generateMonthDays(2026, 8, t1Schedule);

  augDays.forEach(d => {
    if (d.day_number === 3) {
      d.overtime_hours = 2;
      d.overtime_reason = 'הכנת מערכי שיעור פתיחת שנה';
      d.activity_description = 'תכנון שנתי';
    }
  });

  insertReport.run([
    rep3Id,
    'usr_teacher_1',
    2026,
    8,
    'draft',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-08-10 09:00:00',
    '2026-08-20 12:00:00'
  ]);

  augDays.forEach(d => {
    insertDay.run([
      `day_${rep3Id}_${d.day_number}`,
      rep3Id,
      d.day_number,
      d.day_of_week,
      d.date_str,
      d.is_field_day,
      d.is_holiday,
      d.holiday_name,
      d.regular_hours,
      d.absence_hours,
      d.absence_reason,
      d.overtime_hours,
      d.overtime_reason,
      d.grade_class,
      d.activity_description,
      0,
      null,
      null,
      null
    ]);
  });

  insertAudit.run(['aud_3_1', rep3Id, 'created_draft', 'usr_teacher_1', 'ישראל ישראלי', 'יצירת טיוטת חודש אוגוסט', '2026-08-10 09:00:00']);

  // Report 4: Teacher 2 (מיכל לוי) - August 2026 -> SUBMITTED TO PRINCIPAL (with secure principal token)
  const rep4Id = 'rep_2026_08_usr_teacher_2';
  const t2Schedule = schedules.filter(s => s.user_id === 'usr_teacher_2');
  const t2AugDays = generateMonthDays(2026, 8, t2Schedule);

  t2AugDays.forEach(d => {
    if (d.is_field_day && d.day_number === 4) {
      d.overtime_hours = 4;
      d.overtime_reason = 'הדרכת סיור הכנה למש"צים';
      d.grade_class = 'שכבה ט׳';
      d.activity_description = 'סיור הכנה להנהגת מש"צים ביער בן שמן';
    }
  });

  const rep4PrincipalToken = 'token-sec-rabin-202608-mlevi';

  insertReport.run([
    rep4Id,
    'usr_teacher_2',
    2026,
    8,
    'submitted_to_principal',
    rep4PrincipalToken,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-08-25 14:00:00',
    '2026-08-25 14:30:00'
  ]);

  t2AugDays.forEach(d => {
    insertDay.run([
      `day_${rep4Id}_${d.day_number}`,
      rep4Id,
      d.day_number,
      d.day_of_week,
      d.date_str,
      d.is_field_day,
      d.is_holiday,
      d.holiday_name,
      d.regular_hours,
      d.absence_hours,
      d.absence_reason,
      d.overtime_hours,
      d.overtime_reason,
      d.grade_class,
      d.activity_description,
      0,
      null,
      null,
      null
    ]);
  });

  insertAudit.run(['aud_4_1', rep4Id, 'created_draft', 'usr_teacher_2', 'מיכל לוי', 'יצירת טיוטה', '2026-08-25 14:00:00']);
  insertAudit.run(['aud_4_2', rep4Id, 'submitted_to_principal', 'usr_teacher_2', 'מיכל לוי', 'הגשת דוח חודש אוגוסט למנהלת (שרה כהן)', '2026-08-25 14:30:00']);

  // Report 5: Teacher 3 (דניאל כהן) - August 2026 -> RETURNED TO TEACHER
  const rep5Id = 'rep_2026_08_usr_teacher_3';
  const t3Schedule = schedules.filter(s => s.user_id === 'usr_teacher_3');
  const t3AugDays = generateMonthDays(2026, 8, t3Schedule);

  t3AugDays.forEach(d => {
    if (d.day_number === 11 || d.day_number === 12) {
      d.absence_hours = 6;
      d.absence_reason = 'מילואים';
    }
  });

  insertReport.run([
    rep5Id,
    'usr_teacher_3',
    2026,
    8,
    'returned_to_teacher',
    'token-sec-ironia-202608-dcohen',
    'נא לצרף אישור שמ"פ (מילואים) עבור הימים 11-12/8/2026.',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '2026-08-24 10:00:00',
    '2026-08-25 09:00:00'
  ]);

  t3AugDays.forEach(d => {
    insertDay.run([
      `day_${rep5Id}_${d.day_number}`,
      rep5Id,
      d.day_number,
      d.day_of_week,
      d.date_str,
      d.is_field_day,
      d.is_holiday,
      d.holiday_name,
      d.regular_hours,
      d.absence_hours,
      d.absence_reason,
      d.overtime_hours,
      d.overtime_reason,
      d.grade_class,
      d.activity_description,
      0,
      null,
      null,
      null
    ]);
  });

  insertAudit.run(['aud_5_1', rep5Id, 'created_draft', 'usr_teacher_3', 'דניאל כהן', 'יצירת טיוטה', '2026-08-24 10:00:00']);
  insertAudit.run(['aud_5_2', rep5Id, 'submitted_to_principal', 'usr_teacher_3', 'דניאל כהן', 'הגשה למנהל (יורם פרידמן)', '2026-08-24 17:00:00']);
  insertAudit.run(['aud_5_3', rep5Id, 'principal_rejected', 'usr_principal_2', 'יורם פרידמן', 'החזרה למורה: נא לצרף אישור שמ"פ עבור הימים 11-12/8/2026', '2026-08-25 09:00:00']);

  console.log('✓ Seeded 5 sample reports with full days, audit logs, and status transitions.');
  console.log('--- Seed Completed Successfully ---');
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
