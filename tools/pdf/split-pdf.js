/* Split PDF — browser-side using pdf-lib + JSZip
   _pdfBuffer and _resultFiles live outside Alpine proxy.  */

let _pdfBuffer   = null;  /* ArrayBuffer of source PDF */
let _resultFiles = [];    /* [{name, bytes}] Uint8Arrays, held until download */

function splitPdfApp() {
  return {
    stage: 'upload',   /* upload | config | splitting | done */
    isDragOver: false,
    error: '',

    /* file info */
    pdfName:   '',
    pdfSize:   0,
    pageCount: 0,

    /* split config */
    splitMode:  'fixed',  /* 'fixed' | 'ranges' | 'pages' */
    chunkSize:  1,
    rangeInput: '',

    /* progress */
    progress:    0,
    progressMsg: '',

    /* done */
    resultCount: 0,
    zipSize:     0,
    singleSize:  0,

    /* ── computed ──────────────────────────────── */
    get computedParts() {
      const total = this.pageCount;
      if (!total) return [];

      if (this.splitMode === 'fixed') {
        const n = Math.max(1, parseInt(this.chunkSize) || 1);
        const parts = [];
        for (let from = 1; from <= total; from += n) {
          parts.push({ from, to: Math.min(from + n - 1, total) });
        }
        return parts;
      }

      if (this.splitMode === 'pages') {
        return Array.from({ length: total }, (_, i) => ({ from: i + 1, to: i + 1 }));
      }

      if (this.splitMode === 'ranges') {
        return this._parseRanges(this.rangeInput, total);
      }

      return [];
    },

    get partsPreview() {
      return this.computedParts.slice(0, 60);
    },

    get extraParts() {
      return Math.max(0, this.computedParts.length - 60);
    },

    get canSplit() {
      return this.computedParts.length >= 1;
    },

    get rangeError() {
      if (this.splitMode !== 'ranges') return '';
      const s = this.rangeInput.trim();
      if (!s) return '';
      return this._parseRanges(s, this.pageCount).length === 0
        ? 'No valid ranges found. Use format: 1-5, 6-10, 11'
        : '';
    },

    /* ── init ───────────────────────────────────── */
    init() {},

    /* ── file intake ─────────────────────────────── */
    async onFileInput(e) {
      const file = e.target.files[0];
      e.target.value = '';
      if (file) await this._load(file);
    },

    async onDrop(e) {
      this.isDragOver = false;
      const file = Array.from(e.dataTransfer.files)
        .find(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      if (!file) { this.error = 'Please drop a PDF file.'; return; }
      await this._load(file);
    },

    async _load(file) {
      this.error = '';
      if (typeof PDFLib === 'undefined') {
        this.error = 'PDF library is still loading — wait a moment and try again.';
        return;
      }
      try {
        const buf = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(buf, { updateMetadata: false });
        _pdfBuffer   = buf;
        this.pdfName  = file.name;
        this.pdfSize  = file.size;
        this.pageCount = doc.getPageCount();
        this.chunkSize  = 1;
        this.rangeInput = '';
        this.stage = 'config';
      } catch (err) {
        this.error = `Could not open "${file.name}": it may be password-protected or corrupt.`;
      }
    },

    /* ── range parsing ───────────────────────────── */
    _parseRanges(str, total) {
      if (!str.trim()) return [];
      return str.split(',').map(s => {
        s = s.trim();
        const m = s.match(/^(\d+)(?:-(\d*))?$/);
        if (!m) return null;
        const from = parseInt(m[1]);
        const to   = m[2] === undefined ? from
                   : m[2] === ''        ? total
                   : parseInt(m[2]);
        if (from < 1 || to < 1 || from > total || to > total || from > to) return null;
        return { from, to };
      }).filter(Boolean);
    },

    partLabel(part) {
      if (part.from === part.to) return `Page ${part.from}`;
      return `Pages ${part.from}–${part.to}`;
    },

    partPages(part) {
      const n = part.to - part.from + 1;
      return n === 1 ? '1 page' : `${n} pages`;
    },

    /* ── split ───────────────────────────────────── */
    async split() {
      if (!this.canSplit) return;
      this.stage = 'splitting';
      this.progress = 0;
      this.error = '';
      _resultFiles = [];

      try {
        const { PDFDocument } = PDFLib;
        const srcDoc = await PDFDocument.load(_pdfBuffer, { updateMetadata: false });
        const parts  = this.computedParts;
        const base   = this.pdfName.replace(/\.pdf$/i, '');
        const pad    = String(parts.length).length;

        for (let i = 0; i < parts.length; i++) {
          const { from, to } = parts[i];
          this.progressMsg = `Creating part ${i + 1} of ${parts.length} (pages ${from}–${to})…`;

          const partDoc = await PDFDocument.create();
          const indices = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k);
          const copied  = await partDoc.copyPages(srcDoc, indices);
          copied.forEach(p => partDoc.addPage(p));
          const bytes = await partDoc.save();

          /* name the file */
          let name;
          if (this.splitMode === 'pages') {
            const n = String(i + 1).padStart(pad, '0');
            name = `${base}_page${n}.pdf`;
          } else if (this.splitMode === 'ranges') {
            name = from === to
              ? `${base}_p${from}.pdf`
              : `${base}_p${from}-${to}.pdf`;
          } else {
            const n = String(i + 1).padStart(pad, '0');
            name = `${base}_part${n}.pdf`;
          }

          _resultFiles.push({ name, bytes });
          this.progress = Math.round(((i + 1) / parts.length) * 90);
          await new Promise(r => setTimeout(r, 0)); /* yield to UI */
        }

        this.progressMsg = parts.length > 1 ? 'Building ZIP archive…' : 'Saving PDF…';

        if (_resultFiles.length === 1) {
          this.singleSize  = _resultFiles[0].bytes.length;
          this.resultCount = 1;
        } else {
          if (typeof JSZip === 'undefined') {
            this.error = 'ZIP library failed to load — try refreshing the page.';
            this.stage = 'config';
            return;
          }
          const zip = new JSZip();
          _resultFiles.forEach(f => zip.file(f.name, f.bytes));
          const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
          /* store blob on a temp property for download */
          this._zipBlob = zipBlob;
          this.zipSize     = zipBlob.size;
          this.resultCount = _resultFiles.length;
        }

        this.progress = 100;
        this.stage = 'done';
      } catch (err) {
        this.error = 'Split failed: ' + (err.message || String(err));
        this.stage = 'config';
      }
    },

    /* ── download ────────────────────────────────── */
    download() {
      if (_resultFiles.length === 1) {
        this._saveBlob(
          new Blob([_resultFiles[0].bytes], { type: 'application/pdf' }),
          _resultFiles[0].name
        );
        this._toast('PDF downloaded!');
      } else if (this._zipBlob) {
        const base = this.pdfName.replace(/\.pdf$/i, '');
        this._saveBlob(this._zipBlob, `${base}_split.zip`);
        this._toast('ZIP downloaded!');
      }
    },

    downloadPart(idx) {
      const f = _resultFiles[idx];
      if (!f) return;
      this._saveBlob(new Blob([f.bytes], { type: 'application/pdf' }), f.name);
    },

    /* ── reset ───────────────────────────────────── */
    reset() {
      this.stage = 'upload';
      this.pdfName = '';
      this.pdfSize = 0;
      this.pageCount = 0;
      this.chunkSize = 1;
      this.rangeInput = '';
      this.error = '';
      this.progress = 0;
      this.progressMsg = '';
      this.resultCount = 0;
      this.zipSize = 0;
      this.singleSize = 0;
      this._zipBlob = null;
      _pdfBuffer = null;
      _resultFiles = [];
    },

    splitAgain() {
      this._zipBlob = null;
      _resultFiles = [];
      this.stage = 'config';
      this.progress = 0;
    },

    /* ── helpers ─────────────────────────────────── */
    formatSize(bytes) {
      if (bytes < 1024)        return bytes + ' B';
      if (bytes < 1048576)     return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    },

    _saveBlob(blob, name) {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },
  };
}
