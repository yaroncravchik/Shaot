const { sendPrincipalApprovalEmail } = require('../server/services/emailService');

async function testFlow() {
  console.log('Testing sendPrincipalApprovalEmail...');
  const result = await sendPrincipalApprovalEmail({
    to: 'shalah.system.reports@gmail.com',
    principalName: 'רונית שחר (מנהלת)',
    teacherName: 'ישראל ישראלי',
    teacherId: '012345678',
    monthName: 'אוגוסט',
    year: 2026,
    schoolName: 'תיכון יצחק רבין כפר סבא',
    schoolCode: '440123',
    totalOvertime: 14,
    reviewUrl: 'https://shalah-hours-2026.web.app/principal.html?token=PRINCIPAL_TOKEN_KFS_440123&reportId=REP-2026-08-01'
  });

  console.log('✔ Email delivered successfully! Message ID:', result.messageId);
}

testFlow().catch(console.error);
