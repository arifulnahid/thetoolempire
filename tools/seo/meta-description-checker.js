/* Meta Description Length Checker */

/*
  Google truncates meta descriptions at roughly 920px (desktop) or 680px (mobile).
  Arial 14px is the closest approximation to Google's rendering font.
  We use a hidden <canvas> to measure pixel width character-by-character.
*/

let _mdCanvas = null;
let _mdCtx    = null;

function _getCtx() {
  if (_mdCtx) return _mdCtx;
  _mdCanvas = document.createElement('canvas');
  _mdCtx    = _mdCanvas.getContext('2d');
  _mdCtx.font = '14px Arial, sans-serif';
  return _mdCtx;
}

function _measurePx(text) {
  if (!text) return 0;
  return Math.round(_getCtx().measureText(text).width);
}

/* Find the cut-off index for a pixel limit */
function _truncateAt(text, limitPx) {
  if (!text) return text;
  const ctx = _getCtx();
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    w += ctx.measureText(text[i]).width;
    if (w > limitPx) return text.slice(0, i) + '…';
  }
  return text;
}

let _bulkId = 0;
function _mkBulkRow(desc = '', title = '') {
  return { id: ++_bulkId, desc, title };
}

function metaDescApp() {
  return {
    /* ── mode ── */
    mode: 'single', /* 'single' | 'bulk' */

    /* ── single ── */
    description: '',
    pageTitle:   '',
    pageUrl:     '',
    keyword:     '',
    device:      'desktop', /* 'desktop' | 'mobile' */

    /* ── bulk ── */
    bulkRows: [_mkBulkRow(), _mkBulkRow(), _mkBulkRow()],

    /* ── ui ── */
    copied: false,

    /* ── limits ── */
    DESKTOP_PX: 920,
    MOBILE_PX:  680,
    SOFT_MIN:   120,
    SOFT_MAX:   158,

    /* ── computed: pixel widths ── */
    get descPx()  { return _measurePx(this.description); },
    get titlePx() { return _measurePx(this.pageTitle); },
    get limitPx() { return this.device === 'mobile' ? this.MOBILE_PX : this.DESKTOP_PX; },
    get chars()   { return this.description.length; },
    get isTooShort() { return this.chars > 0 && this.chars < this.SOFT_MIN; },
    get isTooLong()  { return this.chars > this.SOFT_MAX; },
    get isOverPx()   { return this.descPx > this.limitPx; },
    get pct()        { return Math.min(Math.round(this.descPx / this.limitPx * 100), 100); },

    get statusLabel() {
      if (!this.description) return 'empty';
      if (this.isOverPx)    return 'truncated';
      if (this.isTooShort)  return 'short';
      if (this.isTooLong)   return 'long';
      return 'good';
    },

    get statusColor() {
      const m = { empty:'--text2', truncated:'#ef4444', short:'#f59e0b', long:'#f59e0b', good:'#10b981' };
      return m[this.statusLabel] || '--text2';
    },

    get statusText() {
      const m = {
        empty:     'Enter a description below',
        truncated: 'Will be cut off in search results',
        short:     'Too short — add more detail',
        long:      'Over soft limit — may be truncated',
        good:      'Looks great!',
      };
      return m[this.statusLabel];
    },

    /* SERP preview strings */
    get serpTitle() {
      if (!this.pageTitle) return 'Your Page Title';
      return _truncateAt(this.pageTitle, this.device === 'mobile' ? 480 : 580);
    },

    get serpDesc() {
      if (!this.description) return 'Your meta description will appear here. Write a compelling summary that accurately describes the page content and includes your target keyword.';
      return _truncateAt(this.description, this.limitPx);
    },

    get serpUrl() {
      if (!this.pageUrl) return 'example.com › page › title';
      try {
        const u = new URL(this.pageUrl.startsWith('http') ? this.pageUrl : 'https://' + this.pageUrl);
        const parts = [u.hostname.replace(/^www\./, ''), ...u.pathname.split('/').filter(Boolean)];
        return parts.join(' › ');
      } catch { return this.pageUrl; }
    },

    /* Keyword highlighting helper — returns array of {text, hl} segments */
    get serpDescSegments() {
      const kw = this.keyword.trim().toLowerCase();
      const text = this.serpDesc;
      if (!kw) return [{ text, hl: false }];
      const idx = text.toLowerCase().indexOf(kw);
      if (idx === -1) return [{ text, hl: false }];
      return [
        { text: text.slice(0, idx), hl: false },
        { text: text.slice(idx, idx + kw.length), hl: true },
        { text: text.slice(idx + kw.length), hl: false },
      ].filter(s => s.text);
    },

    get serpTitleSegments() {
      const kw = this.keyword.trim().toLowerCase();
      const text = this.serpTitle;
      if (!kw) return [{ text, hl: false }];
      const idx = text.toLowerCase().indexOf(kw);
      if (idx === -1) return [{ text, hl: false }];
      return [
        { text: text.slice(0, idx), hl: false },
        { text: text.slice(idx, idx + kw.length), hl: true },
        { text: text.slice(idx + kw.length), hl: false },
      ].filter(s => s.text);
    },

    get keywordInDesc()  { return this.keyword.trim() && this.description.toLowerCase().includes(this.keyword.trim().toLowerCase()); },
    get keywordInTitle() { return this.keyword.trim() && this.pageTitle.toLowerCase().includes(this.keyword.trim().toLowerCase()); },

    /* ── validations ── */
    get validations() {
      const v = [];
      const chk = (label, pass, note, level = 'warn') => v.push({ label, pass, note, level });
      if (!this.description) return v;

      chk('Length ≥ 120 chars', this.chars >= this.SOFT_MIN,
          `${this.chars} chars — descriptions under ${this.SOFT_MIN} chars may be rewritten by Google`, 'warn');

      chk('Length ≤ 158 chars', this.chars <= this.SOFT_MAX,
          `${this.chars}/158 chars`, 'warn');

      chk(`Fits desktop pixel limit (${this.DESKTOP_PX}px)`, _measurePx(this.description) <= this.DESKTOP_PX,
          `${_measurePx(this.description)}px / ${this.DESKTOP_PX}px`, 'warn');

      chk(`Fits mobile pixel limit (${this.MOBILE_PX}px)`, _measurePx(this.description) <= this.MOBILE_PX,
          `${_measurePx(this.description)}px / ${this.MOBILE_PX}px`, 'info');

      if (this.keyword.trim()) {
        chk('Keyword present in description', this.keywordInDesc,
            this.keywordInDesc ? `"${this.keyword}" found` : `"${this.keyword}" not found — include your target keyword`, 'warn');
      }

      chk('No duplicate spaces', !/  /.test(this.description),
          /  /.test(this.description) ? 'Double spaces detected' : 'OK', 'info');

      chk('No all-caps words', !/\b[A-Z]{4,}\b/.test(this.description),
          /\b[A-Z]{4,}\b/.test(this.description) ? 'ALL-CAPS words may look spammy to searchers' : 'OK', 'info');

      chk('Ends with punctuation', /[.!?]$/.test(this.description.trim()),
          /[.!?]$/.test(this.description.trim()) ? 'OK' : 'Consider ending with a full stop or call-to-action', 'info');

      return v;
    },

    get scorePass()  { return this.validations.filter(v => v.pass).length; },
    get scoreTotal() { return this.validations.length; },
    get errorCount() { return this.validations.filter(v => !v.pass && v.level === 'error').length; },
    get warnCount()  { return this.validations.filter(v => !v.pass && v.level === 'warn').length; },

    /* ── bulk ── */
    addBulkRow() { this.bulkRows.push(_mkBulkRow()); },
    removeBulkRow(id) {
      if (this.bulkRows.length <= 1) return;
      this.bulkRows = this.bulkRows.filter(r => r.id !== id);
    },
    bulkStatus(row) {
      const px = _measurePx(row.desc);
      const c  = row.desc.length;
      if (!row.desc) return { label: '—', color: 'var(--text2)', px: 0, chars: 0 };
      if (px > this.DESKTOP_PX)  return { label: 'Truncated', color: '#ef4444', px, chars: c };
      if (c < this.SOFT_MIN)     return { label: 'Too short', color: '#f59e0b', px, chars: c };
      if (c > this.SOFT_MAX)     return { label: 'Over limit', color: '#f59e0b', px, chars: c };
      return { label: 'Good', color: '#10b981', px, chars: c };
    },
    bulkPct(row) {
      return Math.min(Math.round(_measurePx(row.desc) / this.DESKTOP_PX * 100), 100);
    },

    /* ── clipboard ── */
    async copyTag() {
      const d = this.description.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      try {
        await navigator.clipboard.writeText(`<meta name="description" content="${d}"/>`);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch {}
    },
  };
}
