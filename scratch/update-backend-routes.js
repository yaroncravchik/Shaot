const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'server', 'routes', 'reports.js'),
  path.join(__dirname, '..', 'functions', 'routes', 'reports.js')
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const target = `    // Submission window validation:
    // Reporting for current month allowed starting from the 15th. Past months allowed anytime.
    const nowDate = new Date();
    const curYear = nowDate.getFullYear();
    const curMonth = nowDate.getMonth() + 1;
    const curDay = nowDate.getDate();

    const isPastMonth = (report.year < curYear) || (report.year === curYear && report.month < curMonth);
    const isCurrentMonth = (report.year === curYear && report.month === curMonth);

    if (!isPastMonth) {
      if (isCurrentMonth && curDay < 15) {
        return res.status(400).json({
          success: false,
          error: 'הגשת דוח שעות לחודש הנוכחי מתאפשרת החל מה-15 לחודש. באפשרותך לשמור את הנתונים כטיוטה בינתיים.'
        });
      }
      if (!isCurrentMonth) {
        return res.status(400).json({
          success: false,
          error: 'לא ניתן להגיש דוח עבור חודש עתידי. הגשת הדוח תתאפשר החל מה-15 באותו חודש.'
        });
      }
    }`;

  const replacement = `    // Reporting window validation:
    // Open for all active reporting months`;

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Successfully updated ${f}`);
  } else {
    // Try normalized line endings
    const normalized = content.replace(/\r\n/g, '\n');
    const normalizedTarget = target.replace(/\r\n/g, '\n');
    if (normalized.includes(normalizedTarget)) {
      content = normalized.replace(normalizedTarget, replacement);
      fs.writeFileSync(f, content, 'utf8');
      console.log(`Successfully updated ${f} with normalized endings`);
    } else {
      console.error(`Target not found in ${f}`);
    }
  }
});
