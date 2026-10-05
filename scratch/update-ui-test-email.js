const fs = require('fs');

// 1. Update profile.html
let profileHtml = fs.readFileSync('public/profile.html', 'utf8');
const oldProfEmail = /<input type="email" id="prof-principal-email"[^>]*>/;
if (oldProfEmail.test(profileHtml)) {
  profileHtml = profileHtml.replace(oldProfEmail, `
    <div style="display:flex; gap:8px; align-items:center;">
      <input type="email" id="prof-principal-email" class="form-control" required placeholder="principal@school.gov.il" style="direction:ltr;">
      <button type="button" id="btn-test-principal-email" class="btn btn-outline-primary" style="white-space:nowrap; flex-shrink:0;" onclick="testSendPrincipalEmail()" title="שליחת מייל ניסיון לבדיקה">
        🧪 שלח מייל בדיקה
      </button>
    </div>
    <span class="form-text">לכתובת זו יישלח קישור ישיר ומאובטח לאישור הדוח החודשי. מומלץ ללחוץ על "שלח מייל בדיקה" כדי לוודא הגעה.</span>
  `);
  fs.writeFileSync('public/profile.html', profileHtml, 'utf8');
  console.log('Updated public/profile.html');
}

// 2. Update profile.js to add testSendPrincipalEmail
let profileJs = fs.readFileSync('public/js/profile.js', 'utf8');
if (!profileJs.includes('testSendPrincipalEmail')) {
  profileJs += `

async function testSendPrincipalEmail() {
  const emailInput = document.getElementById('prof-principal-email');
  const pNameInput = document.getElementById('prof-principal-name');
  const email = emailInput ? emailInput.value.trim() : '';
  const pName = pNameInput ? pNameInput.value.trim() : 'מנהל/ת בית הספר';

  if (!email || !email.includes('@')) {
    showToast('נא להזין כתובת דוא"ל תקינה של המנהל/ת', 'warning');
    if (emailInput) emailInput.focus();
    return;
  }

  const btn = document.getElementById('btn-test-principal-email');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div><span>שולח...</span>';
  }

  try {
    const res = await API.sendTestEmail(email, pName);
    if (res.success) {
      showToast(\`מייל בדיקה נשלח בהצלחה אל: \${email}\`, 'success');
      alert(\`✅ מייל בדיקה נשלח בהצלחה!\\n\\nנשלחה הודעת ניסיון לכתובת:\\n\${email}\\n\\nנא לבדוק את תיבת הדואר הנכנס (והספאם/דואר זבל במידת הצורך).\`);
    } else {
      showToast(\`שגיאה בשליחת מייל בדיקה: \${res.error}\`, 'error');
      alert(\`❌ שגיאה בשליחת מייל בדיקה:\\n\${res.error}\`);
    }
  } catch (err) {
    showToast(err.message || 'שגיאה בשליחת בדיקה', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🧪 שלח מייל בדיקה';
    }
  }
}
window.testSendPrincipalEmail = testSendPrincipalEmail;
`;
  fs.writeFileSync('public/js/profile.js', profileJs, 'utf8');
  console.log('Updated public/js/profile.js');
}

// 3. Update teacher.html & teacher.js: add quick test email button to the modal box too!
let teacherHtml = fs.readFileSync('public/teacher.html', 'utf8');
if (teacherHtml.includes('id="modal-principal-email-display"')) {
  teacherHtml = teacherHtml.replace(
    '<button type="button" class="btn btn-sm btn-outline-primary" onclick="promptEditPrincipalEmail()" title="שינוי כתובת מייל מנהל/ת לקבלת הדוח">\n                ✏️ עריכת מייל מנהל/ת\n              </button>',
    `<div class="flex gap-xs">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="promptEditPrincipalEmail()" title="שינוי כתובת מייל מנהל/ת לקבלת הדוח">
                  ✏️ עריכת מייל
                </button>
                <button type="button" id="btn-modal-test-email" class="btn btn-sm btn-secondary" onclick="testSendFromTeacherModal()" title="שליחת מייל ניסיון מידי">
                  🧪 שלח בדיקה
                </button>
              </div>`
  );
  fs.writeFileSync('public/teacher.html', teacherHtml, 'utf8');
  console.log('Updated public/teacher.html');
}

// 4. Update teacher.js to add testSendFromTeacherModal
let teacherJs = fs.readFileSync('public/js/teacher.js', 'utf8');
if (!teacherJs.includes('testSendFromTeacherModal')) {
  teacherJs += `

async function testSendFromTeacherModal() {
  const pEmail = (currentTeacher && (currentTeacher.principalEmail || currentTeacher.principal_email)) || 'shalah.system.reports@gmail.com';
  const pName = (currentTeacher && currentTeacher.principalName) || 'מנהל/ת בית הספר';

  const btn = document.getElementById('btn-modal-test-email');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div>';
  }

  try {
    const res = await API.sendTestEmail(pEmail, pName);
    if (res.success) {
      showToast(\`מייל בדיקה נשלח בהצלחה אל: \${pEmail}\`, 'success');
      alert(\`✅ מייל בדיקה נשלח בהצלחה!\\n\\nהודעת ניסיון נשלחה לכתובת המנהל/ת:\\n\${pEmail}\\n\\nבאפשרותך לבדוק את תיבת הדואר הנכנס כעת.\`);
    } else {
      showToast(\`שגיאה בשליחת מייל בדיקה: \${res.error}\`, 'error');
      alert(\`❌ שגיאה בשליחת מייל בדיקה:\\n\${res.error}\`);
    }
  } catch (err) {
    showToast(err.message || 'שגיאה בשליחת בדיקה', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🧪 שלח בדיקה';
    }
  }
}
window.testSendFromTeacherModal = testSendFromTeacherModal;
`;
  fs.writeFileSync('public/js/teacher.js', teacherJs, 'utf8');
  console.log('Updated public/js/teacher.js');
}
