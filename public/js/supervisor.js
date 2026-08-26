/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Supervisor Dashboard & Direct Hours Inline Editing Controller
 */

let currentSupervisor = null;
let activeReviewReport = null;
let districtReports = [];

document.addEventListener('DOMContentLoaded', () => {
  currentSupervisor = Auth.requireAuth(['supervisor']);
  if (!currentSupervisor) return;

  Auth.renderHeader('supervisor');
  Auth.renderFooter();

  document.getElementById('sup-district-crumb').textContent = `מחוז ${currentSupervisor.district || 'מרכז'}`;
  document.getElementById('sup-page-title').textContent = `לוח בקרה מנחה מחוזי – ${currentSupervisor.name} (מחוז ${currentSupervisor.district || 'מרכז'})`;

  loadSupervisorData();
  setupFilterListeners();
});

function loadSupervisorData() {
  districtReports = API.getReports({ district: currentSupervisor.district || 'מרכז' });
  renderReportsList(districtReports);
  updateSupervisorStats(districtReports);
}

function updateSupervisorStats(reports) {
  const uniqueTeachers = new Set(reports.map(r => r.teacherId)).size;
  const pendingCount = reports.filter(r => r.status === 'pending_supervisor').length;
  const editedCount = reports.filter(r => r.status === 'supervisor_edited').length;
  const approvedCount = reports.filter(r => r.status === 'approved_paid').length;

  document.getElementById('sup-stat-teachers').textContent = uniqueTeachers || 3;
  document.getElementById('sup-stat-pending').textContent = pendingCount;
  document.getElementById('sup-stat-edited').textContent = editedCount;
  document.getElementById('sup-stat-approved').textContent = approvedCount;
}

function setupFilterListeners() {
  const searchInput = document.getElementById('sup-search');
  const statusFilter = document.getElementById('sup-status-filter');

  function applyFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const st = statusFilter.value;

    let filtered = districtReports;

    if (st !== 'all') {
      filtered = filtered.filter(r => r.status === st);
    }

    if (q) {
      filtered = filtered.filter(r => 
        (r.teacherName && r.teacherName.toLowerCase().includes(q)) ||
        (r.teacherId && r.teacherId.includes(q)) ||
        (r.schoolName && r.schoolName.toLowerCase().includes(q)) ||
        (r.municipality && r.municipality.toLowerCase().includes(q))
      );
    }

    renderReportsList(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
}

function renderReportsList(reports) {
  const tbody = document.getElementById('sup-reports-tbody');
  tbody.innerHTML = '';

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted p-3">לא נמצאו דוחות התואמים את הסינון</td></tr>`;
    return;
  }

  reports.forEach(r => {
    const st = REPORT_STATUSES[r.status] || { label: r.status, badgeClass: 'badge-draft' };
    const tr = document.createElement('tr');

    let editsSummary = '<span class="text-muted">-</span>';
    if (r.status === 'supervisor_edited') {
      editsSummary = `<span style="color:#721c24; font-weight:700;">✏️ שעות עודכנו ע"י מנחה</span>`;
    } else if (r.supervisorRemarks) {
      editsSummary = `<span title="${r.supervisorRemarks}">${r.supervisorRemarks.slice(0, 25)}...</span>`;
    }

    tr.innerHTML = `
      <td><strong>${r.teacherName || 'מורה'}</strong></td>
      <td>${r.teacherId || ''}</td>
      <td>${r.schoolName || ''}</td>
      <td>${r.municipality || ''}</td>
      <td>${HEBREW_MONTHS_NAME[r.month - 1] || r.month} ${r.year}</td>
      <td><span class="badge ${st.badgeClass}"><span class="badge-dot"></span> ${st.label}</span></td>
      <td>${r.totalFixedHours || 0}</td>
      <td><strong>${r.totalOvertimeHours || 0}</strong></td>
      <td style="font-weight:700; color:var(--primary);">${r.totalPayableHours || 0}</td>
      <td>${editsSummary}</td>
      <td style="text-align:center;">
        <button class="btn btn-primary btn-sm" onclick="openSupervisorReviewModal('${r.id}')">
          ${r.status === 'pending_supervisor' ? '🔍 בדוק וערוך שעות' : '👁️ צפה בדוח'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openSupervisorReviewModal(reportId) {
  const report = API.getReportById(reportId);
  if (!report) return;

  activeReviewReport = JSON.parse(JSON.stringify(report));

  document.getElementById('sup-modal-title').textContent = `בדיקת דוח שעות – ${activeReviewReport.teacherName} (${HEBREW_MONTHS_NAME[activeReviewReport.month - 1]} ${activeReviewReport.year})`;
  document.getElementById('sup-remarks-input').value = activeReviewReport.supervisorRemarks || '';

  renderSupervisorGrid(activeReviewReport);
  renderSupervisorAttachments(activeReviewReport);
  calculateSupervisorTotals();

  openModal('supervisor-review-modal');
}

function renderSupervisorGrid(report) {
  const tbody = document.getElementById('sup-review-grid-tbody');
  tbody.innerHTML = '';

  report.daysData.forEach((day, index) => {
    const tr = document.createElement('tr');
    if (day.isHoliday) tr.classList.add('row-holiday');
    if (day.isFieldDay) tr.classList.add('row-field-day');

    let dayTags = '';
    if (day.isHoliday) {
      dayTags += `<span class="holiday-tag">🎉 ${day.holidayName || 'חג'}</span>`;
    }
    if (day.isFieldDay) {
      dayTags += `<span class="field-day-tag">🌲 יום שדה</span>`;
    }

    const isEdited = day.supervisorEdited;
    const cellClass = isEdited ? 'cell-input supervisor-edited-cell' : 'cell-input';

    tr.innerHTML = `
      <td style="text-align:center; font-weight:700;">${day.dayOfMonth}</td>
      <td>
        <div style="font-weight:600;">${day.dayName}</div>
        <div>${dayTags}</div>
      </td>
      <td style="text-align:center;" class="cell-readonly">${day.fixedHours || 0}</td>
      <td style="text-align:center;">${day.absenceHours || 0}</td>
      <td>${day.absenceReason || '-'}</td>
      <!-- Direct Overtime Editing Cell -->
      <td>
        <div class="supervisor-edited-wrapper">
          ${isEdited ? `<span class="edit-diff-indicator">תוקן ע"י מנחה</span>` : ''}
          <input 
            type="number" 
            class="${cellClass}" 
            min="0" 
            max="16" 
            step="0.5" 
            value="${day.overtimeHours || 0}" 
            data-day-idx="${index}"
          >
          ${isEdited && day.originalOvertime !== undefined ? `<span class="original-value-hint">מקורי: ${day.originalOvertime} שעות</span>` : ''}
        </div>
      </td>
      <td>${day.overtimeReason || '-'}</td>
      <td>${day.gradeClass || '-'}</td>
      <td>${day.description || '-'}</td>
    `;
    tbody.appendChild(tr);
  });

  // Attach direct edit listener to overtime input cells
  tbody.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.dayIdx, 10);
      const newVal = parseFloat(e.target.value) || 0;
      const dayObj = activeReviewReport.daysData[idx];

      if (dayObj.originalOvertime === undefined) {
        dayObj.originalOvertime = dayObj.overtimeHours || 0;
      }

      if (newVal !== dayObj.originalOvertime) {
        dayObj.overtimeHours = newVal;
        dayObj.supervisorEdited = true;
        dayObj.editNote = `תוקן מ-${dayObj.originalOvertime} שעות ל-${newVal} שעות ע"י המנחה ${currentSupervisor.name}`;
      } else {
        dayObj.overtimeHours = newVal;
        dayObj.supervisorEdited = false;
      }

      renderSupervisorGrid(activeReviewReport);
      calculateSupervisorTotals();
      showToast(`שעות יום ${dayObj.dayOfMonth} עודכנו ישירות (${newVal} שעות)`, 'info');
    });
  });
}

function calculateSupervisorTotals() {
  let totalFixed = 0;
  let totalAbsence = 0;
  let totalOvertime = 0;

  if (activeReviewReport && activeReviewReport.daysData) {
    activeReviewReport.daysData.forEach(d => {
      totalFixed += parseFloat(d.fixedHours || 0);
      totalAbsence += parseFloat(d.absenceHours || 0);
      totalOvertime += parseFloat(d.overtimeHours || 0);
    });
  }

  const netPayable = Math.max(0, totalFixed - totalAbsence + totalOvertime);

  document.getElementById('sup-total-fixed').textContent = totalFixed;
  document.getElementById('sup-total-absence').textContent = totalAbsence;
  document.getElementById('sup-total-overtime').textContent = totalOvertime;
  document.getElementById('sup-total-payable').textContent = netPayable;
}

function renderSupervisorAttachments(report) {
  const container = document.getElementById('sup-attachments-list');
  container.innerHTML = '';
  const attachments = report.attachments || [];

  if (attachments.length === 0) {
    container.innerHTML = `<span class="text-muted">אין נספחים מצורפים בדוח זה</span>`;
    return;
  }

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
      <button class="btn btn-secondary btn-sm" onclick="showToast('הקובץ ${att.name} נבדק', 'info')">
        👁️ צפה במסמך
      </button>
    `;
    container.appendChild(item);
  });
}

function handleSupervisorApprove() {
  if (!activeReviewReport) return;

  const remarks = document.getElementById('sup-remarks-input').value.trim();
  const btnApprove = document.getElementById('sup-btn-approve');
  btnApprove.disabled = true;
  btnApprove.innerHTML = '<div class="spinner"></div><span>מאשר ומעביר לממונה...</span>';

  setTimeout(() => {
    API.supervisorApprove(activeReviewReport.id, currentSupervisor, remarks, activeReviewReport.daysData);
    closeModal('supervisor-review-modal');
    showToast('הדוח נבדק ואושר בהצלחה והועבר לבדיקת הממונה הארצי (רונן)', 'success');
    loadSupervisorData();
    btnApprove.disabled = false;
    btnApprove.innerHTML = '<span>✓ אישור והעברה לממונה (רונן)</span>';
  }, 700);
}

function handleSupervisorReturn() {
  if (!activeReviewReport) return;

  const remarks = document.getElementById('sup-remarks-input').value.trim();
  if (!remarks) {
    showToast('חובה להזין הערות והנחיות לתיקון עבור המורה', 'warning');
    return;
  }

  if (confirm(`האם אתה בטוח שברצונך להחזיר את הדוח לתיקון המורה (${activeReviewReport.teacherName})?`)) {
    API.supervisorReturnToTeacher(activeReviewReport.id, currentSupervisor, remarks);
    closeModal('supervisor-review-modal');
    showToast('הדוח הוחזר לתיקון המורה בצירוף ההנחיות', 'info');
    loadSupervisorData();
  }
}

function exportDistrictReports() {
  exportReportsToExcel(districtReports, `shalah_district_${currentSupervisor.district || 'central'}_reports.csv`);
}
