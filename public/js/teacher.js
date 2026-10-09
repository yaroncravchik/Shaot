/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Teacher Dashboard & Monthly Report Grid Controller
 */

const absenceReasonsList = (typeof ABSENCE_REASONS !== 'undefined' ? ABSENCE_REASONS : (window.ABSENCE_REASONS || ['מחלה', 'מילואים', 'השתלמות', 'חופשה', 'אישי', 'אחר']));
const overtimeReasonsList = (typeof OVERTIME_REASONS !== 'undefined' ? OVERTIME_REASONS : (window.OVERTIME_REASONS || ['יום שדה', 'גיחה', 'מסע', 'מש"צים', 'אחר']));

let currentTeacher = null;
let currentActiveReport = null;
let autoSaveInterval = null;
let selectedYear = 2026;
let selectedMonth = 8;

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
  select.innerHTML = '';

  // Flexible window: 2 months back to 1 month ahead around August 2026
  const options = [
    { year: 2026, month: 9, label: 'ספטמבר 2026 (חודש הבא)' },
    { year: 2026, month: 8, label: 'אוגוסט 2026 (חודש נוכחי)' },
    { year: 2026, month: 7, label: 'יולי 2026' },
    { year: 2026, month: 6, label: 'יוני 2026' }
  ];

  options.forEach((opt, idx) => {
    const el = document.createElement('option');
    el.value = `${opt.year}-${opt.month}`;
    el.textContent = opt.label;
    if (idx === 1) el.selected = true; // Default August
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

    // Stats
    const otEl = document.getElementById('stat-overtime-hours');
    const abEl = document.getElementById('stat-absence-hours');
    if (otEl) otEl.textContent = currentMonthReport.totalOvertimeHours || 0;
    if (abEl) abEl.textContent = currentMonthReport.totalAbsenceHours || 0;
  } else {
    pillContainer.innerHTML = `<span class="badge badge-draft"><span class="badge-dot"></span> טרם נפתח דיווח לחודש זה</span>`;
    btnOpen.innerHTML = '<span>➕ פתיחת דוח שעות חדש</span>';

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

    tr.innerHTML = `
      <td><strong>${HEBREW_MONTHS_NAME[r.month - 1]} ${r.year}</strong></td>
      <td><span class="badge ${st.badgeClass}"><span class="badge-dot"></span> ${st.label}</span></td>
      <td>${r.submittedAt ? r.submittedAt.slice(0, 10) : '—'}</td>
      <td><strong>${r.totalOvertimeHours || 0}</strong> שעות</td>
      <td>${r.totalAbsenceHours || 0} שעות</td>
      <td>${sigCell}</td>
      <td>${remarksCell}</td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-sm" onclick="openReportModal(${r.year}, ${r.month})">
          ${r.status === 'draft' || r.status === 'returned' ? '✏️ עריכה' : '👁️ צפייה'}
        </button>
        ${isSupervisorApproved ? `
          <button class="btn btn-outline-primary btn-sm" onclick="downloadReportPDF('${r.id}')" title="הורדת דוח מאושר כקובץ PDF" style="margin-right: 4px;">
            📄 PDF
          </button>
        ` : ''}
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
      principalEmail: currentTeacher.principalEmail,
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

  // סייג לכלל זה: אם נבחר בסיבת שעות נוספות "גיחה" או "מסע", סף השעות הוא 14
  if (reason === 'גיחה' || reason === 'מסע') {
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
    if (day.isHoliday) tr.classList.add('row-holiday');
    if (day.isFieldDay) tr.classList.add('row-field-day');

    let dayTags = '';
    if (day.isHoliday) {
      dayTags += `<span class="holiday-tag">🌿 ${day.holidayName || 'חג'}</span>`;
    }
    if (day.isFieldDay) {
      dayTags += `<span class="field-day-tag">🌾 יום שדה</span>`;
    }

    const fixed = parseFloat(day.fixedHours || 0);
    const overtime = parseFloat(day.overtimeHours || 0);
    const reason = (day.overtimeReason || '').trim();
    const isExceeded = (reason === 'גיחה' || reason === 'מסע') ? (fixed + overtime > 14) : (fixed + overtime > 10);
    const thresholdLimit = (reason === 'גיחה' || reason === 'מסע') ? '14' : '10';

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
            step="0.5" 
            min="0" 
            max="24"
            class="cell-input input-overtime ${isExceeded ? 'cell-overtime-exceeded' : ''}" 
            data-day-idx="${idx}"
            value="${day.overtimeHours || ''}" 
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
          currentActiveReport.daysData[dayIdx].overtimeHours = parseFloat(el.value) || 0;
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
      totalOvertime += parseFloat(d.overtimeHours || 0);
    });
  }

  const abEl = document.getElementById('grid-total-absence');
  const otEl = document.getElementById('grid-total-overtime');
  if (abEl) abEl.textContent = totalAbsence.toFixed(1).replace('.0', '');
  if (otEl) otEl.textContent = totalOvertime.toFixed(1).replace('.0', '');
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
      API.submitReportToPrincipal(saved.id, currentTeacher);

      clearInterval(autoSaveInterval);
      closeModal('monthly-report-modal');
      loadTeacherDashboardData();

      const principalEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 
                             saved.principalEmail || 
                             'shalah.system.reports@gmail.com';
      
      // Automatically send email notification to principal via Firebase Email Extension
      await API.sendAutomaticPrincipalEmail(saved, currentTeacher);

      showToast(`הדוח ננעל והוגש בהצלחה! קישור לאישור הדוח נשלח אוטומטית למייל המנהל/ת (${principalEmail})`, 'success');
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

// Global window bindings
if (typeof window !== 'undefined') {
  window.checkReportSubmissionEligibility = checkReportSubmissionEligibility;
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
  window.ABSENCE_REASONS = window.ABSENCE_REASONS || absenceReasonsList;
  window.OVERTIME_REASONS = window.OVERTIME_REASONS || overtimeReasonsList;
}
