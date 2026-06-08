/* Delete PDF Pages
   PDF.js  → renders page thumbnails for selection UI
   pdf-lib → removes selected pages from the actual PDF bytes
             (no rasterization — text/vectors stay intact)

   _pdf and _pdfBytes live outside Alpine's reactive proxy. */

let _pdf      = null;   /* pdfjsLib document for thumbnails */
let _pdfBytes = null;   /* ArrayBuffer of original PDF       */

function deletePdfPagesApp() {
  return {
    stage:       'upload',  /* upload | loading | editor | processing | done */
    pdfName:     '',
    pdfSize:     0,
    pageCount:   0,
    pages:       [],     /* [{ num, dataUrl, w, h, rendering }] */
    marked:      [],     /* 1-based page numbers selected for deletion */
    renderDone:  0,
    processing:  false,
    resultSize:  0,
    resultPages: 0,
    isDragOver:  false,
    error:       '',

    /* ── init ─────────────────────────────── */
    init() {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
    },

    /* ── computed ─────────────────────────── */
    get markedCount()  { return this.marked.length; },
    get keptCount()    { return this.pageCount - this.markedCount; },
    get allMarked()    { return this.markedCount === this.pageCount && this.pageCount > 0; },
    get noneMarked()   { return this.markedCount === 0; },
    get canDelete()    { return this.markedCount > 0 && this.keptCount > 0; },
    get renderPct()    { return this.pageCount ? Math.round(this.renderDone / this.pageCount * 100) : 0; },

    isMarked(num) { return this.marked.includes(num); },

    /* ── file intake ──────────────────────── */
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._load(f);
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files)
        .find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (f) this._load(f);
    },

    async _load(file) {
      if (typeof pdfjsLib === 'undefined') {
        this.error = 'PDF.js library failed to load — please refresh.';
        return;
      }
      this.error    = '';
      this.stage    = 'loading';
      this.pages    = [];
      this.marked   = [];
      this.renderDone = 0;
      _pdf          = null;
      _pdfBytes     = null;
      this.pdfName  = file.name;
      this.pdfSize  = file.size;

      try {
        _pdfBytes         = await file.arrayBuffer();
        _pdf              = await pdfjsLib.getDocument({ data: _pdfBytes.slice(0) }).promise;
        this.pageCount    = _pdf.numPages;

        /* Build stubs immediately so the grid renders with spinners */
        this.pages = Array.from({ length: this.pageCount }, (_, i) => ({
          num:       i + 1,
          dataUrl:   null,
          w:         0,
          h:         0,
          rendering: false,
        }));

        this.stage = 'editor';
        this._renderAll();           /* fire and don't await — let thumbnails trickle in */
      } catch (err) {
        this.error = err.message || 'Failed to open PDF. Make sure it is a valid, unencrypted PDF.';
        this.stage = 'upload';
      }
    },

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
        const page     = await _pdf.getPage(pg.num);
        const vp       = page.getViewport({ scale: 0.4 });
        const canvas   = document.createElement('canvas');
        canvas.width   = vp.width;
        canvas.height  = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
        pg.dataUrl     = canvas.toDataURL('image/jpeg', 0.7);
        pg.w           = Math.round(page.getViewport({ scale: 1 }).width  * 25.4 / 72);
        pg.h           = Math.round(page.getViewport({ scale: 1 }).height * 25.4 / 72);
      } catch (_) { /* silently skip bad pages */ }
      pg.rendering = false;
    },

    /* ── selection helpers ────────────────── */
    toggleMark(num) {
      const idx = this.marked.indexOf(num);
      if (idx >= 0) this.marked.splice(idx, 1);
      else          this.marked.push(num);
    },

    selectAll()  { this.marked = this.pages.map(p => p.num); },
    selectNone() { this.marked = []; },

    selectOdd()  { this.marked = this.pages.map(p => p.num).filter(n => n % 2 !== 0); },
    selectEven() { this.marked = this.pages.map(p => p.num).filter(n => n % 2 === 0); },

    selectRange(from, to) {
      const f = Math.max(1, +from);
      const t = Math.min(this.pageCount, +to);
      if (isNaN(f) || isNaN(t) || f > t) return;
      for (let n = f; n <= t; n++) {
        if (!this.marked.includes(n)) this.marked.push(n);
      }
    },

    /* ── deletion ─────────────────────────── */
    async deleteMarked() {
      if (!this.canDelete || this.processing) return;
      if (typeof PDFLib === 'undefined') {
        this.error = 'pdf-lib failed to load — please refresh.';
        return;
      }

      this.processing = true;
      this.error      = '';

      try {
        const deleteSet = new Set(this.marked);
        const srcDoc    = await PDFLib.PDFDocument.load(_pdfBytes);
        const keepIdx   = [];

        for (let i = 0; i < srcDoc.getPageCount(); i++) {
          if (!deleteSet.has(i + 1)) keepIdx.push(i);   /* 0-based */
        }

        const newDoc      = await PDFLib.PDFDocument.create();
        const copied      = await newDoc.copyPages(srcDoc, keepIdx);
        copied.forEach(p => newDoc.addPage(p));

        const bytes       = await newDoc.save();
        this.resultSize   = bytes.byteLength;
        this.resultPages  = keepIdx.length;

        /* Trigger download */
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = this.pdfName.replace(/\.pdf$/i, '') + '_edited.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 8000);

        this.stage = 'done';
      } catch (err) {
        this.error = err.message || 'PDF processing failed.';
      }

      this.processing = false;
    },

    /* ── reset ────────────────────────────── */
    reset() {
      _pdf          = null;
      _pdfBytes     = null;
      this.stage    = 'upload';
      this.pdfName  = '';
      this.pdfSize  = 0;
      this.pageCount = 0;
      this.pages    = [];
      this.marked   = [];
      this.renderDone = 0;
      this.resultSize = 0;
      this.resultPages = 0;
      this.error    = '';
    },

    editAgain() {
      /* Keep same PDF, return to editor */
      this.stage  = 'editor';
      this.marked = [];
      this.resultSize  = 0;
      this.resultPages = 0;
    },

    /* ── helpers ──────────────────────────── */
    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024)    return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    },

    showToast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },

    toggleFaq(btn) {
      btn.closest('.faq-item').classList.toggle('open');
    },
  };
}
