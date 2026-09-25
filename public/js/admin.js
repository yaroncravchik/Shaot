/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Super Admin (Ronen) Master Dashboard & RSA Approval Controller
 */

let currentAdmin = null;
let allReportsList = [];
let activeAdminReviewReport = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    currentAdmin = Auth.requireAuth(['admin']);
    if (currentAdmin) {
      Auth.renderHeader('admin');
      Auth.renderFooter();
      loadMasterAdminData();
      loadRosterUsers();
      setupAdminFilters();
    }
  } catch (err) {
    console.error('Admin page init warning:', err);
  }

  setupModalButtons();
});

function setupModalButtons() {
  const teacherBtn = document.getElementById('btn-roster-add-teacher');
  if (teacherBtn) {
    teacherBtn.onclick = function(e) {
      if (e) e.preventDefault();
      openAddTeacherModal();
    };
  }

  const supervisorBtn = document.getElementById('btn-roster-add-supervisor');
  if (supervisorBtn) {
    supervisorBtn.onclick = function(e) {
      if (e) e.preventDefault();
      openAddSupervisorModal();
    };
  }
}

function loadMasterAdminData() {
  allReportsList = (API && typeof API.getReports === 'function') ? API.getReports().filter(r => !r.district || r.district === 'מרכז') : [];
  renderMasterReportsTable(allReportsList);
  updateMasterKpis(allReportsList);
}

function updateMasterKpis(reports) {
  const totalCount = reports.length;
  const pendingAdminCount = reports.filter(r => r.status === 'pending_admin' || r.status === 'supervisor_edited' || r.status === 'pending_supervisor').length;
  const signedCount = reports.filter(r => r.status === 'approved_paid').length;
  
  let totalApprovedOvertimeHours = 0;
  reports.filter(r => r.status === 'approved_paid').forEach(r => {
    totalApprovedOvertimeHours += parseFloat(r.totalOvertimeHours || 0);
  });

  const elTotal = document.getElementById('admin-stat-total-reports');
  const elPending = document.getElementById('admin-stat-pending-admin');
  const elSigned = document.getElementById('admin-stat-signed');
  const elHours = document.getElementById('admin-stat-total-hours');

  if (elTotal) elTotal.textContent = totalCount;
  if (elPending) elPending.textContent = pendingAdminCount;
  if (elSigned) elSigned.textContent = signedCount;
  if (elHours) elHours.textContent = totalApprovedOvertimeHours;
}

function setupAdminFilters() {
  const searchInput = document.getElementById('admin-search');
  const statusFilter = document.getElementById('admin-status-filter');
  if (!searchInput || !statusFilter) return;

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
        (r.teacherId && String(r.teacherId).includes(q)) ||
        (r.schoolName && r.schoolName.toLowerCase().includes(q)) ||
        (r.supervisorName && r.supervisorName.toLowerCase().includes(q)) ||
        (r.id && String(r.id).toLowerCase().includes(q))
      );
    }

    renderMasterReportsTable(filtered);
  }

  searchInput.addEventListener('input', applyMasterFilters);
  statusFilter.addEventListener('change', applyMasterFilters);
}

function renderMasterReportsTable(reports) {
  const tbody = document.getElementById('admin-reports-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted p-3">לא נמצאו דוחות התואמים את תנאי החיפוש והסינון</td></tr>`;
    return;
  }

  reports.forEach(r => {
    const st = REPORT_STATUSES[r.status] || { label: r.status, badgeClass: 'badge-draft' };
    const tr = document.createElement('tr');

    let sigHtml = '<span class="text-muted" style="font-size:0.75rem;">ממתין לחתימה</span>';
    if (r.signatureId || r.status === 'approved_paid') {
      sigHtml = `
        <span class="rsa-badge" style="background:#d4edda; color:#155724; border-color:#c3e6cb; font-size:0.71875rem; padding:2px 6px;">
          אושר ונחתם לתשלום
        </span>
      `;
    }

    const isApproved = r.status === 'approved_paid' || !!r.signatureId;
    const approveBtnHtml = isApproved
      ? `<button type="button" class="btn btn-sm btn-approved" disabled title="הדוח כבר אושר ונחתם לתשלום" style="padding:3px 8px; font-size:0.75rem;">
          <span>✓ אושר</span>
        </button>`
      : `<button type="button" class="btn btn-sm btn-success" onclick="quickAdminApproveReport('${r.id}')" title="אישור סופי של הדוח לתשלום שכר" style="padding:3px 8px; font-size:0.75rem;">
          <span>✓ אישור</span>
        </button>`;

    const viewBtnHtml = `<button type="button" class="btn btn-sm btn-outline-primary" onclick="openAdminReviewModal('${r.id}')" title="צפייה בפרטי הדוח המלאים" style="padding:3px 8px; font-size:0.75rem;">
      <span>👁️ צפייה</span>
    </button>`;

    tr.innerHTML = `
      <td><span style="font-family:monospace; font-size:0.75rem;">${r.id}</span></td>
      <td>
        <a href="javascript:void(0)" class="clickable-teacher-name" onclick="openTeacherProfileModal('${r.teacherId || r.teacherName}')" title="לחץ לצפייה בפרופיל המורה ובמערכת השעות" style="font-size:0.8125rem;">
          <strong>${r.teacherName || ''}</strong>
          <span class="teacher-info-icon">👤</span>
        </a>
      </td>
      <td><span class="badge" style="background:#eef2f7; color:#0c3058; font-size:0.75rem; padding:2px 6px;">${r.district || 'מרכז'}</span></td>
      <td class="cell-truncate" title="${r.schoolName || ''}">${r.schoolName || ''}</td>
      <td class="cell-truncate" title="${r.supervisorName || 'אברהם מנחה'}">${r.supervisorName || 'אברהם מנחה'}</td>
      <td style="white-space:nowrap; font-size:0.78125rem;">${formatMonthYear(r.year, r.month)}</td>
      <td><span class="badge ${st.badgeClass}" style="font-size:0.75rem; padding:2px 6px;">${st.label}</span></td>
      <td style="white-space:nowrap;"><strong style="color:var(--primary); font-size:0.875rem;">${r.totalOvertimeHours || 0} ש'</strong></td>
      <td style="white-space:nowrap;">${sigHtml}</td>
      <td style="text-align:center; white-space:nowrap;">
        <div class="flex items-center justify-center gap-xs" style="gap:4px; flex-wrap:nowrap;">
          ${approveBtnHtml}
          ${viewBtnHtml}
        </div>
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

  const users = (API && typeof API.getAdminUsers === 'function') ? API.getAdminUsers() : [];
  tbody.innerHTML = '';

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-3">אין משתמשים רשומים במחוז</td></tr>`;
    return;
  }

  users.forEach(u => {
    const isTeacher = u.role === 'teacher';
    const roleBadge = isTeacher
      ? '<span class="badge" style="background:#e3f2fd; color:#0d47a1; font-weight:600; font-size:0.75rem; padding:2px 6px;">מורה של"ח</span>'
      : '<span class="badge" style="background:#ede7f6; color:#4a148c; font-weight:600; font-size:0.75rem; padding:2px 6px;">מנחה מחוזי</span>';

    const nameCellHtml = isTeacher
      ? `<a href="javascript:void(0)" class="clickable-teacher-name" onclick="openTeacherProfileModal('${u.id}')" title="לחץ לצפייה בפרופיל המורה ובמערכת השעות" style="font-size:0.8125rem;">
          <strong>${u.name || u.full_name || ''}</strong>
          <span class="teacher-info-icon">👤</span>
        </a>`
      : `<strong style="font-size:0.8125rem;">${u.name || u.full_name || ''}</strong>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${nameCellHtml}</td>
      <td>${roleBadge}</td>
      <td><span style="font-family:monospace; font-size:0.75rem;">${u.id || u.id_number || ''}</span></td>
      <td class="cell-truncate" title="${isTeacher ? (u.supervisorName || 'אברהם מנחה') : '—'}">${isTeacher ? (u.supervisorName || 'אברהם מנחה') : '<span class="text-muted">—</span>'}</td>
      <td class="cell-truncate" title="${u.schoolName || u.school_name || (isTeacher ? 'תיכון מחוזי מרכז' : 'פיקוח מחוז מרכז')}">${u.schoolName || u.school_name || (isTeacher ? 'תיכון מחוזי מרכז' : 'פיקוח מחוז מרכז')}</td>
      <td><span class="badge" style="background:#f1f3f5; color:#0c3058; font-size:0.75rem; padding:2px 6px;">${u.district || 'מרכז'}</span></td>
      <td><span class="badge badge-success" style="font-size:0.75rem; padding:2px 6px;">פעיל</span></td>
      <td style="text-align:center; white-space:nowrap;">
        <button type="button" class="btn btn-sm btn-outline-primary" onclick="openEditUserModal('${u.id}')" style="padding:3px 8px; font-size:0.75rem;">
          ✏️ עריכה
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEditUserModal(userId) {
  const users = (API && typeof API.getUsers === 'function') ? API.getUsers() : [];
  const user = users.find(u => String(u.id) === String(userId) || (u.id_number && String(u.id_number) === String(userId)));
  if (!user) {
    showToast('משתמש לא נמצא', 'error');
    return;
  }

  const parts = (user.name || user.full_name || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';

  const idEl = document.getElementById('edit-user-id');
  const roleEl = document.getElementById('edit-user-role');
  const fnEl = document.getElementById('edit-user-first-name');
  const lnEl = document.getElementById('edit-user-last-name');
  const unEl = document.getElementById('edit-user-username');
  const pwEl = document.getElementById('edit-user-password');
  const emEl = document.getElementById('edit-user-email');
  const distEl = document.getElementById('edit-user-district');

  if (idEl) idEl.value = user.id;
  if (roleEl) roleEl.value = user.role;
  if (fnEl) fnEl.value = firstName;
  if (lnEl) lnEl.value = lastName;
  if (unEl) unEl.value = user.id;
  if (pwEl) pwEl.value = user.phone || user.password || '';
  if (emEl) emEl.value = user.email || '';
  if (distEl) distEl.value = user.district || 'מרכז';

  const teacherFields = document.getElementById('edit-teacher-fields');
  const titleEl = document.getElementById('admin-edit-user-title');

  if (user.role === 'teacher') {
    if (teacherFields) teacherFields.style.display = 'block';
    if (titleEl) titleEl.textContent = `עריכת פרטי מורה – ${user.name || user.full_name || ''}`;

    // Populate supervisor dropdown
    const supSelect = document.getElementById('edit-teacher-supervisor');
    if (supSelect) {
      const supervisors = (API && typeof API.getSupervisors === 'function') ? API.getSupervisors() : [];
      supSelect.innerHTML = '<option value="">-- בחר מנחה מחוזי מתוך הרשימה --</option>';
      let selectedFound = false;
      supervisors.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name || s.full_name} (${s.district || 'מרכז'})`;
        if (String(s.id) === String(user.supervisorId) || s.name === user.supervisorName) {
          opt.selected = true;
          selectedFound = true;
        }
        supSelect.appendChild(opt);
      });
      if (!selectedFound && supervisors.length > 0) {
        supSelect.selectedIndex = 1;
      }
    }

    const schoolNameEl = document.getElementById('edit-teacher-school-name');
    const schoolCodeEl = document.getElementById('edit-teacher-school-code');
    if (schoolNameEl) schoolNameEl.value = user.schoolName || user.school_name || '';
    if (schoolCodeEl) schoolCodeEl.value = user.schoolCode || user.school_code || '';
  } else {
    if (teacherFields) teacherFields.style.display = 'none';
    if (titleEl) titleEl.textContent = `עריכת פרטי מנחה – ${user.name || user.full_name || ''}`;
  }

  openModal('admin-edit-user-modal');
}

function handleEditUserSubmit(e) {
  e.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const role = document.getElementById('edit-user-role').value;
  const firstName = document.getElementById('edit-user-first-name').value.trim();
  const lastName = document.getElementById('edit-user-last-name').value.trim();
  const username = document.getElementById('edit-user-username').value.trim();
  const password = document.getElementById('edit-user-password').value.trim();
  const email = document.getElementById('edit-user-email').value.trim();

  if (!firstName || !lastName || !username || !password) {
    showToast('נא למלא את כל שדות החובה המסומנים בכוכבית', 'warning');
    return;
  }

  const updateData = {
    firstName,
    lastName,
    username,
    password,
    email,
    district: 'מרכז'
  };

  if (role === 'teacher') {
    const supervisorId = document.getElementById('edit-teacher-supervisor').value;
    const schoolName = document.getElementById('edit-teacher-school-name').value.trim();
    const schoolCode = document.getElementById('edit-teacher-school-code').value.trim();

    if (!supervisorId) {
      showToast('נא לבחור מנחה מחוזי משויך', 'warning');
      return;
    }

    updateData.supervisorId = supervisorId;
    updateData.schoolName = schoolName;
    updateData.schoolCode = schoolCode;
  }

  const btn = document.getElementById('btn-update-user');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div><span>מעדכן פרטים...</span>';

  setTimeout(() => {
    try {
      const updatedUser = API.updateUser(userId, updateData, currentAdmin);
      closeModal('admin-edit-user-modal');
      showToast(`פרטי ${role === 'teacher' ? 'המורה' : 'המנחה'} ${updatedUser.name} עודכנו בהצלחה!`, 'success', 'עודכן בהצלחה');
      loadRosterUsers();
      loadMasterAdminData();
    } catch (err) {
      showToast(err.message || 'שגיאה בעדכון פרטי המשתמש', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>שמור שינויים</span>';
    }
  }, 400);
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
  const teacherEl = document.getElementById('admin-m-teacher');
  if (teacherEl) {
    teacherEl.innerHTML = `<a href="javascript:void(0)" class="clickable-teacher-name" onclick="openTeacherProfileModal('${report.teacherId || report.teacherName}')" title="לחץ לצפייה בפרופיל המורה ובמערכת השעות" style="color:var(--primary); font-size:1.05rem;"><strong>${report.teacherName || ''}</strong> (${report.teacherId || ''}) <span class="teacher-info-icon">👤</span></a>`;
  }
  document.getElementById('admin-m-school').textContent = `${report.schoolName || ''} (${report.schoolCode || ''})`;
  document.getElementById('admin-m-district').textContent = `מחוז מרכז • מנחה: ${report.supervisorName || 'אברהם מנחה'}`;

  document.getElementById('admin-m-payable').textContent = report.totalOvertimeHours || 0;
  document.getElementById('admin-m-hours-breakdown').textContent = `נוספות: ${report.totalOvertimeHours || 0} | היעדרות: ${report.totalAbsenceHours || 0}`;

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

  const btnApprove = document.getElementById('admin-btn-approve-payment');
  if (btnApprove) {
    const isApproved = report.status === 'approved_paid' || !!report.signatureId;
    if (isApproved) {
      btnApprove.disabled = true;
      btnApprove.className = 'btn btn-lg btn-approved';
      btnApprove.innerHTML = '<span>✓ אושר ונחתם לתשלום</span>';
      btnApprove.style.opacity = '1';
    } else {
      btnApprove.disabled = false;
      btnApprove.className = 'btn btn-lg btn-success';
      btnApprove.innerHTML = '<span>✓ אישור סופי לתשלום שכר</span>';
      btnApprove.style.opacity = '1';
    }
  }

  openModal('admin-review-modal');
}

function renderAdminDaysTable(days) {
  const tbody = document.getElementById('admin-m-days-tbody');
  if (!tbody) return;
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
  if (btnApprove) {
    btnApprove.disabled = true;
    btnApprove.innerHTML = '<div class="spinner"></div><span>מאשר לתשלום...</span>';
  }

  setTimeout(() => {
    const adminUser = currentAdmin || (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function' ? Auth.getCurrentUser() : null) || { name: 'רונן ממונה מחוז מרכז', role: 'admin' };
    const approvedReport = API.adminFinalApprove(activeAdminReviewReport.id, adminUser);
    closeModal('admin-review-modal');
    showToast(`הדוח אושר סופית לתשלום שכר! הונפקה חתימה מאובטחת: ${approvedReport.signatureId}`, 'success', 'אושר לתשלום');

    loadMasterAdminData();
    if (btnApprove) {
      btnApprove.disabled = false;
      btnApprove.innerHTML = '<span>אישור סופי לתשלום שכר</span>';
    }
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

function quickAdminApproveReport(reportId) {
  const report = API.getReportById(reportId);
  if (!report) return;

  if (report.status === 'approved_paid' || report.signatureId) {
    showToast('הדוח כבר אושר ונחתם לתשלום', 'info');
    return;
  }

  const monthStr = formatMonthYear(report.year, report.month);
  if (confirm(`האם לאשר סופית לתשלום שכר את דוח השעות של המורה ${report.teacherName || 'מורה'} (${monthStr})?`)) {
    try {
      const adminUser = currentAdmin || (typeof Auth !== 'undefined' && typeof Auth.getCurrentUser === 'function' ? Auth.getCurrentUser() : null) || { name: 'רונן ממונה מחוז מרכז', role: 'admin' };
      const approvedReport = API.adminFinalApprove(reportId, adminUser);
      showToast(`הדוח של ${report.teacherName || 'המורה'} לחודש ${monthStr} אושר סופית לתשלום! מזהה חתימה: ${approvedReport.signatureId}`, 'success', 'דוח אושר לתשלום');
      loadMasterAdminData();
    } catch (err) {
      showToast(err.message || 'שגיאה באישור הדוח', 'error');
    }
  }
}

// Global window bindings for inline HTML event handlers
window.openAddTeacherModal = openAddTeacherModal;
window.openAddSupervisorModal = openAddSupervisorModal;
window.handleAddTeacherSubmit = handleAddTeacherSubmit;
window.handleAddSupervisorSubmit = handleAddSupervisorSubmit;
window.openEditUserModal = openEditUserModal;
window.handleEditUserSubmit = handleEditUserSubmit;
window.openAdminReviewModal = openAdminReviewModal;
window.handleAdminFinalApprove = handleAdminFinalApprove;
window.quickAdminApproveReport = quickAdminApproveReport;
window.openAdminReturnModal = openAdminReturnModal;
window.handleAdminReturnConfirm = handleAdminReturnConfirm;
window.exportMasterReports = exportMasterReports;
window.loadSupervisorsList = loadSupervisorsList;
window.loadRosterUsers = loadRosterUsers;
window.loadMasterAdminData = loadMasterAdminData;
