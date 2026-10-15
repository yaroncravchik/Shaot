const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { FirestoreDB } = require('../db/firestore-db');
const { sendPrincipalApprovalEmail } = require('../services/emailService');
const { db } = require('../db/database');
const { getAvailableMonths, isMonthOpenForReporting, generateMonthDays, HEBREW_DAY_NAMES, HEBREW_MONTH_NAMES } = require('../services/calendarService');
const { generateSingleReportExcel } = require('../services/excelService');
const { generatePrincipalEmailHtml, generatePrincipalEmailPlainText } = require('../services/emailTemplate');

/**
 * GET /api/reports
 * Fetch all reports with optional filters (district, status, teacherId, year, month)
 */
router.get('/', async (req, res) => {
  try {
    const filter = {
      district: req.query.district,
      status: req.query.status,
      teacherId: req.query.teacherId,
      year: req.query.year,
      month: req.query.month
    };
    const reports = await FirestoreDB.getReports(filter);
    return res.json({
      success: true,
      count: reports.length,
      reports: reports || []
    });
  } catch (err) {
    console.error('Error fetching reports from Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת דוחות מ-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * GET /api/reports/available-months
 * Get list of currently open reporting months according to the 5th-of-month rule
 */
router.get('/available-months', (req, res) => {
  try {
    const months = getAvailableMonths();
    return res.json({
      success: true,
      months
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'שגיאה בקבלת חודשי דיווח פתוחים: ' + err.message
    });
  }
});

/**
 * GET /api/reports/:id
 * Get single report by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await FirestoreDB.getReportById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'דוח לא נמצא במערכת'
      });
    }
    return res.json({
      success: true,
      report
    });
  } catch (err) {
    console.error('Error fetching report by ID from Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת דוח: ' + err.message
    });
  }
});

/**
 * POST /api/reports
 * Create or save single report in Cloud Firestore
 */
router.post('/', async (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData || (!reportData.id && !reportData.teacherId)) {
      return res.status(400).json({
        success: false,
        error: 'חובה לספק פרטי דוח ומזהה מורה'
      });
    }

    if (reportData.year && reportData.month && !isMonthOpenForReporting(reportData.year, reportData.month)) {
      return res.status(400).json({
        success: false,
        error: `חודש ${reportData.month}/${reportData.year} טרם נפתח לדיווח (הדיווח לכל חודש נפתח ב-5 לאותו חודש)`
      });
    }
    if (Array.isArray(reportData.daysData)) {
      reportData.daysData.forEach(d => {
        if (d.overtimeHours !== undefined && d.overtimeHours !== null && d.overtimeHours !== '') {
          d.overtimeHours = Math.round(Number(d.overtimeHours) || 0);
        } else {
          d.overtimeHours = 0;
        }
      });
    }

    const reportId = reportData.id || `REP-${reportData.year || new Date().getFullYear()}-${String(reportData.month || 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const saved = await FirestoreDB.saveReport({ ...reportData, id: reportId });
    return res.json({
      success: true,
      report: saved,
      message: 'הדוח נשמר בהצלחה ב-Cloud Firestore'
    });
  } catch (err) {
    console.error('Error saving report to Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בשמירת דוח ב-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * POST /api/reports/batch
 * Bulk import / save multiple reports into Cloud Firestore
 */
router.post('/batch', async (req, res) => {
  try {
    const reportsList = req.body.reports || req.body;
    if (!Array.isArray(reportsList) || reportsList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'נא להעביר מערך דוחות לייבוא.'
      });
    }

    const saved = await FirestoreDB.saveReportsBatch(reportsList);
    return res.json({
      success: true,
      count: saved.length,
      reports: saved,
      message: `נקלטו ${saved.length} דוחות בהצלחה ב-Cloud Firestore`
    });
  } catch (err) {
    console.error('Error batch saving reports to Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בייבוא מרוכז של דוחות ל-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * PUT /api/reports/:id
 * Update an existing report
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const reportData = { ...req.body, id };
    const saved = await FirestoreDB.saveReport(reportData);
    return res.json({
      success: true,
      report: saved,
      message: 'הדוח עודכן בהצלחה ב-Cloud Firestore'
    });
  } catch (err) {
    console.error('Error updating report in Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון דוח ב-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete report from Cloud Firestore
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.query.role || (req.body && req.body.role);
    if (role === 'teacher') {
      const existing = await FirestoreDB.getReportById(id);
      if (existing && existing.status !== 'draft') {
        return res.status(403).json({
          success: false,
          error: 'מורה רשאי למחוק דוח אך ורק כאשר הוא במצב טיוטה.'
        });
      }
    }
    await FirestoreDB.deleteReport(id);
    return res.json({
      success: true,
      message: 'הדוח נמחק בהצלחה מ-Cloud Firestore'
    });
  } catch (err) {
    console.error('Error deleting report from Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת דוח מ-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * POST /api/reports/:id/send-principal-email
 * Queues email to the 'mail' Firestore collection for Firebase Trigger Email Extension (firestore-send-email)
 */
router.post('/:id/send-principal-email', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      targetEmail,
      principalName,
      teacherName,
      teacherId,
      monthName,
      year,
      schoolName,
      schoolCode,
      municipality,
      district,
      jobScope,
      totalRegularHours,
      totalOvertimeHours,
      totalAbsenceHours,
      overtimeBreakdown,
      reviewUrl,
      principalToken
    } = req.body || {};

    let report = null;
    let teacher = null;
    try {
      report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
      if (report) {
        teacher = db.prepare('SELECT * FROM users WHERE id = ?').get(report.user_id);
      }
    } catch (dbErr) {
      // fallback in memory / firestore
    }

    // Fallback to Cloud Firestore if not found in SQLite
    if (!report) {
      try {
        const firestoreReport = await FirestoreDB.getReportById(id);
        if (firestoreReport) {
          report = firestoreReport;
          teacher = await FirestoreDB.getUserById(firestoreReport.teacherId || firestoreReport.user_id);
          if (teacher) {
            let needsSave = false;
            if (!report.principalName && (teacher.principalName || teacher.principal_name)) {
              report.principalName = teacher.principalName || teacher.principal_name;
              needsSave = true;
            }
            if (!report.principalEmail && (teacher.principalEmail || teacher.principal_email)) {
              report.principalEmail = teacher.principalEmail || teacher.principal_email;
              needsSave = true;
            }
            if (!report.principalToken && (teacher.principalToken || teacher.schoolCode || report.schoolCode)) {
              report.principalToken = teacher.principalToken || ('PRINCIPAL_TOKEN_' + (teacher.schoolCode || report.schoolCode));
              needsSave = true;
            }
            if (needsSave) {
              await FirestoreDB.saveReport(report);
            }
          }
        }
      } catch (fErr) {
        // ignore
      }
    }

    const recipient = targetEmail || (teacher && (teacher.principal_email || teacher.principalEmail)) || (report && (report.principal_email || report.principalEmail)) || 'shalah.system.reports@gmail.com';
    const mName = monthName || (report && (HEBREW_MONTH_NAMES[report.month - 1] || report.month)) || 'אוגוסט';
    const y = year || (report && report.year) || 2026;
    const tName = teacherName || (teacher && (teacher.full_name || teacher.name)) || (report && (report.teacher_name || report.teacherName)) || 'מורה של"ח';
    const tId = teacherId || (teacher && (teacher.id_number || teacher.id)) || (report && (report.teacher_id || report.teacherId)) || '';
    const pName = principalName || (teacher && (teacher.principal_name || teacher.principalName)) || (report && (report.principal_name || report.principalName)) || 'מנהל/ת בית הספר';
    const sName = schoolName || (teacher && (teacher.school_name || teacher.schoolName)) || (report && (report.school_name || report.schoolName)) || 'בית הספר';
    const sCode = schoolCode || (teacher && (teacher.school_code || teacher.schoolCode)) || (report && (report.school_code || report.schoolCode)) || '';
    const mun = municipality || (teacher && teacher.municipality) || (report && report.municipality) || '';
    const dist = district || (teacher && teacher.district) || (report && report.district) || 'מרכז';
    const scope = jobScope || (teacher && (teacher.job_percentage || teacher.jobScope)) || 100;
    const derivedToken = principalToken || (report && (report.principal_token || report.principalToken)) || (teacher && teacher.principalToken) || (sCode ? 'PRINCIPAL_TOKEN_' + sCode : 'PRINCIPAL_TOKEN_SCHOOL');
    const link = reviewUrl || `https://shalah-hours-2026.web.app/principal.html?token=${derivedToken}&reportId=${id}`;

    const emailSubject = `אישור דוח שעות פעילות של"ח – ${tName} – חודש ${mName} ${y}`;
    
    const emailHtml = generatePrincipalEmailHtml({
      principalName: pName,
      teacherName: tName,
      teacherId: tId,
      monthName: mName,
      year: y,
      schoolName: sName,
      schoolCode: sCode,
      municipality: mun,
      district: dist,
      jobScope: scope,
      totalRegularHours: totalRegularHours || 0,
      totalOvertimeHours: totalOvertimeHours || 0,
      totalAbsenceHours: totalAbsenceHours || 0,
      overtimeBreakdown: overtimeBreakdown || [],
      reviewUrl: link
    });

    const emailPlainText = generatePrincipalEmailPlainText({
      principalName: pName,
      teacherName: tName,
      teacherId: tId,
      monthName: mName,
      year: y,
      schoolName: sName,
      schoolCode: sCode,
      totalRegularHours: totalRegularHours || 0,
      totalOvertimeHours: totalOvertimeHours || 0,
      totalAbsenceHours: totalAbsenceHours || 0,
      reviewUrl: link
    });

    const mailDocument = {
      to: [recipient],
      message: {
        subject: emailSubject,
        text: emailPlainText,
        html: emailHtml
      },
      reportId: id,
      teacherName: tName,
      teacherId: tId,
      principalName: pName,
      month: mName,
      year: y,
      reviewUrl: link,
      createdAt: new Date().toISOString()
    };

    // 1. Write to Firestore 'mail' collection (Firebase Trigger Email Extension)
    let firestoreDocId = `mail_${Date.now()}`;
    try {
      const { db: firestoreDb, admin } = require('../db/firestore-db');
      if (firestoreDb && typeof firestoreDb.collection === 'function') {
        const ref = await firestoreDb.collection('mail').add({
          ...mailDocument,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        firestoreDocId = ref.id;
      }
    } catch (fErr) {
      console.warn('Firestore mail collection notice:', fErr.message);
    }

    // 2. Add audit log
    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (typeof db.prepare === 'function') {
        db.prepare(`
          INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
          VALUES (?, ?, 'sent_principal_email', ?, ?, ?, ?)
        `).run(`aud_${crypto.randomUUID()}`, id, (teacher && teacher.id) || id, tName, `שליחה אוטומטית של קישור אישור מנהל/ת אל ${recipient} (Firestore Mail Doc: ${firestoreDocId})`, now);
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `הודעת אישור נשלחה אוטומטית למייל המנהל/ת (${recipient}) באמצעות Firebase Email Extension`,
      mailDocId: firestoreDocId
    });
  } catch (err) {
    console.error('Send principal email error:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בעיבוד שליחת הדוא"ל: ' + (err.message || 'שגיאת שרת')
    });
  }
});

module.exports = router;
