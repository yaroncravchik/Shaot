/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * API Layer, Mock Database, Calendar/Holiday Service, Excel Export & Utilities
 */

const STORAGE_KEYS = {
 USERS: 'shalah_users_v2',
 REPORTS: 'shalah_reports_v2',
 CURRENT_USER: 'shalah_current_user_v2',
 AUDIT_LOGS: 'shalah_audit_logs_v2'
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
 id: '000000001',
 phone: '0500000000',
 name: 'רונן - ממונה ארצי',
 role: 'admin',
 email: 'ronen.shalah@education.gov.il'
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
 { day: 4, overtime: 4, overtimeReason: 'סיור של"ח הכנה לנחל אלכסנדר', grade: 'ט\'2', desc: 'הדרכת שטח וניווט' },
 { day: 11, overtime: 4, overtimeReason: 'יום שדה - פארק השרון', grade: 'י\'1', desc: 'סיור בוטניקה ומורשת' },
 { day: 18, overtime: 6, overtimeReason: 'מסע שנתי - הרי ירושלים', grade: 'יא\'3', desc: 'ליווי וניהול מסע' },
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
 { day: 7, overtime: 6, overtimeReason: 'סמינר מנהיגות מש"צים', grade: 'ט\'-י\'', desc: 'הכשרת מש"צים צעירים' },
 { day: 14, overtime: 5, overtimeReason: 'הכנת מסלול - כרמל', grade: 'צוות', desc: 'בדיקת בטיחות מסלול' },
 { day: 21, overtime: 5, overtimeReason: 'מחנה קיץ של"ח', grade: 'י\'2', desc: 'הדרכת שדה מעשית' }
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
 { day: 5, overtime: 4, overtimeReason: 'יום שדה - נחל פולג', grade: 'ט\'1', desc: 'סיור ופעילות גיאוגרפית' },
 { day: 12, overtime: 5, originalOvertime: 8, overtimeReason: 'סיור הכנה להרי ירושלים', grade: 'ט\'3', desc: 'הכנת מסלול', supervisorEdited: true, editNote: 'תוקן מ-8 שעות ל-5 שעות ע"י המנחה דוד לוי' }
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
 { day: 11, overtime: 5, overtimeReason: 'יום שדה - ירקון', grade: 'י\'2', desc: 'סיור מקורות הירקון' },
 { day: 18, overtime: 5, overtimeReason: 'פעילות ערב של"ח', grade: 'ט\'1-ט\'3', desc: 'ערב מורשת ואש' }
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
function generateSampleDaysData(year, month, weeklySchedule = {}, fieldDays = [], overrides = []) {
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
 description: ovr.desc || '',
 supervisorEdited: ovr.supervisorEdited || false,
 editNote: ovr.editNote || ''
 });
 }

 return days;
}

// ==========================================================================
// 3. Database Initializer & Local Storage Wrapper
// ==========================================================================
function initStorage() {
 if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
 localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(getInitialSeedUsers()));
 }
 if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
 localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(getInitialSeedReports()));
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
 user: `${adminUser.name} (ממונה ארצי)`,
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
 user: `${adminUser.name} (ממונה ארצי)`,
 action: `החזרה ל${targetRole === 'supervisor' ? 'מנחה' : 'מורה'}: "${remarks}"`
 });

 return this.saveReport(report);
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
 document.body.style.overflow = 'hidden';
 }
}

function closeModal(modalId) {
 const modal = document.getElementById(modalId);
 if (modal) {
 modal.classList.remove('show');
 document.body.style.overflow = '';
 }
}

// Global modal backdrop and ESC key dismiss
document.addEventListener('keydown', (e) => {
 if (e.key === 'Escape') {
 const openModals = document.querySelectorAll('.modal-backdrop.show');
 openModals.forEach(m => m.classList.remove('show'));
 document.body.style.overflow = '';
 }
});

document.addEventListener('click', (e) => {
 if (e.target.classList.contains('modal-backdrop')) {
 e.target.classList.remove('show');
 document.body.style.overflow = '';
 }
});

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
 'תעודת זהות',
 'שם בית ספר',
 'סמל מוסד',
 'מחוז',
 'רשות מקומית',
 'מנחה מחוזי',
 'סטטוס',
 'שעות קבועות',
 'שעות היעדרות',
 'שעות נוספות',
 'סך שעות לתשלום',
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
 r.totalFixedHours || 0,
 r.totalAbsenceHours || 0,
 r.totalOvertimeHours || 0,
 r.totalPayableHours || 0,
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

function generateMockHash(report) {
  const str = `${report.id}-${report.totalPayableHours}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0').slice(0, 32);
}

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
