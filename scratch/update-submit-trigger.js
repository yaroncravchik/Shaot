const fs = require('fs');
const path = require('path');

const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let code = fs.readFileSync(teacherJsPath, 'utf8');

const targetStr = `function submitCurrentReport() {
  const eligibility = checkReportSubmissionEligibility(selectedYear, selectedMonth);
  if (!eligibility.allowed) {
    showToast(eligibility.reason, 'warning');
    return;
  }

  const declaration = document.getElementById('report-submit-declaration');
  if (!declaration.checked) {
    showToast('חובה לאשר את הצהרת הנכונות לפני הגשת הדוח', 'warning');
    return;
  }

  // PRD Business Rule 5.2: Flexible Field Day rule warning
  const missingFieldDayReports = currentActiveReport.daysData.filter(d => d.isFieldDay && (!d.overtimeHours || d.overtimeHours === 0) && !d.description);
  if (missingFieldDayReports.length > 0) {
    const confirmSubmit = confirm(\`לתשומת לבך: סומנו \${missingFieldDayReports.length} ימי שדה קבועים ללא דיווח שעות נוספות או פירוט פעילות. האם להגיש את הדוח בכל זאת?\`);
    if (!confirmSubmit) return;
  }

  const submitBtn = document.getElementById('btn-submit-report');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner"></div><span>מגיש דוח ונועל...</span>';

  // Save report and submit to principal
  setTimeout(() => {
    try {
      const saved = API.saveReport(currentActiveReport);
      API.submitReportToPrincipal(saved.id, currentTeacher);

      clearInterval(autoSaveInterval);
      closeModal('monthly-report-modal');
      loadTeacherDashboardData();
      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'ronit.s@rabin-kfs.org.il';
      // Automatically send email notification to principal
      API.sendAutomaticPrincipalEmail(saved, currentTeacher);
      showToast(\`הדוח ננעל והוגש בהצלחה! הודעת אישור נשלחה אוטומטית למייל המנהל/ת (\${principalEmail})\`, 'success');
    } catch (err) {
      showToast(err.message || 'שגיאה בעת הגשת הדוח', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל/ת</span>';
    }
  }, 700);
}`;

const replacementStr = `function submitCurrentReport() {
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
    submitBtn.innerHTML = '<div class="spinner"></div><span>מגיש דוח ושולח מייל...</span>';
  }

  // Save report and submit to principal
  setTimeout(() => {
    try {
      const saved = API.saveReport(currentActiveReport);
      API.submitReportToPrincipal(saved.id, currentTeacher);

      clearInterval(autoSaveInterval);
      closeModal('monthly-report-modal');
      loadTeacherDashboardData();

      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'ronit.s@rabin-kfs.org.il';
      
      // Automatically send email notification to principal
      API.sendAutomaticPrincipalEmail(saved, currentTeacher);
      
      // Open the interactive principal email dispatch modal
      openPrincipalEmailDispatchModal(saved.id);

      // Trigger default mail client
      setTimeout(() => {
        openDispatchMailClient();
      }, 400);

      showToast(\`הדוח ננעל בהצלחה! נפתחה טיוטת דוא"ל לשליחה למנהל/ת (\${principalEmail})\`, 'success');
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

const normCode = code.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, replacementStr);
  fs.writeFileSync(teacherJsPath, updated, 'utf8');
  console.log('Successfully updated submitCurrentReport in teacher.js');
} else {
  console.error('Target not found in teacher.js');
  process.exit(1);
}
