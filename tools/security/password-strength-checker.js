/* ── Password Strength Checker Alpine component ── */
function strengthApp() {
  return {
    password: '',
    visible:  false,
    reportOpen: false,
    result: null,

    /* Common patterns attackers test first */
    COMMON_PATTERNS: [
      /^(.)\1+$/, // all same char: "aaaaaaa"
      /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
      /^(qwerty|qwertz|azerty|asdf|zxcv)/i,
      /password/i, /passw0rd/i, /p@ssw0rd/i, /p@ssword/i,
      /^[a-z]+\d{1,4}[!@#$]?$/i, // word + numbers + optional symbol
      /^[A-Z][a-z]+\d+[!@#$.]?$/, // Capitalized + numbers
    ],

    KEYBOARD_ROWS: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'],

    /* Score per check */
    CHECKS: [
      { id:'len8',    label:'At least 8 characters',           test: p => p.length >= 8     },
      { id:'len12',   label:'12+ characters (recommended)',    test: p => p.length >= 12    },
      { id:'len16',   label:'16+ characters (strong)',         test: p => p.length >= 16    },
      { id:'upper',   label:'Contains uppercase (A–Z)',        test: p => /[A-Z]/.test(p)   },
      { id:'lower',   label:'Contains lowercase (a–z)',        test: p => /[a-z]/.test(p)   },
      { id:'digit',   label:'Contains a number (0–9)',         test: p => /[0-9]/.test(p)   },
      { id:'symbol',  label:'Contains a symbol (!@#…)',        test: p => /[^A-Za-z0-9]/.test(p) },
      { id:'norepeat',label:'No long repeated sequences',      test: p => !(/(.)\1{2,}/.test(p)) },
      { id:'nokeybd', label:'No obvious keyboard runs',        test: p => !this._hasKeyboardRun(p) },
      { id:'nocommon',label:'Doesn\'t match common patterns',  test: p => !this._isCommonPattern(p) },
    ],

    _hasKeyboardRun(p) {
      const lp = p.toLowerCase();
      for (const row of this.KEYBOARD_ROWS) {
        for (let i = 0; i < row.length - 3; i++) {
          if (lp.includes(row.slice(i, i + 4))) return true;
        }
      }
      return false;
    },

    _isCommonPattern(p) {
      return this.COMMON_PATTERNS.some(rx => rx.test(p));
    },

    /* Entropy calculation */
    _entropy(p) {
      let pool = 0;
      if (/[a-z]/.test(p)) pool += 26;
      if (/[A-Z]/.test(p)) pool += 26;
      if (/[0-9]/.test(p)) pool += 10;
      if (/[^A-Za-z0-9]/.test(p)) pool += 32;
      return pool > 0 ? Math.round(p.length * Math.log2(pool)) : 0;
    },

    /* Crack time estimates (guesses per second) */
    _crackTime(entropy) {
      const scenarios = [
        { label: 'Online (throttled, 100/s)',     gps: 100 },
        { label: 'Online (unthrottled, 10K/s)',   gps: 1e4 },
        { label: 'Offline (slow hash, 1M/s)',     gps: 1e6 },
        { label: 'Offline (fast hash, 1B/s)',     gps: 1e9 },
        { label: 'Dedicated GPU (100B/s)',         gps: 1e11 },
      ];
      const possibilities = Math.pow(2, entropy);
      return scenarios.map(s => {
        const secs = (possibilities / 2) / s.gps;
        return { label: s.label, time: this._formatTime(secs) };
      });
    },

    _formatTime(secs) {
      if (secs < 1)           return 'Instant';
      if (secs < 60)          return Math.round(secs) + ' seconds';
      if (secs < 3600)        return Math.round(secs/60) + ' minutes';
      if (secs < 86400)       return Math.round(secs/3600) + ' hours';
      if (secs < 2592000)     return Math.round(secs/86400) + ' days';
      if (secs < 31536000)    return Math.round(secs/2592000) + ' months';
      if (secs < 3153600000)  return Math.round(secs/31536000) + ' years';
      if (secs < 3.15e13)     return (secs/3153600000).toFixed(1) + 'B years';
      return 'Centuries+';
    },

    /* Main analyse */
    analyse() {
      const p = this.password;
      if (!p) { this.result = null; return; }

      const checks = this.CHECKS.map(c => ({ ...c, pass: c.test(p) }));
      const passed = checks.filter(c => c.pass).length;

      /* Score 0–100 */
      let score = 0;
      // Length component (max 40)
      const lenScore = Math.min(40, Math.floor((p.length / 20) * 40));
      score += lenScore;
      // Charset component (max 30)
      const csScore = [/[a-z]/,/[A-Z]/,/[0-9]/,/[^A-Za-z0-9]/].filter(r=>r.test(p)).length * 7.5;
      score += csScore;
      // Pattern penalty (max 30 bonus)
      const noRepeat = !(/(.)\1{2,}/.test(p));
      const noKbd    = !this._hasKeyboardRun(p);
      const noCommon = !this._isCommonPattern(p);
      score += (noRepeat ? 8 : 0) + (noKbd ? 8 : 0) + (noCommon ? 14 : 0);
      score = Math.min(100, Math.round(score));

      /* Strength level */
      let level, color, segments;
      if (score < 25)      { level='Very Weak'; color='var(--clr-weak)';    segments=1; }
      else if (score < 45) { level='Weak';      color='var(--clr-weak)';    segments=1; }
      else if (score < 60) { level='Fair';      color='var(--clr-fair)';    segments=2; }
      else if (score < 75) { level='Good';      color='var(--clr-good)';    segments=3; }
      else if (score < 90) { level='Strong';    color='var(--clr-strong)';  segments=4; }
      else                 { level='Very Strong';color='var(--clr-vstrong)'; segments=5; }

      const entropy = this._entropy(p);
      const crackTimes = this._crackTime(entropy);

      /* Character analysis */
      const upper   = (p.match(/[A-Z]/g)||[]).length;
      const lower   = (p.match(/[a-z]/g)||[]).length;
      const digits  = (p.match(/[0-9]/g)||[]).length;
      const symbols = p.length - upper - lower - digits;
      const unique  = new Set(p).size;

      /* Improvement suggestions */
      const tips = [];
      if (p.length < 12)  tips.push('Increase length to at least 12 characters — length is the single biggest factor.');
      if (p.length < 16)  tips.push('16+ characters provides strong protection against brute-force attacks.');
      if (!/[A-Z]/.test(p)) tips.push('Add uppercase letters to expand the character pool.');
      if (!/[a-z]/.test(p)) tips.push('Add lowercase letters for more character variety.');
      if (!/[0-9]/.test(p)) tips.push('Include at least one number.');
      if (!/[^A-Za-z0-9]/.test(p)) tips.push('Add symbols like !@#$% to dramatically increase entropy.');
      if (/(.)\1{2,}/.test(p)) tips.push('Avoid repeating the same character multiple times (e.g. "aaa").');
      if (this._hasKeyboardRun(p)) tips.push('Avoid keyboard sequences like "qwerty" or "12345".');
      if (this._isCommonPattern(p)) tips.push('This follows a common pattern attackers test first — try a truly random password.');
      if (unique < p.length * 0.6) tips.push('Increase character variety — too many characters are being repeated.');

      /* Report data */
      const poolSize = [/[a-z]/,/[A-Z]/,/[0-9]/,/[^A-Za-z0-9]/].filter(r=>r.test(p))
        .reduce((sum, r) => sum + (r===(/[a-z]/) ? 26 : r===(/[A-Z]/) ? 26 : r===(/[0-9]/) ? 10 : 32), 0);

      this.result = {
        score, level, color, segments,
        entropy, checks, passed,
        crackTimes,
        upper, lower, digits, symbols, unique,
        tips,
        poolSize,
        charCount: p.length,
        checksTotal: checks.length,
      };
    },

    /* Segment colors */
    segColor(idx) {
      if (!this.result) return 'rgba(255,255,255,.07)';
      return idx < this.result.segments ? this.result.color : 'rgba(255,255,255,.07)';
    },

    /* Ring SVG */
    ringDash(score) {
      const r = 44, circ = 2 * Math.PI * r;
      return circ - (score / 100) * circ;
    },

    crackClass(time) {
      if (time === 'Instant' || time.includes('seconds') || time.includes('minutes')) return 'crack-danger';
      if (time.includes('hours') || time.includes('days') || time.includes('months')) return 'crack-warn';
      return 'crack-safe';
    },

    toggleReport() {
      this.reportOpen = !this.reportOpen;
    },

    async copyPassword() {
      if (!this.password) return;
      try { await navigator.clipboard.writeText(this.password); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },

    clearPassword() { this.password = ''; this.result = null; },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
    init() {},
  };
}
