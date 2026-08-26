/**
 * RSA 2048-bit Server-side Cryptographic Signing & Verification Service
 * Secures Shalah reports with digital signatures, canonical hashing,
 * and public verification capabilities.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, '../../data/keys');
const privateKeyPath = path.join(keysDir, 'shalah_rsa_private.pem');
const publicKeyPath = path.join(keysDir, 'shalah_rsa_public.pem');

let privateKeyPem = null;
let publicKeyPem = null;

/**
 * Initialize or load RSA 2048-bit Key Pair
 */
function ensureKeyPair() {
  if (privateKeyPem && publicKeyPem) {
    return { privateKeyPem, publicKeyPem };
  }

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
    publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
  } else {
    // Generate new RSA 2048-bit Keypair
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

    fs.writeFileSync(privateKeyPath, privateKeyPem, 'utf8');
    fs.writeFileSync(publicKeyPath, publicKeyPem, 'utf8');
  }

  return { privateKeyPem, publicKeyPem };
}

// Initialize on module load
ensureKeyPair();

/**
 * Generate a formatted Digital Signature ID (e.g., "SHALAH-202608-F4A8B9")
 */
function generateSignatureId(year, month) {
  const yStr = String(year);
  const mStr = String(month).padStart(2, '0');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SHALAH-${yStr}${mStr}-${randomHex}`;
}

/**
 * Canonicalize payload to ensure deterministic hashing
 */
function canonicalizePayload(payload) {
  if (payload === null || typeof payload !== 'object') {
    return JSON.stringify(payload);
  }
  if (Array.isArray(payload)) {
    return '[' + payload.map(item => canonicalizePayload(item)).join(',') + ']';
  }
  const sortedKeys = Object.keys(payload).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalizePayload(payload[key]);
  });
  return '{' + pairs.join(',') + '}';
}

/**
 * Cryptographically sign a report payload using RSA-SHA256
 * @param {Object} reportData - Object containing report details, days, totals, signer
 * @returns {Object} { signatureId, signatureHash, signatureData, signedAt, publicKeyPem }
 */
function signReport(reportData, signerRole = 'admin') {
  ensureKeyPair();

  const signatureId = reportData.digital_signature_id || generateSignatureId(reportData.year, reportData.month);
  const signedAt = new Date().toISOString();

  // Create clean canonical structure for signing
  const signingObject = {
    reportId: reportData.id,
    userId: reportData.user_id,
    teacherName: reportData.teacher_name || reportData.full_name,
    teacherIdNumber: reportData.id_number,
    schoolCode: reportData.school_code,
    schoolName: reportData.school_name,
    district: reportData.district,
    year: reportData.year,
    month: reportData.month,
    totalRegularHours: Number(reportData.total_regular_hours || 0),
    totalAbsenceHours: Number(reportData.total_absence_hours || 0),
    totalOvertimeHours: Number(reportData.total_overtime_hours || 0),
    totalApprovedOvertimeHours: Number(reportData.total_approved_overtime_hours || reportData.total_overtime_hours || 0),
    daysSummary: (reportData.days || []).map(d => ({
      day: d.day_number,
      regular: d.regular_hours,
      absence: d.absence_hours,
      overtime: d.overtime_hours,
      edited: d.supervisor_edited || 0
    })),
    signedByRole: signerRole,
    signedAt,
    signatureId
  };

  const canonicalString = canonicalizePayload(signingObject);

  // Compute SHA-256 hash
  const hash = crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');

  // Sign hash with RSA private key (SHA256withRSA)
  const signer = crypto.createSign('SHA256');
  signer.update(canonicalString);
  signer.end();
  const signatureBase64 = signer.sign(privateKeyPem, 'base64');

  return {
    signatureId,
    signatureHash: hash,
    signatureData: signatureBase64,
    signedAt,
    signedByRole: signerRole,
    canonicalPayload: canonicalString,
    publicKey: publicKeyPem
  };
}

/**
 * Verify RSA-SHA256 signature
 * @param {string|Object} canonicalPayload - String or object that was signed
 * @param {string} signatureBase64 - Base64 RSA signature
 * @param {string} [customPublicKeyPem] - Optional public key PEM (defaults to server public key)
 * @returns {boolean} True if signature is valid
 */
function verifySignature(canonicalPayload, signatureBase64, customPublicKeyPem = null) {
  ensureKeyPair();
  const pubKey = customPublicKeyPem || publicKeyPem;

  try {
    const dataToVerify = typeof canonicalPayload === 'string' ? canonicalPayload : canonicalizePayload(canonicalPayload);
    const verifier = crypto.createVerify('SHA256');
    verifier.update(dataToVerify);
    verifier.end();
    return verifier.verify(pubKey, signatureBase64, 'base64');
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Get Public Key PEM for external verification
 */
function getPublicKey() {
  ensureKeyPair();
  return publicKeyPem;
}

module.exports = {
  signReport,
  verifySignature,
  generateSignatureId,
  getPublicKey,
  canonicalizePayload
};
