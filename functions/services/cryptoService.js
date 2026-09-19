/**
 * RSA 2048-bit Server-side Cryptographic Signing & Verification Service
 * Secures Shalah reports with digital signatures, canonical hashing,
 * and public verification capabilities.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

let privateKeyPem = null;
let publicKeyPem = null;

/**
 * Initialize or load RSA 2048-bit Key Pair (In-Memory / Safe OS Tmpdir)
 */
function ensureKeyPair() {
  if (privateKeyPem && publicKeyPem) {
    return { privateKeyPem, publicKeyPem };
  }

  const keysDir = path.join(os.tmpdir(), 'shalah_keys');
  const privateKeyPath = path.join(keysDir, 'shalah_rsa_private.pem');
  const publicKeyPath = path.join(keysDir, 'shalah_rsa_public.pem');

  try {
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
      publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
      return { privateKeyPem, publicKeyPem };
    }
  } catch (e) {
    // If filesystem not accessible, will generate in memory below
  }

  // Generate new RSA 2048-bit Keypair in memory
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  privateKeyPem = privateKey;
  publicKeyPem = publicKey;

  try {
    fs.writeFileSync(privateKeyPath, privateKeyPem, 'utf8');
    fs.writeFileSync(publicKeyPath, publicKeyPem, 'utf8');
  } catch (e) {
    // In-memory keys are sufficient
  }

  return { privateKeyPem, publicKeyPem };
}

// Safely initialize
try {
  ensureKeyPair();
} catch (err) {
  console.warn('Crypto keypair initialized in memory mode');
}

/**
 * Creates canonical hash of report payload
 */
function canonicalizeReportData(report, days = []) {
  const canonicalDays = (days || []).map(d => ({
    day: d.day_number || d.dayOfMonth,
    regular: Number(d.regular_hours || d.fixedHours || 0),
    absence: Number(d.absence_hours || 0),
    absenceReason: (d.absence_reason || '').trim(),
    overtime: Number(d.overtime_hours || 0),
    overtimeReason: (d.overtime_reason || '').trim(),
    isFieldDay: Boolean(d.is_field_day || d.isFieldDay),
    gradeClass: (d.grade_class || d.gradeClass || '').trim(),
    activityDescription: (d.activity_description || d.description || '').trim()
  })).sort((a, b) => a.day - b.day);

  const canonicalPayload = {
    reportId: String(report.id || ''),
    teacherIdNumber: String(report.id_number || report.teacherId || ''),
    teacherName: String(report.teacher_name || report.teacherName || report.full_name || ''),
    year: Number(report.year),
    month: Number(report.month),
    schoolCode: String(report.school_code || report.schoolCode || ''),
    district: String(report.district || ''),
    totalFixedHours: Number(report.totalFixedHours || report.total_fixed_hours || 0),
    totalAbsenceHours: Number(report.totalAbsenceHours || report.total_absence_hours || 0),
    totalOvertimeHours: Number(report.totalOvertimeHours || report.total_overtime_hours || 0),
    totalPayableHours: Number(report.totalPayableHours || report.total_payable_hours || 0),
    days: canonicalDays
  };

  return JSON.stringify(canonicalPayload);
}

/**
 * Sign report payload using RSA 2048 private key
 */
function signReport(report, days = [], signerRole = 'admin', signerName = 'רונן ממונה מחוז מרכז') {
  const { privateKeyPem } = ensureKeyPair();
  const canonicalString = canonicalizeReportData(report, days);

  const hash = crypto.createHash('sha256').update(canonicalString).digest('hex');

  const signer = crypto.createSign('SHA256');
  signer.update(canonicalString);
  signer.end();
  const signatureBase64 = signer.sign(privateKeyPem, 'base64');

  const signatureId = `SHALAH-${report.year}${String(report.month).padStart(2, '0')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const signedAt = new Date().toISOString();

  const signatureData = JSON.stringify({
    signatureId,
    hash,
    signatureBase64,
    signerRole,
    signerName,
    signedAt,
    algorithm: 'RSA-SHA256',
    keyLength: 2048
  });

  return {
    signatureId,
    signatureHash: hash,
    signatureData,
    signedAt,
    signedByRole: signerRole
  };
}

/**
 * Verify RSA 2048 signature
 */
function verifySignature(report, days, signatureDataStr) {
  try {
    const { publicKeyPem } = ensureKeyPair();
    const sigData = typeof signatureDataStr === 'string' ? JSON.parse(signatureDataStr) : signatureDataStr;

    if (!sigData || !sigData.signatureBase64 || !sigData.hash) {
      return { valid: false, error: 'נתוני חתימה דיגיטלית חסרים או לא תקינים.' };
    }

    const canonicalString = canonicalizeReportData(report, days);
    const calculatedHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    if (calculatedHash !== sigData.hash) {
      return {
        valid: false,
        error: 'אי התאמה בין נתוני הדוח הנוכחיים לטביעת האצבע הדיגיטלית שנחתמה (הנתונים שונו לאחר החתימה).'
      };
    }

    const verifier = crypto.createVerify('SHA256');
    verifier.update(canonicalString);
    verifier.end();
    const isValid = verifier.verify(publicKeyPem, sigData.signatureBase64, 'base64');

    return {
      valid: isValid,
      signatureId: sigData.signatureId,
      signedAt: sigData.signedAt,
      signedByRole: sigData.signerRole,
      signerName: sigData.signerName,
      algorithm: sigData.algorithm,
      hash: sigData.hash
    };
  } catch (err) {
    return { valid: false, error: `שגיאה באימות החתימה: ${err.message}` };
  }
}

function getPublicKey() {
  const { publicKeyPem } = ensureKeyPair();
  return publicKeyPem;
}

module.exports = {
  ensureKeyPair,
  canonicalizeReportData,
  signReport,
  verifySignature,
  getPublicKey
};
