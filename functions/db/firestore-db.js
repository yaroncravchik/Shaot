/**
 * Cloud Firestore Database Service Layer
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const saCandidates = [
    path.join(__dirname, '../../serviceAccountKey.json'),
    path.join(__dirname, '../serviceAccountKey.json'),
    path.join(process.cwd(), 'serviceAccountKey.json')
  ];
  let loaded = false;
  for (const p of saCandidates) {
    if (fs.existsSync(p)) {
      try {
        const sa = require(p);
        admin.initializeApp({
          credential: admin.credential.cert(sa)
        });
        loaded = true;
        break;
      } catch (e) {
        // Fall back to default
      }
    }
  }
  if (!loaded) {
    admin.initializeApp();
  }
}

const db = admin.firestore();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // Ignore if already configured
}

const USERS_COL = 'users';
const REPORTS_COL = 'reports';

function stripInvisibleChars(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '').trim();
}

const FirestoreDB = {
  // === User Operations ===
  async getUserById(id) {
    if (!id) return null;
    const cleanId = stripInvisibleChars(String(id));
    const doc = await db.collection(USERS_COL).doc(cleanId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    // Also try finding by id_number field
    const snap = await db.collection(USERS_COL).where('id_number', '==', cleanId).limit(1).get();
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  },

  async getUserByCredentials(usernameOrId, passwordOrPhone) {
    const cleanId = stripInvisibleChars(String(usernameOrId || ''));
    const cleanSecret = stripInvisibleChars(String(passwordOrPhone || ''));
    const cleanSecretPlain = cleanSecret.replace(/[-\s]/g, '');

    if (!cleanId || !cleanSecret) return null;

    // Helper to test if user password matches
    const matchesPassword = (u) => {
      const uPass = stripInvisibleChars(String(u.password || ''));
      const uPhone = stripInvisibleChars(String(u.phone || ''));
      const uId = stripInvisibleChars(String(u.id_number || u.id || ''));

      if (uPass) {
        const uPassPlain = uPass.replace(/[-\s]/g, '');
        if (uPass === cleanSecret || uPassPlain === cleanSecretPlain) {
          return true;
        }
      }
      if (uPhone) {
        const uPhonePlain = uPhone.replace(/[-\s]/g, '');
        if (uPhone === cleanSecret || uPhonePlain === cleanSecretPlain) {
          return true;
        }
      }
      // Fallback: accept id_number as password if no phone is set or if teacher uses ID as password
      if (uId && (uId === cleanSecret || uId.replace(/[-\s]/g, '') === cleanSecretPlain)) {
        return true;
      }
      return false;
    };

    // 1. Check doc ID directly
    const directDoc = await db.collection(USERS_COL).doc(cleanId).get();
    if (directDoc.exists) {
      const u = { id: directDoc.id, ...directDoc.data() };
      if (matchesPassword(u)) return u;
    }

    // 2. Query by id_number
    let snap = await db.collection(USERS_COL).where('id_number', '==', cleanId).limit(1).get();
    if (!snap.empty) {
      const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (matchesPassword(u)) return u;
    }

    // 3. Query by username
    snap = await db.collection(USERS_COL).where('username', '==', cleanId).limit(1).get();
    if (!snap.empty) {
      const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (matchesPassword(u)) return u;
    }

    // 4. Query by email
    snap = await db.collection(USERS_COL).where('email', '==', cleanId).limit(1).get();
    if (!snap.empty) {
      const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (matchesPassword(u)) return u;
    }

    // 5. Query by phone as username
    snap = await db.collection(USERS_COL).where('phone', '==', cleanId).limit(1).get();
    if (!snap.empty) {
      const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (matchesPassword(u)) return u;
    }

    return null;
  },

  async getUserByToken(token) {
    if (!token) return null;
    const snapshot = await db.collection(USERS_COL)
      .where('token', '==', token)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // Check principalToken
    const pSnap = await db.collection(USERS_COL)
      .where('principalToken', '==', token)
      .limit(1)
      .get();

    if (!pSnap.empty) {
      const doc = pSnap.docs[0];
      return { id: doc.id, ...doc.data() };
    }

    // Fallback: check reports for principal_token
    const repSnapshot = await db.collection(REPORTS_COL)
      .where('principal_token', '==', token)
      .limit(1)
      .get();

    if (!repSnapshot.empty) {
      const rep = repSnapshot.docs[0].data();
      return {
        id: rep.principal_id || 'usr-principal-01',
        name: rep.principal_name || 'שרה כהן (מנהלת)',
        role: 'principal',
        schoolCode: rep.school_code || '123456',
        schoolName: rep.school_name || 'תיכון רבין',
        district: rep.district || 'מרכז'
      };
    }

    return null;
  },

  async saveUser(user) {
    const rawId = String(user.id || user.id_number || user.username || '');
    const userId = stripInvisibleChars(rawId);
    if (!userId) throw new Error('Missing user ID');

    const cleanUser = {
      ...user,
      id: userId,
      id_number: stripInvisibleChars(String(user.id_number || userId)),
      name: stripInvisibleChars(String(user.name || user.full_name || '')),
      full_name: stripInvisibleChars(String(user.full_name || user.name || '')),
      password: stripInvisibleChars(String(user.password || user.phone || '')),
      phone: stripInvisibleChars(String(user.phone || '')),
      role: user.role || 'teacher',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection(USERS_COL).doc(userId).set(cleanUser, { merge: true });
    return this.getUserById(userId);
  },

  async saveUsersBatch(usersArray) {
    if (!Array.isArray(usersArray) || usersArray.length === 0) return [];
    const batch = db.batch();
    const saved = [];

    for (const u of usersArray) {
      const rawId = String(u.id || u.id_number || u.username || '');
      const userId = stripInvisibleChars(rawId);
      if (!userId) continue;

      const ref = db.collection(USERS_COL).doc(userId);
      const cleanUser = {
        ...u,
        id: userId,
        id_number: stripInvisibleChars(String(u.id_number || userId)),
        name: stripInvisibleChars(String(u.name || u.full_name || '')),
        full_name: stripInvisibleChars(String(u.full_name || u.name || '')),
        password: stripInvisibleChars(String(u.password || u.phone || '')),
        phone: stripInvisibleChars(String(u.phone || '')),
        role: u.role || 'teacher',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(ref, cleanUser, { merge: true });
      saved.push({ id: userId, ...cleanUser });
    }

    await batch.commit();
    return saved;
  },

  async deleteUser(userId) {
    if (!userId) return false;
    await db.collection(USERS_COL).doc(String(userId).trim()).delete();
    return true;
  },

  async getAllUsers() {
    const snapshot = await db.collection(USERS_COL).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // === Report Operations ===
  async getReports(filter = {}) {
    let query = db.collection(REPORTS_COL);

    if (filter.district && filter.district !== 'all') {
      query = query.where('district', '==', filter.district);
    }
    if (filter.status && filter.status !== 'all') {
      query = query.where('status', '==', filter.status);
    }
    if (filter.teacherId) {
      query = query.where('teacherId', '==', String(filter.teacherId));
    }
    if (filter.year) {
      query = query.where('year', '==', Number(filter.year));
    }
    if (filter.month) {
      query = query.where('month', '==', Number(filter.month));
    }

    const snapshot = await query.get();
    const reports = [];

    for (const doc of snapshot.docs) {
      reports.push({ id: doc.id, ...doc.data() });
    }

    return reports.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return timeB - timeA;
    });
  },

  async getReportById(reportId) {
    const doc = await db.collection(REPORTS_COL).doc(String(reportId)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  async saveReport(report) {
    const reportId = String(report.id);
    const dataToSave = {
      ...report,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(REPORTS_COL).doc(reportId).set(dataToSave, { merge: true });
    return this.getReportById(reportId);
  },

  async saveReportsBatch(reportsArray) {
    if (!Array.isArray(reportsArray) || reportsArray.length === 0) return [];
    const saved = [];
    const chunkSize = 400;

    for (let i = 0; i < reportsArray.length; i += chunkSize) {
      const chunk = reportsArray.slice(i, i + chunkSize);
      const batch = db.batch();

      for (const r of chunk) {
        const reportId = String(r.id || `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`).trim();
        const ref = db.collection(REPORTS_COL).doc(reportId);
        const cleanReport = {
          ...r,
          id: reportId,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        batch.set(ref, cleanReport, { merge: true });
        saved.push({ id: reportId, ...cleanReport });
      }

      await batch.commit();
    }
    return saved;
  },

  async deleteReport(reportId) {
    if (!reportId) return false;
    await db.collection(REPORTS_COL).doc(String(reportId).trim()).delete();
    return true;
  },

  async addAuditLog(reportId, logEntry) {
    const reportRef = db.collection(REPORTS_COL).doc(String(reportId));
    const entry = {
      ...logEntry,
      timestamp: new Date().toISOString()
    };
    await reportRef.update({
      auditHistory: admin.firestore.FieldValue.arrayUnion(entry)
    });
  },

  async addAttachment(reportId, attachmentData) {
    const reportRef = db.collection(REPORTS_COL).doc(String(reportId));
    const att = {
      ...attachmentData,
      id: `att_${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };
    await reportRef.update({
      attachments: admin.firestore.FieldValue.arrayUnion(att)
    });
    return att;
  }
};

module.exports = { db, admin, FirestoreDB };
