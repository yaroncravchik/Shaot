const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { HEBREW_MONTH_NAMES } = require('../services/calendarService');
const { generateReportsSummaryExcel } = require('../services/excelService');

/**
 * GET /api/supervisor/reports/:supervisorId
 * Get all reports for teachers in supervisor's district / assigned teachers
 */
router.get('/reports/:supervisorId', (req, res) => {
  try {
    const { supervisorId } = req.params;
    const { status, year, month, search } = req.query;

    const supervisor = db.prepare('SELECT * FROM users WHERE id = ?').get(supervisorId);
    if (!supervisor) {
      return res.status(404).json({ success: false, error: 'מנחה לא נמצא.' });
    }

    let sql = `
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.phone as teacher_phone,
        u.school_name,
        u.school_code,
        u.district,
        u.municipality,
        u.job_percentage,
        u.principal_name,
        COALESCE((SELECT SUM(regular_hours) FROM report_days WHERE report_id = r.id), 0) as total_regular_hours,
        COALESCE((SELECT SUM(absence_hours) FROM report_days WHERE report_id = r.id), 0) as total_absence_hours,
        COALESCE((SELECT SUM(overtime_hours) FROM report_days WHERE report_id = r.id), 0) as total_overtime_hours,
        COALESCE((SELECT COUNT(*) FROM report_days WHERE report_id = r.id AND supervisor_edited = 1), 0) as supervisor_edited_count,
        COALESCE((SELECT COUNT(*) FROM report_attachments WHERE report_id = r.id), 0) as attachments_count
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE (u.supervisor_id = ? OR u.district = ?)
    `;

    const params = [supervisorId, supervisor.district];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (year) {
      sql += ' AND r.year = ?';
      params.push(parseInt(year, 10));
    }
    if (month) {
      sql += ' AND r.month = ?';
      params.push(parseInt(month, 10));
    }
    if (search) {
      sql += ' AND (u.full_name LIKE ? OR u.id_number LIKE ? OR u.school_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY r.year DESC, r.month DESC, u.full_name ASC';

    const reports = db.prepare(sql).all(params);

    const formatted = reports.map(r => ({
      ...r,
      month_name_hebrew: HEBREW_MONTH_NAMES[r.month - 1] || r.month
    }));

    return res.json({
      success: true,
      supervisor: {
        id: supervisor.id,
        full_name: supervisor.full_name,
        district: supervisor.district
      },
      reports: formatted
    });
  } catch (err) {
    console.error('Supervisor reports error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בטעינת דוחות מנחה.' });
  }
});

/**
 * PUT /api/supervisor/reports/:id/edit-hours
 * Inline table edits: sets supervisor_edited=1, preserves original hours, updates values & notes
 */
router.put('/reports/:id/edit-hours', (req, res) => {
  try {
    const { id } = req.params;
    const { edits, supervisor_user_id, supervisor_name, supervisor_notes } = req.body || {};

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (Array.isArray(edits) && edits.length > 0) {
      const getDay = db.prepare('SELECT * FROM report_days WHERE report_id = ? AND day_number = ?');
      const updateDay = db.prepare(`
        UPDATE report_days SET
          overtime_hours = ?,
          absence_hours = ?,
          supervisor_edited = 1,
          original_overtime_hours = COALESCE(original_overtime_hours, ?),
          original_absence_hours = COALESCE(original_absence_hours, ?),
          supervisor_note = ?
        WHERE report_id = ? AND day_number = ?
      `);

      edits.forEach(edit => {
        const currentDay = getDay.get(id, edit.day_number);
        if (currentDay) {
          const origOt = currentDay.supervisor_edited ? currentDay.original_overtime_hours : currentDay.overtime_hours;
          const origAbs = currentDay.supervisor_edited ? currentDay.original_absence_hours : currentDay.absence_hours;

          updateDay.run(
            Number(edit.overtime_hours) >= 0 ? Number(edit.overtime_hours) : currentDay.overtime_hours,
            Number(edit.absence_hours) >= 0 ? Number(edit.absence_hours) : currentDay.absence_hours,
            origOt,
            origAbs,
            edit.supervisor_note || currentDay.supervisor_note || null,
            id,
            edit.day_number
          );
        }
      });
    }

    // Update Report supervisor_notes and reset any previous digital signature
    db.prepare(`
      UPDATE reports SET
        supervisor_notes = COALESCE(?, supervisor_notes),
        digital_signature_id = NULL,
        signature_hash = NULL,
        signature_data = NULL,
        signed_by_role = NULL,
        signed_at = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(supervisor_notes || null, now, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'supervisor_edited', ?, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      id,
      supervisor_user_id || null,
      supervisor_name || 'מנחה מחוזי',
      `עריכת שעות ישירה בדוח (עודכנו ${edits ? edits.length : 0} ימים)`,
      now
    );

    return res.json({
      success: true,
      message: 'השעות עודכנו והודגשו בהצלחה בדוח.'
    });
  } catch (err) {
    console.error('Supervisor edit error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בעריכת שעות הדוח.' });
  }
});

/**
 * POST /api/supervisor/reports/:id/approve
 * Approve report by Supervisor and pass to Super Admin (Ronen)
 */
router.post('/reports/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { supervisor_user_id, supervisor_name, notes } = req.body || {};

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE reports SET
        status = 'supervisor_approved',
        supervisor_notes = COALESCE(?, supervisor_notes),
        updated_at = ?
      WHERE id = ?
    `).run(notes || null, now, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'supervisor_approved', ?, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      id,
      supervisor_user_id || null,
      supervisor_name || 'מנחה מחוזי',
      `אישור מנחה מחוזי והעברה לבדיקת ממונה מחוז מרכז${notes ? ': ' + notes : ''}`,
      now
    );

    return res.json({
      success: true,
      message: 'הדוח אושר בהצלחה והועבר לבדיקת ממונה מחוז מרכז.'
    });
  } catch (err) {
    console.error('Supervisor approve error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה באישור מנחה.' });
  }
});

/**
 * POST /api/supervisor/reports/:id/return
 * Return report to teacher for fixes with mandatory notes
 */
router.post('/reports/:id/return', (req, res) => {
  try {
    const { id } = req.params;
    const { supervisor_user_id, supervisor_name, notes } = req.body || {};

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        error: 'חובה להזין הנחיות לתיקון בעת החזרת הדוח למורה.'
      });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Reset signatures and set returned_to_teacher
    db.prepare(`
      UPDATE reports SET
        status = 'returned_to_teacher',
        supervisor_notes = ?,
        digital_signature_id = NULL,
        signature_hash = NULL,
        signature_data = NULL,
        signed_by_role = NULL,
        signed_at = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(notes.trim(), now, id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'supervisor_returned', ?, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      id,
      supervisor_user_id || null,
      supervisor_name || 'מנחה מחוזי',
      `החזרת דוח לתיקון המורה: ${notes.trim()}`,
      now
    );

    return res.json({
      success: true,
      message: 'הדוח הוחזר לתיקון המורה.'
    });
  } catch (err) {
    console.error('Supervisor return error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בהחזרת דוח.' });
  }
});

/**
 * GET /api/supervisor/reports/export/:supervisorId
 * Export District reports to Excel
 */
router.get('/reports/export/:supervisorId', async (req, res) => {
  try {
    const { supervisorId } = req.params;
    const { year, month } = req.query;

    const supervisor = db.prepare('SELECT * FROM users WHERE id = ?').get(supervisorId);
    if (!supervisor) {
      return res.status(404).json({ success: false, error: 'מנחה לא נמצא.' });
    }

    let sql = `
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.phone,
        u.school_name,
        u.school_code,
        u.district,
        COALESCE((SELECT SUM(regular_hours) FROM report_days WHERE report_id = r.id), 0) as total_regular_hours,
        COALESCE((SELECT SUM(absence_hours) FROM report_days WHERE report_id = r.id), 0) as total_absence_hours,
        COALESCE((SELECT SUM(overtime_hours) FROM report_days WHERE report_id = r.id), 0) as total_overtime_hours
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE (u.supervisor_id = ? OR u.district = ?)
    `;
    const params = [supervisorId, supervisor.district];

    if (year) {
      sql += ' AND r.year = ?';
      params.push(parseInt(year, 10));
    }
    if (month) {
      sql += ' AND r.month = ?';
      params.push(parseInt(month, 10));
    }

    sql += ' ORDER BY r.year DESC, r.month DESC, u.full_name ASC';

    const reports = db.prepare(sql).all(params);
    const title = `ריכוז דוחות שעות של"ח - מחוז ${supervisor.district} (${supervisor.full_name})`;

    const excelBuffer = await generateReportsSummaryExcel(reports, title);
    const fileName = `Shalah_District_${encodeURIComponent(supervisor.district)}_Reports.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(excelBuffer);
  } catch (err) {
    console.error('Supervisor export error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בייצוא קובץ אקסל.' });
  }
});

module.exports = router;
