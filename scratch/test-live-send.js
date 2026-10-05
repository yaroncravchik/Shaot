const https = require('https');

const data = JSON.stringify({
  targetEmail: 'shalah.system.reports@gmail.com',
  principalName: 'רונית שחר',
  teacherName: 'ישראל ישראלי',
  teacherId: '012345678',
  monthName: 'אוגוסט',
  year: 2026,
  schoolName: 'תיכון יצחק רבין כפר סבא',
  schoolCode: '440123',
  totalOvertime: 14,
  reviewUrl: 'https://shalah-hours-2026.web.app/principal.html?token=PRINCIPAL_TOKEN_KFS_440123&reportId=REP-2026-08-01'
});

console.log('Sending request to https://shalah-hours-2026.web.app/api/reports/REP-2026-08-01/send-principal-email ...');

const req = https.request('https://shalah-hours-2026.web.app/api/reports/REP-2026-08-01/send-principal-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Headers:', res.headers);
    console.log('Response Body:', body);
  });
});

req.on('error', err => console.error('Request Error:', err));
req.write(data);
req.end();
