/**
 * Comprehensive Cloud Firestore Synchronization Script
 * Migrates all teachers, supervisors, principals, admins and all their reports
 * Ensures unique IDs and no field collisions
 */

const { FirestoreDB, db } = require('../functions/db/firestore-db');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

async function syncAll() {
  console.log('🚀 Starting Comprehensive Cloud Firestore Sync for ALL teachers & reports...');

  // 1. Comprehensive Teachers and Staff List
  const allTeachersAndStaff = [
    // --- Teachers ---
    {
      id: '012345678',
      id_number: '012345678',
      phone: '0501234567',
      password: '0501234567',
      name: 'ישראל ישראלי',
      full_name: 'ישראל ישראלי',
      role: 'teacher',
      email: 'israel.i@school.org.il',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      schoolCode: '440123',
      municipality: 'כפר סבא',
      district: 'מרכז',
      jobScope: 100,
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
      fieldDays: [2, 4],
      weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-01T08:30:00Z'
    },
    {
      id: '023456789',
      id_number: '023456789',
      phone: '0522345678',
      password: '0522345678',
      name: 'שרה כהן',
      full_name: 'שרה כהן',
      role: 'teacher',
      email: 'sarah.c@school.org.il',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      schoolCode: '440123',
      municipality: 'כפר סבא',
      district: 'מרכז',
      jobScope: 80,
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
      fieldDays: [1, 3],
      weeklySchedule: { 0: 5, 1: 7, 2: 5, 3: 7, 4: 0, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-01T09:15:00Z'
    },
    {
      id: '034567890',
      id_number: '034567890',
      phone: '0543456789',
      password: '0543456789',
      name: 'אבי מזרחי',
      full_name: 'אבי מזרחי',
      role: 'teacher',
      email: 'avi.m@golda-pt.org.il',
      schoolName: 'מקיף גולדה מאיר פתח תקווה',
      schoolCode: '440789',
      municipality: 'פתח תקווה',
      district: 'מרכז',
      jobScope: 100,
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'אילן דגן',
      principalEmail: 'ilan.d@golda-pt.org.il',
      principalToken: 'PRINCIPAL_TOKEN_PT_440789',
      fieldDays: [2],
      weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 6, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-02T10:00:00Z'
    },
    {
      id: '023456781',
      id_number: '023456781',
      phone: '0523456789',
      password: '0523456789',
      name: 'מיכל לוי',
      full_name: 'מיכל לוי',
      role: 'teacher',
      email: 'michal.levi@school.org.il',
      schoolName: 'תיכון רבין כפר סבא',
      schoolCode: '123456',
      municipality: 'כפר סבא',
      district: 'מרכז',
      jobScope: 80,
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
      fieldDays: [2],
      weeklySchedule: { 0: 5, 1: 5, 2: 8, 3: 4, 4: 6, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-01T08:30:00Z'
    },
    {
      id: '034567812',
      id_number: '034567812',
      phone: '0541234567',
      password: '0541234567',
      name: 'דניאל כהן',
      full_name: 'דניאל כהן',
      role: 'teacher',
      email: 'daniel.c@school.org.il',
      schoolName: 'עירוני א׳ תל אביב',
      schoolCode: '654321',
      municipality: 'תל אביב',
      district: 'תל אביב',
      jobScope: 100,
      supervisorName: 'רחל שלום',
      supervisorId: '056789012',
      principalName: 'יורם פרידמן',
      principalEmail: 'yoram@ironi-a.k12.il',
      principalToken: 'PRINCIPAL_TOKEN_TLV_654321',
      fieldDays: [4],
      weeklySchedule: { 0: 6, 1: 6, 2: 6, 3: 6, 4: 8, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-02T09:00:00Z'
    },
    {
      id: '034567891',
      id_number: '034567891',
      phone: '0533456789',
      password: '0533456789',
      name: 'דנה כהן',
      full_name: 'דנה כהן',
      role: 'teacher',
      email: 'dana.cohen@school.org.il',
      schoolName: 'תיכון דרור השרון',
      schoolCode: '440555',
      municipality: 'לב השרון',
      district: 'מרכז',
      jobScope: 100,
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
      fieldDays: [1, 3],
      weeklySchedule: { 0: 6, 1: 8, 2: 6, 3: 8, 4: 4, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-02T10:00:00Z'
    },
    {
      id: 'test_tch_user',
      id_number: 'test_tch_user',
      phone: '0503334455',
      password: '0503334455',
      name: 'מורה בדיקה',
      full_name: 'מורה בדיקה',
      role: 'teacher',
      email: 'test.tch@school.org.il',
      schoolName: 'תיכון דרום',
      schoolCode: '778899',
      municipality: 'באר שבע',
      district: 'דרום',
      jobScope: 100,
      supervisorName: 'מנחה בדיקה',
      supervisorId: 'test_sup_user',
      principalName: 'מנהל בדיקה',
      principalEmail: 'principal.test@school.org.il',
      fieldDays: [2, 4],
      weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
      consentSigned: true,
      consentDate: '2026-08-01T08:00:00Z'
    },

    // --- Principals ---
    {
      id: '033333333',
      id_number: '033333333',
      phone: '0533333333',
      password: '0533333333',
      name: 'רונית שחר (מנהלת)',
      full_name: 'רונית שחר',
      role: 'principal',
      email: 'ronit.s@rabin-kfs.org.il',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      schoolCode: '440123',
      municipality: 'כפר סבא',
      district: 'מרכז',
      token: 'PRINCIPAL_TOKEN_KFS_440123'
    },
    {
      id: '034567800',
      id_number: '034567800',
      phone: '0534567890',
      password: '0534567890',
      name: 'שרה כהן (מנהלת)',
      full_name: 'שרה כהן',
      role: 'principal',
      email: 'shalah.system.reports@gmail.com',
      schoolName: 'תיכון רבין כפר סבא',
      schoolCode: '123456',
      municipality: 'כפר סבא',
      district: 'מרכז',
      token: 'token-sec-rabin-202608-mlevi'
    },
    {
      id: '045678912',
      id_number: '045678912',
      phone: '0539876543',
      password: '0539876543',
      name: 'יורם פרידמן (מנהל)',
      full_name: 'יורם פרידמן',
      role: 'principal',
      email: 'yoram@ironi-a.k12.il',
      schoolName: 'עירוני א׳ תל אביב',
      schoolCode: '654321',
      municipality: 'תל אביב',
      district: 'תל אביב',
      token: 'PRINCIPAL_TOKEN_TLV_654321'
    },

    // --- Supervisors ---
    {
      id: '011111111',
      id_number: '011111111',
      phone: '0521111111',
      password: '0521111111',
      name: 'דוד לוי',
      full_name: 'דוד לוי',
      role: 'supervisor',
      email: 'david.l@education.gov.il',
      district: 'מרכז'
    },
    {
      id: '022222222',
      id_number: '022222222',
      phone: '0542222222',
      password: '0542222222',
      name: 'ענת פרידמן',
      full_name: 'ענת פרידמן',
      role: 'supervisor',
      email: 'anat.f@education.gov.il',
      district: 'צפון'
    },
    {
      id: '045678901',
      id_number: '045678901',
      phone: '0541112233',
      password: '0541112233',
      name: 'אברהם מנחה בכיר',
      full_name: 'אברהם מנחה',
      role: 'supervisor',
      email: 'avraham.supervisor@education.gov.il',
      district: 'מרכז'
    },
    {
      id: '056789012',
      id_number: '056789012',
      phone: '0547654321',
      password: '0547654321',
      name: 'רחל שלום',
      full_name: 'רחל שלום',
      role: 'supervisor',
      email: 'rachel.shalom@education.gov.il',
      district: 'תל אביב'
    },
    {
      id: 'test_sup_user',
      id_number: 'test_sup_user',
      phone: '0502223344',
      password: '0502223344',
      name: 'מנחה בדיקה',
      full_name: 'מנחה בדיקה',
      role: 'supervisor',
      email: 'test.sup@education.gov.il',
      district: 'דרום'
    },

    // --- Admins ---
    {
      id: '099999999',
      id_number: '099999999',
      phone: '0549999999',
      password: '0549999999',
      name: 'רונן - ממונה מחוז מרכז',
      full_name: 'רונן ממונה מחוז מרכז',
      role: 'admin',
      email: 'ronen.shalah@education.gov.il',
      district: 'מרכז'
    },
    {
      id: 'test_admin_user',
      id_number: 'test_admin_user',
      phone: '0501112233',
      password: '0501112233',
      name: 'ממונה בדיקה',
      full_name: 'ממונה בדיקה',
      role: 'admin',
      email: 'test.admin@education.gov.il',
      district: 'דרום'
    },
    {
      id: 'admin',
      id_number: 'admin',
      phone: '0500000000',
      password: 'Yaron111',
      name: 'מנהל אתר ראשי',
      full_name: 'מנהל אתר ראשי',
      role: 'site_admin',
      email: 'admin.master@shalah.org.il',
      district: 'ארצי'
    }
  ];

  console.log(`📦 Saving ${allTeachersAndStaff.length} unique teachers and staff into Cloud Firestore...`);
  const savedUsers = await FirestoreDB.saveUsersBatch(allTeachersAndStaff);
  console.log(`✅ Saved ${savedUsers.length} staff and teachers to Firestore.`);

  const teachers = savedUsers.filter(u => u.role === 'teacher');
  console.log(`\n👨‍🏫 Active Teachers in Cloud Firestore (${teachers.length}):`);
  teachers.forEach((t, i) => {
    console.log(`  ${i + 1}. [${t.id}] ${t.name} | בית ספר: ${t.schoolName} | מנחה: ${t.supervisorName} | סיסמה: ${t.password}`);
  });

  // 2. Sync all reports
  console.log('\n📄 Syncing reports to Cloud Firestore...');
  const reportsToSync = [
    {
      id: 'REP-2026-08-01',
      teacherId: '012345678',
      teacherName: 'ישראל ישראלי',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      schoolCode: '440123',
      district: 'מרכז',
      municipality: 'כפר סבא',
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      year: 2026,
      month: 8,
      status: 'pending_supervisor',
      submittedAt: '2026-08-25T14:30:00Z',
      totalFixedHours: 148,
      totalAbsenceHours: 6,
      totalOvertimeHours: 14,
      totalPayableHours: 156
    },
    {
      id: 'REP-2026-07-02',
      teacherId: '012345678',
      teacherName: 'ישראל ישראלי',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      schoolCode: '440123',
      district: 'מרכז',
      municipality: 'כפר סבא',
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      year: 2026,
      month: 7,
      status: 'approved_paid',
      submittedAt: '2026-07-28T10:00:00Z',
      signatureId: 'SIG-2026-07-948217',
      totalFixedHours: 130,
      totalAbsenceHours: 0,
      totalOvertimeHours: 16,
      totalPayableHours: 146
    },
    {
      id: 'REP-2026-08-03',
      teacherId: '023456789',
      teacherName: 'שרה כהן',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      schoolCode: '440123',
      district: 'מרכז',
      municipality: 'כפר סבא',
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      year: 2026,
      month: 8,
      status: 'supervisor_edited',
      submittedAt: '2026-08-24T11:00:00Z',
      totalFixedHours: 110,
      totalAbsenceHours: 0,
      totalOvertimeHours: 9,
      totalPayableHours: 119
    },
    {
      id: 'REP-2026-08-04',
      teacherId: '034567890',
      teacherName: 'אבי מזרחי',
      schoolName: 'מקיף גולדה מאיר פתח תקווה',
      schoolCode: '440789',
      district: 'מרכז',
      municipality: 'פתח תקווה',
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'אילן דגן',
      principalEmail: 'ilan.d@golda-pt.org.il',
      year: 2026,
      month: 8,
      status: 'pending_principal',
      submittedAt: '2026-08-26T08:00:00Z',
      totalFixedHours: 148,
      totalAbsenceHours: 0,
      totalOvertimeHours: 10,
      totalPayableHours: 158
    },
    {
      id: 'rep_2026_08_usr_teacher_2',
      teacherId: '023456781',
      teacherName: 'מיכל לוי',
      schoolName: 'תיכון רבין כפר סבא',
      schoolCode: '123456',
      district: 'מרכז',
      municipality: 'כפר סבא',
      supervisorName: 'דוד לוי',
      supervisorId: '011111111',
      principalName: 'רונית שחר',
      principalEmail: 'shalah.system.reports@gmail.com',
      year: 2026,
      month: 8,
      status: 'pending_principal',
      totalFixedHours: 120,
      totalAbsenceHours: 0,
      totalOvertimeHours: 8,
      totalPayableHours: 128
    },
    {
      id: 'rep_2026_08_usr_teacher_3',
      teacherId: '034567812',
      teacherName: 'דניאל כהן',
      schoolName: 'עירוני א׳ תל אביב',
      schoolCode: '654321',
      district: 'תל אביב',
      municipality: 'תל אביב',
      supervisorName: 'רחל שלום',
      supervisorId: '056789012',
      principalName: 'יורם פרידמן',
      principalEmail: 'yoram@ironi-a.k12.il',
      year: 2026,
      month: 8,
      status: 'returned',
      totalFixedHours: 148,
      totalAbsenceHours: 8,
      totalOvertimeHours: 6,
      totalPayableHours: 146
    }
  ];

  for (const r of reportsToSync) {
    await FirestoreDB.saveReport(r);
    console.log(`  ✓ Synced report: ${r.id} (${r.teacherName})`);
  }

  console.log('\n🎉 Comprehensive synchronization completed successfully!');
}

if (require.main === module) {
  syncAll().then(() => process.exit(0)).catch(err => {
    console.error('❌ Sync failed:', err);
    process.exit(1);
  });
}

module.exports = { syncAll };
