/* Chart Generator — Chart.js 4 + Alpine.js
   _chart and _canvas live outside Alpine proxy. */

let _chart  = null;
let _canvas = null;
let _rebuildTimer = null;

/* ── Constants ─────────────────────────────────────────────── */
const PALETTES = [
  { id: 'vivid',  label: 'Vivid',  colors: ['#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'] },
  { id: 'ocean',  label: 'Ocean',  colors: ['#0ea5e9','#06b6d4','#0d9488','#059669','#38bdf8','#22d3ee','#34d399','#4ade80'] },
  { id: 'fire',   label: 'Fire',   colors: ['#f97316','#ef4444','#fbbf24','#dc2626','#b45309','#d97706','#f43f5e','#fb923c'] },
  { id: 'pastel', label: 'Pastel', colors: ['#93c5fd','#86efac','#fca5a5','#fde68a','#c4b5fd','#f9a8d4','#6ee7b7','#fed7aa'] },
  { id: 'mono',   label: 'Mono',   colors: ['#f8fafc','#e2e8f0','#94a3b8','#64748b','#475569','#334155','#94a3b8','#64748b'] },
];

const CHART_TYPES = [
  { id: 'bar',       label: 'Bar',     hint: 'Compare categories'   },
  { id: 'hbar',      label: 'H. Bar',  hint: 'Horizontal bars'      },
  { id: 'line',      label: 'Line',    hint: 'Trends over time'      },
  { id: 'area',      label: 'Area',    hint: 'Filled line chart'     },
  { id: 'pie',       label: 'Pie',     hint: 'Part of a whole'       },
  { id: 'doughnut',  label: 'Donut',   hint: 'Ring chart'            },
  { id: 'radar',     label: 'Radar',   hint: 'Multi-axis comparison' },
  { id: 'polarArea', label: 'Polar',   hint: 'Radial segments'       },
  { id: 'scatter',   label: 'Scatter', hint: 'X,Y data points'       },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', value: 16/9 },
  { id: '4:3',  label: '4:3',  value: 4/3  },
  { id: '1:1',  label: '1:1',  value: 1    },
  { id: '3:4',  label: '3:4',  value: 3/4  },
];

/* Sample dataset for each chart type */
const SAMPLES = {
  bar: {
    title: 'Monthly Revenue',
    labels: 'Jan, Feb, Mar, Apr, May, Jun, Jul, Aug',
    datasets: [
      { label: 'Revenue ($k)', values: '65, 59, 80, 81, 56, 72, 88, 76' },
      { label: 'Target ($k)',  values: '60, 65, 70, 75, 65, 70, 82, 80' },
    ],
  },
  hbar: {
    title: 'Top Products by Sales',
    labels: 'Product Alpha, Product Beta, Product Gamma, Product Delta, Product Echo',
    datasets: [
      { label: 'Units Sold', values: '4200, 3800, 2900, 2400, 1900' },
    ],
  },
  line: {
    title: 'Weekly Website Traffic',
    labels: 'Mon, Tue, Wed, Thu, Fri, Sat, Sun',
    datasets: [
      { label: 'Visitors',  values: '1200, 1450, 1100, 1600, 1800, 900, 750' },
      { label: 'Pageviews', values: '3600, 4200, 3100, 4800, 5400, 2700, 2200' },
    ],
  },
  area: {
    title: 'Quarterly Sales Growth',
    labels: 'Q1 2022, Q2 2022, Q3 2022, Q4 2022, Q1 2023, Q2 2023',
    datasets: [
      { label: 'Sales ($k)', values: '42, 51, 48, 63, 58, 72' },
    ],
  },
  pie: {
    title: 'Browser Market Share',
    labels: 'Chrome, Safari, Firefox, Edge, Other',
    datasets: [
      { label: 'Usage %', values: '65, 19, 4, 4, 8' },
    ],
  },
  doughnut: {
    title: 'Annual Budget Allocation',
    labels: 'Marketing, Development, Design, Support, Operations',
    datasets: [
      { label: 'Budget %', values: '30, 25, 20, 15, 10' },
    ],
  },
  radar: {
    title: 'Team Skills Assessment',
    labels: 'JavaScript, Python, Design, Communication, Leadership, DevOps',
    datasets: [
      { label: 'Alice', values: '85, 70, 60, 90, 75, 55' },
      { label: 'Bob',   values: '60, 90, 45, 70, 85, 80' },
    ],
  },
  polarArea: {
    title: 'Quarterly Performance Score',
    labels: 'Q1, Q2, Q3, Q4',
    datasets: [
      { label: 'Score', values: '78, 85, 72, 91' },
    ],
  },
  scatter: {
    title: 'Height vs Weight Distribution',
    labels: '',
    datasets: [
      { label: 'Group A', values: '165,68\n170,72\n175,78\n168,65\n180,82\n172,75' },
      { label: 'Group B', values: '155,55\n160,58\n163,62\n158,56\n167,68\n162,60' },
    ],
  },
};

/* ── App ──────────────────────────────────────────────────── */
function chartGeneratorApp() {
  return {
    /* chart type */
    chartType: 'bar',

    /* data */
    labels: 'Jan, Feb, Mar, Apr, May, Jun, Jul, Aug',
    datasets: [
      { id: 1, label: 'Revenue ($k)', values: '65, 59, 80, 81, 56, 72, 88, 76', color: '#6366f1' },
      { id: 2, label: 'Target ($k)',  values: '60, 65, 70, 75, 65, 70, 82, 80', color: '#f59e0b' },
    ],
    _nextDsId: 3,

    /* CSV import */
    showCsvPanel: false,
    csvText:      '',
    csvError:     '',

    /* style */
    chartTitle:    'Monthly Revenue',
    titleFontSize: 17,
    paletteId:     'vivid',
    aspectRatioId: '4:3',
    legendPosition:'bottom',
    legendFontSize: 12,
    showLegend:    true,
    showGrid:      true,
    smoothLine:    false,
    stacked:       false,
    xAxisLabel:    '',
    yAxisLabel:    '',

    /* UI */
    activeTab: 'data',
    error:     '',

    /* constants exposed to template */
    chartTypes:   CHART_TYPES,
    palettes:     PALETTES,
    aspectRatios: ASPECT_RATIOS,

    /* ── computed ──────────────────────────────────── */
    get parsedLabels() {
      return this.labels.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    },

    get currentPalette() {
      return (PALETTES.find(p => p.id === this.paletteId) || PALETTES[0]).colors;
    },

    get isRound()   { return ['pie','doughnut','polarArea'].includes(this.chartType); },
    get isScatter() { return this.chartType === 'scatter'; },
    get isRadar()   { return this.chartType === 'radar'; },
    get hasAxes()   { return !this.isRound && !this.isRadar && !this.isScatter; },

    get validationWarnings() {
      const w = [];
      if (this.isScatter) {
        this.datasets.forEach(ds => {
          if (this._parseScatter(ds.values).length === 0)
            w.push(`"${ds.label}": no valid x,y pairs found. Use one pair per line, e.g. 2.5, 4.8`);
        });
        return w;
      }
      const lc = this.parsedLabels.length;
      if (lc === 0) { w.push('No labels defined — add comma-separated labels above.'); return w; }
      this.datasets.forEach(ds => {
        const nums = ds.values.split(/[,\n]/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        if (nums.length === 0)
          w.push(`Dataset "${ds.label}": no valid numbers found.`);
        else if (nums.length !== lc)
          w.push(`Dataset "${ds.label}": ${nums.length} value${nums.length !== 1 ? 's' : ''} but ${lc} label${lc !== 1 ? 's' : ''} — counts should match.`);
      });
      if (this.isRound && this.datasets.length > 1)
        w.push('Tip: Pie/Donut charts work best with a single dataset. Multiple datasets render as concentric rings.');
      return w;
    },

    get chartConfigKey() {
      return JSON.stringify({
        t: this.chartType,  tl: this.chartTitle, lb: this.labels,
        ds: this.datasets,  lg: this.showLegend,  gr: this.showGrid,
        sm: this.smoothLine, pl: this.paletteId, ar: this.aspectRatioId,
        st: this.stacked,   lp: this.legendPosition, lfs: this.legendFontSize,
        tfs: this.titleFontSize, xl: this.xAxisLabel, yl: this.yAxisLabel,
      });
    },

    /* ── init ──────────────────────────────────────── */
    init() {
      this.$nextTick(() => {
        _canvas = this.$refs.chartCanvas;
        this._buildChart();
        this.$watch('chartConfigKey', () => this._scheduleRebuild());
      });
    },

    /* ── sample data ───────────────────────────────── */
    loadSample() {
      const s = SAMPLES[this.chartType];
      if (!s) return;
      this.chartTitle = s.title;
      this.labels     = s.labels;
      const pal = this.currentPalette;
      this.datasets   = s.datasets.map((d, i) => ({
        id:     this._nextDsId++,
        label:  d.label,
        values: d.values,
        color:  pal[i % pal.length],
      }));
      this._toast('Sample loaded!');
    },

    /* ── CSV import ────────────────────────────────── */
    importCsv() {
      this.csvError = '';
      const text = this.csvText.trim();
      if (!text) { this.csvError = 'Paste your CSV text first.'; return; }
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { this.csvError = 'Need at least a header row and one data row.'; return; }

      const headers = this._parseCsvRow(lines[0]);
      const dsHeaders = headers.slice(1);
      if (dsHeaders.length === 0) { this.csvError = 'CSV needs at least 2 columns: a label column + one data column.'; return; }

      const rows = lines.slice(1).map(l => this._parseCsvRow(l));
      this.labels = rows.map(r => r[0] || '').filter(Boolean).join(', ');

      const pal = this.currentPalette;
      this.datasets = dsHeaders.map((hdr, i) => ({
        id:     this._nextDsId++,
        label:  hdr,
        values: rows.map(r => r[i + 1] ?? '0').join(', '),
        color:  pal[i % pal.length],
      }));

      this.showCsvPanel = false;
      this.csvText      = '';
      this.activeTab    = 'data';
      this._toast('CSV imported!');
    },

    handleCsvFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        this.csvError = 'Please select a .csv file.';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => { this.csvText = e.target.result; };
      reader.onerror = () => { this.csvError = 'Failed to read file.'; };
      reader.readAsText(file, 'UTF-8');
    },

    _parseCsvRow(line) {
      const res = [];
      let field = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i+1] === '"') { field += '"'; i++; }
          else inQ = !inQ;
        } else if (c === ',' && !inQ) {
          res.push(field.trim()); field = '';
        } else {
          field += c;
        }
      }
      res.push(field.trim());
      return res;
    },

    /* ── dataset management ────────────────────────── */
    addDataset() {
      const n   = this.datasets.length;
      const col = this.currentPalette[n % this.currentPalette.length];
      const blank = this.isScatter ? '' : this.parsedLabels.map(() => '0').join(', ');
      this.datasets.push({ id: this._nextDsId++, label: `Dataset ${n + 1}`, values: blank, color: col });
    },

    removeDataset(id) {
      if (this.datasets.length <= 1) return;
      this.datasets = this.datasets.filter(d => d.id !== id);
    },

    /* ── chart build ───────────────────────────────── */
    _scheduleRebuild() {
      clearTimeout(_rebuildTimer);
      _rebuildTimer = setTimeout(() => this._buildChart(), 180);
    },

    _buildChart() {
      if (!window.Chart) return;
      if (_chart) { _chart.destroy(); _chart = null; }
      if (!_canvas) return;
      try { _chart = new Chart(_canvas, this._buildConfig()); }
      catch (_) { /* ignore config errors while user is typing */ }
    },

    _buildConfig() {
      const type    = this.chartType;
      const isHBar  = type === 'hbar';
      const isArea  = type === 'area';
      const actual  = isHBar ? 'bar' : isArea ? 'line' : type;
      const palette = this.currentPalette;

      const datasets = this.datasets.map((ds, i) => {
        const base = ds.color || palette[i % palette.length];
        const data = this.isScatter
          ? this._parseScatter(ds.values)
          : ds.values.split(/[,\n]/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));

        const bgColors = this.isRound
          ? this.parsedLabels.map((_, j) => this._rgba(palette[j % palette.length], 0.78))
          : this._rgba(base, this.isRadar ? 0.22 : 0.78);

        const bdColors = this.isRound
          ? this.parsedLabels.map((_, j) => palette[j % palette.length])
          : base;

        return {
          label: ds.label,
          data,
          backgroundColor: bgColors,
          borderColor:     bdColors,
          borderWidth: (type === 'line' || type === 'area') ? 2.5 : (this.isRound ? 2 : 1),
          ...(type === 'line' || isArea ? {
            tension:             this.smoothLine ? 0.4 : 0,
            fill:                isArea,
            pointRadius:         4,
            pointHoverRadius:    6,
            pointBackgroundColor: base,
          } : {}),
          ...(this.isRadar ? { fill: true, pointRadius: 4 } : {}),
        };
      });

      const ar       = (ASPECT_RATIOS.find(r => r.id === this.aspectRatioId) || ASPECT_RATIOS[1]).value;
      const axStyle  = {
        grid:   { display: this.showGrid, color: 'rgba(255,255,255,.07)' },
        ticks:  { color: '#9090ac', font: { size: 12 } },
        border: { color: 'rgba(255,255,255,.1)' },
      };

      const makeAxis = (labelText) => ({
        ...axStyle,
        stacked: this.stacked,
        ...(labelText.trim() ? {
          title: {
            display: true,
            text:    labelText.trim(),
            color:   '#a0a0b8',
            font:    { size: 12, weight: '500' },
            padding: { top: 4, bottom: 4 },
          },
        } : {}),
      });

      return {
        type: actual,
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
              font:    { size: this.titleFontSize || 17, weight: '700', family: 'system-ui, sans-serif' },
              padding: { top: 4, bottom: 16 },
            },
            legend: {
              display:  this.showLegend,
              position: this.legendPosition || 'bottom',
              labels: {
                color:           '#a0a0b8',
                padding:         18,
                usePointStyle:   true,
                pointStyle:      'rect',
                pointStyleWidth: 10,
                font: { size: this.legendFontSize || 12 },
                generateLabels(chart) {
                  const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                  items.forEach(item => { item.pointStyle = 'rect'; });
                  return items;
                },
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
          ...(this.hasAxes ? {
            scales: {
              x: makeAxis(isHBar ? this.yAxisLabel : this.xAxisLabel),
              y: makeAxis(isHBar ? this.xAxisLabel : this.yAxisLabel),
            },
          } : {}),
          ...(this.isScatter ? {
            scales: {
              x: { ...axStyle, title: this.xAxisLabel ? { display:true, text:this.xAxisLabel, color:'#a0a0b8', font:{size:12} } : {} },
              y: { ...axStyle, title: this.yAxisLabel ? { display:true, text:this.yAxisLabel, color:'#a0a0b8', font:{size:12} } : {} },
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
        const p = pair.split(',').map(v => parseFloat(v.trim()));
        return (p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1])) ? { x: p[0], y: p[1] } : null;
      }).filter(Boolean);
    },

    _rgba(hex, a) {
      if (!hex || hex.length < 7) return `rgba(99,102,241,${a})`;
      return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
    },

    /* ── download ──────────────────────────────────── */
    _getDataUrl(fmt) {
      if (!_canvas) return '';
      const off = document.createElement('canvas');
      off.width = _canvas.width; off.height = _canvas.height;
      const ctx = off.getContext('2d');
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, off.width, off.height);
      ctx.drawImage(_canvas, 0, 0);
      return off.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
    },

    _safeName() {
      return (this.chartTitle || 'chart').replace(/[^a-z0-9_\- ]/gi,'').trim().replace(/\s+/g,'_').toLowerCase() || 'chart';
    },

    downloadPng()  { this._dl(this._getDataUrl('png'),  this._safeName()+'.png');  this._toast('PNG downloaded!'); },
    downloadJpeg() { this._dl(this._getDataUrl('jpeg'), this._safeName()+'.jpg');  this._toast('JPEG downloaded!'); },

    async downloadPdf() {
      if (typeof window.jspdf === 'undefined') { this.error = 'PDF library failed to load — refresh and try again.'; return; }
      const { jsPDF } = window.jspdf;
      const img = this._getDataUrl('png');
      const ratio = _canvas.width / _canvas.height;
      const doc = new jsPDF({ orientation: ratio >= 1 ? 'l' : 'p', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
      const mg = 14, aw = pw-mg*2, ah = ph-mg*2;
      let iw, ih;
      if (aw/ah > ratio) { ih=ah; iw=ih*ratio; } else { iw=aw; ih=iw/ratio; }
      doc.setFillColor(26,26,36); doc.rect(0,0,pw,ph,'F');
      doc.addImage(img,'PNG',mg+(aw-iw)/2,mg+(ah-ih)/2,iw,ih);
      doc.save(this._safeName()+'.pdf');
      this._toast('PDF downloaded!');
    },

    async downloadSvg() {
      const dataUrl = this._getDataUrl('png');
      const w = _canvas.width, h = _canvas.height;
      const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="${dataUrl}" width="${w}" height="${h}"/></svg>`;
      const blob = new Blob([svgStr],{type:'image/svg+xml'});
      const url  = URL.createObjectURL(blob);
      this._dl(url, this._safeName()+'.svg');
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      this._toast('SVG downloaded!');
    },

    _dl(url, name) {
      const a = document.createElement('a');
      a.href=url; a.download=name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },

    /* ── helpers ───────────────────────────────────── */
    _toast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
  };
}
