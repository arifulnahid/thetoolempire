/* QR Code Maker — main JS
   Uses qrcodejs (davidshimjs) via CDN: new QRCode(el, opts)
   CDN: https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js */

function qrApp() {
  return {
    // ── State ──────────────────────────────────────────────────
    activeTab: 'url',
    generated: false,
    generating: false,
    mobileMenuOpen: false,

    // Input fields per tab
    inputs: {
      url:   { value: 'https://thetoolempire.com' },
      text:  { value: '' },
      email: { to: '', subject: '', body: '' },
      phone: { number: '' },
      sms:   { number: '', message: '' },
      wifi:  { ssid: '', password: '', security: 'WPA', hidden: false },
      vcard: { name: '', phone: '', email: '', url: '', org: '' },
    },

    // QR style
    qrSize: 256,
    qrMargin: 10, // pixels of quiet zone
    fgColor: '#000000',
    bgColor: '#ffffff',
    errorLevel: 'M', // L M Q H

    // Card options — all optional
    cardTitle: '',
    cardDesc: '',
    cardBg: '#1e1e28',
    cardTextColor: '#e8e8f0',
    showBranding: true,
    logoDataUrl: null,
    logoFileName: '',

    // Report modal
    reportOpen: false,
    reportSelected: '',
    reportSent: false,

    // FAQ
    openFaq: null,

    // ── Init ───────────────────────────────────────────────────
    init() {
      window.addEventListener('scroll', () => {
        const h = document.querySelector('.site-header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
      });
      const q = new URLSearchParams(location.search).get('q');
      if (q) this.inputs.url.value = q;
    },

    // ── Build QR content string ────────────────────────────────
    buildContent() {
      const t = this.activeTab;
      const i = this.inputs;
      switch (t) {
        case 'url':
          return i.url.value.trim() || 'https://thetoolempire.com';
        case 'text':
          return i.text.value.trim() || 'Hello from The Tool Empire!';
        case 'email': {
          const qs = [];
          if (i.email.subject.trim()) qs.push('subject=' + encodeURIComponent(i.email.subject.trim()));
          if (i.email.body.trim())    qs.push('body='    + encodeURIComponent(i.email.body.trim()));
          const base = 'mailto:' + (i.email.to.trim() || 'example@email.com');
          return qs.length ? base + '?' + qs.join('&') : base;
        }
        case 'phone':
          return 'tel:' + (i.phone.number.trim() || '+10000000000');
        case 'sms':
          return i.sms.message.trim()
            ? 'smsto:' + i.sms.number.trim() + ':' + i.sms.message.trim()
            : 'sms:' + (i.sms.number.trim() || '+10000000000');
        case 'wifi':
          return 'WIFI:T:' + i.wifi.security + ';S:' + (i.wifi.ssid || 'MyNetwork')
               + ';P:' + i.wifi.password + ';H:' + (i.wifi.hidden ? 'true' : 'false') + ';;';
        case 'vcard':
          return ['BEGIN:VCARD','VERSION:3.0',
            'FN:' + (i.vcard.name || 'Name'),
            i.vcard.phone ? 'TEL:' + i.vcard.phone : '',
            i.vcard.email ? 'EMAIL:' + i.vcard.email : '',
            i.vcard.url   ? 'URL:' + i.vcard.url : '',
            i.vcard.org   ? 'ORG:' + i.vcard.org : '',
            'END:VCARD'
          ].filter(Boolean).join('\n');
        default:
          return 'https://thetoolempire.com';
      }
    },

    // ── Map our error level string to qrcodejs constant ────────
    _ecLevel() {
      const map = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M,
                    Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
      return map[this.errorLevel] ?? QRCode.CorrectLevel.M;
    },

    // ── Render QR into a temp div, copy to target canvas ───────
    _renderToCanvas(targetCanvas, content, size) {
      return new Promise((resolve, reject) => {
        try {
          // Create an offscreen div for qrcodejs to render into
          const div = document.createElement('div');
          div.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
          document.body.appendChild(div);

          const qr = new QRCode(div, {
            text:         content,
            width:        size,
            height:       size,
            colorDark:    this.fgColor,
            colorLight:   this.bgColor,
            correctLevel: this._ecLevel(),
          });

          // qrcodejs renders synchronously via canvas or image
          // Poll for the canvas child
          const tryGet = (attempts) => {
            const srcCanvas = div.querySelector('canvas');
            if (srcCanvas) {
              // Copy to target
              targetCanvas.width  = size;
              targetCanvas.height = size;
              const ctx = targetCanvas.getContext('2d');
              ctx.drawImage(srcCanvas, 0, 0, size, size);
              document.body.removeChild(div);
              resolve(ctx);
              return;
            }
            // Fallback: try img tag
            const img = div.querySelector('img');
            if (img && img.complete && img.naturalWidth > 0) {
              targetCanvas.width  = size;
              targetCanvas.height = size;
              const ctx = targetCanvas.getContext('2d');
              ctx.drawImage(img, 0, 0, size, size);
              document.body.removeChild(div);
              resolve(ctx);
              return;
            }
            if (attempts > 0) {
              setTimeout(() => tryGet(attempts - 1), 50);
            } else {
              document.body.removeChild(div);
              reject(new Error('QR render timeout'));
            }
          };

          setTimeout(() => tryGet(20), 60);
        } catch (err) {
          reject(err);
        }
      });
    },

    // ── Generate ───────────────────────────────────────────────
    async generate() {
      this.generating = true;
      this.generated  = false;
      await new Promise(r => setTimeout(r, 80));

      const content = this.buildContent();

      try {
        const mainCanvas = document.getElementById('qr-canvas');
        if (!mainCanvas) throw new Error('Main canvas not found');

        // 1. Render main QR
        await this._renderToCanvas(mainCanvas, content, this.qrSize);

        // 2. Overlay logo on main canvas if provided
        if (this.logoDataUrl) {
          await this._overlayLogo(mainCanvas, this.qrSize);
        }

        // 3. Mark generated — shows card section
        this.generated  = true;
        this.generating = false;

        // 4. Wait for DOM update so dc-qr-canvas becomes accessible
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        // 5. Render card canvas
        const cardCanvas = document.getElementById('dc-qr-canvas');
        if (cardCanvas) {
          await this._renderToCanvas(cardCanvas, content, 180);
          if (this.logoDataUrl) {
            await this._overlayLogo(cardCanvas, 180);
          }
        }

        this.showToast('QR code generated!', 'success');
      } catch (err) {
        this.generating = false;
        this.showToast('Generation failed: ' + (err.message || err), 'error');
        console.error('[QR]', err);
      }
    },

    // ── Overlay logo onto canvas center ───────────────────────
    _overlayLogo(canvas, qrSize) {
      return new Promise((resolve) => {
        const ctx    = canvas.getContext('2d');
        const logoSz = Math.round(qrSize * 0.22);
        const pad    = 5;
        const x      = (qrSize - logoSz) / 2;
        const y      = (qrSize - logoSz) / 2;
        const img    = new Image();
        img.onload = () => {
          // Rounded white background
          ctx.save();
          ctx.fillStyle = '#ffffff';
          const bx = x - pad, by = y - pad, bw = logoSz + pad * 2, bh = logoSz + pad * 2;
          const r = 6;
          ctx.beginPath();
          ctx.moveTo(bx + r, by);
          ctx.lineTo(bx + bw - r, by); ctx.arcTo(bx + bw, by,     bx + bw,     by + r,     r);
          ctx.lineTo(bx + bw,     by + bh - r); ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
          ctx.lineTo(bx + r,      by + bh); ctx.arcTo(bx, by + bh, bx,          by + bh - r, r);
          ctx.lineTo(bx,          by + r);  ctx.arcTo(bx, by,      bx + r,      by,          r);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          ctx.drawImage(img, x, y, logoSz, logoSz);
          resolve();
        };
        img.onerror = () => resolve(); // skip logo on error, don't break generation
        img.src = this.logoDataUrl;
      });
    },

    // ── Download main QR as PNG ───────────────────────────────
    downloadQR() {
      if (!this.generated) return;
      const canvas = document.getElementById('qr-canvas');
      if (!canvas) return;
      this._download(canvas.toDataURL('image/png'), 'qrcode.png');
      this.showToast('PNG downloaded!', 'success');
    },

    // ── Download QR as SVG ─────────────────────────────────────
    downloadSVG() {
      if (!this.generated) return;
      // Build SVG manually from the canvas pixel data
      const canvas = document.getElementById('qr-canvas');
      if (!canvas) return;
      const size   = canvas.width;
      const ctx    = canvas.getContext('2d');
      const pixels = ctx.getImageData(0, 0, size, size).data;
      const module = Math.max(1, Math.round(size / 29)); // approx module size
      let rects    = '';
      for (let y = 0; y < size; y += module) {
        for (let x = 0; x < size; x += module) {
          const idx = (y * size + x) * 4;
          const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
          // Dark module check (r+g+b < 382 means darker than mid-grey)
          if (r + g + b < 382) {
            rects += `<rect x="${x}" y="${y}" width="${module}" height="${module}" fill="${this.fgColor}"/>`;
          }
        }
      }
      const svg  = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${this.bgColor}"/>${rects}</svg>`;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      this._download(url, 'qrcode.svg');
      URL.revokeObjectURL(url);
      this.showToast('SVG downloaded!', 'success');
    },

    // ── Download branded card PNG ──────────────────────────────
    async downloadCard() {
      if (!this.generated) return;

      const PAD   = 28;
      const GAP   = 14;
      const W     = 400;
      const QR_SZ = 200;
      const LG_SZ = 56;

      // Compute dynamic height
      let H = PAD;
      if (this.logoDataUrl)      H += LG_SZ + GAP;
      H += QR_SZ + GAP;
      if (this.cardTitle.trim()) H += 28 + 6;
      if (this.cardDesc.trim())  H += 22 + 4;
      if (this.showBranding)     H += GAP + 20;
      H += PAD;

      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const ctx = off.getContext('2d');

      // Card background
      ctx.fillStyle = this.cardBg;
      ctx.fillRect(0, 0, W, H);

      let y = PAD;

      // Logo (optional)
      if (this.logoDataUrl) {
        await new Promise(res => {
          const img = new Image();
          img.onload = () => {
            const lx = (W - LG_SZ) / 2;
            // White circle behind logo
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(lx - 4, y - 4, LG_SZ + 8, LG_SZ + 8, 10) : ctx.rect(lx, y, LG_SZ, LG_SZ);
            ctx.fill();
            ctx.drawImage(img, lx, y, LG_SZ, LG_SZ);
            y += LG_SZ + GAP;
            res();
          };
          img.onerror = () => { y += LG_SZ + GAP; res(); };
          img.src = this.logoDataUrl;
        });
      }

      // QR code
      await new Promise(res => {
        const tmpDiv = document.createElement('div');
        tmpDiv.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
        document.body.appendChild(tmpDiv);
        new QRCode(tmpDiv, {
          text: this.buildContent(), width: QR_SZ, height: QR_SZ,
          colorDark: this.fgColor, colorLight: this.bgColor, correctLevel: this._ecLevel(),
        });
        setTimeout(() => {
          const src = tmpDiv.querySelector('canvas');
          if (src) {
            const qx = (W - QR_SZ) / 2;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(qx - 3, y - 3, QR_SZ + 6, QR_SZ + 6);
            ctx.drawImage(src, qx, y);
          }
          document.body.removeChild(tmpDiv);
          y += QR_SZ + GAP;
          res();
        }, 200);
      });

      // Title (optional)
      if (this.cardTitle.trim()) {
        ctx.fillStyle  = this.cardTextColor;
        ctx.globalAlpha = 1;
        ctx.font       = 'bold 17px system-ui, sans-serif';
        ctx.textAlign  = 'center';
        ctx.fillText(this.cardTitle.trim(), W / 2, y + 17);
        y += 28 + 6;
      }

      // Description (optional)
      if (this.cardDesc.trim()) {
        ctx.fillStyle   = this.cardTextColor;
        ctx.globalAlpha = 0.65;
        ctx.font        = '13px system-ui, sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText(this.cardDesc.trim(), W / 2, y + 13);
        ctx.globalAlpha = 1;
        y += 22 + 4;
      }

      // Branding (optional)
      if (this.showBranding) {
        y += GAP;
        ctx.fillStyle   = this.cardTextColor;
        ctx.globalAlpha = 0.32;
        ctx.font        = '11px system-ui, sans-serif';
        ctx.textAlign   = 'center';
        ctx.fillText('thetoolempire.com', W / 2, y + 11);
        ctx.globalAlpha = 1;
      }

      this._download(off.toDataURL('image/png'), 'qr-card.png');
      this.showToast('Card downloaded!', 'success');
    },

    // ── Trigger browser download ───────────────────────────────
    _download(href, filename) {
      const a = document.createElement('a');
      a.href = href; a.download = filename; a.click();
    },

    // ── Copy content to clipboard ──────────────────────────────
    async copyContent() {
      try {
        await navigator.clipboard.writeText(this.buildContent());
        this.showToast('Copied!', 'success');
      } catch {
        this.showToast('Copy failed — select manually.', 'error');
      }
    },

    // ── Logo upload ────────────────────────────────────────────
    handleLogoUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { this.showToast('Upload an image file.', 'error'); return; }
      if (file.size > 2 * 1024 * 1024)    { this.showToast('Logo must be under 2MB.', 'error'); return; }
      this.logoFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e) => { this.logoDataUrl = e.target.result; if (this.generated) this.generate(); };
      reader.readAsDataURL(file);
    },

    removeLogo() {
      this.logoDataUrl = null; this.logoFileName = '';
      const inp = document.getElementById('logo-upload-input');
      if (inp) inp.value = '';
      if (this.generated) this.generate();
    },

    // ── Hex sync helpers ───────────────────────────────────────
    syncFgColor(v) { if (/^#[0-9A-Fa-f]{6}$/.test(v)) this.fgColor = v; },
    syncBgColor(v) { if (/^#[0-9A-Fa-f]{6}$/.test(v)) this.bgColor = v; },

    // ── FAQ ────────────────────────────────────────────────────
    toggleFaq(i) {
      this.openFaq = (this.openFaq === i) ? null : i;
      document.querySelectorAll('.faq-item').forEach((el, idx) => {
        el.classList.toggle('open', idx === this.openFaq);
      });
    },

    // ── Report ─────────────────────────────────────────────────
    submitReport() { if (this.reportSelected) setTimeout(() => { this.reportSent = true; }, 500); },
    closeReport()  { this.reportOpen = false; setTimeout(() => { this.reportSent = false; this.reportSelected = ''; }, 350); },

    // ── Toast ──────────────────────────────────────────────────
    showToast(msg, type) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.querySelector('.toast-msg').textContent = msg;
      el.className = 'toast ' + (type || 'success');
      void el.offsetWidth;
      el.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
    },

    // ── Content preview (truncated) ───────────────────────────
    get contentPreview() {
      const c = this.buildContent();
      return c.length > 58 ? c.slice(0, 55) + '…' : c;
    },
  };
}
