/* Instagram Grid Splitter
   _img lives outside Alpine proxy — Image objects must not be proxied. */

let _img = null;

const IG_PRESETS = [
  { label: '3 × 1', cols: 3, rows: 1, desc: '3 posts — banner row' },
  { label: '3 × 2', cols: 3, rows: 2, desc: '6 posts' },
  { label: '3 × 3', cols: 3, rows: 3, desc: '9 posts — classic' },
  { label: '3 × 4', cols: 3, rows: 4, desc: '12 posts' },
  { label: '3 × 6', cols: 3, rows: 6, desc: '18 posts' },
];

function igGridSplitterApp() {
  return {
    stage:        'upload',   /* upload | ready */
    fileName:     '',
    naturalW:     0,
    naturalH:     0,
    cols:         3,
    rows:         3,
    outputFormat: 'png',      /* png | jpg */
    tiles:        [],
    isDragOver:   false,
    splitting:    false,
    downloading:  false,
    error:        '',
    activeTab:    'preview',  /* preview | guide | profile */

    presets: IG_PRESETS,

    /* ── computed ── */
    get totalTiles() { return this.cols * this.rows; },
    get tileW() { return this.naturalW ? Math.floor(this.naturalW / this.cols) : 0; },
    get tileH() { return this.naturalH ? Math.floor(this.naturalH / this.rows) : 0; },
    get dimLabel() {
      if (!this.tileW) return '';
      return `${this.tileW} × ${this.tileH} px per tile`;
    },
    get qualityHint() {
      if (!this.tileW) return '';
      const minDim = Math.min(this.tileW, this.tileH);
      if (minDim < 800) return `⚠ Tiles are ${minDim}px — for best Instagram quality use a source image ≥ ${this.cols * 1080}×${this.rows * 1080} px`;
      return '';
    },
    get sortedByPost() {
      return [...this.tiles].sort((a, b) => a.postNum - b.postNum);
    },
    /* Tiles arranged in reading order for the profile preview */
    get tilesForProfile() {
      return [...this.tiles].sort((a, b) => a.readingNum - b.readingNum);
    },

    /* ── init ── */
    init() {
      this.$watch('cols',         () => { if (_img) this._update(); });
      this.$watch('rows',         () => { if (_img) this._update(); });
      this.$watch('outputFormat', () => { if (_img) this._update(); });
    },

    setPreset(p) { this.cols = p.cols; this.rows = p.rows; },
    isActivePreset(p) { return this.cols === p.cols && this.rows === p.rows; },

    /* ── file intake ── */
    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files).find(x => /^image\//i.test(x.type));
      if (f) this._loadFile(f);
      else   this.error = 'Please drop an image file (JPG, PNG, WebP, etc.)';
    },
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._loadFile(f);
      e.target.value = '';
    },
    _loadFile(file) {
      this.error = '';
      this.fileName = file.name;
      const url = URL.createObjectURL(file);
      _img = new Image();
      _img.onload = () => {
        this.naturalW = _img.naturalWidth;
        this.naturalH = _img.naturalHeight;
        URL.revokeObjectURL(url);
        this.tiles = [];
        this.stage = 'ready';
        this.$nextTick(() => this._update());
      };
      _img.onerror = () => {
        this.error = 'Could not read this image file.';
        _img = null;
        URL.revokeObjectURL(url);
      };
      _img.src = url;
    },

    _update() {
      this.splitting = true;
      /* Use setTimeout to let Alpine flush the splitting=true state before heavy work */
      setTimeout(() => {
        this._drawPreview();
        this._splitTiles();
        this.splitting = false;
      }, 20);
    },

    /* Draw source image + grid lines + reading-order numbers onto the preview canvas */
    _drawPreview() {
      const canvas = this.$refs.previewCanvas;
      if (!canvas || !_img) return;
      const W = _img.naturalWidth, H = _img.naturalHeight;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(_img, 0, 0);

      const tW = Math.floor(W / this.cols);
      const tH = Math.floor(H / this.rows);

      /* Grid lines */
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth   = Math.max(3, W / 500);
      for (let c = 1; c < this.cols; c++) {
        ctx.beginPath(); ctx.moveTo(c * tW, 0); ctx.lineTo(c * tW, H); ctx.stroke();
      }
      for (let r = 1; r < this.rows; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * tH); ctx.lineTo(W, r * tH); ctx.stroke();
      }

      /* Reading-order number badges */
      const fs = Math.max(18, Math.min(tW, tH) * 0.16);
      ctx.font = `900 ${fs}px system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const num = r * this.cols + c + 1;
          const x = c * tW + tW / 2;
          const y = r * tH + tH / 2;
          const pad = fs * 0.35;
          const bw = fs * 1.5 + pad * 2, bh = fs + pad * 2;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(num, x, y);
        }
      }
    },

    /* Slice the image into individual tile canvases and store data URLs */
    _splitTiles() {
      if (!_img) return;
      const W = _img.naturalWidth, H = _img.naturalHeight;
      const tW = Math.floor(W / this.cols);
      const tH = Math.floor(H / this.rows);
      const fmt = this.outputFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const q   = this.outputFormat === 'jpg' ? 0.92 : 1;

      const tiles = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cv = document.createElement('canvas');
          cv.width = tW; cv.height = tH;
          cv.getContext('2d').drawImage(_img, c * tW, r * tH, tW, tH, 0, 0, tW, tH);
          tiles.push({ readingNum: r * this.cols + c + 1, row: r, col: c, postNum: 0, dataUrl: cv.toDataURL(fmt, q) });
        }
      }

      /* Posting order: bottom-to-top rows, right-to-left within each row.
         This makes the top-left tile the LAST post so it appears top-left
         (most-recent) on the Instagram profile grid. */
      let pn = 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        for (let c = this.cols - 1; c >= 0; c--) {
          tiles[r * this.cols + c].postNum = pn++;
        }
      }

      this.tiles = tiles;
    },

    /* ── download ── */
    downloadTile(tile) {
      const ext = this.outputFormat === 'jpg' ? 'jpg' : 'png';
      const a   = Object.assign(document.createElement('a'), {
        href:     tile.dataUrl,
        download: `post-${String(tile.postNum).padStart(2, '0')}.${ext}`,
      });
      a.click();
    },

    async downloadAll() {
      if (!this.tiles.length || this.downloading) return;
      if (typeof JSZip === 'undefined') { this.error = 'ZIP library failed to load — please refresh.'; return; }
      this.downloading = true;
      try {
        const zip = new JSZip();
        const ext = this.outputFormat === 'jpg' ? 'jpg' : 'png';
        const base = this.fileName.replace(/\.[^.]+$/, '');
        for (const tile of this.sortedByPost) {
          const b64 = tile.dataUrl.split(',')[1];
          zip.file(`${base}-post-${String(tile.postNum).padStart(2, '0')}.${ext}`, b64, { base64: true });
        }
        const blob = await zip.generateAsync({ type: 'blob' });
        const a    = Object.assign(document.createElement('a'), {
          href:     URL.createObjectURL(blob),
          download: `${base}-ig-grid.zip`,
        });
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) { this.error = 'ZIP generation failed: ' + (e?.message || ''); }
      this.downloading = false;
    },

    reset() {
      _img          = null;
      this.stage    = 'upload';
      this.fileName = '';
      this.naturalW = 0; this.naturalH = 0;
      this.tiles    = [];
      this.cols     = 3; this.rows = 3;
      this.error    = '';
      this.activeTab = 'preview';
    },
  };
}
