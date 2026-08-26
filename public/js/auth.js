/**
 * Shalah Monthly Activity Hours Reporting System (מערכת דיווח שעות של"ח)
 * Authentication, Session Management & Universal Header Renderer
 */

const Auth = {
  getCurrentUser() {
    try {
      const u = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      console.error('Error reading current user:', e);
      return null;
    }
  },

  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  login(idNumber, phoneNumber) {
    const cleanId = String(idNumber || '').trim();
    const cleanPhone = String(phoneNumber || '').trim().replace(/[-\s]/g, '');

    if (!cleanId || !cleanPhone) {
      throw new Error('נא להזין מספר תעודת זהות ומספר טלפון נייד');
    }

    const users = API.getUsers();
    // Find matching authorized user
    const found = users.find(u => 
      u.id === cleanId && 
      u.phone.replace(/[-\s]/g, '') === cleanPhone
    );

    if (!found) {
      throw new Error('פרטי ההזדהות אינם מופיעים ברשימת המורשים. נא לפנות למנחה המחוזי.');
    }

    this.setCurrentUser(found);
    return found;
  },

  logout() {
    this.setCurrentUser(null);
    window.location.href = 'index.html';
  },

  /**
   * Protect a page by verifying logged-in role
   */
  requireAuth(allowedRoles = []) {
    const user = this.getCurrentUser();
    
    // Check if on principal standalone token page
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token && window.location.pathname.includes('principal.html')) {
      const principalUser = API.getUserByToken(token);
      if (principalUser) {
        this.setCurrentUser(principalUser);
        return principalUser;
      }
    }

    if (!user) {
      window.location.href = 'index.html';
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      showToast('אין לך הרשאה לגשת לעמוד זה', 'error');
      if (user.role === 'teacher') window.location.href = 'teacher.html';
      else if (user.role === 'principal') window.location.href = 'principal.html';
      else if (user.role === 'supervisor') window.location.href = 'supervisor.html';
      else if (user.role === 'admin') window.location.href = 'admin.html';
      else window.location.href = 'index.html';
      return null;
    }

    if (user.role === 'teacher' && !user.consentSigned && !window.location.pathname.includes('profile.html')) {
      window.location.href = 'profile.html';
      return null;
    }

    return user;
  },

  /**
   * Injects the formal Top Gov Bar and Navigation Header (Zero Emojis, Pure Civic Clarity)
   */
  renderHeader(activeNav = '') {
    const headerMount = document.getElementById('gov-header-mount');
    if (!headerMount) return;

    const user = this.getCurrentUser();

    const roleLabels = {
      teacher: 'מורה של"ח',
      principal: 'מנהל/ת בית ספר',
      supervisor: 'מנחה מחוזי',
      admin: 'ממונה ארצי',
      guest: 'הזדהות'
    };

    headerMount.innerHTML = `
      <!-- Official Gov Top Bar -->
      <div class="gov-top-bar">
        <div class="container">
          <div class="flex items-center gap-sm">
            <span>מדינת ישראל • משרד החינוך • מינהל חברה ונוער • תחום של"ח וידיעת הארץ</span>
          </div>
          <div class="gov-top-links">
            <a href="verify.html" class="flex items-center gap-xs">
              <span>אימות חתימות דיגיטליות</span>
            </a>
            <span>|</span>
            <a href="https://education.gov.il" target="_blank" rel="noopener">פורטל עובדי הוראה</a>
          </div>
        </div>
      </div>

      <!-- Main Navigation Header -->
      <header class="main-header">
        <div class="container header-container">
          <a href="${user ? (user.role === 'teacher' ? 'teacher.html' : user.role === 'supervisor' ? 'supervisor.html' : user.role === 'admin' ? 'admin.html' : 'principal.html') : 'index.html'}" class="brand-wrapper">
            <div class="brand-emblem" title="סמל משרד החינוך">
              <svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
            </div>
            <div class="brand-titles">
              <span class="brand-sub">משרד החינוך • מינהל חברה ונוער</span>
              <span class="brand-main">מערכת דיווח שעות פעילות חודשית – של"ח וידיעת הארץ</span>
            </div>
          </a>

          <div class="header-actions">
            ${user ? `
              <div class="user-badge">
                <div class="user-avatar">${(user.name || 'מ').slice(0, 1)}</div>
                <div class="user-info">
                  <span class="user-name">${user.name}</span>
                  <span class="user-role-tag">${roleLabels[user.role] || user.role} ${user.district ? `(${user.district})` : ''}</span>
                </div>
              </div>

              ${user.role === 'teacher' ? `
                <a href="profile.html" class="btn btn-secondary btn-sm" title="הגדרות פרופיל ומערכת שעות">
                  פרופיל אישי
                </a>
              ` : ''}

              <button class="btn btn-secondary btn-sm" onclick="Auth.logout()" title="יציאה מהמערכת">
                התנתקות
              </button>
            ` : `
              <a href="index.html" class="btn btn-primary btn-sm">כניסה למערכת</a>
            `}
          </div>
        </div>
      </header>
    `;
  },

  /**
   * Injects the standard footer
   */
  renderFooter() {
    const footerMount = document.getElementById('gov-footer-mount');
    if (!footerMount) return;

    footerMount.innerHTML = `
      <footer class="main-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-brand">
              <h4>מערכת דיווח שעות של"ח וידיעת הארץ</h4>
              <p>מערכת ממשלתית מקוונת לניהול, דיווח, בקרה ואישור שעות פעילות, שעות נוספות וימי שדה למורי ומנחי של"ח במשרד החינוך.</p>
              <p class="text-muted" style="color:#a0aec0; font-size:0.8125rem;">עומד בתקן הנגישות WCAG 2.1 AA ובתקני אבטחת מידע ממשלתיים.</p>
            </div>
            <div class="footer-links">
              <h5>קישורים מרכזיים</h5>
              <ul>
                <li><a href="teacher.html">לוח בקרה מורה</a></li>
                <li><a href="profile.html">הגדרת פרופיל ומערכת שעות</a></li>
                <li><a href="supervisor.html">לוח בקרה מנחה מחוזי</a></li>
                <li><a href="admin.html">פורטל ממונה ארצי</a></li>
              </ul>
            </div>
            <div class="footer-links">
              <h5>אבטחה ואימות</h5>
              <ul>
                <li><a href="verify.html">אימות חתימה דיגיטלית מאובטחת</a></li>
                <li><a href="https://education.gov.il" target="_blank" rel="noopener">פורטל משרד החינוך</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>כל הזכויות שמורות למדינת ישראל • משרד החינוך – תחום של"ח וידיעת הארץ, מינהל חברה ונוער.</span>
            <span>גרסה 2.1</span>
          </div>
        </div>
      </footer>
    `;
  }
};
