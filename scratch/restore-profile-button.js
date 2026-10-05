const fs = require('fs');
const path = require('path');

// 1. Update public/js/auth.js to add "עדכון פרטים אישיים" button in header
const authJsPath = path.join(__dirname, '..', 'public', 'js', 'auth.js');
let authJs = fs.readFileSync(authJsPath, 'utf8');

const oldHeaderActions = `              \${user.role === 'site_admin' || user.role === 'superadmin' ? \`
                <a href="site-admin.html" class="btn btn-primary btn-sm" title="לוח בקרה מנהל אתר">
                  ניהול אתר
                </a>
              \` : ''}`;

const newHeaderActions = `              \${user.role === 'teacher' ? \`
                <a href="profile.html" class="btn btn-outline-primary btn-sm" style="font-weight:600;" title="עדכון פרטים אישיים ומערכת שעות">
                  ⚙️ עדכון פרטים אישיים
                </a>
              \` : ''}

              \${user.role === 'site_admin' || user.role === 'superadmin' ? \`
                <a href="site-admin.html" class="btn btn-primary btn-sm" title="לוח בקרה מנהל אתר">
                  ניהול אתר
                </a>
              \` : ''}`;

if (authJs.includes(oldHeaderActions)) {
  authJs = authJs.replace(oldHeaderActions, newHeaderActions);
  fs.writeFileSync(authJsPath, authJs, 'utf8');
  console.log('Successfully updated auth.js with profile button');
} else {
  console.log('oldHeaderActions not found in auth.js');
}

// 2. Update public/teacher.html to add "עדכון פרטים אישיים" button in summary card
const teacherHtmlPath = path.join(__dirname, '..', 'public', 'teacher.html');
let teacherHtml = fs.readFileSync(teacherHtmlPath, 'utf8');

const oldSummaryHeader = `        <div>
          <span class="badge" style="background:rgba(255,255,255,0.15); color:#ffffff; font-size:0.9375rem; padding:6px 14px;">
            ת.ז: <strong id="prof-disp-id" style="margin-right:4px;">012345678</strong>
          </span>
        </div>`;

const newSummaryHeader = `        <div class="flex items-center gap-sm flex-wrap">
          <span class="badge" style="background:rgba(255,255,255,0.15); color:#ffffff; font-size:0.9375rem; padding:6px 14px;">
            ת.ז: <strong id="prof-disp-id" style="margin-right:4px;">012345678</strong>
          </span>
          <a href="profile.html" class="btn btn-secondary btn-sm" style="background:rgba(255,255,255,0.2); color:#ffffff; border-color:rgba(255,255,255,0.4); font-weight:600;" title="עדכון פרטים אישיים, מערכת שעות ומייל מנהל/ת">
            ⚙️ עדכון פרטים אישיים
          </a>
        </div>`;

if (teacherHtml.includes(oldSummaryHeader)) {
  teacherHtml = teacherHtml.replace(oldSummaryHeader, newSummaryHeader);
  fs.writeFileSync(teacherHtmlPath, teacherHtml, 'utf8');
  console.log('Successfully updated teacher.html with profile button in summary card');
} else {
  console.log('oldSummaryHeader not found in teacher.html');
}

// 3. Update public/js/api.js seed users to default principalEmail to shalah.system.reports@gmail.com
const apiJsPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
let apiJs = fs.readFileSync(apiJsPath, 'utf8');

apiJs = apiJs.replace(/principalEmail:\s*'ronit\.s@rabin-kfs\.org\.il'/g, "principalEmail: 'shalah.system.reports@gmail.com'");

fs.writeFileSync(apiJsPath, apiJs, 'utf8');
console.log('Successfully updated api.js default principal emails');
