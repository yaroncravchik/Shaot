/**
 * Israeli Ministry of Education Calendar Service for Shalah Reports
 * Supports Hebrew/Civil calendar holiday mappings, Sunday-Friday calendar generation,
 * and flexible reporting windows (-2 months to +1 month).
 */

const HEBREW_MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const HEBREW_DAY_NAMES = [
  'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'
];

/**
 * Fixed and dynamic Israeli Holidays / Ministry of Education Vacations
 * Formatted as "YYYY-MM-DD" -> Holiday Name
 */
const ISRAELI_HOLIDAYS = {
  // 2025
  '2025-01-01': 'תחילת שנה אזרחית',
  '2025-02-13': 'ט"ו בשבט',
  '2025-03-13': 'תענית אסתר',
  '2025-03-14': 'פורים',
  '2025-03-15': 'שושן פורים',
  '2025-04-05': 'חופשת פסח - משרד החינוך',
  '2025-04-06': 'חופשת פסח - משרד החינוך',
  '2025-04-07': 'חופשת פסח - משרד החינוך',
  '2025-04-08': 'חופשת פסח - משרד החינוך',
  '2025-04-09': 'חופשת פסח - משרד החינוך',
  '2025-04-10': 'חופשת פסח - משרד החינוך',
  '2025-04-11': 'חופשת פסח - משרד החינוך',
  '2025-04-12': 'ערב פסח',
  '2025-04-13': 'פסח - חג ראשון',
  '2025-04-14': 'פסח - חול המועד',
  '2025-04-15': 'פסח - חול המועד',
  '2025-04-16': 'פסח - חול המועד',
  '2025-04-17': 'פסח - חול המועד',
  '2025-04-18': 'ערב שביעי של פסח',
  '2025-04-19': 'שביעי של פסח',
  '2025-04-20': 'אסרו חג פסח',
  '2025-04-24': 'יום הזיכרון לשואה ולגבורה',
  '2025-04-30': 'יום הזיכרון לחללי מערכות ישראל',
  '2025-05-01': 'יום העצמאות',
  '2025-05-16': 'ל"ג בעומר',
  '2025-05-26': 'יום ירושלים',
  '2025-06-01': 'ערב שבועות',
  '2025-06-02': 'חג שבועות',
  '2025-06-03': 'אסרו חג שבועות',
  '2025-09-22': 'ערב ראש השנה',
  '2025-09-23': 'ראש השנה א׳',
  '2025-09-24': 'ראש השנה ב׳',
  '2025-09-25': 'צום גדליה',
  '2025-10-01': 'ערב יום כיפור',
  '2025-10-02': 'יום כיפור',
  '2025-10-06': 'ערב סוכות',
  '2025-10-07': 'חג סוכות',
  '2025-10-08': 'חול המועד סוכות',
  '2025-10-09': 'חול המועד סוכות',
  '2025-10-10': 'חול המועד סוכות',
  '2025-10-11': 'חול המועד סוכות',
  '2025-10-12': 'הושענא רבה',
  '2025-10-13': 'שמחת תורה',
  '2025-10-14': 'אסרו חג סוכות',
  '2025-12-15': 'חנוכה - נר ראשון',
  '2025-12-16': 'חנוכה',
  '2025-12-17': 'חנוכה',
  '2025-12-18': 'חנוכה',
  '2025-12-19': 'חנוכה',
  '2025-12-20': 'חנוכה',
  '2025-12-21': 'חנוכה',
  '2025-12-22': 'חנוכה - זאת חנוכה',

  // 2026
  '2026-01-01': 'תחילת שנה אזרחית',
  '2026-02-02': 'ט"ו בשבט',
  '2026-03-02': 'תענית אסתר',
  '2026-03-03': 'פורים',
  '2026-03-04': 'שושן פורים',
  '2026-03-24': 'חופשת פסח - משרד החינוך',
  '2026-03-25': 'חופשת פסח - משרד החינוך',
  '2026-03-26': 'חופשת פסח - משרד החינוך',
  '2026-03-27': 'חופשת פסח - משרד החינוך',
  '2026-03-28': 'חופשת פסח - משרד החינוך',
  '2026-03-29': 'חופשת פסח - משרד החינוך',
  '2026-03-30': 'חופשת פסח - משרד החינוך',
  '2026-03-31': 'חופשת פסח - משרד החינוך',
  '2026-04-01': 'ערב פסח',
  '2026-04-02': 'פסח - חג ראשון',
  '2026-04-03': 'פסח - חול המועד',
  '2026-04-04': 'פסח - חול המועד',
  '2026-04-05': 'פסח - חול המועד',
  '2026-04-06': 'פסח - חול המועד',
  '2026-04-07': 'ערב שביעי של פסח',
  '2026-04-08': 'שביעי של פסח',
  '2026-04-09': 'אסרו חג פסח',
  '2026-04-14': 'יום הזיכרון לשואה ולגבורה',
  '2026-04-21': 'יום הזיכרון לחללי מערכות ישראל',
  '2026-04-22': 'יום העצמאות',
  '2026-05-05': 'ל"ג בעומר',
  '2026-05-15': 'יום ירושלים',
  '2026-05-21': 'ערב שבועות',
  '2026-05-22': 'חג שבועות',
  '2026-05-23': 'אסרו חג שבועות',
  '2026-09-11': 'ערב ראש השנה',
  '2026-09-12': 'ראש השנה א׳',
  '2026-09-13': 'ראש השנה ב׳',
  '2026-09-14': 'צום גדליה',
  '2026-09-20': 'ערב יום כיפור',
  '2026-09-21': 'יום כיפור',
  '2026-09-25': 'ערב סוכות',
  '2026-09-26': 'חג סוכות',
  '2026-09-27': 'חול המועד סוכות',
  '2026-09-28': 'חול המועד סוכות',
  '2026-09-29': 'חול המועד סוכות',
  '2026-09-30': 'חול המועד סוכות',
  '2026-10-01': 'הושענא רבה',
  '2026-10-02': 'שמחת תורה',
  '2026-10-03': 'אסרו חג סוכות',
  '2026-12-04': 'חנוכה - נר ראשון',
  '2026-12-05': 'חנוכה',
  '2026-12-06': 'חנוכה',
  '2026-12-07': 'חנוכה',
  '2026-12-08': 'חנוכה',
  '2026-12-09': 'חנוכה',
  '2026-12-10': 'חנוכה',
  '2026-12-11': 'חנוכה - זאת חנוכה',

  // 2027
  '2027-01-01': 'תחילת שנה אזרחית',
  '2027-01-23': 'ט"ו בשבט',
  '2027-03-22': 'תענית אסתר',
  '2027-03-23': 'פורים',
  '2027-03-24': 'שושן פורים',
  '2027-04-14': 'חופשת פסח - משרד החינוך',
  '2027-04-15': 'חופשת פסח - משרד החינוך',
  '2027-04-16': 'חופשת פסח - משרד החינוך',
  '2027-04-17': 'חופשת פסח - משרד החינוך',
  '2027-04-18': 'חופשת פסח - משרד החינוך',
  '2027-04-19': 'חופשת פסח - משרד החינוך',
  '2027-04-20': 'חופשת פסח - משרד החינוך',
  '2027-04-21': 'ערב פסח',
  '2027-04-22': 'פסח - חג ראשון',
  '2027-04-23': 'פסח - חול המועד',
  '2027-04-24': 'פסח - חול המועד',
  '2027-04-25': 'פסח - חול המועד',
  '2027-04-26': 'פסח - חול המועד',
  '2027-04-27': 'ערב שביעי של פסח',
  '2027-04-28': 'שביעי של פסח',
  '2027-04-29': 'אסרו חג פסח',
  '2027-05-04': 'יום הזיכרון לשואה ולגבורה',
  '2027-05-11': 'יום הזיכרון לחללי מערכות ישראל',
  '2027-05-12': 'יום העצמאות',
  '2027-05-24': 'ל"ג בעומר',
  '2027-06-04': 'יום ירושלים',
  '2027-06-10': 'ערב שבועות',
  '2027-06-11': 'חג שבועות',
  '2027-06-12': 'אסרו חג שבועות'
};

/**
 * Returns true if a given date string is during Summer Vacation (July 1 - August 31)
 */
function isSummerVacation(year, month) {
  return month === 7 || month === 8;
}

/**
 * Returns available reporting months:
 * Selectable range: [Current Month - 2 months, Current Month + 1 month]
 * Open all month round (no strict cutoff lock, available for reporting)
 */
function getAvailableMonths(baseDate = new Date()) {
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1; // 1-12

  const months = [];

  // Range from -2 to +1
  for (let offset = -2; offset <= 1; offset++) {
    let targetYear = currentYear;
    let targetMonth = currentMonth + offset;

    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    const isCurrent = offset === 0;
    const isPast = offset < 0;
    const isFuture = offset > 0;

    months.push({
      year: targetYear,
      month: targetMonth,
      monthKey: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
      labelHebrew: `${HEBREW_MONTH_NAMES[targetMonth - 1]} ${targetYear}`,
      isCurrent,
      isPast,
      isFuture,
      isSelectable: true
    });
  }

  return months;
}

/**
 * Generates all reporting days for a given Year and Month.
 * - Days: Sunday (0) to Friday (5). Saturdays (6) are excluded.
 * - Enriches with teacher schedule (regular_hours, is_field_day)
 * - Enriches with holiday information
 */
function generateMonthDays(year, month, teacherSchedule = []) {
  // Map teacher schedules by day_of_week (0..5)
  const scheduleMap = {};
  for (let i = 0; i <= 5; i++) {
    scheduleMap[i] = { regular_hours: 0, is_field_day: 0 };
  }

  if (Array.isArray(teacherSchedule)) {
    teacherSchedule.forEach(item => {
      scheduleMap[item.day_of_week] = {
        regular_hours: Number(item.regular_hours) || 0,
        is_field_day: item.is_field_day ? 1 : 0
      };
    });
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dateObj = new Date(year, month - 1, dayNum);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

    // Exclude Saturdays completely
    if (dayOfWeek === 6) {
      continue;
    }

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const holidayName = ISRAELI_HOLIDAYS[dateStr] || (isSummerVacation(year, month) ? 'חופשת קיץ' : null);
    const isHoliday = holidayName ? 1 : 0;

    const schedule = scheduleMap[dayOfWeek] || { regular_hours: 0, is_field_day: 0 };

    days.push({
      day_number: dayNum,
      day_of_week: dayOfWeek,
      day_name_hebrew: HEBREW_DAY_NAMES[dayOfWeek],
      date_str: dateStr,
      is_field_day: schedule.is_field_day,
      is_holiday: isHoliday,
      holiday_name: holidayName,
      regular_hours: schedule.regular_hours,
      absence_hours: 0,
      absence_reason: '',
      overtime_hours: 0,
      overtime_reason: '',
      grade_class: '',
      activity_description: '',
      supervisor_edited: 0,
      original_overtime_hours: null,
      original_absence_hours: null,
      supervisor_note: ''
    });
  }

  return days;
}

module.exports = {
  HEBREW_MONTH_NAMES,
  HEBREW_DAY_NAMES,
  ISRAELI_HOLIDAYS,
  getAvailableMonths,
  generateMonthDays
};
