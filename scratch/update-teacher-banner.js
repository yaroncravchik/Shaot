const fs = require('fs');
const path = require('path');

const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let code = fs.readFileSync(teacherJsPath, 'utf8');

// 1. Update renderFeedbackBanner
const oldBannerTarget = `function renderFeedbackBanner(reports) {
  const feedbackContainer = document.getElementById('teacher-feedback-container');
  feedbackContainer.innerHTML = '';

  // Check if any report is returned or supervisor edited
  const returnedReport = reports.find(r => r.status === 'returned');
  const editedReport = reports.find(r => r.status === 'supervisor_edited');`;

const newBannerReplacement = `function renderFeedbackBanner(reports) {
  const feedbackContainer = document.getElementById('teacher-feedback-container');
  feedbackContainer.innerHTML = '';

  // Check if any report is returned, supervisor edited, or pending principal
  const returnedReport = reports.find(r => r.status === 'returned');
  const editedReport = reports.find(r => r.status === 'supervisor_edited');
  const pendingPrincipalReport = reports.find(r => r.status === 'pending_principal');

  if (pendingPrincipalReport) {
    const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || pendingPrincipalReport.principalEmail || 'ronit.s@rabin-kfs.org.il';
    const monthName = HEBREW_MONTHS_NAME[pendingPrincipalReport.month - 1] || pendingPrincipalReport.month;
    feedbackContainer.innerHTML += \`
      <div class="banner-alert banner-info animate-fade-in mb-2">
        <div class="banner-alert-icon">📧</div>
        <div class="banner-alert-content flex justify-between items-center flex-wrap gap-sm">
          <div>
            <div class="banner-alert-title">דוח שעות חודש \${monthName} \${pendingPrincipalReport.year} ממתין לאישור מנהל/ת בית הספר:</div>
            <div>הדוח ננעל והודעה עם קישור ישיר לאישור נשלחה אוטומטית למייל המנהל/ת (<strong>\${principalEmail}</strong>).</div>
          </div>
          <button class="btn btn-outline-primary btn-sm" onclick="openPrincipalEmailDispatchModal('\${pendingPrincipalReport.id}')">
            🔗 צפייה בפרטי השליחה / העתקת קישור
          </button>
        </div>
      </div>
    \`;
  }`;

if (code.includes(oldBannerTarget)) {
  code = code.replace(oldBannerTarget, newBannerReplacement);
}

// 2. Clean up toast in submitCurrentReport
const oldSubmitToast = `      showToast('הדוח הוגש וננעל בהצלחה!', 'success');

      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'ronit.s@rabin-kfs.org.il';
      // Automatically send email notification to principal
      API.sendAutomaticPrincipalEmail(saved, currentTeacher);
      showToast(\`הדוח הוגש ונשלח אוטומטית לאישור מנהל/ת בית הספר במייל (\${principalEmail})!\`, 'success');`;

const newSubmitToast = `      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'ronit.s@rabin-kfs.org.il';
      // Automatically send email notification to principal
      API.sendAutomaticPrincipalEmail(saved, currentTeacher);
      showToast(\`הדוח ננעל והוגש בהצלחה! הודעת אישור נשלחה אוטומטית למייל המנהל/ת (\${principalEmail})\`, 'success');`;

if (code.includes(oldSubmitToast)) {
  code = code.replace(oldSubmitToast, newSubmitToast);
}

fs.writeFileSync(teacherJsPath, code, 'utf8');
console.log('Successfully updated teacher banner and toast in public/js/teacher.js');
