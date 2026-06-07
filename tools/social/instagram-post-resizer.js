function instagramResizerApp() {
  return {
    image: null,
    imageName: 'instagram-post',
    isDragOver: false,
    _dragging: false,
    _dragSX: 0, _dragSY: 0,
    _dragOX: 0, _dragOY: 0,

    presets: [
      { id: 'square',    label: 'Square',        sub: 'Feed / Carousel', w: 1080, h: 1080, ratio: '1:1' },
      { id: 'portrait',  label: 'Portrait',       sub: 'Feed Post',       w: 1080, h: 1350, ratio: '4:5' },
      { id: 'landscape', label: 'Landscape',      sub: 'Feed Post',       w: 1080, h: 566,  ratio: '1.91:1' },
      { id: 'story',     label: 'Story / Reels',  sub: 'Full Screen',     w: 1080, h: 1920, ratio: '9:16' },
      { id: 'profile',   label: 'Profile Photo',  sub: 'Circle Crop',     w: 320,  h: 320,  ratio: '1:1' },
      { id: 'igtv',      label: 'IGTV Cover',     sub: 'Channel Cover',   w: 420,  h: 654,  ratio: '1:1.55' },
    ],
    selectedPreset: 'square',

    zoom: 1,
    zoomSlider: 100,
    _autoZoom: 1,
    offsetX: 0,
    offsetY: 0,
    bgColor: '#000000',
    bgMode: 'fill',
    quality: 92,
    format: 'jpeg',

    _img: null,
    _canvas: null,
    _ctx: null,

    init() {
      // canvas lives inside x-if="image" — not in the DOM yet. We grab it lazily in loadFile().
    },

    _initCanvas() {
      this._canvas = this.$refs.canvas;
      this._ctx = this._canvas.getContext('2d');
    },

    get preset() {
      return this.presets.find(p => p.id === this.selectedPreset);
    },

    drawEmpty() {
      if (!this._canvas) return;
      const p = this.preset;
      this._canvas.width = p.w;
      this._canvas.height = p.h;
      const ctx = this._ctx;
      ctx.fillStyle = '#18181f';
      ctx.fillRect(0, 0, p.w, p.h);
      ctx.fillStyle = '#333350';
      const s = Math.min(p.w, p.h) * 0.12;
      const cx = p.w / 2, cy = p.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s * 0.6);
      ctx.lineTo(cx + s, cy - s * 0.6);
      ctx.lineTo(cx + s * 0.7, cy + s * 0.6);
      ctx.lineTo(cx - s * 0.7, cy + s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - s * 0.15, cy - s * 0.05, s * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#18181f';
      ctx.fill();
      ctx.fillStyle = '#444465';
      ctx.font = `bold ${Math.min(p.w, p.h) * 0.045}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Drop or click to upload', cx, cy + s * 1.1);
    },

    onFileInput(event) {
      const file = event.target.files[0];
      if (file) this.loadFile(file);
    },

    onDrop(event) {
      this.isDragOver = false;
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.loadFile(file);
    },

    loadFile(file) {
      this.imageName = file.name.replace(/\.[^.]+$/, '');
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          this._img = img;
          this.image = e.target.result; // triggers x-if="image" to render the canvas template
          this.$nextTick(() => {
            this._initCanvas();          // now the canvas is in the DOM
            this.autoZoom();
            this.render();
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    autoZoom() {
      if (!this._img) return;
      const p = this.preset;
      const iw = this._img.naturalWidth, ih = this._img.naturalHeight;
      const fillZ = Math.max(p.w / iw, p.h / ih);
      const fitZ  = Math.min(p.w / iw, p.h / ih);
      this._autoZoom = this.bgMode === 'fill' ? fillZ : fitZ;
      this.zoom = this._autoZoom;
      this.zoomSlider = 100;
      this.offsetX = (p.w - iw * this.zoom) / 2;
      this.offsetY = (p.h - ih * this.zoom) / 2;
    },

    render() {
      if (!this._canvas) return;
      const p = this.preset;
      const ctx = this._ctx;
      this._canvas.width = p.w;
      this._canvas.height = p.h;

      ctx.fillStyle = this.bgColor;
      ctx.fillRect(0, 0, p.w, p.h);

      if (!this._img) { this.drawEmpty(); return; }

      if (this.selectedPreset === 'profile') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.w / 2, p.h / 2, p.w / 2, 0, Math.PI * 2);
        ctx.clip();
      }

      ctx.drawImage(
        this._img,
        this.offsetX, this.offsetY,
        this._img.naturalWidth * this.zoom,
        this._img.naturalHeight * this.zoom
      );

      if (this.selectedPreset === 'profile') ctx.restore();
    },

    pickPreset(id) {
      this.selectedPreset = id;
      if (this._img) {
        this.autoZoom();
        this.$nextTick(() => this.render());
      } else {
        this.$nextTick(() => this.drawEmpty());
      }
    },

    pickBgMode(mode) {
      this.bgMode = mode;
      if (this._img) { this.autoZoom(); this.render(); }
    },

    onZoomSlider() {
      if (!this._img || !this._autoZoom) return;
      const newZoom = this._autoZoom * (this.zoomSlider / 100);
      const p = this.preset;
      const cx = p.w / 2, cy = p.h / 2;
      this.offsetX = cx - (cx - this.offsetX) * newZoom / this.zoom;
      this.offsetY = cy - (cy - this.offsetY) * newZoom / this.zoom;
      this.zoom = newZoom;
      this.render();
    },

    onBgColor() { this.render(); },

    // ── Mouse drag ──────────────────────────────────────────────────
    mouseDown(e) {
      if (!this._img) return;
      this._dragging = true;
      const r = e.currentTarget.getBoundingClientRect();
      const sx = this._canvas.width / r.width;
      const sy = this._canvas.height / r.height;
      this._dragSX = e.clientX * sx;
      this._dragSY = e.clientY * sy;
      this._dragOX = this.offsetX;
      this._dragOY = this.offsetY;
      e.preventDefault();
    },

    mouseMove(e) {
      if (!this._dragging) return;
      const r = e.currentTarget.getBoundingClientRect();
      const sx = this._canvas.width / r.width;
      const sy = this._canvas.height / r.height;
      this.offsetX = this._dragOX + (e.clientX * sx - this._dragSX);
      this.offsetY = this._dragOY + (e.clientY * sy - this._dragSY);
      this.render();
    },

    mouseUp() { this._dragging = false; },

    // ── Touch drag ──────────────────────────────────────────────────
    touchStart(e) {
      if (!this._img) return;
      const t = e.touches[0];
      const r = e.currentTarget.getBoundingClientRect();
      const sx = this._canvas.width / r.width;
      const sy = this._canvas.height / r.height;
      this._dragSX = t.clientX * sx;
      this._dragSY = t.clientY * sy;
      this._dragOX = this.offsetX;
      this._dragOY = this.offsetY;
      this._dragging = true;
    },

    touchMove(e) {
      if (!this._dragging) return;
      const t = e.touches[0];
      const r = e.currentTarget.getBoundingClientRect();
      const sx = this._canvas.width / r.width;
      const sy = this._canvas.height / r.height;
      this.offsetX = this._dragOX + (t.clientX * sx - this._dragSX);
      this.offsetY = this._dragOY + (t.clientY * sy - this._dragSY);
      this.render();
      e.preventDefault();
    },

    touchEnd() { this._dragging = false; },

    // ── Download ────────────────────────────────────────────────────
    download() {
      if (!this._img) { this.showToast('Please upload an image first'); return; }
      this.render();
      const p = this.preset;
      const mime = this.format === 'png' ? 'image/png' : 'image/jpeg';
      const ext  = this.format === 'png' ? 'png' : 'jpg';
      const q    = this.format === 'png' ? undefined : this.quality / 100;
      const url  = this._canvas.toDataURL(mime, q);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${this.imageName}-ig-${p.id}-${p.w}x${p.h}.${ext}`;
      a.click();
      this.showToast('Image downloaded!');
    },

    showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },

    toggleFaq(btn) {
      btn.closest('.faq-item').classList.toggle('open');
    },
  };
}
