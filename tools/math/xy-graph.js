/* ── XY Graph — Alpine component + Canvas renderer ── */

/* ── Series colour palette ── */
const PALETTE = [
  '#3b82f6','#a78bfa','#2dd4bf','#f97316','#22c55e',
  '#f43f5e','#facc15','#38bdf8','#e879f9','#84cc16'
];

/* ── Parse a number, return NaN if invalid ── */
function pn(s) { const v = parseFloat(String(s).trim()); return isNaN(v) ? NaN : v; }

/* ── Compute linear regression: returns {m, b, r2} ── */
function linReg(pts) {
  const n = pts.length;
  if (n < 2) return null;
  let sx=0, sy=0, sxy=0, sx2=0, sy2=0;
  pts.forEach(p => { sx+=p.x; sy+=p.y; sxy+=p.x*p.y; sx2+=p.x*p.x; sy2+=p.y*p.y; });
  const denom = n*sx2 - sx*sx;
  if (denom === 0) return null;
  const m = (n*sxy - sx*sy) / denom;
  const b = (sy - m*sx) / n;
  const ssRes = pts.reduce((a,p) => a + (p.y-(m*p.x+b))**2, 0);
  const ssTot = sy2 - sy*sy/n;
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes/ssTot);
  return { m, b, r2 };
}

/* ── Alpine component ── */
function xyGraphApp() {
  return {
    /* Series list */
    series: [],
    activeSeries: 0,

    /* Chart options */
    chartType: 'scatter',   /* scatter | line | bar */
    showGrid: true,
    showLabels: true,
    showAxes: true,
    showTrend: false,
    connectDots: false,
    xLabel: 'X',
    yLabel: 'Y',
    chartTitle: '',
    pointSize: 5,
    xMin: '', xMax: '', yMin: '', yMax: '',

    /* Canvas state */
    _canvas: null,
    _ctx: null,
    _vp: null,   /* viewport: { x0,y0,x1,y1,px0,py0,pw,ph } */

    /* Hover tooltip */
    hovX: null, hovY: null, hovName: '', hovLabel: '',
    tooltipStyle: '',

    /* Import/export */
    importText: '',
    importError: '',

    /* ────────────────── INIT ────────────────── */
    init() {
      this._addSeries('Series 1', PALETTE[0]);
      this._addSeries('Series 2', PALETTE[1]);
      /* default sample data */
      const s0 = this.series[0];
      [[1,2],[2,4],[3,3],[4,7],[5,6],[6,9]].forEach(([x,y]) => s0.points.push({x:String(x),y:String(y),label:''}));
      const s1 = this.series[1];
      [[1,5],[2,3],[3,6],[4,4],[5,8],[6,7]].forEach(([x,y]) => s1.points.push({x:String(x),y:String(y),label:''}));

      this.$nextTick(() => {
        this._canvas = document.getElementById('graph-canvas');
        this._ctx = this._canvas.getContext('2d');
        this._resize();
        this.draw();
        window.addEventListener('resize', () => { this._resize(); this.draw(); });
      });
    },

    /* ────────────────── SERIES MANAGEMENT ────────────────── */
    _addSeries(name, color) {
      this.series.push({ name, color, visible: true, points: [] });
    },

    addSeries() {
      const idx = this.series.length;
      this._addSeries(`Series ${idx+1}`, PALETTE[idx % PALETTE.length]);
      this.activeSeries = this.series.length - 1;
      this.draw();
    },

    removeSeries(i) {
      if (this.series.length <= 1) return;
      this.series.splice(i, 1);
      this.activeSeries = Math.min(this.activeSeries, this.series.length - 1);
      this.draw();
    },

    toggleVisible(i) {
      this.series[i].visible = !this.series[i].visible;
      this.draw();
    },

    /* ────────────────── POINT MANAGEMENT ────────────────── */
    addPoint(si) {
      this.series[si].points.push({ x: '', y: '', label: '' });
    },

    removePoint(si, pi) {
      this.series[si].points.splice(pi, 1);
      this.draw();
    },

    onPointInput() { this.draw(); },

    /* ── Get valid numeric points for a series ── */
    _validPoints(s) {
      return s.points
        .map(p => ({ x: pn(p.x), y: pn(p.y), label: p.label || '' }))
        .filter(p => !isNaN(p.x) && !isNaN(p.y));
    },

    /* ────────────────── CANVAS RESIZE ────────────────── */
    _resize() {
      const c = this._canvas;
      const wrap = c.parentElement;
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = Math.max(420, Math.round(w * 0.58));
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.height = h + 'px';
      this._ctx.scale(dpr, dpr);
      this._W = w;
      this._H = h;
    },

    /* ────────────────── DATA BOUNDS ────────────────── */
    _bounds() {
      let allX = [], allY = [];
      this.series.forEach(s => {
        if (!s.visible) return;
        this._validPoints(s).forEach(p => { allX.push(p.x); allY.push(p.y); });
      });
      if (allX.length === 0) return { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

      let xMin = pn(this.xMin) || Math.min(...allX);
      let xMax = pn(this.xMax) || Math.max(...allX);
      let yMin = pn(this.yMin) || Math.min(...allY);
      let yMax = pn(this.yMax) || Math.max(...allY);

      /* ensure range */
      if (xMin === xMax) { xMin -= 1; xMax += 1; }
      if (yMin === yMax) { yMin -= 1; yMax += 1; }
      const xPad = (xMax - xMin) * 0.08;
      const yPad = (yMax - yMin) * 0.12;
      return {
        xMin: xMin - xPad, xMax: xMax + xPad,
        yMin: yMin - yPad, yMax: yMax + yPad
      };
    },

    /* ────────────────── COORDINATE TRANSFORMS ────────────────── */
    _mkVp(xMin, xMax, yMin, yMax) {
      const W = this._W, H = this._H;
      const pad = { l: 56, r: 24, t: 40, b: 48 };
      const pw = W - pad.l - pad.r;
      const ph = H - pad.t - pad.b;
      return {
        xMin, xMax, yMin, yMax,
        px0: pad.l, py0: pad.t, pw, ph,
        toCanvasX: x => pad.l + (x - xMin) / (xMax - xMin) * pw,
        toCanvasY: y => pad.t + (1 - (y - yMin) / (yMax - yMin)) * ph,
        toDataX:   cx => xMin + (cx - pad.l) / pw * (xMax - xMin),
        toDataY:   cy => yMin + (1 - (cy - pad.t) / ph) * (yMax - yMin),
      };
    },

    /* ────────────────── NICE TICKS ────────────────── */
    _ticks(min, max, count = 6) {
      const range = max - min;
      const raw = range / count;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const nice = [1,2,2.5,5,10].map(f => f*mag).find(f => f >= raw) || mag;
      const start = Math.ceil(min / nice) * nice;
      const ticks = [];
      for (let v = start; v <= max + nice*0.01; v += nice) {
        ticks.push(parseFloat(v.toPrecision(10)));
      }
      return ticks;
    },

    /* ────────────────── MAIN DRAW ────────────────── */
    draw() {
      if (!this._ctx) return;
      const ctx = this._ctx;
      const W = this._W, H = this._H;
      const b = this._bounds();
      const vp = this._mkVp(b.xMin, b.xMax, b.yMin, b.yMax);
      this._vp = vp;

      ctx.clearRect(0, 0, W, H);

      /* background */
      ctx.fillStyle = '#1e1e28';
      ctx.fillRect(0, 0, W, H);

      /* plot area bg */
      ctx.fillStyle = '#18181f';
      ctx.fillRect(vp.px0, vp.py0, vp.pw, vp.ph);

      this._drawGrid(ctx, vp);
      this._drawAxes(ctx, vp);
      this._drawTitle(ctx, W);

      /* series */
      this.series.forEach((s, si) => {
        if (!s.visible) return;
        const pts = this._validPoints(s);
        if (pts.length === 0) return;
        if (this.chartType === 'bar')    this._drawBar(ctx, vp, pts, s.color, si);
        else if (this.chartType === 'line' || this.connectDots) this._drawLine(ctx, vp, pts, s.color);
        if (this.chartType !== 'bar')    this._drawScatter(ctx, vp, pts, s.color);
        if (this.showTrend && pts.length >= 2) this._drawTrend(ctx, vp, pts, s.color);
        if (this.showLabels) this._drawPointLabels(ctx, vp, pts, s.color);
      });

      this._drawAxisLabels(ctx, vp, W, H);
      this._drawLegend(ctx, vp, W);
    },

    _drawGrid(ctx, vp) {
      if (!this.showGrid) return;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.lineWidth = 1;
      this._ticks(vp.xMin, vp.xMax).forEach(x => {
        const cx = vp.toCanvasX(x);
        ctx.beginPath(); ctx.moveTo(cx, vp.py0); ctx.lineTo(cx, vp.py0+vp.ph); ctx.stroke();
      });
      this._ticks(vp.yMin, vp.yMax).forEach(y => {
        const cy = vp.toCanvasY(y);
        ctx.beginPath(); ctx.moveTo(vp.px0, cy); ctx.lineTo(vp.px0+vp.pw, cy); ctx.stroke();
      });
      ctx.restore();
    },

    _drawAxes(ctx, vp) {
      ctx.save();
      /* border */
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(vp.px0, vp.py0, vp.pw, vp.ph);

      /* zero lines */
      if (vp.xMin < 0 && vp.xMax > 0) {
        const cx = vp.toCanvasX(0);
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, vp.py0); ctx.lineTo(cx, vp.py0+vp.ph); ctx.stroke();
      }
      if (vp.yMin < 0 && vp.yMax > 0) {
        const cy = vp.toCanvasY(0);
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(vp.px0, cy); ctx.lineTo(vp.px0+vp.pw, cy); ctx.stroke();
      }

      /* tick labels */
      ctx.fillStyle = '#555570';
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      this._ticks(vp.xMin, vp.xMax).forEach(x => {
        const cx = vp.toCanvasX(x);
        if (cx < vp.px0 || cx > vp.px0+vp.pw) return;
        ctx.fillText(this._fmtTick(x), cx, vp.py0+vp.ph+16);
      });
      ctx.textAlign = 'right';
      this._ticks(vp.yMin, vp.yMax).forEach(y => {
        const cy = vp.toCanvasY(y);
        if (cy < vp.py0 || cy > vp.py0+vp.ph) return;
        ctx.fillText(this._fmtTick(y), vp.px0-6, cy+4);
      });
      ctx.restore();
    },

    _fmtTick(v) {
      if (Math.abs(v) >= 1e5 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(1);
      const s = parseFloat(v.toPrecision(4));
      return String(s);
    },

    _drawTitle(ctx, W) {
      if (!this.chartTitle) return;
      ctx.save();
      ctx.fillStyle = '#9999b8';
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.chartTitle, W/2, 20);
      ctx.restore();
    },

    _drawAxisLabels(ctx, vp, W, H) {
      ctx.save();
      ctx.fillStyle = '#555570';
      ctx.font = '12px Inter, system-ui, sans-serif';
      if (this.xLabel) {
        ctx.textAlign = 'center';
        ctx.fillText(this.xLabel, vp.px0 + vp.pw/2, H - 6);
      }
      if (this.yLabel) {
        ctx.save();
        ctx.translate(14, vp.py0 + vp.ph/2);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = 'center';
        ctx.fillText(this.yLabel, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    },

    _drawScatter(ctx, vp, pts, color) {
      const sz = Number(this.pointSize) || 5;
      ctx.save();
      pts.forEach(p => {
        const cx = vp.toCanvasX(p.x), cy = vp.toCanvasY(p.y);
        if (cx < vp.px0-sz || cx > vp.px0+vp.pw+sz || cy < vp.py0-sz || cy > vp.py0+vp.ph+sz) return;
        ctx.beginPath();
        ctx.arc(cx, cy, sz, 0, Math.PI*2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
      ctx.restore();
    },

    _drawLine(ctx, vp, pts, color) {
      if (pts.length < 2) return;
      const sorted = [...pts].sort((a,b) => a.x - b.x);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      sorted.forEach((p, i) => {
        const cx = vp.toCanvasX(p.x), cy = vp.toCanvasY(p.y);
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.restore();
    },

    _drawBar(ctx, vp, pts, color, si) {
      const totalSeries = this.series.filter(s=>s.visible).length;
      const xTicks = [...new Set(this.series.flatMap(s => this._validPoints(s).map(p=>p.x)))].sort((a,b)=>a-b);
      const groupW = xTicks.length > 1 ? Math.min(40, (vp.pw / xTicks.length) * 0.7) : 40;
      const barW = groupW / Math.max(totalSeries, 1);
      const visIdx = this.series.slice(0, si+1).filter(s=>s.visible).length - 1;
      const y0 = vp.toCanvasY(Math.max(vp.yMin, 0));

      ctx.save();
      pts.forEach(p => {
        const cx = vp.toCanvasX(p.x);
        const cy = vp.toCanvasY(p.y);
        const offset = (visIdx - (totalSeries-1)/2) * barW;
        const bx = cx + offset;
        const bh = y0 - cy;
        if (bx < vp.px0 || bx + barW > vp.px0+vp.pw) return;
        ctx.fillStyle = color;
        ctx.globalAlpha = .85;
        if (bh >= 0) ctx.fillRect(bx, cy, barW - 2, bh);
        else ctx.fillRect(bx, y0, barW - 2, -bh);
      });
      ctx.restore();
    },

    _drawTrend(ctx, vp, pts, color) {
      const reg = linReg(pts);
      if (!reg) return;
      const x0 = vp.xMin, x1 = vp.xMax;
      const y0 = reg.m*x0 + reg.b, y1 = reg.m*x1 + reg.b;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6,4]);
      ctx.globalAlpha = .6;
      ctx.beginPath();
      ctx.moveTo(vp.toCanvasX(x0), vp.toCanvasY(y0));
      ctx.lineTo(vp.toCanvasX(x1), vp.toCanvasY(y1));
      ctx.stroke();
      /* R² label */
      ctx.setLineDash([]);
      ctx.globalAlpha = .7;
      ctx.fillStyle = color;
      ctx.font = '10px Fira Code, monospace';
      ctx.textAlign = 'right';
      const midX = vp.toCanvasX((x0+x1)/2);
      const midY = vp.toCanvasY((y0+y1)/2);
      ctx.fillText(`R²=${reg.r2.toFixed(3)}`, midX, midY - 6);
      ctx.restore();
    },

    _drawPointLabels(ctx, vp, pts, color) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.globalAlpha = .85;
      const sz = Number(this.pointSize) || 5;
      pts.forEach(p => {
        if (!p.label) return;
        const cx = vp.toCanvasX(p.x), cy = vp.toCanvasY(p.y);
        ctx.textAlign = 'center';
        ctx.fillText(p.label, cx, cy - sz - 3);
      });
      ctx.restore();
    },

    _drawLegend(ctx, vp, W) {
      const visible = this.series.filter(s => s.visible);
      if (visible.length < 2) return;
      const sz = 9;
      const spacing = 100;
      const startX = vp.px0 + vp.pw/2 - (visible.length * spacing)/2;
      const y = vp.py0 + vp.ph + 34;
      ctx.save();
      visible.forEach((s, i) => {
        const x = startX + i*spacing;
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(x, y, sz/2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#9999b8';
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(s.name, x + sz, y + 4);
      });
      ctx.restore();
    },

    /* ────────────────── MOUSE HOVER ────────────────── */
    onMouseMove(e) {
      if (!this._vp) return;
      const rect = this._canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const vp = this._vp;

      /* find nearest point within 20px */
      let nearest = null, minDist = 20;
      this.series.forEach(s => {
        if (!s.visible) return;
        this._validPoints(s).forEach(p => {
          const px = vp.toCanvasX(p.x), py = vp.toCanvasY(p.y);
          const d = Math.sqrt((cx-px)**2 + (cy-py)**2);
          if (d < minDist) { minDist = d; nearest = { s, p }; }
        });
      });

      if (nearest) {
        this.hovX = nearest.p.x;
        this.hovY = nearest.p.y;
        this.hovName = nearest.s.name;
        this.hovLabel = nearest.p.label;
        this.tooltipStyle = `left:${e.clientX - rect.left + 14}px;top:${e.clientY - rect.top - 10}px`;
      } else {
        this.hovX = null;
      }
    },

    onMouseLeave() { this.hovX = null; },

    /* ────────────────── SAMPLES ────────────────── */
    loadSample(type) {
      this.series = [];
      if (type === 'linear') {
        this._addSeries('Dataset A', PALETTE[0]);
        [[1,2],[2,3.8],[3,6.1],[4,8],[5,9.9],[6,12],[7,14.2]].forEach(([x,y]) => this.series[0].points.push({x:String(x),y:String(y),label:''}));
        this._addSeries('Dataset B', PALETTE[1]);
        [[1,5],[2,6],[3,5.5],[4,7],[5,7.8],[6,8.5],[7,10]].forEach(([x,y]) => this.series[1].points.push({x:String(x),y:String(y),label:''}));
        this.showTrend = true; this.chartType = 'scatter';
        this.xLabel = 'Time (months)'; this.yLabel = 'Sales (units)'; this.chartTitle = 'Sales over Time';
      } else if (type === 'scatter') {
        this._addSeries('Heights & Weights', PALETTE[2]);
        [[150,50],[155,55],[160,60],[162,58],[165,65],[168,70],[170,68],[172,72],[175,78],[180,82],[182,85],[185,90]].forEach(([x,y]) => this.series[0].points.push({x:String(x),y:String(y),label:''}));
        this.showTrend = true; this.chartType = 'scatter';
        this.xLabel = 'Height (cm)'; this.yLabel = 'Weight (kg)'; this.chartTitle = 'Height vs Weight';
      } else if (type === 'bar') {
        this._addSeries('Q1', PALETTE[0]);
        [[1,42],[2,58],[3,35],[4,67],[5,51]].forEach(([x,y]) => this.series[0].points.push({x:String(x),y:String(y),label:''}));
        this._addSeries('Q2', PALETTE[3]);
        [[1,55],[2,63],[3,48],[4,72],[5,60]].forEach(([x,y]) => this.series[1].points.push({x:String(x),y:String(y),label:''}));
        this.chartType = 'bar'; this.showTrend = false;
        this.xLabel = 'Region'; this.yLabel = 'Revenue ($k)'; this.chartTitle = 'Quarterly Revenue by Region';
      } else if (type === 'quadratic') {
        this._addSeries('y = x²', PALETTE[4]);
        for (let x=-5; x<=5; x++) this.series[0].points.push({x:String(x),y:String(x*x),label:''});
        this._addSeries('y = x² - 3x + 2', PALETTE[5]);
        for (let x=-3; x<=6; x++) this.series[1].points.push({x:String(x),y:String(x*x-3*x+2),label:''});
        this.chartType = 'line'; this.connectDots = true; this.showTrend = false;
        this.xLabel = 'x'; this.yLabel = 'y'; this.chartTitle = 'Quadratic Functions';
      }
      this.activeSeries = 0;
      this.xMin=''; this.xMax=''; this.yMin=''; this.yMax='';
      this.$nextTick(() => this.draw());
    },

    /* ────────────────── IMPORT / EXPORT ────────────────── */
    importCSV() {
      this.importError = '';
      const lines = this.importText.trim().split('\n').filter(Boolean);
      if (lines.length === 0) { this.importError = 'No data found'; return; }
      const si = this.activeSeries;
      const newPts = [];
      for (const line of lines) {
        const parts = line.split(/[,\t;]/).map(s => s.trim());
        const x = pn(parts[0]), y = pn(parts[1]);
        if (isNaN(x) || isNaN(y)) { this.importError = `Invalid row: "${line}" — expected x,y numbers`; return; }
        newPts.push({ x: String(x), y: String(y), label: parts[2] || '' });
      }
      this.series[si].points = newPts;
      this.importText = '';
      this.draw();
      this._toast(`Imported ${newPts.length} points into "${this.series[si].name}"`);
    },

    exportCSV() {
      const si = this.activeSeries;
      const pts = this.series[si].points.filter(p => p.x !== '' && p.y !== '');
      if (pts.length === 0) { this._toast('No data to export'); return; }
      const csv = pts.map(p => [p.x, p.y, p.label].join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${this.series[si].name.replace(/\s+/g,'_')}.csv`;
      a.click();
    },

    exportAllCSV() {
      let out = '';
      this.series.forEach(s => {
        const pts = s.points.filter(p => p.x !== '' && p.y !== '');
        if (pts.length === 0) return;
        out += `# ${s.name}\n` + pts.map(p => [p.x, p.y, p.label].join(',')).join('\n') + '\n\n';
      });
      if (!out) { this._toast('No data to export'); return; }
      const blob = new Blob([out], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'xy_graph_data.csv';
      a.click();
    },

    downloadPNG() {
      if (!this._canvas) return;
      const a = document.createElement('a');
      a.href = this._canvas.toDataURL('image/png');
      a.download = (this.chartTitle || 'xy-graph') + '.png';
      a.click();
    },

    /* ────────────────── STATS ────────────────── */
    get allStats() {
      return this.series.map(s => {
        const pts = this._validPoints(s);
        if (pts.length === 0) return { name: s.name, color: s.color, n: 0 };
        const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
        const mean = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
        const std = arr => { const m=mean(arr); return Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length); };
        const reg = linReg(pts);
        return {
          name: s.name, color: s.color, n: pts.length,
          xMin: Math.min(...xs), xMax: Math.max(...xs),
          yMin: Math.min(...ys), yMax: Math.max(...ys),
          xMean: mean(xs), yMean: mean(ys),
          xStd: std(xs), yStd: std(ys),
          reg,
        };
      });
    },

    fmtStat(v) {
      if (v === undefined || v === null) return '—';
      return parseFloat(v.toPrecision(5)).toLocaleString();
    },

    /* ────────────────── UTILS ────────────────── */
    clearAll() {
      this.series.forEach(s => { s.points = []; });
      this.chartTitle = '';
      this.xLabel = 'X'; this.yLabel = 'Y';
      this.xMin=''; this.xMax=''; this.yMin=''; this.yMax='';
      this.draw();
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },
  };
}
