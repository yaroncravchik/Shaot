const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { getAvailableMonths, generateMonthDays, HEBREW_DAY_NAMES, HEBREW_MONTH_NAMES } = require('../services/calendarService');
const { generateSingleReportExcel } = require('../services/excelService');

/**
 * GET /api/reports/available-months
 * Returns list of 4 reporting months (-2 to +1 from current)
 */
router.get('/available-months', (req, res) => {
  try {
    const months = getAvailableMonths();
    return res.json({ success: true, months });
  } catch (err) {
    console.error('Available months error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בחישוב חודשי דיווח.' });
  }
});

/**
 * GET /api/reports/calendar/:userId/:year/:month
 * Generate or retrieve month calendar for a teacher
 */
router.get('/calendar/:userId/:year/:month', (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ success: false, error: 'שנה או חודש לא תקינים.' });
    }

    // Check if report already exists in DB
    const existingReport = db.prepare('SELECT * FROM reports WHERE user_id = ? AND year = ? AND month = ?').get(userId, y, m);

    if (existingReport) {
      const days = db.prepare(`
        SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC
      `).all(existingReport.id);

      return res.json({
        success: true,
        reportId: existingReport.id,
        status: existingReport.status,
        days: days.map(d => ({
          ...d,
          day_name_hebrew: HEBREW_DAY_NAMES[d.day_of_week] || d.day_of_week
        }))
      });
    }

    // Otherwise generate clean days based on teacher schedule
    const teacherSchedule = db.prepare('SELECT * FROM teacher_schedules WHERE user_id = ? ORDER BY day_of_week ASC').all(userId);
    const days = generateMonthDays(y, m, teacherSchedule);

    return res.json({
      success: true,
      reportId: null,
      status: 'new',
      days
    });
  } catch (err) {
    console.error('Calendar generation error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה ביצירת לוח שעות לחודש.' });
  }
});

/**
 * GET /api/reports/my-reports/:userId
 * List all monthly reports submitted or drafted by a teacher
 */
router.get('/my-reports/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const reports = db.prepare(`
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.school_name,
        u.school_code,
        u.district,
        u.job_percentage,
        COALESCE((SELECT SUM(regular_hours) FROM report_days WHERE report_id = r.id), 0) as total_regular_hours,
        COALESCE((SELECT SUM(absence_hours) FROM report_days WHERE report_id = r.id), 0) as total_absence_hours,
        COALESCE((SELECT SUM(overtime_hours) FROM report_days WHERE report_id = r.id), 0) as total_overtime_hours,
        COALESCE((SELECT COUNT(*) FROM report_days WHERE report_id = r.id AND supervisor_edited = 1), 0) as supervisor_edited_count,
        COALESCE((SELECT COUNT(*) FROM report_attachments WHERE report_id = r.id), 0) as attachments_count
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = ?
      ORDER BY r.year DESC, r.month DESC
    `).all(userId);

    const formatted = reports.map(r => ({
      ...r,
      month_name_hebrew: HEBREW_MONTH_NAMES[r.month - 1] || r.month,
      is_locked: r.status !== 'draft' && r.status !== 'returned_to_teacher'
    }));

    return res.json({ success: true, reports: formatted });
  } catch (err) {
    console.error('My reports error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בטעינת היסטוריית דוחות.' });
  }
});

/**
 * GET /api/reports/:id
 * Retrieve full report data with days, attachments, and audit logs
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

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
        u.principal_name,
        u.principal_email,
        u.supervisor_id,
        (SELECT full_name FROM users WHERE id = u.supervisor_id) as supervisor_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const days = db.prepare(`
      SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC
    `).all(id);

    const attachments = db.prepare(`
      SELECT id, original_filename, stored_filename, file_size, mime_type, uploaded_at
      FROM report_attachments
      WHERE report_id = ?
      ORDER BY uploaded_at ASC
    `).all(id);

    const auditLogs = db.prepare(`
      SELECT * FROM audit_logs WHERE report_id = ? ORDER BY timestamp ASC
    `).all(id);

    // Compute totals
    let totalRegular = 0;
    let totalAbsence = 0;
    let totalOvertime = 0;
    let supervisorEditedCount = 0;

    const formattedDays = days.map(d => {
      totalRegular += Number(d.regular_hours) || 0;
      totalAbsence += Number(d.absence_hours) || 0;
      totalOvertime += Number(d.overtime_hours) || 0;
      if (d.supervisor_edited) supervisorEditedCount++;

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
        is_locked: report.status !== 'draft' && report.status !== 'returned_to_teacher',
        total_regular_hours: totalRegular,
        total_absence_hours: totalAbsence,
        total_overtime_hours: totalOvertime,
        supervisor_edited_count: supervisorEditedCount,
        days: formattedDays,
        attachments,
        auditLogs
      }
    });
  } catch (err) {
    console.error('Get report error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בטעינת פרטי הדוח.' });
  }
});

/**
 * POST /api/reports/draft
 * Create or update a report draft (including auto-save)
 */
router.post('/draft', (req, res) => {
  try {
    const { user_id, year, month, days } = req.body || {};

    if (!user_id || !year || !month) {
      return res.status(400).json({ success: false, error: 'חסרים פרטי מזהה מורה, שנה או חודש.' });
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    // Verify teacher exists
    const teacher = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'מורה לא נמצא.' });
    }

    let report = db.prepare('SELECT * FROM reports WHERE user_id = ? AND year = ? AND month = ?').get(user_id, y, m);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (report) {
      // If report is locked (submitted, approved), do not allow draft edits
      if (report.status !== 'draft' && report.status !== 'returned_to_teacher') {
        return res.status(403).json({
          success: false,
          error: 'הדוח נעול לעריכה כיוון שכבר הוגש או אושר.'
        });
      }

      // Update updated_at
      db.prepare('UPDATE reports SET updated_at = ? WHERE id = ?').run(now, report.id);
    } else {
      const reportId = `rep_${y}_${String(m).padStart(2, '0')}_${user_id}`;
      db.prepare(`
        INSERT INTO reports (id, user_id, year, month, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'draft', ?, ?)
      `).run(reportId, user_id, y, m, now, now);

      report = { id: reportId, user_id, year: y, month: m, status: 'draft' };

      // Log initial creation
      db.prepare(`
        INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
        VALUES (?, ?, 'created_draft', ?, ?, 'יצירת טיוטת דוח שעות', ?)
      `).run(`aud_${crypto.randomUUID()}`, reportId, user_id, teacher.full_name, now);
    }

    // Upsert Days
    if (Array.isArray(days) && days.length > 0) {
      const upsertDay = db.prepare(`
        INSERT INTO report_days (
          id, report_id, day_number, day_of_week, date_str, is_field_day, is_holiday, holiday_name,
          regular_hours, absence_hours, absence_reason, overtime_hours, overtime_reason,
          grade_class, activity_description, supervisor_edited
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, 0
        )
        ON CONFLICT(report_id, day_number) DO UPDATE SET
          day_of_week = excluded.day_of_week,
          date_str = excluded.date_str,
          is_field_day = excluded.is_field_day,
          is_holiday = excluded.is_holiday,
          holiday_name = excluded.holiday_name,
          regular_hours = excluded.regular_hours,
          absence_hours = excluded.absence_hours,
          absence_reason = excluded.absence_reason,
          overtime_hours = excluded.overtime_hours,
          overtime_reason = excluded.overtime_reason,
          grade_class = excluded.grade_class,
          activity_description = excluded.activity_description
      `);

      days.forEach(d => {
        const dayId = d.id || `day_${report.id}_${d.day_number}`;
        upsertDay.run(
          dayId,
          report.id,
          Number(d.day_number),
          Number(d.day_of_week),
          d.date_str,
          d.is_field_day ? 1 : 0,
          d.is_holiday ? 1 : 0,
          d.holiday_name || null,
          Number(d.regular_hours) || 0,
          Number(d.absence_hours) || 0,
          d.absence_reason || null,
          Number(d.overtime_hours) || 0,
          d.overtime_reason || null,
          d.grade_class || null,
          d.activity_description || null
        );
      });
    }

    return res.json({
      success: true,
      message: 'הטיוטה נשמרה בהצלחה.',
      reportId: report.id
    });
  } catch (err) {
    console.error('Save draft error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בעת שמירת הטיוטה.' });
  }
});

/**
 * POST /api/reports/:id/submit
 * Submit monthly report to Principal for review & approval
 * Performs heightened field day validation and locks the report.
 */
router.post('/:id/submit', (req, res) => {
  try {
    const { id } = req.params;

    const report = db.prepare(`
      SELECT r.*, u.full_name as teacher_name, u.consent_signed
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    if (report.status !== 'draft' && report.status !== 'returned_to_teacher') {
      return res.status(400).json({ success: false, error: 'דוח זה כבר הוגש ולא ניתן להגישו שנית.' });
    }

    if (!report.consent_signed) {
      return res.status(400).json({
        success: false,
        error: 'חובה לאשר את ההסכמה הדיגיטלית לתנאי השימוש בפרופיל לפני הגשת הדוח.'
      });
    }

    const days = db.prepare('SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC').all(id);

    if (!days || days.length === 0) {
      return res.status(400).json({ success: false, error: 'הדוח אינו מכיל נתוני ימים להגשה.' });
    }

    // Business Logic Validations:
    // 1. Field Day Rule: Heightened reporting validation
    // For every day marked as is_field_day: must have overtime > 0 OR an overtime_reason/activity_description explaining it.
    for (const d of days) {
      if (d.is_field_day) {
        const hasOvertime = Number(d.overtime_hours) > 0;
        const hasReason = Boolean(d.overtime_reason && d.overtime_reason.trim());
        const hasActivity = Boolean(d.activity_description && d.activity_description.trim());

        if (!hasOvertime && !hasReason && !hasActivity) {
          return res.status(400).json({
            success: false,
            error: `ביום שדה (יום ${d.day_number} בחודש) חלה חובת דיווח מוגברת: נא להזין שעות נוספות שבוצעו, או לפרט סיבה/תיאור פעילות במידה ולא בוצעו שעות נוספות.`
          });
        }
      }

      // 2. Absence validation: if absence > 0, reason is required
      if (Number(d.absence_hours) > 0 && (!d.absence_reason || !d.absence_reason.trim())) {
        return res.status(400).json({
          success: false,
          error: `ביום ${d.day_number} בחודש דווחו שעות היעדרות (${d.absence_hours} שעות) ללא פירוט סיבת ההיעדרות.`
        });
      }

      // 3. Overtime validation: if overtime > 0, reason is required
      if (Number(d.overtime_hours) > 0 && (!d.overtime_reason || !d.overtime_reason.trim()) && (!d.activity_description || !d.activity_description.trim())) {
        return res.status(400).json({
          success: false,
          error: `ביום ${d.day_number} בחודש דווחו שעות נוספות (${d.overtime_hours} שעות) ללא ציון מהות הפעילות או סיבת השעות הנוספות.`
        });
      }
    }

    // Generate secure Principal Token (1-click link)
    const principalToken = `token-sec-${crypto.randomUUID()}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Update Report status and lock it
    db.prepare(`
      UPDATE reports SET
        status = 'submitted_to_principal',
        principal_token = ?,
        digital_signature_id = NULL,
        signature_hash = NULL,
        signature_data = NULL,
        signed_by_role = NULL,
        signed_at = NULL,
        updated_at = ?
      WHERE id = ?
    `).run(principalToken, now, id);

    // Add Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'submitted_to_principal', ?, ?, 'הגשת הדוח לאישור מנהל/ת בית הספר', ?)
    `).run(`aud_${crypto.randomUUID()}`, id, report.user_id, report.teacher_name, now);

    return res.json({
      success: true,
      message: 'הדוח הוגש בהצלחה ונשלח לאישור מנהל/ת בית הספר.',
      principalToken,
      principalReviewUrl: `/principal/review/${principalToken}`
    });
  } catch (err) {
    console.error('Submit report error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בהגשת הדוח.' });
  }
});

/**
 * GET /api/reports/:id/export
 * Download Single Report as formatted RTL Excel
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;

    const report = db.prepare(`
      SELECT
        r.*,
        u.full_name as teacher_name,
        u.id_number,
        u.phone as teacher_phone,
        u.school_name,
        u.school_code,
        u.district,
        u.job_percentage,
        u.principal_name,
        (SELECT full_name FROM users WHERE id = u.supervisor_id) as supervisor_name
      FROM reports r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `).get(id);

    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    report.days = db.prepare('SELECT * FROM report_days WHERE report_id = ? ORDER BY day_number ASC').all(id);

    const excelBuffer = await generateSingleReportExcel(report);
    const fileName = `Shalah_Report_${report.year}_${String(report.month).padStart(2, '0')}_${report.id_number}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    return res.send(excelBuffer);
  } catch (err) {
    console.error('Export report error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה ביצירת קובץ אקסל.' });
  }
});

module.exports = router;
