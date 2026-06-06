/* ─── Conversion utilities ─── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max === min) { h = 0; }
  else {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round((1 - r - k) / (1 - k) * 100),
    m: Math.round((1 - g - k) / (1 - k) * 100),
    y: Math.round((1 - b - k) / (1 - k) * 100),
    k: Math.round(k * 100),
  };
}

function isValidHex(hex) {
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex.trim());
}

function normaliseHex(hex) {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) return '#' + h.split('').map(c => c + c).join('');
  return '#' + h;
}

function clampRgb(v) { return Math.max(0, Math.min(255, parseInt(v) || 0)); }

/* ─── Perceived brightness → text colour ─── */
function textOnColor(hex) {
  const { r, g, b } = hexToRgb(hex.replace('#', '').length === 3
    ? '#' + hex.replace('#', '').split('').map(c => c + c).join('')
    : hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#111111' : '#ffffff';
}

/* ─── Common web colours reference ─── */
const COMMON_COLORS = [
  { name: 'Black',       hex: '#000000' },
  { name: 'White',       hex: '#ffffff' },
  { name: 'Red',         hex: '#ef4444' },
  { name: 'Orange',      hex: '#f97316' },
  { name: 'Yellow',      hex: '#eab308' },
  { name: 'Green',       hex: '#22c55e' },
  { name: 'Teal',        hex: '#14b8a6' },
  { name: 'Sky Blue',    hex: '#38bdf8' },
  { name: 'Blue',        hex: '#3b82f6' },
  { name: 'Indigo',      hex: '#6366f1' },
  { name: 'Violet',      hex: '#8b5cf6' },
  { name: 'Purple',      hex: '#a855f7' },
  { name: 'Pink',        hex: '#ec4899' },
  { name: 'Rose',        hex: '#f43f5e' },
  { name: 'Slate 500',   hex: '#64748b' },
  { name: 'Gray 500',    hex: '#6b7280' },
  { name: 'Dark Gray',   hex: '#374151' },
  { name: 'Light Gray',  hex: '#e5e7eb' },
  { name: 'Cream',       hex: '#fef9c3' },
  { name: 'Navy',        hex: '#1e3a8a' },
];

/* ─── Bulk conversion helpers ─── */
function bulkHexToRgb(input) {
  return input.split('\n').map(line => {
    const t = line.trim();
    if (!t) return '';
    if (isValidHex(t)) {
      const n = normaliseHex(t);
      const { r, g, b } = hexToRgb(n);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return `/* invalid: ${t} */`;
  }).join('\n');
}

function bulkRgbToHex(input) {
  return input.split('\n').map(line => {
    const t = line.trim();
    if (!t) return '';
    const m = t.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return rgbToHex(+m[1], +m[2], +m[3]).toUpperCase();
    // bare numbers  255 128 0
    const nums = t.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (nums.length >= 3) return rgbToHex(nums[0], nums[1], nums[2]).toUpperCase();
    return `/* invalid: ${t} */`;
  }).join('\n');
}

/* ─── Alpine component ─── */
function hexRgbApp() {
  return {
    hex: '#38bdf8',
    r: 56, g: 189, b: 248,
    activeTab: 'howto',
    bulkMode: 'hex2rgb',
    bulkInput: '#ef4444\n#3b82f6\n#22c55e\n#f97316\n#8b5cf6',
    bulkOutput: '',
    commonColors: COMMON_COLORS,

    init() {
      this._syncFromHex();
      this.bulkConvert();
    },

    /* ── Hex input ── */
    onHexInput(val) {
      const clean = val.startsWith('#') ? val : '#' + val;
      this.hex = clean;
      if (isValidHex(clean)) {
        const n = normaliseHex(clean);
        const rgb = hexToRgb(n);
        this.r = rgb.r; this.g = rgb.g; this.b = rgb.b;
      }
    },

    onNativePick(val) {
      this.hex = val;
      const rgb = hexToRgb(val);
      this.r = rgb.r; this.g = rgb.g; this.b = rgb.b;
    },

    /* ── RGB inputs ── */
    onRgbInput() {
      this.r = clampRgb(this.r);
      this.g = clampRgb(this.g);
      this.b = clampRgb(this.b);
      this.hex = rgbToHex(this.r, this.g, this.b);
    },

    /* ── Sliders ── */
    onSliderR() { this.r = parseInt(this.r); this.hex = rgbToHex(this.r, this.g, this.b); },
    onSliderG() { this.g = parseInt(this.g); this.hex = rgbToHex(this.r, this.g, this.b); },
    onSliderB() { this.b = parseInt(this.b); this.hex = rgbToHex(this.r, this.g, this.b); },

    /* ── Click common color ── */
    pickCommon(hex) {
      this.hex = hex;
      this._syncFromHex();
    },

    _syncFromHex() {
      const n = normaliseHex(this.hex);
      const rgb = hexToRgb(n);
      this.r = rgb.r; this.g = rgb.g; this.b = rgb.b;
    },

    /* ── Computed formats ── */
    get hexUpper()    { return isValidHex(this.hex) ? normaliseHex(this.hex).toUpperCase() : '—'; },
    get hexLower()    { return isValidHex(this.hex) ? normaliseHex(this.hex).toLowerCase() : '—'; },
    get hexShort() {
      const h = normaliseHex(this.hex).replace('#', '');
      if (h[0]===h[1] && h[2]===h[3] && h[4]===h[5]) return '#' + h[0]+h[2]+h[4];
      return '—';
    },
    get rgbString()   { return `rgb(${this.r}, ${this.g}, ${this.b})`; },
    get rgbaString()  { return `rgba(${this.r}, ${this.g}, ${this.b}, 1)`; },
    get hsl() { return rgbToHsl(this.r, this.g, this.b); },
    get hslString()   { const h = this.hsl; return `hsl(${h.h}, ${h.s}%, ${h.l}%)`; },
    get hsv() { return rgbToHsv(this.r, this.g, this.b); },
    get hsvString()   { const h = this.hsv; return `hsb(${h.h}, ${h.s}%, ${h.v}%)`; },
    get cmyk() { return rgbToCmyk(this.r, this.g, this.b); },
    get cmykString()  { const c = this.cmyk; return `cmyk(${c.c}%, ${c.m}%, ${c.y}%, ${c.k}%)`; },
    get cssHex()      { return `color: ${this.hexUpper};`; },
    get cssRgb()      { return `color: ${this.rgbString};`; },
    get swatchStyle() { return isValidHex(this.hex) ? normaliseHex(this.hex) : '#38bdf8'; },
    get swatchTextColor() { return isValidHex(this.hex) ? textOnColor(normaliseHex(this.hex)) : '#fff'; },

    get rTrack() { return `linear-gradient(to right,rgb(0,${this.g},${this.b}),rgb(255,${this.g},${this.b}))`; },
    get gTrack() { return `linear-gradient(to right,rgb(${this.r},0,${this.b}),rgb(${this.r},255,${this.b}))`; },
    get bTrack() { return `linear-gradient(to right,rgb(${this.r},${this.g},0),rgb(${this.r},${this.g},255))`; },

    /* ── Bulk ── */
    bulkConvert() {
      if (this.bulkMode === 'hex2rgb') {
        this.bulkOutput = bulkHexToRgb(this.bulkInput);
      } else {
        this.bulkOutput = bulkRgbToHex(this.bulkInput);
      }
    },

    setBulkMode(mode) {
      this.bulkMode = mode;
      this.bulkInput = mode === 'hex2rgb'
        ? '#ef4444\n#3b82f6\n#22c55e\n#f97316\n#8b5cf6'
        : 'rgb(239, 68, 68)\nrgb(59, 130, 246)\nrgb(34, 197, 94)\nrgb(249, 115, 22)\nrgb(139, 92, 246)';
      this.bulkConvert();
    },

    /* ── Copy ── */
    async copy(text) {
      try { await navigator.clipboard.writeText(text); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },

    async copyBulkOutput() {
      if (!this.bulkOutput.trim()) return;
      try { await navigator.clipboard.writeText(this.bulkOutput); this._toast('Output copied!'); }
      catch { this._toast('Copy failed'); }
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },

    /* ── FAQ ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    /* ── Tabs ── */
    setTab(t) { this.activeTab = t; },
  };
}
