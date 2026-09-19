/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Super Admin (Ronen) Master Dashboard & RSA Approval Controller
 */

let currentAdmin = null;
let allReportsList = [];
let activeAdminReviewReport = null;
let adminSigPad = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    currentAdmin = Auth.requireAuth(['admin']);
    if (currentAdmin) {
      Auth.renderHeader('admin');
      Auth.renderFooter();
      loadMasterAdminData();
      loadRosterUsers();
      setupAdminFilters();
      initAdminSigPad();
    }
  } catch (err) {
    console.error('Admin page init warning:', err);
  }

  setupModalButtons();
});

function setupModalButtons() {
  const teacherBtns = [
    document.getElementById('btn-open-add-teacher'),
    document.getElementById('btn-roster-add-teacher')
  ];
  teacherBtns.forEach(btn => {
    if (btn) {
      btn.onclick = function(e) {
        if (e) e.preventDefault();
        openAddTeacherModal();
      };
    }
  });

  const supervisorBtns = [
    document.getElementById('btn-open-add-supervisor'),
    document.getElementById('btn-roster-add-supervisor')
  ];
  supervisorBtns.forEach(btn => {
    if (btn) {
      btn.onclick = function(e) {
        if (e) e.preventDefault();
        openAddSupervisorModal();
      };
    }
  });
}

function initAdminSigPad() {
  const canvas = document.getElementById('admin-sig-canvas');
  const clearBtn = document.getElementById('admin-clear-sig-btn');
  if (canvas && typeof GraphicSignaturePad !== 'undefined') {
    adminSigPad = new GraphicSignaturePad(canvas, clearBtn);
  }
}

function loadMasterAdminData() {
  allReportsList = API.getReports().filter(r => !r.district || r.district === 'מרכז');
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
  const statusFilter = document.getElementById('admin-status-filter');

  function applyMasterFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const st = statusFilter.value;

    let filtered = allReportsList;

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
    if (r.signatureId || r.status === 'approved_paid') {
      sigHtml = `
        <span class="rsa-badge" style="background:#d4edda; color:#155724; border-color:#c3e6cb;">
          אושר ונחתם לתשלום
        </span>
      `;
    }

    tr.innerHTML = `
      <td><span style="font-family:monospace; font-size:0.8125rem;">${r.id}</span></td>
      <td><strong>${r.teacherName || ''}</strong></td>
      <td><span class="badge" style="background:#eef2f7; color:#0c3058;">${r.district || 'מרכז'}</span></td>
      <td>${r.schoolName || ''}</td>
      <td>${r.supervisorName || 'אברהם מנחה'}</td>
      <td>${formatMonthYear(r.year, r.month)}</td>
      <td><span class="badge ${st.badgeClass}">${st.label}</span></td>
      <td><strong>${r.totalPayableHours || 0} שעות</strong></td>
      <td>${sigHtml}</td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-sm btn-primary" onclick="openAdminReviewModal('${r.id}')">
          <span>בדוק ואשר</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * ==========================================================================
 * ROSTER & USER MANAGEMENT (הוספת מורים ומנחים)
 * ==========================================================================
 */
function loadRosterUsers() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  const users = API.getAdminUsers();
  tbody.innerHTML = '';

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">אין משתמשים רשומים במחוז</td></tr>`;
    return;
  }

  users.forEach(u => {
    const isTeacher = u.role === 'teacher';
    const roleBadge = isTeacher
      ? '<span class="badge" style="background:#e3f2fd; color:#0d47a1; font-weight:600;">מורה של"ח</span>'
      : '<span class="badge" style="background:#ede7f6; color:#4a148c; font-weight:600;">מנחה מחוזי</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name || u.full_name || ''}</strong></td>
      <td>${roleBadge}</td>
      <td><span style="font-family:monospace; font-size:0.875rem;">${u.id || u.id_number || ''}</span></td>
      <td>${isTeacher ? (u.supervisorName || 'אברהם מנחה') : '<span class="text-muted">— (מנחה)</span>'}</td>
      <td>${u.schoolName || u.school_name || (isTeacher ? 'תיכון מחוזי מרכז' : 'פיקוח מחוז מרכז')}</td>
      <td><span class="badge" style="background:#f1f3f5; color:#0c3058;">${u.district || 'מרכז'}</span></td>
      <td><span class="badge badge-success">פעיל במערכת</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function loadSupervisorsList() {
  const select = document.getElementById('teacher-supervisor-select');
  if (!select) return;

  const supervisors = (API && typeof API.getSupervisors === 'function') ? API.getSupervisors() : [];
  select.innerHTML = '<option value="">-- בחר מנחה מחוזי מתוך הרשימה --</option>';

  if (supervisors && supervisors.length > 0) {
    supervisors.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name || s.full_name} (${s.district || 'מרכז'})`;
      select.appendChild(opt);
    });
    // Default select first supervisor
    select.selectedIndex = 1;
  } else {
    const opt = document.createElement('option');
    opt.value = '011111111';
    opt.textContent = 'אברהם מנחה (מרכז)';
    select.appendChild(opt);
    select.selectedIndex = 1;
  }
}

function openAddTeacherModal() {
  try {
    const form = document.getElementById('form-add-teacher');
    if (form) form.reset();
    loadSupervisorsList();
    openModal('admin-add-teacher-modal');
  } catch (err) {
    console.error('Error opening add teacher modal:', err);
    openModal('admin-add-teacher-modal');
  }
}

function openAddSupervisorModal() {
  try {
    const form = document.getElementById('form-add-supervisor');
    if (form) form.reset();
    openModal('admin-add-supervisor-modal');
  } catch (err) {
    console.error('Error opening add supervisor modal:', err);
    openModal('admin-add-supervisor-modal');
  }
}

function handleAddTeacherSubmit(e) {
  e.preventDefault();

  const firstName = document.getElementById('teacher-first-name').value.trim();
  const lastName = document.getElementById('teacher-last-name').value.trim();
  const supervisorId = document.getElementById('teacher-supervisor-select').value;
  const username = document.getElementById('teacher-username').value.trim();
  const password = document.getElementById('teacher-password').value.trim();
  const schoolName = document.getElementById('teacher-school-name').value.trim();
  const schoolCode = document.getElementById('teacher-school-code').value.trim();

  if (!firstName || !lastName || !supervisorId || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const btn = document.getElementById('btn-save-teacher');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>שומר מורה...</span>';

  setTimeout(() => {
    try {
      const newTeacher = API.adminCreateTeacher({
        firstName,
        lastName,
        supervisorId,
        username,
        password,
        schoolName,
        schoolCode
      });

      closeModal('admin-add-teacher-modal');
      showToast(`המורה ${newTeacher.name} נוסף בהצלחה למערכת ושויך למנחה!`, 'success', 'מורה נוסף בהצלחה');
      loadRosterUsers();
      loadMasterAdminData();
    } catch (err) {
      showToast(err.message || 'שגיאה בהוספת מורה', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור והוסף מורה</span>';
    }
  }, 400);
}

function handleAddSupervisorSubmit(e) {
  e.preventDefault();

  const firstName = document.getElementById('supervisor-first-name').value.trim();
  const lastName = document.getElementById('supervisor-last-name').value.trim();
  const username = document.getElementById('supervisor-username').value.trim();
  const password = document.getElementById('supervisor-password').value.trim();

  if (!firstName || !lastName || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const btn = document.getElementById('btn-save-supervisor');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>שומר מנחה...</span>';

  setTimeout(() => {
    try {
      const newSup = API.adminCreateSupervisor({
        firstName,
        lastName,
        username,
        password,
        district: 'מרכז'
      });

      closeModal('admin-add-supervisor-modal');
      showToast(`המנחה ${newSup.name} נוסף בהצלחה למחוז מרכז!`, 'success', 'מנחה נוסף בהצלחה');
      loadRosterUsers();
    } catch (err) {
      showToast(err.message || 'שגיאה בהוספת מנחה', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור והוסף מנחה</span>';
    }
  }, 400);
}

/**
 * ==========================================================================
 * REPORT INSPECTION & APPROVAL
 * ==========================================================================
 */
function openAdminReviewModal(reportId) {
  const report = API.getReportById(reportId);
  if (!report) return;

  activeAdminReviewReport = report;

  document.getElementById('admin-modal-title').textContent = `בדיקת ממונה מחוזי ואישור סופי לתשלום – דוח ${formatMonthYear(report.year, report.month)}`;
  document.getElementById('admin-m-teacher').textContent = `${report.teacherName || ''} (${report.teacherId || ''})`;
  document.getElementById('admin-m-school').textContent = `${report.schoolName || ''} (${report.schoolCode || ''})`;
  document.getElementById('admin-m-district').textContent = `מחוז מרכז • מנחה: ${report.supervisorName || 'אברהם מנחה'}`;

  document.getElementById('admin-m-payable').textContent = report.totalPayableHours || 0;
  document.getElementById('admin-m-hours-breakdown').textContent = `קבועות: ${report.totalFixedHours || 0} | נוספות: ${report.totalOvertimeHours || 0} | היעדרות: ${report.totalAbsenceHours || 0}`;

  const badgesMount = document.getElementById('admin-m-approval-badges');
  badgesMount.innerHTML = `
    <div class="flex items-center gap-xs">
      <span class="badge ${report.principalApprovedAt ? 'badge-success' : 'badge-warning'}">
        ${report.principalApprovedAt ? `מנהלת אישרה ב-${formatDateTime(report.principalApprovedAt)}` : 'טרם אושר ע"י מנהלת'}
      </span>
    </div>
    <div class="flex items-center gap-xs">
      <span class="badge ${report.supervisorApprovedAt ? 'badge-success' : 'badge-warning'}">
        ${report.supervisorApprovedAt ? `מנחה אישר ב-${formatDateTime(report.supervisorApprovedAt)}` : 'טרם אושר ע"י מנחה'}
      </span>
    </div>
  `;

  renderAdminDaysTable(report.daysData || []);

  const timelineMount = document.getElementById('admin-m-audit-timeline');
  timelineMount.innerHTML = '';
  (report.auditHistory || []).forEach(item => {
    const div = document.createElement('div');
    div.className = 'timeline-item';
    div.innerHTML = `
      <div class="timeline-date">${item.date || ''} • <strong>${item.user || ''}</strong></div>
      <div class="timeline-action">${item.action || ''}</div>
    `;
    timelineMount.appendChild(div);
  });

  const attachmentsMount = document.getElementById('admin-m-attachments-list');
  attachmentsMount.innerHTML = '';
  if (!report.attachments || report.attachments.length === 0) {
    attachmentsMount.innerHTML = '<span class="text-muted" style="font-size:0.8125rem;">לא צורפו נספחים לדוח זה</span>';
  } else {
    report.attachments.forEach(att => {
      const a = document.createElement('div');
      a.className = 'flex items-center gap-xs';
      a.style.fontSize = '0.8125rem';
      a.innerHTML = `
        <svg style="width:14px; height:14px; fill:var(--primary);" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        <a href="#" onclick="alert('פתיחת נספח: ${att.name}'); return false;">${att.name}</a>
        <span class="text-muted">(${att.size})</span>
      `;
      attachmentsMount.appendChild(a);
    });
  }

  if (adminSigPad) {
    adminSigPad.clear();
  }

  openModal('admin-review-modal');
}

function renderAdminDaysTable(days) {
  const tbody = document.getElementById('admin-m-days-tbody');
  tbody.innerHTML = '';

  days.forEach(day => {
    const tr = document.createElement('tr');
    let dayTags = '';
    if (day.isFieldDay) dayTags += '<span class="badge badge-warning" style="margin-right:4px;">יום שדה</span>';
    if (day.isHoliday) dayTags += `<span class="badge" style="background:#e2e3e5; margin-right:4px;">${day.holidayName || 'חג/חופשה'}</span>`;

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
      <td>${day.supervisorEdited ? '<span class="badge badge-warning">עודכן ע"י מנחה</span>' : '<span class="text-muted">—</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function handleAdminFinalApprove() {
  if (!activeAdminReviewReport) return;

  const btnApprove = document.getElementById('admin-btn-approve-payment');
  btnApprove.disabled = true;
  btnApprove.innerHTML = '<div class="spinner"></div><span>מאשר לתשלום וחותם...</span>';

  const sigImg = adminSigPad ? adminSigPad.toDataURL() : null;

  setTimeout(() => {
    const approvedReport = API.adminFinalApprove(activeAdminReviewReport.id, currentAdmin, sigImg);
    closeModal('admin-review-modal');
    showToast(`הדוח אושר סופית לתשלום שכר! הונפקה חתימה מאובטחת: ${approvedReport.signatureId}`, 'success', 'אושר ונחתם דיגיטלית');

    loadMasterAdminData();
    btnApprove.disabled = false;
    btnApprove.innerHTML = '<span>אישור סופי לתשלום והטבעת חתימה</span>';
  }, 600);
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
  exportReportsToExcel(allReportsList, 'shalah_master_center_district_reports_2026.csv');
}

// Global window bindings for inline HTML event handlers
window.openAddTeacherModal = openAddTeacherModal;
window.openAddSupervisorModal = openAddSupervisorModal;
window.handleAddTeacherSubmit = handleAddTeacherSubmit;
window.handleAddSupervisorSubmit = handleAddSupervisorSubmit;
window.openAdminReviewModal = openAdminReviewModal;
window.handleAdminFinalApprove = handleAdminFinalApprove;
window.openAdminReturnModal = openAdminReturnModal;
window.handleAdminReturnConfirm = handleAdminReturnConfirm;
window.exportMasterReports = exportMasterReports;
window.loadSupervisorsList = loadSupervisorsList;
window.loadRosterUsers = loadRosterUsers;
window.loadMasterAdminData = loadMasterAdminData;
