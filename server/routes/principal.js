const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { HEBREW_DAY_NAMES, HEBREW_MONTH_NAMES } = require('../services/calendarService');

/**
 * GET /api/principal/review/:token
 * Review report directly via secure token (no pre-login required)
 */
router.get('/review/:token', (req, res) => {
  try {
    const { token } = req.params;

    const report = db.prepare(`
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.phone as teacher_phone,
        u.email as teacher_email,
        u.school_name,
        u.school_code,
        u.district,
        u.municipality,
        u.job_percentage,
        u.principal_name as assigned_principal_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.principal_token = ?
    `).get(token);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'קישור האישור אינו תקף או שפג תוקפו.'
      });
    }

    const days = db.prepare(`
      SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC
    `).all(report.id);

    const attachments = db.prepare(`
      SELECT id, original_filename, stored_filename, file_size, mime_type, uploaded_at
      FROM report_attachments
      WHERE report_id = ?
      ORDER BY uploaded_at ASC
    `).all(report.id);

    const auditLogs = db.prepare(`
      SELECT * FROM audit_logs WHERE report_id = ? ORDER BY timestamp ASC
    `).all(report.id);

    let totalRegular = 0;
    let totalAbsence = 0;
    let totalOvertime = 0;

    const formattedDays = days.map(d => {
      totalRegular += Number(d.regular_hours) || 0;
      totalAbsence += Number(d.absence_hours) || 0;
      totalOvertime += Number(d.overtime_hours) || 0;

      return {
        ...d,
        day_name_hebrew: HEBREW_DAY_NAMES[d.day_of_week] || d.day_of_week
      };
    });

    return res.json({
      success: true,
      report: {
        ...report,
        month_name_hebrew: HEBREW_MONTH_NAMES[report.month - 1] || report.month,
        total_regular_hours: totalRegular,
        total_absence_hours: totalAbsence,
        total_overtime_hours: totalOvertime,
        days: formattedDays,
        attachments,
        auditLogs
      }
    });
  } catch (err) {
    console.error('Principal review error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בטעינת דוח לבדיקת מנהל/ת.' });
  }
});

/**
 * POST /api/principal/approve/:token
 * 1-click Approval by Principal
 */
router.post('/approve/:token', (req, res) => {
  try {
    const { token } = req.params;
    const { notes, principal_name } = req.body || {};

    const report = db.prepare(`
      SELECT r.*, u.full_name as teacher_name, u.principal_name as assigned_principal_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.principal_token = ?
    `).get(token);

    if (!report) {
      return res.status(404).json({ success: false, error: 'קישור לא נמצא או לא תקף.' });
    }

    if (report.status !== 'submitted_to_principal') {
      return res.status(400).json({
        success: false,
        error: `לא ניתן לאשר את הדוח מכיוון שסטטוס הדוח הנוכחי הוא: ${report.status}.`
      });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const pName = principal_name || report.assigned_principal_name || 'מנהל/ת בית הספר';

    db.prepare(`
      UPDATE reports SET
        status = 'principal_approved',
        principal_notes = ?,
        updated_at = ?
      WHERE id = ?
    `).run(notes || null, now, report.id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'principal_approved', NULL, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      report.id,
      pName,
      `אישור מנהל/ת בית הספר${notes ? ': ' + notes : ''}`,
      now
    );

    return res.json({
      success: true,
      message: 'הדוח אושר בהצלחה והועבר לבדיקת המנחה המחוזי.'
    });
  } catch (err) {
    console.error('Principal approve error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה באישור הדוח.' });
  }
});

/**
 * POST /api/principal/reject/:token
 * Reject / Return Report to Teacher with notes
 */
router.post('/reject/:token', (req, res) => {
  try {
    const { token } = req.params;
    const { notes, principal_name } = req.body || {};

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        error: 'חובה להזין הערות והנחיות לתיקון בעת החזרת הדוח למורה.'
      });
    }

    const report = db.prepare(`
      SELECT r.*, u.full_name as teacher_name, u.principal_name as assigned_principal_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.principal_token = ?
    `).get(token);

    if (!report) {
      return res.status(404).json({ success: false, error: 'קישור לא נמצא או לא תקף.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const pName = principal_name || report.assigned_principal_name || 'מנהל/ת בית הספר';

    // Unlock report back to returned_to_teacher and reset digital signatures
    db.prepare(`
      UPDATE reports SET
        status = 'returned_to_teacher',
        principal_notes = ?,
        digital_signature_id = NULL,
        signature_hash = NULL,
        signature_data = NULL,
        signed_by_role = NULL,
        signed_at = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(notes.trim(), now, report.id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'principal_rejected', NULL, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      report.id,
      pName,
      `החזרת דוח לתיקון המורה: ${notes.trim()}`,
      now
    );

    return res.json({
      success: true,
      message: 'הדוח הוחזר בהצלחה לתיקון המורה בצירוף הערות.'
    });
  } catch (err) {
    console.error('Principal reject error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בהחזרת הדוח.' });
  }
});

module.exports = router;
