/* Rotate PDF — PDF.js for thumbnails, pdf-lib for saving
   _pdfJsDoc, _pdfBytes, _outBytes live outside Alpine proxy. */

let _pdfJsDoc = null;   /* pdfjsLib document — for thumbnail rendering */
let _pdfBytes = null;   /* original ArrayBuffer — reloaded into pdf-lib at save time */
let _outBytes = null;   /* Uint8Array of saved output */

function rotatePdfApp() {
  return {
    stage:      'upload',  /* upload | editor | processing | done */
    pdfName:    '',
    pdfSize:    0,
    pageCount:  0,
    pages:      [],   /* [{ num, dataUrl, rendering, origRotation, rotation }] */
    renderDone: 0,
    processProgress: 0,
    outputSize: 0,
    isDragOver: false,
    error:      '',

    /* ── computed ─────────────────────────────── */
    get rotatedCount() { return this.pages.filter(p => p.rotation !== 0).length; },
    get renderPct()    { return this.pageCount ? Math.round(this.renderDone / this.pageCount * 100) : 0; },
    get canApply()     { return this.rotatedCount > 0; },

    /* ── init ─────────────────────────────────── */
    init() {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
    },

    /* ── file intake ──────────────────────────── */
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._load(f);
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files)
        .find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (!f) { this.error = 'Please drop a PDF file.'; return; }
      this._load(f);
    },

    async _load(file) {
      if (typeof pdfjsLib === 'undefined' || typeof PDFLib === 'undefined') {
        this.error = 'PDF libraries are still loading — wait a moment and try again.';
        return;
      }
      this.error     = '';
      this.pages     = [];
      this.renderDone = 0;
      _pdfJsDoc      = null;
      _pdfBytes      = null;
      _outBytes      = null;
      this.pdfName   = file.name;
      this.pdfSize   = file.size;

      try {
        _pdfBytes = await file.arrayBuffer();

        /* pdf-lib: read original rotations then discard the doc */
        const tmpDoc   = await PDFLib.PDFDocument.load(_pdfBytes, { updateMetadata: false });
        const libPages = tmpDoc.getPages();
        const origRotations = libPages.map(p => p.getRotation().angle || 0);
        this.pageCount = libPages.length;

        /* PDF.js: keep for thumbnail rendering */
        _pdfJsDoc = await pdfjsLib.getDocument({ data: _pdfBytes.slice(0) }).promise;

        /* Build stubs — editor renders immediately with spinners */
        this.pages = Array.from({ length: this.pageCount }, (_, i) => ({
          num:          i + 1,
          dataUrl:      null,
          rendering:    false,
          origRotation: origRotations[i],
          rotation:     0,
        }));

        this.stage = 'editor';
        this._renderAll();   /* fire-and-forget — thumbs trickle in */
      } catch (err) {
        this.error = err.message || 'Failed to open PDF. Make sure it is a valid, unencrypted PDF.';
        this.stage = 'upload';
      }
    },

    /* ── thumbnail rendering ──────────────────── */
    async _renderAll() {
      this.renderDone = 0;
      for (const pg of this.pages) {
        await this._renderThumb(pg);
        this.renderDone++;
      }
    },

    async _renderThumb(pg) {
      pg.rendering = true;
      try {
        const page = await _pdfJsDoc.getPage(pg.num);
        /* scale so the longer dimension ≤ 130px */
        const vp0   = page.getViewport({ scale: 1 });
        const scale = 130 / Math.max(vp0.width, vp0.height);
        const vp    = page.getViewport({ scale });
        const canvas   = document.createElement('canvas');
        canvas.width   = Math.round(vp.width);
        canvas.height  = Math.round(vp.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        pg.dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      } catch (_) { /* silently skip */ }
      pg.rendering = false;
    },

    /* ── per-page rotation ────────────────────── */
    rotateLeft(num)  { this._setRot(num, r => (r + 270) % 360); },
    rotateRight(num) { this._setRot(num, r => (r +  90) % 360); },
    resetPage(num)   { this._setRot(num, () => 0); },

    _setRot(num, fn) {
      const pg = this.pages.find(p => p.num === num);
      if (pg) pg.rotation = fn(pg.rotation);
    },

    /* ── bulk rotation ────────────────────────── */
    rotateAllLeft()  { this.pages.forEach(p => { p.rotation = (p.rotation + 270) % 360; }); },
    rotateAllRight() { this.pages.forEach(p => { p.rotation = (p.rotation +  90) % 360; }); },
    resetAll()       { this.pages.forEach(p => { p.rotation = 0; }); },

    /* ── apply & save ─────────────────────────── */
    async apply() {
      if (!this.canApply) return;
      this.stage = 'processing';
      this.processProgress = 0;
      this.error = '';
      _outBytes = null;

      try {
        const { PDFDocument, degrees } = PDFLib;
        const doc      = await PDFDocument.load(_pdfBytes, { updateMetadata: false });
        const libPages = doc.getPages();

        for (let i = 0; i < libPages.length; i++) {
          const { origRotation, rotation } = this.pages[i];
          libPages[i].setRotation(degrees((origRotation + rotation) % 360));
          this.processProgress = Math.round(((i + 1) / libPages.length) * 85);
          await new Promise(r => setTimeout(r, 0));
        }

        this.processProgress = 90;
        const bytes   = await doc.save();
        _outBytes     = bytes;
        this.outputSize = bytes.length;
        this.processProgress = 100;
        this.stage = 'done';
      } catch (err) {
        this.error = 'Failed to apply rotations: ' + (err.message || String(err));
        this.stage = 'editor';
      }
    },

    /* ── download ─────────────────────────────── */
    download() {
      if (!_outBytes) return;
      const base = this.pdfName.replace(/\.pdf$/i, '');
      const blob = new Blob([_outBytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${base}_rotated.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this._toast('PDF downloaded!');
    },

    /* ── reset / navigation ───────────────────── */
    reset() {
      _pdfJsDoc  = null;
      _pdfBytes  = null;
      _outBytes  = null;
      this.stage = 'upload';
      this.pdfName = ''; this.pdfSize = 0; this.pageCount = 0;
      this.pages = []; this.renderDone = 0;
      this.processProgress = 0; this.outputSize = 0;
      this.error = '';
    },

    editAgain() {
      _outBytes = null;
      this.processProgress = 0;
      this.stage = 'editor';
    },

    /* ── helpers ──────────────────────────────── */
    rotLabel(rotation) {
      if (rotation === 0)   return '';
      if (rotation === 90)  return '90° ↻';
      if (rotation === 180) return '180°';
      return '90° ↺';
    },

    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024)    return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },

    toggleFaq(btn) { btn.closest('.faq-item').classList.toggle('open'); },
  };
}
