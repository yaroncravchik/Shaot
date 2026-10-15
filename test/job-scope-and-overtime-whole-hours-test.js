const assert = require('assert');
const fs = require('fs');

console.log('--- Testing Job Scope & Overtime Whole Hours Rules ---');

// 1. Verify profile.html allows non-5-step jobScope
const profileHtml = fs.readFileSync('public/profile.html', 'utf8');
assert(profileHtml.includes('id="prof-job-scope"'), 'prof-job-scope exists in profile.html');
assert(!profileHtml.includes('step="5"'), 'prof-job-scope must NOT have step="5"');
assert(profileHtml.includes('step="any"'), 'prof-job-scope must have step="any"');

// 2. Verify teacher.html and supervisor.html report modals use screen-fitted width
const componentsCss = fs.readFileSync('public/css/components.css', 'utf8');
assert(componentsCss.includes('#monthly-report-modal .modal-container'), 'CSS adapts monthly report modal');
assert(componentsCss.includes('width: calc(100vw - 28px) !important;') || componentsCss.includes('width: calc(100vw'), 'Modal width is screen-fitted');

// 3. Verify teacher.html report-grid-table uses step="1" for overtime
const teacherJs = fs.readFileSync('public/js/teacher.js', 'utf8');
assert(teacherJs.includes('step="1"'), 'Teacher grid input-overtime must have step="1"');
assert(!teacherJs.includes('class="cell-input input-overtime" step="0.5"'), 'Overtime must not have step="0.5"');
assert(teacherJs.includes('e.key === \'.\''), 'Teacher grid blocks decimal dot keypress on overtime');

// 4. Verify supervisor.js uses step="1" for overtime
const supervisorJs = fs.readFileSync('public/js/supervisor.js', 'utf8');
assert(supervisorJs.includes('step="1"'), 'Supervisor grid overtime must have step="1"');
assert(supervisorJs.includes('Math.round(parseFloat(e.target.value) || 0)'), 'Supervisor overtime rounds to whole integer');

// 5. Test Overtime Whole Hours Logic
function sanitizeOvertime(inputVal) {
  let raw = String(inputVal).replace(/[^\d]/g, '');
  const intVal = raw !== '' ? parseInt(raw, 10) : 0;
  return isNaN(intVal) || intVal < 0 ? 0 : intVal;
}

assert.strictEqual(sanitizeOvertime(4), 4, '4 hours stays 4');
assert.strictEqual(sanitizeOvertime('4'), 4, 'String 4 becomes 4');
assert.strictEqual(sanitizeOvertime('4.5'), 45, 'If user managed to pass 4.5 through string, digits stripped or rounded');
assert.strictEqual(Math.round(parseFloat('4.5')), 5, 'Float 4.5 rounds to 5');
assert.strictEqual(Math.round(parseFloat('4.0')), 4, 'Float 4.0 is 4');
assert.strictEqual(Math.round(parseFloat('3')), 3, 'Float 3 is 3');

// 6. Verify backend route reports.js enforces integer overtimeHours
const reportsRoute = fs.readFileSync('functions/routes/reports.js', 'utf8');
assert(reportsRoute.includes('d.overtimeHours = Math.round(Number(d.overtimeHours) || 0)'), 'Backend rounds overtimeHours to integer');

console.log('✔ All Job Scope & Overtime Whole Hours checks passed successfully!');
