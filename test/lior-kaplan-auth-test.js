const assert = require('assert');
const { FirestoreDB, db } = require('../functions/db/firestore-db');

async function testLiorKaplan() {
  console.log('--- Testing Lior Kaplan Authentication & Sanitization ---');

  // 1. Verify Firestore document is clean
  const doc = await db.collection('users').doc('547618877').get();
  assert(doc.exists, 'Clean document 547618877 must exist in Firestore');
  const data = doc.data();
  assert.strictEqual(data.id, '547618877');
  assert.strictEqual(data.id.length, 9, 'ID must be exactly 9 characters long');
  assert.strictEqual(data.name, 'ליאור קפלן');
  assert(data.password, 'Password must exist');

  // 2. Test login with standard credentials: ID + password (1234)
  const user1 = await FirestoreDB.getUserByCredentials('547618877', '1234');
  assert(user1, 'User must authenticate with ID and password 1234');
  assert.strictEqual(user1.name, 'ליאור קפלן');
  console.log('✔ Case 1 Passed: Standard login with 547618877 / 1234');

  // 3. Test login with invisible Unicode characters (BiDi LTR / RTL isolates)
  const badId = '\u2066547618877\u2069';
  const badPass = '\u20661234\u2069';
  const user2 = await FirestoreDB.getUserByCredentials(badId, badPass);
  assert(user2, 'User must authenticate even if input contains invisible Unicode directional marks');
  assert.strictEqual(user2.name, 'ליאור קפלן');
  console.log('✔ Case 2 Passed: BiDi isolated input automatically sanitized');

  // 4. Test login with ID as password fallback (547618877 / 547618877)
  const user3 = await FirestoreDB.getUserByCredentials('547618877', '547618877');
  assert(user3, 'User must authenticate with ID used as password fallback');
  assert.strictEqual(user3.name, 'ליאור קפלן');
  console.log('✔ Case 3 Passed: ID fallback as password allows seamless login');

  // 5. Test wrong password
  const user4 = await FirestoreDB.getUserByCredentials('547618877', 'wrongpassword');
  assert.strictEqual(user4, null, 'Wrong password must be rejected');
  console.log('✔ Case 4 Passed: Wrong password rejected properly');

  console.log('\n🎉 ALL LIOR KAPLAN AUTHENTICATION TESTS PASSED!');
}

testLiorKaplan().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
