/* ── Utility: hex ↔ rgb ↔ hsl conversions ── */
function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
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
function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0, s = max === 0 ? 0 : d / max, v = max;
  if (d !== 0) {
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
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100)
  };
}
function luminance(r, g, b) {
  const sRGB = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}
function contrastRatio(hex1, hex2) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  const L1 = luminance(c1.r, c1.g, c1.b);
  const L2 = luminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}
function rotateHue(hex, deg) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nh = ((h + deg) % 360 + 360) % 360;
  const nr = hslToRgb(nh, s, l);
  return rgbToHex(nr.r, nr.g, nr.b);
}
function adjustL(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nl = Math.max(0, Math.min(100, l + amount));
  const nr = hslToRgb(h, s, nl);
  return rgbToHex(nr.r, nr.g, nr.b);
}

/* ── Named CSS color finder ── */
const CSS_COLORS = [
  ['aliceblue','#f0f8ff'],['antiquewhite','#faebd7'],['aqua','#00ffff'],['aquamarine','#7fffd4'],
  ['azure','#f0ffff'],['beige','#f5f5dc'],['bisque','#ffe4c4'],['black','#000000'],
  ['blanchedalmond','#ffebcd'],['blue','#0000ff'],['blueviolet','#8a2be2'],['brown','#a52a2a'],
  ['burlywood','#deb887'],['cadetblue','#5f9ea0'],['chartreuse','#7fff00'],['chocolate','#d2691e'],
  ['coral','#ff7f50'],['cornflowerblue','#6495ed'],['cornsilk','#fff8dc'],['crimson','#dc143c'],
  ['cyan','#00ffff'],['darkblue','#00008b'],['darkcyan','#008b8b'],['darkgoldenrod','#b8860b'],
  ['darkgray','#a9a9a9'],['darkgreen','#006400'],['darkkhaki','#bdb76b'],['darkmagenta','#8b008b'],
  ['darkolivegreen','#556b2f'],['darkorange','#ff8c00'],['darkorchid','#9932cc'],['darkred','#8b0000'],
  ['darksalmon','#e9967a'],['darkseagreen','#8fbc8f'],['darkslateblue','#483d8b'],['darkslategray','#2f4f4f'],
  ['darkturquoise','#00ced1'],['darkviolet','#9400d3'],['deeppink','#ff1493'],['deepskyblue','#00bfff'],
  ['dimgray','#696969'],['dodgerblue','#1e90ff'],['firebrick','#b22222'],['floralwhite','#fffaf0'],
  ['forestgreen','#228b22'],['fuchsia','#ff00ff'],['gainsboro','#dcdcdc'],['ghostwhite','#f8f8ff'],
  ['gold','#ffd700'],['goldenrod','#daa520'],['gray','#808080'],['green','#008000'],
  ['greenyellow','#adff2f'],['honeydew','#f0fff0'],['hotpink','#ff69b4'],['indianred','#cd5c5c'],
  ['indigo','#4b0082'],['ivory','#fffff0'],['khaki','#f0e68c'],['lavender','#e6e6fa'],
  ['lawngreen','#7cfc00'],['lemonchiffon','#fffacd'],['lightblue','#add8e6'],['lightcoral','#f08080'],
  ['lightcyan','#e0ffff'],['lightgoldenrodyellow','#fafad2'],['lightgray','#d3d3d3'],['lightgreen','#90ee90'],
  ['lightpink','#ffb6c1'],['lightsalmon','#ffa07a'],['lightseagreen','#20b2aa'],['lightskyblue','#87cefa'],
  ['lightslategray','#778899'],['lightsteelblue','#b0c4de'],['lightyellow','#ffffe0'],['lime','#00ff00'],
  ['limegreen','#32cd32'],['linen','#faf0e6'],['magenta','#ff00ff'],['maroon','#800000'],
  ['mediumaquamarine','#66cdaa'],['mediumblue','#0000cd'],['mediumorchid','#ba55d3'],['mediumpurple','#9370db'],
  ['mediumseagreen','#3cb371'],['mediumslateblue','#7b68ee'],['mediumspringgreen','#00fa9a'],
  ['mediumturquoise','#48d1cc'],['mediumvioletred','#c71585'],['midnightblue','#191970'],
  ['mintcream','#f5fffa'],['mistyrose','#ffe4e1'],['moccasin','#ffe4b5'],['navajowhite','#ffdead'],
  ['navy','#000080'],['oldlace','#fdf5e6'],['olive','#808000'],['olivedrab','#6b8e23'],
  ['orange','#ffa500'],['orangered','#ff4500'],['orchid','#da70d6'],['palegoldenrod','#eee8aa'],
  ['palegreen','#98fb98'],['paleturquoise','#afeeee'],['palevioletred','#db7093'],['papayawhip','#ffefd5'],
  ['peachpuff','#ffdab9'],['peru','#cd853f'],['pink','#ffc0cb'],['plum','#dda0dd'],
  ['powderblue','#b0e0e6'],['purple','#800080'],['red','#ff0000'],['rosybrown','#bc8f8f'],
  ['royalblue','#4169e1'],['saddlebrown','#8b4513'],['salmon','#fa8072'],['sandybrown','#f4a460'],
  ['seagreen','#2e8b57'],['seashell','#fff5ee'],['sienna','#a0522d'],['silver','#c0c0c0'],
  ['skyblue','#87ceeb'],['slateblue','#6a5acd'],['slategray','#708090'],['snow','#fffafa'],
  ['springgreen','#00ff7f'],['steelblue','#4682b4'],['tan','#d2b48c'],['teal','#008080'],
  ['thistle','#d8bfd8'],['tomato','#ff6347'],['turquoise','#40e0d0'],['violet','#ee82ee'],
  ['wheat','#f5deb3'],['white','#ffffff'],['whitesmoke','#f5f5f5'],['yellow','#ffff00'],
  ['yellowgreen','#9acd32'],
];
function findNearestCssName(hex) {
  const { r, g, b } = hexToRgb(hex);
  let best = null, bestDist = Infinity;
  for (const [name, h] of CSS_COLORS) {
    const c = hexToRgb(h);
    const d = (c.r-r)**2 + (c.g-g)**2 + (c.b-b)**2;
    if (d === 0) return { exact: true, name, hex: h };
    if (d < bestDist) { bestDist = d; best = { name, hex: h }; }
  }
  return { exact: false, ...best };
}

/* ── Palette presets ── */
const PRESETS = {
  material: ['#f44336','#e91e63','#9c27b0','#673ab7','#3f51b5','#2196f3','#03a9f4','#00bcd4','#009688','#4caf50','#8bc34a','#cddc39','#ffeb3b','#ffc107','#ff9800','#ff5722','#795548','#9e9e9e','#607d8b','#000000'],
  tailwind: ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f43f5e','#14b8a6','#84cc16','#6366f1','#f59e0b','#10b981','#0ea5e9','#a855f7','#64748b','#1e293b','#0f172a','#ffffff'],
  flat:     ['#1abc9c','#2ecc71','#3498db','#9b59b6','#34495e','#16a085','#27ae60','#2980b9','#8e44ad','#2c3e50','#f1c40f','#e67e22','#e74c3c','#ecf0f1','#95a5a6','#f39c12','#d35400','#c0392b','#bdc3c7','#7f8c8d'],
  pastel:   ['#ffd1dc','#ffb3ba','#ffdfba','#ffffba','#baffc9','#bae1ff','#e8baff','#ffc9de','#c9ffd1','#c9e4ff','#ffd9ba','#d4f0b6','#b6d4f0','#f0b6d4','#f0d4b6','#b6f0e1','#e1b6f0','#f0e1b6','#d4b6f0','#f0b6b6'],
};

/* ── Alpine app ── */
function colorPickerApp() {
  return {
    hex: '#a78bfa',
    r: 167, g: 139, b: 250,
    h: 258, s: 89, l: 76,
    contrastHex: '#1e1e28',
    activeFormat: 'hex',
    activePreset: 'material',
    savedColors: [],
    openFaq: null,
    showReport: false,
    reportText: '',
    activeTab: 'how',

    init() {
      try {
        const s = localStorage.getItem('cp_saved');
        if (s) this.savedColors = JSON.parse(s);
      } catch(e) {}
      this._syncAll();
    },

    /* ── Sync from hex ── */
    _syncAll() {
      const { r, g, b } = hexToRgb(this.hex);
      this.r = r; this.g = g; this.b = b;
      const hsl = rgbToHsl(r, g, b);
      this.h = hsl.h; this.s = hsl.s; this.l = hsl.l;
    },

    /* ── From native picker / hex input ── */
    onHexChange(v) {
      const clean = v.replace(/[^0-9a-fA-F#]/g, '');
      const test = clean.startsWith('#') ? clean : '#' + clean;
      if (/^#[0-9a-fA-F]{6}$/.test(test)) {
        this.hex = test.toLowerCase();
        this._syncAll();
      }
    },
    onNativePick(v) {
      this.hex = v.toLowerCase();
      this._syncAll();
    },

    /* ── From RGB sliders/inputs ── */
    onRgbChange() {
      this.r = Math.max(0, Math.min(255, parseInt(this.r) || 0));
      this.g = Math.max(0, Math.min(255, parseInt(this.g) || 0));
      this.b = Math.max(0, Math.min(255, parseInt(this.b) || 0));
      this.hex = rgbToHex(this.r, this.g, this.b);
      const hsl = rgbToHsl(this.r, this.g, this.b);
      this.h = hsl.h; this.s = hsl.s; this.l = hsl.l;
    },

    /* ── From HSL sliders/inputs ── */
    onHslChange() {
      this.h = Math.max(0, Math.min(360, parseInt(this.h) || 0));
      this.s = Math.max(0, Math.min(100, parseInt(this.s) || 0));
      this.l = Math.max(0, Math.min(100, parseInt(this.l) || 0));
      const rgb = hslToRgb(this.h, this.s, this.l);
      this.r = rgb.r; this.g = rgb.g; this.b = rgb.b;
      this.hex = rgbToHex(this.r, this.g, this.b);
    },

    /* ── Computed values ── */
    get hslString()  { return `hsl(${this.h}, ${this.s}%, ${this.l}%)`; },
    get rgbString()  { return `rgb(${this.r}, ${this.g}, ${this.b})`; },
    get hsv()        { return rgbToHsv(this.r, this.g, this.b); },
    get cmyk()       { return rgbToCmyk(this.r, this.g, this.b); },
    get hexUpper()   { return this.hex.toUpperCase(); },
    get cssName()    { return findNearestCssName(this.hex); },
    get hsvString()  { const v = this.hsv; return `hsv(${v.h}, ${v.s}%, ${v.v}%)`; },
    get cmykString() { const c = this.cmyk; return `cmyk(${c.c}%, ${c.m}%, ${c.y}%, ${c.k}%)`; },

    /* ── Slider backgrounds ── */
    get rTrack() { return `linear-gradient(to right,rgb(0,${this.g},${this.b}),rgb(255,${this.g},${this.b}))`; },
    get gTrack() { return `linear-gradient(to right,rgb(${this.r},0,${this.b}),rgb(${this.r},255,${this.b}))`; },
    get bTrack() { return `linear-gradient(to right,rgb(${this.r},${this.g},0),rgb(${this.r},${this.g},255))`; },
    get hTrack() {
      const stops = Array.from({length:7},(_,i)=>i*60).map(h=>{const {r,g,b}=hslToRgb(h,this.s,this.l);return `rgb(${r},${g},${b})`});
      return `linear-gradient(to right,${stops.join(',')})`;
    },
    get sTrack() {
      const lo = hslToRgb(this.h,0,this.l), hi = hslToRgb(this.h,100,this.l);
      return `linear-gradient(to right,rgb(${lo.r},${lo.g},${lo.b}),rgb(${hi.r},${hi.g},${hi.b}))`;
    },
    get lTrack() {
      const lo = hslToRgb(this.h,this.s,0), mid = hslToRgb(this.h,this.s,50), hi = hslToRgb(this.h,this.s,100);
      return `linear-gradient(to right,rgb(${lo.r},${lo.g},${lo.b}),rgb(${mid.r},${mid.g},${mid.b}),rgb(${hi.r},${hi.g},${hi.b}))`;
    },

    /* ── Harmonies ── */
    get harmonies() {
      return {
        complementary: [this.hex, rotateHue(this.hex, 180)],
        analogous:     [rotateHue(this.hex,-30), this.hex, rotateHue(this.hex,30)],
        triadic:       [this.hex, rotateHue(this.hex,120), rotateHue(this.hex,240)],
        splitComp:     [this.hex, rotateHue(this.hex,150), rotateHue(this.hex,210)],
        tetradic:      [this.hex, rotateHue(this.hex,90), rotateHue(this.hex,180), rotateHue(this.hex,270)],
        tints:         [adjustL(this.hex,20), adjustL(this.hex,35), adjustL(this.hex,50)],
        shades:        [adjustL(this.hex,-20), adjustL(this.hex,-35), adjustL(this.hex,-50)],
      };
    },

    /* ── Contrast ── */
    get contrast() { return contrastRatio(this.hex, this.contrastHex); },
    get wcagAA()   { return parseFloat(this.contrast) >= 4.5; },
    get wcagAAA()  { return parseFloat(this.contrast) >= 7; },
    get wcagAALg() { return parseFloat(this.contrast) >= 3; },
    get textOnBg() {
      const lum = luminance(this.r, this.g, this.b);
      return lum > 0.179 ? '#111111' : '#ffffff';
    },

    /* ── Palette ── */
    get currentPalette() { return PRESETS[this.activePreset] || []; },
    setFromPalette(hex) {
      this.hex = hex.toLowerCase();
      this._syncAll();
    },

    /* ── Saved ── */
    saveColor() {
      if (this.savedColors.includes(this.hex)) return;
      this.savedColors.unshift(this.hex);
      if (this.savedColors.length > 20) this.savedColors.pop();
      this._persist();
      this.showToast('Color saved!');
    },
    deleteSaved(i) { this.savedColors.splice(i, 1); this._persist(); },
    _persist() {
      try { localStorage.setItem('cp_saved', JSON.stringify(this.savedColors)); } catch(e) {}
    },

    /* ── Clipboard ── */
    copy(text) {
      navigator.clipboard.writeText(text).then(() => this.showToast('Copied: ' + text)).catch(() => this.showToast('Copy failed'));
    },

    /* ── FAQ ── */
    toggleFaq(i) {
      this.openFaq = this.openFaq === i ? null : i;
      this.$nextTick(() => {
        document.querySelectorAll('.faq-item').forEach((el, idx) => {
          el.classList.toggle('open', idx === this.openFaq);
        });
      });
    },
    submitReport() { this.showReport = false; this.reportText = ''; this.showToast('Report submitted — thank you!'); },
    showToast(msg) {
      const t = document.getElementById('cp-toast');
      if (!t) return;
      t.querySelector('.toast-msg').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2600);
    },
  };
}
