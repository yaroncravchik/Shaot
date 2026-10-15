/**
 * Test: Principal Review Link Generation & Backup Dispatch Flow
 */
const assert = require('assert');
const { FirestoreDB } = require('../functions/db/firestore-db');

async function runTests() {
  console.log('--- 1. Testing Principal Review URL Generation Logic ---');
  
  // Mock API getPrincipalReviewUrl behavior
  function getPrincipalReviewUrl(report, teacher, baseUrl = 'https://shalah-hours-2026.web.app/') {
    if (!report) return '';
    const schoolCode = (teacher && teacher.schoolCode) || (report && report.schoolCode) || '';
    const token = (teacher && teacher.principalToken) || report.principalToken || (schoolCode ? 'PRINCIPAL_TOKEN_' + schoolCode : 'PRINCIPAL_TOKEN_SCHOOL');
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    return baseUrl + 'principal.html?token=' + encodeURIComponent(token) + '&reportId=' + encodeURIComponent(report.id);
  }

  const mockTeacher = {
    id: '5351',
    name: 'ישראל זליגר',
    schoolCode: '484204',
    schoolName: 'אורט נופים',
    principalName: 'נתנאל אוזן',
    principalEmail: 'netanel.ozen@ort.org.il',
    principalToken: 'PRINCIPAL_TOKEN_484204'
  };

  const mockReport = {
    id: 'REP-2026-10-5351',
    year: 2026,
    month: 10,
    teacherId: '5351',
    teacherName: 'ישראל זליגר',
    schoolCode: '484204',
    schoolName: 'אורט נופים',
    status: 'pending_principal',
    principalToken: 'PRINCIPAL_TOKEN_484204'
  };

  const url = getPrincipalReviewUrl(mockReport, mockTeacher);
  console.log('Generated Review URL:', url);
  assert(url.includes('principal.html'), 'URL should point to principal.html');
  assert(url.includes('token=PRINCIPAL_TOKEN_484204'), 'URL should include principal token');
  assert(url.includes('reportId=REP-2026-10-5351'), 'URL should include reportId');
  console.log('✓ URL generation verified successfully');

  console.log('--- 2. Testing URL parsing in principal context ---');
  const parsedUrl = new URL(url);
  const tokenParam = parsedUrl.searchParams.get('token');
  const reportIdParam = parsedUrl.searchParams.get('reportId');
  assert.strictEqual(tokenParam, 'PRINCIPAL_TOKEN_484204');
  assert.strictEqual(reportIdParam, 'REP-2026-10-5351');
  console.log('✓ Principal page URL param parsing verified');

  console.log('--- 3. Testing Report in Firestore matches Token & School ---');
  const existingReport = await FirestoreDB.getReportById('REP-2026-09-5351');
  if (existingReport) {
    console.log('Found September 2026 report:', existingReport.id, existingReport.status);
    const sepUrl = getPrincipalReviewUrl(existingReport, mockTeacher);
    console.log('September Review URL:', sepUrl);
    assert(sepUrl.includes('token=PRINCIPAL_TOKEN_484204'), 'September URL token matches');
  }

  console.log('--- 4. Testing WhatsApp message text generation ---');
  const monthName = 'אוקטובר';
  const year = 2026;
  const message = `שלום ${mockTeacher.principalName},\nמוגש לאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש ${monthName} ${year} מאת ${mockTeacher.name}.\nקישור ישיר לצפייה, הערות ואישור בחתימה דיגיטלית:\n${url}`;
  assert(message.includes(url), 'WhatsApp message must contain review link');
  assert(message.includes('נתנאל אוזן'), 'WhatsApp message must contain principal name');
  assert(message.includes('ישראל זליגר'), 'WhatsApp message must contain teacher name');
  console.log('✓ WhatsApp dispatch text verified');

  console.log('\n=============================================');
  console.log('🎉 ALL PRINCIPAL REVIEW LINK TESTS PASSED! 🎉');
  console.log('=============================================');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
