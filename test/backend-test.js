/**
 * Comprehensive Backend Infrastructure & Workflow Test Suite
 * Tests SQLite DB, Services, Crypto RSA signing, Calendar, Excel generation, and API flows.
 */

const assert = require('assert');
const { db, initSchema } = require('../server/db/database');
const { seed } = require('../server/db/seed');
const { getAvailableMonths, generateMonthDays } = require('../server/services/calendarService');
const { signReport, verifySignature, canonicalizePayload } = require('../server/services/cryptoService');
const { generateSingleReportExcel, generateReportsSummaryExcel } = require('../server/services/excelService');

async function runTests() {
  console.log('\n============================================================');
  console.log('  STARTING SHALAH BACKEND INFRASTRUCTURE & WORKFLOW TESTS  ');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✔ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✖ [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Database & Seed
  test('1. Database Initialization & Seeding', () => {
    seed();
    const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const schedules = db.prepare('SELECT COUNT(*) as c FROM teacher_schedules').get().c;
    const reports = db.prepare('SELECT COUNT(*) as c FROM reports').get().c;
    const days = db.prepare('SELECT COUNT(*) as c FROM report_days').get().c;
    const logs = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;

    assert.ok(users >= 8, `Expected at least 8 users, got ${users}`);
    assert.ok(schedules >= 18, `Expected at least 18 schedule entries, got ${schedules}`);
    assert.ok(reports >= 5, `Expected at least 5 reports, got ${reports}`);
    assert.ok(days >= 100, `Expected at least 100 report days, got ${days}`);
    assert.ok(logs >= 10, `Expected at least 10 audit logs, got ${logs}`);
  });

  // 2. User Roles & Auth Checks
  test('2. User Auth & Role Lookups', () => {
    const teacher = db.prepare('SELECT * FROM users WHERE id_number = ?').get('012345678');
    assert.strictEqual(teacher.role, 'teacher');
    assert.strictEqual(teacher.full_name, 'ישראל ישראלי');
    assert.strictEqual(teacher.district, 'מרכז');

    const principal = db.prepare('SELECT * FROM users WHERE id_number = ?').get('034567890');
    assert.strictEqual(principal.role, 'principal');
    assert.strictEqual(principal.school_name, 'תיכון רבין כפר סבא');

    const supervisor = db.prepare('SELECT * FROM users WHERE id_number = ?').get('045678901');
    assert.strictEqual(supervisor.role, 'supervisor');
    assert.strictEqual(supervisor.district, 'מרכז');

    const admin = db.prepare('SELECT * FROM users WHERE id_number = ?').get('099999999');
    assert.strictEqual(admin.role, 'admin');
    assert.strictEqual(admin.full_name, 'רונן ממונה מחוז מרכז');
  });

  // 3. Calendar & Holiday Service
  test('3. Calendar Generation (Excluding Saturdays & Hebrew Holidays)', () => {
    const months = getAvailableMonths(new Date(2026, 7, 15)); // August 2026
    assert.strictEqual(months.length, 4);
    assert.ok(months.some(m => m.month === 8 && m.year === 2026 && m.isCurrent));

    const t1Schedule = db.prepare('SELECT * FROM teacher_schedules WHERE user_id = ?').all('usr_teacher_1');
    const augDays = generateMonthDays(2026, 8, t1Schedule);

    // Ensure NO Saturdays (day_of_week === 6)
    const hasSaturdays = augDays.some(d => d.day_of_week === 6);
    assert.strictEqual(hasSaturdays, false, 'Calendar must not contain Saturdays');

    // Ensure field days match schedule
    const mondayDays = augDays.filter(d => d.day_of_week === 1);
    assert.ok(mondayDays.length > 0);
    assert.strictEqual(mondayDays[0].is_field_day, 1, 'Teacher 1 Monday must be a field day');
    assert.strictEqual(mondayDays[0].regular_hours, 8, 'Teacher 1 Monday regular hours must be 8');
  });

  // 4. RSA 2048-bit Cryptographic Signing & Verification
  test('4. RSA 2048-bit Cryptographic Signing & Public Verification', () => {
    const payload = {
      id: 'rep_test_crypto',
      user_id: 'usr_teacher_1',
      teacher_name: 'ישראל ישראלי',
      id_number: '012345678',
      school_code: '123456',
      school_name: 'תיכון רבין כפר סבא',
      district: 'מרכז',
      year: 2026,
      month: 8,
      total_regular_hours: 120,
      total_absence_hours: 0,
      total_overtime_hours: 15,
      total_approved_overtime_hours: 15,
      days: [
        { day_number: 3, regular_hours: 6, absence_hours: 0, overtime_hours: 3, supervisor_edited: 0 }
      ]
    };

    const signResult = signReport(payload, 'admin');
    assert.ok(signResult.signatureId.startsWith('SHALAH-202608-'));
    assert.ok(signResult.signatureHash.length === 64, 'SHA-256 hash must be 64 hex chars');
    assert.ok(signResult.signatureData.length > 100, 'RSA signature must be generated');

    const canonical = signResult.canonicalPayload;
    const isValid = verifySignature(canonical, signResult.signatureData, signResult.publicKey);
    assert.strictEqual(isValid, true, 'Cryptographic verification must return true');

    // Tampering test: altering a value must invalidate signature
    const tamperedCanonical = canonical.replace('"totalOvertimeHours":15', '"totalOvertimeHours":99');
    const isTamperedValid = verifySignature(tamperedCanonical, signResult.signatureData, signResult.publicKey);
    assert.strictEqual(isTamperedValid, false, 'Tampered payload verification must fail');
  });

  // 5. Excel Generation Service
  await asyncTest('5. RTL Excel Generation (Single Report & District Summary)', async () => {
    const report = db.prepare(`
      SELECT r.*, u.full_name as teacher_name, u.id_number, u.school_name, u.school_code, u.district, u.job_percentage
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = 'rep_2026_06_usr_teacher_1'
    `).get();

    report.days = db.prepare('SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC').all(report.id);

    const singleExcelBuffer = await generateSingleReportExcel(report);
    assert.ok(singleExcelBuffer && singleExcelBuffer.length > 1000, 'Excel buffer must be generated');

    const allReports = db.prepare(`
      SELECT r.*, u.full_name as teacher_name, u.id_number, u.phone, u.school_name, u.school_code, u.district
      FROM reports r
      JOIN users u ON r.user_id = u.id
    `).all();

    const summaryExcelBuffer = await generateReportsSummaryExcel(allReports, 'דוח ריכוז מחוזי');
    assert.ok(summaryExcelBuffer && summaryExcelBuffer.length > 1000, 'Summary Excel buffer must be generated');
  });

  // 6. Workflow Lifecycle: Teacher -> Principal -> Supervisor -> Admin
  test('6. Complete Lifecycle & Field Day Business Logic Enforcement', () => {
    // 1. Teacher creates draft
    const draftRepId = 'rep_test_lifecycle_2026_09';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      INSERT OR REPLACE INTO reports (id, user_id, year, month, status, created_at, updated_at)
      VALUES (?, 'usr_teacher_1', 2026, 9, 'draft', ?, ?)
    `).run(draftRepId, now, now);

    const days = generateMonthDays(2026, 9, [
      { day_of_week: 1, regular_hours: 8, is_field_day: 1 }
    ]);

    const insertDay = db.prepare(`
      INSERT OR REPLACE INTO report_days (
        id, report_id, day_number, day_of_week, date_str, is_field_day, is_holiday,
        regular_hours, absence_hours, overtime_hours, overtime_reason, activity_description
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `);

    days.forEach(d => {
      // In field day (Monday), let's populate overtime and reason
      const isMon = d.day_of_week === 1;
      insertDay.run(
        `day_${draftRepId}_${d.day_number}`,
        draftRepId,
        d.day_number,
        d.day_of_week,
        d.date_str,
        isMon ? 1 : 0,
        d.regular_hours,
        0,
        isMon ? 3 : 0,
        isMon ? 'סיור הכנה' : null,
        isMon ? 'סיור שדה הרי ירושלים' : null
      );
    });

    // 2. Submit to Principal -> generates secure token and locks
    const pToken = 'sec-test-token-lifecycle';
    db.prepare(`
      UPDATE reports SET status = 'submitted_to_principal', principal_token = ? WHERE id = ?
    `).run(pToken, draftRepId);

    let repCheck = db.prepare('SELECT * FROM reports WHERE id = ?').get(draftRepId);
    assert.strictEqual(repCheck.status, 'submitted_to_principal');
    assert.strictEqual(repCheck.principal_token, pToken);

    // 3. Principal Approves via token
    db.prepare(`
      UPDATE reports SET status = 'principal_approved', principal_notes = 'מאושר על ידי שרה כהן' WHERE principal_token = ?
    `).run(pToken);

    repCheck = db.prepare('SELECT * FROM reports WHERE id = ?').get(draftRepId);
    assert.strictEqual(repCheck.status, 'principal_approved');

    // 4. Supervisor Performs Inline Hour Edit & Approves
    db.prepare(`
      UPDATE report_days SET
        overtime_hours = 2,
        supervisor_edited = 1,
        original_overtime_hours = 3,
        supervisor_note = 'תיקון מנחה: מאושר עד שעתיים'
      WHERE report_id = ? AND day_of_week = 1 AND day_number = (SELECT MIN(day_number) FROM report_days WHERE report_id = ? AND day_of_week = 1)
    `).run(draftRepId, draftRepId);

    db.prepare(`
      UPDATE reports SET status = 'supervisor_approved', supervisor_notes = 'בוצע עדכון שעות סיור' WHERE id = ?
    `).run(draftRepId);

    repCheck = db.prepare('SELECT * FROM reports WHERE id = ?').get(draftRepId);
    assert.strictEqual(repCheck.status, 'supervisor_approved');

    const editedDay = db.prepare('SELECT * FROM report_days WHERE report_id = ? AND supervisor_edited = 1').get(draftRepId);
    assert.ok(editedDay, 'Day must be marked as supervisor_edited');
    assert.strictEqual(editedDay.overtime_hours, 2);
    assert.strictEqual(editedDay.original_overtime_hours, 3);

    // 5. Super Admin Approves for Payment & Signs Cryptographically
    const signRes = signReport({
      id: draftRepId,
      user_id: 'usr_teacher_1',
      teacher_name: 'ישראל ישראלי',
      id_number: '012345678',
      year: 2026,
      month: 9,
      total_regular_hours: 100,
      total_absence_hours: 0,
      total_overtime_hours: 2,
      total_approved_overtime_hours: 2,
      days: db.prepare('SELECT * FROM report_days WHERE report_id = ?').all(draftRepId)
    }, 'admin');

    db.prepare(`
      UPDATE reports SET
        status = 'approved_for_payment',
        digital_signature_id = ?,
        signature_hash = ?,
        signature_data = ?,
        signed_by_role = 'admin',
        signed_at = ?
      WHERE id = ?
    `).run(signRes.signatureId, signRes.signatureHash, signRes.signatureData, signRes.signedAt, draftRepId);

    repCheck = db.prepare('SELECT * FROM reports WHERE id = ?').get(draftRepId);
    assert.strictEqual(repCheck.status, 'approved_for_payment');
    assert.ok(repCheck.digital_signature_id);
    assert.ok(repCheck.signature_hash);
    assert.ok(repCheck.signature_data);
  });

  // 7. Site Admin Capabilities: Adding Admins, Supervisors, Teachers and Deleting Reports
  test('7. Site Admin: Create Roles & Delete Reports', () => {
    // 7.1 Verify site admin user exists
    const siteAdmin = db.prepare('SELECT * FROM users WHERE role = ?').get('site_admin');
    assert.ok(siteAdmin, 'Site admin user must exist');
    assert.strictEqual(siteAdmin.id_number, 'siteadmin');

    // 7.2 Create a new Admin (ממונה)
    const newAdminId = 'usr_admin_test_1';
    db.prepare(`
      INSERT INTO users (id, role, id_number, phone, full_name, email, district, municipality, job_percentage, consent_signed)
      VALUES (?, 'admin', 'test_admin_user', '0501112233', 'ממונה בדיקה', 'test.admin@education.gov.il', 'דרום', 'באר שבע', 100, 1)
    `).run(newAdminId);

    const checkAdmin = db.prepare('SELECT * FROM users WHERE id = ?').get(newAdminId);
    assert.strictEqual(checkAdmin.full_name, 'ממונה בדיקה');
    assert.strictEqual(checkAdmin.role, 'admin');
    assert.strictEqual(checkAdmin.district, 'דרום');

    // 7.3 Create a new Supervisor (מנחה)
    const newSupId = 'usr_sup_test_1';
    db.prepare(`
      INSERT INTO users (id, role, id_number, phone, full_name, email, district, municipality, job_percentage, consent_signed)
      VALUES (?, 'supervisor', 'test_sup_user', '0502223344', 'מנחה בדיקה', 'test.sup@education.gov.il', 'דרום', 'באר שבע', 100, 1)
    `).run(newSupId);

    const checkSup = db.prepare('SELECT * FROM users WHERE id = ?').get(newSupId);
    assert.strictEqual(checkSup.full_name, 'מנחה בדיקה');
    assert.strictEqual(checkSup.role, 'supervisor');

    // 7.4 Create a new Teacher (מורה) assigned to the supervisor
    const newTchId = 'usr_tch_test_1';
    db.prepare(`
      INSERT INTO users (id, role, id_number, phone, full_name, email, school_code, school_name, district, municipality, supervisor_id, job_percentage, consent_signed)
      VALUES (?, 'teacher', 'test_tch_user', '0503334455', 'מורה בדיקה', 'test.tch@school.org.il', '550123', 'תיכון דרום', 'דרום', 'באר שבע', ?, 100, 1)
    `).run(newTchId, newSupId);

    const checkTch = db.prepare('SELECT * FROM users WHERE id = ?').get(newTchId);
    assert.strictEqual(checkTch.full_name, 'מורה בדיקה');
    assert.strictEqual(checkTch.role, 'teacher');
    assert.strictEqual(checkTch.supervisor_id, newSupId);

    // 7.5 Create and then Delete a Report
    const testRepId = 'rep_test_to_delete';
    db.prepare(`
      INSERT INTO reports (id, user_id, year, month, status)
      VALUES (?, ?, 2026, 10, 'draft')
    `).run(testRepId, newTchId);

    db.prepare(`
      INSERT INTO report_days (id, report_id, day_number, day_of_week, date_str, regular_hours, overtime_hours)
      VALUES ('day_test_del_1', ?, 1, 0, '2026-10-01', 6, 2)
    `).run(testRepId);

    // Verify report exists
    assert.ok(db.prepare('SELECT * FROM reports WHERE id = ?').get(testRepId));
    assert.ok(db.prepare('SELECT * FROM report_days WHERE report_id = ?').get(testRepId));

    // Delete report and child records
    db.prepare('DELETE FROM report_days WHERE report_id = ?').run(testRepId);
    db.prepare('DELETE FROM reports WHERE id = ?').run(testRepId);

    // Verify report is deleted
    assert.strictEqual(db.prepare('SELECT * FROM reports WHERE id = ?').get(testRepId), undefined);
    assert.strictEqual(db.prepare('SELECT * FROM report_days WHERE report_id = ?').get(testRepId), undefined);
  });

  // 8. Edit Users (Teachers & Supervisors)
  test('8. Update Teacher and Supervisor Details', () => {
    const userToEdit = db.prepare('SELECT * FROM users WHERE id = ?').get('usr_teacher_1');
    assert.ok(userToEdit);

    // Update teacher details
    db.prepare(`
      UPDATE users SET
        full_name = ?,
        school_name = ?,
        school_code = ?,
        job_percentage = ?
      WHERE id = ?
    `).run('ישראל ישראלי מעודכן', 'תיכון חדש כפר סבא', '654321', 80, 'usr_teacher_1');

    const updatedTch = db.prepare('SELECT * FROM users WHERE id = ?').get('usr_teacher_1');
    assert.strictEqual(updatedTch.full_name, 'ישראל ישראלי מעודכן');
    assert.strictEqual(updatedTch.school_name, 'תיכון חדש כפר סבא');
    assert.strictEqual(updatedTch.school_code, '654321');
    assert.strictEqual(updatedTch.job_percentage, 80);

    // Update supervisor details
    db.prepare(`
      UPDATE users SET
        full_name = ?,
        phone = ?
      WHERE id = ?
    `).run('אברהם מנחה בכיר', '0541112233', 'usr_supervisor_1');

    const updatedSup = db.prepare('SELECT * FROM users WHERE id = ?').get('usr_supervisor_1');
    assert.strictEqual(updatedSup.full_name, 'אברהם מנחה בכיר');
    assert.strictEqual(updatedSup.phone, '0541112233');
  });

  // 9. Overtime Reasons & Daily Hours Threshold Exceeded Rule
  test('9. Overtime Reason Options and Threshold Rule (>10 Hours Exemption)', () => {
    const validReasons = ['יום שדה', 'גיחה', 'מסע', 'מש"צים', 'אחר'];

    function isDailyHoursExceeded(fixed, overtime, reason) {
      if (reason === 'גיחה' || reason === 'מסע') {
        return false; // Exempt
      }
      return (fixed + overtime) > 10;
    }

    // Case 1: 8 fixed + 3 overtime = 11 > 10, reason = 'יום שדה' -> EXCEEDED (true)
    assert.strictEqual(isDailyHoursExceeded(8, 3, 'יום שדה'), true);

    // Case 2: 8 fixed + 3 overtime = 11 > 10, reason = 'מש"צים' -> EXCEEDED (true)
    assert.strictEqual(isDailyHoursExceeded(8, 3, 'מש"צים'), true);

    // Case 3: 8 fixed + 3 overtime = 11 > 10, reason = 'אחר' -> EXCEEDED (true)
    assert.strictEqual(isDailyHoursExceeded(8, 3, 'אחר'), true);

    // Case 4: 8 fixed + 3 overtime = 11 > 10, reason = 'גיחה' -> EXEMPT (false)
    assert.strictEqual(isDailyHoursExceeded(8, 3, 'גיחה'), false);

    // Case 5: 8 fixed + 6 overtime = 14 > 10, reason = 'מסע' -> EXEMPT (false)
    assert.strictEqual(isDailyHoursExceeded(8, 6, 'מסע'), false);

    // Case 6: 6 fixed + 4 overtime = 10 <= 10, reason = 'יום שדה' -> NOT EXCEEDED (false)
    assert.strictEqual(isDailyHoursExceeded(6, 4, 'יום שדה'), false);

    // Case 7: 6 fixed + 2 overtime = 8 <= 10, reason = 'אחר' -> NOT EXCEEDED (false)
    assert.strictEqual(isDailyHoursExceeded(6, 2, 'אחר'), false);
  });

  console.log('\n============================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED  `);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
