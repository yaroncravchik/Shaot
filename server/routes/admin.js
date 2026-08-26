const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { HEBREW_MONTH_NAMES } = require('../services/calendarService');
const { signReport } = require('../services/cryptoService');
const { generateReportsSummaryExcel } = require('../services/excelService');

/**
 * GET /api/admin/reports
 * Master list of all reports in the system with comprehensive filters & statistics
 */
router.get('/reports', (req, res) => {
  try {
    const { district, status, supervisorId, year, month, search } = req.query;

    let sql = `
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
        u.principal_name,
        u.supervisor_id,
        (SELECT full_name FROM users WHERE id = u.supervisor_id) as supervisor_name,
        COALESCE((SELECT SUM(regular_hours) FROM report_days WHERE report_id = r.id), 0) as total_regular_hours,
        COALESCE((SELECT SUM(absence_hours) FROM report_days WHERE report_id = r.id), 0) as total_absence_hours,
        COALESCE((SELECT SUM(overtime_hours) FROM report_days WHERE report_id = r.id), 0) as total_overtime_hours,
        COALESCE((SELECT COUNT(*) FROM report_days WHERE report_id = r.id AND supervisor_edited = 1), 0) as supervisor_edited_count,
        COALESCE((SELECT COUNT(*) FROM report_attachments WHERE report_id = r.id), 0) as attachments_count
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (district) {
      sql += ' AND u.district = ?';
      params.push(district);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (supervisorId) {
      sql += ' AND u.supervisor_id = ?';
      params.push(supervisorId);
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
      sql += ' AND (u.full_name LIKE ? OR u.id_number LIKE ? OR u.school_name LIKE ? OR r.digital_signature_id LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY r.year DESC, r.month DESC, u.district ASC, u.full_name ASC';

    const reports = db.prepare(sql).all(params);

    const formatted = reports.map(r => ({
      ...r,
      month_name_hebrew: HEBREW_MONTH_NAMES[r.month - 1] || r.month
    }));

    // Calculate aggregated stats
    const stats = {
      totalReports: formatted.length,
      approvedForPayment: formatted.filter(r => r.status === 'approved_for_payment').length,
      supervisorApproved: formatted.filter(r => r.status === 'supervisor_approved').length,
      principalApproved: formatted.filter(r => r.status === 'principal_approved').length,
      submittedToPrincipal: formatted.filter(r => r.status === 'submitted_to_principal').length,
      drafts: formatted.filter(r => r.status === 'draft').length,
      returned: formatted.filter(r => r.status === 'returned_to_teacher' || r.status === 'returned_to_supervisor').length,
      totalOvertimeHours: formatted.reduce((acc, r) => acc + Number(r.total_overtime_hours || 0), 0),
      totalRegularHours: formatted.reduce((acc, r) => acc + Number(r.total_regular_hours || 0), 0),
      totalAbsenceHours: formatted.reduce((acc, r) => acc + Number(r.total_absence_hours || 0), 0)
    };

    return res.json({
      success: true,
      stats,
      reports: formatted
    });
  } catch (err) {
    console.error('Admin reports error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בטעינת דוחות ממונה.' });
  }
});

/**
 * POST /api/admin/reports/:id/approve-payment
 * Final approval for payment & Cryptographic RSA 2048-bit Digital Signing
 */
router.post('/reports/:id/approve-payment', (req, res) => {
  try {
    const { id } = req.params;
    const { admin_user_id, admin_name, admin_notes } = req.body || {};

    const report = db.prepare(`
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.school_name,
        u.school_code,
        u.district
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const days = db.prepare('SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC').all(id);

    let totalRegular = 0;
    let totalAbsence = 0;
    let totalOvertime = 0;
    days.forEach(d => {
      totalRegular += Number(d.regular_hours) || 0;
      totalAbsence += Number(d.absence_hours) || 0;
      totalOvertime += Number(d.overtime_hours) || 0;
    });

    // Execute Cryptographic RSA 2048-bit Digital Signing
    const signResult = signReport({
      id: report.id,
      user_id: report.user_id,
      teacher_name: report.teacher_name,
      id_number: report.id_number,
      school_code: report.school_code,
      school_name: report.school_name,
      district: report.district,
      year: report.year,
      month: report.month,
      total_regular_hours: totalRegular,
      total_absence_hours: totalAbsence,
      total_overtime_hours: totalOvertime,
      total_approved_overtime_hours: totalOvertime,
      days
    }, 'admin');

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE reports SET
        status = 'approved_for_payment',
        admin_notes = COALESCE(?, admin_notes),
        digital_signature_id = ?,
        signature_hash = ?,
        signature_data = ?,
        signed_by_role = 'admin',
        signed_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      admin_notes || null,
      signResult.signatureId,
      signResult.signatureHash,
      signResult.signatureData,
      signResult.signedAt,
      now,
      id
    );

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'admin_approved_payment', ?, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      id,
      admin_user_id || null,
      admin_name || 'רונן - ממונה ארצי',
      `אישור סופי לתשלום שכר וחתימה דיגיטלית RSA (מזהה: ${signResult.signatureId})`,
      now
    );

    return res.json({
      success: true,
      message: 'הדוח אושר סופית לתשלום שכר ונחתם בחתימה דיגיטלית מאובטחת.',
      signatureId: signResult.signatureId,
      signatureHash: signResult.signatureHash,
      signedAt: signResult.signedAt
    });
  } catch (err) {
    console.error('Admin approve payment error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה באישור לתשלום וחתימה דיגיטלית.' });
  }
});

/**
 * POST /api/admin/reports/:id/return
 * Return report to Supervisor or Teacher with notes
 */
router.post('/reports/:id/return', (req, res) => {
  try {
    const { id } = req.params;
    const { target, admin_user_id, admin_name, notes } = req.body || {};

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        error: 'חובה להזין הערות והנחיות בעת החזרת הדוח לעריכה.'
      });
    }

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const targetStatus = target === 'supervisor' ? 'returned_to_supervisor' : 'returned_to_teacher';
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    db.prepare(`
      UPDATE reports SET
        status = ?,
        admin_notes = ?,
        digital_signature_id = NULL,
        signature_hash = NULL,
        signature_data = NULL,
        signed_by_role = NULL,
        signed_at = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(targetStatus, notes.trim(), now, id);

    const targetHebrew = target === 'supervisor' ? 'מנחה מחוזי' : 'מורה';

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'admin_returned', ?, ?, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      id,
      admin_user_id || null,
      admin_name || 'רונן - ממונה ארצי',
      `החזרת דוח ל${targetHebrew}: ${notes.trim()}`,
      now
    );

    return res.json({
      success: true,
      message: `הדוח הוחזר בהצלחה ל${targetHebrew}.`
    });
  } catch (err) {
    console.error('Admin return error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בהחזרת הדוח.' });
  }
});

/**
 * GET /api/admin/reports/export
 * Master Excel export for Super Admin
 */
router.get('/reports/export', async (req, res) => {
  try {
    const { district, status, year, month } = req.query;

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
      WHERE 1=1
    `;
    const params = [];

    if (district) {
      sql += ' AND u.district = ?';
      params.push(district);
    }
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

    sql += ' ORDER BY r.year DESC, r.month DESC, u.district ASC, u.full_name ASC';

    const reports = db.prepare(sql).all(params);
    const title = `ריכוז כלל דוחות שעות פעילות חודשי של"ח - משרד החינוך`;

    const excelBuffer = await generateReportsSummaryExcel(reports, title);
    const fileName = `Shalah_Master_Reports_Export_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(excelBuffer);
  } catch (err) {
    console.error('Admin export error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בייצוא קובץ אקסל ארצי.' });
  }
});

module.exports = router;
