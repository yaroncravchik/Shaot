const fs = require('fs');
const path = require('path');

const teacherHtmlPath = path.join(__dirname, '..', 'public', 'teacher.html');
let html = fs.readFileSync(teacherHtmlPath, 'utf8');

const modalHtml = `    <!-- ==========================================================================
         PRINCIPAL EMAIL DISPATCH MODAL (שליחה ואישור מנהל/ת)
         ========================================================================== -->
    <div class="modal-backdrop" id="modal-principal-email-dispatch">
      <div class="modal-container modal-lg">
        <div class="modal-header" style="background: linear-gradient(135deg, #0c3058 0%, #1e40af 100%); color: #ffffff;">
          <div class="flex items-center gap-sm">
            <span style="font-size:1.6rem;">📧</span>
            <div>
              <h2 class="modal-title" id="dispatch-modal-title" style="color:#ffffff;">שליחה ואישור מנהל/ת המוסד</h2>
              <span style="font-size:0.8125rem; color:#8dcdff;">שליחת קישור ישיר לאישור דוח השעות בדוא"ל או בוואטסאפ</span>
            </div>
          </div>
          <button type="button" class="modal-close-btn" style="color:#ffffff;" onclick="closeModal('modal-principal-email-dispatch')">&times;</button>
        </div>

        <div class="modal-body">
          <div class="alert alert-success mb-3 flex items-center gap-sm" style="border-right: 4px solid var(--success); padding: 14px 18px;">
            <span style="font-size:1.5rem; line-height: 1;">✓</span>
            <div>
              <strong style="font-size:1.05rem;">הדוח נשמר וננעל בהצלחה!</strong>
              <div id="dispatch-status-text" style="font-size:0.875rem; color: #155724; margin-top:2px;">
                הדוח הועבר לסטטוס "ממתין לאישור מנהל/ת". שלח/י כעת את קישור האישור למנהל/ת בית הספר לצורך בדיקה וחתימה.
              </div>
            </div>
          </div>

          <div class="card mb-3" style="background-color: var(--surface-container-low); border: 1px solid var(--outline);">
            <div class="card-body">
              <div class="grid grid-2 gap-md">
                <div class="form-group mb-2">
                  <label class="form-label" for="dispatch-principal-name">שם מנהל/ת בית הספר:</label>
                  <input type="text" id="dispatch-principal-name" class="form-control" readonly style="font-weight:600; background-color: #ffffff;">
                </div>
                <div class="form-group mb-2">
                  <label class="form-label" for="dispatch-principal-email">כתובת דוא"ל מנהל/ת בית הספר:</label>
                  <input type="email" id="dispatch-principal-email" class="form-control" style="direction:ltr; text-align:left; font-weight:600; background-color: #ffffff;" placeholder="principal@school.gov.il">
                </div>
              </div>

              <div class="form-group mb-2">
                <label class="form-label" for="dispatch-email-subject">נושא הודעת הדוא"ל:</label>
                <input type="text" id="dispatch-email-subject" class="form-control" style="font-weight:500; background-color: #ffffff;">
              </div>

              <div class="form-group mb-2">
                <label class="form-label" for="dispatch-email-body">תוכן ההודעה:</label>
                <textarea id="dispatch-email-body" class="form-textarea" rows="4" style="font-size:0.875rem; line-height:1.5; background-color: #ffffff;"></textarea>
              </div>

              <div class="form-group mb-0">
                <label class="form-label" for="dispatch-review-url">קישור ישיר לבדיקה ואישור (ללא צורך בהתחברות):</label>
                <div class="flex gap-sm">
                  <input type="text" id="dispatch-review-url" class="form-control" readonly style="direction:ltr; text-align:left; font-size:0.8125rem; font-family:monospace; background-color:#ffffff; font-weight:500;">
                  <button type="button" class="btn btn-outline-primary" id="btn-copy-dispatch-url" onclick="copyDispatchReviewUrl()" style="white-space:nowrap; min-width:130px;">
                    <span id="copy-btn-text">📋 העתק קישור</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-md flex-wrap justify-between items-center p-3" style="background-color: #f0f7ff; border: 1px solid #b8daff; border-radius: var(--rounded-md);">
            <div>
              <div style="font-weight:700; color:#004085; font-size: 0.95rem;">בחר/י את אופן השליחה המועדף:</div>
              <div class="text-muted" style="font-size:0.8125rem;">לחיצה על הכפתור תפתח את תוכנת הדוא"ל או הוואטסאפ עם ההודעה המוכנה והקישור</div>
            </div>
            <div class="flex gap-sm flex-wrap">
              <button type="button" class="btn btn-success" id="btn-send-whatsapp" onclick="sendDispatchWhatsApp()">
                <span>💬 שליחה בוואטסאפ למנהל/ת</span>
              </button>
              <button type="button" class="btn btn-primary btn-lg" id="btn-open-email-client" onclick="openDispatchMailClient()">
                <span>📧 פתח בתוכנת דוא"ל (Gmail / Outlook)</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal('modal-principal-email-dispatch')">סגירה וחזרה לדוחות</button>
        </div>
      </div>
    </div>
`;

const targetAnchor = '<!-- Universal Footer Mount -->';

if (!html.includes('modal-principal-email-dispatch')) {
  if (html.includes(targetAnchor)) {
    html = html.replace(targetAnchor, modalHtml + '\n  ' + targetAnchor);
    fs.writeFileSync(teacherHtmlPath, html, 'utf8');
    console.log('Successfully inserted modal-principal-email-dispatch into public/teacher.html');
  } else {
    console.error('Target anchor not found in teacher.html');
    process.exit(1);
  }
} else {
  console.log('modal-principal-email-dispatch already present in teacher.html');
}
