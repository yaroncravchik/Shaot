/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Supervisor Dashboard & Direct Hours Inline Editing Controller
 */

let currentSupervisor = null;
let activeReviewReport = null;
let districtReports = [];
let assignedTeachers = [];

function initSupervisorPage() {
  currentSupervisor = Auth.requireAuth(['supervisor']);
  if (!currentSupervisor) return;

  Auth.renderHeader('supervisor');
  Auth.renderFooter();

  const districtCrumb = document.getElementById('sup-district-crumb');
  if (districtCrumb) districtCrumb.textContent = `מחוז ${currentSupervisor.district || 'מרכז'}`;
  const pageTitle = document.getElementById('sup-page-title');
  if (pageTitle) pageTitle.textContent = `לוח בקרה מנחה מחוזי – ${currentSupervisor.name || currentSupervisor.full_name || ''} (מחוז ${currentSupervisor.district || 'מרכז'})`;

  loadSupervisorData();
  setupFilterListeners();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupervisorPage);
} else {
  initSupervisorPage();
}

function loadSupervisorData() {
  assignedTeachers = (typeof API.getTeachersBySupervisor === 'function')
    ? API.getTeachersBySupervisor(currentSupervisor)
    : [];
  renderTeachersList(assignedTeachers);

  // Filter reports strictly for teachers assigned to this supervisor
  const assignedTeacherIds = new Set(assignedTeachers.map(t => String(t.id).trim()));
  const assignedTeacherNames = new Set(assignedTeachers.map(t => String(t.name).trim()));
  const supId = String(currentSupervisor.id || currentSupervisor.id_number || '').trim();
  const supName = String(currentSupervisor.name || currentSupervisor.full_name || '').trim();

  const allReports = (typeof API.getReports === 'function') ? API.getReports() : [];
  districtReports = allReports.filter(r => {
    const tId = String(r.teacherId || '').trim();
    const tName = String(r.teacherName || '').trim();
    const rSupId = String(r.supervisorId || '').trim();
    const rSupName = String(r.supervisorName || '').trim();

    return assignedTeacherIds.has(tId) ||
           (tName && assignedTeacherNames.has(tName)) ||
           (supId && rSupId === supId) ||
           (supName && rSupName === supName) ||
           (supName && rSupName && (rSupName.includes(supName) || supName.includes(rSupName)));
  });

  renderReportsList(districtReports);
  updateSupervisorStats(districtReports, assignedTeachers);
}

function updateSupervisorStats(reports, teachers = []) {
  const totalTeachers = (teachers && teachers.length > 0) ? teachers.length : (new Set(reports.map(r => r.teacherId)).size || 3);
  const pendingCount = reports.filter(r => r.status === 'pending_supervisor').length;
  const editedCount = reports.filter(r => r.status === 'supervisor_edited').length;
  const approvedCount = reports.filter(r => r.status === 'approved_paid').length;

  const countBadge = document.getElementById('sup-teachers-count-badge');
  if (countBadge) {
    countBadge.textContent = `${totalTeachers} מורים`;
  }

  const statEl = document.getElementById('sup-stat-teachers');
  if (statEl) {
    statEl.textContent = totalTeachers;
  }

  const pendingEl = document.getElementById('sup-stat-pending');
  if (pendingEl) pendingEl.textContent = pendingCount;

  const editedEl = document.getElementById('sup-stat-edited');
  if (editedEl) editedEl.textContent = editedCount;

  const approvedEl = document.getElementById('sup-stat-approved');
  if (approvedEl) approvedEl.textContent = approvedCount;
}

function setupFilterListeners() {
  // 1. Filter for reports table
  const searchInput = document.getElementById('sup-search');
  const statusFilter = document.getElementById('sup-status-filter');

  function applyReportsFilters() {
    const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const st = statusFilter ? statusFilter.value : 'all';

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

  if (searchInput) searchInput.addEventListener('input', applyReportsFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyReportsFilters);

  // 2. Filter for assigned teachers table
  const teacherSearchInput = document.getElementById('sup-teachers-search');
  if (teacherSearchInput) {
    teacherSearchInput.addEventListener('input', () => {
      const q = teacherSearchInput.value.trim().toLowerCase();
      if (!q) {
        renderTeachersList(assignedTeachers);
        return;
      }

      const filtered = assignedTeachers.filter(t => {
        const name = (t.name || '').toLowerCase();
        const id = String(t.id || '').toLowerCase();
        const password = String(t.password || '').toLowerCase();
        const phone = String(t.phone || '').toLowerCase();
        const school = (t.schoolName || '').toLowerCase();
        const schoolCode = String(t.schoolCode || '').toLowerCase();
        const mun = (t.municipality || '').toLowerCase();
        const princ = (t.principalName || '').toLowerCase();
        return name.includes(q) || id.includes(q) || password.includes(q) || phone.includes(q) || school.includes(q) || schoolCode.includes(q) || mun.includes(q) || princ.includes(q);
      });

      renderTeachersList(filtered);
    });
  }
}

function renderTeachersList(teachers) {
  const tbody = document.getElementById('sup-teachers-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!teachers || teachers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted p-4">לא נמצאו מורי של"ח משויכים התואמים את החיפוש</td></tr>`;
    return;
  }

  const dayNamesShort = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\''];

  teachers.forEach((t, index) => {
    const tr = document.createElement('tr');

    // Field days formatting
    let fieldDaysHtml = '<span class="text-muted">—</span>';
    if (Array.isArray(t.fieldDays) && t.fieldDays.length > 0) {
      const fieldDayNames = t.fieldDays.map(d => `יום ${dayNamesShort[d] || d}`).join(', ');
      fieldDaysHtml = `<span class="badge" style="background:#d1fae5; color:#065f46; font-weight:600; padding:3px 8px;">🌿 ${fieldDayNames}</span>`;
    }

    const jobScopeVal = t.jobScope !== undefined ? t.jobScope : (t.job_percentage !== undefined ? t.job_percentage : 100);

    tr.innerHTML = `
      <td style="text-align:center; font-weight:600; color:var(--text-muted); width:40px;">${index + 1}</td>
      <td>
        <div>
          <a href="javascript:void(0)" class="clickable-teacher-name" onclick="openTeacherProfileModal('${t.id}')" title="לחץ לצפייה בפרופיל המורה ובמערכת השעות">
            <strong>${t.name || 'מורה'}</strong>
            <span class="teacher-info-icon">👤</span>
          </a>
          ${t.email ? `<div class="text-muted" style="font-size:0.75rem;">${t.email}</div>` : ''}
        </div>
      </td>
      <td>
        <code style="background:#e8f4fd; color:#0c3058; padding:3px 8px; border-radius:4px; font-weight:700; font-size:0.875rem;">${t.id || '—'}</code>
      </td>
      <td>
        <code style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:4px; font-weight:700; font-size:0.875rem; border:1px solid #fde68a;">${t.password || t.phone || '—'}</code>
      </td>
      <td>
        <a href="tel:${t.phone}" style="font-family:monospace; direction:ltr; unicode-bidi:embed; font-weight:600; color:#0c3058;">${t.phone || '—'}</a>
      </td>
      <td>
        <div>
          <strong>${t.schoolName || '—'}</strong>
          ${t.schoolCode ? `<span class="text-muted" style="font-size:0.75rem;"> (${t.schoolCode})</span>` : ''}
          ${t.principalName ? `<div class="text-muted" style="font-size:0.75rem;">מנהל/ת: ${t.principalName}</div>` : ''}
        </div>
      </td>
      <td>
        <span>${t.municipality || '—'}<span class="text-muted" style="font-size:0.8125rem;"> (${t.district || 'מרכז'})</span></span>
      </td>
      <td style="text-align:center;">
        <span class="badge badge-success" style="font-size:0.8125rem;">${jobScopeVal}%</span>
      </td>
      <td>
        ${fieldDaysHtml}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderReportsList(reports) {
  const tbody = document.getElementById('sup-reports-tbody');
  if (!tbody) return;
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
      <td>
        <a href="javascript:void(0)" class="clickable-teacher-name" onclick="openTeacherProfileModal('${r.teacherId || r.teacherName}')" title="לחץ לצפייה בפרופיל המורה ובמערכת השעות">
          <strong>${r.teacherName || 'מורה'}</strong>
          <span class="teacher-info-icon">👤</span>
        </a>
      </td>
      <td>${r.teacherId || ''}</td>
      <td>${r.schoolName || ''}</td>
      <td>${r.municipality || ''}</td>
      <td>${HEBREW_MONTHS_NAME[r.month - 1] || r.month} ${r.year}</td>
      <td><span class="badge ${st.badgeClass}"><span class="badge-dot"></span> ${st.label}</span></td>
      <td><strong style="color:var(--primary); font-size:1.05rem;">${r.totalOvertimeHours || 0} שעות</strong></td>
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
  let report = API.getReportById(reportId);
  if (!report && Array.isArray(districtReports)) {
    report = districtReports.find(r => r.id === reportId);
  }
  if (!report) {
    if (typeof API.fetchReportById === 'function') {
      API.fetchReportById(reportId).then(r => {
        if (r) {
          openSupervisorReviewModal(reportId);
        } else {
          showToast('לא ניתן למצוא את הדוח המבוקש', 'warning');
        }
      }).catch(err => {
        console.error('Fetch report error:', err);
      });
    }
    return;
  }

  activeReviewReport = JSON.parse(JSON.stringify(report));

  const titleEl = document.getElementById('sup-modal-title');
  if (titleEl) {
    const monthName = (typeof HEBREW_MONTHS_NAME !== 'undefined' && HEBREW_MONTHS_NAME[activeReviewReport.month - 1])
      ? HEBREW_MONTHS_NAME[activeReviewReport.month - 1]
      : (activeReviewReport.month || '');
    titleEl.innerHTML = `בדיקת דוח שעות – <a href="javascript:void(0)" class="clickable-teacher-name" onclick="openTeacherProfileModal('${activeReviewReport.teacherId || activeReviewReport.teacherName}')" title="לחץ לצפייה בפרופיל המורה ובמערכת השעות" style="color:var(--primary);">${activeReviewReport.teacherName} <span class="teacher-info-icon">👤</span></a> (${monthName} ${activeReviewReport.year})`;
  }
  const remarksEl = document.getElementById('sup-remarks-input');
  if (remarksEl) {
    remarksEl.value = activeReviewReport.supervisorRemarks || '';
  }

  renderSupervisorGrid(activeReviewReport);
  renderSupervisorAttachments(activeReviewReport);
  calculateSupervisorTotals();

  openModal('supervisor-review-modal');
}

function renderSupervisorGrid(report) {
  const tbody = document.getElementById('sup-review-grid-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const days = Array.isArray(report.daysData) ? report.daysData : [];
  if (days.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted p-3">לא נמצאו נתוני ימים בדוח זה</td></tr>';
    return;
  }

  days.forEach((day, index) => {
    const tr = document.createElement('tr');
    const dayNum = day.dayOfMonth || day.day_number || 1;
    const vac = (typeof API !== 'undefined' && API.getMoEVacationInfo)
      ? API.getMoEVacationInfo(report.year, report.month, dayNum)
      : { isHoliday: day.isHoliday, name: day.holidayName };
    const isHoliday = vac ? (vac.isHoliday || day.isHoliday) : day.isHoliday;
    const holidayName = vac ? (vac.name || day.holidayName) : day.holidayName;

    if (isHoliday) tr.classList.add('row-holiday');
    if (day.isFieldDay) tr.classList.add('row-field-day');

    let dayTags = '';
    if (isHoliday) {
      dayTags += `<span class="holiday-tag" title="${holidayName}"> ${holidayName || 'חג/חופשה'}</span>`;
    }
    if (day.isFieldDay) {
      dayTags += `<span class="field-day-tag"> יום שדה</span>`;
    }

    const isEdited = day.supervisorEdited;
    const fixed = parseFloat(day.fixedHours || 0);
    const overtime = parseFloat(day.overtimeHours || 0);
    const reason = (day.overtimeReason || '').trim();
    const total = fixed + overtime;
    const isExceeded = (reason === 'גיחה' || reason === 'מסע' || reason === 'יום שדה ארוך') ? (total > 14) : (total > 10);

    let cellClass = isEdited ? 'cell-input supervisor-edited-cell' : 'cell-input';
    if (isExceeded) {
      cellClass += ' cell-overtime-exceeded';
    }

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
            step="1" 
            value="${day.overtimeHours !== undefined && day.overtimeHours !== null ? Math.round(day.overtimeHours) : 0}" 
            data-day-idx="${index}"
          >
          ${isEdited && day.originalOvertime !== undefined ? `<span class="original-value-hint">מקורי: ${day.originalOvertime} שעות</span>` : ''}
          <div class="overtime-threshold-warning" style="display: ${isExceeded ? 'block' : 'none'};">
            ⚠️ סך השעות היומי עובר את הסף המותר
          </div>
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
    // Prevent typing decimal point or comma
    input.addEventListener('keydown', (e) => {
      if (e.key === '.' || e.key === ',') {
        e.preventDefault();
      }
    });

    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.dayIdx, 10);
      let newVal = Math.round(parseFloat(e.target.value) || 0);
      if (newVal < 0) newVal = 0;
      e.target.value = newVal;
      const dayObj = activeReviewReport.daysData[idx];

      if (dayObj.originalOvertime === undefined) {
        dayObj.originalOvertime = Math.round(dayObj.overtimeHours || 0);
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
  let totalAbsence = 0;
  let totalOvertime = 0;

  if (activeReviewReport && activeReviewReport.daysData) {
    activeReviewReport.daysData.forEach(d => {
      totalAbsence += parseFloat(d.absenceHours || 0);
      totalOvertime += Math.round(parseFloat(d.overtimeHours || 0));
    });
  }

  const abEl = document.getElementById('sup-total-absence');
  const otEl = document.getElementById('sup-total-overtime');
  if (abEl) abEl.textContent = totalAbsence;
  if (otEl) otEl.textContent = totalOvertime;
}

function renderSupervisorAttachments(report) {
  const container = document.getElementById('sup-attachments-list');
  if (!container) return;
  container.innerHTML = '';
  const attachments = report.attachments || [];

  if (attachments.length === 0) {
    container.innerHTML = `<span class="text-muted">אין נספחים מצורפים בדוח זה</span>`;
    return;
  }

  attachments.forEach(att => {
    const item = document.createElement('div');
    item.className = 'attachment-item';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'attachment-info';
    infoDiv.innerHTML = `
      <span class="attachment-icon">📎</span>
      <div>
        <div class="attachment-name">${att.name || 'נספח'}</div>
        <div class="attachment-size">${att.size || ''} • הועלה ב-${att.uploadDate || ''}</div>
      </div>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm';
    btn.textContent = '👁️ צפה במסמך';
    btn.onclick = () => {
      if (att.url) {
        window.open(att.url, '_blank');
      } else {
        showToast(`הקובץ ${att.name || 'נספח'} נבדק`, 'info');
      }
    };

    item.appendChild(infoDiv);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

function handleSupervisorApprove() {
  if (!activeReviewReport) return;

  const remarks = document.getElementById('sup-remarks-input') ? document.getElementById('sup-remarks-input').value.trim() : '';
  const btnApprove = document.getElementById('sup-btn-approve');
  if (btnApprove) {
    btnApprove.disabled = true;
    btnApprove.innerHTML = '<div class="spinner"></div><span>מאשר ומעביר לממונה...</span>';
  }

  const supDistrict = (currentSupervisor && currentSupervisor.district) || 'מרכז';

  setTimeout(() => {
    API.supervisorApprove(activeReviewReport.id, currentSupervisor, remarks, activeReviewReport.daysData);
    closeModal('supervisor-review-modal');
    showToast(`הדוח נבדק ואושר בהצלחה והועבר לבדיקת ממונה מחוז ${supDistrict}`, 'success');
    loadSupervisorData();
    if (btnApprove) {
      btnApprove.disabled = false;
      btnApprove.innerHTML = `<span>אישור והעברה לממונה מחוז ${supDistrict}</span>`;
    }
  }, 500);
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

window.addEventListener('shalah:users-synced', () => {
  loadSupervisorData();
});

window.addEventListener('shalah:reports-synced', () => {
  loadSupervisorData();
});

// Global window bindings for inline HTML event handlers
if (typeof window !== 'undefined') {
  window.openSupervisorReviewModal = openSupervisorReviewModal;
  window.handleSupervisorApprove = handleSupervisorApprove;
  window.handleSupervisorReturn = handleSupervisorReturn;
  window.exportDistrictReports = exportDistrictReports;
  window.loadSupervisorData = loadSupervisorData;
}
