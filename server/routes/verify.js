const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { verifySignature, canonicalizePayload } = require('../services/cryptoService');
const { HEBREW_MONTH_NAMES } = require('../services/calendarService');

/**
 * GET /api/verify/:signatureId
 * Public digital signature verification endpoint
 */
router.get('/:signatureId', (req, res) => {
  try {
    const { signatureId } = req.params;

    if (!signatureId) {
      return res.status(400).json({ valid: false, error: 'מזהה חתימה חסר.' });
    }

    const report = db.prepare(`
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.school_name,
        u.school_code,
        u.district,
        u.job_percentage
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.digital_signature_id = ?
    `).get(signatureId);

    if (!report) {
      return res.status(404).json({
        valid: false,
        verified: false,
        error: 'חתימה דיגיטלית זו אינה קיימת במאגר הדיווחים המאושרים של משרד החינוך.'
      });
    }

    const days = db.prepare('SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC').all(report.id);

    let totalRegular = 0;
    let totalAbsence = 0;
    let totalOvertime = 0;
    days.forEach(d => {
      totalRegular += Number(d.regular_hours) || 0;
      totalAbsence += Number(d.absence_hours) || 0;
      totalOvertime += Number(d.overtime_hours) || 0;
    });

    const signingObject = {
      reportId: report.id,
      userId: report.user_id,
      teacherName: report.teacher_name,
      teacherIdNumber: report.id_number,
      schoolCode: report.school_code,
      schoolName: report.school_name,
      district: report.district,
      year: report.year,
      month: report.month,
      totalRegularHours: totalRegular,
      totalAbsenceHours: totalAbsence,
      totalOvertimeHours: totalOvertime,
      totalApprovedOvertimeHours: totalOvertime,
      daysSummary: days.map(d => ({
        day: d.day_number,
        regular: d.regular_hours,
        absence: d.absence_hours,
        overtime: d.overtime_hours,
        edited: d.supervisor_edited || 0
      })),
      signedByRole: report.signed_by_role || 'admin',
      signedAt: report.signed_at,
      signatureId: report.digital_signature_id
    };

    const canonicalString = canonicalizePayload(signingObject);
    const isCryptoValid = verifySignature(canonicalString, report.signature_data);

    const monthName = HEBREW_MONTH_NAMES[report.month - 1] || report.month;

    return res.json({
      success: true,
      valid: isCryptoValid,
      verified: isCryptoValid,
      certificate: {
        issuer: 'מדינת ישראל - משרד החינוך - מינהל חברה ונוער - תחום של"ח',
        algorithm: 'RSA 2048-bit / SHA-256',
        signatureId: report.digital_signature_id,
        signatureHash: report.signature_hash,
        signedAt: report.signed_at,
        signedByRole: report.signed_by_role === 'admin' ? 'ממונה ארצי תחום של"ח' : report.signed_by_role,
        status: report.status,
        reportDetails: {
          period: `${monthName} ${report.year}`,
          teacherName: report.teacher_name,
          teacherIdNumber: report.id_number.substring(0, 5) + '****',
          schoolName: report.school_name,
          schoolCode: report.school_code,
          district: report.district,
          totalRegularHours: totalRegular,
          totalAbsenceHours: totalAbsence,
          totalOvertimeHours: totalOvertime
        }
      }
    });
  } catch (err) {
    console.error('Verify signature error:', err);
    return res.status(500).json({ valid: false, error: 'שגיאה באימות החתימה הדיגיטלית.' });
  }
});

module.exports = router;
