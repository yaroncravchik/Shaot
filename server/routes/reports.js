const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { getAvailableMonths, generateMonthDays, HEBREW_DAY_NAMES, HEBREW_MONTH_NAMES } = require('../services/calendarService');
const { generateSingleReportExcel } = require('../services/excelService');
const { generatePrincipalEmailHtml, generatePrincipalEmailPlainText } = require('../services/emailTemplate');
const { sendPrincipalEmail } = require('../services/emailService');

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
      // ignore
    }

    const recipient = targetEmail || (teacher && teacher.principal_email) || (report && report.principal_email) || 'shalah.system.reports@gmail.com';
    const mName = monthName || (report && HEBREW_MONTH_NAMES[report.month - 1]) || 'אוגוסט';
    const y = year || (report && report.year) || 2026;
    const tName = teacherName || (teacher && teacher.full_name) || (report && report.teacher_name) || 'מורה של"ח';
    const tId = teacherId || (teacher && (teacher.id_number || teacher.id)) || (report && report.teacher_id) || '';
    const pName = principalName || (teacher && teacher.principal_name) || (report && report.principal_name) || 'מנהל/ת בית הספר';
    const sName = schoolName || (teacher && teacher.school_name) || (report && report.school_name) || 'בית הספר';
    const sCode = schoolCode || (teacher && teacher.school_code) || (report && report.school_code) || '';
    const mun = municipality || (teacher && teacher.municipality) || (report && report.municipality) || '';
    const dist = district || (teacher && teacher.district) || (report && report.district) || 'מרכז';
    const scope = jobScope || (teacher && teacher.job_percentage) || 100;
    const link = reviewUrl || `https://shalah-hours-2026.web.app/principal.html?token=${principalToken || (report && report.principal_token) || 'PRINCIPAL_TOKEN_KFS_440123'}&reportId=${id}`;

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

    const sendResult = await sendPrincipalEmail({
      recipient,
      subject: emailSubject,
      html: emailHtml,
      text: emailPlainText,
      reportId: id,
      teacherName: tName,
      teacherId: tId,
      principalName: pName,
      monthName: mName,
      year: y,
      reviewUrl: link
    });

    const firestoreDocId = sendResult.mailDocId;

    // Add audit log
    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (typeof db.prepare === 'function') {
        db.prepare(`
          INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
          VALUES (?, ?, 'sent_principal_email', ?, ?, ?, ?)
        `).run(`aud_${crypto.randomUUID()}`, id, (teacher && teacher.id) || id, tName, `שליחה אוטומטית של קישור אישור מנהל/ת אל ${recipient} (ערוץ: ${sendResult.channel}, Doc: ${firestoreDocId})`, now);
      }
    } catch (e) {}

    return res.json({
      success: true,
      channel: sendResult.channel,
      message: sendResult.message,
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
