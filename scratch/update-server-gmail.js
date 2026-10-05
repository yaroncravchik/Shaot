const fs = require('fs');
const path = require('path');

const routeFiles = [
  path.join(__dirname, '..', 'server', 'routes', 'reports.js'),
  path.join(__dirname, '..', 'functions', 'routes', 'reports.js')
];

routeFiles.forEach(rf => {
  let content = fs.readFileSync(rf, 'utf8');

  // Add import if not present
  if (!content.includes('sendPrincipalApprovalEmail')) {
    content = `const { sendPrincipalApprovalEmail } = require('../services/emailService');\n` + content;
  }

  // Add endpoint POST /:id/send-principal-email before module.exports
  const emailEndpoint = `/**
 * POST /api/reports/:id/send-principal-email
 * Send real email via Gmail to school principal
 */
router.post('/:id/send-principal-email', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmail, principalName, teacherName, teacherId, monthName, year, schoolName, schoolCode, totalOvertime, reviewUrl } = req.body || {};

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const teacher = db.prepare('SELECT * FROM users WHERE id = ?').get(report.user_id);
    const recipient = targetEmail || (teacher && teacher.principal_email) || 'shalah.system.reports@gmail.com';
    const mName = monthName || HEBREW_MONTH_NAMES[report.month - 1] || report.month;
    const y = year || report.year;
    const tName = teacherName || (teacher && teacher.full_name) || report.teacher_name || 'מורה של"ח';
    const tId = teacherId || (teacher && teacher.id_number) || '';
    const pName = principalName || (teacher && teacher.principal_name) || 'מנהל/ת בית הספר';
    const sName = schoolName || (teacher && teacher.school_name) || 'בית הספר';
    const sCode = schoolCode || (teacher && teacher.school_code) || '';
    const link = reviewUrl || \`https://shalah-hours-2026.web.app/principal.html?token=\${report.principal_token || 'PRINCIPAL_TOKEN_KFS_440123'}&reportId=\${report.id}\`;

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

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(\`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'sent_principal_email', ?, ?, ?, ?)
    \`).run(\`aud_\${crypto.randomUUID()}\`, id, report.user_id, tName, \`שליחה אוטומטית של מייל אישור מנהל/ת אל \${recipient} (Message ID: \${info.messageId})\`, now);

    return res.json({
      success: true,
      message: \`דוא"ל אישור נשלח בהצלחה אל \${recipient}\`,
      messageId: info.messageId
    });
  } catch (err) {
    console.error('Send principal email error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בשליחת הדוא"ל: ' + (err.message || 'שגיאת שרת') });
  }
});

module.exports = router;`;

  if (!content.includes('send-principal-email')) {
    content = content.replace('module.exports = router;', emailEndpoint);
  }

  // Update submit to send real email
  const submitTarget = `    // Add Audit Log for automatic email dispatch
    db.prepare(\`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'submitted_to_principal', ?, ?, ?, ?)
    \`).run(\`aud_\${crypto.randomUUID()}\`, id, report.user_id, report.teacher_name, \`הגשת הדוח ושליחה אוטומטית בדוא"ל לאישור מנהל/ת בית הספר (\${principalEmail}) עבור חודש \${monthName} \${report.year}\`, now);`;

  const submitWithEmail = `    // Add Audit Log for automatic email dispatch
    db.prepare(\`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'submitted_to_principal', ?, ?, ?, ?)
    \`).run(\`aud_\${crypto.randomUUID()}\`, id, report.user_id, report.teacher_name, \`הגשת הדוח ושליחה אוטומטית בדוא"ל לאישור מנהל/ת בית הספר (\${principalEmail}) עבור חודש \${monthName} \${report.year}\`, now);

    // Send real Gmail email automatically in background
    const reviewUrl = \`https://shalah-hours-2026.web.app/principal.html?token=\${principalToken}&reportId=\${id}\`;
    try {
      const otQuery = db.prepare('SELECT COALESCE(SUM(overtime_hours), 0) as total FROM report_days WHERE report_id = ?').get(id);
      sendPrincipalApprovalEmail({
        to: principalEmail,
        principalName: (teacherUser && teacherUser.principal_name) || 'מנהל/ת בית הספר',
        teacherName: report.teacher_name,
        teacherId: (teacherUser && teacherUser.id_number) || '',
        monthName,
        year: report.year,
        schoolName: (teacherUser && teacherUser.school_name) || '',
        schoolCode: (teacherUser && teacherUser.school_code) || '',
        totalOvertime: otQuery ? otQuery.total : 0,
        reviewUrl
      }).catch(err => console.warn('Submit email warning:', err.message));
    } catch (e) {
      console.warn('Submit email trigger warning:', e.message);
    }`;

  if (content.includes(submitTarget)) {
    content = content.replace(submitTarget, submitWithEmail);
  }

  fs.writeFileSync(rf, content, 'utf8');
  console.log(`Successfully updated ${rf}`);
});
