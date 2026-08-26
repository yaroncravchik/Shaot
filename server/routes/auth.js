const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

/**
 * POST /api/auth/login
 * Login by Israeli ID Number and Phone Number
 */
router.post('/login', (req, res) => {
  try {
    const { id_number, phone } = req.body || {};

    if (!id_number || !phone) {
      return res.status(400).json({
        success: false,
        error: 'נא להזין מספר תעודת זהות ומספר טלפון נייד.'
      });
    }

    const cleanId = String(id_number).trim();
    const cleanPhone = String(phone).trim().replace(/[- ]/g, '');

    // Search user
    const user = db.prepare(`
      SELECT * FROM users
      WHERE id_number = ? AND (phone = ? OR replace(replace(phone, '-', ''), ' ', '') = ?)
    `).get(cleanId, phone, cleanPhone);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'פרטי ההזדהות (ת"ז וטלפון נייד) אינם תואמים את רשימת המורשים במערכת של"ח.'
      });
    }

    // If teacher, fetch schedule
    let schedule = [];
    if (user.role === 'teacher') {
      schedule = db.prepare(`
        SELECT * FROM teacher_schedules
        WHERE user_id = ?
        ORDER BY day_of_week ASC
      `).all(user.id);
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        role: user.role,
        id_number: user.id_number,
        phone: user.phone,
        full_name: user.full_name,
        email: user.email,
        school_code: user.school_code,
        school_name: user.school_name,
        district: user.district,
        municipality: user.municipality,
        job_percentage: user.job_percentage,
        consent_signed: Boolean(user.consent_signed),
        consent_timestamp: user.consent_timestamp,
        principal_id: user.principal_id,
        principal_name: user.principal_name,
        principal_email: user.principal_email,
        supervisor_id: user.supervisor_id,
        schedule
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאת שרת פנימית בעת תהליך ההתחברות.'
    });
  }
});

/**
 * GET /api/auth/me/:userId
 * Fetch user details by ID
 */
router.get('/me/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'משתמש לא נמצא.' });
    }

    let schedule = [];
    if (user.role === 'teacher') {
      schedule = db.prepare('SELECT * FROM teacher_schedules WHERE user_id = ? ORDER BY day_of_week ASC').all(user.id);
    }

    return res.json({
      success: true,
      user: {
        ...user,
        consent_signed: Boolean(user.consent_signed),
        schedule
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.status(500).json({ success: false, error: 'שגיאת שרת פנימית.' });
  }
});

/**
 * GET /api/auth/demo-users
 * Returns list of demo users for quick login & switcher in UI
 */
router.get('/demo-users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, role, id_number, phone, full_name, email, school_name, district, job_percentage, consent_signed
      FROM users
      ORDER BY
        CASE role
          WHEN 'admin' THEN 1
          WHEN 'supervisor' THEN 2
          WHEN 'principal' THEN 3
          WHEN 'teacher' THEN 4
          ELSE 5
        END, full_name ASC
    `).all();

    return res.json({
      success: true,
      users: users.map(u => ({ ...u, consent_signed: Boolean(u.consent_signed) }))
    });
  } catch (err) {
    console.error('Get demo users error:', err);
    return res.status(500).json({ success: false, error: 'שגיאת שרת פנימית.' });
  }
});

module.exports = router;
