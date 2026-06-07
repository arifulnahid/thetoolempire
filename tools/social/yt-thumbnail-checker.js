/* ── YouTube Thumbnail Safe Zone Checker ── */
function ytThumbnailApp() {
  return {
    /* ── State ── */
    imageLoaded: false,
    imageUrl: '',        // object URL or data URL
    imageName: '',
    imageW: 0,
    imageH: 0,
    imageSize: 0,

    /* ── Overlay toggles ── */
    showSafeZone: true,
    showUIOverlay: true,
    showGrid: false,
    showTitleBar: true,

    /* ── Preview mode ── */
    previewMode: 'full',  // full | search | mobile | suggested

    /* ── Canvas ref ── */
    _canvas: null,
    _ctx: null,
    _img: null,

    /* ── Drag state ── */
    dragOver: false,

    /* ── Analysis ── */
    analysis: null,

    /* ── YouTube UI constants (as % of 1280×720 canvas) ── */
    UI: {
      // Bottom-left: channel avatar + title text area
      avatarX: 0,       avatarY: 0.72,  avatarW: 0.18, avatarH: 0.28,
      // Bottom bar (gradient shadow)
      barX: 0,          barY: 0.68,     barW: 1.0,     barH: 0.32,
      // Duration badge bottom-right
      durationX: 0.74,  durationY: 0.82, durationW: 0.26, durationH: 0.18,
      // Progress bar bottom edge
      progressX: 0,     progressY: 0.955, progressW: 1.0, progressH: 0.045,
      // Top-left: Watched indicator / playlist number
      watchedX: 0,      watchedY: 0,    watchedW: 0.22, watchedH: 0.14,
    },

    /* ── Safe zone: keep important content inside this rect ── */
    SAFE: { x: 0.04, y: 0.04, w: 0.92, h: 0.64 },

    init() {},

    /* ── File drop / input ── */
    onDrop(e) {
      this.dragOver = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) this._loadFile(file);
    },
    onFileInput(e) {
      const file = e.target.files?.[0];
      if (file) this._loadFile(file);
    },
    _loadFile(file) {
      if (!file.type.startsWith('image/')) { this._toast('Please upload an image file'); return; }
      this.imageName = file.name;
      this.imageSize = file.size;
      const url = URL.createObjectURL(file);
      this._loadUrl(url);
    },
    _loadUrl(url) {
      const img = new Image();
      img.onload = () => {
        this._img = img;
        this.imageUrl = url;
        this.imageW = img.naturalWidth;
        this.imageH = img.naturalHeight;
        this.imageLoaded = true;
        this._analyzeImage();
        /* Wait for Alpine to render the canvas template, then grab the element and draw */
        this.$nextTick(() => {
          this._canvas = document.getElementById('thumbCanvas');
          if (this._canvas) {
            this._ctx = this._canvas.getContext('2d');
            this._draw();
          }
        });
      };
      img.onerror = () => this._toast('Could not load image');
      img.src = url;
    },

    /* ── Analysis ── */
    _analyzeImage() {
      const w = this.imageW, h = this.imageH;
      const ratio = w / h;
      const is16x9 = Math.abs(ratio - (16/9)) < 0.05;
      const isHD = w >= 1280 && h >= 720;
      const isFHD = w >= 1920 && h >= 1080;
      const isSmall = w < 640 || h < 360;

      let sizeLabel = '', sizeClass = '';
      const kb = this.imageSize / 1024;
      if (kb > 2048) { sizeLabel = `${(kb/1024).toFixed(1)} MB — too large (max 2 MB)`; sizeClass = 'bad'; }
      else if (kb > 1024) { sizeLabel = `${(kb/1024).toFixed(1)} MB — acceptable`; sizeClass = 'warn'; }
      else { sizeLabel = `${kb.toFixed(0)} KB — good`; sizeClass = 'ok'; }

      let resLabel = '', resClass = '';
      if (isFHD) { resLabel = `${w}×${h} (1080p) — excellent`; resClass = 'ok'; }
      else if (isHD) { resLabel = `${w}×${h} (720p) — good`; resClass = 'ok'; }
      else if (isSmall) { resLabel = `${w}×${h} — too small`; resClass = 'bad'; }
      else { resLabel = `${w}×${h} — acceptable`; resClass = 'warn'; }

      let ratioLabel = '', ratioClass = '';
      if (is16x9) { ratioLabel = `${ratio.toFixed(2)} — perfect 16:9`; ratioClass = 'ok'; }
      else if (ratio > 1.7 && ratio < 1.82) { ratioLabel = `${ratio.toFixed(2)} — close to 16:9`; ratioClass = 'warn'; }
      else { ratioLabel = `${ratio.toFixed(2)} — not 16:9 (letterbox/pillarbox will appear)`; ratioClass = 'bad'; }

      let fmtClass = 'ok', fmtLabel = this.imageName.split('.').pop().toUpperCase() || 'Unknown';
      if (['BMP','TIFF','TIF'].includes(fmtLabel)) { fmtClass = 'warn'; fmtLabel += ' — convert to JPG/PNG for best compatibility'; }

      this.analysis = { sizeLabel, sizeClass, resLabel, resClass, ratioLabel, ratioClass, fmtLabel, fmtClass };
    },

    /* ── Draw canvas ── */
    _draw() {
      const canvas = this._canvas;
      if (!canvas || !this._img) return;

      const CW = 1280, CH = 720;
      canvas.width = CW;
      canvas.height = CH;

      const ctx = this._ctx;
      ctx.clearRect(0, 0, CW, CH);

      /* Draw image (letterbox/pillarbox if needed) */
      const imgAspect = this._img.naturalWidth / this._img.naturalHeight;
      const canvasAspect = CW / CH;
      let dx=0, dy=0, dw=CW, dh=CH;
      if (imgAspect > canvasAspect) {
        dh = CW / imgAspect; dy = (CH - dh) / 2;
      } else if (imgAspect < canvasAspect) {
        dw = CH * imgAspect; dx = (CW - dw) / 2;
        ctx.fillStyle = '#000'; ctx.fillRect(0,0,CW,CH);
      }
      ctx.drawImage(this._img, dx, dy, dw, dh);

      /* Mode-specific cropping overlay */
      if (this.previewMode === 'search') {
        this._drawSearchMockup(ctx, CW, CH);
        return;
      }
      if (this.previewMode === 'mobile') {
        this._drawMobileMockup(ctx, CW, CH);
        return;
      }
      if (this.previewMode === 'suggested') {
        this._drawSuggestedMockup(ctx, CW, CH);
        return;
      }

      /* Full overlay mode */
      const UI = this.UI;

      /* Grid overlay */
      if (this.showGrid) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        for (let i=1; i<4; i++) {
          const gx = CW * i/4;
          ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,CH); ctx.stroke();
        }
        for (let i=1; i<3; i++) {
          const gy = CH * i/3;
          ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(CW,gy); ctx.stroke();
        }
        // Center cross
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.moveTo(CW/2,0); ctx.lineTo(CW/2,CH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,CH/2); ctx.lineTo(CW,CH/2); ctx.stroke();
      }

      /* YouTube UI overlay */
      if (this.showUIOverlay) {
        // Bottom gradient bar
        const grad = ctx.createLinearGradient(0, CH*UI.barY, 0, CH);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.55)');
        grad.addColorStop(1, 'rgba(0,0,0,0.82)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, CH*UI.barY, CW, CH*(1-UI.barY));

        // Avatar circle
        ctx.fillStyle = 'rgba(160,160,160,0.75)';
        ctx.beginPath();
        ctx.arc(CW*0.045, CH*0.855, CH*0.05, 0, Math.PI*2);
        ctx.fill();

        // Channel name + title placeholder
        ctx.fillStyle = 'rgba(255,255,255,0.82)';
        ctx.font = `bold ${Math.round(CH*0.042)}px Inter,sans-serif`;
        ctx.fillText('Video Title Text Here', CW*0.115, CH*0.84);
        ctx.fillStyle = 'rgba(200,200,200,0.6)';
        ctx.font = `${Math.round(CH*0.032)}px Inter,sans-serif`;
        ctx.fillText('Channel Name · 2.1M views', CW*0.115, CH*0.88);

        // Duration badge
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        const dBadgeW = CW*0.092, dBadgeH = CH*0.072;
        ctx.beginPath();
        ctx.roundRect(CW*(1-0.105), CH*(1-0.155), dBadgeW, dBadgeH, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(CH*0.038)}px monospace`;
        ctx.fillText('12:34', CW*(1-0.096), CH*(1-0.093));

        // Progress bar
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(0, CH*0.96, CW, CH*0.03);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, CH*0.96, CW*0.35, CH*0.03);
        // Progress thumb
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(CW*0.35, CH*0.975, CH*0.018, 0, Math.PI*2);
        ctx.fill();
      }

      /* Title bar (channel art area top) */
      if (this.showTitleBar) {
        const topGrad = ctx.createLinearGradient(0,0,0,CH*0.18);
        topGrad.addColorStop(0,'rgba(0,0,0,0.45)');
        topGrad.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0,0,CW,CH*0.18);
      }

      /* Safe zone rect */
      if (this.showSafeZone) {
        const s = this.SAFE;
        const sx=CW*s.x, sy=CH*s.y, sw=CW*s.w, sh=CH*s.h;

        // Darken outside safe zone
        ctx.fillStyle = 'rgba(0,0,0,0.40)';
        ctx.fillRect(0,0,CW,sy);               // top
        ctx.fillRect(0,sy+sh,CW,CH-sy-sh);      // bottom
        ctx.fillRect(0,sy,sx,sh);               // left
        ctx.fillRect(sx+sw,sy,CW-sx-sw,sh);     // right

        // Safe zone border
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.setLineDash([10,5]);
        ctx.strokeRect(sx+1.5, sy+1.5, sw-3, sh-3);
        ctx.setLineDash([]);

        // Corner markers
        const cm = 18;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        [[sx,sy],[sx+sw,sy],[sx,sy+sh],[sx+sw,sy+sh]].forEach(([cx,cy],i) => {
          const dx = i%2===0 ? 1 : -1, dy = i<2 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(cx+dx*cm, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy+dy*cm); ctx.stroke();
        });

        // Label
        ctx.fillStyle = '#22c55e';
        ctx.font = `bold ${Math.round(CH*0.028)}px Inter,sans-serif`;
        ctx.fillText('✓ SAFE ZONE', sx+8, sy-8);
      }
    },

    /* ── Search result mockup ── */
    _drawSearchMockup(ctx, CW, CH) {
      // Draw full background
      ctx.fillStyle = '#0f0f14';
      ctx.fillRect(0,0,CW,CH);

      // Thumbnail section (left ~55%)
      const thumbW = CW*0.55, thumbH = thumbW*(9/16);
      const thumbY = (CH - thumbH)/2;
      ctx.drawImage(this._img, 20, thumbY, thumbW, thumbH);

      // Duration badge
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath(); ctx.roundRect(20+thumbW-90, thumbY+thumbH-28, 78, 22, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${14}px monospace`;
      ctx.fillText('12:34', 20+thumbW-82, thumbY+thumbH-11);

      // Text section (right side)
      const tx = thumbW+40, ty = thumbY+14;
      ctx.fillStyle = '#f0f0f8'; ctx.font = `bold ${20}px Inter,sans-serif`;
      ctx.fillText('Your Video Title Appears Here', tx, ty+22);
      ctx.fillStyle = '#8888a8'; ctx.font = `${15}px Inter,sans-serif`;
      ctx.fillText('2.1M views · 3 weeks ago', tx, ty+50);
      ctx.fillText('ChannelName', tx, ty+74);

      // Annotation
      ctx.strokeStyle = 'rgba(255,0,0,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
      ctx.strokeRect(22, thumbY+2, thumbW-4, thumbH-4);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,0,0,0.8)'; ctx.font = `bold ${13}px Inter,sans-serif`;
      ctx.fillText('Search result size (~480×270px)', 22, thumbY - 8);
    },

    /* ── Mobile feed mockup ── */
    _drawMobileMockup(ctx, CW, CH) {
      ctx.fillStyle = '#0f0f14';
      ctx.fillRect(0,0,CW,CH);

      const phones = 2;
      const phoneW = CW / (phones + 0.5);
      for (let p=0; p<phones; p++) {
        const px = (CW - phones*phoneW - (phones-1)*20) / 2 + p*(phoneW+20);
        const py = 40;
        const ph = CH - 80;

        // Phone frame
        ctx.fillStyle = '#1a1a2a'; ctx.strokeStyle = '#333350'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(px, py, phoneW, ph, 18); ctx.fill(); ctx.stroke();

        const thumbH = phoneW * (9/16);
        ctx.drawImage(this._img, px, py+8, phoneW, thumbH);

        // Duration
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.beginPath(); ctx.roundRect(px+phoneW-62, py+8+thumbH-22, 54, 16, 3); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font=`bold 11px monospace`; ctx.fillText('12:34', px+phoneW-57, py+8+thumbH-9);

        // Title
        ctx.fillStyle='#e8e8f0'; ctx.font=`bold ${12}px Inter,sans-serif`;
        const titleY = py+8+thumbH+16;
        ctx.fillText('Video Title Text Here...', px+8, titleY);
        ctx.fillStyle='#777790'; ctx.font=`${11}px Inter,sans-serif`;
        ctx.fillText('Channel · 2.1M views', px+8, titleY+18);

        if (p===0) {
          ctx.strokeStyle='rgba(255,0,0,.55)'; ctx.lineWidth=2; ctx.setLineDash([5,3]);
          ctx.strokeRect(px+2, py+9, phoneW-4, thumbH-2);
          ctx.setLineDash([]);
          ctx.fillStyle='rgba(255,200,0,0.9)'; ctx.font=`bold 12px Inter,sans-serif`;
          ctx.fillText('Mobile (~360×202px)', px, py-8);
        } else {
          ctx.fillStyle='rgba(150,200,255,0.8)'; ctx.font=`bold 12px Inter,sans-serif`;
          ctx.fillText('Suggested feed', px, py-8);
        }
      }
    },

    /* ── Suggested/home feed mockup ── */
    _drawSuggestedMockup(ctx, CW, CH) {
      ctx.fillStyle = '#0d0d14';
      ctx.fillRect(0,0,CW,CH);

      const cols = 3, gap = 16, padX = 32;
      const cardW = (CW - padX*2 - gap*(cols-1)) / cols;
      const cardH = cardW * (9/16);

      for (let i=0; i<cols; i++) {
        const cx = padX + i*(cardW+gap);
        const cy = 60;
        ctx.drawImage(this._img, cx, cy, cardW, cardH);

        // Duration
        ctx.fillStyle='rgba(0,0,0,.88)';
        ctx.beginPath(); ctx.roundRect(cx+cardW-52, cy+cardH-20, 44, 15, 3); ctx.fill();
        ctx.fillStyle='#fff'; ctx.font=`bold 10px monospace`; ctx.fillText('12:34', cx+cardW-49, cy+cardH-9);

        // Title
        ctx.fillStyle='#e0e0f0'; ctx.font=`bold 13px Inter,sans-serif`;
        ctx.fillText('Video Title Here', cx, cy+cardH+20);
        ctx.fillStyle='#666680'; ctx.font=`11px Inter,sans-serif`;
        ctx.fillText('Channel · 2.1M views', cx, cy+cardH+38);

        if (i===1) {
          ctx.strokeStyle='rgba(34,197,94,.7)'; ctx.lineWidth=2.5; ctx.setLineDash([7,4]);
          ctx.strokeRect(cx+2, cy+2, cardW-4, cardH-4);
          ctx.setLineDash([]);
          ctx.fillStyle='#22c55e'; ctx.font=`bold 12px Inter,sans-serif`;
          ctx.fillText('◀ this is what viewers see', cx, cy-10);
        }
      }

      ctx.fillStyle='#9999bb'; ctx.font=`bold 14px Inter,sans-serif`;
      ctx.fillText('Home / Suggested Feed — Desktop (~246×138px per card)', padX, 30);
    },

    /* ── Redraw when overlays change ── */
    redraw() {
      if (!this.imageLoaded) return;
      this.$nextTick(() => {
        if (!this._canvas) {
          this._canvas = document.getElementById('thumbCanvas');
          if (this._canvas) this._ctx = this._canvas.getContext('2d');
        }
        this._draw();
      });
    },

    switchMode(mode) {
      this.previewMode = mode;
      this.redraw();
    },

    /* ── Download annotated canvas ── */
    download() {
      if (!this._canvas) return;
      const link = document.createElement('a');
      link.download = 'thumbnail-safe-zone-check.png';
      link.href = this._canvas.toDataURL('image/png');
      link.click();
      this._toast('Downloaded!');
    },

    /* ── Reset ── */
    reset() {
      this.imageLoaded = false;
      this.imageUrl = '';
      this._img = null;
      this.analysis = null;
      if (this._ctx && this._canvas) this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height);
    },

    /* ── FAQ toggle ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    /* ── Toast ── */
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },
  };
}
