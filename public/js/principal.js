/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Principal Approval & Review Page Controller
 */

let currentPrincipal = null;
let currentReport = null;
let availableReports = [];

document.addEventListener('DOMContentLoaded', async () => {
  await initPrincipalPage();
});

async function initPrincipalPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const reportIdParam = urlParams.get('reportId') || urlParams.get('id');

  const titleEl = document.getElementById('p-header-title');
  const schoolEl = document.getElementById('p-header-school');
  if (titleEl) titleEl.textContent = 'טוען דוח לבדיקה ואישור...';
  if (schoolEl) schoolEl.textContent = 'מאמת קישור ונתוני דוח...';

  let foundReport = null;

  // 1. Fetch targeted report directly from backend/Firestore if reportId is passed
  if (reportIdParam) {
    try {
      foundReport = await API.fetchReportById(reportIdParam);
    } catch (e) {
      console.warn('Error fetching report by ID:', e);
    }
  }

  // 2. If not found by ID, try token-based backend lookup
  if (!foundReport && token) {
    try {
      foundReport = await API.fetchReportByToken(token);
    } catch (e) {
      console.warn('Error fetching report by token:', e);
    }
  }

  // 3. If still not found, check logged in user if they are a principal
  if (!foundReport) {
    const loggedUser = Auth.getCurrentUser();
    if (loggedUser && loggedUser.role === 'principal') {
      currentPrincipal = loggedUser;
      const allReports = API.getReports();
      availableReports = allReports.filter(r => r.schoolCode === currentPrincipal.schoolCode);
      foundReport = availableReports.find(r => r.status === 'pending_principal') || availableReports[0] || null;
    }
  }

  // If NO valid report is found: SHOW ERROR STATE. DO NOT FALL BACK TO MOCK DATA!
  if (!foundReport) {
    showReportNotFoundState(reportIdParam);
    return;
  }

  currentReport = foundReport;
  API.saveReportLocally(currentReport);

  // 4. Resolve the principal context accurately based on report / token
  if (token) {
    currentPrincipal = API.getUserByToken(token);
  }
  if (!currentPrincipal || currentPrincipal.role !== 'principal') {
    if (currentReport.schoolCode) {
      const match = API.getUsers().find(u => u.role === 'principal' && u.schoolCode === currentReport.schoolCode);
      if (match) currentPrincipal = match;
    }
  }
  if (!currentPrincipal || currentPrincipal.role !== 'principal') {
    // Construct principal object directly from the report's metadata
    currentPrincipal = {
      id: 'principal_' + (currentReport.schoolCode || 'guest'),
      name: currentReport.principalName || 'מנהל/ת בית הספר',
      role: 'principal',
      schoolCode: currentReport.schoolCode || '',
      schoolName: currentReport.schoolName || '',
      email: currentReport.principalEmail || ''
    };
  }

  Auth.setCurrentUser(currentPrincipal);
  Auth.renderHeader('principal');
  Auth.renderFooter();

  // Make sure availableReports contains our current report
  const allReports = API.getReports();
  availableReports = allReports.filter(r => currentPrincipal && r.schoolCode === currentPrincipal.schoolCode);
  if (!availableReports.some(r => r.id === currentReport.id)) {
    availableReports.unshift(currentReport);
  }

  setupReportSelector();
  renderReportDetails(currentReport);
}

function showReportNotFoundState(reportId) {
  Auth.renderHeader('principal');
  Auth.renderFooter();

  const titleEl = document.getElementById('p-header-title');
  const schoolEl = document.getElementById('p-header-school');
  const actionBar = document.getElementById('p-action-bar');
  const approvedBanner = document.getElementById('p-approved-banner');
  const errorBox = document.getElementById('p-error-card');
  const contentContainer = document.getElementById('p-content-container');

  if (titleEl) titleEl.textContent = 'דוח לא נמצא או שפג תוקף הקישור';
  if (schoolEl) schoolEl.textContent = '';
  if (actionBar) actionBar.style.display = 'none';
  if (approvedBanner) approvedBanner.style.display = 'none';
  if (contentContainer) contentContainer.style.display = 'none';

  if (errorBox) {
    errorBox.style.display = 'block';
    const errText = document.getElementById('p-error-text');
    if (errText) {
      errText.textContent = reportId 
        ? `לא נמצא דוח פעילות במערכת עבור מזהה דוח: ${reportId}. ייתכן שהדוח טרם הוגש על ידי המורה או שהקישור שגוי.` 
        : 'לא צוין מזהה דוח תקין בקישור האישור.';
    }
  }
}

function setupReportSelector() {
  const selectorCard = document.getElementById('p-selector-card');
  const reportSelect = document.getElementById('p-report-select');
  if (!selectorCard || !reportSelect) return;

  if (availableReports.length > 1) {
    selectorCard.style.display = 'block';
    reportSelect.innerHTML = '';
    availableReports.forEach((r) => {
      const opt = document.createElement('option');
      opt.value = r.id;
      const monthStr = (typeof HEBREW_MONTHS_NAME !== 'undefined' && HEBREW_MONTHS_NAME[r.month - 1]) ? HEBREW_MONTHS_NAME[r.month - 1] : r.month;
      const statusLabel = (typeof REPORT_STATUSES !== 'undefined' && REPORT_STATUSES[r.status] && REPORT_STATUSES[r.status].label) || r.status;
      opt.textContent = `${r.teacherName || 'מורה'} - ${monthStr}/${r.year} (${statusLabel})`;
      if (currentReport && r.id === currentReport.id) opt.selected = true;
      reportSelect.appendChild(opt);
    });

    reportSelect.addEventListener('change', () => {
      currentReport = availableReports.find(r => r.id === reportSelect.value);
      renderReportDetails(currentReport);
    });
  } else {
    selectorCard.style.display = 'none';
  }
}

function renderReportDetails(report) {
  if (!report) return;

  const contentContainer = document.getElementById('p-content-container');
  if (contentContainer) contentContainer.style.display = 'block';

  const errorCard = document.getElementById('p-error-card');
  if (errorCard) errorCard.style.display = 'none';

  const titleEl = document.getElementById('p-header-title');
  if (titleEl) titleEl.textContent = 'אישור דוח שעות פעילות חודשי – של"ח';

  const pName = (currentPrincipal && currentPrincipal.name) || report.principalName || 'מנהל/ת בית הספר';
  const sName = report.schoolName || (currentPrincipal && currentPrincipal.schoolName) || '';
  const sCode = report.schoolCode || (currentPrincipal && currentPrincipal.schoolCode) || '';
  document.getElementById('p-header-school').textContent = `${sName} ${sCode ? `(${sCode})` : ''} • מנהל/ת: ${pName}`;

  document.getElementById('p-teacher-name').textContent = report.teacherName || '-';
  document.getElementById('p-teacher-id').textContent = report.teacherId || '-';
  
  const mName = (typeof HEBREW_MONTHS_NAME !== 'undefined' && HEBREW_MONTHS_NAME[(report.month || 1) - 1]) 
    ? HEBREW_MONTHS_NAME[(report.month || 1) - 1] 
    : report.month;
  document.getElementById('p-report-month').textContent = `${mName} ${report.year || 2026}`;

  const supName = report.supervisorName ? `${report.supervisorName} (${report.district || 'מחוז'})` : '-';
  document.getElementById('p-teacher-supervisor').textContent = supName;

  document.getElementById('p-submission-date').textContent = report.submittedAt 
    ? `תאריך הגשה: ${typeof formatDateTime === 'function' ? formatDateTime(report.submittedAt) : report.submittedAt.slice(0, 10)}` 
    : 'טרם הוגש';

  const st = (typeof REPORT_STATUSES !== 'undefined' && REPORT_STATUSES[report.status]) 
    ? REPORT_STATUSES[report.status] 
    : { label: report.status || 'ממתין', badgeClass: 'badge-draft' };
  
  const statusPill = document.getElementById('p-status-pill');
  if (statusPill) {
    statusPill.innerHTML = `
      <span class="badge ${st.badgeClass}" style="font-size: 0.9375rem; padding: 6px 14px;">
        <span class="badge-dot"></span>
        ${st.label}
      </span>
    `;
  }

  // Render Table Days
  const tbody = document.getElementById('p-report-tbody');
  if (tbody) {
    tbody.innerHTML = '';

    (report.daysData || []).forEach(day => {
      const tr = document.createElement('tr');
      const dayNum = day.dayOfMonth || day.day_number || 1;
      const vac = (typeof API !== 'undefined' && API.getMoEVacationInfo)
        ? API.getMoEVacationInfo(report.year, report.month, dayNum)
        : { isHoliday: day.isHoliday, name: day.holidayName };
      const isHoliday = vac.isHoliday || day.isHoliday;
      const holidayName = vac.name || day.holidayName;

      if (isHoliday) tr.classList.add('row-holiday');
      if (day.isFieldDay) tr.classList.add('row-field-day');

      let dayTags = '';
      if (isHoliday) {
        dayTags += `<span class="holiday-tag" title="${holidayName}">${holidayName || 'חג/חופשה'}</span>`;
      }
      if (day.isFieldDay) {
        dayTags += `<span class="field-day-tag">יום שדה</span>`;
      }

      tr.innerHTML = `
        <td style="text-align:center; font-weight:700;">${day.dayOfMonth || dayNum}</td>
        <td>
          <div style="font-weight:600;">${day.dayName || ''}</div>
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
  }

  // Totals
  const abEl = document.getElementById('p-total-absence');
  const otEl = document.getElementById('p-total-overtime');
  if (abEl) abEl.textContent = report.totalAbsenceHours || 0;
  if (otEl) otEl.textContent = report.totalOvertimeHours || 0;

  // Attachments
  const attList = document.getElementById('p-attachments-list');
  if (attList) {
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
            <span class="attachment-icon">📎</span>
            <div>
              <div class="attachment-name">${att.name || att.original_filename || 'נספח'}</div>
              <div class="attachment-size">${att.size || ''} • הועלה ב-${att.uploadDate || att.uploaded_at || ''}</div>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="showToast('הקובץ ${att.name || ''} נפתח לתצוגה', 'info')">
            פתח נספח
          </button>
        `;
        attList.appendChild(item);
      });
    }
  }

  // Approval Bar and Banner
  const actionBar = document.getElementById('p-action-bar');
  const approvedBanner = document.getElementById('p-approved-banner');

  if (report.status === 'pending_principal') {
    if (actionBar) actionBar.style.display = 'flex';
    if (approvedBanner) approvedBanner.style.display = 'none';
  } else if (report.status === 'pending_supervisor' || report.status === 'supervisor_edited' || report.status === 'approved_paid') {
    if (actionBar) actionBar.style.display = 'none';
    if (approvedBanner) {
      approvedBanner.style.display = 'block';
      const stampDetails = document.getElementById('p-stamp-details');
      const approvedDate = report.principalApprovedAt || report.principalSignedAt || new Date();
      if (stampDetails) {
        stampDetails.textContent = `אושר ע"י ${pName} בתאריך ${typeof formatDateTime === 'function' ? formatDateTime(approvedDate) : approvedDate}`;
      }
      const stampImgBox = document.getElementById('p-stamp-img-box');
      if (stampImgBox) {
        stampImgBox.innerHTML = `<span class="badge badge-success" style="font-size:0.95rem; padding:8px 16px;">✓ מאושר</span>`;
      }
    }
  } else {
    if (actionBar) actionBar.style.display = 'none';
    if (approvedBanner) approvedBanner.style.display = 'none';
  }
}

async function handlePrincipalApproval() {
  if (!currentReport) return;

  const btnApprove = document.getElementById('p-btn-approve');
  if (btnApprove) {
    btnApprove.disabled = true;
    btnApprove.innerHTML = '<div class="spinner"></div><span>מאשר את הדוח...</span>';
  }

  try {
    const updated = await API.principalApproveAsync(
      currentReport.id, 
      currentPrincipal, 
      'הדוח נבדק ותואם את מערכת השעות ותוכנית הפעילות השנתית. מאושר.'
    );
    showToast('הדוח אושר בהצלחה! הועבר לבדיקת המנחה המחוזי.', 'success');

    currentReport = updated || (await API.fetchReportById(currentReport.id));
    renderReportDetails(currentReport);
  } catch (err) {
    console.error('Principal approval error:', err);
    showToast(err.message || 'שגיאה באישור הדוח', 'error');
    if (btnApprove) {
      btnApprove.disabled = false;
      btnApprove.innerHTML = '<span>אישור הדוח</span>';
    }
  }
}

function openRejectModal() {
  const remarksEl = document.getElementById('reject-remarks');
  if (remarksEl) remarksEl.value = '';
  openModal('reject-modal');
}

async function handlePrincipalReject() {
  const remarksEl = document.getElementById('reject-remarks');
  const remarks = (remarksEl ? remarksEl.value : '').trim();
  if (!remarks) {
    showToast('נא להזין הערות והנחיות לתיקון עבור המורה', 'warning');
    return;
  }

  const btnConfirm = document.getElementById('confirm-reject-btn');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<div class="spinner"></div><span>מחזיר דוח...</span>';
  }

  try {
    const updated = await API.principalRejectAsync(currentReport.id, currentPrincipal, remarks);
    closeModal('reject-modal');
    showToast('הדוח הוחזר לתיקון המורה בצירוף ההערות.', 'info');

    currentReport = updated || (await API.fetchReportById(currentReport.id));
    renderReportDetails(currentReport);
  } catch (err) {
    console.error('Principal reject error:', err);
    showToast(err.message || 'שגיאה בהחזרת הדוח', 'error');
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '<span>החזר דוח למורה</span>';
    }
  }
}

window.addEventListener('shalah:reports-synced', () => {
  if (currentReport && currentReport.id) {
    API.fetchReportById(currentReport.id).then(r => {
      if (r) {
        currentReport = r;
        renderReportDetails(currentReport);
      }
    });
  }
});
