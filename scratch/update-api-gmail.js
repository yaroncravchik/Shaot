const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
let apiCode = fs.readFileSync(apiPath, 'utf8');

const newDispatchSection = `    // 1. Dispatch real email via Gmail backend / Cloud Functions
    try {
      if (typeof fetch !== 'undefined' && principalEmail && principalEmail.includes('@')) {
        const payload = {
          targetEmail: principalEmail,
          principalName,
          teacherName,
          teacherId,
          monthName,
          year,
          schoolName: (teacher && teacher.schoolName) || report.schoolName || '',
          schoolCode: (teacher && teacher.schoolCode) || report.schoolCode || '',
          totalOvertime: report.totalOvertimeHours || 0,
          reviewUrl
        };

        const res = await fetch(\`/api/reports/\${encodeURIComponent(report.id)}/send-principal-email\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (res && res.ok) {
          emailSentSuccessfully = true;
        }
      }
    } catch (e) {
      console.warn('Backend Gmail dispatch notice:', e);
    }`;

const oldDispatchRegex = /\/\/ 1\. Attempt automated direct background email dispatch[\s\S]*?console\.warn\('Background email dispatch notice:', e\);\s*\}/;

if (oldDispatchRegex.test(apiCode)) {
  apiCode = apiCode.replace(oldDispatchRegex, newDispatchSection);
  fs.writeFileSync(apiPath, apiCode, 'utf8');
  console.log('Successfully updated API dispatch in public/js/api.js');
} else {
  console.error('oldDispatchRegex not found in api.js');
}
