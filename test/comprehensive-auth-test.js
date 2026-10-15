const assert = require('assert');
const { FirestoreDB } = require('../functions/db/firestore-db');

async function runTests() {
  console.log('=== Running Comprehensive Auth Regression Tests ===\n');

  const testCases = [
    { label: '1. Parenthesized name without nickname: ציקי גד / 1234', user: 'ציקי גד', pass: '1234', expectUser: '544702103' },
    { label: '2. Parenthesized name with only nickname: צבי גד / 1234', user: 'צבי גד', pass: '1234', expectUser: '544702103' },
    { label: '3. Full parenthesized name: ציקי (צבי) גד / 1234', user: 'ציקי (צבי) גד', pass: '1234', expectUser: '544702103' },
    { label: '4. Redundant internal spaces: מוטי  סעדה / 1234', user: 'מוטי  סעדה', pass: '1234', expectUser: '502472002' },
    { label: '5. Non-breaking space (\\u00A0): מוטי\\u00A0סעדה / 1234', user: 'מוטי\u00A0סעדה', pass: '1234', expectUser: '502472002' },
    { label: '6. Phone formatted with 2 dashes: 050-247-2002 / 1234', user: '050-247-2002', pass: '1234', expectUser: '502472002' },
    { label: '7. Phone formatted with parens: (050) 2472002 / 1234', user: '(050) 2472002', pass: '1234', expectUser: '502472002' },
    { label: '8. Phone with international prefix: +972 50 247 2002 / 1234', user: '+972 50 247 2002', pass: '1234', expectUser: '502472002' },
    { label: '9. Last 4 digits of phone when phone field in DB is empty: 502472002 / 2002', user: '502472002', pass: '2002', expectUser: '502472002' },
    { label: '10. Supervisor by name: דודו זינגר / 1234', user: 'דודו זינגר', pass: '1234', expectUser: 'דודו' },
    { label: '11. Supervisor by short ID: דודו / 1234', user: 'דודו', pass: '1234', expectUser: 'דודו' },
    { label: '12. Supervisor by phone: 054-7500384 / 1234', user: '054-7500384', pass: '1234', expectUser: 'דודו' },
    { label: '13. Admin by name: רונן / 1234', user: 'רונן', pass: '1234', expectUser: 'רונן' },
    { label: '14. Master admin: admin / Yaron111', user: 'admin', pass: 'Yaron111', expectUser: 'admin' },
    { label: '15. Teacher with default password: 012345678 / 1234', user: '012345678', pass: '1234', expectUser: '012345678' },
    { label: '16. Teacher with phone as password: 012345678 / 0501234567', user: '012345678', pass: '0501234567', expectUser: '012345678' },
    { label: '17. Teacher with last 4 digits of phone: 012345678 / 4567', user: '012345678', pass: '4567', expectUser: '012345678' },
    { label: '18. Teacher with last 4 digits of ID: 012345678 / 5678', user: '012345678', pass: '5678', expectUser: '012345678' }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const u = await FirestoreDB.getUserByCredentials(tc.user, tc.pass);
      if (u && (String(u.id) === String(tc.expectUser) || String(u.id_number) === String(tc.expectUser))) {
        console.log(`✅ PASS: ${tc.label}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${tc.label} (Got: ${u ? u.id + ' (' + u.name + ')' : 'null'})`);
        failed++;
      }
    } catch (err) {
      console.log(`❌ ERROR: ${tc.label} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
