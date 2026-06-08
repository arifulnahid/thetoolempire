/* XY Coordinate Graph — click-to-plot, manual entry, point difference */

const PT_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#06b6d4',
  '#f97316','#8b5cf6','#ec4899','#84cc16','#14b8a6',
];

/* Canvas and ctx live outside Alpine's reactive proxy — proxying native
   DOM objects causes silent failures on canvas width/height assignments
   and context method calls (same pattern used across all canvas tools). */
let _canvas = null;
let _ctx    = null;

function xyGraphApp() {
  return {
    points:     [],
    nextId:     1,
    manualX:    '',
    manualY:    '',
    selA:       '',
    selB:       '',
    viewRange:  10,
    snapToGrid: false,
    showLabels: true,
    mousePos:   null,

    /* ── init ─────────────────────────────── */
    init() {
      _canvas = this.$refs.graphCanvas;
      _ctx    = _canvas.getContext('2d');
      this._resizeCanvas();
      const ro = new ResizeObserver(() => this._resizeCanvas());
      ro.observe(this.$refs.canvasWrap);
    },

    /* ── coordinate helpers ───────────────── */
    get scale() {
      return _canvas ? _canvas.width / (2 * this.viewRange) : 30;
    },

    toCanvas(wx, wy) {
      return [
        _canvas.width  / 2 + wx * this.scale,
        _canvas.height / 2 - wy * this.scale,
      ];
    },

    toWorld(cx, cy) {
      return [
        (cx - _canvas.width  / 2) / this.scale,
       -(cy - _canvas.height / 2) / this.scale,
      ];
    },

    /* ── canvas resize ────────────────────── */
    _resizeCanvas() {
      const wrap = this.$refs.canvasWrap;
      const size = wrap.clientWidth;
      _canvas.width  = size;
      _canvas.height = size;
      this.draw();
    },

    /* ── full redraw ──────────────────────── */
    draw() {
      if (!_ctx) return;
      const c   = _canvas;
      const ctx = _ctx;
      ctx.clearRect(0, 0, c.width, c.height);
      this._drawGrid(ctx, c);
      this._drawAxes(ctx, c);
      this._drawMousePreview(ctx);
      this._drawSegment(ctx);
      this._drawPoints(ctx);
    },

    /* ── grid ─────────────────────────────── */
    _gridStep() {
      const ppu = this.scale;
      if (ppu >= 40) return 1;
      if (ppu >= 20) return 2;
      if (ppu >= 8)  return 5;
      if (ppu >= 4)  return 10;
      return 25;
    },

    _drawGrid(ctx, c) {
      const step = this._gridStep();
      const lo   = Math.ceil( -this.viewRange / step) * step;
      const hi   = Math.floor( this.viewRange / step) * step;
      ctx.save();
      for (let v = lo; v <= hi; v += step) {
        const major = (v % (step * 5) === 0);
        ctx.strokeStyle = major ? '#26263a' : '#1c1c2a';
        ctx.lineWidth   = major ? 1 : 0.5;
        const [cx] = this.toCanvas(v, 0);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, c.height); ctx.stroke();
        const [, cy] = this.toCanvas(0, v);
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(c.width, cy); ctx.stroke();
      }
      ctx.restore();
    },

    /* ── axes ─────────────────────────────── */
    _drawAxes(ctx, c) {
      const mx = c.width  / 2;
      const my = c.height / 2;
      const AW = 7;
      ctx.save();

      ctx.strokeStyle = '#4e4e6e';
      ctx.lineWidth   = 1.5;
      ctx.beginPath(); ctx.moveTo(6, my);            ctx.lineTo(c.width - 6, my);  ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx, c.height - 6); ctx.lineTo(mx, 6);            ctx.stroke();

      ctx.fillStyle = '#4e4e6e';
      ctx.beginPath();
      ctx.moveTo(c.width - 5, my - AW / 2);
      ctx.lineTo(c.width,     my);
      ctx.lineTo(c.width - 5, my + AW / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx - AW / 2, 5);
      ctx.lineTo(mx, 0);
      ctx.lineTo(mx + AW / 2, 5);
      ctx.fill();

      ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';    ctx.textBaseline = 'middle';
      ctx.fillText('x', c.width - 14, my - 13);
      ctx.textAlign = 'center';  ctx.textBaseline = 'top';
      ctx.fillText('y', mx + 12, 4);

      const step = this._gridStep();
      const lo   = Math.ceil( -this.viewRange / step) * step;
      const hi   = Math.floor( this.viewRange / step) * step;
      ctx.font = '10px system-ui'; ctx.fillStyle = '#5a5a7a';

      for (let v = lo; v <= hi; v += step) {
        if (v === 0) continue;
        ctx.strokeStyle = '#4e4e6e'; ctx.lineWidth = 1;

        const [cx] = this.toCanvas(v, 0);
        ctx.beginPath(); ctx.moveTo(cx, my - 3); ctx.lineTo(cx, my + 3); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#5a5a7a';
        ctx.fillText(v, cx, my + 5);

        const [, cy] = this.toCanvas(0, v);
        ctx.beginPath(); ctx.moveTo(mx - 3, cy); ctx.lineTo(mx + 3, cy); ctx.stroke();
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(v, mx - 6, cy);
      }

      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText('0', mx - 5, my + 4);
      ctx.restore();
    },

    /* ── hover preview dot ────────────────── */
    _drawMousePreview(ctx) {
      if (!this.mousePos) return;
      const [cx, cy] = this.toCanvas(this.mousePos.wx, this.mousePos.wy);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle   = 'rgba(99,102,241,.35)';
      ctx.strokeStyle = 'rgba(99,102,241,.8)';
      ctx.lineWidth   = 1.5;
      ctx.fill(); ctx.stroke();
      ctx.restore();
    },

    /* ── segment + ΔX/ΔY legs ─────────────── */
    _drawSegment(ctx) {
      const a = this.ptA, b = this.ptB;
      if (!a || !b) return;
      const [ax, ay] = this.toCanvas(a.x, a.y);
      const [bx, by] = this.toCanvas(b.x, b.y);
      const dx = b.x - a.x, dy = b.y - a.y;
      ctx.save();

      ctx.strokeStyle = 'rgba(99,102,241,.7)';
      ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(244,114,182,.8)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, ay); ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(52,211,153,.8)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(bx, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = '#f472b6'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('Δx = ' + this._fmt(dx), (ax + bx) / 2, ay - 4);

      ctx.fillStyle = '#34d399';
      ctx.textAlign    = dx >= 0 ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('Δy = ' + this._fmt(dy), bx + (dx >= 0 ? 5 : -5), (ay + by) / 2);

      ctx.restore();
    },

    /* ── render all points ────────────────── */
    _drawPoints(ctx) {
      this.points.forEach((p, i) => {
        const [cx, cy] = this.toCanvas(p.x, p.y);
        const color    = PT_COLORS[i % PT_COLORS.length];
        const isA      = this.selA === p.label;
        const isB      = this.selB === p.label;
        const sel      = isA || isB;
        ctx.save();

        if (sel) {
          ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
          ctx.fillStyle = color + '30'; ctx.fill();
        }

        ctx.beginPath(); ctx.arc(cx, cy, sel ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth   = sel ? 2.5 : 1.5;
        ctx.fill(); ctx.stroke();

        if (sel) {
          ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(isA ? 'A' : 'B', cx, cy);
        }

        if (this.showLabels) {
          ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
          ctx.fillStyle = color;
          ctx.fillText(p.label + '(' + this._fmt(p.x) + ', ' + this._fmt(p.y) + ')', cx + 10, cy - 2);
        }
        ctx.restore();
      });
    },

    /* ── canvas events ────────────────────── */
    handleCanvasClick(e) {
      const rect = _canvas.getBoundingClientRect();
      const sx   = _canvas.width  / rect.width;
      const sy   = _canvas.height / rect.height;
      const cx   = (e.clientX - rect.left) * sx;
      const cy   = (e.clientY - rect.top)  * sy;

      for (const p of this.points) {
        const [px, py] = this.toCanvas(p.x, p.y);
        if (Math.hypot(cx - px, cy - py) < 14) {
          this._selectPoint(p.label); return;
        }
      }

      let [wx, wy] = this.toWorld(cx, cy);
      if (this.snapToGrid) {
        wx = Math.round(wx); wy = Math.round(wy);
      } else {
        wx = Math.round(wx * 10) / 10; wy = Math.round(wy * 10) / 10;
      }
      this._addPoint(wx, wy);
    },

    handleMouseMove(e) {
      const rect = _canvas.getBoundingClientRect();
      const sx   = _canvas.width  / rect.width;
      const sy   = _canvas.height / rect.height;
      const cx   = (e.clientX - rect.left) * sx;
      const cy   = (e.clientY - rect.top)  * sy;
      let [wx, wy] = this.toWorld(cx, cy);
      if (this.snapToGrid) {
        wx = Math.round(wx); wy = Math.round(wy);
      } else {
        wx = Math.round(wx * 10) / 10; wy = Math.round(wy * 10) / 10;
      }
      this.mousePos = { wx, wy };
      this.draw();
    },

    handleMouseLeave() {
      this.mousePos = null; this.draw();
    },

    handleWheel(e) {
      e.preventDefault();
      this.zoom(e.deltaY > 0 ? 1.25 : 0.8);
    },

    /* ── point management ─────────────────── */
    _addPoint(x, y) {
      const label = 'P' + this.nextId++;
      this.points.push({ label, x: +x, y: +y });
      if (!this.selA) this.selA = label;
      else if (!this.selB && this.selA !== label) this.selB = label;
      this.draw();
    },

    _selectPoint(label) {
      if      (this.selA === label) { this.selA = this.selB; this.selB = ''; }
      else if (this.selB === label) { this.selB = ''; }
      else if (!this.selA)          { this.selA = label; }
      else if (!this.selB)          { this.selB = label; }
      else                          { this.selB = label; }
      this.draw();
    },

    setSelA(label) {
      this.selA = this.selA === label ? '' : label;
      if (this.selA && this.selA === this.selB) this.selB = '';
      this.draw();
    },

    setSelB(label) {
      this.selB = this.selB === label ? '' : label;
      if (this.selB && this.selA === this.selB) this.selA = '';
      this.draw();
    },

    addManual() {
      const x = parseFloat(this.manualX);
      const y = parseFloat(this.manualY);
      if (isNaN(x) || isNaN(y)) return;
      this._addPoint(x, y);
      this.manualX = ''; this.manualY = '';
    },

    removePoint(label) {
      this.points = this.points.filter(p => p.label !== label);
      if (this.selA === label) this.selA = this.points[0]?.label ?? '';
      if (this.selB === label) this.selB = this.points.find(p => p.label !== this.selA)?.label ?? '';
      this.draw();
    },

    clearAll() {
      this.points = []; this.nextId = 1; this.selA = ''; this.selB = ''; this.draw();
    },

    /* ── zoom / view ──────────────────────── */
    zoom(factor) {
      this.viewRange = Math.min(100, Math.max(1, this.viewRange * factor));
      this.draw();
    },

    resetView() {
      this.viewRange = 10;
      this.draw();
    },

    /* ── computed ─────────────────────────── */
    get ptA() { return this.points.find(p => p.label === this.selA); },
    get ptB() { return this.points.find(p => p.label === this.selB); },

    get diff() {
      const a = this.ptA, b = this.ptB;
      if (!a || !b || a.label === b.label) return null;
      const dx   = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const r    = v => Math.round(v * 1000) / 1000;
      return {
        dx:    r(dx),
        dy:    r(dy),
        absDx: r(Math.abs(dx)),
        absDy: r(Math.abs(dy)),
        dist:  r(dist),
        slope: dx === 0 ? null : r(dy / dx),
        angle: r(Math.atan2(dy, dx) * 180 / Math.PI),
        mx:    r((a.x + b.x) / 2),
        my:    r((a.y + b.y) / 2),
      };
    },

    /* ── helpers ──────────────────────────── */
    pointColor(i) { return PT_COLORS[i % PT_COLORS.length]; },
    _fmt(n)       { return (Math.round(n * 100) / 100).toString(); },

    toggleFaq(el) {
      el.closest('.faq-item').classList.toggle('open');
    },
  };
}
