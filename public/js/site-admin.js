/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Site Administrator Master Controller (ניהול אתר ומערכת ראשי)
 */

let currentSiteAdmin = null;
let allReports = [];
let allUsers = [];
let pendingDeleteReportId = null;
let pendingDeleteUserId = null;
let activeViewingReport = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    currentSiteAdmin = Auth.requireAuth(['site_admin', 'superadmin', 'admin']);
    if (currentSiteAdmin) {
      Auth.renderHeader('site_admin');
      Auth.renderFooter();

      // Display site admin name
      const nameEl = document.getElementById('site-admin-name');
      if (nameEl) nameEl.textContent = `לוח בקרה מנהל אתר – ${currentSiteAdmin.name || 'מנהל ראשי'}`;

      loadInitialData();
      setupEventListeners();
    }
  } catch (err) {
    console.error('Site Admin init error:', err);
  }
});

function loadInitialData() {
  allReports = API.getReports();
  allUsers = API.getUsers();

  updateKpis();
  renderReportsTable(allReports);
  renderUsersTable(allUsers);
  renderAuditLogs();
}

function updateKpis() {
  const totalReports = allReports.length;
  const approvedReports = allReports.filter(r => r.status === 'approved_paid').length;
  const inReviewReports = allReports.filter(r => r.status === 'pending_principal' || r.status === 'pending_supervisor' || r.status === 'supervisor_edited' || r.status === 'pending_admin').length;
  const drafts = allReports.filter(r => r.status === 'draft' || r.status === 'returned').length;

  let totalOvertimeHours = 0;
  allReports.filter(r => r.status === 'approved_paid').forEach(r => {
    totalOvertimeHours += parseFloat(r.totalOvertimeHours || 0);
  });

  const totalUsers = allUsers.length;
  const teachersCount = allUsers.filter(u => u.role === 'teacher').length;
  const supervisorsCount = allUsers.filter(u => u.role === 'supervisor').length;
  const adminsCount = allUsers.filter(u => u.role === 'admin' || u.role === 'site_admin').length;

  document.getElementById('stat-total-reports').textContent = totalReports;
  document.getElementById('stat-reports-sub').textContent = `${approvedReports} מאושרים | ${inReviewReports} בתהליך | ${drafts} טיוטות`;

  document.getElementById('stat-total-users').textContent = totalUsers;
  document.getElementById('stat-users-sub').textContent = `${teachersCount} מורים | ${supervisorsCount} מנחים | ${adminsCount} ממונים`;

  document.getElementById('stat-total-overtime').textContent = totalOvertimeHours;
}

function switchTab(tabKey) {
  const tabs = ['reports', 'users', 'audit'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const pane = document.getElementById(`pane-${t}`);
    if (btn) btn.classList.toggle('active', t === tabKey);
    if (pane) pane.classList.toggle('active', t === tabKey);
  });

  if (tabKey === 'audit') {
    renderAuditLogs();
  }
}

// ============================================================================
// REPORTS MANAGEMENT & DELETION
// ============================================================================
function filterReportsList() {
  const districtVal = document.getElementById('filter-report-district').value;
  const statusVal = document.getElementById('filter-report-status').value;
  const searchVal = document.getElementById('filter-report-search').value.trim().toLowerCase();

  let filtered = [...allReports];

  if (districtVal !== 'all') {
    filtered = filtered.filter(r => r.district === districtVal);
  }

  if (statusVal !== 'all') {
    filtered = filtered.filter(r => r.status === statusVal);
  }

  if (searchVal) {
    filtered = filtered.filter(r => 
      (r.teacherName && r.teacherName.toLowerCase().includes(searchVal)) ||
      (r.teacherId && r.teacherId.toLowerCase().includes(searchVal)) ||
      (r.schoolName && r.schoolName.toLowerCase().includes(searchVal)) ||
      (r.signatureId && r.signatureId.toLowerCase().includes(searchVal)) ||
      (r.id && r.id.toLowerCase().includes(searchVal))
    );
  }

  renderReportsTable(filtered);
}

function resetReportFilters() {
  document.getElementById('filter-report-district').value = 'all';
  document.getElementById('filter-report-status').value = 'all';
  document.getElementById('filter-report-search').value = '';
  renderReportsTable(allReports);
}

function renderReportsTable(reports) {
  const tbody = document.getElementById('site-admin-reports-tbody');
  const emptyState = document.getElementById('reports-empty-state');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!reports || reports.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  reports.forEach((rep, index) => {
    const statusMeta = REPORT_STATUSES[rep.status] || { label: rep.status, badgeClass: 'badge-draft' };
    const monthName = HEBREW_MONTHS_NAME[rep.month - 1] || rep.month;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center; font-weight:600; color:var(--on-surface-variant);">${index + 1}</td>
      <td>
        <div style="font-weight:700; color:#0c3058;">${rep.teacherName || '—'}</div>
        <div style="font-size:0.75rem; color:var(--on-surface-variant);">שם משתמש: ${rep.teacherId || '—'}</div>
      </td>
      <td>
        <div>${rep.schoolName || '—'}</div>
        <div style="font-size:0.75rem; color:var(--on-surface-variant);">${rep.schoolCode ? `(${rep.schoolCode})` : ''}</div>
      </td>
      <td><span class="badge" style="background:#e8f4fd; color:#0d47a1;">${rep.district || 'מרכז'}</span></td>
      <td style="font-weight:600;">${monthName} ${rep.year}</td>
      <td style="text-align:center; font-weight:700; color:var(--primary);">${rep.totalOvertimeHours || 0}</td>
      <td style="text-align:center; color:${rep.totalAbsenceHours > 0 ? '#dc3545' : 'inherit'}; font-weight:${rep.totalAbsenceHours > 0 ? '700' : 'normal'};">${rep.totalAbsenceHours || 0}</td>
      <td><span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span></td>
      <td style="font-size:0.8125rem;">${rep.signatureId ? `<code style="font-size:0.75rem; color:#2e7d32; font-weight:700;">${rep.signatureId}</code>` : '<span class="text-muted">—</span>'}</td>
      <td style="text-align:center;">
        <div class="flex items-center justify-center gap-xs">
          <button type="button" class="btn btn-sm btn-secondary" title="צפייה בפרטי הדוח" onclick="viewReportDetails('${rep.id}')" style="padding:4px 8px; font-size:0.75rem;">
            👁️ צפייה
          </button>
          <button type="button" class="btn btn-sm btn-danger" title="מחיקת דוח לצמיתות" onclick="promptDeleteReport('${rep.id}')" style="padding:4px 8px; font-size:0.75rem;">
            🗑️ מחק
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function promptDeleteReport(reportId) {
  const report = allReports.find(r => r.id === reportId);
  if (!report) {
    showToast('הדוח לא נמצא', 'error');
    return;
  }

  pendingDeleteReportId = reportId;

  document.getElementById('del-rep-id').textContent = report.id;
  document.getElementById('del-rep-teacher').textContent = `${report.teacherName} (משתמש: ${report.teacherId})`;
  document.getElementById('del-rep-period').textContent = `${HEBREW_MONTHS_NAME[report.month - 1] || report.month} ${report.year}`;
  document.getElementById('del-rep-school').textContent = `${report.schoolName || '—'} • מחוז ${report.district || 'מרכז'}`;
  
  const statusMeta = REPORT_STATUSES[report.status] || { label: report.status };
  document.getElementById('del-rep-status').textContent = statusMeta.label;

  openModal('modal-delete-report');
}

function executeDeleteReport() {
  if (!pendingDeleteReportId) return;

  const btn = document.getElementById('btn-confirm-delete-report');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>מוחק דוח...</span>';

  setTimeout(() => {
    try {
      API.deleteReport(pendingDeleteReportId, currentSiteAdmin);
      closeModal('modal-delete-report');
      closeModal('modal-view-report');
      showToast('הדוח נמחק בהצלחה מהמערכת לצמיתות!', 'success', 'דוח נמחק');

      loadInitialData();
    } catch (err) {
      showToast(err.message || 'שגיאה במחיקת הדוח', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>🗑️ מחק דוח לצמיתות</span>';
      pendingDeleteReportId = null;
    }
  }, 400);
}

function viewReportDetails(reportId) {
  const report = allReports.find(r => r.id === reportId);
  if (!report) return;

  activeViewingReport = report;

  const monthName = HEBREW_MONTHS_NAME[report.month - 1] || report.month;
  document.getElementById('view-modal-title').textContent = `דוח שעות – ${report.teacherName || 'מורה'}`;
  document.getElementById('view-modal-sub').textContent = `${monthName} ${report.year} | ${report.schoolName || ''} (${report.district || 'מרכז'})`;

  document.getElementById('view-rep-teacher').textContent = report.teacherName || '—';
  document.getElementById('view-rep-overtime').textContent = report.totalOvertimeHours || 0;
  document.getElementById('view-rep-absence').textContent = report.totalAbsenceHours || 0;

  const statusMeta = REPORT_STATUSES[report.status] || { label: report.status, badgeClass: 'badge-draft' };
  document.getElementById('view-rep-status-badge').innerHTML = `<span class="badge ${statusMeta.badgeClass}">${statusMeta.label}</span>`;

  // Render Days Table
  const tbody = document.getElementById('view-rep-days-tbody');
  tbody.innerHTML = '';

  const days = report.daysData || [];
  days.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center; font-weight:700;">${d.dayOfMonth || d.day_number || ''}</td>
      <td>${d.dayName || d.day_name_hebrew || ''}</td>
      <td style="text-align:center;">${d.fixedHours || d.regular_hours || 0}</td>
      <td style="text-align:center; color:${d.absenceHours > 0 ? '#dc3545' : 'inherit'}; font-weight:${d.absenceHours > 0 ? '700' : 'normal'};">${d.absenceHours || d.absence_hours || 0}</td>
      <td style="font-size:0.75rem;">${d.absenceReason || d.absence_reason || '—'}</td>
      <td style="text-align:center; color:var(--primary); font-weight:${d.overtimeHours > 0 ? '700' : 'normal'};">${d.overtimeHours || d.overtime_hours || 0}</td>
      <td style="font-size:0.75rem;">${d.overtimeReason || d.overtime_reason || '—'}</td>
      <td style="font-size:0.75rem;">${d.description || d.activity_description || '—'}</td>
    `;
    tbody.appendChild(tr);
  });

  openModal('modal-view-report');
}

function promptDeleteFromViewModal() {
  if (activeViewingReport) {
    promptDeleteReport(activeViewingReport.id);
  }
}

// ============================================================================
// USERS MANAGEMENT
// ============================================================================
function filterUsersList() {
  const roleVal = document.getElementById('filter-user-role').value;
  const districtVal = document.getElementById('filter-user-district').value;
  const searchVal = document.getElementById('filter-user-search').value.trim().toLowerCase();

  let filtered = [...allUsers];

  if (roleVal !== 'all') {
    filtered = filtered.filter(u => u.role === roleVal);
  }

  if (districtVal !== 'all') {
    filtered = filtered.filter(u => u.district === districtVal);
  }

  if (searchVal) {
    filtered = filtered.filter(u =>
      (u.name && u.name.toLowerCase().includes(searchVal)) ||
      (u.id && u.id.toLowerCase().includes(searchVal)) ||
      (u.schoolName && u.schoolName.toLowerCase().includes(searchVal)) ||
      (u.email && u.email.toLowerCase().includes(searchVal))
    );
  }

  renderUsersTable(filtered);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('site-admin-users-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const roleBadgeMap = {
    admin: { label: 'ממונה מחוזי / ארצי', cls: 'badge-role-admin' },
    supervisor: { label: 'מנחה מחוזי', cls: 'badge-role-supervisor' },
    teacher: { label: 'מורה של"ח', cls: 'badge-role-teacher' },
    principal: { label: 'מנהל/ת מוסד', cls: 'badge-role-principal' },
    site_admin: { label: 'מנהל אתר', cls: 'badge-role-site_admin' },
    superadmin: { label: 'מנהל אתר', cls: 'badge-role-site_admin' }
  };

  users.forEach((u, index) => {
    const roleMeta = roleBadgeMap[u.role] || { label: u.role, cls: 'badge-draft' };
    const isCurrentAdmin = currentSiteAdmin && u.id === currentSiteAdmin.id;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center; font-weight:600; color:var(--on-surface-variant);">${index + 1}</td>
      <td>
        <div style="font-weight:700; color:#0c3058;">${u.name || '—'}</div>
        <div style="font-size:0.75rem; color:var(--on-surface-variant);">${u.email || ''}</div>
      </td>
      <td><code>${u.id}</code></td>
      <td><span class="badge ${roleMeta.cls}">${roleMeta.label}</span></td>
      <td><span class="badge" style="background:#f0f4f8; color:#0c3058;">${u.district || 'מרכז'}</span></td>
      <td>
        <div>${u.schoolName || '<span class="text-muted">—</span>'}</div>
        ${u.schoolCode ? `<div style="font-size:0.75rem; color:var(--on-surface-variant);">סמל: ${u.schoolCode}</div>` : ''}
      </td>
      <td>${u.supervisorName || '<span class="text-muted">—</span>'}</td>
      <td style="font-size:0.8125rem;">
        <div>📞 ${u.phone || '—'}</div>
      </td>
      <td style="text-align:center;">
        <div class="flex items-center justify-center gap-xs">
          <button type="button" class="btn btn-sm btn-outline-primary" title="עריכת משתמש" onclick="openEditUserModal('${u.id}')" style="padding:3px 8px; font-size:0.75rem;">
            ✏️ ערוך
          </button>
          ${isCurrentAdmin ? '' : `
            <button type="button" class="btn btn-sm btn-outline-danger" title="הסרת משתמש" onclick="promptDeleteUser('${u.id}')" style="padding:3px 8px; font-size:0.75rem;">
              🗑️ הסר
            </button>
          `}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function promptDeleteUser(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  pendingDeleteUserId = userId;

  const roleNames = {
    admin: 'ממונה',
    supervisor: 'מנחה',
    teacher: 'מורה',
    principal: 'מנהל/ת',
    site_admin: 'מנהל אתר'
  };

  document.getElementById('del-usr-name').textContent = user.name;
  document.getElementById('del-usr-id').textContent = user.id;
  document.getElementById('del-usr-role').textContent = roleNames[user.role] || user.role;
  document.getElementById('del-usr-district').textContent = user.district || 'מרכז';

  openModal('modal-delete-user');
}

function executeDeleteUser() {
  if (!pendingDeleteUserId) return;

  const btn = document.getElementById('btn-confirm-delete-user');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>מסיר משתמש...</span>';

  setTimeout(() => {
    try {
      API.deleteUser(pendingDeleteUserId, currentSiteAdmin);
      closeModal('modal-delete-user');
      showToast('המשתמש הוסר בהצלחה מהמערכת!', 'success', 'משתמש הוסר');

      loadInitialData();
    } catch (err) {
      showToast(err.message || 'שגיאה בהסרת המשתמש', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>🗑️ מחק משתמש</span>';
      pendingDeleteUserId = null;
    }
  }, 400);
}

// ============================================================================
// ADD ADMIN (ממונה)
// ============================================================================
function openAddAdminModal() {
  const form = document.getElementById('form-add-admin');
  if (form) form.reset();
  openModal('modal-add-admin');
}

function handleAddAdminSubmit(e) {
  e.preventDefault();

  const firstName = document.getElementById('admin-first-name').value.trim();
  const lastName = document.getElementById('admin-last-name').value.trim();
  const district = document.getElementById('admin-district').value;
  const username = document.getElementById('admin-username').value.trim();
  const password = document.getElementById('admin-password').value.trim();
  const email = document.getElementById('admin-email').value.trim();
  const phone = document.getElementById('admin-phone').value.trim();

  if (!firstName || !lastName || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const btn = document.getElementById('btn-save-admin');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>שומר ממונה...</span>';

  setTimeout(() => {
    try {
      const newAdmin = API.siteAdminCreateAdmin({
        firstName,
        lastName,
        username,
        password: phone || password,
        district,
        email
      });

      closeModal('modal-add-admin');
      showToast(`הממונה ${newAdmin.name} נוסף בהצלחה למערכת!`, 'success', 'ממונה נוסף');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'שגיאה בהוספת ממונה', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור והוסף ממונה</span>';
    }
  }, 400);
}

// ============================================================================
// ADD SUPERVISOR (מנחה)
// ============================================================================
function openAddSupervisorModal() {
  const form = document.getElementById('form-add-supervisor');
  if (form) form.reset();
  openModal('modal-add-supervisor');
}

function handleAddSupervisorSubmit(e) {
  e.preventDefault();

  const firstName = document.getElementById('sup-first-name').value.trim();
  const lastName = document.getElementById('sup-last-name').value.trim();
  const district = document.getElementById('sup-district').value;
  const username = document.getElementById('sup-username').value.trim();
  const password = document.getElementById('sup-password').value.trim();
  const email = document.getElementById('sup-email').value.trim();
  const phone = document.getElementById('sup-phone').value.trim();

  if (!firstName || !lastName || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const btn = document.getElementById('btn-save-supervisor');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>שומר מנחה...</span>';

  setTimeout(() => {
    try {
      const newSup = API.siteAdminCreateSupervisor({
        firstName,
        lastName,
        username,
        password: phone || password,
        district,
        email
      });

      closeModal('modal-add-supervisor');
      showToast(`המנחה ${newSup.name} נוסף בהצלחה למערכת!`, 'success', 'מנחה נוסף');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'שגיאה בהוספת מנחה', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור והוסף מנחה</span>';
    }
  }, 400);
}

// ============================================================================
// ADD TEACHER (מורה)
// ============================================================================
function openAddTeacherModal() {
  const form = document.getElementById('form-add-teacher');
  if (form) form.reset();
  updateTeacherModalSupervisors();
  openModal('modal-add-teacher');
}

function updateTeacherModalSupervisors() {
  const select = document.getElementById('tch-supervisor');
  if (!select) return;

  const district = document.getElementById('tch-district').value;
  const supervisors = API.getSupervisors();

  select.innerHTML = '<option value="">-- בחר מנחה מחוזי --</option>';

  const filteredSups = supervisors.filter(s => !s.district || s.district === district || district === 'all');
  const listToRender = filteredSups.length > 0 ? filteredSups : supervisors;

  listToRender.forEach(sup => {
    const opt = document.createElement('option');
    opt.value = sup.id;
    opt.textContent = `${sup.name} (${sup.district || 'מרכז'})`;
    select.appendChild(opt);
  });

  if (listToRender.length > 0) {
    select.selectedIndex = 1;
  }
}

function handleAddTeacherSubmit(e) {
  e.preventDefault();

  const firstName = document.getElementById('tch-first-name').value.trim();
  const lastName = document.getElementById('tch-last-name').value.trim();
  const district = document.getElementById('tch-district').value;
  const supervisorId = document.getElementById('tch-supervisor').value;
  const schoolName = document.getElementById('tch-school-name').value.trim();
  const schoolCode = document.getElementById('tch-school-code').value.trim();
  const username = document.getElementById('tch-username').value.trim();
  const password = document.getElementById('tch-password').value.trim();
  const email = document.getElementById('tch-email').value.trim();
  const phone = document.getElementById('tch-phone').value.trim();

  if (!firstName || !lastName || !supervisorId || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const btn = document.getElementById('btn-save-teacher');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>שומר מורה...</span>';

  setTimeout(() => {
    try {
      const newTeacher = API.siteAdminCreateTeacher({
        firstName,
        lastName,
        supervisorId,
        username,
        password: phone || password,
        schoolName,
        schoolCode,
        district,
        email
      });

      closeModal('modal-add-teacher');
      showToast(`המורה ${newTeacher.name} נוסף בהצלחה ושויך למנחה!`, 'success', 'מורה נוסף');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'שגיאה בהוספת מורה', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור והוסף מורה</span>';
    }
  }, 400);
}

// ============================================================================
// EDIT USER (עריכת משתמש ע"י מנהל אתר)
// ============================================================================
function openEditUserModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) {
    showToast('משתמש לא נמצא', 'error');
    return;
  }

  const parts = (user.name || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  document.getElementById('site-edit-user-id').value = user.id;
  document.getElementById('site-edit-user-role').value = user.role;
  document.getElementById('site-edit-first-name').value = firstName;
  document.getElementById('site-edit-last-name').value = lastName;
  document.getElementById('site-edit-district').value = user.district || 'מרכז';
  document.getElementById('site-edit-username').value = user.id;
  document.getElementById('site-edit-password').value = user.phone || '';
  document.getElementById('site-edit-email').value = user.email || '';
  document.getElementById('site-edit-phone').value = user.phone || '';

  const supWrapper = document.getElementById('site-edit-supervisor-wrapper');
  const schoolWrapper = document.getElementById('site-edit-school-wrapper');
  const titleEl = document.getElementById('site-edit-user-title');

  const roleLabels = { teacher: 'מורה של"ח', supervisor: 'מנחה מחוזי', admin: 'ממונה מחוזי/ארצי', site_admin: 'מנהל אתר', principal: 'מנהל/ת מוסד' };
  if (titleEl) titleEl.textContent = `עריכת פרטי ${roleLabels[user.role] || 'משתמש'} – ${user.name}`;

  if (user.role === 'teacher') {
    if (supWrapper) supWrapper.style.display = 'block';
    if (schoolWrapper) schoolWrapper.style.display = 'grid';
    document.getElementById('site-edit-school-name').value = user.schoolName || '';
    document.getElementById('site-edit-school-code').value = user.schoolCode || '';
    updateEditTeacherSupervisors(user.supervisorId);
  } else {
    if (supWrapper) supWrapper.style.display = 'none';
    if (schoolWrapper) schoolWrapper.style.display = 'none';
  }

  openModal('modal-edit-user');
}

function updateEditTeacherSupervisors(selectedSupervisorId = null) {
  const select = document.getElementById('site-edit-supervisor');
  if (!select) return;

  const district = document.getElementById('site-edit-district').value;
  const supervisors = API.getSupervisors();

  select.innerHTML = '<option value="">-- בחר מנחה מחוזי --</option>';

  const filteredSups = supervisors.filter(s => !s.district || s.district === district || district === 'all');
  const listToRender = filteredSups.length > 0 ? filteredSups : supervisors;

  listToRender.forEach(sup => {
    const opt = document.createElement('option');
    opt.value = sup.id;
    opt.textContent = `${sup.name} (${sup.district || 'מרכז'})`;
    if (selectedSupervisorId && (sup.id === selectedSupervisorId || sup.name === selectedSupervisorId)) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function handleEditUserSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('site-edit-user-id').value;
  const role = document.getElementById('site-edit-user-role').value;
  const firstName = document.getElementById('site-edit-first-name').value.trim();
  const lastName = document.getElementById('site-edit-last-name').value.trim();
  const district = document.getElementById('site-edit-district').value;
  const username = document.getElementById('site-edit-username').value.trim();
  const password = document.getElementById('site-edit-password').value.trim();
  const email = document.getElementById('site-edit-email').value.trim();
  const phone = document.getElementById('site-edit-phone').value.trim();

  if (!firstName || !lastName || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const updateData = {
    firstName,
    lastName,
    username,
    password: phone || password,
    email,
    district
  };

  if (role === 'teacher') {
    const supervisorId = document.getElementById('site-edit-supervisor').value;
    const schoolName = document.getElementById('site-edit-school-name').value.trim();
    const schoolCode = document.getElementById('site-edit-school-code').value.trim();

    if (!supervisorId) {
      showToast('נא לבחור מנחה מחוזי משויך', 'warning');
      return;
    }

    updateData.supervisorId = supervisorId;
    updateData.schoolName = schoolName;
    updateData.schoolCode = schoolCode;
  }

  const btn = document.getElementById('btn-site-save-user');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>מעדכן פרטים...</span>';

  setTimeout(() => {
    try {
      const updatedUser = API.updateUser(userId, updateData, currentSiteAdmin);
      closeModal('modal-edit-user');
      showToast(`פרטי המשתמש ${updatedUser.name} עודכנו בהצלחה!`, 'success', 'משתמש עודכן');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'שגיאה בעדכון המשתמש', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור שינויים</span>';
    }
  }, 400);
}

// ============================================================================
// AUDIT LOGS
// ============================================================================
function renderAuditLogs() {
  const tbody = document.getElementById('site-admin-audit-tbody');
  if (!tbody) return;

  const rawLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
  const logs = rawLogs ? JSON.parse(rawLogs) : [];

  tbody.innerHTML = '';

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-muted">אין אירועים מתועדים ביומן המערכת עד כה.</td></tr>';
    return;
  }

  // Show newest first
  [...logs].reverse().forEach(log => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-size:0.8125rem; font-weight:600; color:var(--on-surface-variant);">${log.date || '—'}</td>
      <td style="font-weight:700; color:#0c3058;">${log.user || 'מערכת'}</td>
      <td style="font-size:0.875rem;">${log.action || log.details || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setupEventListeners() {
  // Modal background clicks & Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['modal-add-admin', 'modal-add-supervisor', 'modal-add-teacher', 'modal-delete-report', 'modal-delete-user', 'modal-view-report', 'modal-edit-user'].forEach(closeModal);
    }
  });
}

// Global window bindings for inline HTML event handlers
window.switchTab = switchTab;
window.filterReportsList = filterReportsList;
window.resetReportFilters = resetReportFilters;
window.filterUsersList = filterUsersList;
window.viewReportDetails = viewReportDetails;
window.promptDeleteReport = promptDeleteReport;
window.executeDeleteReport = executeDeleteReport;
window.promptDeleteUser = promptDeleteUser;
window.executeDeleteUser = executeDeleteUser;
window.promptDeleteFromViewModal = promptDeleteFromViewModal;
window.openAddAdminModal = openAddAdminModal;
window.handleAddAdminSubmit = handleAddAdminSubmit;
window.openAddSupervisorModal = openAddSupervisorModal;
window.handleAddSupervisorSubmit = handleAddSupervisorSubmit;
window.openAddTeacherModal = openAddTeacherModal;
window.handleAddTeacherSubmit = handleAddTeacherSubmit;
window.updateTeacherModalSupervisors = updateTeacherModalSupervisors;
window.openEditUserModal = openEditUserModal;
window.updateEditTeacherSupervisors = updateEditTeacherSupervisors;
window.handleEditUserSubmit = handleEditUserSubmit;
