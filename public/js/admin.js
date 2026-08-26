/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Super Admin (Ronen) Master Dashboard & RSA Approval Controller
 */

let currentAdmin = null;
let allReportsList = [];
let activeAdminReviewReport = null;

document.addEventListener('DOMContentLoaded', () => {
  currentAdmin = Auth.requireAuth(['admin']);
  if (!currentAdmin) return;

  Auth.renderHeader('admin');
  Auth.renderFooter();

  loadMasterAdminData();
  setupAdminFilters();
});

function loadMasterAdminData() {
  allReportsList = API.getReports();
  renderMasterReportsTable(allReportsList);
  updateMasterKpis(allReportsList);
}

function updateMasterKpis(reports) {
  const totalCount = reports.length;
  const pendingAdminCount = reports.filter(r => r.status === 'pending_admin' || r.status === 'supervisor_edited' || r.status === 'pending_supervisor').length;
  const signedCount = reports.filter(r => r.status === 'approved_paid').length;
  
  let totalApprovedHours = 0;
  reports.filter(r => r.status === 'approved_paid').forEach(r => {
    totalApprovedHours += parseFloat(r.totalPayableHours || 0);
  });

  document.getElementById('admin-stat-total-reports').textContent = totalCount;
  document.getElementById('admin-stat-pending-admin').textContent = pendingAdminCount;
  document.getElementById('admin-stat-signed').textContent = signedCount;
  document.getElementById('admin-stat-total-hours').textContent = totalApprovedHours;
}

function setupAdminFilters() {
  const searchInput = document.getElementById('admin-search');
  const districtFilter = document.getElementById('admin-district-filter');
  const statusFilter = document.getElementById('admin-status-filter');

  function applyMasterFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const dist = districtFilter.value;
    const st = statusFilter.value;

    let filtered = allReportsList;

    if (dist !== 'all') {
      filtered = filtered.filter(r => r.district === dist);
    }

    if (st !== 'all') {
      filtered = filtered.filter(r => r.status === st);
    }

    if (q) {
      filtered = filtered.filter(r =>
        (r.teacherName && r.teacherName.toLowerCase().includes(q)) ||
        (r.teacherId && r.teacherId.includes(q)) ||
        (r.schoolName && r.schoolName.toLowerCase().includes(q)) ||
        (r.supervisorName && r.supervisorName.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q))
      );
    }

    renderMasterReportsTable(filtered);
  }

  searchInput.addEventListener('input', applyMasterFilters);
  districtFilter.addEventListener('change', applyMasterFilters);
  statusFilter.addEventListener('change', applyMasterFilters);
}

function renderMasterReportsTable(reports) {
  const tbody = document.getElementById('admin-reports-tbody');
  tbody.innerHTML = '';

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted p-3">לא נמצאו דוחות התואמים את תנאי החיפוש והסינון</td></tr>`;
    return;
  }

  reports.forEach(r => {
    const st = REPORT_STATUSES[r.status] || { label: r.status, badgeClass: 'badge-draft' };
    const tr = document.createElement('tr');

    let sigHtml = '<span class="text-muted">ממתין לחתימה</span>';
    if (r.signatureId) {
      sigHtml = `
        <a href="verify.html?sig=${r.signatureId}" class="rsa-badge" title="לחץ לבדיקת אמינות חתימה">
          <span>🔏 ${r.signatureId}</span>
        </a>
      `;
    }

    tr.innerHTML = `
      <td><span style="font-family:monospace; font-size:0.8125rem;">${r.id}</span></td>
      <td><strong>${r.teacherName || ''}</strong></td>
      <td><span class="badge" style="background:#eef2f7; color:#0c3058;">${r.district || 'מרכז'}</span></td>
      <td>${r.schoolName || ''}</td>
      <td>${r.supervisorName || ''}</td>
      <td>${HEBREW_MONTHS_NAME[r.month - 1] || r.month} ${r.year}</td>
      <td><span class="badge ${st.badgeClass}"><span class="badge-dot"></span> ${st.label}</span></td>
      <td style="font-weight:700; color:var(--primary); font-size:1rem;">${r.totalPayableHours || 0}</td>
      <td>${sigHtml}</td>
      <td style="text-align:center;">
        <button class="btn btn-primary btn-sm" onclick="openAdminReviewModal('${r.id}')">
          ${r.status === 'approved_paid' ? '👁️ צפה בדוח' : '👑 בדיקת ממונה ואישור'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAdminReviewModal(reportId) {
  const report = API.getReportById(reportId);
  if (!report) return;

  activeAdminReviewReport = JSON.parse(JSON.stringify(report));

  document.getElementById('admin-m-teacher').textContent = `${activeAdminReviewReport.teacherName} (ת"ז: ${activeAdminReviewReport.teacherId})`;
  document.getElementById('admin-m-school').textContent = `${activeAdminReviewReport.schoolName} (${activeAdminReviewReport.schoolCode})`;
  document.getElementById('admin-m-district').textContent = `מחוז ${activeAdminReviewReport.district || 'מרכז'} • מנחה: ${activeAdminReviewReport.supervisorName}`;

  document.getElementById('admin-m-payable').textContent = activeAdminReviewReport.totalPayableHours || 0;
  document.getElementById('admin-m-hours-breakdown').textContent = 
    `שעות קבועות: ${activeAdminReviewReport.totalFixedHours || 0} | נוספות: ${activeAdminReviewReport.totalOvertimeHours || 0} | היעדרות: ${activeAdminReviewReport.totalAbsenceHours || 0}`;

  const sigStatusBox = document.getElementById('admin-m-sig-status');
  const btnApprove = document.getElementById('admin-btn-approve-payment');

  if (activeAdminReviewReport.signatureId) {
    sigStatusBox.innerHTML = `
      <a href="verify.html?sig=${activeAdminReviewReport.signatureId}" class="rsa-badge" style="background:#d4edda; color:#155724; border-color:#c3e6cb;">
        ✓ חתום דיגיטלית: ${activeAdminReviewReport.signatureId}
      </a>
    `;
    btnApprove.style.display = 'none';
  } else {
    sigStatusBox.innerHTML = `<span class="badge badge-pending-supervisor">טרם הונפקה חתימה דיגיטלית סופית</span>`;
    btnApprove.style.display = 'inline-flex';
  }

  // Audit Timeline
  const timelineContainer = document.getElementById('admin-m-timeline');
  timelineContainer.innerHTML = '';
  const logs = activeAdminReviewReport.auditHistory || [];

  if (logs.length === 0) {
    timelineContainer.innerHTML = `<span class="text-muted">אין רישומי ביקורת קודמים</span>`;
  } else {
    logs.forEach(log => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `
        <div class="timeline-date">${log.date} • ${log.user}</div>
        <div class="timeline-action">${log.action}</div>
      `;
      timelineContainer.appendChild(item);
    });
  }

  // Days Grid
  renderAdminDaysGrid(activeAdminReviewReport);

  document.getElementById('admin-remarks-input').value = activeAdminReviewReport.adminRemarks || '';

  openModal('admin-review-modal');
}

function renderAdminDaysGrid(report) {
  const tbody = document.getElementById('admin-m-grid-tbody');
  tbody.innerHTML = '';

  (report.daysData || []).forEach(day => {
    const tr = document.createElement('tr');
    if (day.isHoliday) tr.classList.add('row-holiday');
    if (day.isFieldDay) tr.classList.add('row-field-day');

    let dayTags = '';
    if (day.isHoliday) dayTags += `<span class="holiday-tag">🎉 ${day.holidayName || 'חג'}</span>`;
    if (day.isFieldDay) dayTags += `<span class="field-day-tag">🌲 יום שדה</span>`;

    let overtimeCellHtml = day.overtimeHours ? `<strong>${day.overtimeHours}</strong>` : '-';
    if (day.supervisorEdited) {
      overtimeCellHtml = `
        <span class="supervisor-edited-cell" style="padding:2px 6px; border-radius:4px;" title="${day.editNote}">
          ${day.overtimeHours} (תוקן)
        </span>
      `;
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
      <td style="text-align:center;">${overtimeCellHtml}</td>
      <td>${day.overtimeReason || '-'}</td>
      <td>${day.gradeClass || '-'}</td>
      <td>${day.description || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function handleAdminFinalApprove() {
  if (!activeAdminReviewReport) return;

  const btnApprove = document.getElementById('admin-btn-approve-payment');
  btnApprove.disabled = true;
  btnApprove.innerHTML = '<div class="spinner"></div><span>מנפיק חתימת RSA-2048 ומאשר לתשלום...</span>';

  setTimeout(() => {
    const approvedReport = API.adminFinalApprove(activeAdminReviewReport.id, currentAdmin);
    closeModal('admin-review-modal');
    showToast(`הדוח אושר סופית לתשלום שכר! הונפקה חתימה: ${approvedReport.signatureId}`, 'success', 'אושר ונחתם דיגיטלית');

    loadMasterAdminData();
  }, 800);
}

function openAdminReturnModal() {
  document.getElementById('admin-return-remarks').value = '';
  openModal('admin-return-modal');
}

function handleAdminReturnConfirm() {
  const target = document.getElementById('admin-return-target').value;
  const remarks = document.getElementById('admin-return-remarks').value.trim();

  if (!remarks) {
    showToast('חובה להזין את פירוט הסיבה והנחיות להחזרה', 'warning');
    return;
  }

  API.adminReturnForEdits(activeAdminReviewReport.id, currentAdmin, target, remarks);
  closeModal('admin-return-modal');
  closeModal('admin-review-modal');
  showToast(`הדוח הוחזר בהצלחה ל${target === 'supervisor' ? 'מנחה' : 'מורה'} לביצוע תיקונים`, 'info');
  loadMasterAdminData();
}

function exportMasterReports() {
  exportReportsToExcel(allReportsList, 'shalah_master_national_reports_2026.csv');
}
