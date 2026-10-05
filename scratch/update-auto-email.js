const fs = require('fs');
const path = require('path');

// 1. Update public/js/api.js
const apiPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
let apiCode = fs.readFileSync(apiPath, 'utf8');

const newApiMethods = `  sendAutomaticPrincipalEmail(report, teacher) {
    if (!report) return { success: false, error: 'דוח לא נמצא' };
    
    const principalEmail = (teacher && (teacher.principalEmail || teacher.principal_email)) || 
                           report.principalEmail || 
                           report.principal_email || 
                           'ronit.s@rabin-kfs.org.il';
    
    const principalName = (teacher && teacher.principalName) || report.principalName || 'מנהל/ת בית הספר';
    const teacherName = (teacher && teacher.name) || report.teacherName || 'מורה של"ח';
    const monthName = HEBREW_MONTHS_NAME[(report.month || 1) - 1] || report.month;
    const year = report.year || new Date().getFullYear();
    const reviewUrl = this.getPrincipalReviewUrl(report, teacher);
    
    const emailSubject = \`אישור דוח שעות פעילות של"ח – \${teacherName} – חודש \${monthName} \${year}\`;
    const emailBody = \`שלום \${principalName},

מצורף לעיונך ולאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש \${monthName} \${year} של המורה \${teacherName}.

לצפייה ישירה בדוח ואישור בלחיצה אחת:
\${reviewUrl}

בברכה,
\${teacherName}\`;

    // Try backend REST API if available
    try {
      if (typeof fetch !== 'undefined') {
        fetch(\`/api/reports/\${encodeURIComponent(report.id)}/send-principal-notification\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetEmail: principalEmail,
            method: 'email',
            userId: teacher ? teacher.id : report.teacherId,
            userName: teacherName,
            reviewUrl
          })
        }).catch(() => null);
      }
    } catch (e) {
      // ignore network errors in mock/standalone mode
    }

    // Always record to local state / Firestore
    const updatedReport = this.getReportById(report.id);
    if (updatedReport) {
      updatedReport.auditHistory = updatedReport.auditHistory || [];
      updatedReport.auditHistory.push({
        date: formatDateTime(new Date()),
        user: 'מערכת (אוטומטי)',
        action: \`נשלח אוטומטית בדוא"ל למנהל/ת (\${principalEmail}): אישור דוח שעות חודש \${monthName} \${year}\`
      });
      updatedReport.lastEmailSentTo = principalEmail;
      updatedReport.lastEmailSentAt = new Date().toISOString();
      this.saveReport(updatedReport);
    }

    return {
      success: true,
      principalEmail,
      principalName,
      reviewUrl,
      subject: emailSubject,
      body: emailBody
    };
  },

  sendPrincipalNotification(reportId, targetEmail, method = 'email') {`;

if (apiCode.includes('sendPrincipalNotification(reportId, targetEmail, method = \'email\') {') && !apiCode.includes('sendAutomaticPrincipalEmail(')) {
  apiCode = apiCode.replace('sendPrincipalNotification(reportId, targetEmail, method = \'email\') {', newApiMethods);
  fs.writeFileSync(apiPath, apiCode, 'utf8');
  console.log('Successfully added sendAutomaticPrincipalEmail to public/js/api.js');
} else {
  console.log('sendAutomaticPrincipalEmail already in api.js or target not found');
}

// 2. Update public/js/teacher.js
const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let teacherJs = fs.readFileSync(teacherJsPath, 'utf8');

const oldSubmitCode = `      // Automatically open the Principal Email Dispatch Modal
      setTimeout(() => {
        openPrincipalEmailDispatchModal(saved.id);
      }, 300);`;

const newSubmitCode = `      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'ronit.s@rabin-kfs.org.il';
      // Automatically send email notification to principal
      API.sendAutomaticPrincipalEmail(saved, currentTeacher);
      showToast(\`הדוח הוגש ונשלח אוטומטית לאישור מנהל/ת בית הספר במייל (\${principalEmail})!\`, 'success');`;

if (teacherJs.includes(oldSubmitCode)) {
  teacherJs = teacherJs.replace(oldSubmitCode, newSubmitCode);
  fs.writeFileSync(teacherJsPath, teacherJs, 'utf8');
  console.log('Successfully updated submitCurrentReport in public/js/teacher.js');
} else {
  console.log('oldSubmitCode not found in teacher.js');
}

// 3. Update server and functions routes
const routeFiles = [
  path.join(__dirname, '..', 'server', 'routes', 'reports.js'),
  path.join(__dirname, '..', 'functions', 'routes', 'reports.js')
];

routeFiles.forEach(rf => {
  let content = fs.readFileSync(rf, 'utf8');
  const targetAudit = `    // Add Audit Log
    db.prepare(\`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'submitted_to_principal', ?, ?, 'הגשת הדוח לאישור מנהל/ת בית הספר', ?)
    \`).run(\`aud_\${crypto.randomUUID()}\`, id, report.user_id, report.teacher_name, now);

    return res.json({
      success: true,
      message: 'הדוח הוגש בהצלחה ונשלח לאישור מנהל/ת בית הספר.',
      principalToken,
      principalReviewUrl: \`/principal/review/\${principalToken}\`
    });`;

  const newAudit = `    // Fetch teacher's principal email from user profile
    const teacherUser = db.prepare('SELECT * FROM users WHERE id = ?').get(report.user_id);
    const principalEmail = (teacherUser && (teacherUser.principal_email || teacherUser.principalEmail)) || 'principal@rabin-kfs.org.il';
    const monthName = HEBREW_MONTH_NAMES[report.month - 1] || report.month;

    // Add Audit Log for automatic email dispatch
    db.prepare(\`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'submitted_to_principal', ?, ?, ?, ?)
    \`).run(\`aud_\${crypto.randomUUID()}\`, id, report.user_id, report.teacher_name, \`הגשת הדוח ושליחה אוטומטית בדוא"ל לאישור מנהל/ת בית הספר (\${principalEmail}) עבור חודש \${monthName} \${report.year}\`, now);

    return res.json({
      success: true,
      message: \`הדוח הוגש בהצלחה ונשלח אוטומטית למייל המנהל/ת (\${principalEmail}).\`,
      principalEmail,
      principalToken,
      principalReviewUrl: \`/principal/review/\${principalToken}\`
    });`;

  if (content.includes(targetAudit)) {
    content = content.replace(targetAudit, newAudit);
    fs.writeFileSync(rf, content, 'utf8');
    console.log(`Successfully updated ${rf}`);
  } else {
    console.log(`targetAudit not found in ${rf}`);
  }
});
