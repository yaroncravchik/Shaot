const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
let content = fs.readFileSync(apiPath, 'utf8');

const regex = /[ \t]*submitReportToPrincipal\(reportId, user, checkDate = new Date\(\)\) \{/;

const insertStr = `  getPrincipalReviewUrl(report, teacher) {
    if (!report) return '';
    const token = (teacher && teacher.principalToken) || report.principalToken || (teacher && teacher.schoolCode ? 'PRINCIPAL_TOKEN_' + teacher.schoolCode : 'PRINCIPAL_TOKEN_KFS_440123');
    let baseUrl = '';
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')) {
      const path = window.location.pathname || '';
      const basePath = path.substring(0, path.lastIndexOf('/') + 1);
      baseUrl = window.location.origin + basePath;
    } else {
      baseUrl = 'https://shalah-hours-2026.web.app/';
    }
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    return baseUrl + 'principal.html?token=' + encodeURIComponent(token) + '&reportId=' + encodeURIComponent(report.id);
  },

  logReportAction(reportId, user, actionText) {
    const report = this.getReportById(reportId);
    if (!report) return null;
    report.auditHistory = report.auditHistory || [];
    report.auditHistory.push({
      date: formatDateTime(new Date()),
      user: user ? (user.name + ' (' + (user.role === 'teacher' ? 'מורה' : user.role === 'principal' ? 'מנהל/ת' : user.role === 'supervisor' ? 'מנחה' : 'משתמש') + ')') : 'מערכת',
      action: actionText
    });
    return this.saveReport(report);
  },

  sendPrincipalNotification(reportId, targetEmail, method = 'email') {
    const report = this.getReportById(reportId);
    if (!report) throw new Error('דוח לא נמצא');
    const actionText = method === 'whatsapp' 
      ? 'שליחת הודעת קישור לאישור מנהל/ת בוואטסאפ'
      : 'שליחת הודעת קישור לאישור מנהל/ת בדוא"ל (' + (targetEmail || 'לפי פרופיל') + ')';
    return this.logReportAction(reportId, Auth.getCurrentUser(), actionText);
  },

  submitReportToPrincipal(reportId, user, checkDate = new Date()) {`;

if (regex.test(content)) {
  content = content.replace(regex, insertStr);
  fs.writeFileSync(apiPath, content, 'utf8');
  console.log('Successfully updated public/js/api.js');
} else {
  console.error('Regex did not match');
  process.exit(1);
}
