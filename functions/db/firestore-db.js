/**
 * Cloud Firestore Database Service Layer
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const USERS_COL = 'users';
const REPORTS_COL = 'reports';

const FirestoreDB = {
  // === User Operations ===
  async getUserById(id) {
    const doc = await db.collection(USERS_COL).doc(String(id)).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async getUserByPhoneAndId(idNumber, phone) {
    const cleanId = String(idNumber || '').trim();
    const cleanPhone = String(phone || '').replace(/[-\s]/g, '');

    const snapshot = await db.collection(USERS_COL)
      .where('id_number', '==', cleanId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const user = { id: doc.id, ...doc.data() };
    const userPhone = String(user.phone || '').replace(/[-\s]/g, '');
    if (userPhone === cleanPhone) {
      return user;
    }
    return null;
  },

  async getUserByToken(token) {
    const snapshot = await db.collection(USERS_COL)
      .where('token', '==', token)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
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
    const userId = String(user.id || user.id_number);
    await db.collection(USERS_COL).doc(userId).set({
      ...user,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return this.getUserById(userId);
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

    return reports.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
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
