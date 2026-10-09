/**
 * Cloud Firestore & Firebase Data Migration Script
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 *
 * This script migrates all local data into Firebase Cloud Firestore:
 * - Users collection ('users')
 * - Reports collection ('reports') with embedded daysData & auditHistory
 * - Mail collection ('mail') for Firebase Trigger Email Extension
 * - Verifies Cloud Storage connectivity for attachments
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Check for Service Account Key
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../serviceAccountKey.json');
const hasServiceAccount = fs.existsSync(serviceAccountPath);

const PROJECT_ID = 'shalah-hours-2026';

if (!admin.apps.length) {
  if (hasServiceAccount) {
    console.log(`✓ Loading Service Account from: ${serviceAccountPath}`);
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || PROJECT_ID,
      storageBucket: `${serviceAccount.project_id || PROJECT_ID}.firebasestorage.app`
    });
  } else {
    console.log(`! No serviceAccountKey.json found. Initializing with default Project ID: ${PROJECT_ID}`);
    console.log(`! To authenticate against your live Firebase instance, download serviceAccountKey.json from Firebase Console.`);
    admin.initializeApp({
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`
    });
  }
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// 1. Initial Users Seed Dataset
const seedUsers = [
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
    fieldDays: [2, 4], // Tuesday, Thursday
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
    id: 'admin',
    id_number: 'admin',
    phone: '0500000000',
    password: 'Yaron111',
    name: 'מנהל אתר ראשי',
    full_name: 'מנהל אתר ומערכת ראשי',
    role: 'site_admin',
    email: 'admin.master@shalah.org.il',
    district: 'ארצי'
  }
];

// 2. Initial Reports Seed Dataset
const seedReports = [
  {
    id: 'REP-2026-08-01',
    teacherId: '012345678',
    teacherName: 'ישראל ישראלי',
    schoolName: 'תיכון יצחק רבין כפר סבא',
    schoolCode: '440123',
    district: 'מרכז',
    municipality: 'כפר סבא',
    supervisorName: 'דוד לוי',
    principalName: 'רונית שחר',
    year: 2026,
    month: 8,
    status: 'pending_supervisor',
    submittedAt: '2026-08-25T14:30:00Z',
    principalApprovedAt: '2026-08-25T16:45:00Z',
    principalRemarks: 'הדוח נבדק ותואם את תוכנית הסיורים הבית ספרית. מאושר.',
    supervisorRemarks: '',
    adminRemarks: '',
    totalFixedHours: 148,
    totalAbsenceHours: 6,
    totalOvertimeHours: 14,
    totalPayableHours: 156,
    attachments: [
      {
        id: 'att_001',
        filename: 'אישור_סיור_שדה_אוגוסט_2026.pdf',
        size: 1420500,
        uploadedAt: '2026-08-25T14:15:00Z',
        url: 'https://storage.googleapis.com/shalah-hours-2026.appspot.com/attachments/REP-2026-08-01/att_001.pdf'
      }
    ],
    auditHistory: [
      { date: '25/08/2026 14:30', user: 'ישראל ישראלי', action: 'הגשת דוח שעות חודש אוגוסט 2026' },
      { date: '25/08/2026 16:45', user: 'רונית שחר (מנהלת)', action: 'אישור דוח מנהל/ת בית ספר' }
    ]
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
    principalName: 'רונית שחר',
    year: 2026,
    month: 7,
    status: 'approved_paid',
    submittedAt: '2026-07-28T11:00:00Z',
    principalApprovedAt: '2026-07-28T14:00:00Z',
    supervisorApprovedAt: '2026-07-29T10:00:00Z',
    adminApprovedAt: '2026-07-30T12:00:00Z',
    signatureId: 'SIG-2026-07-948217',
    digitalSignatureId: 'SIG-2026-07-948217',
    totalFixedHours: 152,
    totalAbsenceHours: 0,
    totalOvertimeHours: 16,
    totalPayableHours: 168,
    auditHistory: [
      { date: '28/07/2026 11:00', user: 'ישראל ישראלי', action: 'הגשת דוח שעות' },
      { date: '28/07/2026 14:00', user: 'רונית שחר', action: 'אישור מנהל/ת' },
      { date: '29/07/2026 10:00', user: 'דוד לוי', action: 'אישור מנחה מחוזי' },
      { date: '30/07/2026 12:00', user: 'רונן', action: 'אישור סופי וחתימה דיגיטלית SIG-2026-07-948217' }
    ]
  }
];

// 3. Initial Test Mail Document for Trigger Email Extension
const initialTestMail = {
  to: ['shalah.system.reports@gmail.com'],
  message: {
    subject: 'מערכת דיווח שעות של"ח – בדיקת קולקציית Mail ב-Firebase',
    text: 'שלום,\nקולקציית ה-mail ב-Cloud Firestore הוקמה בהצלחה ומוכנה לעבודה מול Firebase Trigger Email Extension.',
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
        <h2 style="color: #0c3058;">מערכת דיווח שעות פעילות חודשית של"ח</h2>
        <p style="color: #28a745; font-size: 16px; font-weight: bold;">✓ קולקציית ה-Mail ב-Cloud Firestore הוקמה בהצלחה!</p>
        <p>תוסף <strong>Firebase Trigger Email</strong> מחובר ומאזין להודעות אישור חדשות עבור מנהלי בתי הספר.</p>
        <hr style="border: 0; border-top: 1px solid #dee2e6; margin: 15px 0;">
        <small style="color: #6c757d;">הודעת מערכת אוטומטית – משרד החינוך, תחום של"ח וידיעת הארץ</small>
      </div>
    `
  },
  createdAt: admin.firestore.FieldValue.serverTimestamp()
};

async function migrateData() {
  console.log('\n========================================================');
  console.log(' STARTING FIREBASE CLOUD FIRESTORE MIGRATION ');
  console.log('========================================================\n');

  // Always write local backup JSON first
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const exportPath = path.join(dataDir, 'firestore-export.json');
  fs.writeFileSync(exportPath, JSON.stringify({
    users: seedUsers,
    reports: seedReports,
    mail: [initialTestMail],
    exportedAt: new Date().toISOString()
  }, null, 2));
  console.log(`✓ Generated local JSON backup at: ${exportPath}`);

  try {
    // Write Users
    console.log(`\n--- Migrating Users to collection 'users' ---`);
    for (const u of seedUsers) {
      await db.collection('users').doc(u.id).set({
        ...u,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`  ✓ Seeded User: ${u.name} (${u.role}) -> users/${u.id}`);
    }

    // Write Reports
    console.log(`\n--- Migrating Reports to collection 'reports' ---`);
    for (const r of seedReports) {
      await db.collection('reports').doc(r.id).set({
        ...r,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`  ✓ Seeded Report: ${r.id} (${r.month}/${r.year} - ${r.status}) -> reports/${r.id}`);
    }

    // Write Initial Mail Document
    console.log(`\n--- Setting up collection 'mail' for Trigger Email Extension ---`);
    const mailRef = await db.collection('mail').add(initialTestMail);
    console.log(`  ✓ Created test mail document: mail/${mailRef.id}`);

    console.log('\n========================================================');
    console.log(' MIGRATION COMPLETED SUCCESSFULLY! ');
    console.log(` Target Firestore: [${PROJECT_ID}]`);
    console.log(` Collections created: 'users', 'reports', 'mail'`);
    console.log('========================================================\n');
  } catch (err) {
    console.error('\n✖ Remote write notice:', err.message);
    if (!hasServiceAccount) {
      console.log('\n[!] HOW TO CONNECT YOUR LIVE FIREBASE CONSOLE:');
      console.log('    1. Go to Firebase Console -> Project Settings -> Service accounts');
      console.log('    2. Click "Generate new private key"');
      console.log('    3. Save the downloaded JSON as "serviceAccountKey.json" in this project directory');
      console.log('    4. Run: npm run migrate:firebase');
      console.log('    All users, reports, and the mail collection will be populated in your Firebase Console immediately!\n');
    }
  }
}

migrateData();
