/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Teacher Dashboard & Monthly Report Grid Controller
 */

const absenceReasonsList = (typeof ABSENCE_REASONS !== 'undefined' ? ABSENCE_REASONS : (window.ABSENCE_REASONS || ['מחלה', 'מילואים', 'השתלמות', 'חופשה', 'אישי', 'אחר']));
const overtimeReasonsList = (typeof OVERTIME_REASONS !== 'undefined' ? OVERTIME_REASONS : (window.OVERTIME_REASONS || ['יום שדה', 'יום שדה ארוך', 'גיחה', 'מסע', 'מש"צים', 'אחר']));

let currentTeacher = null;
let currentActiveReport = null;
let autoSaveInterval = null;
// Current reporting period calculation (Rule: on the 5th of each month, the report for that month opens)
const activeReportingPeriod = (function() {
  const now = new Date();
  const cYear = now.getFullYear();
  const cMonth = now.getMonth() + 1;
  const cDay = now.getDate();
  let y = cYear;
  let m = cMonth;
  if (cDay < 5) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return { year: y, month: m };
})();

let selectedYear = activeReportingPeriod.year;
let selectedMonth = activeReportingPeriod.month;

document.addEventListener('DOMContentLoaded', () => {
  currentTeacher = Auth.requireAuth(['teacher']);
  if (!currentTeacher) return;

  Auth.renderHeader('teacher');
  Auth.renderFooter();

  populateTeacherHeader(currentTeacher);
  initMonthSelector();
  loadTeacherDashboardData();
  setupReportFormHandlers();
});

function populateTeacherHeader(teacher) {
  document.getElementById('teacher-display-name').textContent = teacher.name || 'ישראל ישראלי';
  document.getElementById('prof-disp-id').textContent = teacher.id || '';
  document.getElementById('prof-disp-school').textContent = `${teacher.schoolName || ''} (${teacher.schoolCode || ''})`;
  document.getElementById('prof-disp-district').textContent = `${teacher.district || ''} • ${teacher.municipality || ''}`;
  document.getElementById('prof-disp-supervisor').textContent = teacher.supervisorName || 'דוד לוי';
  document.getElementById('prof-disp-principal').textContent = teacher.principalName || 'רונית שחר';
  document.getElementById('prof-disp-scope').textContent = `${teacher.jobScope || 100}%`;
}

function initMonthSelector() {
  const select = document.getElementById('select-report-month');
  if (!select) return;
  select.innerHTML = '';

  const options = (typeof getAvailableReportingMonths === 'function')
    ? getAvailableReportingMonths()
    : ((window.API && API.getAvailableMonths) ? API.getAvailableMonths() : []);

  // If teacher already has existing reports in any earlier/other month, ensure it is available in the dropdown
  try {
    const existingReports = (currentTeacher && typeof API !== 'undefined' && API.getReports)
      ? API.getReports({ teacherId: currentTeacher.id })
      : [];
    existingReports.forEach(r => {
      const y = Number(r.year);
      const m = Number(r.month);
      if (!isNaN(y) && !isNaN(m) && !options.some(opt => opt.year === y && opt.month === m)) {
        const mName = (typeof HEBREW_MONTHS_NAME !== 'undefined' ? HEBREW_MONTHS_NAME[m - 1] : m);
        options.push({
          year: y,
          month: m,
          label: `${mName} ${y}`,
          isCurrent: false
        });
      }
    });
  } catch (err) {
    console.warn('Could not inspect existing reports for month selector:', err);
  }

  // Sort descending: latest month on top
  options.sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));

  options.forEach((opt, idx) => {
    const el = document.createElement('option');
    el.value = `${opt.year}-${opt.month}`;
    el.textContent = opt.label;
    if (idx === 0) {
      el.selected = true;
      selectedYear = opt.year;
      selectedMonth = opt.month;
    }
    select.appendChild(el);
  });

  select.addEventListener('change', () => {
    const [y, m] = select.value.split('-');
    selectedYear = parseInt(y, 10);
    selectedMonth = parseInt(m, 10);
    loadTeacherDashboardData();
  });
}

function loadTeacherDashboardData() {
  const reports = API.getReports({ teacherId: currentTeacher.id });
  renderHistoryTable(reports);
  renderActiveMonthStatus(reports);
  renderFeedbackBanner(reports);
}

function renderActiveMonthStatus(reports) {
  const currentMonthReport = reports.find(r => Number(r.year) === selectedYear && Number(r.month) === selectedMonth);
  const pillContainer = document.getElementById('current-month-status-pill');
  const btnOpen = document.getElementById('btn-open-report-form');

  const activeReportsEl = document.getElementById('stat-active-reports');
  if (activeReportsEl) {
    activeReportsEl.textContent = reports.length;
  }

  if (currentMonthReport) {
    const st = REPORT_STATUSES[currentMonthReport.status] || { label: currentMonthReport.status, badgeClass: 'badge-draft' };
    pillContainer.innerHTML = `<span class="badge ${st.badgeClass}"><span class="badge-dot"></span> סטטוס לחודש זה: ${st.label}</span>`;
    btnOpen.innerHTML = currentMonthReport.status === 'draft' || currentMonthReport.status === 'returned'
      ? '<span>✏️ המשך עריכת דוח שעות</span>'
      : '<span>👁️ צפייה בדוח שעות שהוגש</span>';

    // Delete draft button in month selector bar
    const btnDeleteMonthDraft = document.getElementById('btn-delete-selected-month-draft');
    if (btnDeleteMonthDraft) {
      if (currentMonthReport.status === 'draft') {
        btnDeleteMonthDraft.style.display = 'inline-flex';
        btnDeleteMonthDraft.onclick = () => promptDeleteDraft(currentMonthReport.id);
      } else {
        btnDeleteMonthDraft.style.display = 'none';
      }
    }

    // Principal backup link button in month selector bar
    const btnSharePrincipalLink = document.getElementById('btn-share-principal-link');
    if (btnSharePrincipalLink) {
      if (currentMonthReport.status === 'pending_principal') {
        btnSharePrincipalLink.style.display = 'inline-flex';
        btnSharePrincipalLink.onclick = () => openPrincipalEmailDispatchModal(currentMonthReport);
      } else {
        btnSharePrincipalLink.style.display = 'none';
      }
    }

    // Stats
    const otEl = document.getElementById('stat-overtime-hours');
    const abEl = document.getElementById('stat-absence-hours');
    if (otEl) otEl.textContent = currentMonthReport.totalOvertimeHours || 0;
    if (abEl) abEl.textContent = currentMonthReport.totalAbsenceHours || 0;
  } else {
    pillContainer.innerHTML = `<span class="badge badge-draft"><span class="badge-dot"></span> טרם נפתח דיווח לחודש זה</span>`;
    btnOpen.innerHTML = '<span>➕ פתיחת דוח שעות חדש</span>';

    const btnDeleteMonthDraft = document.getElementById('btn-delete-selected-month-draft');
    if (btnDeleteMonthDraft) {
      btnDeleteMonthDraft.style.display = 'none';
    }

    const btnSharePrincipalLink = document.getElementById('btn-share-principal-link');
    if (btnSharePrincipalLink) {
      btnSharePrincipalLink.style.display = 'none';
    }

    const otEl = document.getElementById('stat-overtime-hours');
    const abEl = document.getElementById('stat-absence-hours');
    if (otEl) otEl.textContent = '-';
    if (abEl) abEl.textContent = '-';
  }
}

function renderFeedbackBanner(reports) {
  const feedbackContainer = document.getElementById('teacher-feedback-container');
  feedbackContainer.innerHTML = '';

  const returnedReport = reports.find(r => r.status === 'returned');
  const editedReport = reports.find(r => r.status === 'supervisor_edited');
  const pendingPrincipalReport = reports.find(r => r.status === 'pending_principal');

  if (pendingPrincipalReport) {
    const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || pendingPrincipalReport.principalEmail || 'shalah.system.reports@gmail.com';
    const monthName = HEBREW_MONTHS_NAME[pendingPrincipalReport.month - 1] || pendingPrincipalReport.month;
    feedbackContainer.innerHTML += `
      <div class="banner-alert banner-info animate-fade-in mb-2">
        <div class="banner-alert-icon">📧</div>
        <div class="banner-alert-content">
          <div class="banner-alert-title">דוח שעות חודש ${monthName} ${pendingPrincipalReport.year} ממתין לאישור מנהל/ת בית הספר:</div>
          <div>הדוח ננעל והודעת אישור עם קישור ישיר נשלחה אוטומטית למייל המנהל/ת (<strong>${principalEmail}</strong>) באמצעות Firebase Email Extension.</div>
        </div>
      </div>
    `;
  }

  if (returnedReport) {
    const remark = returnedReport.supervisorRemarks || returnedReport.principalRemarks || 'נא לבדוק את פירוט השעות ולתקן בהתאם.';
    feedbackContainer.innerHTML += `
      <div class="banner-alert banner-danger animate-fade-in">
        <div class="banner-alert-icon">⚠️</div>
        <div class="banner-alert-content">
          <div class="banner-alert-title">דוח חודש ${returnedReport.month}/${returnedReport.year} הוחזר לתיקונך:</div>
          <div><strong>הערות הבודק:</strong> "${remark}"</div>
          <button class="btn btn-danger btn-sm mt-1" onclick="openReportModal(${returnedReport.year}, ${returnedReport.month})">
            פתח דוח לתיקון מיידי ↩️
          </button>
        </div>
      </div>
    `;
  }

  if (editedReport) {
    feedbackContainer.innerHTML += `
      <div class="banner-alert banner-warning animate-fade-in">
        <div class="banner-alert-icon">ℹ️</div>
        <div class="banner-alert-content">
          <div class="banner-alert-title">שים לב: המנחה המחוזי ביצע שינויים ישירים בדוח חודש ${editedReport.month}/${editedReport.year}:</div>
          <div><strong>הערת מנחה:</strong> ${editedReport.supervisorRemarks || 'עודכנו שעות שדה בהתאם לתקן.'}</div>
          <div class="mt-1">
            <button class="btn btn-secondary btn-sm" onclick="openReportModal(${editedReport.year}, ${editedReport.month})">
              צפה בשינויים המסומנים באדום 🔍
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

function renderHistoryTable(reports) {
  const tbody = document.getElementById('history-reports-tbody');
  tbody.innerHTML = '';

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-3">טרם הוגשו דוחות שעות</td></tr>`;
    return;
  }

  // Sort by year and month descending
  const sorted = [...reports].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  sorted.forEach(r => {
    const tr = document.createElement('tr');
    const st = REPORT_STATUSES[r.status] || { label: r.status, badgeClass: 'badge-draft' };

    let sigCell = '<span class="text-muted">—</span>';
    const sig = r.signatureId || r.digitalSignatureId;
    if (sig) {
      sigCell = `<a href="verify.html?sig=${encodeURIComponent(sig)}" target="_blank" class="signature-badge" title="לחץ לאימות תעודה דיגיטלית">
        <span>🛡️</span>
        <span>${sig}</span>
      </a>`;
    }

    let remarksCell = '<span class="text-muted">—</span>';
    if (r.supervisorRemarks) {
      remarksCell = `<span class="badge badge-warning" title="${r.supervisorRemarks}">הערת מנחה</span>`;
    } else if (r.principalRemarks) {
      remarksCell = `<span class="badge badge-warning" title="${r.principalRemarks}">הערת מנהל/ת</span>`;
    }

    const isSupervisorApproved = API.isReportSupervisorApproved(r);

    const isApproved = API.isReportSupervisorApproved(r);
    const canDelete = r.status === 'draft';
    const isPendingPrincipal = r.status === 'pending_principal';
    const actionButtons = `
      <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="openReportModal(${r.year}, ${r.month})">
          ${r.status === 'draft' || r.status === 'returned' ? '✏️ עריכה' : '👁️ צפייה'}
        </button>
        ${isPendingPrincipal ? `
          <button class="btn btn-outline-primary btn-sm" onclick="openPrincipalEmailDispatchModalById('${r.id}')" title="העתקת קישור ישיר למנהל/ת כגיבוי">
            <span>🔗 קישור למנהל</span>
          </button>
        ` : ''}
        ${canDelete ? `
          <button class="btn btn-outline-danger btn-sm" onclick="promptDeleteDraft('${r.id}')" title="מחיקת טיוטת דוח לצמיתות">
            <span>🗑️ מחיקה</span>
          </button>
        ` : ''}
        ${isApproved ? `
          <button class="btn btn-outline-primary btn-sm" onclick="downloadReportPDF('${r.id}')" title="הורדת דוח מאושר בקובץ PDF">
            <span>📄 PDF</span>
          </button>
        ` : ''}
      </div>
    `;

    tr.innerHTML = `
      <td><strong>${HEBREW_MONTHS_NAME[r.month - 1] || r.month} ${r.year}</strong></td>
      <td><span class="badge ${st.badgeClass}"><span class="badge-dot"></span> ${st.label}</span></td>
      <td>${r.submittedAt ? r.submittedAt.slice(0, 10) : '<span class="text-muted">טיוטה</span>'}</td>
      <td><strong style="color:var(--primary); font-size:1.05rem;">${r.totalOvertimeHours || 0} שעות</strong></td>
      <td>${r.totalAbsenceHours || 0} שעות</td>
      <td>${sigCell}</td>
      <td>${remarksCell}</td>
      <td style="text-align: center;">
        ${actionButtons}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// Monthly Report Grid & Modal Logic
// ==========================================================================
function setupReportFormHandlers() {
  document.getElementById('btn-open-report-form').addEventListener('click', () => {
    openReportModal(selectedYear, selectedMonth);
  });

  document.getElementById('btn-save-draft').addEventListener('click', () => {
    saveCurrentReportDraft(true);
  });

  document.getElementById('btn-submit-report').addEventListener('click', () => {
    submitCurrentReport();
  });

  // Setup file upload simulation
  const fileInput = document.getElementById('file-upload-input');
  fileInput.addEventListener('change', (e) => {
    handleFileUpload(e.target.files);
  });
}

function checkReportSubmissionEligibility(year, month, checkDate = new Date()) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const currentYear = checkDate.getFullYear();
  const currentMonth = checkDate.getMonth() + 1;
  const currentDay = checkDate.getDate();

  let latestYear = currentYear;
  let latestMonth = currentMonth;
  if (currentDay < 5) {
    latestMonth -= 1;
    if (latestMonth < 1) {
      latestMonth = 12;
      latestYear -= 1;
    }
  }

  if (y > latestYear || (y === latestYear && m > latestMonth)) {
    const mName = (typeof HEBREW_MONTHS_NAME !== 'undefined' ? HEBREW_MONTHS_NAME[m - 1] : m);
    return {
      allowed: false,
      reason: `חודש ${mName} ${y} טרם נפתח למילוי. הדיווח לכל חודש נפתח ב-5 לאותו חודש.`
    };
  }

  return { allowed: true };
}

function openReportModal(year, month) {
  selectedYear = year;
  selectedMonth = month;

  const existingReport = API.getReports({ teacherId: currentTeacher.id, year, month })[0];

  if (existingReport) {
    currentActiveReport = JSON.parse(JSON.stringify(existingReport));
  } else {
    // Generate new draft
    const generatedDays = generateSampleDaysData(
      year,
      month,
      currentTeacher.weeklySchedule || { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
      currentTeacher.fieldDays || [2, 4],
      [],
      currentTeacher.scheduleNotes || {}
    );

    currentActiveReport = {
      id: null,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.name,
      schoolName: currentTeacher.schoolName,
      schoolCode: currentTeacher.schoolCode,
      district: currentTeacher.district,
      municipality: currentTeacher.municipality,
      supervisorName: currentTeacher.supervisorName,
      principalName: currentTeacher.principalName,
      principalEmail: currentTeacher.principalEmail || currentTeacher.principal_email || '',
      principalToken: currentTeacher.principalToken || (currentTeacher.schoolCode ? 'PRINCIPAL_TOKEN_' + currentTeacher.schoolCode : 'PRINCIPAL_TOKEN_SCHOOL'),
      year: year,
      month: month,
      status: 'draft',
      daysData: generatedDays,
      attachments: []
    };
  }

  document.getElementById('report-modal-title').textContent = `דוח שעות פעילות של"ח – ${HEBREW_MONTHS_NAME[month - 1]} ${year}`;

  const isReadOnly = currentActiveReport.status !== 'draft' && currentActiveReport.status !== 'returned';

  // Modal remarks banner
  const remarksBanner = document.getElementById('modal-remarks-banner');
  if (currentActiveReport.supervisorRemarks || currentActiveReport.principalRemarks) {
    remarksBanner.style.display = 'block';
    remarksBanner.className = 'report-remarks-card';
    remarksBanner.innerHTML = `
      <div style="font-weight:700; color:#856404; margin-bottom:4px;">הערות מגורם מאשר:</div>
      <div>${currentActiveReport.supervisorRemarks || currentActiveReport.principalRemarks}</div>
    `;
  } else {
    remarksBanner.style.display = 'none';
  }

  // Buttons state
  const btnSaveDraft = document.getElementById('btn-save-draft');
  const btnSubmit = document.getElementById('btn-submit-report');
  const btnModalPdf = document.getElementById('btn-download-modal-pdf');
  const submissionNoteEl = document.getElementById('submission-eligibility-note');

  const eligibility = checkReportSubmissionEligibility(year, month);

  if (isReadOnly) {
    btnSaveDraft.style.display = 'none';
    btnSubmit.style.display = 'none';
    if (submissionNoteEl) submissionNoteEl.style.display = 'none';
  } else {
    btnSaveDraft.style.display = 'inline-flex';
    btnSubmit.style.display = 'inline-flex';

    if (submissionNoteEl) {
      if (!eligibility.allowed) {
        submissionNoteEl.style.display = 'block';
        submissionNoteEl.innerHTML = `ℹ️ <strong>שימו לב:</strong> ${eligibility.reason}`;
        btnSubmit.title = eligibility.reason;
      } else {
        submissionNoteEl.style.display = 'none';
        btnSubmit.removeAttribute('title');
      }
    }
  }

  // Show PDF download button in modal if report is approved by supervisor
  if (btnModalPdf) {
    const isApproved = API.isReportSupervisorApproved(currentActiveReport);
    if (isApproved && currentActiveReport.id) {
      btnModalPdf.style.display = 'inline-flex';
      btnModalPdf.onclick = () => downloadReportPDF(currentActiveReport.id);
    } else {
      btnModalPdf.style.display = 'none';
    }
  }

  // Show delete draft button only when report is in draft status
  const btnDeleteModalDraft = document.getElementById('btn-delete-modal-draft');
  if (btnDeleteModalDraft) {
    if (currentActiveReport && currentActiveReport.status === 'draft') {
      btnDeleteModalDraft.style.display = 'inline-flex';
    } else {
      btnDeleteModalDraft.style.display = 'none';
    }
  }

  // Show principal backup link button in modal if report is pending principal approval
  const btnModalShareLink = document.getElementById('btn-modal-share-principal-link');
  if (btnModalShareLink) {
    if (currentActiveReport && currentActiveReport.status === 'pending_principal') {
      btnModalShareLink.style.display = 'inline-flex';
      btnModalShareLink.onclick = () => openPrincipalEmailDispatchModal(currentActiveReport);
    } else {
      btnModalShareLink.style.display = 'none';
    }
  }

  renderReportGrid(currentActiveReport, isReadOnly);
  renderAttachmentsList(currentActiveReport, isReadOnly);
  calculateGridTotals();

  // Start 30s auto-save timer
  clearInterval(autoSaveInterval);
  if (!isReadOnly) {
    autoSaveInterval = setInterval(() => {
      saveCurrentReportDraft(false);
    }, 30000);
  }

  openModal('monthly-report-modal');
}

function isDailyHoursExceeded(day) {
  if (!day) return false;
  const fixed = parseFloat(day.fixedHours || 0);
  const overtime = parseFloat(day.overtimeHours || 0);
  const reason = (day.overtimeReason || '').trim();
  const total = fixed + overtime;

  // סייג לכלל זה: אם נבחר בסיבת שעות נוספות "גיחה" או "מסע" או "יום שדה ארוך", סף השעות הוא 14 (התראה מעל 14)
  if (reason === 'גיחה' || reason === 'מסע' || reason === 'יום שדה ארוך') {
    return total > 14;
  }

  // עבור יתר הסיבות, סף השעות הוא 10
  return total > 10;
}

function updateDayThresholdWarning(idx) {
  const rep = currentActiveReport || (typeof window !== 'undefined' ? window.currentActiveReport : null);
  if (!rep || !rep.daysData || !rep.daysData[idx]) return;
  const day = rep.daysData[idx];
  const isExceeded = isDailyHoursExceeded(day);

  const row = document.querySelector(`#report-grid-tbody tr[data-day-idx="${idx}"]`);
  if (!row) return;

  const inputOt = row.querySelector('.input-overtime');
  const existingNotice = row.querySelector('.hours-exceeded-badge');

  if (isExceeded) {
    if (inputOt) inputOt.classList.add('cell-overtime-exceeded');
    if (!existingNotice) {
      const cell = inputOt ? inputOt.parentElement : null;
      if (cell) {
        const thresholdLimit = (day.overtimeReason === 'גיחה' || day.overtimeReason === 'מסע') ? '14' : '10';
        const badge = document.createElement('div');
        badge.className = 'hours-exceeded-badge';
        badge.innerHTML = `⚠️ חריגה מעל ${thresholdLimit} ש'`;
        cell.appendChild(badge);
      }
    }
  } else {
    if (inputOt) inputOt.classList.remove('cell-overtime-exceeded');
    if (existingNotice) existingNotice.remove();
  }
}

function renderReportGrid(report, isReadOnly) {
  const tbody = document.getElementById('report-grid-tbody');
  tbody.innerHTML = '';

  report.daysData.forEach((day, idx) => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-day-idx', idx);
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
      dayTags += `<span class="holiday-tag" title="${holidayName}">🌿 ${holidayName || 'חג/חופשה'}</span>`;
    }
    if (day.isFieldDay) {
      dayTags += `<span class="field-day-tag">🌾 יום שדה</span>`;
    }

    const fixed = parseFloat(day.fixedHours || 0);
    const overtime = parseFloat(day.overtimeHours || 0);
    const reason = (day.overtimeReason || '').trim();
    const isExceeded = (reason === 'גיחה' || reason === 'מסע' || reason === 'יום שדה ארוך') ? (fixed + overtime > 14) : (fixed + overtime > 10);
    const thresholdLimit = (reason === 'גיחה' || reason === 'מסע' || reason === 'יום שדה ארוך') ? '14' : '10';

    tr.innerHTML = `
      <td style="text-align:center; font-weight:700;">${day.dayOfMonth}</td>
      <td>
        <div style="font-weight:600;">${day.dayName}</div>
        <div>${dayTags}</div>
      </td>
      <td style="text-align:center;">
        <input 
          type="text" 
          class="cell-input cell-readonly" 
          value="${day.fixedHours || 0}" 
          readonly 
          title="שעות קבועות ממערכת השעות השבועית"
        >
      </td>
      <td>
        <input 
          type="number" 
          step="0.5" 
          min="0" 
          max="24"
          class="cell-input input-absence" 
          data-day-idx="${idx}"
          value="${day.absenceHours || ''}" 
          placeholder="0"
          ${isReadOnly ? 'disabled' : ''}
        >
      </td>
      <td>
        <select 
          class="cell-input select-absence-reason" 
          data-day-idx="${idx}"
          ${isReadOnly ? 'disabled' : ''}
        >
          <option value="">-- בחר סיבה --</option>
          ${absenceReasonsList.map(r => `<option value="${r}" ${day.absenceReason === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="position:relative;">
          <input 
            type="number" 
            step="1" 
            min="0" 
            max="24" 
            class="cell-input input-overtime ${isExceeded ? 'cell-overtime-exceeded' : ''}" 
            data-day-idx="${idx}" 
            value="${day.overtimeHours !== undefined && day.overtimeHours !== null && day.overtimeHours !== '' ? Math.round(day.overtimeHours) : ''}" 
            placeholder="0" 
            ${isReadOnly ? 'disabled' : ''}
          >
          ${isExceeded ? `<div class="hours-exceeded-badge">⚠️ חריגה מעל ${thresholdLimit} ש'</div>` : ''}
        </div>
      </td>
      <td>
        <select 
            class="cell-input select-overtime-reason" 
            data-day-idx="${idx}"
            ${isReadOnly ? 'disabled' : ''}
        >
          <option value="">-- בחר סיבה --</option>
          ${overtimeReasonsList.map(r => `<option value="${r}" ${day.overtimeReason === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </td>
      <td>
        <input 
          type="text" 
          class="cell-input input-grade-class" 
          data-day-idx="${idx}"
          value="${day.gradeClass || ''}" 
          placeholder="לדוגמה: י'2"
          ${isReadOnly ? 'disabled' : ''}
        >
      </td>
      <td>
        <input 
          type="text" 
          class="cell-input input-description" 
          data-day-idx="${idx}"
          value="${day.description || ''}" 
          placeholder="פירוט הפעילות..."
          ${isReadOnly ? 'disabled' : ''}
        >
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach live calculation events
  if (!isReadOnly) {
    const inputs = tbody.querySelectorAll('input, select');
    inputs.forEach(input => {
      const handleLiveChange = (e) => {
        const el = e.target;
        const dayIdx = parseInt(el.getAttribute('data-day-idx'), 10);
        if (isNaN(dayIdx)) return;

        if (el.classList.contains('input-absence')) {
          currentActiveReport.daysData[dayIdx].absenceHours = parseFloat(el.value) || 0;
        } else if (el.classList.contains('select-absence-reason')) {
          currentActiveReport.daysData[dayIdx].absenceReason = el.value;
        } else if (el.classList.contains('input-overtime')) {
          // Rule: Only whole hours allowed, no half hours
          let raw = el.value.replace(/[^\d]/g, '');
          if (raw !== el.value) {
            el.value = raw;
          }
          const intVal = raw !== '' ? parseInt(raw, 10) : 0;
          currentActiveReport.daysData[dayIdx].overtimeHours = intVal;
          updateDayThresholdWarning(dayIdx);
        } else if (el.classList.contains('select-overtime-reason')) {
          currentActiveReport.daysData[dayIdx].overtimeReason = el.value;
          updateDayThresholdWarning(dayIdx);
        } else if (el.classList.contains('input-grade-class')) {
          currentActiveReport.daysData[dayIdx].gradeClass = el.value;
        } else if (el.classList.contains('input-description')) {
          currentActiveReport.daysData[dayIdx].description = el.value;
        }

        calculateGridTotals();
      };

      input.addEventListener('input', handleLiveChange);
      if (input.classList.contains('input-overtime')) {
        // Prevent typing decimal point or comma
        input.addEventListener('keydown', (e) => {
          if (e.key === '.' || e.key === ',') {
            e.preventDefault();
          }
        });
        input.addEventListener('change', (e) => {
          let val = Math.round(parseFloat(e.target.value) || 0);
          if (val < 0) val = 0;
          e.target.value = val > 0 ? val : (e.target.value === '0' ? '0' : '');
          currentActiveReport.daysData[dayIdx].overtimeHours = val;
          calculateGridTotals();
        });
      }
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', handleLiveChange);
      }
    });
  }
}

function calculateGridTotals() {
  let totalAbsence = 0;
  let totalOvertime = 0;

  if (currentActiveReport && currentActiveReport.daysData) {
    currentActiveReport.daysData.forEach(d => {
      totalAbsence += parseFloat(d.absenceHours || 0);
      totalOvertime += Math.round(parseFloat(d.overtimeHours || 0));
    });
  }

  const abEl = document.getElementById('grid-total-absence');
  const otEl = document.getElementById('grid-total-overtime');
  if (abEl) abEl.textContent = totalAbsence.toFixed(1).replace('.0', '');
  if (otEl) otEl.textContent = String(Math.round(totalOvertime));
}

function handleFileUpload(files) {
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size > 10 * 1024 * 1024) {
      showToast(`הקובץ ${file.name} חורג ממגבלת 10MB`, 'error');
      continue;
    }

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    currentActiveReport.attachments = currentActiveReport.attachments || [];
    currentActiveReport.attachments.push({
      name: file.name,
      size: sizeStr,
      type: file.type || 'application/pdf',
      uploadDate: new Date().toISOString().slice(0, 10)
    });
  }

  renderAttachmentsList(currentActiveReport, false);
  showToast('הקבצים צורפו בהצלחה לדוח', 'success');
}

function renderAttachmentsList(report, isReadOnly) {
  const container = document.getElementById('report-attachments-list');
  container.innerHTML = '';

  const attachments = report.attachments || [];
  if (attachments.length === 0) {
    container.innerHTML = `<span class="text-muted" style="font-size:0.8125rem;">לא צורפו נספחים לדוח זה</span>`;
    return;
  }

  attachments.forEach((att, idx) => {
    const item = document.createElement('div');
    item.className = 'attachment-item';
    item.innerHTML = `
      <div class="attachment-info">
        <span class="attachment-icon">📁</span>
        <div>
          <div class="attachment-name">${att.name}</div>
          <div class="attachment-size">${att.size} • הועלה ב-${att.uploadDate}</div>
        </div>
      </div>
      ${!isReadOnly ? `
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeAttachment(${idx})">
          הסר
        </button>
      ` : `
        <span class="badge badge-approved">צורף</span>
      `}
    `;
    container.appendChild(item);
  });
}

function removeAttachment(index) {
  if (currentActiveReport && currentActiveReport.attachments) {
    currentActiveReport.attachments.splice(index, 1);
    renderAttachmentsList(currentActiveReport, false);
  }
}

function saveCurrentReportDraft(showFeedback = true) {
  if (!currentActiveReport) return;

  // Enforce integer whole hours for overtime
  if (currentActiveReport.daysData) {
    currentActiveReport.daysData.forEach(d => {
      d.overtimeHours = d.overtimeHours !== undefined && d.overtimeHours !== null && d.overtimeHours !== ''
        ? Math.round(Number(d.overtimeHours) || 0)
        : 0;
    });
  }

  const saved = API.saveReport(currentActiveReport);
  currentActiveReport.id = saved.id;

  const autoSaveText = document.getElementById('auto-save-text');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  autoSaveText.textContent = `נשמר אוטומטית ב-${timeStr}`;

  if (showFeedback) {
    showToast('טיוטת הדוח נשמרה בהצלחה!', 'info');
    loadTeacherDashboardData();
  }
}

function submitCurrentReport() {
  if (currentActiveReport && currentActiveReport.year && currentActiveReport.month) {
    const elig = checkReportSubmissionEligibility(currentActiveReport.year, currentActiveReport.month);
    if (!elig.allowed) {
      showToast(elig.reason, 'error');
      return;
    }
  }

  // Enforce integer whole hours for overtime
  if (currentActiveReport && currentActiveReport.daysData) {
    currentActiveReport.daysData.forEach(d => {
      d.overtimeHours = d.overtimeHours !== undefined && d.overtimeHours !== null && d.overtimeHours !== ''
        ? Math.round(Number(d.overtimeHours) || 0)
        : 0;
    });
  }

  const declaration = document.getElementById('report-submit-declaration');
  if (declaration && !declaration.checked) {
    showToast('חובה לאשר את הצהרת הנכונות לפני הגשת הדוח', 'warning');
    return;
  }

  // PRD Business Rule 5.2: Flexible Field Day rule warning
  if (currentActiveReport && currentActiveReport.daysData) {
    const missingFieldDayReports = currentActiveReport.daysData.filter(d => d.isFieldDay && (!d.overtimeHours || d.overtimeHours === 0) && !d.description);
    if (missingFieldDayReports.length > 0) {
      const confirmSubmit = confirm(`לתשומת לבך: סומנו ${missingFieldDayReports.length} ימי שדה קבועים ללא דיווח שעות נוספות או פירוט פעילות. האם להגיש את הדוח בכל זאת?`);
      if (!confirmSubmit) return;
    }
  }

  const submitBtn = document.getElementById('btn-submit-report');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div><span>מגיש דוח ושולח מייל למנהל/ת...</span>';
  }

  // Save report and submit to principal
  setTimeout(async () => {
    try {
      const saved = API.saveReport(currentActiveReport);
      const submittedReport = API.submitReportToPrincipal(saved.id, currentTeacher) || saved;

      clearInterval(autoSaveInterval);
      closeModal('monthly-report-modal');
      loadTeacherDashboardData();

      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 
                             submittedReport.principalEmail || 
                             'shalah.system.reports@gmail.com';
      
      // Automatically send email notification to principal via Firebase Email Extension
      await API.sendAutomaticPrincipalEmail(submittedReport, currentTeacher);

      showToast(`הדוח ננעל והוגש בהצלחה! קישור לאישור הדוח נשלח אוטומטית למייל המנהל/ת (${principalEmail})`, 'success');

      // Open principal review backup link modal
      openPrincipalEmailDispatchModal(submittedReport);
    } catch (err) {
      showToast(err.message || 'שגיאה בעת הגשת הדוח', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🚀 הגשת דוח לאישור מנהל/ת</span>';
      }
    }
  }, 600);
}

function downloadReportPDF(reportId) {
  const report = API.getReportById(reportId);
  if (!report) {
    showToast('דוח לא נמצא במערכת', 'error');
    return;
  }
  API.exportReportToPDF(report);
}

// ==========================================================================
// Principal Review Link Generation & Backup Dispatch
// ==========================================================================
let currentDispatchReport = null;
let currentDispatchUrl = '';

function openPrincipalEmailDispatchModal(report) {
  if (!report) return;
  currentDispatchReport = report;

  const teacher = (typeof currentTeacher !== 'undefined' && currentTeacher) ? currentTeacher : (typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null);
  const reviewUrl = API.getPrincipalReviewUrl(report, teacher);
  currentDispatchUrl = reviewUrl;

  const urlInput = document.getElementById('dispatch-review-url-input');
  if (urlInput) {
    urlInput.value = reviewUrl;
  }

  const pEmail = (teacher && (teacher.principalEmail || teacher.principal_email)) || 
                 report.principalEmail || 
                 report.principal_email || 
                 'כתובת המייל המוגדרת במערכת';
                 
  const noticeEl = document.getElementById('dispatch-modal-email-notice');
  if (noticeEl) {
    noticeEl.innerHTML = `נשלחה הודעת דוא"ל עם קישור ישיר לאישור וחתימה אל תיבת המנהל/ת (<strong>${pEmail}</strong>).`;
  }

  const infoEl = document.getElementById('dispatch-modal-report-info');
  if (infoEl) {
    const monthName = HEBREW_MONTHS_NAME[(report.month || 1) - 1] || report.month;
    infoEl.textContent = `דוח חודש ${monthName} ${report.year || ''}`;
  }

  // Reset copy button state
  const copyBtnText = document.getElementById('btn-copy-dispatch-text');
  if (copyBtnText) {
    copyBtnText.textContent = '📋 העתק קישור';
  }
  const copyBtn = document.getElementById('btn-copy-dispatch-url');
  if (copyBtn) {
    copyBtn.className = 'btn btn-primary';
  }

  openModal('modal-principal-email-dispatch');
}

function openPrincipalEmailDispatchModalById(reportId) {
  let rep = API.getReportById(reportId);
  if (!rep && currentActiveReport && currentActiveReport.id === reportId) {
    rep = currentActiveReport;
  }
  if (!rep) {
    showToast('דוח לא נמצא במערכת', 'error');
    return;
  }
  openPrincipalEmailDispatchModal(rep);
}

async function copyDispatchReviewUrl(urlToCopy) {
  const text = urlToCopy || currentDispatchUrl || (document.getElementById('dispatch-review-url-input') ? document.getElementById('dispatch-review-url-input').value : '');
  if (!text) {
    showToast('לא נמצא קישור להעתקה', 'warning');
    return;
  }

  let copied = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed, trying execCommand fallback:', err);
  }

  if (!copied) {
    try {
      const urlInput = document.getElementById('dispatch-review-url-input');
      if (urlInput) {
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        copied = document.execCommand('copy');
      }
    } catch (e) {
      console.warn('execCommand copy fallback failed:', e);
    }
  }

  if (copied) {
    const copyBtnText = document.getElementById('btn-copy-dispatch-text');
    if (copyBtnText) {
      copyBtnText.textContent = '✅ הקישור הועתק!';
    }
    const copyBtn = document.getElementById('btn-copy-dispatch-url');
    if (copyBtn) {
      copyBtn.className = 'btn btn-success';
      setTimeout(() => {
        if (copyBtnText) copyBtnText.textContent = '📋 העתק קישור';
        if (copyBtn) copyBtn.className = 'btn btn-primary';
      }, 3000);
    }
    showToast('קישור חתימת המנהל/ת הועתק ללוח בהצלחה!', 'success');
  } else {
    const urlInput = document.getElementById('dispatch-review-url-input');
    if (urlInput) {
      urlInput.select();
    }
    showToast('הקישור סומן - לחץ Ctrl+C להעתקה', 'info');
  }
}

function sendDispatchWhatsApp() {
  if (!currentDispatchUrl) return;
  const report = currentDispatchReport;
  const teacher = (typeof currentTeacher !== 'undefined' && currentTeacher) ? currentTeacher : (typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null);
  const teacherName = (teacher && teacher.name) || (report && report.teacherName) || 'מורה של"ח';
  const monthName = report ? (HEBREW_MONTHS_NAME[(report.month || 1) - 1] || report.month) : '';
  const year = report ? (report.year || '') : '';
  const principalName = (teacher && teacher.principalName) || (report && report.principalName) || 'מנהל/ת בית הספר';

  const message = `שלום ${principalName},
מוגש לאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש ${monthName} ${year} מאת ${teacherName}.
קישור ישיר לצפייה, הערות ואישור בחתימה דיגיטלית:
${currentDispatchUrl}`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

function openDispatchMailClient() {
  if (!currentDispatchUrl) return;
  const report = currentDispatchReport;
  const teacher = (typeof currentTeacher !== 'undefined' && currentTeacher) ? currentTeacher : (typeof Auth !== 'undefined' ? Auth.getCurrentUser() : null);
  const teacherName = (teacher && teacher.name) || (report && report.teacherName) || 'מורה של"ח';
  const monthName = report ? (HEBREW_MONTHS_NAME[(report.month || 1) - 1] || report.month) : '';
  const year = report ? (report.year || '') : '';
  const principalEmail = (teacher && (teacher.principalEmail || teacher.principal_email)) || (report && (report.principalEmail || report.principal_email)) || '';

  const subject = `אישור דוח שעות פעילות של"ח – ${teacherName} – חודש ${monthName} ${year}`;
  const body = `שלום,

מוגש לאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש ${monthName} ${year} מאת המורה ${teacherName}.

לכניסה ישירה לדוח, הוספת הערות וחתימה על הדוח:
${currentDispatchUrl}

בברכה,
${teacherName}`;

  const mailtoUrl = `mailto:${encodeURIComponent(principalEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

// ==========================================================================
// Draft Deletion Logic (Only allowed in 'draft' status)
// ==========================================================================
let pendingDeleteDraftId = null;

function promptDeleteDraft(reportId) {
  const report = API.getReportById(reportId);
  if (!report) {
    showToast('דוח לא נמצא במערכת', 'error');
    return;
  }
  if (report.status !== 'draft') {
    showToast('ניתן למחוק דוח אך ורק כאשר הוא במצב טיוטה', 'warning');
    return;
  }

  pendingDeleteDraftId = reportId;
  const monthName = HEBREW_MONTHS_NAME[report.month - 1] || report.month;
  const confirmTextEl = document.getElementById('delete-draft-confirm-text');
  if (confirmTextEl) {
    confirmTextEl.innerHTML = `האם את/ה בטוח/ה שברצונך למחוק את טיוטת הדוח עבור <strong>${monthName} ${report.year}</strong>?`;
  }

  openModal('modal-delete-draft');
}

function promptDeleteCurrentDraft() {
  if (currentActiveReport && currentActiveReport.id) {
    promptDeleteDraft(currentActiveReport.id);
  } else {
    clearInterval(autoSaveInterval);
    closeModal('monthly-report-modal');
    currentActiveReport = null;
    showToast('הטיוטה בוטלה', 'info');
    loadTeacherDashboardData();
  }
}

function executeDeleteDraft() {
  if (!pendingDeleteDraftId) return;

  const btnConfirm = document.getElementById('btn-confirm-delete-draft');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<div class="spinner"></div><span>מוחק טיוטה...</span>';
  }

  setTimeout(() => {
    try {
      const rep = API.getReportById(pendingDeleteDraftId);
      if (rep && rep.status !== 'draft') {
        throw new Error('ניתן למחוק דוח אך ורק כאשר הוא במצב טיוטה.');
      }

      API.deleteReport(pendingDeleteDraftId, currentTeacher);

      clearInterval(autoSaveInterval);
      closeModal('modal-delete-draft');
      closeModal('monthly-report-modal');
      currentActiveReport = null;

      showToast('טיוטת הדוח נמחקה בהצלחה לצמיתות!', 'success', 'טיוטה נמחקה');
      loadTeacherDashboardData();
    } catch (err) {
      showToast(err.message || 'שגיאה במחיקת טיוטת הדוח', 'error');
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = '<span>🗑️ מחק טיוטה לצמיתות</span>';
      }
      pendingDeleteDraftId = null;
    }
  }, 350);
}

// Modal Escape key listener
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['modal-delete-draft', 'monthly-report-modal', 'modal-principal-email-dispatch'].forEach(closeModal);
  }
});

// Global window bindings
if (typeof window !== 'undefined') {
  window.checkReportSubmissionEligibility = checkReportSubmissionEligibility;
  window.initMonthSelector = initMonthSelector;
  window.isDailyHoursExceeded = isDailyHoursExceeded;
  window.updateDayThresholdWarning = updateDayThresholdWarning;
  window.renderReportGrid = renderReportGrid;
  window.calculateGridTotals = calculateGridTotals;
  window.openReportModal = openReportModal;
  window.saveCurrentReportDraft = saveCurrentReportDraft;
  window.submitCurrentReport = submitCurrentReport;
  window.handleFileUpload = handleFileUpload;
  window.removeAttachment = removeAttachment;
  window.downloadReportPDF = downloadReportPDF;
  window.openPrincipalEmailDispatchModal = openPrincipalEmailDispatchModal;
  window.openPrincipalEmailDispatchModalById = openPrincipalEmailDispatchModalById;
  window.copyDispatchReviewUrl = copyDispatchReviewUrl;
  window.openDispatchMailClient = openDispatchMailClient;
  window.sendDispatchWhatsApp = sendDispatchWhatsApp;
  window.promptDeleteDraft = promptDeleteDraft;
  window.promptDeleteCurrentDraft = promptDeleteCurrentDraft;
  window.executeDeleteDraft = executeDeleteDraft;
  window.ABSENCE_REASONS = window.ABSENCE_REASONS || absenceReasonsList;
  window.OVERTIME_REASONS = window.OVERTIME_REASONS || overtimeReasonsList;
}

window.addEventListener('shalah:reports-synced', () => {
  if (typeof loadTeacherDashboardData === 'function') loadTeacherDashboardData();
});
