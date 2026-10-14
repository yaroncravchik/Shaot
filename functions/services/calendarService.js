/**
 * Israeli Ministry of Education Calendar Service for Shalah Reports
 * Baseline: Jewish Elementary Schools (בתי ספר יסודיים בחינוך העברי)
 * Exception: Summer Vacation (החופש הגדול) according to Jewish Post-Elementary Schools (בתי ספר על-יסודיים: 21 ביוני עד 31 באוגוסט)
 */

const HEBREW_MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const HEBREW_DAY_NAMES = [
  'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'
];

/**
 * Ministry of Education Vacations according to Jewish Elementary Schools
 * (לוח חופשות משרד החינוך - בתי ספר יסודיים בחינוך העברי)
 */
const MOE_JEWISH_ELEMENTARY_HOLIDAYS = {
  // 2024 (תשפ"ה)
  '2024-10-02': 'ערב ראש השנה',
  '2024-10-03': 'ראש השנה א׳',
  '2024-10-04': 'ראש השנה ב׳',
  '2024-10-11': 'ערב יום כיפור',
  '2024-10-12': 'יום כיפור',
  '2024-10-16': 'ערב סוכות',
  '2024-10-17': 'חג סוכות',
  '2024-10-18': 'חול המועד סוכות',
  '2024-10-19': 'חול המועד סוכות',
  '2024-10-20': 'חול המועד סוכות',
  '2024-10-21': 'חול המועד סוכות',
  '2024-10-22': 'חול המועד סוכות',
  '2024-10-23': 'הושענא רבה',
  '2024-10-24': 'שמחת תורה',
  '2024-12-27': 'חופשת חנוכה',
  '2024-12-28': 'חופשת חנוכה',
  '2024-12-29': 'חופשת חנוכה',
  '2024-12-30': 'חופשת חנוכה',
  '2024-12-31': 'חופשת חנוכה',

  // 2025 (תשפ"ה - תשפ"ו)
  '2025-01-01': 'חופשת חנוכה',
  '2025-01-02': 'חופשת חנוכה - זאת חנוכה',
  '2025-03-13': 'תענית אסתר',
  '2025-03-14': 'חג פורים',
  '2025-03-15': 'שושן פורים',
  '2025-03-16': 'חופשת פורים (יסודי)',
  '2025-04-05': 'חופשת פסח',
  '2025-04-06': 'חופשת פסח',
  '2025-04-07': 'חופשת פסח',
  '2025-04-08': 'חופשת פסח',
  '2025-04-09': 'חופשת פסח',
  '2025-04-10': 'חופשת פסח',
  '2025-04-11': 'חופשת פסח',
  '2025-04-12': 'ערב פסח',
  '2025-04-13': 'חג פסח א׳',
  '2025-04-14': 'חול המועד פסח',
  '2025-04-15': 'חול המועד פסח',
  '2025-04-16': 'חול המועד פסח',
  '2025-04-17': 'חול המועד פסח',
  '2025-04-18': 'חול המועד פסח',
  '2025-04-19': 'שביעי של פסח',
  '2025-04-24': 'יום הזיכרון לשואה ולגבורה',
  '2025-04-30': 'יום הזיכרון לחללי מערכות ישראל',
  '2025-05-01': 'יום העצמאות',
  '2025-05-16': 'חופשת ל"ג בעומר (יסודי)',
  '2025-05-26': 'יום ירושלים',
  '2025-06-01': 'ערב שבועות',
  '2025-06-02': 'חג שבועות',
  '2025-06-20': 'סיום שנת הלימודים (על-יסודי)',
  '2025-09-22': 'ערב ראש השנה',
  '2025-09-23': 'ראש השנה א׳',
  '2025-09-24': 'ראש השנה ב׳',
  '2025-09-25': 'צום גדליה',
  '2025-10-01': 'ערב יום כיפור',
  '2025-10-02': 'יום כיפור',
  '2025-10-03': 'חופשת סוכות (גשר יסודי)',
  '2025-10-04': 'חופשת סוכות (גשר יסודי)',
  '2025-10-05': 'חופשת סוכות (גשר יסודי)',
  '2025-10-06': 'ערב סוכות',
  '2025-10-07': 'חג סוכות',
  '2025-10-08': 'חול המועד סוכות',
  '2025-10-09': 'חול המועד סוכות',
  '2025-10-10': 'חול המועד סוכות',
  '2025-10-11': 'חול המועד סוכות',
  '2025-10-12': 'הושענא רבה',
  '2025-10-13': 'שמחת תורה',
  '2025-10-14': 'חופשת סוכות',
  '2025-12-15': 'חנוכה - נר ראשון',
  '2025-12-16': 'חופשת חנוכה',
  '2025-12-17': 'חופשת חנוכה',
  '2025-12-18': 'חופשת חנוכה',
  '2025-12-19': 'חופשת חנוכה',
  '2025-12-20': 'חופשת חנוכה',
  '2025-12-21': 'חופשת חנוכה',
  '2025-12-22': 'חופשת חנוכה - זאת חנוכה',

  // 2026 (תשפ"ו - תשפ"ז)
  '2026-03-02': 'תענית אסתר',
  '2026-03-03': 'חג פורים',
  '2026-03-04': 'שושן פורים',
  '2026-03-24': 'חופשת פסח',
  '2026-03-25': 'חופשת פסח',
  '2026-03-26': 'חופשת פסח',
  '2026-03-27': 'חופשת פסח',
  '2026-03-28': 'חופשת פסח',
  '2026-03-29': 'חופשת פסח',
  '2026-03-30': 'חופשת פסח',
  '2026-03-31': 'חופשת פסח',
  '2026-04-01': 'ערב פסח',
  '2026-04-02': 'חג פסח א׳',
  '2026-04-03': 'חול המועד פסח',
  '2026-04-04': 'חול המועד פסח',
  '2026-04-05': 'חול המועד פסח',
  '2026-04-06': 'חול המועד פסח',
  '2026-04-07': 'חול המועד פסח',
  '2026-04-08': 'שביעי של פסח',
  '2026-04-14': 'יום הזיכרון לשואה ולגבורה',
  '2026-04-21': 'יום הזיכרון לחללי מערכות ישראל',
  '2026-04-22': 'יום העצמאות',
  '2026-05-05': 'חופשת ל"ג בעומר (יסודי)',
  '2026-05-15': 'יום ירושלים',
  '2026-05-21': 'ערב שבועות',
  '2026-05-22': 'חג שבועות',
  '2026-06-20': 'סיום שנת הלימודים (על-יסודי)',
  '2026-09-11': 'ערב ראש השנה',
  '2026-09-12': 'ראש השנה א׳',
  '2026-09-13': 'ראש השנה ב׳',
  '2026-09-14': 'צום גדליה',
  '2026-09-20': 'ערב יום כיפור',
  '2026-09-21': 'יום כיפור',
  '2026-09-22': 'חופשת בין כיפור לסוכות (יסודי)',
  '2026-09-23': 'חופשת בין כיפור לסוכות (יסודי)',
  '2026-09-24': 'חופשת בין כיפור לסוכות (יסודי)',
  '2026-09-25': 'ערב סוכות',
  '2026-09-26': 'חג סוכות',
  '2026-09-27': 'חול המועד סוכות',
  '2026-09-28': 'חול המועד סוכות',
  '2026-09-29': 'חול המועד סוכות',
  '2026-09-30': 'חול המועד סוכות',
  '2026-10-01': 'הושענא רבה',
  '2026-10-02': 'שמחת תורה',
  '2026-10-03': 'חופשת סוכות',
  '2026-12-05': 'חנוכה - נר ראשון',
  '2026-12-06': 'חופשת חנוכה',
  '2026-12-07': 'חופשת חנוכה',
  '2026-12-08': 'חופשת חנוכה',
  '2026-12-09': 'חופשת חנוכה',
  '2026-12-10': 'חופשת חנוכה',
  '2026-12-11': 'חופשת חנוכה',
  '2026-12-12': 'חופשת חנוכה',
  '2026-12-13': 'חופשת חנוכה - זאת חנוכה',

  // 2027 (תשפ"ז)
  '2027-03-22': 'תענית אסתר',
  '2027-03-23': 'חג פורים',
  '2027-03-24': 'שושן פורים',
  '2027-04-13': 'חופשת פסח',
  '2027-04-14': 'חופשת פסח',
  '2027-04-15': 'חופשת פסח',
  '2027-04-16': 'חופשת פסח',
  '2027-04-17': 'חופשת פסח',
  '2027-04-18': 'חופשת פסח',
  '2027-04-19': 'חופשת פסח',
  '2027-04-20': 'חופשת פסח',
  '2027-04-21': 'ערב פסח',
  '2027-04-22': 'חג פסח א׳',
  '2027-04-23': 'חול המועד פסח',
  '2027-04-24': 'חול המועד פסח',
  '2027-04-25': 'חול המועד פסח',
  '2027-04-26': 'חול המועד פסח',
  '2027-04-27': 'חול המועד פסח',
  '2027-04-28': 'שביעי של פסח',
  '2027-05-04': 'יום הזיכרון לשואה ולגבורה',
  '2027-05-11': 'יום הזיכרון לחללי מערכות ישראל',
  '2027-05-12': 'יום העצמאות',
  '2027-05-24': 'חופשת ל"ג בעומר (יסודי)',
  '2027-06-04': 'יום ירושלים',
  '2027-06-10': 'ערב שבועות',
  '2027-06-11': 'חג שבועות',
  '2027-06-20': 'סיום שנת הלימודים (על-יסודי)'
};

const ISRAELI_HOLIDAYS = MOE_JEWISH_ELEMENTARY_HOLIDAYS;

/**
 * Returns vacation/holiday info for a given date:
 * - Summer Vacation: Jewish Post-Elementary (June 21 - August 31)
 * - Other Holidays: Jewish Elementary Schools
 */
function getMoEVacationInfo(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // 1. Summer Vacation (החופש הגדול) - per Jewish Post-Elementary Schools (על-יסודי)
  if (m === 7 || m === 8) {
    return {
      isHoliday: true,
      name: 'חופשת קיץ (החופש הגדול)'
    };
  }
  if (m === 6) {
    if (d >= 21) {
      return {
        isHoliday: true,
        name: 'החופש הגדול (על-יסודי)'
      };
    }
    if (d === 20) {
      return {
        isHoliday: false,
        name: 'סיום שנת הלימודים (על-יסודי)'
      };
    }
  }

  // 2. Jewish Elementary School Vacations (חופשות יסודי יהודי)
  const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const holiday = MOE_JEWISH_ELEMENTARY_HOLIDAYS[dateStr];
  if (holiday) {
    return {
      isHoliday: true,
      name: holiday
    };
  }

  return {
    isHoliday: false,
    name: ''
  };
}

/**
 * Returns true if a given date string is during Summer Vacation
 * Summer vacation for Post-Elementary starts June 21 and ends August 31
 */
function isSummerVacation(year, month, day = null) {
  const m = parseInt(month, 10);
  if (m === 7 || m === 8) return true;
  if (m === 6 && day !== null && parseInt(day, 10) >= 21) return true;
  return false;
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
 * - Enriches with Ministry of Education Jewish Elementary holidays & Post-Elementary Summer Vacation
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
    const vacation = getMoEVacationInfo(year, month, dayNum);
    const holidayName = vacation.name || null;
    const isHoliday = vacation.isHoliday ? 1 : 0;

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
  MOE_JEWISH_ELEMENTARY_HOLIDAYS,
  getMoEVacationInfo,
  isSummerVacation,
  getAvailableMonths,
  generateMonthDays
};
