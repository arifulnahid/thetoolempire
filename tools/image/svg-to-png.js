function svgToPngApp() {
  return {
    // Files list
    files: [],       // [{ id, name, svgCode, naturalW, naturalH, valid, error, pngUrl, converting }]
    activeId: null,
    isDragOver: false,
    allConverting: false,

    // Settings
    scaleMode: 'multiplier', // 'multiplier' | 'custom'
    scale: 2,
    customW: '',
    customH: '',
    lockRatio: true,
    bgMode: 'transparent',
    bgColor: '#ffffff',

    // Code-paste panel
    showCodePanel: false,
    pastedCode: '',
    pastedName: 'custom.svg',

    // ── Init ──────────────────────────────────────────────────────
    init() {},

    // ── Computed ──────────────────────────────────────────────────
    get activeFile() {
      return this.files.find(f => f.id === this.activeId) || this.files[0] || null;
    },

    get outputW() {
      const f = this.activeFile;
      if (!f) return 0;
      if (this.scaleMode === 'multiplier') return Math.round(f.naturalW * this.scale);
      return parseInt(this.customW) || f.naturalW;
    },

    get outputH() {
      const f = this.activeFile;
      if (!f) return 0;
      if (this.scaleMode === 'multiplier') return Math.round(f.naturalH * this.scale);
      return parseInt(this.customH) || f.naturalH;
    },

    get convertedCount() {
      return this.files.filter(f => f.pngUrl).length;
    },

    // ── File input ────────────────────────────────────────────────
    onFileInput(e) {
      Array.from(e.target.files).forEach(f => {
        if (f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg')) {
          this.readFile(f);
        }
      });
    },

    onDrop(e) {
      this.isDragOver = false;
      Array.from(e.dataTransfer.files).forEach(f => {
        if (f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg')) {
          this.readFile(f);
        }
      });
    },

    readFile(file) {
      const reader = new FileReader();
      reader.onload = e => this.addSvg(file.name, e.target.result);
      reader.readAsText(file);
    },

    addSvg(name, svgCode) {
      const { w, h, valid, error } = this.parseDims(svgCode);
      const id = Date.now() + Math.random();
      this.files.push({ id, name, svgCode, naturalW: w, naturalH: h, valid, error, pngUrl: null, converting: false });
      if (!this.activeId) this.activeId = id;
    },

    // Add from pasted code
    addFromCode() {
      const code = this.pastedCode.trim();
      if (!code) return;
      const name = this.pastedName.trim() || 'custom.svg';
      this.addSvg(name.endsWith('.svg') ? name : name + '.svg', code);
      this.pastedCode = '';
      this.showCodePanel = false;
      this.showToast('SVG added!');
    },

    removeFile(id) {
      const f = this.files.find(f => f.id === id);
      if (f && f.pngUrl) URL.revokeObjectURL(f.pngUrl);
      this.files = this.files.filter(f => f.id !== id);
      if (this.activeId === id) this.activeId = this.files[0]?.id || null;
    },

    clearAll() {
      this.files.forEach(f => { if (f.pngUrl) URL.revokeObjectURL(f.pngUrl); });
      this.files = [];
      this.activeId = null;
    },

    // ── Dimension parsing ─────────────────────────────────────────
    parseDims(svgCode) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgCode, 'image/svg+xml');
        if (doc.querySelector('parsererror')) return { w: 300, h: 300, valid: false, error: 'Invalid SVG markup' };
        const svg = doc.querySelector('svg');
        if (!svg) return { w: 300, h: 300, valid: false, error: 'No <svg> element found' };

        let w = 0, h = 0;

        // viewBox is most reliable
        const vb = svg.getAttribute('viewBox');
        if (vb) {
          const p = vb.trim().split(/[\s,]+/).map(Number);
          if (p.length >= 4 && !p.some(isNaN)) { w = p[2]; h = p[3]; }
        }

        // width/height attributes (skip percentage)
        const wa = svg.getAttribute('width');
        const ha = svg.getAttribute('height');
        if (wa && !wa.includes('%')) { const v = parseFloat(wa); if (!isNaN(v) && v > 0) w = v; }
        if (ha && !ha.includes('%')) { const v = parseFloat(ha); if (!isNaN(v) && v > 0) h = v; }

        if (!w || !h) { w = w || 300; h = h || 300; }
        return { w: Math.round(w) || 300, h: Math.round(h) || 300, valid: true, error: null };
      } catch (_) {
        return { w: 300, h: 300, valid: false, error: 'Could not parse SVG' };
      }
    },

    // ── Custom width/height input ─────────────────────────────────
    onCustomW() {
      if (!this.lockRatio || !this.activeFile) return;
      const f = this.activeFile;
      const w = parseInt(this.customW);
      if (w > 0 && f.naturalW > 0) {
        this.customH = String(Math.round(w * f.naturalH / f.naturalW));
      }
    },

    onCustomH() {
      if (!this.lockRatio || !this.activeFile) return;
      const f = this.activeFile;
      const h = parseInt(this.customH);
      if (h > 0 && f.naturalH > 0) {
        this.customW = String(Math.round(h * f.naturalW / f.naturalH));
      }
    },

    // ── Conversion ────────────────────────────────────────────────
    getTargetDims(file) {
      let w, h;
      if (this.scaleMode === 'multiplier') {
        w = Math.round(file.naturalW * this.scale);
        h = Math.round(file.naturalH * this.scale);
      } else {
        w = parseInt(this.customW) || file.naturalW;
        h = parseInt(this.customH) || file.naturalH;
        if (this.lockRatio && w && file.naturalW) {
          h = Math.round(w * file.naturalH / file.naturalW);
        }
      }
      return { w: Math.max(1, w), h: Math.max(1, h) };
    },

    svgToPng(svgCode, w, h, bgMode, bgColor) {
      return new Promise((resolve, reject) => {
        // Ensure the SVG has explicit dimensions so the browser renders it at the right size
        const sized = this.injectDims(svgCode, w, h);
        const blob = new Blob([sized], { type: 'image/svg+xml;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const img  = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (bgMode === 'color') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, w, h);
          }
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
        img.src = url;
      });
    },

    injectDims(svgCode, w, h) {
      // Replace or add width/height on the root <svg> element
      return svgCode.replace(/<svg([^>]*)>/, (match, attrs) => {
        let a = attrs
          .replace(/\s+width\s*=\s*["'][^"']*["']/g, '')
          .replace(/\s+height\s*=\s*["'][^"']*["']/g, '');
        return `<svg${a} width="${w}" height="${h}">`;
      });
    },

    async convertActive() {
      const f = this.activeFile;
      if (!f) return;
      f.converting = true;
      try {
        const { w, h } = this.getTargetDims(f);
        f.pngUrl = await this.svgToPng(f.svgCode, w, h, this.bgMode, this.bgColor);
      } catch (err) {
        this.showToast('Conversion failed: ' + err.message);
      }
      f.converting = false;
    },

    downloadActive() {
      const f = this.activeFile;
      if (!f || !f.pngUrl) return;
      const { w, h } = this.getTargetDims(f);
      const base = f.name.replace(/\.svg$/i, '');
      this.triggerDownload(f.pngUrl, `${base}-${w}x${h}.png`);
    },

    async convertAndDownloadActive() {
      await this.convertActive();
      this.downloadActive();
    },

    async convertAll() {
      this.allConverting = true;
      for (const f of this.files) {
        if (f.pngUrl) continue;
        f.converting = true;
        try {
          const { w, h } = this.getTargetDims(f);
          f.pngUrl = await this.svgToPng(f.svgCode, w, h, this.bgMode, this.bgColor);
        } catch (_) {}
        f.converting = false;
      }
      this.allConverting = false;
    },

    async downloadAllZip() {
      if (typeof JSZip === 'undefined') { this.showToast('ZIP library not loaded'); return; }
      // Convert any unconverted files first
      await this.convertAll();

      const zip = new JSZip();
      const names = new Set();
      this.files.forEach(f => {
        if (!f.pngUrl) return;
        const { w, h } = this.getTargetDims(f);
        let base = f.name.replace(/\.svg$/i, '') + `-${w}x${h}.png`;
        // Deduplicate names
        let name = base, i = 1;
        while (names.has(name)) name = base.replace('.png', `-${i++}.png`);
        names.add(name);
        // Convert dataURL to binary
        const b64 = f.pngUrl.split(',')[1];
        zip.file(name, b64, { base64: true });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url  = URL.createObjectURL(blob);
      this.triggerDownload(url, 'svg-to-png.zip');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      this.showToast('ZIP downloaded!');
    },

    triggerDownload(url, name) {
      const a = document.createElement('a');
      a.href = url; a.download = name; a.click();
    },

    // ── Inline SVG preview ────────────────────────────────────────
    svgPreviewUrl(svgCode) {
      try {
        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
        return URL.createObjectURL(blob);
      } catch (_) { return ''; }
    },

    showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },

    toggleFaq(btn) {
      btn.closest('.faq-item').classList.toggle('open');
    },
  };
}
