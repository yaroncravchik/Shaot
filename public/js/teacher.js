/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Teacher Dashboard & Monthly Report Grid Controller
 */

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
  const currentMonthReport = reports.find(r => r.year === selectedYear && r.month === selectedMonth);
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

  // Check if any report is returned or supervisor edited
  const returnedReport = reports.find(r => r.status === 'returned');
  const editedReport = reports.find(r => r.status === 'supervisor_edited');

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
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-3">טרם נוצרו דוחות שעות במערכת</td></tr>`;
    return;
  }

  reports.forEach(r => {
    const st = REPORT_STATUSES[r.status] || { label: r.status, badgeClass: 'badge-draft' };
    const tr = document.createElement('tr');

    let remarksHtml = '<span class="text-muted">-</span>';
    if (r.supervisorRemarks) {
      remarksHtml = `<span style="color:#721c24; font-weight:600;" title="${r.supervisorRemarks}">💬 מנחה: ${r.supervisorRemarks.slice(0, 30)}...</span>`;
    } else if (r.principalRemarks) {
      remarksHtml = `<span style="color:#004085;" title="${r.principalRemarks}">💬 מנהלת: ${r.principalRemarks.slice(0, 30)}...</span>`;
    }

    let sigHtml = '<span class="text-muted">טרם נחתם</span>';
    if (r.signatureId || r.status === 'approved_paid') {
      sigHtml = `
        <span class="rsa-badge" style="background:#e8f5e9; color:#2e7d32; border-color:#c8e6c9;">
          🛡️ נחתם ומאושר
        </span>
      `;
    }

    const isApproved = API.isReportSupervisorApproved(r);

    const actionButtons = `
      <div style="display:inline-flex; gap:6px; align-items:center; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-sm" onclick="openReportModal(${r.year}, ${r.month})">
          ${r.status === 'draft' || r.status === 'returned' ? '✏️ עריכה' : '👁️ צפייה'}
        </button>
        ${isApproved ? `
          <button class="btn btn-outline-primary btn-sm" onclick="downloadReportPDF('${r.id}')" title="הורדת דוח מאושר בקובץ PDF">
            <span>📄 הורדת PDF</span>
          </button>
        ` : ''}
      </div>
    `;

    tr.innerHTML = `
      <td><strong>${HEBREW_MONTHS_NAME[r.month - 1] || r.month} ${r.year}</strong></td>
      <td><span class="badge ${st.badgeClass}"><span class="badge-dot"></span> ${st.label}</span></td>
      <td>${r.submittedAt ? r.submittedAt.slice(0, 10) : '<span class="text-muted">טיוטה</span>'}</td>
      <td><strong style="color:var(--primary); font-size:1.05rem;">${r.totalOvertimeHours || 0} שעות</strong></td>
      <td>${r.totalAbsenceHours || 0}</td>
      <td>${sigHtml}</td>
      <td style="max-width:200px;">${remarksHtml}</td>
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

  if (isReadOnly) {
    btnSaveDraft.style.display = 'none';
    btnSubmit.style.display = 'none';
  } else {
    btnSaveDraft.style.display = 'inline-flex';
    btnSubmit.style.display = 'inline-flex';
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

  // סייג לכלל זה: אם נבחר בסיבת שעות נוספות "גיחה" או "מסע", סף השעות הוא 14 (התראה מעל 14)
  if (reason === 'גיחה' || reason === 'מסע') {
    return total > 14;
  }

  // עבור יתר הסיבות, סף השעות הוא 10 (התראה מעל 10)
  return total > 10;
}

function updateDayThresholdWarning(idx) {
  const rep = currentActiveReport || (typeof window !== 'undefined' ? window.currentActiveReport : null);
  if (!rep || !rep.daysData || !rep.daysData[idx]) return;
  const day = rep.daysData[idx];
  const isExceeded = isDailyHoursExceeded(day);
  const inputEl = document.getElementById(`ot-input-${idx}`);
  const warnEl = document.getElementById(`ot-warning-${idx}`);

  if (inputEl) {
    if (isExceeded) {
      inputEl.classList.add('cell-overtime-exceeded');
    } else {
      inputEl.classList.remove('cell-overtime-exceeded');
    }
  }

  if (warnEl) {
    warnEl.style.display = isExceeded ? 'block' : 'none';
  }
}

function renderReportGrid(report, isReadOnly) {
  currentActiveReport = report;
  if (typeof window !== 'undefined') window.currentActiveReport = report;
  const tbody = document.getElementById('report-grid-tbody');
  tbody.innerHTML = '';

  const absenceReasonOptions = ['מחלה', 'מילואים', 'השתלמות', 'חופשה', 'אישי', 'אחר'];
  const overtimeReasonOptions = ['יום שדה', 'גיחה', 'מסע', 'מש"צים', 'אחר'];

  report.daysData.forEach((day, index) => {
    const tr = document.createElement('tr');
    if (day.isHoliday) tr.classList.add('row-holiday');
    if (day.isFieldDay) tr.classList.add('row-field-day');

    let dayTags = '';
    if (day.isHoliday) {
      dayTags += `<span class="holiday-tag" title="${day.holidayName}"> ${day.holidayName || 'חג/חופשה'}</span>`;
    }
    if (day.isFieldDay) {
      dayTags += `<span class="field-day-tag"> יום שדה</span>`;
    }

    // Check if daily threshold is exceeded (>10 hours total daily without exemption)
    const isExceeded = isDailyHoursExceeded(day);

    // Check if cell was edited by supervisor
    let overtimeCellClass = 'cell-input';
    if (day.supervisorEdited) {
      overtimeCellClass += ' supervisor-edited-cell';
    }
    if (isExceeded) {
      overtimeCellClass += ' cell-overtime-exceeded';
    }

    tr.innerHTML = `
      <td style="text-align: center; font-weight: 700;">${day.dayOfMonth}</td>
      <td>
        <div style="font-weight: 600;">${day.dayName}</div>
        <div>${dayTags}</div>
      </td>
      <!-- Fixed hours: Read-only gray background -->
      <td style="text-align: center;">
        <input type="text" class="cell-input cell-readonly" value="${day.fixedHours || 0}" readonly>
      </td>
      <!-- Absence Hours -->
      <td>
        <input 
          type="number" 
          class="cell-input" 
          min="0" 
          max="12" 
          step="0.5" 
          value="${day.absenceHours || ''}" 
          data-day-idx="${index}" 
          data-field="absenceHours"
          ${isReadOnly ? 'readonly' : ''}
        >
      </td>
      <!-- Absence Reason -->
      <td>
        <select 
          class="cell-input cell-input-text" 
          data-day-idx="${index}" 
          data-field="absenceReason"
          ${isReadOnly ? 'disabled' : ''}
        >
          <option value="">-- בחר סיבה --</option>
          ${absenceReasonOptions.map(r => `<option value="${r}" ${day.absenceReason === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </td>
      <!-- Overtime Hours -->
      <td>
        <div class="supervisor-edited-wrapper" id="ot-wrapper-${index}">
          ${day.supervisorEdited ? `<span class="edit-diff-indicator" title="${day.editNote}">עודכן ע"י מנחה</span>` : ''}
          <input 
            type="number" 
            class="${overtimeCellClass}" 
            id="ot-input-${index}"
            min="0" 
            max="16" 
            step="0.5" 
            value="${day.overtimeHours || ''}" 
            data-day-idx="${index}" 
            data-field="overtimeHours"
            ${isReadOnly ? 'readonly' : ''}
          >
          ${day.supervisorEdited && day.originalOvertime !== undefined ? `<span class="original-value-hint">מקורי: ${day.originalOvertime} שעות</span>` : ''}
          <div id="ot-warning-${index}" class="overtime-threshold-warning" style="display: ${isExceeded ? 'block' : 'none'};">
            ⚠️ סך השעות היומי עובר את הסף המותר
          </div>
        </div>
      </td>
      <!-- Overtime Reason -->
      <td>
        <select 
          class="cell-input cell-input-text" 
          id="ot-reason-${index}"
          data-day-idx="${index}" 
          data-field="overtimeReason"
          ${isReadOnly ? 'disabled' : ''}
        >
          <option value="">-- בחר פעילות --</option>
          ${overtimeReasonOptions.map(r => `<option value="${r}" ${day.overtimeReason === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </td>
      <!-- Grade / Class -->
      <td>
        <input 
          type="text" 
          class="cell-input cell-input-text" 
          placeholder="ט'1, י'2..." 
          value="${day.gradeClass || ''}" 
          data-day-idx="${index}" 
          data-field="gradeClass"
          ${isReadOnly ? 'readonly' : ''}
        >
      </td>
      <!-- Activity Description -->
      <td>
        <input 
          type="text" 
          class="cell-input cell-input-text" 
          placeholder="פירוט סיור, הדרכה, מסלול..." 
          value="${day.description || ''}" 
          data-day-idx="${index}" 
          data-field="description"
          ${isReadOnly ? 'readonly' : ''}
        >
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach live input change listeners to recalculate totals & threshold warnings
  if (!isReadOnly) {
    tbody.querySelectorAll('input, select').forEach(input => {
      const handleLiveChange = (e) => {
        const idx = parseInt(e.target.dataset.dayIdx, 10);
        const field = e.target.dataset.field;
        let val = e.target.value;
        if (field === 'absenceHours' || field === 'overtimeHours') {
          val = parseFloat(val) || 0;
        }
        currentActiveReport.daysData[idx][field] = val;

        if (field === 'overtimeHours' || field === 'overtimeReason') {
          updateDayThresholdWarning(idx);
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
 <span class="attachment-icon"></span>
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
 if (!declaration.checked) {
 showToast('חובה לאשר את הצהרת הנכונות לפני הגשת הדוח', 'warning');
 return;
 }

 // PRD Business Rule 5.2: Flexible Field Day rule warning
 const missingFieldDayReports = currentActiveReport.daysData.filter(d => d.isFieldDay && (!d.overtimeHours || d.overtimeHours === 0) && !d.description);
 if (missingFieldDayReports.length > 0) {
 const confirmSubmit = confirm(`לתשומת לבך: סומנו ${missingFieldDayReports.length} ימי שדה קבועים ללא דיווח שעות נוספות או פירוט פעילות. האם להגיש את הדוח בכל זאת?`);
 if (!confirmSubmit) return;
 }

 const submitBtn = document.getElementById('btn-submit-report');
 submitBtn.disabled = true;
 submitBtn.innerHTML = '<div class="spinner"></div><span>מגיש דוח ונועל...</span>';

 // Save report and submit to principal
 setTimeout(() => {
 const saved = API.saveReport(currentActiveReport);
 API.submitReportToPrincipal(saved.id, currentTeacher);

 clearInterval(autoSaveInterval);
 closeModal('monthly-report-modal');
 showToast('הדוח הוגש וננעל בהצלחה! קישור נשלח לאישור מנהל/ת בית הספר.', 'success');
 loadTeacherDashboardData();
 submitBtn.disabled = false;
 submitBtn.innerHTML = '<span> הגשת דוח לאישור מנהל/ת</span>';
 }, 700);
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
}
