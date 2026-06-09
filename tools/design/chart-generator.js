/* Chart Generator — Chart.js 4 + Alpine.js
   _chart and _canvas live outside Alpine proxy (HTMLElement / Chart object). */

let _chart  = null;
let _canvas = null;
let _rebuildTimer = null;

/* ── Constants ────────────────────────────────────────────── */
const PALETTES = [
  { id: 'vivid',  label: 'Vivid',  colors: ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'] },
  { id: 'ocean',  label: 'Ocean',  colors: ['#0ea5e9','#06b6d4','#0d9488','#059669','#38bdf8','#22d3ee','#34d399','#4ade80'] },
  { id: 'fire',   label: 'Fire',   colors: ['#f97316','#ef4444','#fbbf24','#dc2626','#b45309','#d97706','#f43f5e','#fb923c'] },
  { id: 'pastel', label: 'Pastel', colors: ['#93c5fd','#86efac','#fca5a5','#fde68a','#c4b5fd','#f9a8d4','#6ee7b7','#fed7aa'] },
  { id: 'mono',   label: 'Mono',   colors: ['#f8fafc','#e2e8f0','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a'] },
];

const CHART_TYPES = [
  { id: 'bar',       label: 'Bar',     hint: 'Compare categories' },
  { id: 'hbar',      label: 'H. Bar',  hint: 'Horizontal bars' },
  { id: 'line',      label: 'Line',    hint: 'Trends over time' },
  { id: 'area',      label: 'Area',    hint: 'Filled line chart' },
  { id: 'pie',       label: 'Pie',     hint: 'Part of a whole' },
  { id: 'doughnut',  label: 'Donut',   hint: 'Ring chart' },
  { id: 'radar',     label: 'Radar',   hint: 'Multi-axis comparison' },
  { id: 'polarArea', label: 'Polar',   hint: 'Radial segments' },
  { id: 'scatter',   label: 'Scatter', hint: 'X,Y data points' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', value: 16/9 },
  { id: '4:3',  label: '4:3',  value: 4/3  },
  { id: '1:1',  label: '1:1',  value: 1    },
  { id: '3:4',  label: '3:4',  value: 3/4  },
];

/* ── App ─────────────────────────────────────────────────── */
function chartGeneratorApp() {
  return {
    /* chart type */
    chartType: 'bar',

    /* data */
    labels: 'Jan, Feb, Mar, Apr, May, Jun',
    datasets: [
      { id: 1, label: 'Sales',    values: '65, 59, 80, 81, 56, 72', color: '#6366f1' },
      { id: 2, label: 'Expenses', values: '40, 48, 52, 60, 44, 58', color: '#f59e0b' },
    ],
    _nextDsId: 3,

    /* style */
    chartTitle:   'Sales Overview',
    paletteId:    'vivid',
    aspectRatioId:'4:3',
    showLegend:   true,
    showGrid:     true,
    smoothLine:   false,
    stacked:      false,

    /* UI */
    activeTab:    'data',   /* 'data' | 'style' */
    error:        '',

    /* constants exposed to template */
    chartTypes:   CHART_TYPES,
    palettes:     PALETTES,
    aspectRatios: ASPECT_RATIOS,

    /* ── computed ─────────────────────────────────── */
    get parsedLabels() {
      return this.labels.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    },

    get currentPalette() {
      return (PALETTES.find(p => p.id === this.paletteId) || PALETTES[0]).colors;
    },

    get isRound() {
      return ['pie', 'doughnut', 'polarArea'].includes(this.chartType);
    },

    get isScatter() {
      return this.chartType === 'scatter';
    },

    get isRadar() {
      return this.chartType === 'radar';
    },

    get scatterHint() {
      return 'Enter one x,y pair per line or separated by semicolons.\nExample:\n2.5, 4.2\n3.8, 6.1\n5.0, 7.4';
    },

    get chartConfigKey() {
      return JSON.stringify({
        t: this.chartType, tl: this.chartTitle, lb: this.labels,
        ds: this.datasets, lg: this.showLegend, gr: this.showGrid,
        sm: this.smoothLine, pl: this.paletteId, ar: this.aspectRatioId,
        st: this.stacked,
      });
    },

    /* ── init ─────────────────────────────────────── */
    init() {
      this.$nextTick(() => {
        _canvas = this.$refs.chartCanvas;
        this._buildChart();
        this.$watch('chartConfigKey', () => this._scheduleRebuild());
      });
    },

    /* ── dataset management ───────────────────────── */
    addDataset() {
      const count = this.datasets.length;
      const color = this.currentPalette[count % this.currentPalette.length];
      const blankValues = this.parsedLabels.map(() => '0').join(', ');
      this.datasets.push({
        id: this._nextDsId++,
        label: `Dataset ${count + 1}`,
        values: blankValues,
        color,
      });
    },

    removeDataset(id) {
      if (this.datasets.length <= 1) return;
      this.datasets = this.datasets.filter(d => d.id !== id);
    },

    /* ── chart build ──────────────────────────────── */
    _scheduleRebuild() {
      clearTimeout(_rebuildTimer);
      _rebuildTimer = setTimeout(() => this._buildChart(), 180);
    },

    _buildChart() {
      if (!window.Chart) return;
      if (_chart) { _chart.destroy(); _chart = null; }
      if (!_canvas) return;

      try {
        const cfg = this._buildConfig();
        _chart = new Chart(_canvas, cfg);
      } catch (err) {
        /* silently ignore config errors during typing */
      }
    },

    _buildConfig() {
      const type  = this.chartType;
      const isHBar = type === 'hbar';
      const actualType = isHBar ? 'bar' : type;
      const palette    = this.currentPalette;

      const datasets = this.datasets.map((ds, i) => {
        const base = ds.color || palette[i % palette.length];
        const data = this.isScatter
          ? this._parseScatter(ds.values)
          : ds.values.split(/[,\n]/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

        /* pie/doughnut/polarArea: each label gets its own color */
        const bgColors = this.isRound
          ? this.parsedLabels.map((_, j) => this._rgba(palette[j % palette.length], 0.78))
          : this._rgba(base, this.isRadar ? 0.25 : 0.78);

        const bdColors = this.isRound
          ? this.parsedLabels.map((_, j) => palette[j % palette.length])
          : base;

        return {
          label: ds.label,
          data,
          backgroundColor: bgColors,
          borderColor:     bdColors,
          borderWidth: (type === 'line' || type === 'area') ? 2.5 : (this.isRound ? 2 : 1),
          ...(type === 'line' || type === 'area' ? {
            tension:         this.smoothLine ? 0.4 : 0,
            fill:            type === 'area',
            pointRadius:     4,
            pointHoverRadius:6,
            pointBackgroundColor: base,
          } : {}),
          ...(this.isRadar ? { fill: true } : {}),
        };
      });

      const hasAxes = !this.isRound && !this.isRadar;
      const ar = (ASPECT_RATIOS.find(r => r.id === this.aspectRatioId) || ASPECT_RATIOS[1]).value;

      const axisStyle = {
        grid:   { display: this.showGrid, color: 'rgba(255,255,255,.07)' },
        ticks:  { color: '#9090ac', font: { size: 12 } },
        border: { color: 'rgba(255,255,255,.1)' },
      };

      return {
        type: actualType,
        data: {
          labels:   this.isScatter ? undefined : this.parsedLabels,
          datasets,
        },
        options: {
          indexAxis:          isHBar ? 'y' : 'x',
          responsive:         true,
          maintainAspectRatio:true,
          aspectRatio:        ar,
          layout: { padding: { top: 8, bottom: 8, left: 8, right: 8 } },
          plugins: {
            title: {
              display: this.chartTitle.trim().length > 0,
              text:    this.chartTitle.trim(),
              color:   '#e8e8f0',
              font:    { size: 17, weight: '700', family: 'system-ui, sans-serif' },
              padding: { top: 4, bottom: 16 },
            },
            legend: {
              display:  this.showLegend,
              position: 'bottom',
              labels: {
                color:        '#a0a0b8',
                padding:      18,
                usePointStyle:true,
                pointStyleWidth: 10,
                font: { size: 12 },
              },
            },
            tooltip: {
              backgroundColor: 'rgba(12,12,18,.95)',
              titleColor:      '#e8e8f0',
              bodyColor:       '#a0a0b8',
              borderColor:     'rgba(255,255,255,.12)',
              borderWidth:     1,
              cornerRadius:    8,
              padding:         10,
            },
          },
          ...(hasAxes ? {
            scales: {
              x: { ...axisStyle, stacked: this.stacked },
              y: { ...axisStyle, stacked: this.stacked },
            },
          } : {}),
          ...(this.isRadar ? {
            scales: {
              r: {
                grid:        { color: 'rgba(255,255,255,.1)' },
                pointLabels: { color: '#a0a0b8', font: { size: 12 } },
                ticks:       { color: '#9090ac', backdropColor: 'transparent', font: { size: 10 } },
                angleLines:  { color: 'rgba(255,255,255,.1)' },
              },
            },
          } : {}),
          animation: { duration: 350, easing: 'easeInOutQuart' },
        },
      };
    },

    _parseScatter(str) {
      return str.split(/[;\n]/).map(pair => {
        const parts = pair.split(',').map(v => parseFloat(v.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return { x: parts[0], y: parts[1] };
        }
        return null;
      }).filter(Boolean);
    },

    _rgba(hex, alpha) {
      if (!hex || hex.length < 7) return `rgba(99,102,241,${alpha})`;
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    },

    /* ── download ─────────────────────────────────── */
    _getDataUrl(format) {
      if (!_canvas) return '';
      const off = document.createElement('canvas');
      off.width  = _canvas.width;
      off.height = _canvas.height;
      const ctx  = off.getContext('2d');
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(_canvas, 0, 0);
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      return off.toDataURL(mime, 0.95);
    },

    _safeName() {
      return (this.chartTitle || 'chart').replace(/[^a-z0-9_\- ]/gi, '').trim().replace(/\s+/g, '_').toLowerCase() || 'chart';
    },

    downloadPng()  { this._dl(this._getDataUrl('png'),  this._safeName() + '.png');  this._toast('PNG downloaded!'); },
    downloadJpeg() { this._dl(this._getDataUrl('jpeg'), this._safeName() + '.jpg');  this._toast('JPEG downloaded!'); },

    async downloadPdf() {
      if (typeof window.jspdf === 'undefined') { this.error = 'PDF library failed to load — refresh and try again.'; return; }
      const { jsPDF } = window.jspdf;
      const img   = this._getDataUrl('png');
      const ratio = _canvas.width / _canvas.height;
      const orient = ratio >= 1 ? 'l' : 'p';
      const doc   = new jsPDF({ orientation: orient, unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const mg = 14, aw = pw - mg*2, ah = ph - mg*2;
      let iw, ih;
      if (aw / ah > ratio) { ih = ah; iw = ih * ratio; }
      else                  { iw = aw; ih = iw / ratio; }
      doc.setFillColor(26, 26, 36);
      doc.rect(0, 0, pw, ph, 'F');
      doc.addImage(img, 'PNG', mg + (aw-iw)/2, mg + (ah-ih)/2, iw, ih);
      doc.save(this._safeName() + '.pdf');
      this._toast('PDF downloaded!');
    },

    async downloadSvg() {
      /* Chart.js doesn't natively export SVG — we export a high-res PNG embedded in SVG */
      const dataUrl = this._getDataUrl('png');
      const w = _canvas.width, h = _canvas.height;
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="${dataUrl}" width="${w}" height="${h}"/></svg>`;
      const blob = new Blob([svgStr], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      this._dl(url, this._safeName() + '.svg');
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      this._toast('SVG downloaded!');
    },

    _dl(url, name) {
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },

    /* ── misc helpers ─────────────────────────────── */
    chartTypeLabel(id) {
      return (CHART_TYPES.find(t => t.id === id) || { label: id }).label;
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
  };
}
