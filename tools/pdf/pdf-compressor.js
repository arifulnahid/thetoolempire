/* PDF Compressor — PDF.js renders each page to canvas at reduced resolution/quality,
   jsPDF rebuilds a new PDF from JPEG-compressed page images.
   _pdf lives outside Alpine proxy — pdfjs document objects must not be proxied. */

let _pdf        = null;
let _compressed = null; /* Uint8Array of the compressed PDF, held for download */

const PRESETS = {
  low:     { scale: 0.7,  quality: 42, label: 'Low',     sizeHint: '~70–90% smaller' },
  medium:  { scale: 1.0,  quality: 68, label: 'Medium',  sizeHint: '~50–75% smaller' },
  high:    { scale: 1.5,  quality: 84, label: 'High',    sizeHint: '~30–55% smaller' },
  maximum: { scale: 2.0,  quality: 94, label: 'Maximum', sizeHint: '~10–30% smaller' },
};

function pdfCompressorApp() {
  return {
    /* state */
    stage:       'upload',  /* upload | ready | compressing | done */
    preset:      'medium',
    pdfName:     '',
    pdfSize:     0,
    pageCount:   0,
    progress:    0,          /* 0–100 */
    progressMsg: '',
    compressedSize: 0,
    error:       '',

    /* ── init ─────────────────────────────── */
    init() {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      }
    },

    /* ── computed ─────────────────────────── */
    get presets() { return PRESETS; },

    get savings() {
      if (!this.compressedSize || !this.pdfSize) return 0;
      return Math.round((1 - this.compressedSize / this.pdfSize) * 100);
    },

    get savingsPositive() { return this.savings > 0; },

    get outputName() {
      return this.pdfName.replace(/\.pdf$/i, '') + '_compressed.pdf';
    },

    /* ── file intake ──────────────────────── */
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._loadPdf(f);
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files)
        .find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (f) this._loadPdf(f);
    },

    async _loadPdf(file) {
      if (typeof pdfjsLib === 'undefined') {
        this.error = 'PDF.js library failed to load — please refresh the page.';
        return;
      }
      this.error   = '';
      this.stage   = 'upload';
      _pdf         = null;
      _compressed  = null;

      this.pdfName = file.name;
      this.pdfSize = file.size;

      try {
        const buf  = await file.arrayBuffer();
        _pdf       = await pdfjsLib.getDocument({ data: buf }).promise;
        this.pageCount = _pdf.numPages;
        this.stage = 'ready';
      } catch (err) {
        this.error = err.message || 'Failed to open PDF. Make sure it is a valid, unencrypted PDF.';
        this.stage = 'upload';
      }
    },

    /* ── compression ──────────────────────── */
    async compress() {
      if (!_pdf || this.stage === 'compressing') return;
      if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
        this.error = 'jsPDF library failed to load — please refresh.';
        return;
      }

      this.stage    = 'compressing';
      this.progress = 0;
      this.error    = '';
      _compressed   = null;

      const { scale, quality } = PRESETS[this.preset];
      const { jsPDF }          = window.jspdf;

      try {
        let doc = null;

        for (let i = 1; i <= this.pageCount; i++) {
          this.progressMsg = `Compressing page ${i} of ${this.pageCount}…`;
          this.progress    = Math.round(((i - 1) / this.pageCount) * 100);

          const page   = await _pdf.getPage(i);

          /* Natural size in mm (scale=1 viewport gives points; 1pt = 25.4/72 mm) */
          const vpNat  = page.getViewport({ scale: 1 });
          const pageW  = vpNat.width  * 25.4 / 72;
          const pageH  = vpNat.height * 25.4 / 72;

          /* Render at chosen scale */
          const vp     = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width  = vp.width;
          canvas.height = vp.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

          const dataUrl = canvas.toDataURL('image/jpeg', quality / 100);

          if (i === 1) {
            doc = new jsPDF({ unit: 'mm', format: [pageW, pageH], compress: true });
          } else {
            doc.addPage([pageW, pageH]);
          }

          doc.addImage(dataUrl, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
        }

        this.progressMsg = 'Building PDF…';
        this.progress    = 98;

        /* Save to Uint8Array (no browser download yet) */
        const arr        = doc.output('arraybuffer');
        _compressed      = new Uint8Array(arr);
        this.compressedSize = _compressed.byteLength;
        this.progress    = 100;
        this.stage       = 'done';

      } catch (err) {
        this.error = err.message || 'Compression failed.';
        this.stage = 'ready';
      }
    },

    /* ── download ─────────────────────────── */
    download() {
      if (!_compressed) return;
      const blob = new Blob([_compressed], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = this.outputName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.showToast('PDF downloaded!');
    },

    /* ── reset ────────────────────────────── */
    reset() {
      _pdf        = null;
      _compressed = null;
      this.stage        = 'upload';
      this.pdfName      = '';
      this.pdfSize      = 0;
      this.pageCount    = 0;
      this.progress     = 0;
      this.progressMsg  = '';
      this.compressedSize = 0;
      this.error        = '';
    },

    compressAgain() {
      /* Stay on same PDF but go back to ready */
      _compressed         = null;
      this.stage          = 'ready';
      this.compressedSize = 0;
      this.progress       = 0;
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
