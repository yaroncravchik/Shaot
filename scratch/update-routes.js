const fs = require('fs');
const path = require('path');

const routeFiles = [
  path.join(__dirname, '..', 'server', 'routes', 'reports.js'),
  path.join(__dirname, '..', 'functions', 'routes', 'reports.js')
];

const newRoute = `/**
 * POST /api/reports/:id/send-principal-notification
 * Record principal email/WhatsApp notification dispatch
 */
router.post('/:id/send-principal-notification', (req, res) => {
  try {
    const { id } = req.params;
    const { targetEmail, method, userId, userName } = req.body || {};

    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const actionDesc = method === 'whatsapp'
      ? 'שליחת הודעת קישור ישיר לאישור מנהל/ת בוואטסאפ'
      : \`שליחת הודעת קישור ישיר לאישור מנהל/ת בדוא"ל (\${targetEmail || 'לפי פרופיל'})\`;

    db.prepare(\`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'sent_principal_notification', ?, ?, ?, ?)
    \`).run(\`aud_\${crypto.randomUUID()}\`, id, userId || report.user_id, userName || 'מורה', actionDesc, now);

    return res.json({
      success: true,
      message: 'הודעת ההפניה לאישור המנהל/ת תועדה בהצלחה.'
    });
  } catch (err) {
    console.error('Send principal notification error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בתיעוד שליחת ההודעה.' });
  }
});

module.exports = router;`;

routeFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('send-principal-notification')) {
    content = content.replace('module.exports = router;', newRoute);
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Updated ${f}`);
  } else {
    console.log(`Already in ${f}`);
  }
});
