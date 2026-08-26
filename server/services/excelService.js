/**
 * Excel Generation Service using ExcelJS
 * Generates formatted RTL workbooks with institutional styling,
 * supervisor red highlights, formulas, and digital signature stamps.
 */

const { HEBREW_MONTH_NAMES, HEBREW_DAY_NAMES } = require('./calendarService');

let ExcelJS = null;
try {
  ExcelJS = require('exceljs');
} catch (e) {
  // Graceful fallback if exceljs is loading dynamically
}

/**
 * Generate Excel Workbook for a Single Monthly Report
 * @param {Object} report - Complete report object with user details, days, totals
 * @returns {Promise<Buffer>} Excel file buffer
 */
async function generateSingleReportExcel(report) {
  if (!ExcelJS) {
    ExcelJS = require('exceljs');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'מערכת דיווח שעות פעילות חודשית של"ח - משרד החינוך';
  workbook.lastModifiedBy = 'משרד החינוך';
  workbook.created = new Date();
  workbook.modified = new Date();

  const monthName = HEBREW_MONTH_NAMES[report.month - 1] || report.month;
  const sheetTitle = `דוח ${monthName} ${report.year}`;
  const worksheet = workbook.addWorksheet(sheetTitle, {
    views: [{ rightToLeft: true, showGridLines: true }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  // Define Colors
  const COLOR_HEADER_BG = '0C3058';     // Deep Civic Blue
  const COLOR_HEADER_TEXT = 'FFFFFF';
  const COLOR_SUBHEADER_BG = 'F0F4F8';  // Light grayish blue
  const COLOR_FIELD_DAY = 'EBF5FB';     // Subtle sky blue
  const COLOR_HOLIDAY = 'FEF9E7';       // Subtle warm amber
  const COLOR_SUPERVISOR_EDIT = 'FCE8E6'; // Soft red highlight
  const COLOR_SUPERVISOR_TEXT = 'C5221F'; // Dark red text
  const COLOR_TOTAL_BG = 'E8ECEF';

  // 1. Title Block
  worksheet.mergeCells('A1:N1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'מדינת ישראל - משרד החינוך - מינהל חברה ונוער - תחום של"ח וידיעת הארץ';
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: COLOR_HEADER_TEXT } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HEADER_BG } };
  worksheet.getRow(1).height = 34;

  worksheet.mergeCells('A2:N2');
  const subtitleCell = worksheet.getCell('A2');
  subtitleCell.value = `דוח ריכוז שעות פעילות חודשי – ${monthName} ${report.year}`;
  subtitleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: '0C3058' } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUBHEADER_BG } };
  worksheet.getRow(2).height = 24;

  // 2. Metadata Information Block
  worksheet.addRow([]); // Blank row 3

  const metaRow1 = [
    'שם המורה:', report.teacher_name || report.full_name || '',
    'תעודת זהות:', report.id_number || '',
    'מוסד חינוכי:', `${report.school_name || ''} (${report.school_code || ''})`,
    'מחוז:', report.district || '',
    'היקף משרה:', `${report.job_percentage || 100}%`,
    'סטטוס דוח:', formatStatusHebrew(report.status),
    ''
  ];
  worksheet.addRow(metaRow1);

  const metaRow2 = [
    'מנהל/ת מוסד:', report.principal_name || 'טרם עודכן',
    'מנחה מחוזי:', report.supervisor_name || 'מנחה מחוז',
    'מזהה חתימה:', report.digital_signature_id || 'טרם נחתם',
    'תאריך חתימה:', report.signed_at ? new Date(report.signed_at).toLocaleString('he-IL') : '—',
    '', '', '', ''
  ];
  worksheet.addRow(metaRow2);

  // Style metadata rows
  [4, 5].forEach(rowNum => {
    const row = worksheet.getRow(rowNum);
    row.height = 20;
    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 10, bold: c % 2 === 1 };
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      if (c % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8F9FA' } };
      }
    }
  });

  worksheet.addRow([]); // Blank row 6

  // 3. Table Column Headers
  const tableHeaders = [
    'יום בחודש',
    'יום בשבוע',
    'תאריך',
    'יום שדה',
    'חג / חופשה',
    'שעות קבועות',
    'שעות היעדרות',
    'סיבת היעדרות',
    'שעות נוספות',
    'סיבת שעות נוספות',
    'כיתה / שכבה',
    'תיאור הפעילות',
    'עריכת מנחה',
    'הערת מנחה'
  ];

  const headerRow = worksheet.addRow(tableHeaders);
  headerRow.height = 28;
  for (let c = 1; c <= 14; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_HEADER_TEXT } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3D59' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CCCCCC' } },
      bottom: { style: 'medium', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } }
    };
  }

  // 4. Data Rows
  const days = report.days || [];
  let totalRegular = 0;
  let totalAbsence = 0;
  let totalOvertime = 0;

  const startRowIndex = 8;
  days.forEach((day, idx) => {
    const dayOfWeekName = HEBREW_DAY_NAMES[day.day_of_week] || day.day_of_week;
    const isSupervisorEdited = Boolean(day.supervisor_edited);

    const rowValues = [
      day.day_number,
      dayOfWeekName,
      day.date_str,
      day.is_field_day ? '✓ יום שדה' : '',
      day.holiday_name || (day.is_holiday ? 'חג/חופשה' : ''),
      Number(day.regular_hours) || 0,
      Number(day.absence_hours) || 0,
      day.absence_reason || '',
      Number(day.overtime_hours) || 0,
      day.overtime_reason || '',
      day.grade_class || '',
      day.activity_description || '',
      isSupervisorEdited ? `תוקן (מקורי: נוספות ${day.original_overtime_hours || 0}, היעדרות ${day.original_absence_hours || 0})` : '',
      day.supervisor_note || ''
    ];

    totalRegular += Number(day.regular_hours) || 0;
    totalAbsence += Number(day.absence_hours) || 0;
    totalOvertime += Number(day.overtime_hours) || 0;

    const row = worksheet.addRow(rowValues);
    row.height = 22;

    for (let c = 1; c <= 14; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 2, 3, 4, 6, 7, 9, 11].includes(c) ? 'center' : 'right',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };

      // Apply Row Highlights
      if (isSupervisorEdited) {
        // Red highlight for supervisor edited rows / cells
        if ([9, 10, 13, 14].includes(c)) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SUPERVISOR_EDIT } };
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLOR_SUPERVISOR_TEXT } };
        }
      } else if (day.is_field_day) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FIELD_DAY } };
      } else if (day.is_holiday) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_HOLIDAY } };
      }
    }
  });

  const endRowIndex = startRowIndex + days.length - 1;

  // 5. Summary Row (Totals)
  const summaryRowValues = [
    'סה"כ חודשי:', '', '', '', '',
    { formula: `SUM(F${startRowIndex}:F${endRowIndex})`, result: totalRegular },
    { formula: `SUM(G${startRowIndex}:G${endRowIndex})`, result: totalAbsence },
    '',
    { formula: `SUM(I${startRowIndex}:I${endRowIndex})`, result: totalOvertime },
    '', '', '', '', ''
  ];

  const summaryRow = worksheet.addRow(summaryRowValues);
  summaryRow.height = 26;
  worksheet.mergeCells(`A${endRowIndex + 1}:E${endRowIndex + 1}`);

  for (let c = 1; c <= 14; c++) {
    const cell = summaryRow.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TOTAL_BG } };
    cell.border = {
      top: { style: 'medium', color: { argb: '000000' } },
      bottom: { style: 'double', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } }
    };
  }

  // 6. Signature Stamp Block
  worksheet.addRow([]); // Blank
  const sigRowStart = endRowIndex + 3;

  worksheet.mergeCells(`A${sigRowStart}:N${sigRowStart + 2}`);
  const sigCell = worksheet.getCell(`A${sigRowStart}`);

  const isSigned = Boolean(report.digital_signature_id);
  sigCell.value = isSigned
    ? `✔ מסמך זה נחתם דיגיטלית ומאומת במערכת של"ח משרד החינוך.\nמזהה חתימה דיגיטלית: ${report.digital_signature_id} | גורם חותם: ${report.signed_by_role || 'ממונה ארצי'} | תאריך חתימה: ${report.signed_at ? new Date(report.signed_at).toLocaleString('he-IL') : '—'}\nגיבוב אימות (SHA-256): ${report.signature_hash || 'מאומת'}`
    : `מסמך זה הינו טיוטה / בהליכי אישור (טרם נחתם סופית לתשלום).`;

  sigCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: isSigned ? '0B6623' : '666666' } };
  sigCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sigCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSigned ? 'E8F5E9' : 'F5F5F5' } };

  // Set Column Widths
  worksheet.columns = [
    { width: 10 }, // A: יום בחודש
    { width: 10 }, // B: יום בשבוע
    { width: 12 }, // C: תאריך
    { width: 12 }, // D: יום שדה
    { width: 18 }, // E: חג / חופשה
    { width: 12 }, // F: שעות קבועות
    { width: 13 }, // G: שעות היעדרות
    { width: 16 }, // H: סיבת היעדרות
    { width: 13 }, // I: שעות נוספות
    { width: 22 }, // J: סיבת שעות נוספות
    { width: 12 }, // K: כיתה / שכבה
    { width: 28 }, // L: תיאור הפעילות
    { width: 26 }, // M: עריכת מנחה
    { width: 24 }  // N: הערת מנחה
  ];

  return await workbook.xlsx.writeBuffer();
}

/**
 * Generate Excel Master Summary Workbook for Multiple Reports (Supervisor / Admin)
 * @param {Array} reports - List of report summary objects
 * @param {string} title - Custom title (e.g. 'ריכוז דוחות מחוז מרכז - אוגוסט 2026')
 * @returns {Promise<Buffer>} Excel buffer
 */
async function generateReportsSummaryExcel(reports, title = 'ריכוז דוחות שעות חודשי של"ח') {
  if (!ExcelJS) {
    ExcelJS = require('exceljs');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'מערכת דיווח שעות פעילות חודשית של"ח';
  const worksheet = workbook.addWorksheet('ריכוז דוחות', {
    views: [{ rightToLeft: true, showGridLines: true }]
  });

  // Title
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0C3058' } };
  worksheet.getRow(1).height = 30;

  // Header
  const headers = [
    '#',
    'שם המורה',
    'תעודת זהות',
    'טלפון',
    'מוסד חינוכי',
    'מחוז',
    'חודש/שנה',
    'שעות קבועות',
    'שעות היעדרות',
    'שעות נוספות מאושרות',
    'סטטוס',
    'מזהה חתימה'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 24;
  for (let c = 1; c <= 12; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3D59' } };
  }

  // Data rows
  reports.forEach((rep, idx) => {
    const monthName = HEBREW_MONTH_NAMES[rep.month - 1] || rep.month;
    const row = worksheet.addRow([
      idx + 1,
      rep.teacher_name || rep.full_name || '',
      rep.id_number || '',
      rep.phone || '',
      `${rep.school_name || ''} (${rep.school_code || ''})`,
      rep.district || '',
      `${monthName} ${rep.year}`,
      Number(rep.total_regular_hours) || 0,
      Number(rep.total_absence_hours) || 0,
      Number(rep.total_approved_overtime_hours || rep.total_overtime_hours) || 0,
      formatStatusHebrew(rep.status),
      rep.digital_signature_id || '—'
    ]);

    row.height = 20;
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: [1, 3, 4, 7, 8, 9, 10, 11, 12].includes(c) ? 'center' : 'right' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
        left: { style: 'thin', color: { argb: 'E0E0E0' } },
        right: { style: 'thin', color: { argb: 'E0E0E0' } }
      };
    }
  });

  worksheet.columns = [
    { width: 6 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 25 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 22 }
  ];

  return await workbook.xlsx.writeBuffer();
}

function formatStatusHebrew(status) {
  const map = {
    'draft': 'טיוטה',
    'submitted_to_principal': 'הוגש למנהל/ת',
    'principal_approved': 'אושר ע"י מנהל/ת',
    'supervisor_approved': 'אושר ע"י מנחה',
    'approved_for_payment': 'אושר לתשלום (סופי)',
    'returned_to_teacher': 'הוחזר לתיקון המורה',
    'returned_to_supervisor': 'הוחזר לעריכת מנחה'
  };
  return map[status] || status;
}

module.exports = {
  generateSingleReportExcel,
  generateReportsSummaryExcel,
  formatStatusHebrew
};
