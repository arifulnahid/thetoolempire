// Non-reactive cache for Image elements
const _webpImgs = {};

function webpToJpgApp() {
  return {
    files: [],     // { id, name, type, src, w, h, size, jpgUrl, jpgSize, jpgQuality, converting }
    activeId: null,
    isDragOver: false,
    allConverting: false,

    // Settings
    quality: 92,
    bgColor: '#ffffff',

    init() {},

    // ── Computed ──────────────────────────────────────────────────
    get convertedCount() {
      return this.files.filter(f => f.jpgUrl).length;
    },

    get activeFile() {
      return this.files.find(f => f.id === this.activeId) || this.files[0] || null;
    },

    qualityLabel() {
      const q = this.quality;
      if (q >= 95) return 'Maximum';
      if (q >= 85) return 'High';
      if (q >= 70) return 'Good';
      if (q >= 50) return 'Medium';
      return 'Low';
    },

    qualityColor() {
      const q = this.quality;
      if (q >= 85) return '#4ade80';
      if (q >= 65) return '#facc15';
      return '#f87171';
    },

    // ── File handling ─────────────────────────────────────────────
    onFileInput(e) {
      Array.from(e.target.files).forEach(f => this.addFile(f));
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      Array.from(e.dataTransfer.files).forEach(f => {
        if (f.type.startsWith('image/')) this.addFile(f);
      });
    },

    addFile(file) {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        const id = Date.now() + Math.random();
        img.onload = () => {
          _webpImgs[id] = img;
          this.files.push({
            id,
            name: file.name,
            type: file.type,
            src: e.target.result,
            w: img.naturalWidth,
            h: img.naturalHeight,
            size: file.size,
            jpgUrl: null,
            jpgSize: 0,
            jpgQuality: null,
            converting: false,
          });
          if (!this.activeId) this.activeId = id;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    removeFile(id) {
      this.files = this.files.filter(f => f.id !== id);
      if (this.activeId === id) this.activeId = this.files[0]?.id || null;
    },

    clearAll() {
      this.files = [];
      this.activeId = null;
    },

    // ── Conversion ────────────────────────────────────────────────
    _render(file) {
      return new Promise(resolve => {
        const img = _webpImgs[file.id];
        if (!img) { resolve(null); return; }
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', this.quality / 100));
      });
    },

    _estimateSize(dataUrl) {
      const b64 = dataUrl.split(',')[1] || '';
      return Math.round(b64.length * 3 / 4);
    },

    async convertAndDownload(f) {
      f.converting = true;
      const url = await this._render(f);
      if (url) {
        f.jpgUrl = url;
        f.jpgSize = this._estimateSize(url);
        f.jpgQuality = this.quality;
        const base = f.name.replace(/\.[^.]+$/, '');
        const a = document.createElement('a');
        a.href = url; a.download = base + '.jpg'; a.click();
      }
      f.converting = false;
    },

    async convertAll() {
      if (this.allConverting) return;
      this.allConverting = true;
      for (const f of this.files) {
        f.converting = true;
        const url = await this._render(f);
        if (url) {
          f.jpgUrl = url;
          f.jpgSize = this._estimateSize(url);
          f.jpgQuality = this.quality;
        }
        f.converting = false;
      }
      this.allConverting = false;
    },

    async downloadAllZip() {
      if (typeof JSZip === 'undefined') { this.showToast('ZIP library not loaded'); return; }
      await this.convertAll();
      const zip = new JSZip();
      const names = new Set();
      this.files.forEach(f => {
        if (!f.jpgUrl) return;
        const base = f.name.replace(/\.[^.]+$/, '');
        let name = base + '.jpg', i = 1;
        while (names.has(name)) name = base + `-${i++}.jpg`;
        names.add(name);
        zip.file(name, f.jpgUrl.split(',')[1], { base64: true });
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'webp-to-jpg.zip'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.showToast('ZIP downloaded!');
    },

    // ── File stats ────────────────────────────────────────────────
    savingsText(f) {
      if (!f.jpgUrl || !f.jpgSize) return '';
      const diff = f.size - f.jpgSize;
      const pct  = Math.round(Math.abs(diff) / f.size * 100);
      if (diff > 500)  return `${pct}% smaller`;
      if (diff < -500) return `${pct}% larger`;
      return 'same size';
    },

    savingsPositive(f) {
      return f.jpgUrl && f.jpgSize && f.size > f.jpgSize + 500;
    },

    qualityStale(f) {
      return f.jpgUrl && f.jpgQuality !== null && f.jpgQuality !== this.quality;
    },

    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    },

    // ── Utilities ─────────────────────────────────────────────────
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
