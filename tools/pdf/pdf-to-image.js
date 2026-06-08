/* PDF to Image — PDF.js renders each page to canvas, exported as PNG/JPEG.
   _pdf lives outside Alpine proxy — pdfjs document objects must not be proxied. */

let _pdf = null;

function pdfToImageApp() {
  return {
    pages:       [],   // [{ num, dataUrl, width, height, rendered, rendering, error }]
    pdfName:     '',
    pdfSize:     0,
    pageCount:   0,
    isDragOver:  false,
    isLoading:   false,
    loadError:   '',
    rendering:   false,
    renderDone:  0,
    format:      'png',
    quality:     92,
    scale:       2,
    selected:    [],   // page nums selected for ZIP download

    /* ── init ─────────────────────────────── */
    init() {
      if (typeof pdfjsLib === 'undefined') {
        this.loadError = 'PDF.js library failed to load — please refresh the page.';
        return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    },

    /* ── computed ─────────────────────────── */
    get renderProgress() {
      if (!this.pageCount) return 0;
      return Math.round(this.renderDone / this.pageCount * 100);
    },

    get allSelected() {
      return this.selected.length === this.pages.length && this.pages.length > 0;
    },

    get selectedCount() { return this.selected.length; },

    /* ── file intake ──────────────────────── */
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._loadPdf(f);
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files).find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (f) this._loadPdf(f);
    },

    async _loadPdf(file) {
      this.isLoading  = true;
      this.loadError  = '';
      this.pages      = [];
      this.renderDone = 0;
      this.selected   = [];
      this.pdfName    = file.name;
      this.pdfSize    = file.size;

      try {
        const buf  = await file.arrayBuffer();
        _pdf       = await pdfjsLib.getDocument({ data: buf }).promise;
        this.pageCount = _pdf.numPages;

        /* Build page stubs first so UI shows immediately */
        this.pages = Array.from({ length: this.pageCount }, (_, i) => ({
          num:       i + 1,
          dataUrl:   null,
          width:     0,
          height:    0,
          rendered:  false,
          rendering: false,
          error:     null,
        }));

        this.isLoading = false;
        this.selected  = this.pages.map(p => p.num); // select all by default

        /* Render pages sequentially */
        await this._renderAll();

      } catch (err) {
        this.loadError = err.message || 'Failed to open PDF. Make sure the file is a valid, unencrypted PDF.';
        this.isLoading = false;
      }
    },

    async _renderAll() {
      this.rendering  = true;
      this.renderDone = 0;
      for (const pg of this.pages) {
        await this._renderPage(pg);
        this.renderDone++;
      }
      this.rendering = false;
    },

    async _renderPage(pg) {
      if (pg.rendering) return;
      pg.rendering = true;
      pg.error     = null;
      try {
        const page     = await _pdf.getPage(pg.num);
        const viewport = page.getViewport({ scale: +this.scale });
        const canvas   = document.createElement('canvas');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;
        const ctx      = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const mime     = this.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const q        = this.format === 'jpeg' ? +this.quality / 100 : undefined;
        pg.dataUrl     = canvas.toDataURL(mime, q);
        pg.width       = Math.round(viewport.width);
        pg.height      = Math.round(viewport.height);
        pg.rendered    = true;
      } catch (err) {
        pg.error = err.message || 'Render failed';
      }
      pg.rendering = false;
    },

    /* Re-render all pages when format or scale changes */
    async reRender() {
      if (!_pdf || this.rendering) return;
      this.pages.forEach(pg => { pg.rendered = false; pg.dataUrl = null; });
      this.renderDone = 0;
      await this._renderAll();
    },

    /* ── download ─────────────────────────── */
    downloadPage(pg) {
      if (!pg.dataUrl) return;
      const ext = this.format === 'jpeg' ? '.jpg' : '.png';
      const base = this.pdfName.replace(/\.pdf$/i, '');
      const a = document.createElement('a');
      a.href     = pg.dataUrl;
      a.download = `${base}_page${pg.num}${ext}`;
      a.click();
    },

    async downloadSelected() {
      if (typeof JSZip === 'undefined') { this.showToast('JSZip not loaded'); return; }
      const target = this.pages.filter(pg => this.selected.includes(pg.num));
      if (!target.length) { this.showToast('No pages selected'); return; }

      /* Render any unrendered pages first */
      const unrendered = target.filter(pg => !pg.rendered);
      if (unrendered.length) {
        this.rendering  = true;
        for (const pg of unrendered) {
          await this._renderPage(pg);
          this.renderDone++;
        }
        this.rendering = false;
      }

      const done = target.filter(pg => pg.dataUrl);
      if (!done.length) return;

      const zip  = new JSZip();
      const ext  = this.format === 'jpeg' ? '.jpg' : '.png';
      const base = this.pdfName.replace(/\.pdf$/i, '');
      done.forEach(pg => {
        zip.file(`${base}_page${pg.num}${ext}`, pg.dataUrl.split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `${base}_images.zip`;
      a.click();
      this.showToast(`Downloaded ${done.length} image${done.length !== 1 ? 's' : ''}`);
    },

    /* ── selection ────────────────────────── */
    toggleSelect(num) {
      const idx = this.selected.indexOf(num);
      if (idx >= 0) this.selected.splice(idx, 1);
      else          this.selected.push(num);
    },

    toggleAll() {
      this.selected = this.allSelected ? [] : this.pages.map(p => p.num);
    },

    isSelected(num) { return this.selected.includes(num); },

    /* ── reset ────────────────────────────── */
    closePdf() {
      _pdf = null;
      this.pages     = [];
      this.pdfName   = '';
      this.pdfSize   = 0;
      this.pageCount = 0;
      this.selected  = [];
      this.rendering = false;
      this.renderDone = 0;
      this.loadError = '';
    },

    /* ── helpers ──────────────────────────── */
    qualityLabel() {
      const q = +this.quality;
      if (q >= 95) return 'Maximum';
      if (q >= 85) return 'High';
      if (q >= 70) return 'Good';
      if (q >= 50) return 'Medium';
      return 'Low';
    },

    qualityColor() {
      const q = +this.quality;
      if (q >= 85) return '#4ade80';
      if (q >= 65) return '#facc15';
      return '#f87171';
    },

    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024)    return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    },

    scaleLabel(s) {
      const map = { '0.5':'36 DPI', '1':'72 DPI', '1.5':'108 DPI', '2':'144 DPI', '3':'216 DPI', '4':'288 DPI (print)' };
      return map[String(s)] || '';
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
