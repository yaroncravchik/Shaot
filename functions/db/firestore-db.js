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
  if (typeof str !== 'string') return '';
  return str
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
    const rawId = String(usernameOrId || '').trim();
    const cleanId = stripInvisibleChars(rawId);
    const cleanSecret = stripInvisibleChars(String(passwordOrPhone || '').trim());
    const cleanSecretPlain = cleanSecret.replace(/[-\s]/g, '');

    if (!cleanId || !cleanSecret) return null;

    // Helper to test if user password matches
    const matchesPassword = (u) => {
      if (!u) return false;
      const uPass = stripInvisibleChars(String(u.password || '')).trim();
      const uPhone = stripInvisibleChars(String(u.phone || '')).trim();
      const uId = stripInvisibleChars(String(u.id_number || u.id || '')).trim();

      const uPassPlain = uPass.replace(/[-\s]/g, '');
      const uPhonePlain = uPhone.replace(/[-\s]/g, '');
      const uIdPlain = uId.replace(/[-\s]/g, '');

      // Effective phone number for users whose phone is empty but ID is a 9-digit cell number (starts with 5)
      const uEffectivePhone = uPhonePlain || (uIdPlain.length === 9 && uIdPlain.startsWith('5') ? '0' + uIdPlain : '');

      // 1. Direct password match
      if (uPass && (uPass === cleanSecret || uPassPlain === cleanSecretPlain)) {
        return true;
      }
      // 2. Phone match
      if (uPhonePlain && (uPhonePlain === cleanSecret || uPhonePlain === cleanSecretPlain)) {
        return true;
      }
      if (uEffectivePhone && (uEffectivePhone === cleanSecret || uEffectivePhone === cleanSecretPlain)) {
        return true;
      }
      if (uEffectivePhone.startsWith('0') && uEffectivePhone.slice(1) === cleanSecretPlain) {
        return true;
      }
      if (!uEffectivePhone.startsWith('0') && ('0' + uEffectivePhone) === cleanSecretPlain) {
        return true;
      }
      // 3. ID number match
      if (uId && (uId === cleanSecret || uIdPlain === cleanSecretPlain)) {
        return true;
      }
      if (uIdPlain.startsWith('0') && uIdPlain.slice(1) === cleanSecretPlain) {
        return true;
      }
      if (!uIdPlain.startsWith('0') && ('0' + uIdPlain) === cleanSecretPlain) {
        return true;
      }
      // 4. Default / common MoE passwords: 1234 or 123456
      if (cleanSecretPlain === '1234' || cleanSecretPlain === '123456') {
        return true;
      }
      // 5. Last 4 digits of phone or ID
      if (cleanSecretPlain.length === 4) {
        if (uPhonePlain.endsWith(cleanSecretPlain) || uEffectivePhone.endsWith(cleanSecretPlain) || uIdPlain.endsWith(cleanSecretPlain)) {
          return true;
        }
      }
      return false;
    };

    // Build candidate identifiers (handling leading zero, dashes, parens, international code)
    const cleanIdPlain = cleanId.replace(/[-\s]/g, '');
    const cleanDigits = cleanId.replace(/\D/g, '');
    const idCandidates = new Set([cleanId, cleanIdPlain]);

    if (cleanDigits) {
      idCandidates.add(cleanDigits);
      if (cleanDigits.startsWith('972')) {
        const local = '0' + cleanDigits.slice(3);
        idCandidates.add(local);
        idCandidates.add(local.slice(1));
      } else if (cleanDigits.startsWith('0')) {
        idCandidates.add(cleanDigits.slice(1));
      } else if (/^\d+$/.test(cleanDigits)) {
        idCandidates.add('0' + cleanDigits);
      }
    }

    // 1. Check doc ID directly for all candidate IDs
    for (const cand of idCandidates) {
      if (!cand) continue;
      const directDoc = await db.collection(USERS_COL).doc(cand).get();
      if (directDoc.exists) {
        const u = { id: directDoc.id, ...directDoc.data() };
        if (matchesPassword(u)) return u;
      }
    }

    // 2. Query indexed fields for each candidate ID
    for (const cand of idCandidates) {
      if (!cand) continue;
      // id_number
      let snap = await db.collection(USERS_COL).where('id_number', '==', cand).limit(1).get();
      if (!snap.empty) {
        const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (matchesPassword(u)) return u;
      }
      // phone
      snap = await db.collection(USERS_COL).where('phone', '==', cand).limit(1).get();
      if (!snap.empty) {
        const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (matchesPassword(u)) return u;
      }
      // username
      snap = await db.collection(USERS_COL).where('username', '==', cand).limit(1).get();
      if (!snap.empty) {
        const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (matchesPassword(u)) return u;
      }
      // email
      snap = await db.collection(USERS_COL).where('email', '==', cand).limit(1).get();
      if (!snap.empty) {
        const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
        if (matchesPassword(u)) return u;
      }
    }

    // 3. Query by Hebrew name / full_name (with variations for nicknames and parens)
    const nameVariations = new Set([cleanId]);
    const withoutParens = cleanId.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
    if (withoutParens) nameVariations.add(withoutParens);
    const parensStripped = cleanId.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (parensStripped) nameVariations.add(parensStripped);

    for (const nCand of nameVariations) {
      if (!nCand) continue;
      let nameSnap = await db.collection(USERS_COL).where('name', '==', nCand).limit(1).get();
      if (!nameSnap.empty) {
        const u = { id: nameSnap.docs[0].id, ...nameSnap.docs[0].data() };
        if (matchesPassword(u)) return u;
      }
      nameSnap = await db.collection(USERS_COL).where('full_name', '==', nCand).limit(1).get();
      if (!nameSnap.empty) {
        const u = { id: nameSnap.docs[0].id, ...nameSnap.docs[0].data() };
        if (matchesPassword(u)) return u;
      }
    }

    // 4. Memory fallback scan across all users in collection (handles whitespace, parenthesized nicknames, partial name, unindexed fields)
    try {
      const allUsers = await this.getAllUsers();
      for (const u of allUsers) {
        const uName = stripInvisibleChars(String(u.name || ''));
        const uFullName = stripInvisibleChars(String(u.full_name || ''));
        const uId = stripInvisibleChars(String(u.id_number || u.id || '')).replace(/[-\s]/g, '');
        const uPhone = stripInvisibleChars(String(u.phone || '')).replace(/[-\s]/g, '');
        const uEmail = stripInvisibleChars(String(u.email || '')).toLowerCase();

        // Effective phone check
        const uEffectivePhone = uPhone || (uId.length === 9 && uId.startsWith('5') ? '0' + uId : '');

        const matchId = idCandidates.has(uId) ||
          (uPhone && idCandidates.has(uPhone)) ||
          (uEffectivePhone && idCandidates.has(uEffectivePhone)) ||
          (uEmail && uEmail === cleanId.toLowerCase());

        // Name matching: test raw, stripped parentheses, nickname extraction, and word containment
        const testNames = [uName, uFullName];
        if (uName.includes('(')) {
          testNames.push(uName.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim());
          testNames.push(uName.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
          const parenMatch = uName.match(/\((.*?)\)/);
          if (parenMatch && parenMatch[1]) {
            testNames.push(uName.replace(/\b\S+\s*\(/, parenMatch[1] + ' (').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim());
            testNames.push(parenMatch[1].trim());
          }
        }
        if (uFullName.includes('(')) {
          testNames.push(uFullName.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim());
          testNames.push(uFullName.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());
        }

        const inputWords = cleanId.split(' ').filter(w => w.length > 0);

        let matchName = false;
        for (const candName of testNames) {
          if (!candName) continue;
          if (candName === cleanId) {
            matchName = true;
            break;
          }
          if (cleanId.length >= 3 && (candName.includes(cleanId) || cleanId.includes(candName))) {
            matchName = true;
            break;
          }
          // Word set match: e.g. "צבי" and "גד" in "ציקי צבי גד"
          if (inputWords.length >= 2) {
            const candWords = candName.split(' ');
            if (inputWords.every(w => candWords.includes(w))) {
              matchName = true;
              break;
            }
          }
        }

        if (matchId || matchName) {
          if (matchesPassword(u)) {
            return u;
          }
        }
      }
    } catch (scanErr) {
      console.warn('Fallback memory user scan error:', scanErr.message);
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
