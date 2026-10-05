const { sendPrincipalApprovalEmail } = require('../services/emailService');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { getAvailableMonths, generateMonthDays, HEBREW_DAY_NAMES, HEBREW_MONTH_NAMES } = require('../services/calendarService');
const { generateSingleReportExcel } = require('../services/excelService');

/**
 * POST /api/reports/:id/send-principal-email
 * Send real email via Gmail to school principal
 */
router.post('/:id/send-principal-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmail, principalName, teacherName, teacherId, monthName, year, schoolName, schoolCode, totalOvertime, reviewUrl, principalToken } = req.body || {};

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

    const recipient = targetEmail || (teacher && teacher.principal_email) || 'shalah.system.reports@gmail.com';
    const mName = monthName || (report && HEBREW_MONTH_NAMES[report.month - 1]) || 'אוגוסט';
    const y = year || (report && report.year) || 2026;
    const tName = teacherName || (teacher && teacher.full_name) || (report && report.teacher_name) || 'מורה של"ח';
    const tId = teacherId || (teacher && teacher.id_number) || '';
    const pName = principalName || (teacher && teacher.principal_name) || 'מנהל/ת בית הספר';
    const sName = schoolName || (teacher && teacher.school_name) || 'בית הספר';
    const sCode = schoolCode || (teacher && teacher.school_code) || '';
    const link = reviewUrl || `https://shalah-hours-2026.web.app/principal.html?token=${principalToken || (report && report.principal_token) || 'PRINCIPAL_TOKEN_KFS_440123'}&reportId=${id}`;

    // Send the real email via Gmail
    const info = await sendPrincipalApprovalEmail({
      to: recipient,
      principalName: pName,
      teacherName: tName,
      teacherId: tId,
      monthName: mName,
      year: y,
      schoolName: sName,
      schoolCode: sCode,
      totalOvertime: totalOvertime || 0,
      reviewUrl: link
    });

    try {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      db.prepare(`
        INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
        VALUES (?, ?, 'sent_principal_email', ?, ?, ?, ?)
      `).run(`aud_${crypto.randomUUID()}`, id, (teacher && teacher.id) || id, tName, `שליחה אוטומטית של מייל אישור מנהל/ת אל ${recipient} (Message ID: ${info.messageId})`, now);
    } catch (e) {}

    return res.json({
      success: true,
      message: `דוא"ל אישור נשלח בהצלחה אל ${recipient}`,
      messageId: info.messageId
    });
  } catch (err) {
    console.error('Send principal email error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בשליחת הדוא"ל: ' + (err.message || 'שגיאת שרת') });
  }
});

module.exports = router;
