/* HEIC → JPG — heic2any for fully client-side decoding */

/* Raw File objects stored outside Alpine's reactive proxy so heic2any
   receives a real Blob, not a Proxy-wrapped one. */
const _heicRaw = {};

function heicToJpgApp() {
  return {
    files:         [],
    activeId:      null,
    isDragOver:    false,
    allConverting: false,
    quality:       92,

    init() {},

    /* ── computed ─────────────────────────────── */
    get convertedCount() {
      return this.files.filter(f => f.jpgUrl).length;
    },

    get activeFile() {
      return this.files.find(f => f.id === this.activeId) || this.files[0] || null;
    },

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

    /* ── file intake ──────────────────────────── */
    onFileInput(e) {
      Array.from(e.target.files).forEach(f => this._addFile(f));
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      Array.from(e.dataTransfer.files).forEach(f => this._addFile(f));
    },

    _isHeic(file) {
      if (/\.(heic|heif)$/i.test(file.name)) return true;
      const t = file.type.toLowerCase();
      return t === 'image/heic' || t === 'image/heif' ||
             t === 'image/heic-sequence' || t === 'image/heif-sequence';
    },

    _addFile(file) {
      if (!this._isHeic(file)) return;
      const id = Date.now() + Math.random();
      _heicRaw[id] = file;
      this.files.push({
        id,
        name:       file.name,
        size:       file.size,
        jpgUrl:     null,
        jpgSize:    0,
        jpgQuality: null,
        converting: false,
        error:      null,
      });
      if (!this.activeId) this.activeId = id;
    },

    removeFile(id) {
      this.files = this.files.filter(f => f.id !== id);
      delete _heicRaw[id];
      if (this.activeId === id) this.activeId = this.files[0]?.id ?? null;
    },

    clearAll() {
      this.files.forEach(f => delete _heicRaw[f.id]);
      this.files    = [];
      this.activeId = null;
    },

    /* ── conversion ───────────────────────────── */
    async _convert(f) {
      if (f.converting) return;
      f.converting = true;
      f.error      = null;
      try {
        if (typeof heic2any === 'undefined') throw new Error('heic2any library not loaded — check your internet connection and refresh');
        const raw    = _heicRaw[f.id];
        const result = await heic2any({ blob: raw, toType: 'image/jpeg', quality: +this.quality / 100 });
        const blob   = Array.isArray(result) ? result[0] : result;
        f.jpgUrl     = await this._blobToDataUrl(blob);
        f.jpgSize    = blob.size;
        f.jpgQuality = +this.quality;
        if (!this.activeId || this.activeId === f.id) this.activeId = f.id;
      } catch (err) {
        f.error = err.message || 'Conversion failed';
      }
      f.converting = false;
    },

    async convertAndDownload(f) {
      await this._convert(f);
      if (f.jpgUrl) this._triggerDownload(f);
    },

    async convertAll() {
      if (this.allConverting) return;
      this.allConverting = true;
      for (const f of this.files) {
        if (!f.jpgUrl || this.qualityStale(f)) await this._convert(f);
      }
      this.allConverting = false;
    },

    async downloadAllZip() {
      if (typeof JSZip === 'undefined') { this.showToast('JSZip not loaded'); return; }
      const pending = this.files.filter(f => !f.jpgUrl || this.qualityStale(f));
      if (pending.length) {
        this.allConverting = true;
        for (const f of pending) await this._convert(f);
        this.allConverting = false;
      }
      const done = this.files.filter(f => f.jpgUrl);
      if (!done.length) return;

      const zip   = new JSZip();
      const names = new Set();
      done.forEach(f => {
        const base = f.name.replace(/\.(heic|heif)$/i, '');
        let name = base + '.jpg', i = 1;
        while (names.has(name)) name = base + `-${i++}.jpg`;
        names.add(name);
        zip.file(name, f.jpgUrl.split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = 'heic-to-jpg.zip';
      a.click();
      this.showToast('ZIP downloaded!');
    },

    _triggerDownload(f) {
      if (!f.jpgUrl) return;
      const a    = document.createElement('a');
      a.href     = f.jpgUrl;
      a.download = f.name.replace(/\.(heic|heif)$/i, '.jpg');
      a.click();
    },

    _blobToDataUrl(blob) {
      return new Promise((res, rej) => {
        const r  = new FileReader();
        r.onload  = e => res(e.target.result);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
    },

    /* ── stats & helpers ──────────────────────── */
    qualityStale(f) {
      return f.jpgUrl && f.jpgQuality !== null && f.jpgQuality !== +this.quality;
    },

    savingsText(f) {
      if (!f.jpgUrl || !f.jpgSize) return '';
      const diff = f.size - f.jpgSize;
      const pct  = Math.round(Math.abs(diff) / f.size * 100);
      if (diff > 500)  return pct + '% smaller';
      if (diff < -500) return pct + '% larger';
      return 'same size';
    },

    savingsPositive(f) {
      return f.jpgUrl && f.jpgSize && f.size > f.jpgSize + 500;
    },

    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024)    return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
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
