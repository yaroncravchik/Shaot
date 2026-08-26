/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Principal 1-Click Approval & Review Page Controller
 */

let currentPrincipal = null;
let currentReport = null;
let availableReports = [];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token') || 'PRINCIPAL_TOKEN_KFS_440123';

  currentPrincipal = API.getUserByToken(token) || Auth.getCurrentUser();
  if (!currentPrincipal || currentPrincipal.role !== 'principal') {
    currentPrincipal = API.getUsers().find(u => u.role === 'principal');
    Auth.setCurrentUser(currentPrincipal);
  }

  Auth.renderHeader('principal');
  Auth.renderFooter();

  loadPrincipalReports();
});

function loadPrincipalReports() {
  const allReports = API.getReports();
  // Filter reports matching this principal's school
  availableReports = allReports.filter(r => r.schoolCode === currentPrincipal.schoolCode);

  const selectorCard = document.getElementById('p-selector-card');
  const reportSelect = document.getElementById('p-report-select');

  if (availableReports.length > 1) {
    selectorCard.style.display = 'block';
    reportSelect.innerHTML = '';
    availableReports.forEach((r, idx) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = `${r.teacherName} - ${HEBREW_MONTHS_NAME[r.month - 1] || r.month}/${r.year} (${(REPORT_STATUSES[r.status] && REPORT_STATUSES[r.status].label) || r.status})`;
      if (idx === 0) opt.selected = true;
      reportSelect.appendChild(opt);
    });

    reportSelect.addEventListener('change', () => {
      currentReport = availableReports.find(r => r.id === reportSelect.value);
      renderReportDetails(currentReport);
    });
  }

  // Prioritize pending_principal report if available
  const pendingReport = availableReports.find(r => r.status === 'pending_principal');
  currentReport = pendingReport || availableReports[0] || allReports[0];

  if (currentReport) {
    renderReportDetails(currentReport);
  } else {
    document.getElementById('p-header-title').textContent = 'אין דוחות הממתינים לאישור';
  }
}

function renderReportDetails(report) {
  if (!report) return;

  document.getElementById('p-header-school').textContent = `${report.schoolName} (${report.schoolCode}) • מנהל/ת: ${currentPrincipal.name}`;
  document.getElementById('p-teacher-name').textContent = report.teacherName || 'ישראל ישראלי';
  document.getElementById('p-teacher-id').textContent = report.teacherId || '012345678';
  document.getElementById('p-report-month').textContent = `${HEBREW_MONTHS_NAME[report.month - 1] || report.month} ${report.year}`;
  document.getElementById('p-teacher-supervisor').textContent = `${report.supervisorName || 'דוד לוי'} (${report.district || 'מרכז'})`;
  document.getElementById('p-submission-date').textContent = report.submittedAt 
    ? `תאריך הגשה: ${report.submittedAt.slice(0, 10)}` 
    : 'טרם הוגש';

  const st = REPORT_STATUSES[report.status] || { label: report.status, badgeClass: 'badge-draft' };
  document.getElementById('p-status-pill').innerHTML = `
    <span class="badge ${st.badgeClass}" style="font-size: 0.9375rem; padding: 6px 14px;">
      <span class="badge-dot"></span>
      ${st.label}
    </span>
  `;

  // Render Table
  const tbody = document.getElementById('p-report-tbody');
  tbody.innerHTML = '';

  (report.daysData || []).forEach(day => {
    const tr = document.createElement('tr');
    if (day.isHoliday) tr.classList.add('row-holiday');
    if (day.isFieldDay) tr.classList.add('row-field-day');

    let dayTags = '';
    if (day.isHoliday) {
      dayTags += `<span class="holiday-tag">🎉 ${day.holidayName || 'חג/חופשה'}</span>`;
    }
    if (day.isFieldDay) {
      dayTags += `<span class="field-day-tag">🌲 יום שדה</span>`;
    }

    tr.innerHTML = `
      <td style="text-align:center; font-weight:700;">${day.dayOfMonth}</td>
      <td>
        <div style="font-weight:600;">${day.dayName}</div>
        <div>${dayTags}</div>
      </td>
      <td style="text-align:center;" class="cell-readonly">${day.fixedHours || 0}</td>
      <td style="text-align:center;">${day.absenceHours ? `<strong>${day.absenceHours}</strong>` : '-'}</td>
      <td>${day.absenceReason || '-'}</td>
      <td style="text-align:center;">${day.overtimeHours ? `<strong>${day.overtimeHours}</strong>` : '-'}</td>
      <td>${day.overtimeReason || '-'}</td>
      <td>${day.gradeClass || '-'}</td>
      <td>${day.description || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  // Totals
  document.getElementById('p-total-fixed').textContent = report.totalFixedHours || 0;
  document.getElementById('p-total-absence').textContent = report.totalAbsenceHours || 0;
  document.getElementById('p-total-overtime').textContent = report.totalOvertimeHours || 0;
  document.getElementById('p-total-payable').textContent = report.totalPayableHours || 0;

  // Attachments
  const attList = document.getElementById('p-attachments-list');
  attList.innerHTML = '';
  const attachments = report.attachments || [];

  if (attachments.length === 0) {
    attList.innerHTML = `<span class="text-muted">לא צורפו נספחים לדוח זה</span>`;
  } else {
    attachments.forEach(att => {
      const item = document.createElement('div');
      item.className = 'attachment-item';
      item.innerHTML = `
        <div class="attachment-info">
          <span class="attachment-icon">📄</span>
          <div>
            <div class="attachment-name">${att.name}</div>
            <div class="attachment-size">${att.size} • הועלה ב-${att.uploadDate}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="showToast('הקובץ ${att.name} נפתח לתצוגה', 'info')">
          👁️ פתח נספח
        </button>
      `;
      attList.appendChild(item);
    });
  }

  // Approval Bar visibility
  const actionBar = document.getElementById('p-action-bar');
  const approvedBanner = document.getElementById('p-approved-banner');

  if (report.status === 'pending_principal') {
    actionBar.style.display = 'flex';
    approvedBanner.style.display = 'none';
  } else if (report.status === 'pending_supervisor' || report.status === 'supervisor_edited' || report.status === 'approved_paid') {
    actionBar.style.display = 'none';
    approvedBanner.style.display = 'block';
  } else {
    actionBar.style.display = 'none';
    approvedBanner.style.display = 'none';
  }
}

function handlePrincipalApproval() {
  if (!currentReport) return;

  const btnApprove = document.getElementById('p-btn-approve');
  btnApprove.disabled = true;
  btnApprove.innerHTML = '<div class="spinner"></div><span>מאשר וחותם דיגיטלית...</span>';

  setTimeout(() => {
    API.principalApprove(currentReport.id, currentPrincipal, 'הדוח נבדק ותואם את מערכת השעות ותוכנית הפעילות השנתית. מאושר.');
    showToast('הדוח אושר ונחתם דיגיטלית בהצלחה! הועבר לבדיקת המנחה המחוזי.', 'success');

    currentReport = API.getReportById(currentReport.id);
    renderReportDetails(currentReport);
  }, 700);
}

function openRejectModal() {
  document.getElementById('reject-remarks').value = '';
  openModal('reject-modal');
}

function handlePrincipalReject() {
  const remarks = document.getElementById('reject-remarks').value.trim();
  if (!remarks) {
    showToast('נא להזין הערות והנחיות לתיקון עבור המורה', 'warning');
    return;
  }

  const btnConfirm = document.getElementById('confirm-reject-btn');
  btnConfirm.disabled = true;
  btnConfirm.innerHTML = '<div class="spinner"></div><span>מחזיר דוח...</span>';

  setTimeout(() => {
    API.principalReject(currentReport.id, currentPrincipal, remarks);
    closeModal('reject-modal');
    showToast('הדוח הוחזר לתיקון המורה בצירוף ההערות.', 'info');

    currentReport = API.getReportById(currentReport.id);
    renderReportDetails(currentReport);
    btnConfirm.disabled = false;
    btnConfirm.innerHTML = '<span>החזר דוח למורה</span>';
  }, 600);
}
