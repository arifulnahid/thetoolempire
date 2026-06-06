/* ── WCAG maths ── */
function hexToRgb(hex) {
  const h = hex.replace('#','');
  const full = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  return {
    r: parseInt(full.slice(0,2),16),
    g: parseInt(full.slice(2,4),16),
    b: parseInt(full.slice(4,6),16)
  };
}

function linearise(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const {r,g,b} = hexToRgb(hex);
  const R = linearise(r), G = linearise(g), B = linearise(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hex1, hex2) {
  const L1 = relativeLuminance(hex1), L2 = relativeLuminance(hex2);
  const lighter = Math.max(L1,L2), darker = Math.min(L1,L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isValidHex(hex) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) || /^#[0-9a-fA-F]{3}$/.test(hex);
}

function normaliseHex(hex) {
  const h = hex.replace('#','');
  if (h.length === 3) return '#' + h.split('').map(c=>c+c).join('');
  return '#' + h;
}

/* ── Safe foreground colours for a given background ── */
const SAFE_COLOURS = [
  '#ffffff','#f8fafc','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a',
  '#000000','#fef2f2','#fee2e2','#fecaca','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d',
  '#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12',
  '#fefce8','#fef9c3','#fef08a','#fde047','#facc15','#eab308','#ca8a04','#a16207','#854d0e','#713f12',
  '#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d',
  '#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b',
  '#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e',
  '#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a',
  '#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95',
  '#fdf4ff','#fae8ff','#f5d0fe','#e879f9','#d946ef','#c026d3','#a21caf','#86198f','#701a75','#4a044e',
];

/* ── Quick-pick accessible pairs ── */
const QUICK_PAIRS = [
  { name:'Black on White',    fg:'#000000', bg:'#ffffff' },
  { name:'White on Black',    fg:'#ffffff', bg:'#000000' },
  { name:'White on Navy',     fg:'#ffffff', bg:'#1e3a8a' },
  { name:'Black on Yellow',   fg:'#000000', bg:'#fde047' },
  { name:'White on Green',    fg:'#ffffff', bg:'#15803d' },
  { name:'White on Purple',   fg:'#ffffff', bg:'#6d28d9' },
  { name:'Black on Mint',     fg:'#000000', bg:'#6ee7b7' },
  { name:'Dark on Gold',      fg:'#1c1917', bg:'#fbbf24' },
];

function contrastCheckerApp() {
  return {
    fgHex: '#ffffff',
    bgHex: '#0f0f14',
    activeTab: 'howto',

    init() {
      this._syncSwatches();
    },

    /* ── computed ── */
    get ratio() {
      if (!isValidHex(this.fgHex) || !isValidHex(this.bgHex)) return 1;
      return contrastRatio(normaliseHex(this.fgHex), normaliseHex(this.bgHex));
    },

    get ratioDisplay() {
      return this.ratio.toFixed(2) + ':1';
    },

    get ratioColor() {
      const r = this.ratio;
      if (r >= 7) return '#34d399';
      if (r >= 4.5) return '#86efac';
      if (r >= 3) return '#fbbf24';
      return '#f87171';
    },

    get fgLuminance() {
      if (!isValidHex(this.fgHex)) return 0;
      return relativeLuminance(normaliseHex(this.fgHex));
    },
    get bgLuminance() {
      if (!isValidHex(this.bgHex)) return 0;
      return relativeLuminance(normaliseHex(this.bgHex));
    },

    /* WCAG checks */
    get aa_normal()  { return this.ratio >= 4.5; },
    get aa_large()   { return this.ratio >= 3; },
    get aaa_normal() { return this.ratio >= 7; },
    get aaa_large()  { return this.ratio >= 4.5; },
    get aa_ui()      { return this.ratio >= 3; },

    get wcagLevel() {
      if (this.aaa_normal) return 'AAA';
      if (this.aa_normal)  return 'AA';
      if (this.aa_large)   return 'AA Large';
      return 'Fail';
    },

    get wcagLevelColor() {
      if (this.aaa_normal) return '#34d399';
      if (this.aa_normal)  return '#86efac';
      if (this.aa_large)   return '#fbbf24';
      return '#f87171';
    },

    /* ── style helpers ── */
    get previewBg() { return isValidHex(this.bgHex) ? normaliseHex(this.bgHex) : '#0f0f14'; },
    get previewFg() { return isValidHex(this.fgHex) ? normaliseHex(this.fgHex) : '#ffffff'; },

    /* ── safe colours list ── */
    get safeFgColours() {
      return SAFE_COLOURS.map(hex => ({
        hex,
        ratio: contrastRatio(hex, normaliseHex(this.bgHex)),
        passes: contrastRatio(hex, normaliseHex(this.bgHex)) >= 4.5
      })).sort((a,b) => b.ratio - a.ratio).slice(0, 40);
    },

    /* ── input handlers ── */
    onFgPick(val) {
      this.fgHex = val;
      this._syncSwatches();
    },
    onBgPick(val) {
      this.bgHex = val;
      this._syncSwatches();
    },
    onFgHex(val) {
      const clean = val.startsWith('#') ? val : '#' + val;
      this.fgHex = clean;
      if (isValidHex(clean)) this._syncSwatches();
    },
    onBgHex(val) {
      const clean = val.startsWith('#') ? val : '#' + val;
      this.bgHex = clean;
      if (isValidHex(clean)) this._syncSwatches();
    },

    swap() {
      [this.fgHex, this.bgHex] = [this.bgHex, this.fgHex];
      this._syncSwatches();
    },

    applySafeColour(hex, isFg = true) {
      if (isFg) { this.fgHex = hex; } else { this.bgHex = hex; }
      this._syncSwatches();
    },

    applyPair(pair) {
      this.fgHex = pair.fg;
      this.bgHex = pair.bg;
      this._syncSwatches();
    },

    pairRatio(pair) {
      return contrastRatio(pair.fg, pair.bg).toFixed(1);
    },

    pairPasses(pair) {
      return contrastRatio(pair.fg, pair.bg) >= 4.5;
    },

    _syncSwatches() {
      this.$nextTick(() => {
        const fgBg = this.$el.querySelectorAll('.color-swatch-bg');
        if (fgBg[0]) fgBg[0].style.background = this.previewFg;
        if (fgBg[1]) fgBg[1].style.background = this.previewBg;
      });
    },

    /* ── Report ── */
    get reportText() {
      return [
        '=== WCAG Contrast Report ===',
        `Foreground: ${this.fgHex.toUpperCase()}`,
        `Background: ${this.bgHex.toUpperCase()}`,
        `Contrast Ratio: ${this.ratioDisplay}`,
        `WCAG Level: ${this.wcagLevel}`,
        '',
        `AA Normal Text (4.5:1):   ${this.aa_normal  ? 'PASS' : 'FAIL'}`,
        `AA Large Text (3:1):      ${this.aa_large   ? 'PASS' : 'FAIL'}`,
        `AAA Normal Text (7:1):    ${this.aaa_normal ? 'PASS' : 'FAIL'}`,
        `AAA Large Text (4.5:1):   ${this.aaa_large  ? 'PASS' : 'FAIL'}`,
        `AA UI Components (3:1):   ${this.aa_ui      ? 'PASS' : 'FAIL'}`,
        '',
        `Foreground Luminance: ${this.fgLuminance.toFixed(4)}`,
        `Background Luminance: ${this.bgLuminance.toFixed(4)}`,
        '',
        'Generated by thetoolempire.com/tools/design/contrast-checker.html',
      ].join('\n');
    },

    async copyReport() {
      try {
        await navigator.clipboard.writeText(this.reportText);
        this._toast('Report copied!');
      } catch {
        this._toast('Copy failed');
      }
    },

    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        this._toast('Copied!');
      } catch {
        this._toast('Copy failed');
      }
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },

    /* ── FAQ ── */
    toggleFaq(el) {
      el.closest('.faq-item').classList.toggle('open');
    },

    /* ── Tabs ── */
    setTab(t) { this.activeTab = t; },

    /* ── Quick pairs ── */
    quickPairs: QUICK_PAIRS,
  };
}
