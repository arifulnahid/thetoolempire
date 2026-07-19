/* ── CSS Gradient Generator — Alpine component ── */

const GG_PRESETS = [
  { label: 'Sunset',    type: 'linear', angle: 135, stops: [{color:'#f97316',pos:0},{color:'#ec4899',pos:50},{color:'#8b5cf6',pos:100}] },
  { label: 'Ocean',     type: 'linear', angle: 180, stops: [{color:'#38bdf8',pos:0},{color:'#3b82f6',pos:50},{color:'#1e3a5f',pos:100}] },
  { label: 'Aurora',    type: 'linear', angle: 90,  stops: [{color:'#10b981',pos:0},{color:'#3b82f6',pos:50},{color:'#8b5cf6',pos:100}] },
  { label: 'Fire',      type: 'linear', angle: 45,  stops: [{color:'#fbbf24',pos:0},{color:'#f97316',pos:50},{color:'#dc2626',pos:100}] },
  { label: 'Candy',     type: 'linear', angle: 135, stops: [{color:'#f472b6',pos:0},{color:'#c084fc',pos:50},{color:'#818cf8',pos:100}] },
  { label: 'Gold',      type: 'linear', angle: 90,  stops: [{color:'#fde68a',pos:0},{color:'#f59e0b',pos:50},{color:'#92400e',pos:100}] },
  { label: 'Mint',      type: 'linear', angle: 135, stops: [{color:'#d1fae5',pos:0},{color:'#34d399',pos:100}] },
  { label: 'Rose',      type: 'linear', angle: 135, stops: [{color:'#fda4af',pos:0},{color:'#f43f5e',pos:100}] },
  { label: 'Forest',    type: 'radial', stops: [{color:'#d1fae5',pos:0},{color:'#059669',pos:60},{color:'#064e3b',pos:100}] },
  { label: 'Night Sky', type: 'radial', stops: [{color:'#1e1b4b',pos:0},{color:'#0f172a',pos:100}] },
  { label: 'Rainbow',   type: 'conic',  conicFrom: 0,  stops: [{color:'#ef4444',pos:0},{color:'#f97316',pos:17},{color:'#eab308',pos:33},{color:'#22c55e',pos:50},{color:'#3b82f6',pos:67},{color:'#8b5cf6',pos:83},{color:'#ec4899',pos:100}] },
  { label: 'Pie',       type: 'conic',  conicFrom: 0,  stops: [{color:'#f43f5e',pos:0},{color:'#f43f5e',pos:25},{color:'#f97316',pos:25},{color:'#f97316',pos:50},{color:'#8b5cf6',pos:50},{color:'#8b5cf6',pos:75},{color:'#06b6d4',pos:75},{color:'#06b6d4',pos:100}] },
];

function cssGradientApp() {
  return {
    type: 'linear',

    // Linear
    angle: 135,

    // Radial
    radialShape: 'ellipse',
    radialSize:  'farthest-corner',
    radialPosX:  50,
    radialPosY:  50,

    // Conic
    conicFrom: 0,
    conicPosX: 50,
    conicPosY: 50,

    stops: [
      { id: 1, color: '#f97316', pos:  0 },
      { id: 2, color: '#ec4899', pos: 50 },
      { id: 3, color: '#8b5cf6', pos: 100 },
    ],
    _nextId: 4,

    copied: false,
    presets: GG_PRESETS,

    dirGrid: [
      { arrow: '↖', angle: 315, col: 1, row: 1 },
      { arrow: '↑',  angle: 0,   col: 2, row: 1 },
      { arrow: '↗', angle: 45,  col: 3, row: 1 },
      { arrow: '←', angle: 270, col: 1, row: 2 },
      { arrow: '→', angle: 90,  col: 3, row: 2 },
      { arrow: '↙', angle: 225, col: 1, row: 3 },
      { arrow: '↓',  angle: 180, col: 2, row: 3 },
      { arrow: '↘', angle: 135, col: 3, row: 3 },
    ],

    radialSizes: [
      { id: 'closest-side',    label: 'Closest Side'    },
      { id: 'closest-corner',  label: 'Closest Corner'  },
      { id: 'farthest-side',   label: 'Farthest Side'   },
      { id: 'farthest-corner', label: 'Farthest Corner' },
    ],

    get sortedStops() {
      return [...this.stops].sort((a, b) => a.pos - b.pos);
    },

    get stopsStr() {
      return this.sortedStops.map(s => `${s.color} ${s.pos}%`).join(', ');
    },

    get gradientStr() {
      if (this.type === 'linear') {
        return `linear-gradient(${this.angle}deg, ${this.stopsStr})`;
      }
      if (this.type === 'radial') {
        return `radial-gradient(${this.radialShape} ${this.radialSize} at ${this.radialPosX}% ${this.radialPosY}%, ${this.stopsStr})`;
      }
      return `conic-gradient(from ${this.conicFrom}deg at ${this.conicPosX}% ${this.conicPosY}%, ${this.stopsStr})`;
    },

    get previewBg() {
      return { background: this.gradientStr };
    },

    get barBg() {
      // Always show as a horizontal left→right linear gradient for the stop bar
      return { background: `linear-gradient(90deg, ${this.stopsStr})` };
    },

    get cssCode() {
      return `.element {\n  background: ${this.gradientStr};\n}`;
    },

    addStop() {
      if (this.stops.length >= 8) return;
      const sorted = this.sortedStops;
      let maxGap = -1, midPos = 50, midColor = '#ffffff';
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].pos - sorted[i].pos;
        if (gap > maxGap) {
          maxGap   = gap;
          midPos   = Math.round((sorted[i].pos + sorted[i + 1].pos) / 2);
          midColor = this._blendColors(sorted[i].color, sorted[i + 1].color, 0.5);
        }
      }
      this.stops.push({ id: this._nextId++, color: midColor, pos: midPos });
    },

    removeStop(id) {
      if (this.stops.length <= 2) return;
      this.stops = this.stops.filter(s => s.id !== id);
    },

    _hexToRgb(hex) {
      const h = hex.replace('#', '');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    },

    _toHex(r, g, b) {
      return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    },

    _blendColors(hex1, hex2, t) {
      const a = this._hexToRgb(hex1), b = this._hexToRgb(hex2);
      return this._toHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
    },

    applyPreset(p) {
      this.type = p.type;
      if (p.angle     !== undefined) this.angle     = p.angle;
      if (p.conicFrom !== undefined) this.conicFrom = p.conicFrom;
      this.stops    = p.stops.map((s, i) => ({ id: i + 1, color: s.color, pos: s.pos }));
      this._nextId  = p.stops.length + 1;
    },

    async copyCSS() {
      try {
        await navigator.clipboard.writeText(this.cssCode);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch (_) {}
    },
  };
}
