const https = require('https');

const data = JSON.stringify({
  _subject: 'אישור דוח שעות פעילות של"ח – בדיקת מערכת',
  teacher: 'ישראל ישראלי',
  month: 'אוגוסט 2026',
  message: 'מצורף קישור ישיר לאישור דוח שעות של"ח: https://shalah-hours-2026.web.app/principal.html?token=PRINCIPAL_TOKEN_KFS_440123&reportId=REP-2026-08-01',
  review_link: 'https://shalah-hours-2026.web.app/principal.html?token=PRINCIPAL_TOKEN_KFS_440123&reportId=REP-2026-08-01',
  _captcha: 'false',
  _template: 'box'
});

const req = https.request('https://formsubmit.co/ajax/yaroncravchik@gmail.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', body));
});

req.on('error', err => console.error('Error:', err));
req.write(data);
req.end();
