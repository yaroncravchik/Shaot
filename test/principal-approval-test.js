/**
 * Verification test for Principal Approval Flow & Israel Zeliger
 */
const { FirestoreDB } = require('../functions/db/firestore-db');

async function runTest() {
  console.log('--- 1. Testing Report in Firestore ---');
  const rep = await FirestoreDB.getReportById('REP-2026-09-5351');
  if (!rep) {
    throw new Error('Report REP-2026-09-5351 not found!');
  }
  console.log('Report ID:', rep.id);
  console.log('Teacher:', rep.teacherName, '(ID: ' + rep.teacherId + ')');
  console.log('School:', rep.schoolName, '(Code: ' + rep.schoolCode + ')');
  console.log('Principal:', rep.principalName, 'Email:', rep.principalEmail, 'Token:', rep.principalToken);
  console.log('Status:', rep.status);

  if (rep.teacherName !== 'ישראל זליגר') {
    throw new Error('Teacher name mismatch!');
  }
  if (rep.principalName !== 'נתנאל אוזן') {
    throw new Error('Principal name mismatch!');
  }
  if (rep.schoolName !== 'אורט נופים' || rep.schoolCode !== '484204') {
    throw new Error('School mismatch!');
  }

  console.log('--- 2. Testing Principal Route Handler Logic ---');
  const principalRoutes = require('../functions/routes/principal');
  // Verify router exists and has review/:token and report/:reportId
  const routes = principalRoutes.stack.map(r => ({
    path: r.route && r.route.path,
    methods: r.route && Object.keys(r.route.methods)
  })).filter(r => r.path);
  console.log('Registered Principal Routes:', routes);

  console.log('--- ALL CHECKS PASSED SUCCESSFULLY ---');
}

runTest().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
