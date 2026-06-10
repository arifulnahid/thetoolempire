/* ── JSON to Chart — Alpine component ── */

let _jtcChart  = null;
let _jtcCanvas = null;
let _jtcTimer  = null;

/* ── Palettes ─────────────────────────────────────────────── */
const JTC_PALETTES = [
  { id:'vivid',  label:'Vivid',  colors:['#8b5cf6','#06b6d4','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#14b8a6'] },
  { id:'ocean',  label:'Ocean',  colors:['#0ea5e9','#06b6d4','#0d9488','#059669','#38bdf8','#22d3ee','#34d399','#4ade80'] },
  { id:'fire',   label:'Fire',   colors:['#f97316','#ef4444','#fbbf24','#dc2626','#b45309','#d97706','#f43f5e','#fb923c'] },
  { id:'pastel', label:'Pastel', colors:['#c4b5fd','#93c5fd','#86efac','#fca5a5','#fde68a','#f9a8d4','#6ee7b7','#fed7aa'] },
  { id:'mono',   label:'Mono',   colors:['#f8fafc','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a'] },
];

/* ── Chart types ──────────────────────────────────────────── */
const JTC_TYPES = [
  { id:'bar',      label:'Bar'     },
  { id:'hbar',     label:'H-Bar'   },
  { id:'line',     label:'Line'    },
  { id:'area',     label:'Area'    },
  { id:'pie',      label:'Pie'     },
  { id:'doughnut', label:'Donut'   },
  { id:'radar',    label:'Radar'   },
  { id:'scatter',  label:'Scatter' },
];

/* ── Aspect ratios ────────────────────────────────────────── */
const JTC_AR = [
  { id:'16:9', label:'16:9', v: 16/9  },
  { id:'4:3',  label:'4:3',  v: 4/3   },
  { id:'1:1',  label:'1:1',  v: 1     },
  { id:'3:4',  label:'3:4',  v: 3/4   },
];

/* ── Sample data ──────────────────────────────────────────── */
const JTC_SAMPLES = {
  bar: `[
  { "month": "Jan", "revenue": 12000, "expenses": 8000 },
  { "month": "Feb", "revenue": 19000, "expenses": 11000 },
  { "month": "Mar", "revenue": 15000, "expenses": 9500 },
  { "month": "Apr", "revenue": 22000, "expenses": 13000 },
  { "month": "May", "revenue": 18000, "expenses": 10500 },
  { "month": "Jun", "revenue": 25000, "expenses": 14500 }
]`,
  hbar: `[
  { "framework": "React",   "stars": 215 },
  { "framework": "Vue",     "stars": 206 },
  { "framework": "Angular", "stars": 90  },
  { "framework": "Svelte",  "stars": 74  },
  { "framework": "Next.js", "stars": 118 }
]`,
  line: `{
  "labels": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  "datasets": [
    { "label": "Visitors", "data": [820,932,901,934,1290,1330,1320] },
    { "label": "Signups",  "data": [230,302,281,234, 490, 430, 420] }
  ]
}`,
  area: `{
  "labels": ["Q1 23","Q2 23","Q3 23","Q4 23","Q1 24","Q2 24"],
  "datasets": [
    { "label": "Product A", "data": [40,70,55,90,75,110] },
    { "label": "Product B", "data": [30,50,65,75,60, 95] }
  ]
}`,
  pie: `{
  "Chrome":  64.92,
  "Safari":  19.96,
  "Firefox":  3.08,
  "Edge":     4.11,
  "Other":    7.93
}`,
  doughnut: `[
  { "name": "Direct",   "value": 35 },
  { "name": "Organic",  "value": 28 },
  { "name": "Social",   "value": 20 },
  { "name": "Referral", "value": 10 },
  { "name": "Email",    "value":  7 }
]`,
  radar: `{
  "labels": ["Speed","Reliability","Comfort","Safety","Efficiency"],
  "datasets": [
    { "label": "Model A", "data": [80,90,75,85,70] },
    { "label": "Model B", "data": [65,75,90,80,85] }
  ]
}`,
  scatter: `[
  { "x": 1.5, "y": 2.8 },
  { "x": 2.3, "y": 4.2 },
  { "x": 3.1, "y": 3.6 },
  { "x": 4.7, "y": 5.9 },
  { "x": 5.2, "y": 4.8 },
  { "x": 6.8, "y": 7.3 },
  { "x": 7.4, "y": 6.5 }
]`,
};

/* ── Alpine component ─────────────────────────────────────── */
function jsonToChartApp() {
  return {
    /* input */
    raw: '',

    /* parsed / viewer */
    parsed:      null,
    parseErr:    '',
    detected:    '',
    dataStats:   '',
    highlighted: '',

    /* viewer UI */
    viewerExpanded: false,
    _viewerH: 300,

    /* chart config */
    chartType:  'bar',
    chartTitle: '',
    paletteId:  'vivid',
    arId:       '4:3',
    showLegend: true,
    showGrid:   true,
    smoothLine: false,
    stacked:    false,

    /* UI */
    toastMsg: '',

    /* template constants */
    palettes:   JTC_PALETTES,
    chartTypes: JTC_TYPES,
    arOptions:  JTC_AR,

    /* ── init ───────────────────────────────────── */
    init() {
      _jtcCanvas = this.$refs.canvas;
      this._initDrag();

      this.$nextTick(() => {
        this.raw = JTC_SAMPLES.bar;
        this._process();
      });

      this.$watch('raw', () => {
        clearTimeout(_jtcTimer);
        _jtcTimer = setTimeout(() => this._process(), 280);
      });

      ['chartType','paletteId','chartTitle','showLegend','showGrid',
       'smoothLine','stacked','arId'].forEach(k => {
        this.$watch(k, () => { if (this.parsed) this._buildChart(); });
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && this.viewerExpanded) this.viewerExpanded = false;
      });
    },

    /* ── process raw JSON ───────────────────────── */
    _process() {
      this.parseErr = '';
      this.detected = '';
      this.dataStats = '';
      this.highlighted = '';
      this.parsed = null;

      const raw = this.raw.trim();
      if (!raw) {
        if (_jtcChart) { _jtcChart.destroy(); _jtcChart = null; }
        return;
      }

      let obj;
      try {
        obj = JSON.parse(raw);
      } catch (e) {
        this.parseErr = e.message;
        this.highlighted = this._highlight(raw);
        return;
      }

      const pretty = JSON.stringify(obj, null, 2);
      this.highlighted = this._highlight(pretty);

      try {
        const result = this._detect(obj);
        this.parsed    = result.data;
        this.detected  = result.format;
        this.dataStats = result.stats;
        this._buildChart();
      } catch (e) {
        this.parseErr = e.message;
      }
    },

    /* ── format detection cascade ───────────────── */
    _detect(obj) {
      /* 1 — Chart.js native { labels, datasets } */
      if (obj && typeof obj === 'object' && !Array.isArray(obj) && Array.isArray(obj.datasets)) {
        const ds   = obj.datasets;
        const isXY = ds[0]?.data?.[0]?.x !== undefined;
        if (isXY && !['scatter'].includes(this.chartType)) this.chartType = 'scatter';
        return {
          format: 'Chart.js native',
          stats:  `${ds.length} dataset${ds.length !== 1 ? 's' : ''}, ${ds[0]?.data?.length ?? 0} points each`,
          data:   obj,
        };
      }

      /* 2 — Plain key:value { "Jan": 42 } */
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const entries = Object.entries(obj);
        if (entries.length && entries.every(([, v]) => typeof v === 'number')) {
          return {
            format: 'Key-value pairs',
            stats:  `${entries.length} entries`,
            data: {
              labels:   entries.map(([k]) => k),
              datasets: [{ label: 'Value', data: entries.map(([, v]) => v) }],
            },
          };
        }
        throw new Error('Plain-object format: all values must be numbers — e.g. {"Jan":10,"Feb":20}');
      }

      if (!Array.isArray(obj) || obj.length === 0)
        throw new Error('JSON must be an array or object. Got: ' + typeof obj);

      /* 3 — Array of numbers [10, 20, 30] */
      if (typeof obj[0] === 'number') {
        return {
          format: 'Number array',
          stats:  `${obj.length} values`,
          data: {
            labels:   obj.map((_, i) => `Item ${i + 1}`),
            datasets: [{ label: 'Value', data: obj }],
          },
        };
      }

      if (typeof obj[0] !== 'object' || obj[0] === null)
        throw new Error('Array elements must be numbers or objects.');

      /* 4 — Scatter [{x, y}] */
      if ('x' in obj[0] && 'y' in obj[0]) {
        if (this.chartType !== 'scatter') this.chartType = 'scatter';
        return {
          format: 'Scatter (x, y) pairs',
          stats:  `${obj.length} points`,
          data:   { datasets: [{ label: 'Data', data: obj }] },
        };
      }

      /* 5 — Array of objects: auto-detect label key + numeric columns */
      const keys    = Object.keys(obj[0]);
      const numKeys = keys.filter(k => obj.every(r => typeof r[k] === 'number'));
      const LABEL_HINTS = ['label','name','category','key','month','date','year',
                           'quarter','country','city','product','item','region',
                           'type','group','brand','department','week','day'];
      const labelKey = LABEL_HINTS.find(k => k in obj[0])
                    ?? keys.find(k => !numKeys.includes(k))
                    ?? keys[0];
      const dataKeys = numKeys.filter(k => k !== labelKey);

      if (dataKeys.length > 0) {
        return {
          format: `Array of objects (${dataKeys.length} series)`,
          stats:  `${obj.length} rows · ${dataKeys.length} series`,
          data: {
            labels:   obj.map(r => String(r[labelKey])),
            datasets: dataKeys.map(k => ({ label: k, data: obj.map(r => r[k]) })),
          },
        };
      }

      /* single value key */
      const VAL_HINTS = ['value','count','total','amount','y','val','score',
                         'qty','revenue','sales','price','percent','rate'];
      const valKey = VAL_HINTS.find(k => k in obj[0]);
      if (valKey) {
        return {
          format: `Array of objects (${labelKey} → ${valKey})`,
          stats:  `${obj.length} rows`,
          data: {
            labels:   obj.map(r => String(r[labelKey])),
            datasets: [{ label: valKey, data: obj.map(r => r[valKey]) }],
          },
        };
      }

      throw new Error(`Cannot find numeric columns. Keys found: ${keys.join(', ')}`);
    },

    /* ── build Chart.js config ──────────────────── */
    _buildChart() {
      if (!window.Chart || !_jtcCanvas || !this.parsed) return;
      if (_jtcChart) { _jtcChart.destroy(); _jtcChart = null; }

      try { _jtcChart = new Chart(_jtcCanvas, this._config()); } catch (_) {}
    },

    _config() {
      const type      = this.chartType;
      const isHBar    = type === 'hbar';
      const isArea    = type === 'area';
      const actual    = isHBar ? 'bar' : isArea ? 'line' : type;
      const isRound   = ['pie','doughnut'].includes(type);
      const isRadar   = type === 'radar';
      const isScatter = type === 'scatter';
      const palette   = (JTC_PALETTES.find(p => p.id === this.paletteId) || JTC_PALETTES[0]).colors;
      const labels    = this.parsed.labels || [];
      const ar        = (JTC_AR.find(r => r.id === this.arId) || JTC_AR[1]).v;

      const datasets = (this.parsed.datasets || []).map((ds, i) => {
        const base = palette[i % palette.length];
        const data = Array.isArray(ds.data) ? ds.data : [];
        const bgColors = isRound
          ? labels.map((_, j) => this._rgba(palette[j % palette.length], 0.78))
          : this._rgba(base, isRadar ? 0.22 : 0.78);
        const bdColors = isRound
          ? labels.map((_, j) => palette[j % palette.length])
          : base;
        return {
          label: ds.label || `Series ${i + 1}`,
          data,
          backgroundColor: bgColors,
          borderColor:     bdColors,
          borderWidth: (type === 'line' || isArea) ? 2.5 : (isRound ? 2 : 1),
          ...(type === 'line' || isArea ? {
            tension:              this.smoothLine ? 0.4 : 0,
            fill:                 isArea,
            pointRadius:          4,
            pointHoverRadius:     6,
            pointBackgroundColor: base,
          } : {}),
          ...(isRadar ? { fill: true, pointRadius: 4 } : {}),
        };
      });

      const ax = {
        grid:    { display: this.showGrid, color: 'rgba(255,255,255,.07)' },
        ticks:   { color: '#9090ac', font: { size: 12 } },
        border:  { color: 'rgba(255,255,255,.1)' },
        stacked: this.stacked,
      };

      return {
        type: actual,
        data: { labels: isScatter ? undefined : labels, datasets },
        options: {
          indexAxis:           isHBar ? 'y' : 'x',
          responsive:          true,
          maintainAspectRatio: true,
          aspectRatio:         ar,
          layout: { padding: 12 },
          plugins: {
            title: {
              display: !!this.chartTitle.trim(),
              text:    this.chartTitle.trim(),
              color:   '#e8e8f0',
              font:    { size: 16, weight: '700', family: 'system-ui, sans-serif' },
              padding: { top: 4, bottom: 16 },
            },
            legend: {
              display:  this.showLegend,
              position: 'bottom',
              labels: {
                color: '#a0a0b8', padding: 16,
                usePointStyle: false,
                boxWidth: 14, boxHeight: 14,
                font: { size: 12 },
              },
            },
            tooltip: {
              backgroundColor: 'rgba(12,12,18,.95)',
              titleColor: '#e8e8f0', bodyColor: '#a0a0b8',
              borderColor: 'rgba(255,255,255,.12)', borderWidth: 1,
              cornerRadius: 8, padding: 10,
            },
          },
          ...(!isRound && !isRadar ? {
            scales: {
              x: { ...ax, ...(isScatter ? { type: 'linear' } : {}) },
              y: { ...ax },
            },
          } : {}),
          ...(isRadar ? {
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

    /* ── syntax highlighter ─────────────────────── */
    _highlight(str) {
      if (!str) return '';
      const safe = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return safe.replace(
        /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        m => {
          if (/^"/.test(m)) return /:$/.test(m) ? `<span class="jk">${m}</span>` : `<span class="js">${m}</span>`;
          if (/true|false/.test(m)) return `<span class="jb">${m}</span>`;
          if (/null/.test(m))       return `<span class="jnl">${m}</span>`;
          return `<span class="jnum">${m}</span>`;
        }
      );
    },

    /* ── toolbar actions ────────────────────────── */
    formatJson() {
      const raw = this.raw.trim();
      if (!raw) return;
      try { this.raw = JSON.stringify(JSON.parse(raw), null, 2); }
      catch (_) { this._toast('Invalid JSON — cannot format'); }
    },

    minifyJson() {
      const raw = this.raw.trim();
      if (!raw) return;
      try { this.raw = JSON.stringify(JSON.parse(raw)); }
      catch (_) { this._toast('Invalid JSON — cannot minify'); }
    },

    async copyRaw() {
      try { await navigator.clipboard.writeText(this.raw); this._toast('Copied!'); } catch (_) {}
    },

    clear() {
      this.raw = ''; this.parsed = null; this.parseErr = '';
      this.detected = ''; this.dataStats = ''; this.highlighted = '';
      if (_jtcChart) { _jtcChart.destroy(); _jtcChart = null; }
    },

    handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { this.raw = ev.target.result; };
      reader.onerror = () => this._toast('Failed to read file');
      reader.readAsText(file, 'UTF-8');
      e.target.value = '';
    },

    loadSample(id) {
      this.chartType = id;
      this.raw = JTC_SAMPLES[id] || JTC_SAMPLES.bar;
    },

    /* ── drag-to-resize viewer ──────────────────── */
    _initDrag() {
      const handle = this.$refs.dragHandle;
      const viewer = this.$refs.jsonViewer;
      if (!handle || !viewer) return;
      let sy, sh;

      const move = e => {
        const dy  = (e.touches ? e.touches[0].clientY : e.clientY) - sy;
        const newH = Math.max(80, Math.min(window.innerHeight * .75, sh + dy));
        viewer.style.height = newH + 'px';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup',   up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend',  up);
      };

      const start = e => {
        sy = e.touches ? e.touches[0].clientY : e.clientY;
        sh = viewer.offsetHeight;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup',   up);
        document.addEventListener('touchmove', move, { passive: true });
        document.addEventListener('touchend',  up);
        e.preventDefault();
      };

      handle.addEventListener('mousedown',  start);
      handle.addEventListener('touchstart', start, { passive: false });
    },

    /* ── download ───────────────────────────────── */
    _raster(fmt) {
      if (!_jtcCanvas) return '';
      const o = document.createElement('canvas');
      o.width = _jtcCanvas.width; o.height = _jtcCanvas.height;
      const ctx = o.getContext('2d');
      ctx.fillStyle = '#1a1a24'; ctx.fillRect(0, 0, o.width, o.height);
      ctx.drawImage(_jtcCanvas, 0, 0);
      return o.toDataURL(fmt === 'jpeg' ? 'image/jpeg' : 'image/png', 0.95);
    },

    _dl(url, name) {
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    },

    _fname() {
      return (this.chartTitle || 'chart').replace(/[^a-z0-9_\- ]/gi,'').trim().replace(/\s+/g,'_').toLowerCase() || 'chart';
    },

    downloadPng()  { if (!_jtcChart) return; this._dl(this._raster('png'),  this._fname()+'.png');  this._toast('PNG downloaded'); },
    downloadJpeg() { if (!_jtcChart) return; this._dl(this._raster('jpeg'), this._fname()+'.jpg');  this._toast('JPEG downloaded'); },

    async downloadPdf() {
      if (!_jtcChart) return;
      if (!window.jspdf) { this._toast('PDF library not loaded'); return; }
      const { jsPDF } = window.jspdf;
      const img   = this._raster('png');
      const ratio = _jtcCanvas.width / _jtcCanvas.height;
      const doc   = new jsPDF({ orientation: ratio >= 1 ? 'l' : 'p', unit:'mm', format:'a4' });
      const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
      const mg = 14, aw = pw-mg*2, ah = ph-mg*2;
      let iw, ih;
      if (aw/ah > ratio) { ih=ah; iw=ih*ratio; } else { iw=aw; ih=iw/ratio; }
      doc.setFillColor(26,26,36); doc.rect(0,0,pw,ph,'F');
      doc.addImage(img,'PNG', mg+(aw-iw)/2, mg+(ah-ih)/2, iw, ih);
      doc.save(this._fname()+'.pdf');
      this._toast('PDF downloaded');
    },

    async downloadSvg() {
      if (!_jtcChart) return;
      const img = this._raster('png');
      const w   = _jtcCanvas.width, h = _jtcCanvas.height;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="${img}" width="${w}" height="${h}"/></svg>`;
      const url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
      this._dl(url, this._fname()+'.svg');
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      this._toast('SVG downloaded');
    },

    /* ── helpers ────────────────────────────────── */
    _rgba(hex, a) {
      if (!hex || hex.length < 7) return `rgba(139,92,246,${a})`;
      return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
    },

    _toast(msg) {
      this.toastMsg = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { this.toastMsg = ''; }, 2200);
    },
  };
}
