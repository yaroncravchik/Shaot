/**
 * Cloud Firestore Seeder Script
 * Populates initial authorized Israeli Ministry of Education users and sample reports in Firestore
 */

const { FirestoreDB, db, admin } = require('./firestore-db');

async function seedFirestore() {
  console.log('Seeding initial data into Cloud Firestore...');

  const users = [
    {
      id: '012345678',
      id_number: '012345678',
      phone: '0501234567',
      name: 'ישראל ישראלי',
      full_name: 'ישראל ישראלי',
      role: 'teacher',
      email: 'israel.y@school.gov.il',
      schoolCode: '440123',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      municipality: 'כפר סבא',
      district: 'מרכז',
      supervisorName: 'אברהם מנחה',
      principalName: 'שרה כהן',
      principalEmail: 'principal@rabin-kfs.org.il',
      jobScope: 100,
      consentSigned: true,
      consentDate: '2026-08-01T07:00:00Z',
      weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
      fieldDays: [2, 4]
    },
    {
      id: '034567890',
      id_number: '034567890',
      phone: '0534567890',
      name: 'שרה כהן (מנהלת)',
      full_name: 'שרה כהן',
      role: 'principal',
      email: 'principal@rabin-kfs.org.il',
      schoolCode: '440123',
      schoolName: 'תיכון יצחק רבין כפר סבא',
      municipality: 'כפר סבא',
      district: 'מרכז',
      token: 'token-sec-rabin-202608-mlevi'
    },
    {
      id: '045678901',
      id_number: '045678901',
      phone: '0545678901',
      name: 'אברהם מנחה (מרכז)',
      full_name: 'אברהם מנחה',
      role: 'supervisor',
      email: 'avraham.sup@education.gov.il',
      district: 'מרכז'
    },
    {
      id: '099999999',
      id_number: '099999999',
      phone: '0549999999',
      name: 'רונן - ממונה מחוז מרכז',
      full_name: 'רונן ממונה מחוז מרכז',
      role: 'admin',
      email: 'ronen.shalah@education.gov.il',
      district: 'מרכז'
    }
  ];

  for (const user of users) {
    await db.collection('users').doc(user.id).set(user, { merge: true });
    console.log(`✓ Seeded user: ${user.name} (${user.role})`);
  }

  // Sample report for August 2026
  const sampleReport = {
    id: 'rep_2026_08_012345678',
    teacherId: '012345678',
    teacherName: 'ישראל ישראלי',
    schoolCode: '440123',
    schoolName: 'תיכון יצחק רבין כפר סבא',
    district: 'מרכז',
    municipality: 'כפר סבא',
    supervisorName: 'אברהם מנחה',
    year: 2026,
    month: 8,
    status: 'pending_principal',
    principalToken: 'token-sec-rabin-202608-mlevi',
    totalFixedHours: 148,
    totalAbsenceHours: 6,
    totalOvertimeHours: 14,
    totalPayableHours: 156,
    submittedAt: '2026-08-25T14:00:00Z',
    daysData: [
      { dayOfMonth: 2, dayOfWeek: 0, dayName: 'ראשון', fixedHours: 6, absenceHours: 0, overtimeHours: 0, isFieldDay: false, description: 'שעות הוראה קבועות' },
      { dayOfMonth: 4, dayOfWeek: 2, dayName: 'שלישי', fixedHours: 8, absenceHours: 0, overtimeHours: 4, overtimeReason: 'יום שדה', isFieldDay: true, gradeClass: 'ט-1', description: 'סיור שדה נחל אלכסנדר' },
      { dayOfMonth: 6, dayOfWeek: 4, dayName: 'חמישי', fixedHours: 8, absenceHours: 0, overtimeHours: 6, overtimeReason: 'גיחה', isFieldDay: true, gradeClass: 'י-2', description: 'סדנת ניווט מעשית יער בן שמן' }
    ],
    attachments: [
      { id: 'att_01', name: 'אישור_סיור_שדה_אוגוסט.pdf', size: '1.2 MB', uploadDate: '25/08/2026' }
    ],
    auditHistory: [
      { date: '25/08/2026 14:00', user: 'ישראל ישראלי (מורה)', action: 'הגשת דוח שעות לבדיקת מנהלת בית הספר' }
    ]
  };

  await db.collection('reports').doc(sampleReport.id).set(sampleReport, { merge: true });
  console.log(`✓ Seeded sample report: ${sampleReport.id}`);

  console.log('Cloud Firestore seeding completed successfully!');
}

if (require.main === module) {
  seedFirestore().then(() => process.exit(0)).catch(err => {
    console.error('Firestore seed error:', err);
    process.exit(1);
  });
}

module.exports = { seedFirestore };
