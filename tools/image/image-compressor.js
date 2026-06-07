function imageCompressor() {
  return {
    items: [],
    quality: 80,
    outputFormat: 'auto',
    maxWidth: '',
    maxHeight: '',
    lockAspect: true,
    stripMeta: true,
    autoCompress: true,
    isDragging: false,
    processing: false,
    doneCount: 0,
    sliderPos: 50,

    get totalOriginal() {
      return this.items.reduce((s, i) => s + i.originalSize, 0);
    },
    get totalCompressed() {
      return this.items.reduce((s, i) => s + (i.compressedSize || i.originalSize), 0);
    },
    get totalSavedPct() {
      if (!this.totalOriginal) return 0;
      return Math.round((1 - this.totalCompressed / this.totalOriginal) * 100);
    },
    get allReady() {
      return this.items.length > 0 && this.items.every(i => i.compressedBlob);
    },

    init() {},

    /* ── Drag-slider events ──────────────────────────────────── */
    startDrag(e) {
      const wrap = this.$refs.sliderWrap;
      if (wrap) wrap.classList.add('dragging');
      this._updateSlider(e);

      let active = true;
      const onMove = ev => { if (active) this._updateSlider(ev); };
      const onUp   = () => {
        active = false;
        if (wrap) wrap.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend',  onUp);
      };
      document.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('mouseup',   onUp);
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend',  onUp);
    },

    _updateSlider(e) {
      const wrap = this.$refs.sliderWrap;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      this.sliderPos = Math.round(pct * 10) / 10;
    },

    onFileSelect(e) {
      this.addFiles(Array.from(e.target.files));
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragging = false;
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      this.addFiles(files);
    },

    addFiles(files) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      files
        .filter(f => allowed.includes(f.type))
        .slice(0, 20 - this.items.length)
        .forEach(file => {
          const id = Date.now() + Math.random();
          const item = {
            id,
            file,
            name: file.name,
            originalSize: file.size,
            compressedSize: null,
            compressedBlob: null,
            compressedUrl: null,
            previewUrl: null,
            w: 0,
            h: 0,
            processing: false,
          };
          this.items.push(item);
          // Create preview URL
          const reader = new FileReader();
          reader.onload = e => {
            const idx = this.items.findIndex(i => i.id === id);
            if (idx >= 0) this.items[idx].previewUrl = e.target.result;
          };
          reader.readAsDataURL(file);
          if (this.autoCompress) this.compressItem(item);
        });
    },

    async recompressAll() {
      this.processing = true;
      this.doneCount = 0;
      for (const item of this.items) {
        await this.compressItem(item);
        this.doneCount++;
      }
      this.processing = false;
    },

    compressItem(item) {
      return new Promise(resolve => {
        item.processing = true;
        item.compressedBlob = null;
        item.compressedUrl = null;
        item.compressedSize = null;

        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const { w, h } = this.getDimensions(img.naturalWidth, img.naturalHeight);
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            // White background for JPEG (transparent PNG → JPEG)
            const fmt = this.resolveFormat(item.file.type);
            if (fmt === 'image/jpeg') {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, w, h);
            }
            ctx.drawImage(img, 0, 0, w, h);

            const quality = fmt === 'image/png' ? undefined : this.quality / 100;
            canvas.toBlob(blob => {
              if (!blob) { resolve(); return; }
              const idx = this.items.findIndex(i => i.id === item.id);
              if (idx >= 0) {
                const url = URL.createObjectURL(blob);
                this.items[idx].compressedBlob = blob;
                this.items[idx].compressedSize = blob.size;
                this.items[idx].compressedUrl = url;
                this.items[idx].w = w;
                this.items[idx].h = h;
                this.items[idx].processing = false;
              }
              resolve();
            }, fmt, quality);
          };
          img.onerror = () => { item.processing = false; resolve(); };
          img.src = e.target.result;
        };
        reader.readAsDataURL(item.file);
      });
    },

    getDimensions(origW, origH) {
      const mw = parseInt(this.maxWidth) || 0;
      const mh = parseInt(this.maxHeight) || 0;
      if (!mw && !mh) return { w: origW, h: origH };

      let w = origW, h = origH;
      if (mw && w > mw) {
        h = this.lockAspect ? Math.round(h * mw / w) : h;
        w = mw;
      }
      if (mh && h > mh) {
        w = this.lockAspect ? Math.round(w * mh / h) : w;
        h = mh;
      }
      return { w: Math.max(1, w), h: Math.max(1, h) };
    },

    resolveFormat(origType) {
      if (this.outputFormat !== 'auto') return this.outputFormat;
      if (origType === 'image/gif') return 'image/jpeg';
      return origType;
    },

    downloadItem(item) {
      if (!item.compressedBlob) return;
      const ext = this.resolveFormat(item.file.type).split('/')[1].replace('jpeg', 'jpg');
      const baseName = item.name.replace(/\.[^.]+$/, '');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(item.compressedBlob);
      a.download = baseName + '-compressed.' + ext;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    async downloadAll() {
      // Download files one by one with a small delay to avoid browser blocking
      for (const item of this.items) {
        if (item.compressedBlob) {
          this.downloadItem(item);
          await new Promise(r => setTimeout(r, 120));
        }
      }
      showToast('All files downloaded!');
    },

    clearAll() {
      this.items.forEach(i => { if (i.compressedUrl) URL.revokeObjectURL(i.compressedUrl); });
      this.items = [];
      this.doneCount = 0;
      this.processing = false;
    },

    formatBytes(bytes) {
      if (!bytes) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    },

    savingPct(item) {
      if (!item.compressedSize || !item.originalSize) return 0;
      return Math.round((1 - item.compressedSize / item.originalSize) * 100);
    },

    savingClass(item) {
      const pct = this.savingPct(item);
      if (pct >= 20) return 'saving-green';
      if (pct >= 0) return 'saving-yellow';
      return 'saving-red';
    },
  };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}
