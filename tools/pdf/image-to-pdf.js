/* Image to PDF — jsPDF renders images into a multi-page PDF client-side.
   Raw File objects stored outside Alpine's reactive proxy. */

const _imgRaw = {};

/* Page size dimensions in mm [portrait-width, portrait-height] */
const PAGE_SIZES = {
  a4:     [210, 297],
  letter: [215.9, 279.4],
  legal:  [215.9, 355.6],
  a3:     [297, 420],
  a5:     [148, 210],
};

function imageToPdfApp() {
  return {
    images:      [],
    isDragOver:  false,
    generating:  false,
    pageSize:    'a4',
    orientation: 'portrait',
    margin:      10,
    imageFit:    'fit',       // fit | fill | center
    pdfName:     'images.pdf',
    nextId:      1,

    /* ── file intake ──────────────────────── */
    onFileInput(e) {
      Array.from(e.target.files).forEach(f => this._addImage(f));
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      Array.from(e.dataTransfer.files).forEach(f => this._addImage(f));
    },

    _isImage(file) {
      return /^image\/(jpeg|jpg|png|gif|webp|bmp|tiff|svg\+xml)$/i.test(file.type) ||
             /\.(jpe?g|png|gif|webp|bmp|tiff?|svg)$/i.test(file.name);
    },

    async _addImage(file) {
      if (!this._isImage(file)) return;
      const id = this.nextId++;
      _imgRaw[id] = file;

      /* Load data URL + natural dimensions */
      const dataUrl = await this._fileToDataUrl(file);
      const dims    = await this._getImageDims(dataUrl);

      this.images.push({
        id,
        name:   file.name,
        size:   file.size,
        dataUrl,
        natW:   dims.w,
        natH:   dims.h,
      });
    },

    removeImage(id) {
      this.images = this.images.filter(img => img.id !== id);
      delete _imgRaw[id];
    },

    clearAll() {
      this.images.forEach(img => delete _imgRaw[img.id]);
      this.images = [];
    },

    moveUp(index) {
      if (index <= 0) return;
      [this.images[index - 1], this.images[index]] = [this.images[index], this.images[index - 1]];
      this.images = [...this.images];
    },

    moveDown(index) {
      if (index >= this.images.length - 1) return;
      [this.images[index], this.images[index + 1]] = [this.images[index + 1], this.images[index]];
      this.images = [...this.images];
    },

    /* ── PDF generation ───────────────────── */
    async generatePdf() {
      if (!this.images.length || this.generating) return;
      if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
        this.showToast('jsPDF library not loaded — please refresh');
        return;
      }
      this.generating = true;

      try {
        const { jsPDF } = window.jspdf;
        let doc = null;

        for (let i = 0; i < this.images.length; i++) {
          const img   = this.images[i];
          const pSize = this._getPageDimsMm(img);
          const [pw, ph] = pSize;

          if (i === 0) {
            doc = new jsPDF({ orientation: this.orientation, unit: 'mm', format: [pw, ph] });
          } else {
            doc.addPage([pw, ph], this.orientation);
          }

          const margin = +this.margin;
          const areaW  = pw - margin * 2;
          const areaH  = ph - margin * 2;
          const [x, y, w, h] = this._fitImage(img.natW, img.natH, areaW, areaH, margin);

          const fmt = this._jsPdfFormat(img.name, img.dataUrl);
          doc.addImage(img.dataUrl, fmt, x, y, w, h, undefined, 'FAST');
        }

        const name = this.pdfName.trim() || 'images';
        doc.save(name.endsWith('.pdf') ? name : name + '.pdf');
        this.showToast('PDF downloaded!');
      } catch (err) {
        this.showToast('Error: ' + (err.message || 'PDF generation failed'));
      }

      this.generating = false;
    },

    /* Compute image position/size on the page in mm */
    _fitImage(natW, natH, areaW, areaH, margin) {
      if (this.imageFit === 'fill') {
        /* Stretch to fill entire area */
        return [margin, margin, areaW, areaH];
      }
      if (this.imageFit === 'center') {
        /* Place at 96 px/inch equivalent, centered */
        const scale   = 25.4 / 96; /* px → mm at 96 dpi */
        const imgWmm  = natW * scale;
        const imgHmm  = natH * scale;
        const x = margin + (areaW - imgWmm) / 2;
        const y = margin + (areaH - imgHmm) / 2;
        return [x, y, imgWmm, imgHmm];
      }
      /* Default: fit — scale to fit within area, preserve aspect ratio */
      const ratio = Math.min(areaW / natW, areaH / natH);
      const w = natW * ratio;
      const h = natH * ratio;
      const x = margin + (areaW - w) / 2;
      const y = margin + (areaH - h) / 2;
      return [x, y, w, h];
    },

    /* Resolve page dimensions in mm considering pageSize + orientation */
    _getPageDimsMm(img) {
      if (this.pageSize === 'auto') {
        /* Make the page exactly fit the image at 96 dpi */
        const scale = 25.4 / 96;
        const w = img.natW * scale;
        const h = img.natH * scale;
        return this.orientation === 'landscape' ? [Math.max(w,h), Math.min(w,h)] : [Math.min(w,h), Math.max(w,h)];
      }
      const base = PAGE_SIZES[this.pageSize] || PAGE_SIZES.a4;
      return this.orientation === 'landscape' ? [base[1], base[0]] : [base[0], base[1]];
    },

    _jsPdfFormat(name, dataUrl) {
      if (/\.png$/i.test(name) || dataUrl.startsWith('data:image/png')) return 'PNG';
      if (/\.(gif)$/i.test(name) || dataUrl.startsWith('data:image/gif')) return 'GIF';
      if (/\.(webp)$/i.test(name) || dataUrl.startsWith('data:image/webp')) return 'WEBP';
      return 'JPEG';
    },

    /* ── helpers ──────────────────────────── */
    _fileToDataUrl(file) {
      return new Promise((res, rej) => {
        const r  = new FileReader();
        r.onload  = e => res(e.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
    },

    _getImageDims(dataUrl) {
      return new Promise(res => {
        const img   = new Image();
        img.onload  = () => res({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => res({ w: 800, h: 600 });
        img.src     = dataUrl;
      });
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
