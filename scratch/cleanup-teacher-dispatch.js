const fs = require('fs');
const path = require('path');

// 1. Update public/js/teacher.js: remove canSendToPrincipal button from renderHistoryTable
const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let teacherJs = fs.readFileSync(teacherJsPath, 'utf8');

const oldActions = `    const canSendToPrincipal = r.status === 'pending_principal' || r.status === 'returned';

    const actionButtons = \`
      <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="openReportModal(\${r.year}, \${r.month})">
          \${r.status === 'draft' || r.status === 'returned' ? '✏️ עריכה' : '👁️ צפייה'}
        </button>
        \${canSendToPrincipal ? \`
          <button class="btn btn-outline-primary btn-sm" onclick="openPrincipalEmailDispatchModal('\${r.id}')" title="שליחה ואישור מנהל/ת בית הספר">
            <span>📧 שלח למנהל/ת</span>
          </button>
        \` : ''}
        \${isApproved ? \`
          <button class="btn btn-outline-primary btn-sm" onclick="downloadReportPDF('\${r.id}')" title="הורדת דוח מאושר בקובץ PDF">
            <span>📄 הורדת PDF</span>
          </button>
        \` : ''}
      </div>
    \`;`;

const cleanActions = `    const actionButtons = \`
      <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="openReportModal(\${r.year}, \${r.month})">
          \${r.status === 'draft' || r.status === 'returned' ? '✏️ עריכה' : '👁️ צפייה'}
        </button>
        \${isApproved ? \`
          <button class="btn btn-outline-primary btn-sm" onclick="downloadReportPDF('\${r.id}')" title="הורדת דוח מאושר בקובץ PDF">
            <span>📄 הורדת PDF</span>
          </button>
        \` : ''}
      </div>
    \`;`;

if (teacherJs.includes(oldActions)) {
  teacherJs = teacherJs.replace(oldActions, cleanActions);
} else {
  // Regex replacement for action buttons
  const actRegex = /const canSendToPrincipal = r\.status === 'pending_principal' \|\| r\.status === 'returned';[\s\S]*?const actionButtons = `[\s\S]*?`;/;
  if (actRegex.test(teacherJs)) {
    teacherJs = teacherJs.replace(actRegex, cleanActions);
  }
}

// 2. Clean up submitCurrentReport to just save, submit, send email, and toast
const oldSubmitRegex = /function submitCurrentReport\(\) \{[\s\S]*?submitBtn\.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל\/ת<\/span>';\s*\}\s*\}\s*\}, 700\);\s*\}/;

const cleanSubmitCode = `function submitCurrentReport() {
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

      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'shalah.system.reports@gmail.com';
      
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

if (oldSubmitRegex.test(teacherJs)) {
  teacherJs = teacherJs.replace(oldSubmitRegex, cleanSubmitCode);
}

fs.writeFileSync(teacherJsPath, teacherJs, 'utf8');
console.log('Successfully updated teacher.js');

// 3. Update public/teacher.html: remove modal-principal-email-dispatch
const teacherHtmlPath = path.join(__dirname, '..', 'public', 'teacher.html');
let teacherHtml = fs.readFileSync(teacherHtmlPath, 'utf8');

const modalRegex = /<!-- =+[\s\S]*?PRINCIPAL EMAIL DISPATCH MODAL[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
if (modalRegex.test(teacherHtml)) {
  teacherHtml = teacherHtml.replace(modalRegex, '');
  fs.writeFileSync(teacherHtmlPath, teacherHtml, 'utf8');
  console.log('Successfully removed modal-principal-email-dispatch from teacher.html');
} else {
  console.log('modal-principal-email-dispatch regex did not match teacher.html');
}
