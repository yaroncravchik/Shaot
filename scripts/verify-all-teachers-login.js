const { FirestoreDB } = require('../functions/db/firestore-db');

async function verifyLogins() {
  const teachers = [
    { id: '012345678', pass: '0501234567', name: 'ישראל ישראלי' },
    { id: '023456789', pass: '0522345678', name: 'שרה כהן' },
    { id: '034567890', pass: '0543456789', name: 'אבי מזרחי' },
    { id: '023456781', pass: '0523456789', name: 'מיכל לוי' },
    { id: '034567812', pass: '0541234567', name: 'דניאל כהן' },
    { id: '034567891', pass: '0533456789', name: 'דנה כהן' },
    { id: 'test_tch_user', pass: '0503334455', name: 'מורה בדיקה' }
  ];

  console.log('Testing authentication against Firestore for all 7 teachers:\n');
  let successCount = 0;

  for (const t of teachers) {
    const user = await FirestoreDB.getUserByCredentials(t.id, t.pass);
    if (user) {
      console.log(`✅ [SUCCESS] Teacher ${t.name} (ID: ${t.id}) authenticated! Role: ${user.role}, School: ${user.schoolName}`);
      successCount++;
    } else {
      console.error(`❌ [FAILURE] Teacher ${t.name} (ID: ${t.id}) could NOT authenticate!`);
    }
  }

  console.log(`\nResult: ${successCount}/${teachers.length} teachers successfully authenticated against Cloud Firestore.`);
  process.exit(successCount === teachers.length ? 0 : 1);
}

verifyLogins().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
