/* Merge PDF — browser-side using pdf-lib
   Buffers live outside Alpine proxy to avoid proxy-wrapping ArrayBuffers. */

let _nextId = 1;
const _buffers = new Map(); /* fileId → ArrayBuffer */

function mergePdfApp() {
  return {
    stage: 'upload',   /* upload | files | merging | done */
    isDragOver: false,
    error: '',
    files: [],         /* [{ id, name, size, pageCount }] */
    progress: 0,
    progressMsg: '',
    mergedBytes: null, /* Uint8Array, held for download */
    mergedSize: 0,
    totalMergedPages: 0,
    dragSrc: -1,
    dragTarget: -1,

    get inputPageTotal() { return this.files.reduce((s, f) => s + f.pageCount, 0); },
    get canMerge()       { return this.files.length >= 2; },

    init() {},

    /* ── file input ──────────────────────────── */
    async onFileInput(e) {
      const list = Array.from(e.target.files || []);
      e.target.value = '';
      await this._addFiles(list);
    },

    async onDrop(e) {
      this.isDragOver = false;
      const list = Array.from(e.dataTransfer.files)
        .filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (!list.length) { this.error = 'Only PDF files are accepted.'; return; }
      await this._addFiles(list);
    },

    async _addFiles(list) {
      this.error = '';
      if (typeof PDFLib === 'undefined') {
        this.error = 'PDF library is still loading — wait a moment and try again.';
        return;
      }
      const { PDFDocument } = PDFLib;
      for (const file of list) {
        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
          this.error = `"${file.name}" is not a PDF file.`; continue;
        }
        try {
          const buf = await file.arrayBuffer();
          const doc = await PDFDocument.load(buf, { updateMetadata: false });
          const id  = _nextId++;
          _buffers.set(id, buf);
          this.files.push({ id, name: file.name, size: file.size, pageCount: doc.getPageCount() });
        } catch (err) {
          this.error = `Could not open "${file.name}": it may be password-protected or corrupt.`;
        }
      }
      if (this.files.length > 0 && this.stage === 'upload') this.stage = 'files';
    },

    /* ── list management ─────────────────────── */
    removeFile(id) {
      this.files = this.files.filter(f => f.id !== id);
      _buffers.delete(id);
      if (this.files.length === 0) this.stage = 'upload';
    },

    clearAll() {
      this.files = [];
      _buffers.clear();
      this.stage = 'upload';
      this.error = '';
    },

    moveUp(idx) {
      if (idx === 0) return;
      const a = [...this.files];
      [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]];
      this.files = a;
    },

    moveDown(idx) {
      if (idx >= this.files.length - 1) return;
      const a = [...this.files];
      [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]];
      this.files = a;
    },

    /* ── drag-to-reorder ─────────────────────── */
    dragStart(idx, e) {
      this.dragSrc = idx;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', ''); /* required for Firefox */
    },
    dragOver(idx) {
      if (idx !== this.dragSrc) this.dragTarget = idx;
    },
    dragDrop(idx) {
      if (this.dragSrc < 0 || this.dragSrc === idx) { this.dragEnd(); return; }
      const a = [...this.files];
      const [moved] = a.splice(this.dragSrc, 1);
      a.splice(idx, 0, moved);
      this.files = a;
      this.dragEnd();
    },
    dragEnd() { this.dragSrc = -1; this.dragTarget = -1; },

    /* ── merge ───────────────────────────────── */
    async merge() {
      if (!this.canMerge) return;
      this.stage = 'merging';
      this.progress = 0;
      this.error = '';

      try {
        const { PDFDocument } = PDFLib;
        const merged = await PDFDocument.create();

        for (let i = 0; i < this.files.length; i++) {
          const f = this.files[i];
          this.progressMsg = `Processing ${i + 1} of ${this.files.length}: "${f.name}"`;
          const src    = await PDFDocument.load(_buffers.get(f.id), { updateMetadata: false });
          const copied = await merged.copyPages(src, src.getPageIndices());
          copied.forEach(p => merged.addPage(p));
          this.progress = Math.round(((i + 1) / this.files.length) * 88);
          await new Promise(r => setTimeout(r, 0)); /* yield to browser */
        }

        this.progressMsg = 'Saving merged PDF…';
        const bytes = await merged.save();
        this.mergedBytes  = bytes;
        this.mergedSize   = bytes.length;
        this.totalMergedPages = merged.getPageCount();
        this.progress = 100;
        this.stage = 'done';
      } catch (err) {
        this.error = 'Merge failed: ' + (err.message || String(err));
        this.stage = 'files';
      }
    },

    /* ── download ────────────────────────────── */
    download() {
      if (!this.mergedBytes) return;
      const blob = new Blob([this.mergedBytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'merged.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this._toast('Merged PDF downloaded!');
    },

    /* ── reset / re-merge ────────────────────── */
    reset() {
      this.stage = 'upload';
      this.files = [];
      this.error = '';
      this.progress = 0;
      this.progressMsg = '';
      this.mergedBytes = null;
      this.mergedSize = 0;
      this.totalMergedPages = 0;
      this.dragSrc = -1;
      this.dragTarget = -1;
      _buffers.clear();
    },

    mergeAgain() {
      this.mergedBytes = null;
      this.progress = 0;
      this.stage = 'files';
    },

    /* ── helpers ─────────────────────────────── */
    formatSize(bytes) {
      if (bytes < 1024)             return bytes + ' B';
      if (bytes < 1048576)          return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },
  };
}
