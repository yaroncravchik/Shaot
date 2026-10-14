/**
 * Production & Local Email Dispatch Service
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 *
 * Supports two real delivery channels:
 * 1. Direct SMTP via Nodemailer (Gmail / Workspace / Custom SMTP) using .env credentials
 * 2. Cloud Firestore 'mail' collection queuing for Firebase Trigger Email Extension
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const GMAIL_USER = process.env.GMAIL_USER || 'shalah.system.reports@gmail.com';
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || 'wyquhnabgmktkuhs';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS
  }
});

let firestoreInstance = null;
let firestoreAdmin = null;

// Initialize Firebase Admin if serviceAccountKey.json is available
function getFirestoreDb() {
  if (firestoreInstance) return firestoreInstance;

  try {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../../serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
      firestoreAdmin = admin;
      firestoreInstance = admin.firestore();
      console.log('✓ [Email Service] Connected to Cloud Firestore using Service Account');
      return firestoreInstance;
    }
  } catch (err) {
    console.warn('! [Email Service] Could not connect to Firestore:', err.message);
  }
  return null;
}

// Create Nodemailer Transporter if SMTP credentials exist in env
function getSmtpTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASS || process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, '') // strip spaces from app password
      }
    });
  }

  return transporter;
}

/**
 * Send official Principal Review & Approval Email (Nodemailer Direct)
 */
async function sendPrincipalApprovalEmail({
  to,
  principalName,
  teacherName,
  teacherId,
  monthName,
  year,
  schoolName,
  schoolCode,
  totalOvertime,
  reviewUrl
}) {
  if (!to || !to.includes('@')) {
    throw new Error('כתובת דוא"ל מנהל/ת לא תקינה');
  }

  const pName = principalName || 'מנהל/ת בית הספר';
  const tName = teacherName || 'מורה של"ח';
  const tId = teacherId || '';
  const mName = monthName || '';
  const y = year || new Date().getFullYear();
  const sName = schoolName || 'בית הספר';
  const sCode = schoolCode || '';
  const ot = totalOvertime !== undefined ? totalOvertime : 0;
  const link = reviewUrl || `https://shalah-hours-2026.web.app/principal.html`;

  const subject = `אישור דוח שעות פעילות של"ח – ${tName} – חודש ${mName} ${y}`;

  const htmlContent = `
    <div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fa; padding: 25px 15px; color: #0c3058;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #dee2e6; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0c3058 0%, #1e40af 100%); color: #ffffff; padding: 22px 28px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">מערכת דיווח שעות פעילות חודשית – של"ח</h2>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #8dcdff;">משרד החינוך • מנהל חברה ונוער • תחום של"ח וידיעת הארץ</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px;">
          <p style="font-size: 16px; margin-top: 0; line-height: 1.6;">
            שלום <strong>${pName}</strong>,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #212529;">
            מצורף לעיונך ולאישורך דוח שעות פעילות חודשי בשל"ח עבור חודש <strong>${mName} ${y}</strong> של המורה <strong>${tName}</strong>${tId ? ` (ת.ז. ${tId})` : ''}.
          </p>

          <!-- Details Card -->
          <div style="background: #f0f7ff; border-right: 4px solid #007bff; border-radius: 8px; padding: 16px 20px; margin: 22px 0;">
            <div style="font-weight: 700; font-size: 14px; color: #004085; margin-bottom: 8px;">ריכוז פרטי הדוח:</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">מוסד חינוכי:</td>
                <td style="padding: 4px 0; font-weight: 600;">${sName} ${sCode ? `(${sCode})` : ''}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">חודש דיווח:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #007bff;">${mName} ${y}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6c757d;">שעות נוספות / סיורים:</td>
                <td style="padding: 4px 0; font-weight: 700; color: #28a745;">${ot} שעות</td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" style="background-color: #007bff; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 16px; font-weight: 700; border-radius: 8px; display: inline-block; box-shadow: 0 4px 8px rgba(0,123,255,0.25);">
              🔍 צפייה בדוח ואישור בלחיצה אחת
            </a>
          </div>

          <p style="font-size: 13px; color: #6c757d; line-height: 1.5; margin-bottom: 0;">
            * קישור זה מאובטח ומאפשר כניסה ישירה לבדיקת הדוח, צפייה בנספחים ואישור דיגיטלי ללא צורך בהתחברות מוקדמת.<br>
            במידה והכפתור אינו נפתח, ניתן להעתיק את הקישור הישיר:<br>
            <a href="${link}" style="color: #007bff; font-size: 12px; word-break: break-all;">${link}</a>
          </p>

          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 24px 0 18px 0;">

          <p style="font-size: 14px; margin: 0; color: #495057;">
            בברכה,<br>
            <strong>${tName}</strong><br>
            <span style="font-size: 13px; color: #6c757d;">מורה לשל"ח וידיעת הארץ</span>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f9fa; border-top: 1px solid #dee2e6; padding: 14px 28px; text-align: center; font-size: 12px; color: #868e96;">
          הודעה זו נשלחה באופן אוטומטי ממערכת דיווח שעות פעילות של"ח – משרד החינוך.
        </div>
      </div>
    </div>
  `;

  const mailTransporter = getSmtpTransporter() || transporter;
  const info = await mailTransporter.sendMail({
    from: `"מערכת דיווח שעות של\\"ח" <${GMAIL_USER}>`,
    to,
    subject,
    html: htmlContent
  });

  return info;
}

/**
 * Send principal notification email
 * @param {Object} options Email data and recipient
 * @returns {Promise<{ success: boolean, channel: string, details: string, docId?: string }>}
 */
async function sendPrincipalEmail(options) {
  const {
    recipient,
    subject,
    html,
    text,
    reportId,
    teacherName,
    teacherId,
    principalName,
    monthName,
    year,
    reviewUrl
  } = options;

  let firestoreDocId = null;
  let sentViaSmtp = false;
  let smtpError = null;

  // 1. Try Direct SMTP delivery if credentials are provided
  const mailTransporter = getSmtpTransporter();
  if (mailTransporter) {
    try {
      const fromUser = process.env.GMAIL_USER || process.env.SMTP_USER || GMAIL_USER;
      const info = await mailTransporter.sendMail({
        from: `"מערכת דיווח שעות של\"ח" <${fromUser}>`,
        to: recipient,
        subject: subject,
        text: text,
        html: html
      });
      console.log(`✓ [Email Service] Sent email to ${recipient} via Direct Gmail SMTP (Message ID: ${info.messageId})`);
      sentViaSmtp = true;
    } catch (err) {
      console.error('! [Email Service] Direct SMTP send error:', err.message);
      smtpError = err.message;
    }
  }

  // 2. Try queuing to Cloud Firestore 'mail' collection (Firebase Trigger Email Extension)
  const firestore = getFirestoreDb();
  if (firestore) {
    try {
      const docRef = await firestore.collection('mail').add({
        to: [recipient],
        message: {
          subject: subject,
          text: text,
          html: html
        },
        reportId: reportId || null,
        teacherName: teacherName || '',
        teacherId: teacherId || '',
        principalName: principalName || '',
        month: monthName || '',
        year: year || 2026,
        reviewUrl: reviewUrl || '',
        createdAt: firestoreAdmin.firestore.FieldValue.serverTimestamp()
      });
      firestoreDocId = docRef.id;
      console.log(`✓ [Email Service] Queued document to Firestore 'mail' collection: ${firestoreDocId}`);
    } catch (err) {
      console.warn('! [Email Service] Could not queue to Firestore:', err.message);
    }
  }

  if (sentViaSmtp) {
    return {
      success: true,
      channel: 'gmail_direct_smtp',
      message: `המייל נשלח ישירות בהצלחה לכתובת ${recipient} באמצעות שרת Gmail SMTP!`,
      mailDocId: firestoreDocId || `smtp_${Date.now()}`
    };
  }

  if (firestoreDocId) {
    return {
      success: true,
      channel: 'firestore_extension',
      message: `הודעת האישור נרשמה בהצלחה בקולקציית mail ב-Firestore (${firestoreDocId}) לשליחה באמצעות Firebase Extension!`,
      mailDocId: firestoreDocId
    };
  }

  // Fallback demo/simulation mode
  const simulatedId = `mail_mock_${Date.now()}`;
  return {
    success: true,
    channel: 'simulation',
    message: smtpError 
      ? `שגיאה בהתחברות ל-Gmail SMTP (${smtpError}). במצב פיתוח הנתונים נרשמו בהדמיה.`
      : `הודעת אישור נשלחה בהדמיה ל-${recipient}. להפעלת שליחה אמיתית בשרת המקומי יש להגדיר GMAIL_USER ו-GMAIL_APP_PASSWORD ב-.env`,
    mailDocId: simulatedId
  };
}

module.exports = {
  sendPrincipalApprovalEmail,
  sendPrincipalEmail,
  transporter,
  getSmtpTransporter,
  getFirestoreDb
};
