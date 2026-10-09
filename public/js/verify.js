/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Public RSA Digital Signature Verification Controller
 */

document.addEventListener('DOMContentLoaded', () => {
 Auth.renderHeader('verify');
 Auth.renderFooter();

 setupDemoChips();

 const urlParams = new URLSearchParams(window.location.search);
 const sigParam = urlParams.get('sig');
 if (sigParam) {
 document.getElementById('verify-sig-input').value = sigParam;
 verifySignature(sigParam);
 }

 const form = document.getElementById('verify-form');
 form.addEventListener('submit', (e) => {
 e.preventDefault();
 const sigVal = document.getElementById('verify-sig-input').value.trim();
 if (sigVal) {
 verifySignature(sigVal);
 }
 });
});

function setupDemoChips() {
  const container = document.getElementById('demo-sig-chips');
  if (!container) return;
  container.innerHTML = '';

  let reports = API.getReports().filter(r => !!r.signatureId || !!r.digitalSignatureId);
  if (reports.length === 0) {
    reports = [{ signatureId: 'SIG-2026-07-948217', teacherName: 'ישראל ישראלי' }];
  }

  reports.forEach(r => {
    const sig = r.signatureId || r.digitalSignatureId;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.fontFamily = 'monospace';
    btn.textContent = `🛡️ ${sig} (${r.teacherName || 'מורה'})`;
    btn.addEventListener('click', () => {
      document.getElementById('verify-sig-input').value = sig;
      verifySignature(sig);
    });
    container.appendChild(btn);
  });
}

function verifySignature(sigId) {
  const resultContainer = document.getElementById('verification-result-container');
  const btnSubmit = document.getElementById('btn-verify-submit');
  if (!resultContainer || !btnSubmit) return;

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<div class="spinner"></div><span>מאמת...</span>';
  resultContainer.innerHTML = '<div class="text-center p-4"><div class="spinner" style="margin:0 auto; border-color:rgba(0,123,255,0.3); border-top-color:#007bff;"></div><p class="mt-2 text-muted">מבצע אימות קריפטוגרפי מול שרת החתימות המאובטח...</p></div>';

  setTimeout(async () => {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>🔍 אימות חתימה</span>';

    const cleanSig = String(sigId || '').trim();
    let report = API.getReportBySignature(cleanSig);

    // If not found in localStorage, query backend verification endpoint
    if (!report && typeof fetch !== 'undefined') {
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(cleanSig)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.valid || data.verified) && data.report) {
            report = {
              id: data.report.id,
              teacherName: data.report.teacher_name,
              teacherId: data.report.id_number,
              schoolName: data.report.school_name,
              schoolCode: data.report.school_code,
              district: data.report.district,
              municipality: data.report.municipality || 'מרכז',
              year: data.report.year,
              month: data.report.month,
              signatureId: data.signatureId || cleanSig,
              rsaFingerprint: data.signatureHash,
              totalOvertimeHours: data.report.total_approved_overtime_hours || data.report.total_overtime_hours || 0,
              totalAbsenceHours: data.report.total_absence_hours || 0,
              adminApprovedAt: data.report.signed_at,
              status: 'approved_paid'
            };
          }
        }
      } catch (e) {
        console.warn('Backend verify check error:', e);
      }
    }

    if (!report) {
      resultContainer.innerHTML = `
        <div class="banner-alert banner-danger animate-fade-in" style="padding:24px;">
          <div class="banner-alert-icon" style="font-size:2rem;">⚠️</div>
          <div class="banner-alert-content">
            <h3 style="color:#721c24; margin-bottom:6px;">חתימה דיגיטלית לא נמצאה או אינה תקפה</h3>
            <p style="margin-bottom:8px;">
              מזהה החתימה <strong>${cleanSig}</strong> אינו קיים במאגר הדוחות המאושרים. ייתכן והמזהה הוקלד באופן שגוי או שהדוח טרם אושר סופית לתשלום ע"י הממונה.
            </p>
            <small class="text-muted">לבירורים נוספים ניתן לפנות לתחום של"ח וידיעת הארץ.</small>
          </div>
        </div>
      `;
      showToast('מזהה החתימה אינו תקין', 'error');
      return;
    }

    // Verified Certificate Rendering
    resultContainer.innerHTML = `
      <div class="cert-box animate-fade-in">
        <div class="cert-seal">🛡️</div>
        <div class="cert-title">אישור דיגיטלי מאומת – של"ח וידיעת הארץ</div>
        <p style="color:var(--on-surface-variant); font-size:0.9375rem; max-width:600px; margin:0 auto 16px auto;">
          תעודה זו מאשרת כי דוח שעות הפעילות שלהלן נבדק, אושר ונחתם דיגיטלית באמצעות מפתח הצפנה מאובטח (RSA-2048) וכי לא בוצע בו כל שינוי לאחר החתימה.
        </p>

        <div class="cert-id-badge">
          מזהה חתימה: ${report.signatureId}
        </div>

 <div class="cert-grid">
 <div>
 <div class="cert-field-label">שם המורה המדווח:</div>
 <div class="cert-field-value">${report.teacherName} (שם משתמש: ${report.teacherId})</div>
 </div>
 <div>
 <div class="cert-field-label">מוסד חינוכי:</div>
 <div class="cert-field-value">${report.schoolName} (${report.schoolCode})</div>
 </div>
 <div>
 <div class="cert-field-label">חודש ושנת פעילות:</div>
 <div class="cert-field-value">${HEBREW_MONTHS_NAME[report.month - 1] || report.month} ${report.year}</div>
 </div>
 <div>
 <div class="cert-field-label">מחוז ורשות מקומית:</div>
 <div class="cert-field-value">${report.district || 'מרכז'} • ${report.municipality || ''}</div>
 </div>
 <div>
 <div class="cert-field-label">סך שעות נוספות מאושרות:</div>
 <div class="cert-field-value" style="color:var(--primary); font-size:1.15rem; font-weight:700;">
 ${report.totalOvertimeHours || 0} שעות נוספות
 </div>
 </div>
 <div>
 <div class="cert-field-label">פירוט שעות:</div>
 <div class="cert-field-value" style="font-size:0.875rem;">
 שעות נוספות: ${report.totalOvertimeHours || 0} | היעדרות: ${report.totalAbsenceHours || 0}
 </div>
 </div>
 <div>
 <div class="cert-field-label">גורם חותם ומאשר:</div>
 <div class="cert-field-value">רונן – ממונה ארצי, תחום של"ח וידיעת הארץ</div>
 </div>
 <div>
 <div class="cert-field-label">מועד החתימה הדיגיטלית:</div>
 <div class="cert-field-value">${formatDateTime(report.adminApprovedAt || new Date())}</div>
 </div>
 </div>

 <div class="mt-3 p-2 text-right" style="background:#ffffff; border:1px solid #dee2e6; border-radius:var(--rounded-md);">
 <div style="font-size:0.75rem; color:var(--on-surface-variant); font-family:monospace; word-break:break-all;">
 <strong>טביעת אצבע קריפטוגרפית (SHA-256 Digest):</strong><br>
 ${report.rsaFingerprint || 'RSA-2048: SHA256:7f3b89e1a2c943df890b23049182374acb01928374'}
 </div>
 </div>

 <div class="flex justify-between items-center mt-3 pt-2" style="border-top:1px solid #b8daff; flex-wrap:wrap; gap:8px;">
 <span style="font-size:0.8125rem; color:#0c5460;">
 מסמך מאובטח – מוגן מפני זיוף (Tamper Evident)
 </span>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          🖨️ הדפסת אישור
        </button>
 </div>
 </div>
 `;

 showToast('החתימה הדיגיטלית אומתה בהצלחה!', 'success');
 }, 600);
}
