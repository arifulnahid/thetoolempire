// Aspect ratio map — 0 means free
const RATIOS = {
  circle : 1,
  square : 1,
  free   : 0,
  '16:9' : 16 / 9,
  '4:3'  : 4  / 3,
  '3:2'  : 3  / 2,
  '9:16' : 9  / 16,
  '2:3'  : 2  / 3,
  '1:2'  : 1  / 2,
};

const MIN_BOX = 40; // minimum crop box size in display pixels

function imageCrop() {
  return {
    srcUrl      : null,
    fileName    : '',
    origFileSize: 0,
    origMime    : '',
    origW       : 0,   // natural image dimensions
    origH       : 0,
    dispW       : 0,   // image display dimensions
    dispH       : 0,

    shape       : 'square',

    // crop box in display-space pixels
    box: { x: 0, y: 0, w: 0, h: 0 },

    outputFormat: 'auto',
    quality     : 90,
    outputBlob  : null,
    outputUrl   : null,
    croppedW    : 0,
    croppedH    : 0,

    isDragging  : false,
    processing  : false,

    /* ── computed ─────────────────────────────────────────── */
    get ratio() { return RATIOS[this.shape] ?? 0; },

    get resolvedFormat() {
      if (this.shape === 'circle') return 'image/png';
      if (this.outputFormat !== 'auto') return this.outputFormat;
      if (this.origMime === 'image/gif') return 'image/jpeg';
      return this.origMime || 'image/jpeg';
    },

    // crop box dimensions converted to natural image pixels
    get cropNatW() {
      if (!this.dispW) return 0;
      return Math.round(this.box.w * (this.origW / this.dispW));
    },
    get cropNatH() {
      if (!this.dispH) return 0;
      return Math.round(this.box.h * (this.origH / this.dispH));
    },

    /* ── init ─────────────────────────────────────────────── */
    init() {},

    /* ── file loading ─────────────────────────────────────── */
    onFileChange(e) {
      const f = e.target.files[0];
      if (f) this.loadFile(f);
      e.target.value = '';
    },
    onDrop(e) {
      this.isDragging = false;
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) this.loadFile(f);
    },
    loadFile(file) {
      this.outputBlob = null; this.outputUrl = null;
      this.fileName = file.name;
      this.origFileSize = file.size;
      this.origMime = file.type;
      const reader = new FileReader();
      reader.onload = e => { this.srcUrl = e.target.result; };
      reader.readAsDataURL(file);
    },

    onImageLoad() {
      const img = this.$refs.cropImg;
      this.origW = img.naturalWidth;
      this.origH = img.naturalHeight;
      this.$nextTick(() => {
        this._refreshDisplaySize();
        this.initBox();
        // re-init box on container resize (e.g. mobile rotation)
        if (this._ro) this._ro.disconnect();
        this._ro = new ResizeObserver(() => {
          this._refreshDisplaySize();
          this.initBox();
        });
        if (this.$refs.cropArea) this._ro.observe(this.$refs.cropArea);
      });
    },

    _refreshDisplaySize() {
      const img = this.$refs.cropImg;
      if (!img) return;
      this.dispW = img.offsetWidth;
      this.dispH = img.offsetHeight;
    },

    resetImage() {
      if (this._ro) { this._ro.disconnect(); this._ro = null; }
      this.srcUrl = null; this.outputBlob = null; this.outputUrl = null;
      this.origW = this.origH = this.dispW = this.dispH = 0;
      this.fileName = '';
    },

    /* ── shape selection ──────────────────────────────────── */
    setShape(s) {
      this.shape = s;
      // auto-switch format for circle
      if (s === 'circle') this.outputFormat = 'auto';
      if (this.srcUrl) this.initBox();
    },

    /* ── initialise crop box ──────────────────────────────── */
    initBox() {
      const cw = this.dispW, ch = this.dispH;
      if (!cw || !ch) return;
      const r = this.ratio;
      const maxFrac = 0.82; // use 82% of the display
      let w, h;

      if (!r) {
        w = Math.round(cw * maxFrac);
        h = Math.round(ch * maxFrac);
      } else {
        const mw = cw * maxFrac, mh = ch * maxFrac;
        if (mw / r <= mh) { w = mw; h = mw / r; }
        else              { h = mh; w = mh * r;  }
      }

      // clamp
      w = Math.min(Math.max(MIN_BOX, Math.round(w)), cw);
      h = Math.min(Math.max(MIN_BOX, Math.round(h)), ch);

      this.box = {
        x: Math.round((cw - w) / 2),
        y: Math.round((ch - h) / 2),
        w, h,
      };
    },

    /* ── move (drag box interior) ─────────────────────────── */
    startMove(e) {
      const p0   = this._getXY(e);
      const box0 = { ...this.box };
      let   active = true;

      const onMove = ev => {
        if (!active) return;
        const p = this._getXY(ev);
        this.box.x = Math.max(0, Math.min(this.dispW - box0.w, box0.x + p.x - p0.x));
        this.box.y = Math.max(0, Math.min(this.dispH - box0.h, box0.y + p.y - p0.y));
      };
      const onUp = () => {
        active = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };
      document.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onUp);
    },

    /* ── resize (corner/edge handles) ────────────────────── */
    startResize(handle, e) {
      const p0   = this._getXY(e);
      const box0 = { ...this.box };
      const r    = this.ratio;
      let   active = true;

      const onMove = ev => {
        if (!active) return;
        const p  = this._getXY(ev);
        const dx = p.x - p0.x;
        const dy = p.y - p0.y;
        let { x, y, w, h } = box0;

        // --- corner handles (all modes) ---
        if (handle === 'br') {
          w = Math.max(MIN_BOX, box0.w + dx);
          h = r ? w / r : Math.max(MIN_BOX, box0.h + dy);
        } else if (handle === 'bl') {
          w = Math.max(MIN_BOX, box0.w - dx);
          h = r ? w / r : Math.max(MIN_BOX, box0.h + dy);
          x = box0.x + box0.w - w;
        } else if (handle === 'tr') {
          w = Math.max(MIN_BOX, box0.w + dx);
          h = r ? w / r : Math.max(MIN_BOX, box0.h - dy);
          y = box0.y + box0.h - h;
        } else if (handle === 'tl') {
          w = Math.max(MIN_BOX, box0.w - dx);
          h = r ? w / r : Math.max(MIN_BOX, box0.h - dy);
          x = box0.x + box0.w - w;
          y = box0.y + box0.h - h;

        // --- edge handles (free mode only) ---
        } else if (handle === 'tc') {
          h = Math.max(MIN_BOX, box0.h - dy);
          y = box0.y + box0.h - h;
        } else if (handle === 'bc') {
          h = Math.max(MIN_BOX, box0.h + dy);
        } else if (handle === 'ml') {
          w = Math.max(MIN_BOX, box0.w - dx);
          x = box0.x + box0.w - w;
        } else if (handle === 'mr') {
          w = Math.max(MIN_BOX, box0.w + dx);
        }

        // clamp to image bounds
        x = Math.max(0, x);
        y = Math.max(0, y);
        w = Math.min(w, this.dispW - x);
        h = Math.min(h, this.dispH - y);

        this.box = {
          x: Math.round(x), y: Math.round(y),
          w: Math.round(w), h: Math.round(h),
        };
      };

      const onUp = () => {
        active = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
      };
      document.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onUp);
    },

    /* ── crop operation ───────────────────────────────────── */
    doCrop() {
      if (!this.srcUrl || this.processing) return;
      this.processing = true;
      this.outputBlob = null;
      this.outputUrl  = null;

      // scale from display to natural coordinates
      const scaleX = this.origW / this.dispW;
      const scaleY = this.origH / this.dispH;
      const sx = Math.round(this.box.x * scaleX);
      const sy = Math.round(this.box.y * scaleY);
      const sw = Math.round(this.box.w * scaleX);
      const sh = Math.round(this.box.h * scaleY);

      const canvas = document.createElement('canvas');
      canvas.width  = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');

      if (this.shape === 'circle') {
        // circular clip path
        const r = Math.min(sw, sh) / 2;
        ctx.beginPath();
        ctx.arc(sw / 2, sh / 2, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }

      // white fill for JPEG (opaque bg)
      if (this.resolvedFormat === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sw, sh);
      }

      ctx.imageSmoothingEnabled  = true;
      ctx.imageSmoothingQuality  = 'high';

      const img = this.$refs.cropImg;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const qual = this.resolvedFormat === 'image/png' ? undefined : this.quality / 100;
      canvas.toBlob(blob => {
        this.processing = false;
        if (!blob) { showToast('Crop failed — try a different format.'); return; }
        this.outputBlob = blob;
        this.outputUrl  = URL.createObjectURL(blob);
        this.croppedW   = sw;
        this.croppedH   = sh;
        this.$nextTick(() => {
          const el = document.querySelector('.output-preview-wrap');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }, this.resolvedFormat, qual);
    },

    /* ── download ─────────────────────────────────────────── */
    download() {
      if (!this.outputBlob) return;
      const ext  = this.resolvedFormat.split('/')[1].replace('jpeg', 'jpg');
      const base = this.fileName.replace(/\.[^.]+$/, '');
      const tag  = this.shape.replace(':', 'x');
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(this.outputBlob);
      a.download = `${base}-${tag}-${this.croppedW}x${this.croppedH}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    /* ── helpers ──────────────────────────────────────────── */
    _getXY(e) {
      if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    },

    formatBytes(b) {
      if (!b) return '—';
      if (b < 1024)     return b + ' B';
      if (b < 1048576)  return (b / 1024).toFixed(1) + ' KB';
      return (b / 1048576).toFixed(2) + ' MB';
    },
  };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}
