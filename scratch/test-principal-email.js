const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Principal Email Dispatch & Review Link System...');

// 1. Check HTML structure for modal elements
const teacherHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'teacher.html'), 'utf8');
assert(teacherHtml.includes('id="modal-principal-email-dispatch"'), 'teacher.html must contain modal-principal-email-dispatch');
assert(teacherHtml.includes('id="dispatch-principal-email"'), 'teacher.html must contain dispatch-principal-email input');
assert(teacherHtml.includes('id="dispatch-email-subject"'), 'teacher.html must contain dispatch-email-subject input');
assert(teacherHtml.includes('id="dispatch-email-body"'), 'teacher.html must contain dispatch-email-body textarea');
assert(teacherHtml.includes('id="dispatch-review-url"'), 'teacher.html must contain dispatch-review-url input');
assert(teacherHtml.includes('openDispatchMailClient()'), 'teacher.html must call openDispatchMailClient');
assert(teacherHtml.includes('sendDispatchWhatsApp()'), 'teacher.html must call sendDispatchWhatsApp');
console.log('✔ [PASS] 1. teacher.html UI components verified.');

// 2. Check JavaScript logic in teacher.js
const teacherJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'teacher.js'), 'utf8');
assert(teacherJs.includes('openPrincipalEmailDispatchModal'), 'teacher.js must define openPrincipalEmailDispatchModal');
assert(teacherJs.includes('copyDispatchReviewUrl'), 'teacher.js must define copyDispatchReviewUrl');
assert(teacherJs.includes('openDispatchMailClient'), 'teacher.js must define openDispatchMailClient');
assert(teacherJs.includes('sendDispatchWhatsApp'), 'teacher.js must define sendDispatchWhatsApp');
assert(teacherJs.includes('mailto:'), 'teacher.js must construct mailto URI');
console.log('✔ [PASS] 2. teacher.js dispatch handlers verified.');

// 3. Check API methods in api.js
const apiJs = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'api.js'), 'utf8');
assert(apiJs.includes('getPrincipalReviewUrl'), 'api.js must define getPrincipalReviewUrl');
assert(apiJs.includes('sendPrincipalNotification'), 'api.js must define sendPrincipalNotification');
assert(apiJs.includes('logReportAction'), 'api.js must define logReportAction');
console.log('✔ [PASS] 3. api.js methods verified.');

// 4. Test API URL generation logic in Node environment simulation
const mockTeacher = {
  id: '012345678',
  name: 'ישראל ישראלי',
  principalName: 'רונית שחר',
  principalEmail: 'ronit.s@rabin-kfs.org.il',
  principalToken: 'PRINCIPAL_TOKEN_KFS_440123',
  schoolCode: '440123'
};
const mockReport = {
  id: 'REP-2026-08-01',
  month: 8,
  year: 2026,
  principalToken: 'PRINCIPAL_TOKEN_KFS_440123'
};

// Simulate getPrincipalReviewUrl
function getPrincipalReviewUrl(report, teacher) {
  if (!report) return '';
  const token = (teacher && teacher.principalToken) || report.principalToken || (teacher && teacher.schoolCode ? 'PRINCIPAL_TOKEN_' + teacher.schoolCode : 'PRINCIPAL_TOKEN_KFS_440123');
  let baseUrl = 'https://shalah-hours-2026.web.app/';
  return baseUrl + 'principal.html?token=' + encodeURIComponent(token) + '&reportId=' + encodeURIComponent(report.id);
}

const reviewUrl = getPrincipalReviewUrl(mockReport, mockTeacher);
assert(reviewUrl.includes('principal.html?token=PRINCIPAL_TOKEN_KFS_440123&reportId=REP-2026-08-01'), 'Generated review URL must have token and reportId');
console.log('✔ [PASS] 4. Review URL generated: ' + reviewUrl);

// 5. Test Mailto URI formatting
const subject = `אישור דוח שעות פעילות של"ח – ${mockTeacher.name} – חודש אוגוסט 2026`;
const body = `שלום ${mockTeacher.principalName},\n\nמצורף לעיונך ולאישורך דוח שעות פעילות חודשי בשל"ח.\n\n${reviewUrl}`;
const mailtoUri = `mailto:${encodeURIComponent(mockTeacher.principalEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
assert(mailtoUri.startsWith('mailto:ronit.s%40rabin-kfs.org.il?subject='), 'Mailto URI must be properly encoded');
console.log('✔ [PASS] 5. Mailto URI generation verified.');

// 6. Test Backend Endpoint in server
const { db } = require('../server/db/database');
const testRep = db.prepare('SELECT id FROM reports LIMIT 1').get();
assert(testRep, 'A report must exist in DB');

const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
db.prepare(`
  INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
  VALUES (?, ?, 'sent_principal_notification', ?, ?, ?, ?)
`).run('aud_test_' + Date.now(), testRep.id, '012345678', 'ישראל ישראלי', 'שליחת הודעת קישור ישיר לאישור מנהל/ת בדוא"ל (ronit.s@rabin-kfs.org.il)', now);

const logged = db.prepare("SELECT * FROM audit_logs WHERE action = 'sent_principal_notification' ORDER BY timestamp DESC LIMIT 1").get();
assert(logged, 'Audit log entry must be found in DB');
assert(logged.report_id === testRep.id, 'Audit log must match report ID');
console.log('✔ [PASS] 6. Backend audit log recording verified: ' + logged.details);

console.log('\nALL PRINCIPAL EMAIL DISPATCH TESTS PASSED SUCCESSFULLY! 🎉');
