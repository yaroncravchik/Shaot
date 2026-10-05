const fs = require('fs');
const path = require('path');

const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let code = fs.readFileSync(teacherJsPath, 'utf8');

// 1. Update action buttons in renderHistoricalReportsTable
const oldActionButtons = `    const actionButtons = \`
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

const newActionButtons = `    const canSendToPrincipal = r.status === 'pending_principal' || r.status === 'returned';

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

if (code.includes('const actionButtons = `')) {
  code = code.replace(oldActionButtons, newActionButtons);
} else {
  console.error('Could not find oldActionButtons');
}

// 2. Add dispatch functions and update submitCurrentReport
const newDispatchCode = `let currentDispatchReport = null;

function openPrincipalEmailDispatchModal(reportId) {
  const report = API.getReportById(reportId) || currentActiveReport;
  if (!report) {
    showToast('דוח לא נמצא במערכת', 'error');
    return;
  }

  currentDispatchReport = report;
  const teacher = currentTeacher || API.getUserById(report.teacherId) || Auth.getCurrentUser();

  const monthName = HEBREW_MONTHS_NAME[report.month - 1] || report.month;
  const year = report.year;
  const teacherName = teacher ? teacher.name : (report.teacherName || 'מורה של"ח');
  const teacherId = (teacher && (teacher.id || teacher.id_number)) || report.teacherId || '';
  const principalName = (teacher && teacher.principalName) || report.principalName || 'רונית שחר';
  const principalEmail = (teacher && teacher.principalEmail) || report.principalEmail || 'ronit.s@rabin-kfs.org.il';

  const reviewUrl = API.getPrincipalReviewUrl(report, teacher);

  // Set modal elements
  const modalTitle = document.getElementById('dispatch-modal-title');
  if (modalTitle) modalTitle.textContent = \`שליחה ואישור מנהל/ת המוסד – \${monthName} \${year}\`;

  const pNameInput = document.getElementById('dispatch-principal-name');
  if (pNameInput) pNameInput.value = principalName;

  const pEmailInput = document.getElementById('dispatch-principal-email');
  if (pEmailInput) pEmailInput.value = principalEmail;

  const pSubjectInput = document.getElementById('dispatch-email-subject');
  if (pSubjectInput) {
    pSubjectInput.value = \`אישור דוח שעות פעילות של"ח – \${teacherName} – חודש \${monthName} \${year}\`;
  }

  const pBodyInput = document.getElementById('dispatch-email-body');
  if (pBodyInput) {
    pBodyInput.value = \`שלום \${principalName},

מצורף לעיונך ולאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש \${monthName} \${year} של המורה \${teacherName}\${teacherId ? \` (ת.ז. \${teacherId})\` : ''}.

לצפייה ישירה בדוח ואישור בלחיצה אחת (ללא צורך בהתחברות):
\${reviewUrl}

בברכה,
\${teacherName}\`;
  }

  const pUrlInput = document.getElementById('dispatch-review-url');
  if (pUrlInput) pUrlInput.value = reviewUrl;

  const copyBtnText = document.getElementById('copy-btn-text');
  if (copyBtnText) copyBtnText.textContent = '📋 העתק קישור';

  openModal('modal-principal-email-dispatch');
}

function copyDispatchReviewUrl() {
  const urlInput = document.getElementById('dispatch-review-url');
  if (!urlInput || !urlInput.value) return;

  const url = urlInput.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      onCopySuccess();
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const tempInput = document.createElement('textarea');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  try {
    document.execCommand('copy');
    onCopySuccess();
  } catch (err) {
    showToast('נא להעתיק את הקישור ידנית מתוך השדה', 'warning');
  }
  document.body.removeChild(tempInput);
}

function onCopySuccess() {
  const copyBtnText = document.getElementById('copy-btn-text');
  if (copyBtnText) {
    copyBtnText.textContent = '✓ הועתק!';
    setTimeout(() => {
      copyBtnText.textContent = '📋 העתק קישור';
    }, 2500);
  }
  showToast('הקישור הישיר הועתק ללוח בהצלחה!', 'success');
}

function openDispatchMailClient() {
  const emailInput = document.getElementById('dispatch-principal-email');
  const subjectInput = document.getElementById('dispatch-email-subject');
  const bodyInput = document.getElementById('dispatch-email-body');

  const email = emailInput ? emailInput.value.trim() : '';
  const subject = subjectInput ? subjectInput.value.trim() : '';
  const body = bodyInput ? bodyInput.value.trim() : '';

  if (!email) {
    showToast('נא להזין כתובת דוא"ל של מנהל/ת בית הספר', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  // Update profile principal email if changed
  if (currentTeacher && email !== currentTeacher.principalEmail) {
    currentTeacher.principalEmail = email;
    API.saveUser(currentTeacher);
  }

  if (currentDispatchReport) {
    API.sendPrincipalNotification(currentDispatchReport.id, email, 'email');
  }

  const mailtoUri = \`mailto:\${encodeURIComponent(email)}?subject=\${encodeURIComponent(subject)}&body=\${encodeURIComponent(body)}\`;
  
  // Trigger mailto link via an anchor click
  const a = document.createElement('a');
  a.href = mailtoUri;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showToast('טיוטת הדוא"ל נפתחה בתוכנת הדואר שלך לשליחה למנהל/ת!', 'success');
}

function sendDispatchWhatsApp() {
  const subjectInput = document.getElementById('dispatch-email-subject');
  const bodyInput = document.getElementById('dispatch-email-body');

  const subject = subjectInput ? subjectInput.value.trim() : '';
  const body = bodyInput ? bodyInput.value.trim() : '';

  const waText = \`\${subject}\\n\\n\${body}\`;

  if (currentDispatchReport) {
    API.sendPrincipalNotification(currentDispatchReport.id, '', 'whatsapp');
  }

  const waUrl = \`https://api.whatsapp.com/send?text=\${encodeURIComponent(waText)}\`;
  window.open(waUrl, '_blank');
  showToast('נפתח חלון שליחה בוואטסאפ', 'info');
}

function submitCurrentReport() {
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
      showToast('הדוח הוגש וננעל בהצלחה!', 'success');

      // Automatically open the Principal Email Dispatch Modal
      setTimeout(() => {
        openPrincipalEmailDispatchModal(saved.id);
      }, 300);
    } catch (err) {
      showToast(err.message || 'שגיאה בעת הגשת הדוח', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל/ת</span>';
    }
  }, 700);
}`;

const oldSubmitSection = /function submitCurrentReport\(\) \{[\s\S]*?submitBtn\.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל\/ת<\/span>';\s*\}\s*\}, 700\);\s*\}/;

if (oldSubmitSection.test(code)) {
  code = code.replace(oldSubmitSection, newDispatchCode);
} else {
  console.error('Could not find oldSubmitSection');
}

// 3. Update global window bindings
const oldBindings = `  window.downloadReportPDF = downloadReportPDF;\n}`;
const newBindings = `  window.downloadReportPDF = downloadReportPDF;
  window.openPrincipalEmailDispatchModal = openPrincipalEmailDispatchModal;
  window.copyDispatchReviewUrl = copyDispatchReviewUrl;
  window.openDispatchMailClient = openDispatchMailClient;
  window.sendDispatchWhatsApp = sendDispatchWhatsApp;
}`;

if (code.includes('window.downloadReportPDF = downloadReportPDF;')) {
  code = code.replace(oldBindings, newBindings);
}

fs.writeFileSync(teacherJsPath, code, 'utf8');
console.log('Successfully updated public/js/teacher.js');
