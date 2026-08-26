const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

/**
 * GET /api/profile/:userId
 * Retrieve full user profile and weekly teaching schedule
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'משתמש לא נמצא.' });
    }

    const schedule = db.prepare(`
      SELECT * FROM teacher_schedules
      WHERE user_id = ?
      ORDER BY day_of_week ASC
    `).all(userId);

    // List of supervisors for selection dropdown
    const supervisors = db.prepare(`
      SELECT id, full_name, email, district FROM users WHERE role = 'supervisor' ORDER BY full_name ASC
    `).all();

    return res.json({
      success: true,
      profile: {
        ...user,
        consent_signed: Boolean(user.consent_signed),
        schedule,
        availableSupervisors: supervisors
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ success: false, error: 'שגיאת שרת פנימית בטעינת פרופיל.' });
  }
});

/**
 * PUT /api/profile/:userId
 * Update personal information, digital consent agreement, and weekly schedule
 */
router.put('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const body = req.body || {};

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      return res.status(404).json({ success: false, error: 'משתמש לא נמצא.' });
    }

    // Process consent
    const consentSigned = body.consent_signed ? 1 : 0;
    let consentTimestamp = existingUser.consent_timestamp;
    if (consentSigned && !existingUser.consent_signed) {
      consentTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    } else if (!consentSigned) {
      consentTimestamp = null;
    }

    // Update User Profile
    db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        school_code = COALESCE(?, school_code),
        school_name = COALESCE(?, school_name),
        district = COALESCE(?, district),
        municipality = COALESCE(?, municipality),
        job_percentage = COALESCE(?, job_percentage),
        consent_signed = ?,
        consent_timestamp = ?,
        principal_name = COALESCE(?, principal_name),
        principal_email = COALESCE(?, principal_email),
        supervisor_id = COALESCE(?, supervisor_id)
      WHERE id = ?
    `).run(
      body.full_name,
      body.phone,
      body.email,
      body.school_code,
      body.school_name,
      body.district,
      body.municipality,
      body.job_percentage,
      consentSigned,
      consentTimestamp,
      body.principal_name,
      body.principal_email,
      body.supervisor_id,
      userId
    );

    // Update Weekly Schedules if provided
    if (Array.isArray(body.schedule)) {
      const upsertSchedule = db.prepare(`
        INSERT INTO teacher_schedules (id, user_id, day_of_week, regular_hours, is_field_day)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, day_of_week) DO UPDATE SET
          regular_hours = excluded.regular_hours,
          is_field_day = excluded.is_field_day
      `);

      body.schedule.forEach(s => {
        const schId = s.id || `sch_${userId}_${s.day_of_week}`;
        upsertSchedule.run(
          schId,
          userId,
          Number(s.day_of_week),
          Number(s.regular_hours) || 0,
          s.is_field_day ? 1 : 0
        );
      });
    }

    // Fetch updated profile
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const updatedSchedule = db.prepare('SELECT * FROM teacher_schedules WHERE user_id = ? ORDER BY day_of_week ASC').all(userId);

    return res.json({
      success: true,
      message: 'הפרופיל ומערכת השעות עודכנו בהצלחה.',
      profile: {
        ...updatedUser,
        consent_signed: Boolean(updatedUser.consent_signed),
        schedule: updatedSchedule
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, error: 'שגיאת שרת בעת שמירת הפרופיל.' });
  }
});

module.exports = router;
