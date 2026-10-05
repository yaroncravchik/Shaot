const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'shalah.system.reports@gmail.com',
    pass: 'wyquhnabgmktkuhs'
  }
});

async function testGmail() {
  console.log('Verifying Gmail SMTP connection...');
  try {
    await transporter.verify();
    console.log('✔ Gmail SMTP credentials verified successfully!');

    console.log('Sending test email to shalah.system.reports@gmail.com...');
    const info = await transporter.sendMail({
      from: '"מערכת דיווח שעות של\\"ח" <shalah.system.reports@gmail.com>',
      to: 'shalah.system.reports@gmail.com',
      subject: 'בדיקת מערכת דוחות של"ח – חיבור Gmail תקין',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f5f8fa; padding: 25px; color: #0c3058;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; border: 1px solid #dee2e6; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(135deg, #0c3058 0%, #1e40af 100%); color: #ffffff; padding: 20px 25px;">
              <h2 style="margin: 0; font-size: 20px;">אישור דוח שעות פעילות חודשי – של"ח</h2>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #8dcdff;">משרד החינוך • מנהל חברה ונוער • תחום של"ח וידיעת הארץ</p>
            </div>
            <div style="padding: 25px;">
              <p style="font-size: 16px; line-height: 1.6;">שלום <strong>מנהל/ת בית הספר</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6;">
                בדיקת חיבור מערכת דיווח שעות של"ח לשרת הדוא"ל של גוגל הצליחה ב-100%!
              </p>
              <div style="background: #eef6fc; border-right: 4px solid #007bff; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <div style="font-weight: bold; margin-bottom: 5px;">סטטוס שירות הדוא"ל:</div>
                <div>• כתובת שולח: <strong>shalah.system.reports@gmail.com</strong></div>
                <div>• אימות SMTP: <strong>תקין ומאומת</strong></div>
                <div>• שליחה אוטומטית: <strong>פעילה ומאובטחת</strong></div>
              </div>
              <p style="font-size: 14px; margin: 0; color: #495057;">
                בברכה,<br>
                <strong>מערכת דיווח שעות של"ח</strong>
              </p>
            </div>
          </div>
        </div>
      `
    });

    console.log('✔ Test email sent successfully! Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Gmail SMTP error:', err);
    process.exit(1);
  }
}

testGmail();
