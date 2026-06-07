function imageConverter() {
  return {
    items       : [],
    outputFormat: 'image/webp',
    quality     : 82,
    bgColor     : '#ffffff',
    isDragging  : false,
    converting  : false,
    doneCount   : 0,
    sliderPos   : 50,

    /* ── computed ─────────────────────────────────────────── */
    get allReady()       { return this.items.length > 0 && this.items.every(i => i.blob || i.error); },
    get totalOriginal()  { return this.items.reduce((s, i) => s + i.originalSize, 0); },
    get totalConverted() { return this.items.reduce((s, i) => s + (i.blob ? i.blob.size : i.originalSize), 0); },
    get totalSavedPct()  {
      if (!this.totalOriginal) return 0;
      return Math.round((1 - this.totalConverted / this.totalOriginal) * 100);
    },

    /* ── init ─────────────────────────────────────────────── */
    init() {},

    /* ── file input ───────────────────────────────────────── */
    onFileChange(e) { this.addFiles(Array.from(e.target.files)); e.target.value = ''; },
    onDrop(e)       { this.isDragging = false; this.addFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))); },

    addFiles(files) {
      const existing = new Set(this.items.map(i => i.name + i.originalSize));
      files.slice(0, Math.max(0, 50 - this.items.length)).forEach(file => {
        const key = file.name + file.size;
        if (existing.has(key)) return; // skip duplicates
        existing.add(key);
        const id = Date.now() + Math.random();
        const item = {
          id, file,
          name        : file.name,
          originalSize: file.size,
          origMime    : file.type,
          thumbUrl    : null,
          outputUrl   : null,
          blob        : null,
          converting  : false,
          error       : '',
        };
        this.items.push(item);
        // generate thumbnail
        const reader = new FileReader();
        reader.onload = e => {
          const idx = this.items.findIndex(i => i.id === id);
          if (idx >= 0) this.items[idx].thumbUrl = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    addMore() { this.$refs.fileInput2.click(); },
    clearAll() {
      this.items.forEach(i => { if (i.outputUrl) URL.revokeObjectURL(i.outputUrl); });
      this.items = []; this.doneCount = 0;
    },

    /* ── convert ──────────────────────────────────────────── */
    async convertAll() {
      this.converting = true;
      this.doneCount  = 0;
      for (const item of this.items) {
        await this._convertItem(item);
        this.doneCount++;
      }
      this.converting = false;
      if (this.allReady) showToast('All images converted!');
    },

    _convertItem(item) {
      return new Promise(resolve => {
        item.converting = true;
        item.blob       = null;
        item.outputUrl  = null;
        item.error      = '';

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            // fill background for JPEG output (no alpha support)
            if (this.outputFormat === 'image/jpeg') {
              ctx.fillStyle = this.bgColor || '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0);

            const qual = this.outputFormat === 'image/png' ? undefined : this.quality / 100;
            canvas.toBlob(blob => {
              if (!blob) { item.error = 'Encoding failed'; item.converting = false; resolve(); return; }
              const idx = this.items.findIndex(i => i.id === item.id);
              if (idx >= 0) {
                if (this.items[idx].outputUrl) URL.revokeObjectURL(this.items[idx].outputUrl);
                this.items[idx].blob       = blob;
                this.items[idx].outputUrl  = URL.createObjectURL(blob);
                this.items[idx].converting = false;
              }
              resolve();
            }, this.outputFormat, qual);
          } catch(err) {
            item.error      = err.message;
            item.converting = false;
            resolve();
          }
        };
        img.onerror = () => {
          item.error      = 'Could not load image';
          item.converting = false;
          resolve();
        };
        img.src = item.thumbUrl || URL.createObjectURL(item.file);
      });
    },

    /* ── download ─────────────────────────────────────────── */
    downloadItem(item) {
      if (!item.blob) return;
      const ext  = this.outputFormat.split('/')[1].replace('jpeg','jpg');
      const base = item.name.replace(/\.[^.]+$/, '');
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(item.blob);
      a.download = `${base}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    async downloadAllZip() {
      if (!this.allReady || typeof JSZip === 'undefined') {
        showToast('Convert all files first, then download ZIP.');
        return;
      }
      showToast('Building ZIP…');
      const ext = this.outputFormat.split('/')[1].replace('jpeg','jpg');
      const zip = new JSZip();

      // track duplicates in zip
      const nameCount = {};
      for (const item of this.items) {
        if (!item.blob) continue;
        const base = item.name.replace(/\.[^.]+$/, '');
        nameCount[base] = (nameCount[base] || 0) + 1;
        const suffix = nameCount[base] > 1 ? `_${nameCount[base]}` : '';
        zip.file(`${base}${suffix}.${ext}`, item.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const a       = document.createElement('a');
      a.href        = URL.createObjectURL(zipBlob);
      a.download    = `converted-${ext}-${Date.now()}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      showToast('ZIP downloaded!');
    },

    /* ── helpers ──────────────────────────────────────────── */
    savingPct(item) {
      if (!item.blob) return '';
      const pct = Math.round((1 - item.blob.size / item.originalSize) * 100);
      return (pct >= 0 ? '-' : '+') + Math.abs(pct) + '%';
    },
    savingClass(item) {
      if (!item.blob) return 'saving-spin';
      const pct = Math.round((1 - item.blob.size / item.originalSize) * 100);
      return pct >= 15 ? 'saving-green' : pct >= 0 ? 'saving-yellow' : 'saving-red';
    },
    formatBytes(b) {
      if (!b) return '0 B';
      if (b < 1024)    return b + ' B';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
      return (b / 1048576).toFixed(2) + ' MB';
    },

    /* ── compare slider ───────────────────────────────────── */
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
      const rect    = wrap.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      this.sliderPos = Math.min(100, Math.max(0,
        Math.round(((clientX - rect.left) / rect.width) * 1000) / 10
      ));
    },
  };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}
