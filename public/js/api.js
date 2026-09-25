/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * API Layer, Mock Database, Calendar/Holiday Service, Excel Export & Utilities
 */

const STORAGE_KEYS = {
  USERS: 'shalah_users_v3',
  REPORTS: 'shalah_reports_v3',
  CURRENT_USER: 'shalah_current_user_v3',
  AUDIT_LOGS: 'shalah_audit_logs_v3'
};

// ==========================================================================
// 1. Israeli Ministry of Education Holidays & Calendar Utilities
// ==========================================================================
const ISRAELI_HOLIDAYS_DB = {
 // Format: 'YYYY-MM-DD': 'שם החג/החופשה'
 '2026-09-12': 'ערב ראש השנה',
 '2026-09-13': 'ראש השנה א\'',
 '2026-09-14': 'ראש השנה ב\'',
 '2026-09-21': 'ערב יום כיפור',
 '2026-09-22': 'יום כיפור',
 '2026-09-26': 'ערב סוכות',
 '2026-09-27': 'חג סוכות',
 '2026-09-28': 'חול המועד סוכות',
 '2026-09-29': 'חול המועד סוכות',
 '2026-09-30': 'חול המועד סוכות',
 '2026-10-01': 'חול המועד סוכות',
 '2026-10-02': 'חול המועד סוכות',
 '2026-10-03': 'ערב שמחת תורה',
 '2026-10-04': 'שמחת תורה',
 '2026-12-05': 'חנוכה - נר ראשון',
 '2026-12-06': 'חופשת חנוכה',
 '2026-12-07': 'חופשת חנוכה',
 '2026-12-08': 'חופשת חנוכה',
 '2026-12-09': 'חופשת חנוכה',
 '2026-12-10': 'חופשת חנוכה',
 '2026-12-11': 'חופשת חנוכה',
 '2026-12-12': 'חופשת חנוכה',
 '2026-12-13': 'חופשת חנוכה',
 '2026-03-03': 'תענית אסתר',
 '2026-03-04': 'חג פורים',
 '2026-03-05': 'שושן פורים',
 '2026-04-01': 'ערב פסח / חופשת פסח',
 '2026-04-02': 'חג פסח א\'',
 '2026-04-03': 'חול המועד פסח',
 '2026-04-04': 'חול המועד פסח',
 '2026-04-05': 'חול המועד פסח',
 '2026-04-06': 'חול המועד פסח',
 '2026-04-07': 'חול המועד פסח',
 '2026-04-08': 'שביעי של פסח',
 '2026-04-21': 'יום הזיכרון לחללי מערכות ישראל',
 '2026-04-22': 'יום העצמאות',
 '2026-05-05': 'ל"ג בעומר',
 '2026-05-22': 'ערב שבועות',
 '2026-05-23': 'חג שבועות',
 '2026-06-20': 'סיום שנת הלימודים - חטיבה עליונה'
};

const HEBREW_DAYS_NAME = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
const HEBREW_MONTHS_NAME = [
 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

// Status metadata & labels
const REPORT_STATUSES = {
 draft: { label: 'טיוטה', badgeClass: 'badge-draft' },
 pending_principal: { label: 'ממתין לאישור מנהל/ת', badgeClass: 'badge-pending-principal' },
 pending_supervisor: { label: 'ממתין לבדיקת מנחה', badgeClass: 'badge-pending-supervisor' },
 supervisor_edited: { label: 'עודכן ע"י מנחה (ממתין לממונה)', badgeClass: 'badge-supervisor-edited' },
 returned: { label: 'הוחזר לתיקון המורה', badgeClass: 'badge-returned' },
 pending_admin: { label: 'ממתין לאישור ממונה (רונן)', badgeClass: 'badge-pending-supervisor' },
 approved_paid: { label: 'אושר לתשלום (חתום דיגיטלית)', badgeClass: 'badge-approved' }
};

// ==========================================================================
// 2. Mock Initial Seed Data
// ==========================================================================
function getInitialSeedUsers() {
 return [
 {
 id: '012345678',
 phone: '0501234567',
 name: 'ישראל ישראלי',
 role: 'teacher',
 email: 'israel.i@school.org.il',
 schoolName: 'תיכון יצחק רבין כפר סבא',
 schoolCode: '440123',
 municipality: 'כפר סבא',
 district: 'מרכז',
 jobScope: 100,
 supervisorName: 'דוד לוי',
 supervisorId: '011111111',
 principalName: 'רונית שחר',
 principalEmail: 'ronit.s@rabin-kfs.org.il',
 principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
 fieldDays: [2, 4], // Tuesday, Thursday
 weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
 consentSigned: true,
 consentDate: '2026-08-01T08:30:00Z'
 },
 {
 id: '023456789',
 phone: '0522345678',
 name: 'שרה כהן',
 role: 'teacher',
 email: 'sarah.c@school.org.il',
 schoolName: 'תיכון יצחק רבין כפר סבא',
 schoolCode: '440123',
 municipality: 'כפר סבא',
 district: 'מרכז',
 jobScope: 80,
 supervisorName: 'דוד לוי',
 supervisorId: '011111111',
 principalName: 'רונית שחר',
 principalEmail: 'ronit.s@rabin-kfs.org.il',
 principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
 fieldDays: [1, 3], // Monday, Wednesday
 weeklySchedule: { 0: 5, 1: 7, 2: 5, 3: 7, 4: 0, 5: 0 },
 consentSigned: true,
 consentDate: '2026-08-01T09:15:00Z'
 },
 {
 id: '034567890',
 phone: '0543456789',
 name: 'אבי מזרחי',
 role: 'teacher',
 email: 'avi.m@golda-pt.org.il',
 schoolName: 'מקיף גולדה מאיר פתח תקווה',
 schoolCode: '440789',
 municipality: 'פתח תקווה',
 district: 'מרכז',
 jobScope: 100,
 supervisorName: 'דוד לוי',
 supervisorId: '011111111',
 principalName: 'אילן דגן',
 principalEmail: 'ilan.d@golda-pt.org.il',
 principalToken: 'PRINCIPAL_TOKEN_PT_440789',
 fieldDays: [2],
 weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 6, 5: 0 },
 consentSigned: true,
 consentDate: '2026-08-02T10:00:00Z'
 },
 {
 id: '033333333',
 phone: '0533333333',
 name: 'רונית שחר (מנהלת)',
 role: 'principal',
 email: 'ronit.s@rabin-kfs.org.il',
 schoolName: 'תיכון יצחק רבין כפר סבא',
 schoolCode: '440123',
 municipality: 'כפר סבא',
 district: 'מרכז',
 token: 'PRINCIPAL_TOKEN_KFS_440123'
 },
 {
 id: '011111111',
 phone: '0521111111',
 name: 'דוד לוי',
 role: 'supervisor',
 email: 'david.l@education.gov.il',
 district: 'מרכז'
 },
 {
 id: '022222222',
 phone: '0542222222',
 name: 'ענת פרידמן',
 role: 'supervisor',
 email: 'anat.f@education.gov.il',
 district: 'צפון'
 },
    {
      id: '099999999',
      phone: '0549999999',
      name: 'רונן - ממונה מחוז מרכז',
      role: 'admin',
      email: 'ronen.shalah@education.gov.il',
      district: 'מרכז'
    },
    {
      id: 'siteadmin',
      phone: '0500000000',
      name: 'מנהל אתר ראשי',
      role: 'site_admin',
      email: 'admin.master@shalah.org.il',
      district: 'ארצי'
    }
  ];
}

function getInitialSeedReports() {
 return [
 {
 id: 'REP-2026-08-01',
 teacherId: '012345678',
 teacherName: 'ישראל ישראלי',
 schoolName: 'תיכון יצחק רבין כפר סבא',
 schoolCode: '440123',
 district: 'מרכז',
 municipality: 'כפר סבא',
 supervisorName: 'דוד לוי',
 principalName: 'רונית שחר',
 year: 2026,
 month: 8, // August 2026
 status: 'pending_supervisor',
 submittedAt: '2026-08-25T14:30:00Z',
 principalApprovedAt: '2026-08-25T16:45:00Z',
 principalRemarks: 'הדוח נבדק ותואם את תוכנית הסיורים הבית ספרית. מאושר.',
 supervisorRemarks: '',
 adminRemarks: '',
 totalFixedHours: 148,
 totalAbsenceHours: 6,
 totalOvertimeHours: 14,
 totalPayableHours: 156,
 daysData: generateSampleDaysData(2026, 8, { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 }, [2, 4], [
 { day: 4, overtime: 4, overtimeReason: 'יום שדה', grade: 'ט\'2', desc: 'הדרכת שטח וניווט' },
 { day: 11, overtime: 4, overtimeReason: 'יום שדה', grade: 'י\'1', desc: 'סיור בוטניקה ומורשת' },
 { day: 18, overtime: 6, overtimeReason: 'מסע', grade: 'יא\'3', desc: 'ליווי וניהול מסע' },
 { day: 23, absence: 6, absenceReason: 'מחלה', desc: 'אישור מחלה מצורף' }
 ]),
 attachments: [
 { name: 'ishur_machala_23_08.pdf', size: '245 KB', type: 'application/pdf', uploadDate: '2026-08-25' },
 { name: 'sikm_masaa_har_yerushalayim.pdf', size: '1.2 MB', type: 'application/pdf', uploadDate: '2026-08-25' }
 ],
 auditHistory: [
 { date: '2026-08-25 14:30', user: 'ישראל ישראלי (מורה)', action: 'הגשת דוח חודשי לאישור מנהלת' },
 { date: '2026-08-25 16:45', user: 'רונית שחר (מנהלת)', action: 'אישור וחתימה דיגיטלית של מנהלת בי"ס' }
 ]
 },
 {
 id: 'REP-2026-07-02',
 teacherId: '012345678',
 teacherName: 'ישראל ישראלי',
 schoolName: 'תיכון יצחק רבין כפר סבא',
 schoolCode: '440123',
 district: 'מרכז',
 municipality: 'כפר סבא',
 supervisorName: 'דוד לוי',
 principalName: 'רונית שחר',
 year: 2026,
 month: 7, // July 2026
 status: 'approved_paid',
 submittedAt: '2026-07-28T10:00:00Z',
 principalApprovedAt: '2026-07-28T12:00:00Z',
 supervisorApprovedAt: '2026-07-29T09:30:00Z',
 adminApprovedAt: '2026-07-30T11:20:00Z',
 signatureId: 'SIG-2026-07-948217',
 rsaFingerprint: 'RSA-2048: SHA256:7f3b89e1a2c943df890b23049182374acb01928374',
 totalFixedHours: 130,
 totalAbsenceHours: 0,
 totalOvertimeHours: 16,
 totalPayableHours: 146,
 daysData: generateSampleDaysData(2026, 7, { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 }, [2, 4], [
 { day: 7, overtime: 6, overtimeReason: 'מש"צים', grade: 'ט\'-י\'', desc: 'הכשרת מש"צים צעירים' },
 { day: 14, overtime: 5, overtimeReason: 'אחר', grade: 'צוות', desc: 'בדיקת בטיחות מסלול' },
 { day: 21, overtime: 5, overtimeReason: 'גיחה', grade: 'י\'2', desc: 'הדרכת שדה מעשית' }
 ]),
 attachments: [
 { name: 'mischazim_seminar_list.pdf', size: '512 KB', type: 'application/pdf', uploadDate: '2026-07-28' }
 ],
 auditHistory: [
 { date: '2026-07-28 10:00', user: 'ישראל ישראלי (מורה)', action: 'הגשת דוח חודשי' },
 { date: '2026-07-28 12:00', user: 'רונית שחר (מנהלת)', action: 'אישור מנהלת בי"ס' },
 { date: '2026-07-29 09:30', user: 'דוד לוי (מנחה)', action: 'בדיקה ואישור מנחה מחוזי' },
 { date: '2026-07-30 11:20', user: 'רונן (ממונה ארצי)', action: 'אישור סופי להעברה לתשלום וחתימה דיגיטלית RSA-2048' }
 ]
 },
 {
 id: 'REP-2026-08-03',
 teacherId: '023456789',
 teacherName: 'שרה כהן',
 schoolName: 'תיכון יצחק רבין כפר סבא',
 schoolCode: '440123',
 district: 'מרכז',
 municipality: 'כפר סבא',
 supervisorName: 'דוד לוי',
 principalName: 'רונית שחר',
 year: 2026,
 month: 8,
 status: 'supervisor_edited',
 submittedAt: '2026-08-24T11:00:00Z',
 principalApprovedAt: '2026-08-24T15:00:00Z',
 supervisorRemarks: 'עודכנו שעות סיור ביום 12/08 מ-8 ל-5 שעות בהתאם לתקן הפעילות המאושר.',
 totalFixedHours: 110,
 totalAbsenceHours: 0,
 totalOvertimeHours: 9, // originally reported 12
 totalPayableHours: 119,
 daysData: generateSampleDaysData(2026, 8, { 0: 5, 1: 7, 2: 5, 3: 7, 4: 0, 5: 0 }, [1, 3], [
 { day: 5, overtime: 4, overtimeReason: 'יום שדה', grade: 'ט\'1', desc: 'סיור ופעילות גיאוגרפית' },
 { day: 12, overtime: 5, originalOvertime: 8, overtimeReason: 'יום שדה', grade: 'ט\'3', desc: 'הכנת מסלול', supervisorEdited: true, editNote: 'תוקן מ-8 שעות ל-5 שעות ע"י המנחה דוד לוי' }
 ]),
 attachments: [],
 auditHistory: [
 { date: '2026-08-24 11:00', user: 'שרה כהן (מורה)', action: 'הגשת דוח' },
 { date: '2026-08-24 15:00', user: 'רונית שחר (מנהלת)', action: 'אישור מנהלת' },
 { date: '2026-08-25 10:30', user: 'דוד לוי (מנחה)', action: 'עריכה ישירה של שעות נוספות ביום 12/08 ואישור' }
 ]
 },
 {
 id: 'REP-2026-08-04',
 teacherId: '034567890',
 teacherName: 'אבי מזרחי',
 schoolName: 'מקיף גולדה מאיר פתח תקווה',
 schoolCode: '440789',
 district: 'מרכז',
 municipality: 'פתח תקווה',
 supervisorName: 'דוד לוי',
 principalName: 'אילן דגן',
 year: 2026,
 month: 8,
 status: 'pending_principal',
 submittedAt: '2026-08-26T08:00:00Z',
 totalFixedHours: 148,
 totalAbsenceHours: 0,
 totalOvertimeHours: 10,
 totalPayableHours: 158,
 daysData: generateSampleDaysData(2026, 8, { 0: 6, 1: 6, 2: 8, 3: 6, 4: 6, 5: 0 }, [2], [
 { day: 11, overtime: 5, overtimeReason: 'יום שדה', grade: 'י\'2', desc: 'סיור מקורות הירקון' },
 { day: 18, overtime: 5, overtimeReason: 'אחר', grade: 'ט\'1-ט\'3', desc: 'ערב מורשת ואש' }
 ]),
 attachments: [],
 auditHistory: [
 { date: '2026-08-26 08:00', user: 'אבי מזרחי (מורה)', action: 'הגשת דוח חודשי לאישור מנהל בי"ס' }
 ]
 }
 ];
}

/**
 * Generate full month days (excluding Saturdays) with default schedule hours and holiday metadata
 */
function generateSampleDaysData(year, month, weeklySchedule = {}, fieldDays = [], overrides = [], scheduleNotes = {}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  const overrideMap = {};
  overrides.forEach(o => { overrideMap[o.day] = o; });

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    if (dayOfWeek === 6) continue; // Skip Saturday per PRD!

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isHoliday = !!ISRAELI_HOLIDAYS_DB[dateStr];
    const holidayName = ISRAELI_HOLIDAYS_DB[dateStr] || '';
    const isFieldDay = fieldDays.includes(dayOfWeek);
    const fixedHours = weeklySchedule[dayOfWeek] || 0;

    const ovr = overrideMap[d] || {};

    days.push({
      dayOfMonth: d,
      dayOfWeek: dayOfWeek,
      dayName: HEBREW_DAYS_NAME[dayOfWeek],
      dateStr: dateStr,
      isHoliday: isHoliday,
      holidayName: holidayName,
      isFieldDay: isFieldDay,
      fixedHours: fixedHours,
      absenceHours: ovr.absence || 0,
      absenceReason: ovr.absenceReason || '',
      overtimeHours: ovr.overtime || 0,
      originalOvertime: ovr.originalOvertime || (ovr.supervisorEdited ? ovr.originalOvertime : ovr.overtime || 0),
      overtimeReason: ovr.overtimeReason || '',
      gradeClass: ovr.grade || '',
      description: ovr.desc !== undefined ? ovr.desc : (scheduleNotes[dayOfWeek] || ''),
      supervisorEdited: ovr.supervisorEdited || false,
      editNote: ovr.editNote || ''
    });
  }

  return days;
}

// ==========================================================================
// 3. Database Initializer & Local Storage Wrapper
// ==========================================================================
const VALID_OVERTIME_REASONS = ['יום שדה', 'גיחה', 'מסע', 'מש"צים', 'אחר'];

function normalizeOvertimeReason(reason) {
  if (!reason || typeof reason !== 'string' || !reason.trim()) return '';
  const r = reason.trim();
  if (VALID_OVERTIME_REASONS.includes(r)) return r;
  if (r.includes('שדה') || r.includes('סיור')) return 'יום שדה';
  if (r.includes('גיחה')) return 'גיחה';
  if (r.includes('מסע')) return 'מסע';
  if (r.includes('מש"צ') || r.includes('משצים') || r.includes('מש"צים')) return 'מש"צים';
  return 'אחר';
}

function initStorage() {
  // Migrate users from previous versions if needed
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const v2Users = localStorage.getItem('shalah_users_v2');
    if (v2Users) {
      localStorage.setItem(STORAGE_KEYS.USERS, v2Users);
    } else {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(getInitialSeedUsers()));
    }
  }

  // Migrate reports from previous versions if needed and normalize overtime reasons
  if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
    const v2Reports = localStorage.getItem('shalah_reports_v2');
    if (v2Reports) {
      try {
        const parsed = JSON.parse(v2Reports);
        parsed.forEach(rep => {
          if (rep && Array.isArray(rep.daysData)) {
            rep.daysData.forEach(d => {
              if (d && d.overtimeReason) {
                d.overtimeReason = normalizeOvertimeReason(d.overtimeReason);
              }
            });
          }
        });
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(parsed));
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(getInitialSeedReports()));
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(getInitialSeedReports()));
    }
  } else {
    // Normalize existing reports in v3
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
      let updated = false;
      existing.forEach(rep => {
        if (rep && Array.isArray(rep.daysData)) {
          rep.daysData.forEach(d => {
            if (d && d.overtimeReason && !VALID_OVERTIME_REASONS.includes(d.overtimeReason.trim())) {
              d.overtimeReason = normalizeOvertimeReason(d.overtimeReason);
              updated = true;
            }
          });
        }
      });
      if (updated) {
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(existing));
      }
    } catch (e) {
      // Ignore parse error
    }
  }
}

initStorage();

// ==========================================================================
// 4. API Client Object
// ==========================================================================
const API = {
 // Users & Auth
 getUsers() {
 initStorage();
 return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
 },

 getUserById(id) {
 const users = this.getUsers();
 return users.find(u => u.id === id) || null;
 },

 getUserByToken(token) {
 const users = this.getUsers();
 return users.find(u => u.token === token || u.principalToken === token) || null;
 },

 saveUser(user) {
 const users = this.getUsers();
 const idx = users.findIndex(u => u.id === user.id);
 if (idx >= 0) {
 users[idx] = { ...users[idx], ...user };
 } else {
 users.push(user);
 }
 localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
 return users[idx >= 0 ? idx : users.length - 1];
 },

 // Reports
 getReports(filters = {}) {
 initStorage();
 let reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
 
 if (filters.teacherId) {
 reports = reports.filter(r => r.teacherId === filters.teacherId);
 }
 if (filters.supervisorName) {
 reports = reports.filter(r => r.supervisorName === filters.supervisorName);
 }
 if (filters.district) {
 reports = reports.filter(r => r.district === filters.district);
 }
 if (filters.status && filters.status !== 'all') {
 reports = reports.filter(r => r.status === filters.status);
 }
 if (filters.month) {
 reports = reports.filter(r => r.month === parseInt(filters.month, 10));
 }
 if (filters.year) {
 reports = reports.filter(r => r.year === parseInt(filters.year, 10));
 }

 return reports;
 },

 getReportById(reportId) {
 initStorage();
 const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
 return reports.find(r => r.id === reportId) || null;
 },

 getReportBySignature(sigId) {
 initStorage();
 const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
 return reports.find(r => r.signatureId === sigId) || null;
 },

 saveReport(reportData) {
 initStorage();
 const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
 let report = null;

 // Recalculate summary totals
 let totalFixed = 0;
 let totalAbsence = 0;
 let totalOvertime = 0;

 if (reportData.daysData && Array.isArray(reportData.daysData)) {
 reportData.daysData.forEach(d => {
 totalFixed += parseFloat(d.fixedHours || 0);
 totalAbsence += parseFloat(d.absenceHours || 0);
 totalOvertime += parseFloat(d.overtimeHours || 0);
 });
 }

 reportData.totalFixedHours = totalFixed;
 reportData.totalAbsenceHours = totalAbsence;
 reportData.totalOvertimeHours = totalOvertime;
 reportData.totalPayableHours = Math.max(0, totalFixed - totalAbsence + totalOvertime);

 const idx = reports.findIndex(r => r.id === reportData.id);
 if (idx >= 0) {
 reports[idx] = { ...reports[idx], ...reportData, updatedAt: new Date().toISOString() };
 report = reports[idx];
 } else {
 const newId = reportData.id || `REP-${reportData.year}-${String(reportData.month).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
 report = {
 ...reportData,
 id: newId,
 createdAt: new Date().toISOString(),
 updatedAt: new Date().toISOString(),
 auditHistory: reportData.auditHistory || [{
 date: formatDateTime(new Date()),
 user: reportData.teacherName || 'מורה',
 action: 'יצירת טיוטת דוח חודשי'
 }]
 };
 reports.unshift(report);
 }

 localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
 return report;
 },

 // Workflow Actions
 submitReportToPrincipal(reportId, user) {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

 report.status = 'pending_principal';
 report.submittedAt = new Date().toISOString();
 report.auditHistory = report.auditHistory || [];
 report.auditHistory.push({
 date: formatDateTime(new Date()),
 user: `${user.name} (מורה)`,
 action: 'הגשת הדוח לאישור מנהל/ת בית הספר'
 });

 return this.saveReport(report);
 },

 principalApprove(reportId, principalUser, remarks = '') {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

 report.status = 'pending_supervisor';
 report.principalApprovedAt = new Date().toISOString();
 report.principalRemarks = remarks;
 report.auditHistory = report.auditHistory || [];
 report.auditHistory.push({
 date: formatDateTime(new Date()),
 user: `${principalUser.name} (מנהל/ת)`,
 action: 'אישור וחתימה דיגיטלית של מנהל/ת בי"ס' + (remarks ? `: "${remarks}"` : '')
 });

 return this.saveReport(report);
 },

 principalReject(reportId, principalUser, remarks) {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

 report.status = 'returned';
 report.principalRemarks = remarks;
 report.signatureId = null; // Reset signature on return per PRD!
 report.auditHistory = report.auditHistory || [];
 report.auditHistory.push({
 date: formatDateTime(new Date()),
 user: `${principalUser.name} (מנהל/ת)`,
 action: `החזרה למורה לתיקון: "${remarks}"`
 });

 return this.saveReport(report);
 },

 supervisorApprove(reportId, supervisorUser, remarks = '', editedDays = null) {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

 let hasEdits = false;
 if (editedDays && Array.isArray(editedDays)) {
 report.daysData = editedDays;
 hasEdits = editedDays.some(d => d.supervisorEdited);
 }

 report.status = hasEdits ? 'supervisor_edited' : 'pending_admin';
 report.supervisorApprovedAt = new Date().toISOString();
 report.supervisorRemarks = remarks;
 report.auditHistory = report.auditHistory || [];
 report.auditHistory.push({
 date: formatDateTime(new Date()),
 user: `${supervisorUser.name} (מנחה מחוזי)`,
 action: hasEdits
 ? `אישור עם עריכת שעות ישירה והעברה לממונה: "${remarks || 'בוצעו תיקונים'}"`
 : `אישור מנחה והעברה לממונה` + (remarks ? `: "${remarks}"` : '')
 });

 return this.saveReport(report);
 },

 supervisorReturnToTeacher(reportId, supervisorUser, remarks) {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

 report.status = 'returned';
 report.supervisorRemarks = remarks;
 report.signatureId = null; // Reset signatures
 report.auditHistory = report.auditHistory || [];
 report.auditHistory.push({
 date: formatDateTime(new Date()),
 user: `${supervisorUser.name} (מנחה מחוזי)`,
 action: `החזרת הדוח לתיקון המורה: "${remarks}"`
 });

 return this.saveReport(report);
 },

 adminFinalApprove(reportId, adminUser) {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

 const randomSigNum = Math.floor(100000 + Math.random() * 900000);
 const sigId = `SIG-${report.year}-${String(report.month).padStart(2, '0')}-${randomSigNum}`;
 const rsaHash = `RSA-2048: SHA256:${generateMockHash(report)}`;

 report.status = 'approved_paid';
 report.adminApprovedAt = new Date().toISOString();
 report.signatureId = sigId;
 report.rsaFingerprint = rsaHash;
 report.auditHistory = report.auditHistory || [];
 report.auditHistory.push({
 date: formatDateTime(new Date()),
      user: `${(adminUser && adminUser.name) || 'רונן ממונה מחוז מרכז'} (ממונה ארצי)`,
 action: `אישור סופי לתשלום והנפקת חתימה דיגיטלית מאובטחת (${sigId})`
 });

 return this.saveReport(report);
 },

 adminReturnForEdits(reportId, adminUser, targetRole, remarks) {
 const report = this.getReportById(reportId);
 if (!report) throw new Error('דוח לא נמצא');

    report.status = targetRole === 'supervisor' ? 'pending_supervisor' : 'returned';
    report.adminRemarks = remarks;
    report.signatureId = null;
    report.auditHistory = report.auditHistory || [];
    report.auditHistory.push({
      date: formatDateTime(new Date()),
      user: `${adminUser.name || 'רונן'} (ממונה מחוז מרכז)`,
      action: `החזרה ל${targetRole === 'supervisor' ? 'מנחה' : 'מורה'}: "${remarks}"`
    });

    return this.saveReport(report);
  },

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getSupervisors() {
    const users = this.getUsers();
    return users.filter(u => u.role === 'supervisor');
  },

  getAdminUsers() {
    const users = this.getUsers();
    return users.filter(u => u.role === 'teacher' || u.role === 'supervisor');
  },

  adminCreateTeacher({ firstName, lastName, supervisorId, username, password, schoolName, schoolCode }) {
    const users = this.getUsers();
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (users.some(u => String(u.id) === cleanUsername)) {
      throw new Error('משתמש עם שם משתמש זה כבר קיים במערכת');
    }

    const supervisor = users.find(u => String(u.id) === String(supervisorId) || (u.id_number && String(u.id_number) === String(supervisorId))) || { name: 'אברהם מנחה' };

    const newTeacher = {
      id: cleanUsername,
      phone: cleanPassword,
      name: fullName,
      role: 'teacher',
      email: `${cleanUsername}@education.gov.il`,
      schoolName: schoolName ? schoolName.trim() : 'תיכון מחוזי מרכז',
      schoolCode: schoolCode ? schoolCode.trim() : '123456',
      district: 'מרכז',
      municipality: 'מרכז',
      supervisorName: supervisor.name,
      supervisorId: supervisorId,
      principalName: 'שרה כהן',
      principalEmail: 'principal@school.gov.il',
      jobScope: 100,
      consentSigned: true,
      weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
      fieldDays: [2, 4]
    };

    users.push(newTeacher);
    this.saveUsers(users);

    return newTeacher;
  },

  adminCreateSupervisor({ firstName, lastName, username, password, district = 'מרכז' }) {
    const users = this.getUsers();
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (users.some(u => String(u.id) === cleanUsername)) {
      throw new Error('משתמש עם שם משתמש זה כבר קיים במערכת');
    }

    const newSupervisor = {
      id: cleanUsername,
      phone: cleanPassword,
      name: fullName,
      role: 'supervisor',
      email: `${cleanUsername}@education.gov.il`,
      district: district || 'מרכז'
    };

    users.push(newSupervisor);
    this.saveUsers(users);

    return newSupervisor;
  },

  siteAdminCreateAdmin({ firstName, lastName, username, password, district = 'מרכז', email }) {
    const users = this.getUsers();
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (users.some(u => u.id === cleanUsername)) {
      throw new Error('משתמש עם שם משתמש זה כבר קיים במערכת');
    }

    const newAdmin = {
      id: cleanUsername,
      phone: cleanPassword,
      name: fullName,
      role: 'admin',
      email: email ? email.trim() : `${cleanUsername}@education.gov.il`,
      district: district || 'מרכז'
    };

    users.push(newAdmin);
    this.saveUsers(users);

    return newAdmin;
  },

  siteAdminCreateSupervisor({ firstName, lastName, username, password, district = 'מרכז', email }) {
    return this.adminCreateSupervisor({ firstName, lastName, username, password, district, email });
  },

  siteAdminCreateTeacher({ firstName, lastName, supervisorId, username, password, schoolName, schoolCode, district = 'מרכז', municipality, email }) {
    const users = this.getUsers();
    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    if (users.some(u => u.id === cleanUsername)) {
      throw new Error('משתמש עם שם משתמש זה כבר קיים במערכת');
    }

    const supervisor = users.find(u => u.id === supervisorId) || { name: 'אברהם מנחה' };

    const newTeacher = {
      id: cleanUsername,
      phone: cleanPassword,
      name: fullName,
      role: 'teacher',
      email: email ? email.trim() : `${cleanUsername}@education.gov.il`,
      schoolName: schoolName ? schoolName.trim() : 'תיכון מחוזי',
      schoolCode: schoolCode ? schoolCode.trim() : '123456',
      district: district || 'מרכז',
      municipality: municipality ? municipality.trim() : (district || 'מרכז'),
      supervisorName: supervisor.name,
      supervisorId: supervisorId,
      principalName: 'מנהל/ת מוסד',
      principalEmail: 'principal@school.gov.il',
      jobScope: 100,
      consentSigned: true,
      weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
      fieldDays: [2, 4]
    };

    users.push(newTeacher);
    this.saveUsers(users);

    return newTeacher;
  },

  deleteReport(reportId, performedByUser = null) {
    initStorage();
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
    const idx = reports.findIndex(r => r.id === reportId);
    if (idx < 0) {
      throw new Error('הדוח לא נמצא במערכת');
    }

    const deletedReport = reports.splice(idx, 1)[0];
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

    const audit = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
    audit.push({
      date: formatDateTime(new Date()),
      user: performedByUser ? `${performedByUser.name} (מנהל אתר)` : 'מנהל אתר',
      action: `מחיקת דוח ${deletedReport.id} עבור המורה ${deletedReport.teacherName || ''} (${deletedReport.month}/${deletedReport.year}) לצמיתות`
    });
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(audit));

    return true;
  },

  deleteUser(userId, performedByUser = null) {
    initStorage();
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) {
      throw new Error('משתמש לא נמצא');
    }

    const deletedUser = users.splice(idx, 1)[0];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    const audit = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
    audit.push({
      date: formatDateTime(new Date()),
      user: performedByUser ? `${performedByUser.name} (מנהל אתר)` : 'מנהל אתר',
      action: `מחיקת משתמש ${deletedUser.name} (${deletedUser.role})`
    });
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(audit));

    return true;
  },

  updateUser(userId, updateData, performedByUser = null) {
    initStorage();
    const users = this.getUsers();
    const userIndex = users.findIndex(u => String(u.id) === String(userId) || (u.id_number && String(u.id_number) === String(userId)));
    if (userIndex < 0) {
      throw new Error('משתמש לא נמצא במערכת');
    }

    const current = users[userIndex];
    const oldId = current.id;

    // Handle name
    let newFullName = current.name;
    if (updateData.firstName || updateData.lastName) {
      const fName = (updateData.firstName || '').trim();
      const lName = (updateData.lastName || '').trim();
      newFullName = `${fName} ${lName}`.trim() || current.name;
    } else if (updateData.name) {
      newFullName = updateData.name.trim();
    }

    // Handle username/id change if requested
    let newId = current.id;
    if (updateData.username && updateData.username.trim() !== current.id) {
      const cleanUsername = updateData.username.trim();
      if (users.some(u => u.id === cleanUsername && u.id !== current.id)) {
        throw new Error('שם משתמש זה כבר קיים במערכת');
      }
      newId = cleanUsername;
    }

    // Handle supervisor assignment
    let supervisorName = current.supervisorName;
    let supervisorId = current.supervisorId;
    if (updateData.supervisorId !== undefined) {
      supervisorId = updateData.supervisorId;
      const sup = users.find(u => u.id === supervisorId);
      supervisorName = sup ? sup.name : (updateData.supervisorName || current.supervisorName);
    }

    const updatedUser = {
      ...current,
      id: newId,
      name: newFullName,
      phone: updateData.password ? String(updateData.password).trim() : (updateData.phone ? String(updateData.phone).trim() : current.phone),
      email: updateData.email !== undefined ? updateData.email.trim() : current.email,
      district: updateData.district !== undefined ? updateData.district : current.district,
      schoolName: updateData.schoolName !== undefined ? updateData.schoolName.trim() : current.schoolName,
      schoolCode: updateData.schoolCode !== undefined ? updateData.schoolCode.trim() : current.schoolCode,
      municipality: updateData.municipality !== undefined ? updateData.municipality.trim() : current.municipality,
      supervisorId: supervisorId,
      supervisorName: supervisorName,
      jobScope: updateData.jobScope !== undefined ? Number(updateData.jobScope) : current.jobScope
    };

    users[userIndex] = updatedUser;

    // Cascade changes:
    // 1. If this was a supervisor and name changed or id changed, update assigned teachers
    if (current.role === 'supervisor') {
      users.forEach(u => {
        if (u.supervisorId === oldId) {
          u.supervisorId = newId;
          u.supervisorName = newFullName;
        }
      });
    }

    this.saveUsers(users);

    // 2. If this was a teacher and name or school or id changed, cascade to existing reports
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
    let reportsUpdated = false;
    reports.forEach(r => {
      if (r.teacherId === oldId || r.userId === oldId) {
        r.teacherId = newId;
        r.userId = newId;
        if (newFullName) r.teacherName = newFullName;
        if (updatedUser.schoolName) r.schoolName = updatedUser.schoolName;
        if (updatedUser.schoolCode) r.schoolCode = updatedUser.schoolCode;
        if (updatedUser.district) r.district = updatedUser.district;
        reportsUpdated = true;
      }
    });
    if (reportsUpdated) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    }

    // 3. Update current user session if editing own profile
    try {
      if (typeof Auth !== 'undefined' && Auth.getCurrentUser) {
        const loggedInUser = Auth.getCurrentUser();
        if (loggedInUser && loggedInUser.id === oldId) {
          Auth.setCurrentUser(updatedUser);
        }
      }
    } catch (e) {}

    // 4. Audit Log
    const audit = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
    const roleLabels = { teacher: 'מורה', supervisor: 'מנחה', admin: 'ממונה', site_admin: 'מנהל אתר', principal: 'מנהל/ת' };
    const performerRole = performedByUser ? (roleLabels[performedByUser.role] || performedByUser.role) : 'מערכת';
    const performerName = performedByUser ? `${performedByUser.name || performedByUser.id} (${performerRole})` : 'מערכת';
    audit.push({
      date: formatDateTime(new Date()),
      user: performerName,
      action: `עדכון פרטי ${roleLabels[updatedUser.role] || 'משתמש'}: ${updatedUser.name} (${updatedUser.id})`
    });
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(audit));

    return updatedUser;
  },

  getAdmins() {
    const users = this.getUsers();
    return users.filter(u => u.role === 'admin');
  },

  getAllDistricts() {
    return ['מרכז', 'צפון', 'דרום', 'ירושלים', 'תל אביב', 'חיפה', 'התיישבותי', 'ארצי'];
  },

  exportReportToPDF(report) {
    return exportReportToPDF(report);
  },

  isReportSupervisorApproved(report) {
    return isReportSupervisorApproved(report);
  }
};

// ==========================================================================
// 5. Toast Notification System
// ==========================================================================
function showToast(message, type = 'info', title = '') {
 let container = document.querySelector('.toast-container');
 if (!container) {
 container = document.createElement('div');
 container.className = 'toast-container';
 document.body.appendChild(container);
 }

 const toast = document.createElement('div');
 toast.className = `toast toast-${type}`;

 const iconMap = {
 success: '',
 error: '',
 warning: '',
 info: 'ℹ'
 };

 const defaultTitles = {
 success: 'פעולה בוצעה בהצלחה',
 error: 'שגיאה',
 warning: 'לתשומת לבך',
 info: 'הודעת מערכת'
 };

 toast.innerHTML = `
 <div class="toast-icon">${iconMap[type] || 'ℹ'}</div>
 <div class="toast-content">
 <div class="toast-title">${title || defaultTitles[type]}</div>
 <div class="toast-message">${message}</div>
 </div>
 `;

 container.appendChild(toast);

 setTimeout(() => {
 toast.style.opacity = '0';
 toast.style.transform = 'translateX(-30px)';
 setTimeout(() => {
 if (toast.parentNode) toast.parentNode.removeChild(toast);
 }, 200);
 }, 4000);
}

// ==========================================================================
// 6. Modal Helpers
// ==========================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Modal not found with id:', modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
    document.body.style.overflow = '';
  }
}

// Global modal backdrop and ESC key dismiss
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.modal-backdrop.show, .modal-backdrop[style*="display: flex"]');
      openModals.forEach(m => {
        m.classList.remove('show');
        m.style.display = 'none';
        m.style.opacity = '0';
        m.style.visibility = 'hidden';
        m.style.pointerEvents = 'none';
      });
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('show');
      e.target.style.display = 'none';
      e.target.style.opacity = '0';
      e.target.style.visibility = 'hidden';
      e.target.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }
  });
}

/**
 * 6.1 Teacher Profile & Weekly Schedule Floating Modal (חלון צף לפרופיל מורה ומערכת שעות)
 * Automatically mounted when clicking any teacher name across Supervisor, Admin, and Site-Admin views.
 */
function ensureTeacherProfileModalDOM() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('modal-teacher-profile-view')) return;

  const modalHtml = `
  <div class="modal-backdrop" id="modal-teacher-profile-view" style="z-index: 10050;">
    <div class="modal-container modal-lg" style="max-width: 860px; max-height: 90vh;">
      <div class="modal-header" style="background: linear-gradient(135deg, #0c3058 0%, #1a4a82 100%); color: #ffffff; padding: 16px 20px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; border-radius:50%; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:1.4rem;">
            👤
          </div>
          <div>
            <h3 id="tp-modal-name" class="modal-title" style="color:#ffffff; font-size:1.25rem; margin-bottom:2px; font-weight:700;">
              ישראל ישראלי
            </h3>
            <div id="tp-modal-subtitle" style="font-size:0.8125rem; color:#cfe2ff; font-weight:500;">
              מורה של"ח וידיעת הארץ | ת.ז. / שם משתמש: 012345678
            </div>
          </div>
        </div>
        <button type="button" class="modal-close-btn" style="color:#ffffff; font-size:1.6rem;" onclick="closeTeacherProfileModal()" aria-label="סגור">&times;</button>
      </div>

      <div class="modal-body" style="padding: 20px; background-color: var(--surface, #f5f8fa); overflow-y: auto;">
        <!-- Info Cards Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 18px;">
          
          <!-- Card 1: School & Role Details -->
          <div class="card" style="margin:0; box-shadow:0 1px 3px rgba(0,0,0,0.06); border:1px solid var(--outline, #dee2e6); background:#ffffff;">
            <div class="card-header" style="padding:10px 14px; background:#f8fafc; border-bottom:1px solid #edf2f7;">
              <strong style="color:#0c3058; font-size:0.9rem;">🏫 פרטי מוסד ותפקיד</strong>
            </div>
            <div class="card-body" style="padding:12px 14px; display:flex; flex-direction:column; gap:8px; font-size:0.875rem;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px;">
                <span class="text-muted">מוסד חינוכי:</span>
                <span style="font-weight:600; text-align:left;"><span id="tp-school-name">—</span> <span id="tp-school-code" class="text-muted" style="font-size:0.75rem;"></span></span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px;">
                <span class="text-muted">מחוז ורשות:</span>
                <span style="font-weight:600;"><span id="tp-district">—</span> | <span id="tp-municipality">—</span></span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px;">
                <span class="text-muted">היקף משרה:</span>
                <span id="tp-job-scope" class="badge badge-success" style="font-size:0.8125rem;">100% משרה</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span class="text-muted">מנחה מחוזי:</span>
                <span id="tp-supervisor-name" style="font-weight:600; color:#0c3058;">—</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Contact & Principal Details -->
          <div class="card" style="margin:0; box-shadow:0 1px 3px rgba(0,0,0,0.06); border:1px solid var(--outline, #dee2e6); background:#ffffff;">
            <div class="card-header" style="padding:10px 14px; background:#f8fafc; border-bottom:1px solid #edf2f7;">
              <strong style="color:#0c3058; font-size:0.9rem;">📞 פרטי קשר ומנהל/ת</strong>
            </div>
            <div class="card-body" style="padding:12px 14px; display:flex; flex-direction:column; gap:8px; font-size:0.875rem;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px;">
                <span class="text-muted">טלפון נייד:</span>
                <span id="tp-phone" style="font-family:monospace; font-weight:600;">—</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px;">
                <span class="text-muted">כתובת דוא"ל:</span>
                <span id="tp-email" style="font-size:0.8125rem; font-weight:500;">—</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding-bottom:4px;">
                <span class="text-muted">מנהל/ת המוסד:</span>
                <span id="tp-principal-name" style="font-weight:600;">—</span>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span class="text-muted">דוא"ל מנהל/ת:</span>
                <span id="tp-principal-email" class="text-muted" style="font-size:0.8125rem;">—</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Weekly Schedule Table -->
        <div class="card" style="margin:0; box-shadow:0 1px 3px rgba(0,0,0,0.06); border:1px solid var(--outline, #dee2e6); background:#ffffff;">
          <div class="card-header" style="padding:10px 14px; background:#f8fafc; border-bottom:1px solid #edf2f7; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:1.1rem;">📅</span>
              <strong style="color:#0c3058; font-size:0.9rem;">מערכת שעות שבועית קבועה וימי שדה</strong>
            </div>
            <span id="tp-weekly-total-badge" class="badge" style="background:#e8f4fd; color:#0d47a1; font-weight:700;">
              סה"כ: 34 שעות
            </span>
          </div>
          <div class="card-body" style="padding:0; overflow-x:auto;">
            <table class="gov-table" style="margin:0; width:100%; font-size:0.875rem; border-collapse:collapse;">
              <thead>
                <tr style="background:#f1f5f9; border-bottom:2px solid var(--outline, #dee2e6);">
                  <th style="width:16%; padding:8px 12px;">יום בשבוע</th>
                  <th style="width:16%; text-align:center; padding:8px 12px;">שעות תקן קבועות</th>
                  <th style="width:24%; padding:8px 12px;">סוג יום</th>
                  <th style="padding:8px 12px;">הערות / פירוט כיתות קבוע</th>
                </tr>
              </thead>
              <tbody id="tp-schedule-tbody">
                <!-- Dynamically populated -->
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc; font-weight:700; border-top:2px solid var(--outline, #dee2e6);">
                  <td style="padding:10px 12px;">סה"כ שבועי</td>
                  <td id="tp-foot-total-hours" style="text-align:center; color:var(--primary, #007bff); font-size:0.95rem; padding:10px 12px;">
                    34 שעות
                  </td>
                  <td id="tp-foot-field-days-count" colspan="2" style="color:#0f5132; padding:10px 12px;">
                    2 ימי שדה קבועים
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <div class="modal-footer" style="padding: 12px 20px; background:#ffffff; border-top:1px solid var(--outline, #dee2e6);">
        <button type="button" class="btn btn-secondary" onclick="closeTeacherProfileModal()">
          סגור
        </button>
      </div>
    </div>
  </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = modalHtml;
  document.body.appendChild(container.firstElementChild);
}

function openTeacherProfileModal(identifier) {
  if (!identifier) return;

  const users = API.getUsers();
  const cleanId = String(identifier).trim();
  
  // Find teacher by ID or by exact Name
  let teacher = users.find(u => (u.id === cleanId || u.name === cleanId) && u.role === 'teacher');
  if (!teacher) {
    teacher = users.find(u => u.id === cleanId || u.name === cleanId);
  }
  
  if (!teacher) {
    const reports = API.getReports ? API.getReports() : [];
    const rep = reports.find(r => r.teacherId === cleanId || r.teacherName === cleanId);
    if (rep) {
      teacher = {
        id: rep.teacherId || cleanId,
        name: rep.teacherName || cleanId,
        role: 'teacher',
        schoolName: rep.schoolName || '—',
        schoolCode: rep.schoolCode || '',
        municipality: rep.municipality || '—',
        district: rep.district || 'מרכז',
        supervisorName: rep.supervisorName || '—',
        phone: '—',
        email: '—',
        jobScope: 100,
        weeklySchedule: { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 },
        fieldDays: [2, 4]
      };
    }
  }

  if (!teacher) {
    if (typeof showToast === 'function') {
      showToast('לא נמצאו פרטי מורה במערכת', 'warning');
    } else {
      alert('לא נמצאו פרטי מורה במערכת');
    }
    return;
  }

  ensureTeacherProfileModalDOM();

  // Populate Header
  const nameEl = document.getElementById('tp-modal-name');
  if (nameEl) nameEl.textContent = teacher.name || 'מורה של"ח';
  const subEl = document.getElementById('tp-modal-subtitle');
  if (subEl) subEl.textContent = `מורה של"ח וידיעת הארץ | ת.ז. / שם משתמש: ${teacher.id || '—'}`;

  // Populate School & Role Info
  const schNameEl = document.getElementById('tp-school-name');
  if (schNameEl) schNameEl.textContent = teacher.schoolName || teacher.school_name || '—';
  const schoolCode = teacher.schoolCode || teacher.school_code;
  const schCodeEl = document.getElementById('tp-school-code');
  if (schCodeEl) schCodeEl.textContent = schoolCode ? `(סמל: ${schoolCode})` : '';
  const distEl = document.getElementById('tp-district');
  if (distEl) distEl.textContent = teacher.district || 'מרכז';
  const munEl = document.getElementById('tp-municipality');
  if (munEl) munEl.textContent = teacher.municipality || '—';
  
  const jobScopeVal = teacher.jobScope !== undefined ? teacher.jobScope : (teacher.job_percentage !== undefined ? teacher.job_percentage : 100);
  const jobScopeEl = document.getElementById('tp-job-scope');
  if (jobScopeEl) jobScopeEl.textContent = `${jobScopeVal}% משרה`;
  const supEl = document.getElementById('tp-supervisor-name');
  if (supEl) supEl.textContent = teacher.supervisorName || 'דוד לוי';

  // Populate Contact & Principal Info
  const phoneEl = document.getElementById('tp-phone');
  if (phoneEl) phoneEl.textContent = teacher.phone || '—';
  const emailEl = document.getElementById('tp-email');
  if (emailEl) emailEl.textContent = teacher.email || '—';
  const princEl = document.getElementById('tp-principal-name');
  if (princEl) princEl.textContent = teacher.principalName || teacher.principal_name || '—';
  const princMailEl = document.getElementById('tp-principal-email');
  if (princMailEl) princMailEl.textContent = teacher.principalEmail || teacher.principal_email || '—';

  // Populate Weekly Schedule
  const schedule = teacher.weeklySchedule || { 0: 6, 1: 6, 2: 8, 3: 6, 4: 8, 5: 0 };
  const fieldDays = Array.isArray(teacher.fieldDays) ? teacher.fieldDays : [2, 4];
  const notes = teacher.scheduleNotes || {
    0: 'שעות הוראה בכיתה',
    1: 'שעות הוראה בכיתה',
    2: 'יציאה לסיורי שדה שכבת ט\'',
    3: 'שעות הוראה בכיתה',
    4: 'יציאה לסיורי שדה שכבת י\'',
    5: 'יום חופשי / ללא הוראה'
  };

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  const tbody = document.getElementById('tp-schedule-tbody');
  if (tbody) {
    tbody.innerHTML = '';

    let totalWeeklyHours = 0;
    let totalFieldDays = 0;

    for (let d = 0; d < 6; d++) {
      const hours = Number(schedule[d] !== undefined ? schedule[d] : 0);
      const isFieldDay = fieldDays.includes(d);
      const dayNote = notes[d] !== undefined ? notes[d] : (isFieldDay ? 'סיור שדה' : (hours > 0 ? 'שעות הוראה בכיתה' : 'יום חופשי'));

      totalWeeklyHours += hours;
      if (isFieldDay) totalFieldDays++;

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f1f5f9';

      const dayBadge = isFieldDay
        ? `<span class="badge" style="background:#d1fae5; color:#065f46; font-weight:600; padding:3px 8px;">🌿 יום שדה קבוע</span>`
        : (hours > 0 
            ? `<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:500; padding:3px 8px;">📖 שעות בכיתה</span>`
            : `<span class="badge" style="background:#fef2f2; color:#991b1b; font-weight:500; padding:3px 8px;">🏖️ יום חופשי</span>`);

      tr.innerHTML = `
        <td style="padding:9px 12px;"><strong>יום ${dayNames[d]}</strong></td>
        <td style="padding:9px 12px; text-align:center; font-weight:700; color:${hours > 0 ? '#0c3058' : 'var(--text-muted, #94a3b8)'};">
          ${hours > 0 ? `${hours} שעות` : '—'}
        </td>
        <td style="padding:9px 12px;">${dayBadge}</td>
        <td style="padding:9px 12px; color:#334155;">${dayNote}</td>
      `;
      tbody.appendChild(tr);
    }

    const badgeEl = document.getElementById('tp-weekly-total-badge');
    if (badgeEl) badgeEl.textContent = `סה"כ: ${totalWeeklyHours} שעות שבועיות`;
    const footHoursEl = document.getElementById('tp-foot-total-hours');
    if (footHoursEl) footHoursEl.textContent = `${totalWeeklyHours} שעות`;
    const footFieldEl = document.getElementById('tp-foot-field-days-count');
    if (footFieldEl) footFieldEl.textContent = `${totalFieldDays} ימי שדה קבועים בשבוע`;
  }

  // Show modal
  openModal('modal-teacher-profile-view');
}

function closeTeacherProfileModal() {
  closeModal('modal-teacher-profile-view');
}

// Global bindings for modal
if (typeof window !== 'undefined') {
  window.openTeacherProfileModal = openTeacherProfileModal;
  window.closeTeacherProfileModal = closeTeacherProfileModal;
}
API.openTeacherProfileModal = openTeacherProfileModal;
API.closeTeacherProfileModal = closeTeacherProfileModal;

// ==========================================================================
// 7. Excel Export Utility (Hebrew UTF-8 BOM Compliant)
// ==========================================================================
function exportReportsToExcel(reports, filename = 'shalah_hours_report.csv') {
 if (!reports || reports.length === 0) {
 showToast('אין נתונים לייצוא', 'warning');
 return;
 }

  const headers = [
    'מזהה דוח',
    'חודש/שנה',
    'שם מורה',
    'שם משתמש',
    'שם בית ספר',
    'סמל מוסד',
    'מחוז',
    'רשות מקומית',
    'מנחה מחוזי',
    'סטטוס',
    'שעות נוספות',
    'שעות היעדרות',
    'מזהה חתימה דיגיטלית',
    'תאריך הגשה'
  ];

  const rows = reports.map(r => [
    `"${r.id || ''}"`,
    `"${r.month}/${r.year}"`,
    `"${r.teacherName || ''}"`,
    `"${r.teacherId || ''}"`,
    `"${r.schoolName || ''}"`,
    `"${r.schoolCode || ''}"`,
    `"${r.district || ''}"`,
    `"${r.municipality || ''}"`,
    `"${r.supervisorName || ''}"`,
    `"${(REPORT_STATUSES[r.status] && REPORT_STATUSES[r.status].label) || r.status}"`,
    r.totalOvertimeHours || 0,
    r.totalAbsenceHours || 0,
    `"${r.signatureId || 'טרם נחתם'}"`,
    `"${r.submittedAt ? r.submittedAt.slice(0, 10) : ''}"`
  ]);

 const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.setAttribute('href', url);
 link.setAttribute('download', filename);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 showToast('קובץ אקסל הופק בהצלחה!', 'success');
}

// ==========================================================================
// 7.1. PDF Export Utility for Approved Monthly Activity Reports
// ==========================================================================
function isReportSupervisorApproved(report) {
  if (!report) return false;
  return Boolean(
    report.supervisorApprovedAt ||
    ['pending_admin', 'supervisor_edited', 'approved_paid'].includes(report.status)
  );
}

function generateReportPDFHtml(report) {
  const monthName = HEBREW_MONTHS_NAME[(report.month || 1) - 1] || report.month;
  const days = report.daysData || [];
  
  let rowsHtml = '';
  days.forEach(d => {
    let dayBadges = '';
    if (d.isHoliday) dayBadges += `<span class="pdf-tag tag-holiday">${d.holidayName || 'חג/חופשה'}</span>`;
    if (d.isFieldDay) dayBadges += `<span class="pdf-tag tag-field">יום שדה</span>`;
    
    let otDisplay = d.overtimeHours ? `${d.overtimeHours}` : '-';
    if (d.supervisorEdited && d.originalOvertime !== undefined) {
      otDisplay += ` <span class="pdf-edit-note">(מקורי: ${d.originalOvertime})</span>`;
    }
    
    rowsHtml += `
      <tr class="${d.isFieldDay ? 'row-field' : ''} ${d.isHoliday ? 'row-holiday' : ''}">
        <td class="col-num">${d.dayOfMonth}</td>
        <td class="col-day"><strong>${d.dayName || ''}</strong> ${dayBadges}</td>
        <td class="col-num col-fixed">${d.fixedHours || 0}</td>
        <td class="col-num">${d.absenceHours || 0}</td>
        <td>${d.absenceReason || '-'}</td>
        <td class="col-num col-ot"><strong>${otDisplay}</strong></td>
        <td>${d.overtimeReason || '-'}</td>
        <td>${d.gradeClass || '-'}</td>
        <td class="col-desc">${d.description || '-'}</td>
      </tr>
    `;
  });

  const supApprovedDate = report.supervisorApprovedAt ? formatDateTime(report.supervisorApprovedAt) : 'טרם אושר';
  const principalApprovedDate = report.principalApprovedAt ? formatDateTime(report.principalApprovedAt) : 'טרם אושר';
  const exportDate = formatDateTime(new Date());

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>דוח שעות פעילות חודשי – ${report.teacherName || 'מורה'} – ${monthName} ${report.year}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Rubik', sans-serif;
      direction: rtl;
      color: #0c3058;
      background-color: #ffffff;
      padding: 16px;
      font-size: 11px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      background: #0c3058;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .no-print button {
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-family: 'Rubik', sans-serif;
    }
    .btn-print-action {
      background: #007bff;
      color: #ffffff;
      margin-left: 8px;
    }
    .btn-print-action:hover {
      background: #0056b3;
    }
    .btn-close-action {
      background: rgba(255,255,255,0.2);
      color: #ffffff;
    }
    .btn-close-action:hover {
      background: rgba(255,255,255,0.3);
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
    .pdf-header {
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .pdf-title {
      font-size: 18px;
      font-weight: 800;
      color: #0c3058;
    }
    .pdf-subtitle {
      font-size: 13px;
      color: #007bff;
      font-weight: 600;
      margin-top: 2px;
    }
    .pdf-stamp {
      border: 1.5px solid #28a745;
      background: #f4faf4;
      color: #1e7e34;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-align: center;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .meta-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .meta-card-title {
      font-size: 11px;
      font-weight: 700;
      color: #0056b3;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .meta-item {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      margin-bottom: 2px;
    }
    .meta-label {
      color: #6c757d;
      font-weight: 500;
    }
    .meta-val {
      font-weight: 600;
      color: #0c3058;
    }
    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 12px;
    }
    .pdf-table th {
      background-color: #0c3058;
      color: #ffffff;
      padding: 6px 4px;
      font-weight: 600;
      border: 1px solid #0c3058;
      text-align: center;
    }
    .pdf-table td {
      padding: 4px 4px;
      border: 1px solid #dee2e6;
      vertical-align: middle;
    }
    .col-num {
      text-align: center;
      width: 32px;
    }
    .col-day {
      width: 80px;
    }
    .col-fixed {
      background-color: #f1f3f5;
      color: #495057;
    }
    .col-ot {
      color: #0056b3;
      background-color: #f0f7ff;
    }
    .col-desc {
      font-size: 9.5px;
    }
    .row-field {
      background-color: #f0f9fa;
    }
    .row-holiday {
      background-color: #fff9e6;
    }
    .pdf-tag {
      display: inline-block;
      font-size: 8px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 4px;
      margin-right: 2px;
    }
    .tag-field {
      background: #e1f5fe;
      color: #0277bd;
    }
    .tag-holiday {
      background: #fff3e0;
      color: #e65100;
    }
    .pdf-edit-note {
      font-size: 8.5px;
      color: #c82333;
      display: block;
    }
    .pdf-table tfoot td {
      background-color: #e9ecef;
      font-weight: 700;
      font-size: 11px;
      border: 1px solid #ced4da;
      padding: 6px 4px;
    }
    .remarks-box {
      border: 1px solid #ffeeba;
      background: #fffdf5;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .pdf-footer-sign {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #ced4da;
    }
    .sign-box {
      border: 1px solid #e9ecef;
      background: #fafbfc;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 9.5px;
      text-align: center;
    }
    .sign-title {
      font-weight: 700;
      color: #0056b3;
      margin-bottom: 3px;
    }
    .sign-status {
      color: #28a745;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <span style="font-size:14px; font-weight:700;">📄 תצוגת דוח פעילות להורדה כקובץ PDF</span>
      <span style="font-size:12px; opacity:0.85; margin-right:12px;">בחר "שמור כ-PDF" (Save as PDF) בחלון ההדפסה</span>
    </div>
    <div>
      <button class="btn-print-action" onclick="window.print()">🖨️ שמירה כ-PDF / הדפסה</button>
      <button class="btn-close-action" onclick="window.close()">סגירה</button>
    </div>
  </div>

  <div class="pdf-header">
    <div>
      <div class="pdf-title">מערכת דיווח שעות פעילות – תחום של"ח וידיעת הארץ</div>
      <div class="pdf-subtitle">דוח שעות חודשי מאושר לחודש ${monthName} ${report.year}</div>
    </div>
    <div class="pdf-stamp">
      ✓ אושר ע"י מנחה מחוזי<br>
      <span style="font-size:9px; font-weight:500;">מזהה: ${report.signatureId || report.id}</span>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="meta-card-title">פרטי המורה ומוסד החינוך</div>
      <div class="meta-item"><span class="meta-label">שם המורה:</span><span class="meta-val">${report.teacherName || '-'}</span></div>
      <div class="meta-item"><span class="meta-label">שם משתמש:</span><span class="meta-val">${report.teacherId || '-'}</span></div>
      <div class="meta-item"><span class="meta-label">מוסד חינוכי:</span><span class="meta-val">${report.schoolName || '-'}</span></div>
      <div class="meta-item"><span class="meta-label">סמל מוסד:</span><span class="meta-val">${report.schoolCode || '-'}</span></div>
      <div class="meta-item"><span class="meta-label">מחוז ורשות:</span><span class="meta-val">${report.district || '-'} • ${report.municipality || '-'}</span></div>
    </div>

    <div class="meta-card">
      <div class="meta-card-title">סטטוס ואישורים רשמיים</div>
      <div class="meta-item"><span class="meta-label">סטטוס דוח:</span><span class="meta-val" style="color:#28a745;">${(REPORT_STATUSES[report.status] && REPORT_STATUSES[report.status].label) || 'מאושר'}</span></div>
      <div class="meta-item"><span class="meta-label">מנחה מאשר:</span><span class="meta-val">${report.supervisorName || 'מנחה מחוזי'}</span></div>
      <div class="meta-item"><span class="meta-label">תאריך אישור מנחה:</span><span class="meta-val">${supApprovedDate}</span></div>
      <div class="meta-item"><span class="meta-label">מנהל/ת בי"ס:</span><span class="meta-val">${report.principalName || 'מנהל/ת'}</span></div>
      <div class="meta-item"><span class="meta-label">תאריך אישור מנהל/ת:</span><span class="meta-val">${principalApprovedDate}</span></div>
    </div>

    <div class="meta-card">
      <div class="meta-card-title">סיכום שעות חודשי</div>
      <div class="meta-item"><span class="meta-label">סה"כ שעות נוספות:</span><span class="meta-val" style="color:#0056b3; font-size:12px;">${report.totalOvertimeHours || 0} שעות</span></div>
      <div class="meta-item"><span class="meta-label">סה"כ שעות היעדרות:</span><span class="meta-val">${report.totalAbsenceHours || 0} שעות</span></div>
      <div class="meta-item"><span class="meta-label">תאריך הגשה:</span><span class="meta-val">${report.submittedAt ? report.submittedAt.slice(0,10) : '-'}</span></div>
      <div class="meta-item"><span class="meta-label">הופק בתאריך:</span><span class="meta-val">${exportDate}</span></div>
    </div>
  </div>

  ${report.supervisorRemarks ? `<div class="remarks-box"><strong>הערות מנחה מחוזי:</strong> ${report.supervisorRemarks}</div>` : ''}
  ${report.principalRemarks ? `<div class="remarks-box"><strong>הערות מנהל/ת מוסד:</strong> ${report.principalRemarks}</div>` : ''}

  <table class="pdf-table">
    <thead>
      <tr>
        <th style="width:28px;">יום</th>
        <th style="width:85px;">יום בשבוע</th>
        <th style="width:40px;">שעות קבועות</th>
        <th style="width:40px;">שעות היעדרות</th>
        <th style="width:70px;">סיבת היעדרות</th>
        <th style="width:45px;">שעות נוספות</th>
        <th style="width:75px;">סיבת שעות נוספות</th>
        <th style="width:60px;">שכבה/כיתה</th>
        <th>פירוט הפעילות</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:left; padding-left:10px;">סה"כ חודשי:</td>
        <td class="col-num">${report.totalAbsenceHours || 0}</td>
        <td></td>
        <td class="col-num col-ot" style="color:#0056b3;">${report.totalOvertimeHours || 0}</td>
        <td colspan="3"></td>
      </tr>
    </tfoot>
  </table>

  <div class="pdf-footer-sign">
    <div class="sign-box">
      <div class="sign-title">הצהרת המורה</div>
      <div class="sign-status">✓ נחתם ואושר דיגיטלית</div>
      <div style="color:#6c757d; font-size:8.5px;">${report.teacherName || ''}</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">אישור מנהל/ת בית הספר</div>
      <div class="sign-status">✓ אושר דיגיטלית</div>
      <div style="color:#6c757d; font-size:8.5px;">${report.principalName || ''} (${principalApprovedDate})</div>
    </div>
    <div class="sign-box">
      <div class="sign-title">אישור מנחה של"ח מחוזי</div>
      <div class="sign-status">✓ נבדק ואושר</div>
      <div style="color:#6c757d; font-size:8.5px;">${report.supervisorName || ''} (${supApprovedDate})</div>
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
}

function exportReportToPDF(report) {
  if (!report) {
    showToast('לא נמצא דוח להורדה', 'error');
    return;
  }
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('נא לאפשר חלונות קופצים בדפדפן כדי להוריד את קובץ ה-PDF', 'warning');
    return;
  }
  
  const htmlContent = generateReportPDFHtml(report);
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ==========================================================================
// 8. Helper Functions
// ==========================================================================
function formatDateTime(d) {
  const date = typeof d === 'string' ? new Date(d) : d;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatMonthYear(year, month) {
  const m = parseInt(month, 10);
  const monthName = HEBREW_MONTHS_NAME[m - 1] || month;
  return `${monthName} ${year}`;
}

function generateMockHash(report) {
  const str = `${report.id}-${report.totalPayableHours}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
}

// Ensure global accessibility
window.API = API;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.formatDateTime = formatDateTime;
window.formatMonthYear = formatMonthYear;
window.exportReportsToExcel = exportReportsToExcel;
window.exportReportToPDF = exportReportToPDF;
window.isReportSupervisorApproved = isReportSupervisorApproved;
window.generateReportPDFHtml = generateReportPDFHtml;
window.REPORT_STATUSES = REPORT_STATUSES;
window.HEBREW_MONTHS_NAME = HEBREW_MONTHS_NAME;
window.HEBREW_DAYS_NAME = HEBREW_DAYS_NAME;

// ==========================================================================
// 9. Reusable Graphic Signature Pad Component
// ==========================================================================
class GraphicSignaturePad {
  constructor(canvasElement, clearBtnElement) {
    this.canvas = canvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.hasDrawn = false;
    this.clearBtn = clearBtnElement;

    this.initCanvas();
    this.initEvents();
  }

  initCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width || 400;
    this.canvas.height = rect.height || 140;

    this.ctx.strokeStyle = '#0c3058';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  initEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.canvas.width / (rect.width || 1)),
        y: (clientY - rect.top) * (this.canvas.height / (rect.height || 1))
      };
    };

    const start = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
      this.hasDrawn = true;
    };

    const stop = () => {
      this.isDrawing = false;
    };

    this.canvas.addEventListener('mousedown', start);
    this.canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stop);

    this.canvas.addEventListener('touchstart', start, { passive: false });
    this.canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stop);

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clear();
      });
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasDrawn = false;
  }

  toDataURL() {
    return this.hasDrawn ? this.canvas.toDataURL('image/png') : null;
  }
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.STORAGE_KEYS = STORAGE_KEYS;
  window.API = API;
  window.REPORT_STATUSES = REPORT_STATUSES;
  window.HEBREW_MONTHS_NAME = HEBREW_MONTHS_NAME;
  window.HEBREW_DAYS_NAME = HEBREW_DAYS_NAME;
  window.showToast = showToast;
  window.openModal = openModal;
  window.closeModal = closeModal;
}
