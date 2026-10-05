const fs = require('fs');
const path = require('path');

// 1. Update public/js/api.js - canSubmitReport
const apiPath = path.join(__dirname, '..', 'public', 'js', 'api.js');
let apiCode = fs.readFileSync(apiPath, 'utf8');

const oldCanSubmit = `  canSubmitReport(year, month, checkDate = new Date()) {
    const curYear = checkDate.getFullYear();
    const curMonth = checkDate.getMonth() + 1;
    const curDay = checkDate.getDate();

    const isPast = (year < curYear) || (year === curYear && month < curMonth);
    const isCurrent = (year === curYear && month === curMonth);

    if (isPast) {
      return { allowed: true };
    }
    if (isCurrent) {
      if (curDay >= 15) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'הגשת דוח שעות לחודש הנוכחי מתאפשרת החל מה-15 לחודש. ניתן לשמור את הדיווח כטיוטה בינתיים.'
      };
    }
    return {
      allowed: false,
      reason: 'לא ניתן להגיש דוח עבור חודש עתידי. הגשת הדוח תתאפשר החל מה-15 באותו חודש.'
    };
  },`;

const newCanSubmit = `  canSubmitReport(year, month, checkDate = new Date()) {
    // Reporting is open for all active reporting months
    return { allowed: true };
  },`;

if (apiCode.includes(oldCanSubmit)) {
  apiCode = apiCode.replace(oldCanSubmit, newCanSubmit);
  fs.writeFileSync(apiPath, apiCode, 'utf8');
  console.log('Successfully updated canSubmitReport in public/js/api.js');
} else {
  // Try regex
  const regex = /canSubmitReport\(year, month, checkDate = new Date\(\)\) \{[\s\S]*?return \{\s*allowed: false,[\s\S]*?\};\s*\},/;
  if (regex.test(apiCode)) {
    apiCode = apiCode.replace(regex, newCanSubmit);
    fs.writeFileSync(apiPath, apiCode, 'utf8');
    console.log('Successfully replaced canSubmitReport regex in public/js/api.js');
  } else {
    console.log('canSubmitReport target not found in api.js');
  }
}

// 2. Update public/js/teacher.js - checkReportSubmissionEligibility and submitCurrentReport
const teacherJsPath = path.join(__dirname, '..', 'public', 'js', 'teacher.js');
let teacherJs = fs.readFileSync(teacherJsPath, 'utf8');

const oldTeacherElig = `function checkReportSubmissionEligibility(year, month, checkDate = new Date()) {
  const curYear = checkDate.getFullYear();
  const curMonth = checkDate.getMonth() + 1;
  const curDay = checkDate.getDate();

  const isPast = (year < curYear) || (year === curYear && month < curMonth);
  const isCurrent = (year === curYear && month === curMonth);

  if (isPast) {
    return { allowed: true };
  }
  if (isCurrent) {
    if (curDay >= 15) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: \`הגשת דוח שעות לחודש הנוכחי מתאפשרת החל מה-15 לחודש (היום ה-\${curDay} לחודש). ניתן לשמור את הדיווח כטיוטה בינתיים.\`
    };
  }
  return {
    allowed: false,
    reason: 'לא ניתן להגיש דוח עבור חודש עתידי. הגשת הדוח תתאפשר החל מה-15 באותו חודש (ניתן לשמור כטיוטה בינתיים).'
  };
}`;

const newTeacherElig = `function checkReportSubmissionEligibility(year, month, checkDate = new Date()) {
  return { allowed: true };
}`;

if (teacherJs.includes(oldTeacherElig)) {
  teacherJs = teacherJs.replace(oldTeacherElig, newTeacherElig);
} else {
  const tRegex = /function checkReportSubmissionEligibility\(year, month, checkDate = new Date\(\)\) \{[\s\S]*?return \{\s*allowed: false,[\s\S]*?\};\s*\}/;
  if (tRegex.test(teacherJs)) {
    teacherJs = teacherJs.replace(tRegex, newTeacherElig);
  }
}

fs.writeFileSync(teacherJsPath, teacherJs, 'utf8');
console.log('Successfully updated checkReportSubmissionEligibility in public/js/teacher.js');

// 3. Update server and functions routes
const routeFiles = [
  path.join(__dirname, '..', 'server', 'routes', 'reports.js'),
  path.join(__dirname, '..', 'functions', 'routes', 'reports.js')
];

routeFiles.forEach(rf => {
  let content = fs.readFileSync(rf, 'utf8');
  const dateCheckTarget = /const isPastMonth = \(report\.year < curYear\) \|\| \(report\.year === curYear && report\.month < curMonth\);[\s\S]*?if \(!isPastMonth\) \{[\s\S]*?\}\s*\}\s*\}/;
  
  const simplifiedDateCheck = `// Reporting is open for all active reporting months
    // No date blocking for submission`;

  if (dateCheckTarget.test(content)) {
    content = content.replace(dateCheckTarget, simplifiedDateCheck);
    fs.writeFileSync(rf, content, 'utf8');
    console.log(`Successfully removed restrictive date blocking in ${rf}`);
  } else {
    console.log(`dateCheckTarget not found in ${rf}`);
  }
});

// 4. Update banner in public/teacher.html
const teacherHtmlPath = path.join(__dirname, '..', 'public', 'teacher.html');
let teacherHtml = fs.readFileSync(teacherHtmlPath, 'utf8');
teacherHtml = teacherHtml.replace(
  'הגשת דוח שעות חודשי עבור החודש הנוכחי מתאפשרת החל מה-15 לחודש. דוחות עבור חודשים קודמים ניתן להגיש בכל עת.',
  'הגשת דוחות שעות פעילות פתוחה עבור כל חודשי הדיווח הפעילים במערכת. בלחיצה על הגשה הדוח יישלח אוטומטית למייל המנהל/ת.'
);
fs.writeFileSync(teacherHtmlPath, teacherHtml, 'utf8');
console.log('Successfully updated banner in public/teacher.html');
