// Cache native Image elements outside Alpine reactivity
const _cmpImgs = {};

function compareTwoImagesApp() {
  return {
    imageA: null,  // { src, name, w, h, size, type }
    imageB: null,
    mode: 'slider',  // slider | sidebyside | overlay | diff
    sliderPos: 50,
    overlayOpacity: 50,
    isDragging: false,
    isDragOverA: false,
    isDragOverB: false,
    diffUrl: null,
    diffStats: null,
    isComputingDiff: false,

    init() {},

    // ── Computed ──────────────────────────────────────────────────
    get bothLoaded() {
      return !!(this.imageA && this.imageB);
    },

    // ── File handling ─────────────────────────────────────────────
    onFileA(e) { const f = e.target.files[0]; if (f) this.loadImage(f, 'A'); },
    onFileB(e) { const f = e.target.files[0]; if (f) this.loadImage(f, 'B'); },

    onDropA(e) {
      this.isDragOverA = false;
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) this.loadImage(f, 'A');
    },

    onDropB(e) {
      this.isDragOverB = false;
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) this.loadImage(f, 'B');
    },

    loadImage(file, side) {
      if (!file.type.startsWith('image/')) { this.showToast('Please upload an image file'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          _cmpImgs[side] = img;
          this[`image${side}`] = {
            src: e.target.result,
            name: file.name,
            w: img.naturalWidth,
            h: img.naturalHeight,
            size: file.size,
            type: file.type,
          };
          this.diffUrl = null;
          this.diffStats = null;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    swapImages() {
      [this.imageA, this.imageB] = [this.imageB, this.imageA];
      [_cmpImgs['A'], _cmpImgs['B']] = [_cmpImgs['B'], _cmpImgs['A']];
      this.diffUrl = null;
      this.diffStats = null;
    },

    changeImage(side) {
      this[`image${side}`] = null;
      _cmpImgs[side] = null;
      this.diffUrl = null;
      this.diffStats = null;
    },

    // ── Mode ──────────────────────────────────────────────────────
    switchMode(m) {
      this.mode = m;
      if (m === 'diff' && this.bothLoaded && !this.diffUrl) {
        this.$nextTick(() => this.computeDiff());
      }
    },

    // ── Slider ────────────────────────────────────────────────────
    onContainerMouseDown(e) {
      if (this.mode !== 'slider') return;
      this.isDragging = true;
      this._updateSlider(e.clientX);
    },

    onContainerMouseMove(e) {
      if (!this.isDragging || this.mode !== 'slider') return;
      this._updateSlider(e.clientX);
    },

    onContainerTouchStart(e) {
      if (this.mode !== 'slider') return;
      this.isDragging = true;
      this._updateSlider(e.touches[0].clientX);
    },

    onContainerTouchMove(e) {
      if (!this.isDragging || this.mode !== 'slider') return;
      this._updateSlider(e.touches[0].clientX);
    },

    onDragEnd() { this.isDragging = false; },

    _updateSlider(clientX) {
      const container = this.$refs.compareContainer;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      this.sliderPos = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    },

    // ── Pixel Diff ────────────────────────────────────────────────
    async computeDiff() {
      if (!this.bothLoaded || this.isComputingDiff) return;
      this.isComputingDiff = true;
      await new Promise(r => setTimeout(r, 10));

      try {
        const aImg = _cmpImgs['A'];
        const bImg = _cmpImgs['B'];

        // Normalise both to same canvas size (union of dims, capped at 1200px)
        const maxW = Math.max(aImg.naturalWidth, bImg.naturalWidth);
        const maxH = Math.max(aImg.naturalHeight, bImg.naturalHeight);
        const scale = Math.min(1, 1200 / Math.max(maxW, maxH));
        const cw = Math.round(maxW * scale);
        const ch = Math.round(maxH * scale);

        const getPixels = img => {
          const c = document.createElement('canvas');
          c.width = cw; c.height = ch;
          c.getContext('2d').drawImage(img, 0, 0, cw, ch);
          return c.getContext('2d').getImageData(0, 0, cw, ch).data;
        };

        const dA = getPixels(aImg);
        const dB = getPixels(bImg);

        const out = document.createElement('canvas');
        out.width = cw; out.height = ch;
        const ctx = out.getContext('2d');
        const imgData = ctx.createImageData(cw, ch);
        const o = imgData.data;

        let changed = 0, totalDiff = 0;
        const total = cw * ch;
        const THRESH = 12;

        for (let i = 0; i < dA.length; i += 4) {
          const dr = Math.abs(dA[i]   - dB[i]);
          const dg = Math.abs(dA[i+1] - dB[i+1]);
          const db = Math.abs(dA[i+2] - dB[i+2]);
          const d  = (dr + dg + db) / 3;
          totalDiff += d;

          if (d < THRESH) {
            // Identical — muted grey overlay
            o[i] = o[i+1] = o[i+2] = 100;
            o[i+3] = 90;
          } else {
            changed++;
            // Changed — teal → orange → red heatmap based on intensity
            const t = Math.min(1, d / 100);
            if (t < 0.5) {
              // Low diff → teal/cyan
              const u = t * 2;
              o[i]   = Math.round(6 + 249 * u);
              o[i+1] = Math.round(182 - 69 * u);
              o[i+2] = Math.round(212 - 212 * u);
            } else {
              // High diff → orange → red
              const u = (t - 0.5) * 2;
              o[i]   = 255;
              o[i+1] = Math.round(113 * (1 - u));
              o[i+2] = 0;
            }
            o[i+3] = Math.round(180 + 75 * t);
          }
        }

        ctx.putImageData(imgData, 0, 0);
        this.diffUrl = out.toDataURL('image/png');
        this.diffStats = {
          changedPct: ((changed / total) * 100).toFixed(1),
          identicalPct: (((total - changed) / total) * 100).toFixed(1),
          avgDiff: (totalDiff / total).toFixed(1),
          changed,
          total,
          cw,
          ch,
        };
      } catch (err) {
        this.showToast('Diff failed: ' + err.message);
      }

      this.isComputingDiff = false;
    },

    downloadDiff() {
      if (!this.diffUrl) return;
      const a = document.createElement('a');
      a.href = this.diffUrl;
      a.download = 'image-diff.png';
      a.click();
    },

    // ── Utilities ─────────────────────────────────────────────────
    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
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
