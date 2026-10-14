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

console.log('✔ All MoE Calendar & Vacation checks passed successfully!');
