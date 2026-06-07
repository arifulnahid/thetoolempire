const PRESETS = [
  {
    label: 'Social — Instagram',
    items: [
      { label: 'Square Post',    w: 1080, h: 1080 },
      { label: 'Portrait Post',  w: 1080, h: 1350 },
      { label: 'Landscape Post', w: 1080, h: 566  },
      { label: 'Story / Reel',   w: 1080, h: 1920 },
      { label: 'Profile Photo',  w: 320,  h: 320  },
    ],
  },
  {
    label: 'Social — Twitter / X',
    items: [
      { label: 'Post Image',     w: 1600, h: 900  },
      { label: 'Header Banner',  w: 1500, h: 500  },
      { label: 'Profile Photo',  w: 400,  h: 400  },
    ],
  },
  {
    label: 'Social — Facebook',
    items: [
      { label: 'Cover Photo',    w: 1640, h: 624  },
      { label: 'Post Image',     w: 1200, h: 630  },
      { label: 'Profile Photo',  w: 180,  h: 180  },
      { label: 'Event Cover',    w: 1920, h: 1080 },
    ],
  },
  {
    label: 'Social — LinkedIn',
    items: [
      { label: 'Banner',         w: 1584, h: 396  },
      { label: 'Post Image',     w: 1200, h: 627  },
      { label: 'Profile Photo',  w: 400,  h: 400  },
    ],
  },
  {
    label: 'YouTube',
    items: [
      { label: 'Thumbnail',      w: 1280, h: 720  },
      { label: 'Channel Art',    w: 2560, h: 1440 },
      { label: 'Profile Photo',  w: 800,  h: 800  },
    ],
  },
  {
    label: 'Web & OG',
    items: [
      { label: 'OG Share Image', w: 1200, h: 630  },
      { label: 'Full HD',        w: 1920, h: 1080 },
      { label: 'HD',             w: 1280, h: 720  },
      { label: 'SVGA',           w: 800,  h: 600  },
      { label: 'XGA',            w: 1024, h: 768  },
    ],
  },
  {
    label: 'Thumbnails',
    items: [
      { label: 'Large',          w: 400,  h: 400  },
      { label: 'Medium',         w: 300,  h: 300  },
      { label: 'Small',          w: 150,  h: 150  },
      { label: 'Tiny',           w: 100,  h: 100  },
    ],
  },
];

function imageResizer() {
  return {
    // image state
    srcUrl: null,
    fileName: '',
    origW: 0,
    origH: 0,
    origFileSize: 0,
    origMime: '',

    // mode: 'px' | 'pct' | 'fit' | 'pre'
    mode: 'px',

    // pixels mode
    pxW: 0,
    pxH: 0,
    lockAspect: true,

    // percentage mode
    pct: 100,

    // fit-within mode
    fitW: 1920,
    fitH: 1080,

    // presets
    presets: PRESETS,
    activePreset: '',

    // output
    outputFormat: 'auto',
    quality: 85,
    outputBlob: null,
    outputUrl: null,

    // ui
    isDragging: false,
    processing: false,
    sliderPos: 50,

    /* ─── computed ─────────────────────────────────────── */
    get outW() {
      if (!this.origW) return 0;
      const d = this._calcDims();
      return d.w;
    },
    get outH() {
      if (!this.origH) return 0;
      const d = this._calcDims();
      return d.h;
    },
    get resolvedFormat() {
      if (this.outputFormat !== 'auto') return this.outputFormat;
      if (this.origMime === 'image/gif') return 'image/jpeg';
      return this.origMime || 'image/jpeg';
    },

    /* ─── init ─────────────────────────────────────────── */
    init() {},

    /* ─── file loading ─────────────────────────────────── */
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
      this.outputBlob = null;
      this.outputUrl = null;
      this.activePreset = '';
      this.fileName = file.name;
      this.origFileSize = file.size;
      this.origMime = file.type;
      this.sliderPos = 50;

      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          this.origW = img.naturalWidth;
          this.origH = img.naturalHeight;
          this.pxW   = img.naturalWidth;
          this.pxH   = img.naturalHeight;
          this.srcUrl = e.target.result;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    resetImage() {
      this.srcUrl     = null;
      this.outputBlob = null;
      this.outputUrl  = null;
      this.origW = this.origH = 0;
      this.fileName   = '';
    },

    /* ─── mode switching ───────────────────────────────── */
    onModeChange() {
      this.activePreset = '';
      this.pct = 100;
      this.pxW = this.origW;
      this.pxH = this.origH;
    },

    /* ─── dimension inputs ─────────────────────────────── */
    onWidthInput() {
      if (this.lockAspect && this.origW && this.pxW) {
        this.pxH = Math.round(this.pxW * (this.origH / this.origW));
      }
    },
    onHeightInput() {
      if (this.lockAspect && this.origH && this.pxH) {
        this.pxW = Math.round(this.pxH * (this.origW / this.origH));
      }
    },
    onPctInput() {
      // outW/outH are computed from pct via _calcDims
    },
    onFitInput() {
      // outW/outH computed from fitW/fitH
    },

    /* ─── presets ──────────────────────────────────────── */
    applyPreset(p) {
      this.activePreset = p.label;
      this.pxW = p.w;
      this.pxH = p.h;
      this.lockAspect = false; // presets define their own ratio
    },

    /* ─── dimension calc ───────────────────────────────── */
    _calcDims() {
      if (!this.origW || !this.origH) return { w: 0, h: 0 };

      if (this.mode === 'pct') {
        return {
          w: Math.max(1, Math.round(this.origW * this.pct / 100)),
          h: Math.max(1, Math.round(this.origH * this.pct / 100)),
        };
      }
      if (this.mode === 'fit') {
        const mw = parseInt(this.fitW) || this.origW;
        const mh = parseInt(this.fitH) || this.origH;
        const scale = Math.min(1, mw / this.origW, mh / this.origH);
        return {
          w: Math.max(1, Math.round(this.origW * scale)),
          h: Math.max(1, Math.round(this.origH * scale)),
        };
      }
      // px mode (also used for presets via pxW/pxH)
      return {
        w: Math.max(1, parseInt(this.pxW) || this.origW),
        h: Math.max(1, parseInt(this.pxH) || this.origH),
      };
    },

    /* ─── resize ───────────────────────────────────────── */
    doResize() {
      if (!this.srcUrl || this.processing) return;
      this.processing = true;
      this.outputBlob = null;
      this.outputUrl  = null;

      const { w, h } = this._calcDims();
      const fmt   = this.resolvedFormat;
      const qual  = fmt === 'image/png' ? undefined : this.quality / 100;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');

        // white fill for JPEG conversion (handles transparent PNGs)
        if (fmt === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }

        // use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(blob => {
          this.processing = false;
          if (!blob) { showToast('Resize failed — try a different format.'); return; }
          this.outputBlob = blob;
          this.outputUrl  = URL.createObjectURL(blob);
          this.sliderPos  = 50;
        }, fmt, qual);
      };
      img.onerror = () => { this.processing = false; showToast('Could not load image.'); };
      img.src = this.srcUrl;
    },

    updateOutput() {
      if (this.outputBlob) this.doResize(); // re-render with new format/quality
    },

    /* ─── download ─────────────────────────────────────── */
    download() {
      if (!this.outputBlob) return;
      const ext  = this.resolvedFormat.split('/')[1].replace('jpeg','jpg');
      const base = this.fileName.replace(/\.[^.]+$/, '');
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(this.outputBlob);
      a.download = `${base}-${this.outW}x${this.outH}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },

    /* ─── compare slider ───────────────────────────────── */
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
      const rect   = wrap.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      this.sliderPos = Math.min(100, Math.max(0,
        Math.round(((clientX - rect.left) / rect.width) * 1000) / 10
      ));
    },

    /* ─── helpers ──────────────────────────────────────── */
    formatBytes(b) {
      if (!b) return '—';
      if (b < 1024) return b + ' B';
      if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
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
