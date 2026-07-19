/* ── Glassmorphism Generator — Alpine component ── */

const GG_BG_PRESETS = [
  { id: 'sunset',  label: 'Sunset',  bg: 'linear-gradient(135deg,#f093fb 0%,#f5576c 40%,#4facfe 100%)' },
  { id: 'ocean',   label: 'Ocean',   bg: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' },
  { id: 'forest',  label: 'Forest',  bg: 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)' },
  { id: 'night',   label: 'Night',   bg: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)' },
  { id: 'aurora',  label: 'Aurora',  bg: 'linear-gradient(135deg,#a8edea 0%,#fed6e3 100%)' },
  { id: 'cosmic',  label: 'Cosmic',  bg: 'linear-gradient(135deg,#4776e6 0%,#8e54e9 100%)' },
  { id: 'candy',   label: 'Candy',   bg: 'linear-gradient(135deg,#f093fb 0%,#fad0c4 100%)' },
  { id: 'fire',    label: 'Fire',    bg: 'linear-gradient(135deg,#f7971e 0%,#ffd200 60%,#ff6b35 100%)' },
];

const GG_STYLE_PRESETS = [
  { id: 'subtle',  label: 'Subtle',  blur: 6,  opacity: 0.06, border: 0.10, shadow: 0.08 },
  { id: 'frosted', label: 'Frosted', blur: 16, opacity: 0.15, border: 0.25, shadow: 0.15 },
  { id: 'heavy',   label: 'Heavy',   blur: 32, opacity: 0.25, border: 0.40, shadow: 0.25 },
  { id: 'opaque',  label: 'Opaque',  blur: 20, opacity: 0.45, border: 0.55, shadow: 0.20 },
];

function glassmorphismApp() {
  return {
    blurAmount:    16,
    bgColor:       '#ffffff',
    bgOpacity:     0.15,
    saturation:    180,
    borderOpacity: 0.25,
    borderWidth:   1,
    borderRadius:  16,
    shadowBlur:    32,
    shadowOpacity: 0.15,
    shadowColor:   '#000000',
    bgPreset:      'sunset',

    bgPresets:    GG_BG_PRESETS,
    stylePresets: GG_STYLE_PRESETS,
    copied: false,

    get currentBg() {
      return GG_BG_PRESETS.find(p => p.id === this.bgPreset)?.bg || GG_BG_PRESETS[0].bg;
    },

    _hexToRgb(hex) {
      const h = hex.replace('#', '');
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    },

    _rgba(hex, a) {
      const { r, g, b } = this._hexToRgb(hex);
      return `rgba(${r}, ${g}, ${b}, ${parseFloat(a).toFixed(2)})`;
    },

    get glassStyleStr() {
      return [
        `background:${this._rgba(this.bgColor, this.bgOpacity)}`,
        `backdrop-filter:blur(${this.blurAmount}px) saturate(${this.saturation}%)`,
        `-webkit-backdrop-filter:blur(${this.blurAmount}px) saturate(${this.saturation}%)`,
        `border-radius:${this.borderRadius}px`,
        `border:${this.borderWidth}px solid ${this._rgba(this.bgColor, this.borderOpacity)}`,
        `box-shadow:0 8px ${this.shadowBlur}px ${this._rgba(this.shadowColor, this.shadowOpacity)}`,
      ].join(';');
    },

    get cssCode() {
      const { r, g, b }         = this._hexToRgb(this.bgColor);
      const { r: sr, g: sg, b: sb } = this._hexToRgb(this.shadowColor);
      const bgOp  = parseFloat(this.bgOpacity).toFixed(2);
      const brdOp = parseFloat(this.borderOpacity).toFixed(2);
      const shOp  = parseFloat(this.shadowOpacity).toFixed(2);
      return `.glass {
  background: rgba(${r}, ${g}, ${b}, ${bgOp});
  backdrop-filter: blur(${this.blurAmount}px) saturate(${this.saturation}%);
  -webkit-backdrop-filter: blur(${this.blurAmount}px) saturate(${this.saturation}%);
  border-radius: ${this.borderRadius}px;
  border: ${this.borderWidth}px solid rgba(${r}, ${g}, ${b}, ${brdOp});
  box-shadow: 0 8px ${this.shadowBlur}px rgba(${sr}, ${sg}, ${sb}, ${shOp});
}`;
    },

    applyStylePreset(sp) {
      this.blurAmount    = sp.blur;
      this.bgOpacity     = sp.opacity;
      this.borderOpacity = sp.border;
      this.shadowOpacity = sp.shadow;
    },

    async copyCSS() {
      try {
        await navigator.clipboard.writeText(this.cssCode);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch (_) {}
    },

    reset() {
      this.blurAmount    = 16;
      this.bgColor       = '#ffffff';
      this.bgOpacity     = 0.15;
      this.saturation    = 180;
      this.borderOpacity = 0.25;
      this.borderWidth   = 1;
      this.borderRadius  = 16;
      this.shadowBlur    = 32;
      this.shadowOpacity = 0.15;
      this.shadowColor   = '#000000';
    },
  };
}
