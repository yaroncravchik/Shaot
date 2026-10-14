/**
 * Verification test for Cloud Firestore synchronization & authentication
 */

const express = require('express');
const { FirestoreDB } = require('../functions/db/firestore-db');
const authRoute = require('../functions/routes/auth');
const usersRoute = require('../functions/routes/users');

async function runTests() {
  console.log('🧪 Starting Cloud Firestore Sync & Auth verification tests...\n');

  // Set up test express app with routes
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoute);
  app.use('/api/users', usersRoute);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 1: Login with existing teacher from Firestore
    console.log('1️⃣ Testing login for existing teacher (012345678)...');
    let res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '012345678', password: '0501234567' })
    });
    let data = await res.json();
    if (!res.ok || !data.success || data.user.id !== '012345678') {
      throw new Error(`Teacher login failed: ${JSON.stringify(data)}`);
    }
    console.log(`   ✓ Login successful for: ${data.user.name} (Role: ${data.user.role})`);

    // Test 2: Login with wrong password should fail
    console.log('\n2️⃣ Testing login with wrong credentials (should fail)...');
    res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '012345678', password: 'wrongpassword' })
    });
    data = await res.json();
    if (res.status !== 401) {
      throw new Error(`Wrong password should return 401, got ${res.status}`);
    }
    console.log('   ✓ Rejected correctly with 401 Unauthorized');

    // Test 3: Create a brand new teacher directly in Firestore
    const testTeacherId = `test_teacher_${Date.now()}`;
    console.log(`\n3️⃣ Testing creation of new teacher (${testTeacherId}) into Cloud Firestore...`);
    const newTeacherPayload = {
      id: testTeacherId,
      id_number: testTeacherId,
      username: testTeacherId,
      password: 'SecurePass123',
      phone: '0509998877',
      name: 'מורה חדש לבדיקה',
      full_name: 'מורה חדש לבדיקה',
      role: 'teacher',
      email: `${testTeacherId}@school.org.il`,
      schoolName: 'תיכון ניסויי ענן',
      schoolCode: '998877',
      district: 'מרכז',
      supervisorId: '011111111',
      supervisorName: 'דוד לוי',
      jobScope: 100,
      consentSigned: true
    };

    res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTeacherPayload)
    });
    data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Failed to create user in Firestore: ${JSON.stringify(data)}`);
    }
    console.log(`   ✓ Successfully created new teacher in Firestore!`);

    // Test 4: Verify the newly created teacher can log in immediately from Firestore
    console.log(`\n4️⃣ Testing immediate login for the newly created teacher (${testTeacherId})...`);
    res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testTeacherId, password: 'SecurePass123' })
    });
    data = await res.json();
    if (!res.ok || !data.success || data.user.id !== testTeacherId) {
      throw new Error(`Immediate login for new teacher failed: ${JSON.stringify(data)}`);
    }
    console.log(`   ✓ New teacher logged in successfully: ${data.user.name} (${data.user.schoolName})`);

    // Test 5: Verify GET /api/users contains the new teacher
    console.log('\n5️⃣ Testing GET /api/users from Cloud Firestore...');
    res = await fetch(`${baseUrl}/api/users`);
    data = await res.json();
    if (!res.ok || !data.success || !Array.isArray(data.users)) {
      throw new Error(`Failed to fetch users: ${JSON.stringify(data)}`);
    }
    const found = data.users.find(u => u.id === testTeacherId);
    if (!found) {
      throw new Error(`Newly created teacher not found in GET /api/users`);
    }
    console.log(`   ✓ Found newly created teacher in list of ${data.users.length} total Firestore users`);

    // Test 6: Clean up the test teacher
    console.log(`\n6️⃣ Cleaning up test teacher (${testTeacherId}) from Cloud Firestore...`);
    res = await fetch(`${baseUrl}/api/users/${testTeacherId}`, {
      method: 'DELETE'
    });
    data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(`Failed to delete test teacher: ${JSON.stringify(data)}`);
    }
    console.log('   ✓ Test teacher cleaned up successfully from Firestore');

    console.log('\n✨ ALL 6 FIRESTORE SYNC & AUTH VERIFICATION TESTS PASSED SUCCESSFULLY! ✨\n');
  } finally {
    server.close();
  }
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
