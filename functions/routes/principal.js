const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { FirestoreDB } = require('../db/firestore-db');
const { HEBREW_DAY_NAMES, HEBREW_MONTH_NAMES } = require('../services/calendarService');

/**
 * GET /api/principal/review/:token
 * Review report directly via secure token (no pre-login required)
 */
router.get('/review/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // 1. Try SQLite first if db exists
    let report = null;
    let days = [];
    let attachments = [];
    let auditLogs = [];

    try {
      if (db) {
        report = db.prepare(`
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

        if (report) {
          days = db.prepare(`
            SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC
          `).all(report.id);

          attachments = db.prepare(`
            SELECT id, original_filename, stored_filename, file_size, mime_type, uploaded_at
            FROM report_attachments
            WHERE report_id = ?
            ORDER BY uploaded_at ASC
          `).all(report.id);

          auditLogs = db.prepare(`
            SELECT * FROM audit_logs WHERE report_id = ? ORDER BY timestamp ASC
          `).all(report.id);
        }
      }
    } catch (e) {
      // ignore SQLite error
    }

    // 2. Fall back to Cloud Firestore
    if (!report && FirestoreDB) {
      try {
        let fsReport = await FirestoreDB.getReportById(token);
        if (!fsReport) {
          const allReports = await FirestoreDB.getReports();
          fsReport = allReports.find(r =>
            r.principalToken === token ||
            r.principal_token === token ||
            (token.startsWith('PRINCIPAL_TOKEN_') && r.schoolCode === token.replace('PRINCIPAL_TOKEN_', ''))
          );
        }

        if (fsReport) {
          const teacher = await FirestoreDB.getUserById(fsReport.teacherId || fsReport.user_id);
          return res.json({
            success: true,
            report: {
              ...fsReport,
              teacherName: fsReport.teacherName || (teacher && (teacher.full_name || teacher.name)),
              schoolName: fsReport.schoolName || (teacher && teacher.schoolName),
              schoolCode: fsReport.schoolCode || (teacher && teacher.schoolCode),
              principalName: fsReport.principalName || (teacher && teacher.principalName),
              month_name_hebrew: HEBREW_MONTH_NAMES[(fsReport.month || 1) - 1] || fsReport.month,
              days: fsReport.daysData || [],
              attachments: fsReport.attachments || [],
              auditLogs: fsReport.auditHistory || []
            }
          });
        }
      } catch (fErr) {
        console.error('Firestore review search error:', fErr);
      }
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'קישור האישור אינו תקף או שפג תוקפו.'
      });
    }

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
 * GET /api/principal/report/:reportId
 * Fetch report directly by ID for principal view
 */
router.get('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    let report = null;

    if (FirestoreDB) {
      try {
        report = await FirestoreDB.getReportById(reportId);
      } catch (e) {}
    }

    if (!report && db) {
      try {
        report = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);
      } catch (e) {}
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'דוח לא נמצא במערכת.'
      });
    }

    return res.json({
      success: true,
      report
    });
  } catch (err) {
    console.error('Principal get report by ID error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בטעינת דוח: ' + err.message });
  }
});

/**
 * POST /api/principal/approve/:token
 * 1-click Approval by Principal
 */
router.post('/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { notes, principal_name } = req.body || {};
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Try SQLite
    let report = null;
    try {
      if (db) {
        report = db.prepare(`
          SELECT r.*, u.full_name as teacher_name, u.principal_name as assigned_principal_name
          FROM reports r
          JOIN users u ON r.user_id = u.id
          WHERE r.principal_token = ? OR r.id = ?
        `).get(token, token);
      }
    } catch (e) {}

    if (report && db) {
      const pName = principal_name || report.assigned_principal_name || 'מנהל/ת בית הספר';
      db.prepare(`
        UPDATE reports SET
          status = 'principal_approved',
          principal_notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(notes || null, now, report.id);

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
    }

    // 2. Try Cloud Firestore
    if (FirestoreDB) {
      let fsReport = await FirestoreDB.getReportById(token);
      if (!fsReport) {
        const all = await FirestoreDB.getReports();
        fsReport = all.find(r =>
          r.principalToken === token ||
          r.principal_token === token ||
          (token.startsWith('PRINCIPAL_TOKEN_') && r.schoolCode === token.replace('PRINCIPAL_TOKEN_', ''))
        );
      }

      if (fsReport) {
        const pName = principal_name || fsReport.principalName || 'מנהל/ת בית הספר';
        fsReport.status = 'pending_supervisor';
        fsReport.principalApprovedAt = new Date().toISOString();
        fsReport.principalRemarks = notes || 'מאושר';
        fsReport.auditHistory = fsReport.auditHistory || [];
        fsReport.auditHistory.push({
          date: new Date().toLocaleString('he-IL'),
          user: `${pName} (מנהל/ת)`,
          action: 'אישור הדוח והעברתו אל מנחה/ת של"ח' + (notes ? `: "${notes}"` : '')
        });

        const saved = await FirestoreDB.saveReport(fsReport);
        return res.json({
          success: true,
          message: 'הדוח אושר בהצלחה והועבר לבדיקת המנחה המחוזי.',
          report: saved
        });
      }
    }

    return res.status(404).json({ success: false, error: 'דוח לא נמצא לאישור.' });
  } catch (err) {
    console.error('Principal approve error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה באישור הדוח: ' + err.message });
  }
});

/**
 * POST /api/principal/reject/:token
 * Reject / Return Report to Teacher with notes
 */
router.post('/reject/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { notes, principal_name } = req.body || {};

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        error: 'חובה להזין הערות והנחיות לתיקון בעת החזרת הדוח למורה.'
      });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Try SQLite
    let report = null;
    try {
      if (db) {
        report = db.prepare(`
          SELECT r.*, u.full_name as teacher_name, u.principal_name as assigned_principal_name
          FROM reports r
          JOIN users u ON r.user_id = u.id
          WHERE r.principal_token = ? OR r.id = ?
        `).get(token, token);
      }
    } catch (e) {}

    if (report && db) {
      const pName = principal_name || report.assigned_principal_name || 'מנהל/ת בית הספר';
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
    }

    // 2. Try Cloud Firestore
    if (FirestoreDB) {
      let fsReport = await FirestoreDB.getReportById(token);
      if (!fsReport) {
        const all = await FirestoreDB.getReports();
        fsReport = all.find(r =>
          r.principalToken === token ||
          r.principal_token === token ||
          (token.startsWith('PRINCIPAL_TOKEN_') && r.schoolCode === token.replace('PRINCIPAL_TOKEN_', ''))
        );
      }

      if (fsReport) {
        const pName = principal_name || fsReport.principalName || 'מנהל/ת בית הספר';
        fsReport.status = 'returned';
        fsReport.principalRemarks = notes.trim();
        fsReport.signatureId = null;
        fsReport.auditHistory = fsReport.auditHistory || [];
        fsReport.auditHistory.push({
          date: new Date().toLocaleString('he-IL'),
          user: `${pName} (מנהל/ת)`,
          action: `החזרת דוח לתיקון המורה: "${notes.trim()}"`
        });

        const saved = await FirestoreDB.saveReport(fsReport);
        return res.json({
          success: true,
          message: 'הדוח הוחזר בהצלחה לתיקון המורה בצירוף הערות.',
          report: saved
        });
      }
    }

    return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
  } catch (err) {
    console.error('Principal reject error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בהחזרת הדוח: ' + err.message });
  }
});

module.exports = router;
