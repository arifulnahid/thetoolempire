/* ── Password Generator Alpine component ── */
function passwordApp() {
  return {
    /* ── Settings ── */
    length: 16,
    charsets: {
      upper:   { label:'Uppercase',  chars:'ABCDEFGHIJKLMNOPQRSTUVWXYZ', enabled:true  },
      lower:   { label:'Lowercase',  chars:'abcdefghijklmnopqrstuvwxyz', enabled:true  },
      digits:  { label:'Numbers',    chars:'0123456789',                  enabled:true  },
      symbols: { label:'Symbols',    chars:'!@#$%^&*()-_=+[]{}|;:,.<>?', enabled:true  },
    },
    excludeAmbiguous: false,   // 0 O o l 1 I
    noDuplicates:     false,
    noSequential:     false,
    excludeCustom:    '',

    /* ── State ── */
    password:   '',
    bulkCount:  10,
    bulkList:   [],
    history:    [],
    showBulk:   false,
    showHistory:false,
    blurred:    false,
    copyLabel:  'Copy',

    AMBIGUOUS: 'O0l1Io',

    /* ── Build charset from current settings ── */
    _buildChars() {
      let pool = '';
      for (const [, cs] of Object.entries(this.charsets)) {
        if (cs.enabled) pool += cs.chars;
      }
      if (this.excludeAmbiguous) {
        for (const c of this.AMBIGUOUS) pool = pool.split(c).join('');
      }
      for (const c of (this.excludeCustom || '')) {
        pool = pool.split(c).join('');
      }
      return [...new Set(pool)].join('');
    },

    /* ── Cryptographically random integer [0, max) ── */
    _rand(max) {
      const arr = new Uint32Array(1);
      let limit = Math.floor(0xFFFFFFFF / max) * max;
      do { crypto.getRandomValues(arr); } while (arr[0] >= limit);
      return arr[0] % max;
    },

    /* ── Generate single password ── */
    _generate() {
      const pool = this._buildChars();
      if (!pool.length) return '';
      const len = parseInt(this.length) || 16;

      if (this.noDuplicates && len > pool.length) return this._generate();

      let pwd = '';
      let used = new Set();
      let attempts = 0;

      while (pwd.length < len && attempts < 10000) {
        const char = pool[this._rand(pool.length)];
        if (this.noDuplicates && used.has(char)) { attempts++; continue; }
        if (this.noSequential && pwd.length > 0) {
          const prev = pwd.charCodeAt(pwd.length - 1);
          if (Math.abs(char.charCodeAt(0) - prev) === 1) { attempts++; continue; }
        }
        pwd += char;
        used.add(char);
        attempts = 0;
      }

      /* Ensure at least one char from each enabled charset */
      const enabled = Object.values(this.charsets).filter(c => c.enabled);
      if (enabled.length > 1 && !this.noDuplicates) {
        let pwdArr = pwd.split('');
        enabled.forEach((cs, i) => {
          const src = cs.chars.split('').filter(c => !this.excludeAmbiguous || !this.AMBIGUOUS.includes(c));
          if (!src.length) return;
          if (!pwdArr.some(c => cs.chars.includes(c))) {
            const pos = this._rand(pwdArr.length);
            pwdArr[pos] = src[this._rand(src.length)];
          }
        });
        pwd = pwdArr.join('');
      }
      return pwd;
    },

    /* ── Regenerate ── */
    generate() {
      const pwd = this._generate();
      if (!pwd) return;
      if (this.password && this.history.length < 20) {
        this.history.unshift({ pwd: this.password, len: this.password.length, time: new Date().toLocaleTimeString() });
        if (this.history.length > 20) this.history.pop();
      }
      this.password = pwd;
      this.copyLabel = 'Copy';
    },

    /* ── Bulk generate ── */
    generateBulk() {
      const count = Math.min(parseInt(this.bulkCount) || 10, 100);
      this.bulkList = Array.from({ length: count }, () => this._generate()).filter(Boolean);
    },

    /* ── Strength score ── */
    get strength() {
      const pwd = this.password;
      if (!pwd) return { score:0, label:'', pct:0, color:'transparent', chips:[] };
      let score = 0;
      const len = pwd.length;
      if (len >= 8)  score += 1;
      if (len >= 12) score += 1;
      if (len >= 16) score += 1;
      if (len >= 20) score += 1;
      if (/[A-Z]/.test(pwd)) score += 1;
      if (/[a-z]/.test(pwd)) score += 1;
      if (/[0-9]/.test(pwd)) score += 1;
      if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
      if (len >= 24 && score >= 6) score += 1;

      const entropy = Math.log2(Math.pow(this._buildChars().length || 1, len));

      const chips = [];
      if (/[A-Z]/.test(pwd)) chips.push({ label:'A-Z', ok:true });
      if (/[a-z]/.test(pwd)) chips.push({ label:'a-z', ok:true });
      if (/[0-9]/.test(pwd)) chips.push({ label:'0-9', ok:true });
      if (/[^A-Za-z0-9]/.test(pwd)) chips.push({ label:'Symbols', ok:true });
      chips.push({ label: len + ' chars', ok: len >= 12 });
      chips.push({ label: Math.round(entropy) + ' bits', ok: entropy >= 60 });

      if (score <= 3)      return { score, label:'Weak',   pct:25,  color:'#ef4444', chips };
      if (score <= 5)      return { score, label:'Fair',   pct:50,  color:'#eab308', chips };
      if (score <= 7)      return { score, label:'Strong', pct:75,  color:'#22c55e', chips };
      return                      { score, label:'Very Strong', pct:100, color:'#10b981', chips };
    },

    get entropy() {
      const pool = this._buildChars();
      return Math.round(Math.log2(Math.pow(pool.length || 1, this.length)));
    },

    /* ── Copy ── */
    async copyPassword() {
      if (!this.password) return;
      try {
        await navigator.clipboard.writeText(this.password);
        this.copyLabel = 'Copied!';
        this._toast('Password copied to clipboard');
        setTimeout(() => this.copyLabel = 'Copy', 2000);
      } catch { this._toast('Copy failed'); }
    },
    async copyBulk() {
      try {
        await navigator.clipboard.writeText(this.bulkList.join('\n'));
        this._toast('All passwords copied!');
      } catch { this._toast('Copy failed'); }
    },
    async copyHist(pwd) {
      try {
        await navigator.clipboard.writeText(pwd);
        this._toast('Copied!');
      } catch { this._toast('Copy failed'); }
    },
    useHist(pwd) {
      this.password = pwd;
      this._toast('Password restored');
    },

    toggleCharset(key) {
      const enabled = Object.values(this.charsets).filter(c => c.enabled);
      if (enabled.length === 1 && this.charsets[key].enabled) return; // at least one must stay
      this.charsets[key].enabled = !this.charsets[key].enabled;
      this.generate();
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },

    init() { this.generate(); },
  };
}
