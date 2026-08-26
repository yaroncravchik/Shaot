/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Profile Setup & Weekly Schedule Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.requireAuth(['teacher']);
  if (!user) return;

  Auth.renderHeader('profile');
  Auth.renderFooter();

  loadProfileData(user);
  setupEventListeners(user);
  calculateWeeklyTotals();
});

function loadProfileData(user) {
  document.getElementById('prof-name').value = user.name || '';
  document.getElementById('prof-id').value = user.id || '';
  document.getElementById('prof-phone').value = user.phone || '';
  document.getElementById('prof-email').value = user.email || '';
  document.getElementById('prof-job-scope').value = user.jobScope || 100;
  document.getElementById('prof-address').value = user.address || 'כפר סבא, רחוב התמר 12';
  document.getElementById('prof-school-code').value = user.schoolCode || '440123';
  document.getElementById('prof-school-name').value = user.schoolName || 'תיכון יצחק רבין כפר סבא';
  document.getElementById('prof-municipality').value = user.municipality || 'כפר סבא';
  document.getElementById('prof-district').value = user.district || 'מרכז';
  document.getElementById('prof-supervisor').value = user.supervisorName || 'דוד לוי';
  document.getElementById('prof-principal-name').value = user.principalName || 'רונית שחר';
  document.getElementById('prof-principal-email').value = user.principalEmail || 'ronit.s@rabin-kfs.org.il';

  // Schedule
  const sched = user.weeklySchedule || { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 };
  document.getElementById('sched-sun').value = sched[0] !== undefined ? sched[0] : 6;
  document.getElementById('sched-mon').value = sched[1] !== undefined ? sched[1] : 6;
  document.getElementById('sched-tue').value = sched[2] !== undefined ? sched[2] : 8;
  document.getElementById('sched-wed').value = sched[3] !== undefined ? sched[3] : 6;
  document.getElementById('sched-thu').value = sched[4] !== undefined ? sched[4] : 8;
  document.getElementById('sched-fri').value = sched[5] !== undefined ? sched[5] : 0;

  // Field days
  const fDays = user.fieldDays || [2, 4];
  document.getElementById('field-sun').checked = fDays.includes(0);
  document.getElementById('field-mon').checked = fDays.includes(1);
  document.getElementById('field-tue').checked = fDays.includes(2);
  document.getElementById('field-wed').checked = fDays.includes(3);
  document.getElementById('field-thu').checked = fDays.includes(4);
  document.getElementById('field-fri').checked = fDays.includes(5);

  // Consent
  document.getElementById('prof-consent-check').checked = !!user.consentSigned;
}

function setupEventListeners(currentUser) {
  const form = document.getElementById('profile-form');
  const scheduleInputs = [
    'sched-sun', 'sched-mon', 'sched-tue', 'sched-wed', 'sched-thu', 'sched-fri',
    'field-sun', 'field-mon', 'field-tue', 'field-wed', 'field-thu', 'field-fri'
  ];

  scheduleInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateWeeklyTotals);
      el.addEventListener('change', calculateWeeklyTotals);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const consentCheck = document.getElementById('prof-consent-check');
    const consentErr = document.getElementById('consent-error');

    if (!consentCheck.checked) {
      consentErr.style.display = 'block';
      showToast('חובה לסמן את תיבת ההסכמה המשפטית', 'error');
      return;
    }
    consentErr.style.display = 'none';

    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner"></div><span>שומר נתונים...</span>';

    const updatedWeeklySchedule = {
      0: parseFloat(document.getElementById('sched-sun').value) || 0,
      1: parseFloat(document.getElementById('sched-mon').value) || 0,
      2: parseFloat(document.getElementById('sched-tue').value) || 0,
      3: parseFloat(document.getElementById('sched-wed').value) || 0,
      4: parseFloat(document.getElementById('sched-thu').value) || 0,
      5: parseFloat(document.getElementById('sched-fri').value) || 0
    };

    const updatedFieldDays = [];
    if (document.getElementById('field-sun').checked) updatedFieldDays.push(0);
    if (document.getElementById('field-mon').checked) updatedFieldDays.push(1);
    if (document.getElementById('field-tue').checked) updatedFieldDays.push(2);
    if (document.getElementById('field-wed').checked) updatedFieldDays.push(3);
    if (document.getElementById('field-thu').checked) updatedFieldDays.push(4);
    if (document.getElementById('field-fri').checked) updatedFieldDays.push(5);

    const updatedUser = {
      ...currentUser,
      name: document.getElementById('prof-name').value.trim(),
      phone: document.getElementById('prof-phone').value.trim(),
      email: document.getElementById('prof-email').value.trim(),
      jobScope: parseFloat(document.getElementById('prof-job-scope').value) || 100,
      address: document.getElementById('prof-address').value.trim(),
      schoolCode: document.getElementById('prof-school-code').value.trim(),
      schoolName: document.getElementById('prof-school-name').value.trim(),
      municipality: document.getElementById('prof-municipality').value.trim(),
      district: document.getElementById('prof-district').value,
      supervisorName: document.getElementById('prof-supervisor').value,
      principalName: document.getElementById('prof-principal-name').value.trim(),
      principalEmail: document.getElementById('prof-principal-email').value.trim(),
      weeklySchedule: updatedWeeklySchedule,
      fieldDays: updatedFieldDays,
      consentSigned: true,
      consentDate: new Date().toISOString()
    };

    setTimeout(() => {
      API.saveUser(updatedUser);
      Auth.setCurrentUser(updatedUser);
      showToast('פרופיל המורה ומערכת השעות עודכנו בהצלחה!', 'success');

      setTimeout(() => {
        window.location.href = 'teacher.html';
      }, 700);
    }, 600);
  });
}

function calculateWeeklyTotals() {
  const sun = parseFloat(document.getElementById('sched-sun').value) || 0;
  const mon = parseFloat(document.getElementById('sched-mon').value) || 0;
  const tue = parseFloat(document.getElementById('sched-tue').value) || 0;
  const wed = parseFloat(document.getElementById('sched-wed').value) || 0;
  const thu = parseFloat(document.getElementById('sched-thu').value) || 0;
  const fri = parseFloat(document.getElementById('sched-fri').value) || 0;

  const total = sun + mon + tue + wed + thu + fri;
  document.getElementById('weekly-total-hours').textContent = total.toFixed(1).replace('.0', '');

  const fieldDaysNames = [];
  if (document.getElementById('field-sun').checked) fieldDaysNames.push('ראשון');
  if (document.getElementById('field-mon').checked) fieldDaysNames.push('שני');
  if (document.getElementById('field-tue').checked) fieldDaysNames.push('שלישי');
  if (document.getElementById('field-wed').checked) fieldDaysNames.push('רביעי');
  if (document.getElementById('field-thu').checked) fieldDaysNames.push('חמישי');
  if (document.getElementById('field-fri').checked) fieldDaysNames.push('שישי');

  const summaryEl = document.getElementById('field-days-summary');
  if (fieldDaysNames.length > 0) {
    summaryEl.textContent = `${fieldDaysNames.length} ימי שדה קבועים בשבוע (${fieldDaysNames.join(', ')})`;
    summaryEl.className = 'field-day-tag';
  } else {
    summaryEl.textContent = 'לא הוגדרו ימי שדה קבועים';
    summaryEl.className = 'text-muted';
  }
}
