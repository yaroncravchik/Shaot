const assert = require('assert');
const calFunctions = require('../functions/services/calendarService');
const calServer = require('../server/services/calendarService');

console.log('--- Testing MoE Jewish Elementary Holidays & Post-Elementary Summer Vacation ---');

// 1. Re-export equivalence
assert.strictEqual(calFunctions.getMoEVacationInfo, calServer.getMoEVacationInfo, 'Server and Functions calendar services must be identical');

// 2. Post-Elementary Summer Vacation rules:
// June 20 is regular school end day (not yet vacation)
const jun20 = calFunctions.getMoEVacationInfo(2025, 6, 20);
assert.strictEqual(jun20.isHoliday, false, 'June 20 is end of school year, not summer vacation');

// June 21 to June 30 is Summer Vacation (על-יסודי)
for (let d = 21; d <= 30; d++) {
  const vac = calFunctions.getMoEVacationInfo(2025, 6, d);
  assert.strictEqual(vac.isHoliday, true, `June ${d} must be marked as vacation`);
  assert(vac.name.includes('החופש הגדול'), `June ${d} must mention החופש הגדול, got: ${vac.name}`);
}

// All of July is Summer Vacation
for (let d = 1; d <= 31; d++) {
  const vac = calFunctions.getMoEVacationInfo(2025, 7, d);
  assert.strictEqual(vac.isHoliday, true, `July ${d} must be vacation`);
  assert(vac.name.includes('החופש הגדול'), `July ${d} must mention החופש הגדול`);
}

// All of August is Summer Vacation
for (let d = 1; d <= 31; d++) {
  const vac = calFunctions.getMoEVacationInfo(2025, 8, d);
  assert.strictEqual(vac.isHoliday, true, `August ${d} must be vacation`);
  assert(vac.name.includes('החופש הגדול'), `August ${d} must mention החופש הגדול`);
}

// September 1 is NOT summer vacation (school begins)
const sep1 = calFunctions.getMoEVacationInfo(2025, 9, 1);
assert.strictEqual(sep1.isHoliday, false, 'September 1 is not summer vacation');

// 3. Jewish Elementary Holidays:
// Lag Ba'Omer
const lag2025 = calFunctions.getMoEVacationInfo(2025, 5, 16);
assert.strictEqual(lag2025.isHoliday, true, 'Lag BaOmer 2025 must be holiday');
assert(lag2025.name.includes('ל"ג בעומר'), 'Lag BaOmer 2025 name');

const lag2026 = calFunctions.getMoEVacationInfo(2026, 5, 5);
assert.strictEqual(lag2026.isHoliday, true, 'Lag BaOmer 2026 must be holiday');
assert(lag2026.name.includes('ל"ג בעומר'), 'Lag BaOmer 2026 name');

// Passover 2026
const passoverEve = calFunctions.getMoEVacationInfo(2026, 4, 1);
assert.strictEqual(passoverEve.isHoliday, true, 'Erev Passover 2026 must be holiday');
const passoverChag = calFunctions.getMoEVacationInfo(2026, 4, 2);
assert.strictEqual(passoverChag.isHoliday, true, 'Passover Chag 2026 must be holiday');

// Hanukkah 2026
const hanukkahDay = calFunctions.getMoEVacationInfo(2026, 12, 8);
assert.strictEqual(hanukkahDay.isHoliday, true, 'Hanukkah 2026 must be holiday');
assert(hanukkahDay.name.includes('חנוכה'), 'Hanukkah name');

// 4. Month generation
const julDays = calFunctions.generateMonthDays(2026, 7);
assert(julDays.length > 0, 'July days must be generated');
assert(julDays.every(d => d.is_holiday === 1 && d.holiday_name.includes('החופש הגדול')), 'All July days in generateMonthDays must be summer vacation');

const junDays = calFunctions.generateMonthDays(2026, 6);
const jun21InDays = junDays.find(d => d.day_number === 21);
if (jun21InDays) {
  assert.strictEqual(jun21InDays.is_holiday, 1, 'June 21 in generateMonthDays must be holiday');
  assert(jun21InDays.holiday_name.includes('החופש הגדול'), 'June 21 must be החופש הגדול');
}

// 5. October 2026 Calendar & 5th of Month Opening Rule:
const octDays = calFunctions.generateMonthDays(2026, 10);
assert.strictEqual(octDays.length, 26, 'October 2026 must have 26 reporting days excluding Saturdays');
const oct1 = octDays.find(d => d.day_number === 1);
assert.strictEqual(oct1.is_holiday, 1, 'Oct 1 must be holiday');
assert.strictEqual(oct1.holiday_name, 'הושענא רבה', 'Oct 1 is Hoshana Raba');
const oct2 = octDays.find(d => d.day_number === 2);
assert.strictEqual(oct2.is_holiday, 1, 'Oct 2 must be holiday');
assert.strictEqual(oct2.holiday_name, 'שמחת תורה', 'Oct 2 is Simchat Torah');

// Test 5th of month rule:
// Today: Oct 15, 2026 (day >= 5) -> Oct 2026 is open!
const dateOct15 = new Date(2026, 9, 15);
assert.strictEqual(calFunctions.isMonthOpenForReporting(2026, 10, dateOct15), true, 'Oct 2026 must be open on Oct 15');
assert.strictEqual(calFunctions.isMonthOpenForReporting(2026, 9, dateOct15), true, 'Sep 2026 (past) must be open on Oct 15');
assert.strictEqual(calFunctions.isMonthOpenForReporting(2026, 11, dateOct15), false, 'Nov 2026 (future) must NOT be open on Oct 15');

const octMonths = calFunctions.getAvailableMonths(dateOct15);
assert.strictEqual(octMonths[0].year, 2026, 'Latest year is 2026');
assert.strictEqual(octMonths[0].month, 10, 'Latest open month is October');
assert.strictEqual(octMonths[0].isCurrent, true, 'October is current open month');
assert(octMonths.some(m => m.month === 9), 'September is included in available months');
assert(octMonths.some(m => m.month === 8), 'August is included in available months');

// Before 5th of month: Oct 4, 2026 (day < 5) -> Oct 2026 is NOT yet open, latest is Sep 2026
const dateOct4 = new Date(2026, 9, 4);
assert.strictEqual(calFunctions.isMonthOpenForReporting(2026, 10, dateOct4), false, 'Oct 2026 must NOT be open on Oct 4');
const oct4Months = calFunctions.getAvailableMonths(dateOct4);
assert.strictEqual(oct4Months[0].month, 9, 'On Oct 4, latest open month must be September');

// November 5, 2026 -> Nov 2026 opens!
const dateNov5 = new Date(2026, 10, 5);
assert.strictEqual(calFunctions.isMonthOpenForReporting(2026, 11, dateNov5), true, 'Nov 2026 must be open on Nov 5');
const nov5Months = calFunctions.getAvailableMonths(dateNov5);
assert.strictEqual(nov5Months[0].month, 11, 'On Nov 5, latest open month must be November');

console.log('✔ All MoE Calendar & 5th-of-month opening checks passed successfully!');
