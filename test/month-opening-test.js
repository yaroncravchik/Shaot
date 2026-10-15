const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

console.log('--- Testing Client-Side Month Opening & 5th of Month Rule ---');

// Setup mock browser environment
const apiCode = fs.readFileSync('./public/js/api.js', 'utf8');
const ctx = {
  window: {},
  document: {
    addEventListener: () => {},
    getElementById: () => null
  },
  localStorage: {
    getItem: () => null,
    setItem: () => null
  },
  console: console
};
vm.createContext(ctx);
vm.runInContext(apiCode, ctx);

// 1. Check getAvailableReportingMonths on today (October 15, 2026)
const todayOct15 = new Date(2026, 9, 15);
const monthsToday = ctx.getAvailableReportingMonths(todayOct15);

assert(Array.isArray(monthsToday), 'Must return an array of months');
assert.strictEqual(monthsToday[0].year, 2026, 'First year should be 2026');
assert.strictEqual(monthsToday[0].month, 10, 'First month should be 10 (October)');
assert.strictEqual(monthsToday[0].isCurrent, true, 'October 2026 must be marked isCurrent');
assert(monthsToday[0].label.includes('אוקטובר 2026'), 'Label must include אוקטובר 2026');
assert(monthsToday[0].label.includes('חודש נוכחי'), 'Label must indicate current month');

// Check past months are present in descending order
const monthNumbers = monthsToday.map(m => `${m.year}-${m.month}`);
assert(monthNumbers.includes('2026-10'), 'Includes October');
assert(monthNumbers.includes('2026-9'), 'Includes September');
assert(monthNumbers.includes('2026-8'), 'Includes August');
assert(monthNumbers.includes('2026-7'), 'Includes July');
assert(monthNumbers.includes('2026-6'), 'Includes June');

// 2. Check isMonthOpenForReporting on Oct 15
assert.strictEqual(ctx.isMonthOpenForReporting(2026, 10, todayOct15), true, 'October 2026 must be open');
assert.strictEqual(ctx.isMonthOpenForReporting(2026, 9, todayOct15), true, 'September 2026 (past) must be open');
assert.strictEqual(ctx.isMonthOpenForReporting(2026, 8, todayOct15), true, 'August 2026 (past) must be open');
assert.strictEqual(ctx.isMonthOpenForReporting(2026, 11, todayOct15), false, 'November 2026 (future) must NOT be open on Oct 15');
assert.strictEqual(ctx.isMonthOpenForReporting(2027, 1, todayOct15), false, 'January 2027 must NOT be open');

// 3. Test before the 5th: On Nov 3, 2026
const dateNov3 = new Date(2026, 10, 3);
const monthsNov3 = ctx.getAvailableReportingMonths(dateNov3);
assert.strictEqual(monthsNov3[0].month, 10, 'On Nov 3, latest open month is still October');
assert.strictEqual(ctx.isMonthOpenForReporting(2026, 11, dateNov3), false, 'November 2026 is NOT open on Nov 3');

// 4. Test on the 5th: On Nov 5, 2026
const dateNov5 = new Date(2026, 10, 5);
const monthsNov5 = ctx.getAvailableReportingMonths(dateNov5);
assert.strictEqual(monthsNov5[0].month, 11, 'On Nov 5, latest open month is November');
assert.strictEqual(monthsNov5[0].isCurrent, true, 'November is current open month');
assert.strictEqual(ctx.isMonthOpenForReporting(2026, 11, dateNov5), true, 'November 2026 is open on Nov 5');

// 5. Test API wrapper equivalence
const clientAPI = ctx.window.API || ctx.API;
assert.strictEqual(clientAPI.isMonthOpenForReporting(2026, 10, todayOct15), true, 'API.isMonthOpenForReporting must match');
const apiMonths = clientAPI.getAvailableMonths(todayOct15);
assert.strictEqual(apiMonths[0].month, 10, 'API.getAvailableMonths must match');

console.log('✔ All client-side month opening & 5th of month tests passed successfully!');
