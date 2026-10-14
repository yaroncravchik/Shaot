/**
 * Full Database to Cloud Firestore Sync Script
 * Merges all users from SQLite, mock seed files, and saves them directly to Cloud Firestore
 */

const { FirestoreDB, db } = require('../functions/db/firestore-db');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

async function syncAllToFirestore() {
  console.log('🔄 Starting Full Sync to Cloud Firestore...');

  const usersMap = new Map();

  // 1. Initial Web App Seed Users
  const webSeedUsers = [
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
      full_name: 'מנהל אתר ראשי',
      role: 'site_admin',
      email: 'admin.master@shalah.org.il',
      district: 'ארצי'
    }
  ];

  for (const u of webSeedUsers) {
    usersMap.set(u.id, u);
  }

  // 2. Read from SQLite (shalah.db) if available
  const dbPath = path.join(__dirname, '../data/shalah.db');
  if (fs.existsSync(dbPath)) {
    try {
      const sqliteDb = new DatabaseSync(dbPath);
      const rows = sqliteDb.prepare('SELECT * FROM users').all();
      console.log(`📦 Found ${rows.length} users in local SQLite.`);

      for (const r of rows) {
        const idKey = r.id_number || r.id;
        const existing = usersMap.get(idKey) || {};
        usersMap.set(idKey, {
          id: idKey,
          id_number: r.id_number || idKey,
          name: r.full_name || r.name || existing.name || '',
          full_name: r.full_name || existing.full_name || '',
          phone: r.phone || existing.phone || '',
          password: r.password || r.phone || existing.password || '',
          role: r.role || existing.role || 'teacher',
          email: r.email || existing.email || '',
          schoolName: r.school_name || existing.schoolName || '',
          schoolCode: r.school_code || existing.schoolCode || '',
          district: r.district || existing.district || 'מרכז',
          municipality: r.municipality || existing.municipality || '',
          jobScope: r.job_percentage || existing.jobScope || 100,
          supervisorId: r.supervisor_id || existing.supervisorId || '011111111',
          supervisorName: existing.supervisorName || 'דוד לוי',
          principalName: r.principal_name || existing.principalName || '',
          principalEmail: r.principal_email || existing.principalEmail || '',
          consentSigned: Boolean(r.consent_signed !== undefined ? r.consent_signed : true),
          weeklySchedule: existing.weeklySchedule || { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
          fieldDays: existing.fieldDays || [2, 4]
        });
      }
    } catch (e) {
      console.warn('⚠️ SQLite read warning:', e.message);
    }
  }

  // 3. Save all users to Firestore
  console.log(`🚀 Syncing ${usersMap.size} users into Cloud Firestore...`);
  const batchArray = Array.from(usersMap.values());
  const saved = await FirestoreDB.saveUsersBatch(batchArray);

  console.log(`✅ Successfully synced ${saved.length} users to Cloud Firestore:`);
  for (const u of saved) {
    console.log(`   - [${u.role}] ID: ${u.id} | Name: ${u.name} | Password: ${u.password}`);
  }

  console.log('🎉 Firestore synchronization complete!');
}

if (require.main === module) {
  syncAllToFirestore().then(() => process.exit(0)).catch(err => {
    console.error('❌ Sync error:', err);
    process.exit(1);
  });
}

module.exports = { syncAllToFirestore };
