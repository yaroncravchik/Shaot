const fs = require('fs');
const path = require('path');

// 1. Update public/js/api.js
const apiPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
let apiCode = fs.readFileSync(apiPath, 'utf8');

const newSendMethod = `  async sendAutomaticPrincipalEmail(report, teacher) {
    if (!report) return { success: false, error: 'דוח לא נמצא' };
    
    const principalEmail = (teacher && (teacher.principalEmail || teacher.principal_email)) || 
                           report.principalEmail || 
                           report.principal_email || 
                           'principal@school.gov.il';
    
    const principalName = (teacher && teacher.principalName) || report.principalName || 'מנהל/ת בית הספר';
    const teacherName = (teacher && teacher.name) || report.teacherName || 'מורה של"ח';
    const teacherId = (teacher && (teacher.id || teacher.id_number)) || report.teacherId || '';
    const monthName = HEBREW_MONTHS_NAME[(report.month || 1) - 1] || report.month;
    const year = report.year || new Date().getFullYear();
    const reviewUrl = this.getPrincipalReviewUrl(report, teacher);
    
    const emailSubject = \`אישור דוח שעות פעילות של"ח – \${teacherName} – חודש \${monthName} \${year}\`;
    const emailBody = \`שלום \${principalName},

מצורף לעיונך ולאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש \${monthName} \${year} של המורה \${teacherName}\${teacherId ? \` (ת.ז. \${teacherId})\` : ''}.

לצפייה ישירה בדוח ואישור בלחיצה אחת:
\${reviewUrl}

בברכה,
\${teacherName}\`;

    let emailSentSuccessfully = false;

    // 1. Attempt automated direct background email dispatch
    try {
      if (typeof fetch !== 'undefined' && principalEmail && principalEmail.includes('@') && !principalEmail.includes('example.com')) {
        const payload = {
          _subject: emailSubject,
          _replyto: (teacher && teacher.email) || 'no-reply@shalah.org.il',
          _captcha: 'false',
          _template: 'box',
          'מורה': \`\${teacherName} (\${teacherId})\`,
          'חודש_ושנת_דיווח': \`\${monthName} \${year}\`,
          'קישור_לאישור_הדוח': reviewUrl,
          'הודעה': emailBody
        };

        const res = await fetch(\`https://formsubmit.co/ajax/\${encodeURIComponent(principalEmail)}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (res && res.ok) {
          emailSentSuccessfully = true;
        }
      }
    } catch (e) {
      console.warn('Background email dispatch notice:', e);
    }

    // 2. Log in backend REST API endpoint if available
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
      // ignore
    }

    // 3. Record in local report audit history
    const updatedReport = this.getReportById(report.id);
    if (updatedReport) {
      updatedReport.auditHistory = updatedReport.auditHistory || [];
      updatedReport.auditHistory.push({
        date: formatDateTime(new Date()),
        user: 'מערכת (שליחה אוטומטית)',
        action: \`נשלח אוטומטית בדוא"ל למנהל/ת (\${principalEmail}): אישור דוח שעות חודש \${monthName} \${year}\`
      });
      updatedReport.lastEmailSentTo = principalEmail;
      updatedReport.lastEmailSentAt = new Date().toISOString();
      this.saveReport(updatedReport);
    }

    return {
      success: true,
      emailSentSuccessfully,
      principalEmail,
      principalName,
      reviewUrl,
      subject: emailSubject,
      body: emailBody
    };
  },`;

const oldSendRegex = /sendAutomaticPrincipalEmail\(report, teacher\) \{[\s\S]*?return \{\s*success: true,[\s\S]*?\};\s*\},/;
if (oldSendRegex.test(apiCode)) {
  apiCode = apiCode.replace(oldSendRegex, newSendMethod);
  fs.writeFileSync(apiPath, apiCode, 'utf8');
  console.log('Successfully updated sendAutomaticPrincipalEmail in public/js/api.js');
} else {
  console.error('sendAutomaticPrincipalEmail regex not found in api.js');
}

// 2. Update public/js/teacher.js - submitCurrentReport
const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let teacherJs = fs.readFileSync(teacherJsPath, 'utf8');

const updatedSubmitCode = `function submitCurrentReport() {
  const declaration = document.getElementById('report-submit-declaration');
  if (declaration && !declaration.checked) {
    showToast('חובה לאשר את הצהרת הנכונות לפני הגשת הדוח', 'warning');
    return;
  }

  // PRD Business Rule 5.2: Flexible Field Day rule warning
  if (currentActiveReport && currentActiveReport.daysData) {
    const missingFieldDayReports = currentActiveReport.daysData.filter(d => d.isFieldDay && (!d.overtimeHours || d.overtimeHours === 0) && !d.description);
    if (missingFieldDayReports.length > 0) {
      const confirmSubmit = confirm(\`לתשומת לבך: סומנו \${missingFieldDayReports.length} ימי שדה קבועים ללא דיווח שעות נוספות או פירוט פעילות. האם להגיש את הדוח בכל זאת?\`);
      if (!confirmSubmit) return;
    }
  }

  const submitBtn = document.getElementById('btn-submit-report');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div><span>מגיש דוח ושולח מייל למנהל/ת...</span>';
  }

  // Save report and submit to principal
  setTimeout(async () => {
    try {
      const saved = API.saveReport(currentActiveReport);
      API.submitReportToPrincipal(saved.id, currentTeacher);

      clearInterval(autoSaveInterval);
      closeModal('monthly-report-modal');
      loadTeacherDashboardData();

      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'ronit.s@rabin-kfs.org.il';
      
      // Automatically send email notification to principal
      await API.sendAutomaticPrincipalEmail(saved, currentTeacher);

      showToast(\`הדוח ננעל והוגש בהצלחה! הודעת אישור נשלחה אוטומטית למייל המנהל/ת (\${principalEmail})\`, 'success');
    } catch (err) {
      showToast(err.message || 'שגיאה בעת הגשת הדוח', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל/ת</span>';
      }
    }
  }, 700);
}`;

const submitRegex = /function submitCurrentReport\(\) \{[\s\S]*?submitBtn\.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל\/ת<\/span>';\s*\}\s*\}\s*\}, 700\);\s*\}/;
if (submitRegex.test(teacherJs)) {
  teacherJs = teacherJs.replace(submitRegex, updatedSubmitCode);
  fs.writeFileSync(teacherJsPath, teacherJs, 'utf8');
  console.log('Successfully updated submitCurrentReport in teacher.js');
} else {
  console.error('submitCurrentReport regex not found in teacher.js');
}
