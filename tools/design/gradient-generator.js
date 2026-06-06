const PRESETS = [
  { name: "Cosmic Dusk",   stops: ["#a78bfa","#f472b6"],       type:"linear", angle:135 },
  { name: "Ocean Breeze",  stops: ["#38bdf8","#34d399"],       type:"linear", angle:120 },
  { name: "Sunset Fire",   stops: ["#f97316","#ef4444","#ec4899"], type:"linear", angle:135 },
  { name: "Mint Fresh",    stops: ["#6ee7b7","#a78bfa"],       type:"linear", angle:90  },
  { name: "Golden Hour",   stops: ["#fbbf24","#f97316"],       type:"linear", angle:90  },
  { name: "Midnight",      stops: ["#1e1b4b","#4338ca","#7c3aed"], type:"linear", angle:135 },
  { name: "Cherry Blossom",stops: ["#fda4af","#f9a8d4","#c4b5fd"], type:"linear", angle:90  },
  { name: "Arctic",        stops: ["#e0f2fe","#7dd3fc","#38bdf8"], type:"linear", angle:180 },
  { name: "Lush Forest",   stops: ["#166534","#15803d","#86efac"], type:"linear", angle:135 },
  { name: "Candy Pop",     stops: ["#f9a8d4","#fde68a","#86efac"], type:"linear", angle:90  },
  { name: "Deep Sea",      stops: ["#164e63","#0e7490","#67e8f9"], type:"radial", pos:"center" },
  { name: "Neon Glow",     stops: ["#0f0f14","#7c3aed","#ec4899"], type:"radial", pos:"center" },
];

function gradientApp() {
  return {
    type: 'linear',
    angle: 135,
    radialPos: 'center',
    stops: [
      { hex: '#a78bfa', pos: 0  },
      { hex: '#f472b6', pos: 100 },
    ],
    repeatCount: 3,
    presets: PRESETS,
    activePreset: null,

    init() {
      this.$nextTick(() => this._syncSliderTracks());
    },

    /* ── CSS output ── */
    get cssValue() {
      const sorted = [...this.stops].sort((a,b) => a.pos - b.pos);
      const colorStr = sorted.map(s => `${s.hex} ${s.pos}%`).join(', ');
      if (this.type === 'linear') return `linear-gradient(${this.angle}deg, ${colorStr})`;
      if (this.type === 'radial')  return `radial-gradient(circle at ${this.radialPos}, ${colorStr})`;
      if (this.type === 'conic')   return `conic-gradient(from ${this.angle}deg at ${this.radialPos}, ${colorStr})`;
      return '';
    },

    get cssRule() {
      return `background: ${this.cssValue};`;
    },

    get fullCss() {
      return `.element {\n  background: ${this.cssValue};\n}`;
    },

    get previewStyle() {
      return { background: this.cssValue };
    },

    /* ── Stop management ── */
    addStop() {
      const sorted = [...this.stops].sort((a,b) => a.pos - b.pos);
      let pos = 50;
      if (sorted.length >= 2) {
        let maxGap = 0, gapPos = 50;
        for (let i = 0; i < sorted.length - 1; i++) {
          const gap = sorted[i+1].pos - sorted[i].pos;
          if (gap > maxGap) { maxGap = gap; gapPos = (sorted[i].pos + sorted[i+1].pos) / 2; }
        }
        pos = Math.round(gapPos);
      }
      const idx = Math.floor(this.stops.length / 2);
      const mid = this._interpolateColor(sorted, pos);
      this.stops.push({ hex: mid, pos });
      this.$nextTick(() => this._syncSliderTracks());
    },

    removeStop(i) {
      if (this.stops.length <= 2) return;
      this.stops.splice(i, 1);
      this.$nextTick(() => this._syncSliderTracks());
    },

    onColorChange(i, val) {
      this.stops[i].hex = val;
      this._syncStopSwatch(i);
      this.$nextTick(() => this._syncSliderTracks());
      this.activePreset = null;
    },

    onHexInput(i, val) {
      const clean = val.replace(/[^0-9a-fA-F#]/g,'');
      this.stops[i].hex = clean;
      if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
        this._syncStopSwatch(i);
        this.$nextTick(() => this._syncSliderTracks());
      }
      this.activePreset = null;
    },

    onPosChange(i) {
      this.$nextTick(() => this._syncSliderTracks());
      this.activePreset = null;
    },

    _syncStopSwatch(i) {
      const swatches = this.$el.querySelectorAll('.stop-swatch');
      if (swatches[i]) swatches[i].style.background = this.stops[i].hex;
    },

    _syncSliderTracks() {
      this.$el.querySelectorAll('.stop-pos-input').forEach((el, i) => {
        const pct = this.stops[i]?.pos ?? 50;
        const col = this.stops[i]?.hex ?? '#888';
        el.style.background = `linear-gradient(to right, ${col} 0%, ${col} ${pct}%, rgba(255,255,255,.15) ${pct}%, rgba(255,255,255,.15) 100%)`;
      });
    },

    /* ── Angle wheel ── */
    startWheelDrag(e) {
      const wheel = e.currentTarget;
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const move = (ev) => {
        const px = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const py = ev.touches ? ev.touches[0].clientY : ev.clientY;
        let deg = Math.round(Math.atan2(px - cx, -(py - cy)) * 180 / Math.PI);
        if (deg < 0) deg += 360;
        this.angle = deg;
        this.activePreset = null;
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      document.addEventListener('touchmove', move, { passive: true });
      document.addEventListener('touchend', up);
    },

    get wheelPointerStyle() {
      return { transform: `translateX(-50%) rotate(${this.angle}deg)` };
    },

    /* ── Presets ── */
    applyPreset(p, i) {
      this.type = p.type;
      if (p.angle !== undefined) this.angle = p.angle;
      if (p.pos !== undefined) this.radialPos = p.pos;
      const positions = p.stops.length === 2 ? [0, 100]
        : p.stops.map((_, idx) => Math.round(idx * 100 / (p.stops.length - 1)));
      this.stops = p.stops.map((hex, idx) => ({ hex, pos: positions[idx] }));
      this.activePreset = i;
      this.$nextTick(() => this._syncSliderTracks());
    },

    randomize() {
      const count = 2 + Math.floor(Math.random() * 3);
      const hues = Array.from({ length: count }, (_, i) =>
        Math.round((Math.random() * 360 + (i * 360 / count)) % 360)
      );
      this.stops = hues.map((h, i) => ({
        hex: this._hslToHex(h, 70 + Math.random() * 25, 55 + Math.random() * 15),
        pos: Math.round(i * 100 / (count - 1))
      }));
      this.angle = Math.round(Math.random() * 360);
      this.activePreset = null;
      this.$nextTick(() => this._syncSliderTracks());
    },

    /* ── Copy ── */
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
      setTimeout(() => t.classList.remove('show'), 2000);
    },

    /* ── Helpers ── */
    _interpolateColor(sortedStops, pos) {
      for (let i = 0; i < sortedStops.length - 1; i++) {
        const a = sortedStops[i], b = sortedStops[i+1];
        if (pos >= a.pos && pos <= b.pos) {
          const t = (pos - a.pos) / (b.pos - a.pos || 1);
          const ra = parseInt(a.hex.slice(1,3),16), ga = parseInt(a.hex.slice(3,5),16), ba2 = parseInt(a.hex.slice(5,7),16);
          const rb = parseInt(b.hex.slice(1,3),16), gb = parseInt(b.hex.slice(3,5),16), bb = parseInt(b.hex.slice(5,7),16);
          const r = Math.round(ra + (rb-ra)*t), g = Math.round(ga + (gb-ga)*t), bv = Math.round(ba2 + (bb-ba2)*t);
          return '#' + [r,g,bv].map(v => v.toString(16).padStart(2,'0')).join('');
        }
      }
      return sortedStops[0]?.hex ?? '#888888';
    },

    _hslToHex(h, s, l) {
      s /= 100; l /= 100;
      const a = s * Math.min(l, 1-l);
      const f = n => { const k=(n+h/30)%12; const c=l-a*Math.max(Math.min(k-3,9-k,1),-1); return Math.round(255*c).toString(16).padStart(2,'0'); };
      return `#${f(0)}${f(8)}${f(4)}`;
    },

    /* ── FAQ toggle ── */
    toggleFaq(el) {
      el.closest('.faq-item').classList.toggle('open');
    },

    /* ── Info tabs ── */
    activeTab: 'howto',
    setTab(t) { this.activeTab = t; },
  };
}
