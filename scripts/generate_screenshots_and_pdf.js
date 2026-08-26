const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const screenshotsDir = path.join(__dirname, '../screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

console.log('=== Step 1: Capturing High-Res Screenshots ===');

const pages = [
  { name: '01_login.png', url: 'http://localhost:5000/index.html', width: 1280, height: 850 },
  { name: '02_profile.png', url: 'http://localhost:5000/profile.html', width: 1280, height: 1000 },
  { name: '03_teacher.png', url: 'http://localhost:5000/teacher.html', width: 1280, height: 1100 },
  { name: '04_principal.png', url: 'http://localhost:5000/principal.html?token=token-sec-rabin-202608-mlevi', width: 1280, height: 1100 },
  { name: '05_supervisor.png', url: 'http://localhost:5000/supervisor.html', width: 1280, height: 1100 },
  { name: '06_admin.png', url: 'http://localhost:5000/admin.html', width: 1280, height: 1100 },
  { name: '07_verify.png', url: 'http://localhost:5000/verify.html?sig=SHALAH-202606-A17F9D', width: 1280, height: 950 }
];

for (const p of pages) {
  const outPath = path.join(screenshotsDir, p.name);
  console.log(`Capturing ${p.name} from ${p.url}...`);
  try {
    execSync(`"${edgePath}" --headless --disable-gpu --window-size=${p.width},${p.height} --screenshot="${outPath}" "${p.url}"`, { stdio: 'ignore' });
    console.log(`✓ Saved ${p.name}`);
  } catch (err) {
    console.error(`Failed to capture ${p.name}:`, err.message);
  }
}

console.log('\n=== Step 2: Creating HTML Guide for Non-Technical Testers ===');

function base64Image(filename) {
  const filePath = path.join(screenshotsDir, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath).toString('base64');
    return `data:image/png;base64,${data}`;
  }
  return '';
}

const htmlContent = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>מדריך מלא לבודק – מערכת דיווח שעות פעילות חודשית של"ח</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Rubik', sans-serif;
      color: #0c3058;
      background-color: #ffffff;
      line-height: 1.6;
      font-size: 13px;
    }
    .page {
      page-break-after: always;
      padding-bottom: 20px;
    }
    .page:last-child {
      page-break-after: auto;
    }
    .cover-header {
      background: linear-gradient(135deg, #007bff 0%, #004085 100%);
      color: #ffffff;
      padding: 40px 30px;
      border-radius: 12px;
      margin-bottom: 25px;
      text-align: center;
    }
    .cover-title {
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .cover-subtitle {
      font-size: 16px;
      opacity: 0.95;
      margin-bottom: 15px;
    }
    .cover-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #007bff;
      border-bottom: 2px solid #dee2e6;
      padding-bottom: 6px;
      margin-top: 25px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 14px;
    }
    .card-title {
      font-weight: 700;
      font-size: 14px;
      color: #0c3058;
      margin-bottom: 6px;
    }
    .role-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 15px;
    }
    .role-box {
      border: 1px solid #8dcdff;
      background: #f0f9fa;
      padding: 12px;
      border-radius: 8px;
    }
    .role-name {
      font-weight: 700;
      color: #004085;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .screenshot-container {
      margin: 12px 0;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      background: #ffffff;
      text-align: center;
    }
    .screenshot-img {
      width: 100%;
      height: auto;
      display: block;
    }
    .screenshot-caption {
      background: #f4f4f4;
      padding: 6px 12px;
      font-size: 11px;
      color: #6c757d;
      border-top: 1px solid #dee2e6;
      font-weight: 500;
    }
    .steps-list {
      padding-right: 20px;
      margin-bottom: 12px;
    }
    .steps-list li {
      margin-bottom: 6px;
    }
    .badge-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-blue { background: #e3f2fd; color: #0d47a1; }
    .badge-green { background: #e8f5e9; color: #1b5e20; }
    .badge-red { background: #ffebee; color: #b71c1c; }
    .badge-yellow { background: #fff8e1; color: #f57f17; }
    .info-callout {
      background: #e8f4fd;
      border-right: 4px solid #007bff;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      margin: 12px 0;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 12px;
    }
    th, td {
      border: 1px solid #dee2e6;
      padding: 6px 10px;
      text-align: right;
    }
    th {
      background: #f1f3f5;
      font-weight: 700;
      color: #0c3058;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: #6c757d;
      margin-top: 20px;
      border-top: 1px solid #eaeaea;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- עמוד 1: שער, מבוא וסקירה כללית -->
  <div class="page">
    <div class="cover-header">
      <div class="cover-title">מערכת דיווח שעות פעילות חודשית של"ח</div>
      <div class="cover-subtitle">מדריך מפורט ואינטראקטיבי לבודק (Reviewer & Tester Manual)</div>
      <div class="cover-badge">גרסה 2.1 מעודכנת • שפת עיצוב Civic Clarity • משרד החינוך</div>
    </div>

    <div class="card">
      <div class="card-title">📖 על המערכת – במילים פשוטות</div>
      <p>
        מערכת דיווח שעות של"ח (שדה, לאום, חברה) היא מערכת מקוונת המאפשרת למורי של"ח לדווח על שעות הפעילות שלהם מדי חודש (שעות הוראה קבועות, ימי שדה, שעות נוספות והיעדרויות).
        המערכת מייצרת תהליך אישור מובנה ומוסדר העובר דרך <strong>מנהל/ת בית הספר</strong>, לאחר מכן דרך <strong>המנחה המחוזי</strong> (שיכול לתקן שעות ישירות), ולבסוף מגיע ל<strong>ממונה הארצי (רונן)</strong> לאישור סופי לתשלום והנפקת חתימה דיגיטלית מאובטחת.
      </p>
    </div>

    <div class="section-title">👥 ארבעת בעלי התפקידים במערכת</div>
    <div class="role-grid">
      <div class="role-box">
        <div class="role-name">1. מורה של"ח (Teacher)</div>
        <p>ממלא דוח חודשי, שומר טיוטה, מצרף אישורים (עד 10MB) ומגיש למנהל. רואה חיווי שעות ועריכות מנחה.</p>
      </div>
      <div class="role-box">
        <div class="role-name">2. מנהל/ת בית ספר (Principal)</div>
        <p>מקבל קישור מאובטח ישיר למייל (ללא צורך בלוגין), בודק את הדוח וחותם עליו בלחיצה אחת או מחזיר עם הערות.</p>
      </div>
      <div class="role-box">
        <div class="role-name">3. מנחה מחוזי (Supervisor)</div>
        <p>רואה את כל מורי המחוז, עורך שעות ישירות בטבלה (מודגשות באדום), מוסיף הערות, מאשר ומייצא לאקסל.</p>
      </div>
      <div class="role-box">
        <div class="role-name">4. ממונה ארצי - רונן (Super Admin)</div>
        <p>רואה את כלל הדוחות בארץ, מסנן ומבצע אישור סופי לתשלום המנפיק חתימה דיגיטלית RSA-2048.</p>
      </div>
    </div>

    <div class="info-callout">
      <strong>💡 כלי בדיקה מהיר מובנה (Quick Demo Switcher):</strong>
      בראש כל עמוד באתר מופיע סרגל עליון כחול המאפשר לבודק לעבור באופן מיידי בלחיצה אחת בין כל 5 התפקידים, ללא צורך בהתנתקות או זכירת סיסמאות!
    </div>

    <div class="footer-note">מערכת דיווח שעות של"ח – מדריך לבודק • עמוד 1 מתוך 6</div>
  </div>

  <!-- עמוד 2: מסך התחברות ופרופיל מורה -->
  <div class="page">
    <div class="section-title">🔑 1. מסך התחברות והזדהות (Login)</div>
    <p>
      הכניסה למערכת מבוצעת באמצעות הזנת מספר <strong>תעודת זהות (9 ספרות)</strong> ומספר <strong>טלפון נייד</strong>. המערכת מוודאת את הפרטים מול רשימת מורשים קבועה מראש.
    </p>
    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('01_login.png')}" alt="מסך התחברות">
      <div class="screenshot-caption">תמונה 1: מסך התחברות עם סרגל כניסה מהירה לבודקים (Demo Switcher)</div>
    </div>

    <div class="section-title">📋 2. הגדרת פרופיל ומערכת שעות שבועית (Profile Setup)</div>
    <p>
      במסך זה המורה מגדיר את הפרטים המוסדיים (סמל מוסד, מחוז, רשות מקומית), מזין את שעות ההוראה הקבועות שלו לימים א'-ו', מסמן את ימי השדה הקבועים שלו, ומאשר את <strong>ההסכמה הדיגיטלית המחייבת</strong>.
    </p>
    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('02_profile.png')}" alt="מסך פרופיל">
      <div class="screenshot-caption">תמונה 2: הגדרת פרופיל אישי, מערכת שעות שבועית והסכמה דיגיטלית</div>
    </div>

    <div class="footer-note">מערכת דיווח שעות של"ח – מדריך לבודק • עמוד 2 מתוך 6</div>
  </div>

  <!-- עמוד 3: לוח בקרת מורה ומילוי דוח חודשי -->
  <div class="page">
    <div class="section-title">📝 3. לוח בקרת מורה ומילוי דוח שעות חודשי</div>
    <p>
      לוח הבקרה של המורה מרכז את כל הדוחות של המורה ומאפשר פתיחת דוח חדש מתוך <strong>חלון דיווח גמיש של 4 חודשים</strong> (חודשיים אחורה, חודש נוכחי וחודש קדימה).
    </p>
    
    <div class="card">
      <div class="card-title">✨ תכונות מפתח בטופס הדיווח:</div>
      <ul class="steps-list">
        <li><strong>לוח שנה אוטומטי:</strong> מציג ימי ראשון עד שישי בלבד (שבתות מסוננות לחלוטין).</li>
        <li><strong>הדגשת חגים וימי שדה:</strong> חגים וחופשות משה"ח מסומנים בצבע ייעודי עם שם החג.</li>
        <li><strong>שעות קבועות באפור לקריאה בלבד:</strong> נשאבות אוטומטית ממערכת השעות של המורה.</li>
        <li><strong>חוק יום שדה:</strong> בימי שדה נדרש לדווח על שעות נוספות או לפרט סיבה/נימוק לפעילות.</li>
        <li><strong>שמירה אוטומטית:</strong> המערכת שומרת טיוטה כל 30 שניות ברקע ובלחיצת כפתור.</li>
        <li><strong>העלאת אישורים:</strong> גרירת קבצים (PDF/תמונות) עד 10MB לקובץ.</li>
      </ul>
    </div>

    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('03_teacher.png')}" alt="לוח בקרה מורה">
      <div class="screenshot-caption">תמונה 3: לוח בקרת מורה, היסטוריית דוחות וטבלת מילוי שעות יומית</div>
    </div>

    <div class="footer-note">מערכת דיווח שעות של"ח – מדריך לבודק • עמוד 3 מתוך 6</div>
  </div>

  <!-- עמוד 4: אישור מנהל ועריכת מנחה מחוזי -->
  <div class="page">
    <div class="section-title">🏫 4. מסך אישור מנהל/ת (קישור מאובטח בלחיצה אחת)</div>
    <p>
      המנהל/ת מקבל קישור ייעודי מאובטח ישירות לדוח. המסך מאפשר צפייה בשעות ובנספחים, וביצוע <strong>אישור וחתימה דיגיטלית בלחיצה אחת</strong> או החזרה למורה בצירוף הערות.
    </p>
    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('04_principal.png')}" alt="מסך מנהלת">
      <div class="screenshot-caption">תמונה 4: מסך אישור מנהלת ללא צורך בהתחברות מוקדמת</div>
    </div>

    <div class="section-title">🧭 5. לוח בקרת מנחה מחוזי – עריכת שעות ישירה וייצוא</div>
    <p>
      המנחה צופה בכל דוחות מורי המחוז שלו. ביכולתו לפתוח דוח ולשנות שעות ישירות בטבלה. <strong>כל שדה שנערך נצבע מיד באדום מודגש</strong> עם פירוט הערך המקורי לצורכי בקרה והגינות. כמו כן, ניתן לייצא את כל נתוני המחוז לקובץ אקסל מעוצב.
    </p>
    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('05_supervisor.png')}" alt="לוח בקרה מנחה">
      <div class="screenshot-caption">תמונה 5: לוח בקרת מנחה מחוזי, סימון שינויים באדום וכפתור ייצוא לאקסל</div>
    </div>

    <div class="footer-note">מערכת דיווח שעות של"ח – מדריך לבודק • עמוד 4 מתוך 6</div>
  </div>

  <!-- עמוד 5: מסך ממונה רונן ואימות חתימות -->
  <div class="page">
    <div class="section-title">👔 6. מסך ממונה ארצי (רונן - Super Admin)</div>
    <p>
      הממונה הארצי צופה בכלל הדוחות בארץ, יכול לסנן לפי מחוז, מנחה וסטטוס. בלחיצה על "אישור סופי לתשלום", המערכת מנפיקה <strong>חתימה דיגיטלית מאובטחת RSA 2048-bit</strong> המבטיחה כי הדוח לא ישונה.
    </p>
    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('06_admin.png')}" alt="מסך ממונה ארצי">
      <div class="screenshot-caption">תמונה 6: מסך ממונה ארצי, יומן ביקורת, אישור סופי וייצוא מאסטר</div>
    </div>

    <div class="section-title">🛡️ 7. עמוד אימות חתימות דיגיטליות ציבורי</div>
    <p>
      כל אדם המחזיק במזהה חתימה של דוח מאושר (למשל: <code>SHALAH-202606-A17F9D</code>) יכול להזין אותו בעמוד האימות ולקבל תעודת אימות ממלכתית עם חותמת ירוקה המאשרת את מקוריות הדוח, פרטי החותם ותמצית השעות.
    </p>
    <div class="screenshot-container">
      <img class="screenshot-img" src="${base64Image('07_verify.png')}" alt="עמוד אימות חתימה">
      <div class="screenshot-caption">תמונה 7: תעודת אימות דיגיטלית ציבורית עם חותמת ירוקה מאושרת</div>
    </div>

    <div class="footer-note">מערכת דיווח שעות של"ח – מדריך לבודק • עמוד 5 מתוך 6</div>
  </div>

  <!-- עמוד 6: תרחיש בדיקה מומלץ צעד-אחר-צעד -->
  <div class="page">
    <div class="section-title">🎯 תרחיש בדיקה מומלץ למשתמש (Step-by-Step Test Walkthrough)</div>
    <p>כדי לבדוק את המערכת מקצה לקצה בצורה המהירה ביותר, בצעו את הצעדים הבאים:</p>

    <table>
      <thead>
        <tr>
          <th>שלב</th>
          <th>תפקיד</th>
          <th>פעולה לביצוע</th>
          <th>תוצאה צפויה</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><span class="badge-pill badge-blue">מורה של"ח</span></td>
          <td>היכנסו כמורה (ישראל ישראלי), בחרו בחודש 08/2026 ומלאו שעות נוספות ביום שדה.</td>
          <td>השעות מתעדכנות בשורת הסיכום התחתונה. בלחיצה על "הגש דוח", הדוח ננעל.</td>
        </tr>
        <tr>
          <td>2</td>
          <td><span class="badge-pill badge-yellow">מנהלת</span></td>
          <td>עברו לתפקיד מנהלת (שרה כהן) דרך הסרגל העליון ולחצו "אישור וחתימה דיגיטלית".</td>
          <td>הדוח מאושר ומועבר ישירות לבדיקת המנחה המחוזי.</td>
        </tr>
        <tr>
          <td>3</td>
          <td><span class="badge-pill badge-red">מנחה מחוזי</span></td>
          <td>היכנסו כמנחה (אברהם מנחה), פתחו את הדוח, שנו שעה בטבלה, ולחצו "אישור והעברה לממונה".</td>
          <td>השדה שנערך נצבע באדום מודגש, השינוי מתועד והדוח מועבר לממונה.</td>
        </tr>
        <tr>
          <td>4</td>
          <td><span class="badge-pill badge-green">ממונה ארצי</span></td>
          <td>היכנסו כממונה (רונן), פתחו את הדוח ולחצו "אישור סופי לתשלום".</td>
          <td>הונפקה חתימה דיגיטלית מאובטחת RSA-2048 ונוצר מזהה חתימה ייחודי.</td>
        </tr>
        <tr>
          <td>5</td>
          <td><span class="badge-pill badge-blue">אימות ציבורי</span></td>
          <td>עברו לעמוד אימות חתימה דרך הסרגל העליון.</td>
          <td>מוצגת תעודת אימות ירוקה ומפורטת המאשרת את תקינות הדוח והחתימה.</td>
        </tr>
      </tbody>
    </table>

    <div class="card" style="margin-top: 20px;">
      <div class="card-title">📞 תמיכה ועזרה בבדיקות</div>
      <p>
        בכל שאלה או בירור לגבי המערכת, תרחישי הדיווח או הסטאק הטכנולוגי (PostgreSQL, Vanilla Client, RSA 2048-bit), ניתן לפנות לצוות הפיתוח של המערכת.
      </p>
    </div>

    <div class="footer-note">מערכת דיווח שעות של"ח – מדריך לבודק • עמוד 6 מתוך 6</div>
  </div>

</body>
</html>
`;

const htmlGuidePath = path.join(__dirname, '../public/user_guide.html');
fs.writeFileSync(htmlGuidePath, htmlContent, 'utf8');
console.log(`✓ Generated HTML guide at: ${htmlGuidePath}`);

console.log('\n=== Step 3: Printing to PDF via Microsoft Edge Headless ===');
const pdfOutputPath = path.join(__dirname, '../מדריך_לבודק_מערכת_דיווח_שעות_שלח.pdf');

try {
  execSync(`"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfOutputPath}" "http://localhost:5000/user_guide.html"`, { stdio: 'ignore' });
  console.log(`✓ PDF successfully generated at: ${pdfOutputPath}`);
} catch (err) {
  console.error('Failed to generate PDF:', err.message);
}
