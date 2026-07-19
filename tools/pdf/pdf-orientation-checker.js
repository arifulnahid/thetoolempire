/* PDF Orientation Checker
   _pdf lives outside Alpine proxy — pdfjs document objects must not be proxied. */

let _pdf = null;

const PAPER_SIZES = [
  [420,  595,  'A5'],
  [595,  842,  'A4'],
  [842,  1191, 'A3'],
  [1191, 1684, 'A2'],
  [499,  709,  'B5'],
  [709,  1002, 'B4'],
  [612,  792,  'Letter'],
  [612,  1008, 'Legal'],
  [792,  1224, 'Tabloid'],
];

function pdfOrientationApp() {
  return {
    stage:       'upload',   /* upload | processing | results */
    fileName:    '',
    fileSize:    0,
    pageCount:   0,
    pages:       [],         /* { num, loading, width, height, orientation, rotation, sizeName, thumb } */
    progress:    0,
    progressMsg: '',
    error:       '',
    isDragOver:  false,
    viewMode:    'grid',     /* grid | list */
    filterOrient:'all',      /* all | Portrait | Landscape | Square */

    /* ── init ── */
    init() {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
    },

    /* ── computed ── */
    get summary() {
      const done = this.pages.filter(p => !p.loading);
      return {
        total:     this.pages.length,
        portrait:  done.filter(p => p.orientation === 'Portrait').length,
        landscape: done.filter(p => p.orientation === 'Landscape').length,
        square:    done.filter(p => p.orientation === 'Square').length,
      };
    },

    get filteredPages() {
      if (this.filterOrient === 'all') return this.pages;
      return this.pages.filter(p => p.orientation === this.filterOrient);
    },

    get fileSizeLabel() {
      const b = this.fileSize;
      if (b < 1024)        return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(1) + ' MB';
    },

    /* ── paper size identification ── */
    _sizeName(w, h) {
      const [s, l] = w <= h ? [w, h] : [h, w];
      const tol = 3;
      for (const [sw, sh, name] of PAPER_SIZES) {
        if (Math.abs(s - sw) <= tol && Math.abs(l - sh) <= tol) return name;
      }
      return '';
    },

    /* ── file intake ── */
    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files)
        .find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (f) this._loadFile(f);
      else   this.error = 'Please drop a valid PDF file.';
    },

    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._loadFile(f);
      e.target.value = '';
    },

    async _loadFile(file) {
      if (typeof pdfjsLib === 'undefined') {
        this.error = 'PDF.js library failed to load — please refresh and try again.';
        return;
      }
      this.error   = '';
      this.stage   = 'processing';
      this.pages   = [];
      this.progress = 0;
      _pdf = null;

      this.fileName = file.name;
      this.fileSize = file.size;

      try {
        const buf = await file.arrayBuffer();
        _pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        this.pageCount = _pdf.numPages;
        await this._processPages();
        this.stage = 'results';
      } catch (err) {
        this.error = err?.message?.includes('Password')
          ? 'This PDF is password-protected. Remove the password first.'
          : 'Could not read this PDF. Make sure it is a valid, unencrypted PDF file.';
        this.stage = 'upload';
        _pdf = null;
      }
    },

    async _processPages() {
      const total = _pdf.numPages;

      /* Pre-populate with loading skeletons so the grid appears immediately */
      this.pages = Array.from({ length: total }, (_, i) => ({
        num: i + 1, loading: true,
        width: 0, height: 0, orientation: '', rotation: 0, sizeName: '', thumb: null,
      }));

      for (let i = 0; i < total; i++) {
        this.progressMsg = `Analysing page ${i + 1} of ${total}…`;
        const page = await _pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: 1 });
        const w = Math.round(viewport.width);
        const h = Math.round(viewport.height);
        const rotation    = page.rotate;
        const orientation = w > h ? 'Landscape' : h > w ? 'Portrait' : 'Square';
        const sizeName    = this._sizeName(w, h);

        /* Render thumbnail — max 130px on the longer dimension */
        const scale  = 130 / Math.max(w, h);
        const tvp    = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(tvp.width);
        canvas.height = Math.round(tvp.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: tvp }).promise;
        const thumb = canvas.toDataURL('image/jpeg', 0.75);

        this.pages[i] = { num: i + 1, loading: false, width: w, height: h, orientation, rotation, sizeName, thumb };
        this.progress = Math.round(((i + 1) / total) * 100);
      }
      this.progressMsg = '';
    },

    /* ── export ── */
    exportCSV() {
      const rows = [
        ['Page', 'Width (pt)', 'Height (pt)', 'Orientation', 'Rotation (°)', 'Size Name'],
        ...this.pages.map(p => [p.num, p.width, p.height, p.orientation, p.rotation, p.sizeName]),
      ];
      const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a    = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: this.fileName.replace(/\.pdf$/i, '') + '-orientation.csv',
      });
      a.click();
      URL.revokeObjectURL(a.href);
    },

    /* ── orientation badge colour ── */
    orientColor(o) {
      if (o === 'Portrait')  return '#3b82f6';
      if (o === 'Landscape') return '#f59e0b';
      return '#10b981';
    },

    /* ── reset ── */
    reset() {
      _pdf = null;
      this.stage       = 'upload';
      this.fileName    = '';
      this.fileSize    = 0;
      this.pageCount   = 0;
      this.pages       = [];
      this.progress    = 0;
      this.progressMsg = '';
      this.error       = '';
      this.filterOrient = 'all';
      this.viewMode    = 'grid';
    },
  };
}
