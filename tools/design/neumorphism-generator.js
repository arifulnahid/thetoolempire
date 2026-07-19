/* ── Neumorphism Generator — Alpine component ── */

const NM_DIRS = {
  'top-left':     { dx:  1, dy:  1, grad: '145deg' },
  'top-right':    { dx: -1, dy:  1, grad: '225deg' },
  'bottom-left':  { dx:  1, dy: -1, grad:  '45deg' },
  'bottom-right': { dx: -1, dy: -1, grad: '315deg' },
};

function neumorphismApp() {
  return {
    bgColor:      '#e0e5ec',
    intensity:    0.15,
    distance:     8,
    blur:         16,
    borderRadius: 16,
    shape:        'flat',
    lightDir:     'top-left',
    copied: false,

    shapes: [
      { id: 'flat',    label: 'Flat'    },
      { id: 'pressed', label: 'Pressed' },
      { id: 'concave', label: 'Concave' },
      { id: 'convex',  label: 'Convex'  },
    ],

    lightDirs: [
      { id: 'top-left',     label: 'Top-Left'     },
      { id: 'top-right',    label: 'Top-Right'    },
      { id: 'bottom-left',  label: 'Bottom-Left'  },
      { id: 'bottom-right', label: 'Bottom-Right' },
    ],

    _hexToRgb(hex) {
      const h = hex.replace('#', '');
      return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
    },

    _toHex(r, g, b) {
      return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2,'0')).join('');
    },

    _darken(hex, amt) {
      const { r, g, b } = this._hexToRgb(hex);
      return this._toHex(Math.round(r*(1-amt)), Math.round(g*(1-amt)), Math.round(b*(1-amt)));
    },

    _lighten(hex, amt) {
      const { r, g, b } = this._hexToRgb(hex);
      return this._toHex(Math.round(r+(255-r)*amt), Math.round(g+(255-g)*amt), Math.round(b+(255-b)*amt));
    },

    get darkColor()  { return this._darken(this.bgColor, this.intensity); },
    get lightColor() { return this._lighten(this.bgColor, this.intensity * 2); },

    /* Readable text: dark on light bg, light on dark bg */
    get textColor() {
      const { r, g, b } = this._hexToRgb(this.bgColor);
      const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return L > 0.5 ? this.darkColor : this.lightColor;
    },

    /* Scaled shadows for inner preview elements, direction-aware */
    get innerShadowStr() {
      const d  = NM_DIRS[this.lightDir];
      const x  = Math.max(2, Math.round(this.distance * 0.45));
      const bl = Math.max(4, Math.round(this.blur * 0.45));
      return [
        `${d.dx * x}px ${d.dy * x}px ${bl}px ${this.darkColor}`,
        `${-d.dx * x}px ${-d.dy * x}px ${bl}px ${this.lightColor}`,
      ].join(', ');
    },

    _shadows(inset) {
      const d   = NM_DIRS[this.lightDir];
      const pfx = inset ? 'inset ' : '';
      const x   = this.distance;
      return [
        `${pfx}${d.dx * x}px ${d.dy * x}px ${this.blur}px ${this.darkColor}`,
        `${pfx}${-d.dx * x}px ${-d.dy * x}px ${this.blur}px ${this.lightColor}`,
      ].join(', ');
    },

    _bgRule() {
      const d = NM_DIRS[this.lightDir];
      if (this.shape === 'concave') return `linear-gradient(${d.grad}, ${this.darkColor}, ${this.lightColor})`;
      if (this.shape === 'convex')  return `linear-gradient(${d.grad}, ${this.lightColor}, ${this.darkColor})`;
      return this.bgColor;
    },

    get neumStyleStr() {
      return [
        `background: ${this._bgRule()}`,
        `border-radius: ${this.borderRadius}px`,
        `box-shadow: ${this._shadows(this.shape === 'pressed')}`,
      ].join('; ');
    },

    get cssCode() {
      return `.neumorphic {
  background: ${this._bgRule()};
  border-radius: ${this.borderRadius}px;
  box-shadow: ${this._shadows(this.shape === 'pressed')};
}`;
    },

    async copyCSS() {
      try {
        await navigator.clipboard.writeText(this.cssCode);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch (_) {}
    },

    reset() {
      this.bgColor      = '#e0e5ec';
      this.intensity    = 0.15;
      this.distance     = 8;
      this.blur         = 16;
      this.borderRadius = 16;
      this.shape        = 'flat';
      this.lightDir     = 'top-left';
    },
  };
}
