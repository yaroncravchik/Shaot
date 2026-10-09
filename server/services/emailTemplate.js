/**
 * Email Template Generator for Principal Review & 1-Click Approval
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 */

function generatePrincipalEmailHtml(data) {
  const {
    principalName = 'מנהל/ת בית הספר',
    teacherName = 'מורה של"ח',
    teacherId = '',
    monthName = 'אוגוסט',
    year = 2026,
    schoolName = 'בית הספר',
    schoolCode = '',
    municipality = '',
    district = '',
    jobScope = 100,
    totalRegularHours = 0,
    totalOvertimeHours = 0,
    totalAbsenceHours = 0,
    overtimeBreakdown = [],
    reviewUrl = 'https://shalah-hours-2026.web.app/principal.html'
  } = data;

  // Render breakdown table of overtime and field days if present
  let breakdownRowsHtml = '';
  if (Array.isArray(overtimeBreakdown) && overtimeBreakdown.length > 0) {
    breakdownRowsHtml = overtimeBreakdown.map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 10px; font-weight: 600; color: #1e293b; text-align: right;">${item.dateStr || item.dayOfMonth || ''} (${item.dayName || ''})</td>
        <td style="padding: 8px 10px; text-align: center; color: #0284c7; font-weight: 700;">${item.overtimeHours || 0} שעות</td>
        <td style="padding: 8px 10px; color: #334155;">
          <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${item.overtimeReason || 'פעילות של"ח'}
          </span>
        </td>
        <td style="padding: 8px 10px; color: #475569; font-size: 13px;">${item.gradeClass ? `כיתה ${item.gradeClass}` : '—'}</td>
        <td style="padding: 8px 10px; color: #475569; font-size: 13px;">${item.description || '—'}</td>
      </tr>
    `).join('');
  } else {
    breakdownRowsHtml = `
      <tr>
        <td colspan="5" style="padding: 12px; text-align: center; color: #64748b; font-size: 13px;">
          לא דווחו שעות נוספות חריגות בחודש זה
        </td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אישור דוח שעות פעילות חודשי – של"ח וידיעת הארץ</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 0;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #0c3058 0%, #007bff 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
              <div style="font-size: 13px; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 6px; font-weight: 500;">
                מדינת ישראל • תחום של"ח וידיעת הארץ
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                בקשת אישור דוח שעות פעילות חודשי
              </h1>
              <div style="font-size: 15px; color: #e2f0fc; margin-top: 6px; font-weight: 600;">
                חודש ${monthName} ${year}
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px 24px;">
              
              <!-- Greeting & Summary Text -->
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0; color: #1e293b;">
                שלום רב ל<strong>${principalName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; color: #334155;">
                הוגש לאישורך דוח שעות הפעילות החודשי בשל"ח של המורה <strong>${teacherName}</strong> עבור חודש <strong>${monthName} ${year}</strong>.
              </p>

              <!-- Teacher & School Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; line-height: 1.8;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 600;">שם המורה:</td>
                        <td style="color: #0f172a; font-weight: 700;">${teacherName} ${teacherId ? `<span style="font-weight: normal; color: #64748b; font-size: 13px;">(שם משתמש: ${teacherId})</span>` : ''}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">בית ספר וסמל מוסד:</td>
                        <td style="color: #0f172a; font-weight: 600;">${schoolName} ${schoolCode ? `(${schoolCode})` : ''}</td>
                      </tr>
                      ${municipality || district ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">רשות ומחוז:</td>
                        <td style="color: #0f172a;">${municipality ? `${municipality} • ` : ''}מחוז ${district || 'מרכז'}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">היקף משרה בשל"ח:</td>
                        <td style="color: #0f172a; font-weight: 600;">${jobScope}%</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Hours Summary Grid -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="32%" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 12px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">שעות קבועות</div>
                    <div style="font-size: 20px; font-weight: 800; color: #1d4ed8;">${totalRegularHours}</div>
                    <div style="font-size: 11px; color: #60a5fa;">שעות תקן חודשיות</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 4px;">שעות נוספות / סיורים</div>
                    <div style="font-size: 20px; font-weight: 800; color: #15803d;">${totalOvertimeHours}</div>
                    <div style="font-size: 11px; color: #4ade80;">ימי שדה ומסעות</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 12px; color: #991b1b; font-weight: 600; margin-bottom: 4px;">שעות היעדרות</div>
                    <div style="font-size: 20px; font-weight: 800; color: #b91c1c;">${totalAbsenceHours}</div>
                    <div style="font-size: 11px; color: #f87171;">מחלה / מילואים / חופשה</div>
                  </td>
                </tr>
              </table>

              <!-- Overtime / Field Activity Breakdown Table -->
              <div style="margin-bottom: 10px; font-weight: 700; font-size: 14px; color: #1e293b;">
                📋 פירוט שעות נוספות וימי שדה שדווחו:
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; font-size: 13px; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569; font-weight: 700; text-align: right; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 10px;">תאריך ויום</th>
                    <th style="padding: 10px; text-align: center;">שעות נוספות</th>
                    <th style="padding: 10px;">סוג פעילות</th>
                    <th style="padding: 10px;">שכבה/כיתה</th>
                    <th style="padding: 10px;">פירוט הפעילות</th>
                  </tr>
                </thead>
                <tbody>
                  ${breakdownRowsHtml}
                </tbody>
              </table>

              <!-- Embedded 1-Click Approval / Review CTA Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #86efac; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <div style="font-size: 16px; font-weight: 700; color: #14532d; margin-bottom: 8px;">
                      ממשק אישור דיגיטלי בלחיצה אחת
                    </div>
                    <p style="font-size: 13px; color: #166534; line-height: 1.5; margin: 0 0 16px 0;">
                      לחיצה על הכפתור תפתח את הדוח המלא לבדיקה ישירה, צפייה בנספחים, הוספת הערות מנהל/ת ואישור רשמי ללא צורך בהתחברות או סיסמה.
                    </p>
                    
                    <!-- Direct Action Button -->
                    <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3); letter-spacing: 0.3px;">
                      🔍 צפייה מלאה, הוספת הערות ואישור הדוח
                    </a>

                    <div style="font-size: 12px; color: #64748b; margin-top: 14px; word-break: break-all;">
                      קישור ישיר: <a href="${reviewUrl}" style="color: #0284c7; text-decoration: underline;">${reviewUrl}</a>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Instructions / Guidance -->
              <div style="font-size: 13px; color: #64748b; line-height: 1.6; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <strong>הנחיות למנהל/ת:</strong>
                <ul style="margin: 6px 0 0 0; padding-right: 20px;">
                  <li>באפשרותך לאשר את הדוח או להחזירו למורה לתיקון בצירוף הערות מנחות.</li>
                  <li>לאחר אישורך, הדוח יועבר להמשך בדיקה ואישור של המנחה המחוזי והממונה.</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <div>מערכת דיווח שעות פעילות חודשית – של"ח וידיעת הארץ</div>
              <div style="margin-top: 4px;">הודעה זו הופקה ונשלחה אוטומטית ע"י המערכת בהתאם להנחיות משרד החינוך.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function generatePrincipalEmailPlainText(data) {
  const {
    principalName = 'מנהל/ת בית הספר',
    teacherName = 'מורה של"ח',
    teacherId = '',
    monthName = 'אוגוסט',
    year = 2026,
    schoolName = 'בית הספר',
    schoolCode = '',
    totalRegularHours = 0,
    totalOvertimeHours = 0,
    totalAbsenceHours = 0,
    reviewUrl = ''
  } = data;

  return `שלום רב ל${principalName},

הוגש לאישורך דוח שעות פעילות חודשי בשל"ח של המורה ${teacherName}${teacherId ? ` (שם משתמש: ${teacherId})` : ''} עבור חודש ${monthName} ${year}.
מוסד חינוכי: ${schoolName} ${schoolCode ? `(${schoolCode})` : ''}

סיכום שעות חודשי:
- שעות קבועות: ${totalRegularHours}
- שעות נוספות וימי שדה: ${totalOvertimeHours}
- שעות היעדרות: ${totalAbsenceHours}

לצפייה מלאה בדוח, הוספת הערות ואישור בלחיצה אחת:
${reviewUrl}

בברכה,
מערכת דיווח שעות פעילות של"ח וידיעת הארץ`;
}

module.exports = {
  generatePrincipalEmailHtml,
  generatePrincipalEmailPlainText
};
