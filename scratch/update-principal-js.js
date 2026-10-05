const fs = require('fs');
const path = require('path');

const principalJsPath = path.join(__dirname, '..', 'public', 'js', 'principal.js');
let code = fs.readFileSync(principalJsPath, 'utf8');

const updatedInit = `document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || 'token-sec-rabin-202608-mlevi';
  const reportIdParam = urlParams.get('reportId') || urlParams.get('id');

  currentPrincipal = API.getUserByToken(token) || Auth.getCurrentUser();
  if (!currentPrincipal || currentPrincipal.role !== 'principal') {
    if (reportIdParam) {
      const rep = API.getReportById(reportIdParam);
      if (rep && rep.schoolCode) {
        const matchingPrincipal = API.getUsers().find(u => u.role === 'principal' && u.schoolCode === rep.schoolCode);
        if (matchingPrincipal) currentPrincipal = matchingPrincipal;
      }
    }
    if (!currentPrincipal || currentPrincipal.role !== 'principal') {
      currentPrincipal = API.getUsers().find(u => u.role === 'principal');
    }
    Auth.setCurrentUser(currentPrincipal);
  }

  Auth.renderHeader('principal');
  Auth.renderFooter();

  loadPrincipalReports(reportIdParam);
});

function loadPrincipalReports(targetReportId = null) {
  const allReports = API.getReports();
  // Filter reports matching this principal's school
  availableReports = allReports.filter(r => currentPrincipal && r.schoolCode === currentPrincipal.schoolCode);

  if (targetReportId) {
    const targetRep = allReports.find(r => r.id === targetReportId);
    if (targetRep && !availableReports.some(r => r.id === targetRep.id)) {
      availableReports.unshift(targetRep);
    }
  }

  const selectorCard = document.getElementById('p-selector-card');
  const reportSelect = document.getElementById('p-report-select');

  // Determine currentReport
  let chosenReport = null;
  if (targetReportId) {
    chosenReport = availableReports.find(r => r.id === targetReportId) || allReports.find(r => r.id === targetReportId);
  }
  if (!chosenReport) {
    const pendingReport = availableReports.find(r => r.status === 'pending_principal');
    chosenReport = pendingReport || availableReports[0] || allReports[0];
  }
  currentReport = chosenReport;

  if (availableReports.length > 1) {
    selectorCard.style.display = 'block';
    reportSelect.innerHTML = '';
    availableReports.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = \`\${r.teacherName} - \${HEBREW_MONTHS_NAME[r.month - 1] || r.month}/\${r.year} (\${(REPORT_STATUSES[r.status] && REPORT_STATUSES[r.status].label) || r.status})\`;
      if (currentReport && r.id === currentReport.id) opt.selected = true;
      reportSelect.appendChild(opt);
    });

    reportSelect.addEventListener('change', () => {
      currentReport = availableReports.find(r => r.id === reportSelect.value);
      renderReportDetails(currentReport);
    });
  }

  if (currentReport) {
    renderReportDetails(currentReport);
  } else {
    document.getElementById('p-header-title').textContent = 'אין דוחות הממתינים לאישור';
  }
}`;

const targetSection = /document\.addEventListener\('DOMContentLoaded'[\s\S]*?renderReportDetails\(currentReport\);\s*\}\s*else\s*\{\s*document\.getElementById\('p-header-title'\)\.textContent = 'אין דוחות הממתינים לאישור';\s*\}\s*\}/;

if (targetSection.test(code)) {
  code = code.replace(targetSection, updatedInit);
  fs.writeFileSync(principalJsPath, code, 'utf8');
  console.log('Successfully updated public/js/principal.js');
} else {
  console.error('Target section not found in principal.js');
  process.exit(1);
}
