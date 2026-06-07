function imageMetadataApp() {
  return {
    // File state
    file: null,
    fileName: '',
    fileSize: 0,
    fileType: '',
    imageUrl: null,
    imgWidth: 0,
    imgHeight: 0,
    isDragOver: false,
    processing: false,
    isJpeg: false,
    hasExif: false,

    // UI
    activeTab: 'basic',

    // piexifjs exif object
    exifObj: null,

    // Editable metadata fields
    edit: {
      description: '', artist: '', copyright: '', software: '',
      make: '', model: '',
      dateTime: '', dateTimeOriginal: '', dateTimeDigitized: '',
      userComment: '',
      gpsLat: '', gpsLatRef: 'N',
      gpsLng: '', gpsLngRef: 'E',
      gpsAlt: '',
    },

    // Camera info (read-only display)
    cam: {
      make: '', model: '', lens: '',
      focalLength: '', aperture: '', shutter: '', iso: '',
      flash: '', exposureMode: '', whiteBalance: '', meteringMode: '',
      colorSpace: '', pixelX: '', pixelY: '',
    },

    // All tags flat list for "All Tags" tab
    allTags: [],

    // ── Init ────────────────────────────────────────────────────────
    init() {},

    // ── Computed ─────────────────────────────────────────────────────
    get fileSizeFmt() {
      const s = this.fileSize;
      if (!s) return '';
      if (s < 1024) return s + ' B';
      if (s < 1048576) return (s / 1024).toFixed(1) + ' KB';
      return (s / 1048576).toFixed(2) + ' MB';
    },

    get googleMapsUrl() {
      const lat = parseFloat(this.edit.gpsLat);
      const lng = parseFloat(this.edit.gpsLng);
      if (isNaN(lat) || isNaN(lng) || !this.edit.gpsLat || !this.edit.gpsLng) return '';
      const dlat = lat * (this.edit.gpsLatRef === 'S' ? -1 : 1);
      const dlng = lng * (this.edit.gpsLngRef === 'W' ? -1 : 1);
      return `https://www.google.com/maps?q=${dlat},${dlng}`;
    },

    // ── File loading ──────────────────────────────────────────────────
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this.loadFile(f);
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) this.loadFile(f);
    },

    loadFile(file) {
      this.file = file;
      this.fileName = file.name;
      this.fileSize = file.size;
      this.fileType = file.type;
      this.isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
      this.processing = true;
      this.allTags = [];
      this.exifObj = null;
      this.hasExif = false;
      this.resetEdit();

      const reader = new FileReader();
      reader.onload = e => {
        this.imageUrl = e.target.result;
        const img = new Image();
        img.onload = () => { this.imgWidth = img.naturalWidth; this.imgHeight = img.naturalHeight; };
        img.src = this.imageUrl;

        if (this.isJpeg) {
          this.parseExif(e.target.result);
        }
        this.processing = false;
      };
      reader.readAsDataURL(file);
    },

    resetEdit() {
      Object.keys(this.edit).forEach(k => this.edit[k] = k === 'gpsLatRef' ? 'N' : k === 'gpsLngRef' ? 'E' : '');
      Object.keys(this.cam).forEach(k => this.cam[k] = '');
    },

    // ── EXIF parsing ─────────────────────────────────────────────────
    parseExif(dataUrl) {
      try {
        this.exifObj = piexif.load(dataUrl);
        this.hasExif = true;
      } catch (_) {
        this.exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {} };
        this.hasExif = false;
      }

      const I = this.exifObj['0th']  || {};
      const E = this.exifObj['Exif'] || {};
      const G = this.exifObj['GPS']  || {};
      const ii = piexif.ImageIFD, ei = piexif.ExifIFD, gi = piexif.GPSIFD;

      // Basic editable
      this.edit.description       = this.str(I[ii.ImageDescription]);
      this.edit.artist            = this.str(I[ii.Artist]);
      this.edit.copyright         = this.str(I[ii.Copyright]);
      this.edit.software          = this.str(I[ii.Software]);
      this.edit.make              = this.str(I[ii.Make]);
      this.edit.model             = this.str(I[ii.Model]);
      this.edit.dateTime          = this.str(I[ii.DateTime]);
      this.edit.dateTimeOriginal  = this.str(E[ei.DateTimeOriginal]);
      this.edit.dateTimeDigitized = this.str(E[ei.DateTimeDigitized]);
      this.edit.userComment       = this.decodeUserComment(E[ei.UserComment]);

      // GPS
      if (G[gi.GPSLatitude]) {
        this.edit.gpsLat    = this.gpsToDecimal(G[gi.GPSLatitude]).toFixed(7);
        this.edit.gpsLatRef = this.str(G[gi.GPSLatitudeRef]) || 'N';
      }
      if (G[gi.GPSLongitude]) {
        this.edit.gpsLng    = this.gpsToDecimal(G[gi.GPSLongitude]).toFixed(7);
        this.edit.gpsLngRef = this.str(G[gi.GPSLongitudeRef]) || 'E';
      }
      if (G[gi.GPSAltitude]) {
        const a = G[gi.GPSAltitude];
        this.edit.gpsAlt = (a[0] / a[1]).toFixed(1);
      }

      // Camera (read-only)
      this.cam.make         = this.edit.make;
      this.cam.model        = this.edit.model;
      this.cam.lens         = this.str(E[ei.LensModel]);
      this.cam.focalLength  = this.fmtRational(E[ei.FocalLength], 'mm');
      this.cam.aperture     = this.fmtAperture(E[ei.FNumber]);
      this.cam.shutter      = this.fmtShutter(E[ei.ExposureTime]);
      this.cam.iso          = E[ei.ISOSpeedRatings] ? String(E[ei.ISOSpeedRatings]) : '';
      this.cam.flash        = this.fmtFlash(E[ei.Flash]);
      this.cam.exposureMode = this.fmtEnum(E[ei.ExposureMode], ['Auto','Manual','Auto bracket']);
      this.cam.whiteBalance = this.fmtEnum(E[ei.WhiteBalance], ['Auto','Manual']);
      this.cam.meteringMode = this.fmtEnum(E[ei.MeteringMode], ['Unknown','Average','Center-weighted','Spot','Multi-spot','Multi-segment','Partial']);
      this.cam.colorSpace   = this.fmtEnum(E[ei.ColorSpace], { 1:'sRGB', 65535:'Uncalibrated' });
      this.cam.pixelX       = E[ei.PixelXDimension] ? String(E[ei.PixelXDimension]) : '';
      this.cam.pixelY       = E[ei.PixelYDimension] ? String(E[ei.PixelYDimension]) : '';

      this.buildAllTags();
    },

    // ── EXIF helpers ─────────────────────────────────────────────────
    str(v) {
      if (v === undefined || v === null) return '';
      return String(v).replace(/\0/g, '').trim();
    },

    decodeUserComment(arr) {
      if (!arr || arr.length < 8) return '';
      try {
        return arr.slice(8).map(c => String.fromCharCode(c)).join('').replace(/\0/g, '').trim();
      } catch (_) { return ''; }
    },

    encodeUserComment(str) {
      const prefix = [65, 83, 67, 73, 73, 0, 0, 0]; // ASCII\0\0\0
      return prefix.concat(str.split('').map(c => c.charCodeAt(0)));
    },

    gpsToDecimal(rational) {
      if (!rational || !rational.length) return 0;
      const [d, m, s] = rational;
      return (d[0] / d[1]) + (m[0] / m[1]) / 60 + (s[0] / s[1]) / 3600;
    },

    decimalToGps(dec) {
      const abs = Math.abs(dec);
      const d   = Math.floor(abs);
      const m   = Math.floor((abs - d) * 60);
      const s   = Math.round(((abs - d) * 60 - m) * 3600 * 1000);
      return [[d, 1], [m, 1], [s, 1000]];
    },

    fmtRational(v, unit = '') {
      if (!v) return '';
      const n = v[0] / v[1];
      return (Number.isInteger(n) ? n : n.toFixed(1)) + unit;
    },

    fmtAperture(v) {
      if (!v) return '';
      return 'f/' + (v[0] / v[1]).toFixed(1);
    },

    fmtShutter(v) {
      if (!v) return '';
      const s = v[0] / v[1];
      return s < 1 ? '1/' + Math.round(1 / s) + 's' : s.toFixed(1) + 's';
    },

    fmtFlash(v) {
      if (v === undefined || v === null) return '';
      return (v & 1) ? 'Fired' : 'Did not fire';
    },

    fmtEnum(v, map) {
      if (v === undefined || v === null) return '';
      if (Array.isArray(map)) return map[v] || '';
      return map[v] || '';
    },

    buildAllTags() {
      this.allTags = [];
      const push = (section, ifd, dict) => {
        Object.entries(ifd || {}).forEach(([tag, val]) => {
          const n = parseInt(tag);
          this.allTags.push({
            section,
            name: this.tagName(n, dict),
            hex: '0x' + n.toString(16).toUpperCase().padStart(4, '0'),
            value: this.fmtTagVal(val),
          });
        });
      };
      push('Image (0th IFD)', this.exifObj['0th'],  piexif.ImageIFD);
      push('EXIF IFD',        this.exifObj['Exif'], piexif.ExifIFD);
      push('GPS IFD',         this.exifObj['GPS'],  piexif.GPSIFD);
    },

    tagName(num, dict) {
      for (const [k, v] of Object.entries(dict || {})) {
        if (v === num) return k;
      }
      return 'Tag ' + num;
    },

    fmtTagVal(v) {
      if (v === undefined || v === null) return '—';
      if (typeof v === 'string') return v.replace(/\0/g, '').trim() || '(empty)';
      if (Array.isArray(v)) {
        if (Array.isArray(v[0])) return v.map(r => r[0] + '/' + r[1]).join(', ');
        if (v.length > 20) return `[${v.length} bytes]`;
        return v.join(', ');
      }
      return String(v);
    },

    // ── Save & Download ───────────────────────────────────────────────
    saveAndDownload() {
      if (!this.imageUrl) return;

      if (!this.isJpeg) {
        this.triggerDownload(this.imageUrl, this.fileName);
        this.showToast('Downloaded (EXIF editing requires JPEG)');
        return;
      }

      try {
        if (!this.exifObj) {
          this.exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, 'Interop': {}, '1st': {} };
        }

        const I  = this.exifObj['0th']  || {};
        const E  = this.exifObj['Exif'] || {};
        const G  = this.exifObj['GPS']  || {};
        const ii = piexif.ImageIFD, ei = piexif.ExifIFD, gi = piexif.GPSIFD;

        // Write editable fields
        this.setOrDel(I,  ii.ImageDescription,   this.edit.description);
        this.setOrDel(I,  ii.Artist,              this.edit.artist);
        this.setOrDel(I,  ii.Copyright,           this.edit.copyright);
        this.setOrDel(I,  ii.Software,            this.edit.software);
        this.setOrDel(I,  ii.Make,                this.edit.make);
        this.setOrDel(I,  ii.Model,               this.edit.model);
        this.setOrDel(I,  ii.DateTime,            this.edit.dateTime);
        this.setOrDel(E,  ei.DateTimeOriginal,    this.edit.dateTimeOriginal);
        this.setOrDel(E,  ei.DateTimeDigitized,   this.edit.dateTimeDigitized);

        if (this.edit.userComment) {
          E[ei.UserComment] = this.encodeUserComment(this.edit.userComment);
        } else {
          delete E[ei.UserComment];
        }

        // GPS lat
        const lat = parseFloat(this.edit.gpsLat);
        if (!isNaN(lat) && this.edit.gpsLat !== '') {
          G[gi.GPSLatitude]    = this.decimalToGps(lat);
          G[gi.GPSLatitudeRef] = this.edit.gpsLatRef;
        } else {
          delete G[gi.GPSLatitude]; delete G[gi.GPSLatitudeRef];
        }
        // GPS lng
        const lng = parseFloat(this.edit.gpsLng);
        if (!isNaN(lng) && this.edit.gpsLng !== '') {
          G[gi.GPSLongitude]    = this.decimalToGps(lng);
          G[gi.GPSLongitudeRef] = this.edit.gpsLngRef;
        } else {
          delete G[gi.GPSLongitude]; delete G[gi.GPSLongitudeRef];
        }
        // GPS alt
        const alt = parseFloat(this.edit.gpsAlt);
        if (!isNaN(alt) && this.edit.gpsAlt !== '') {
          G[gi.GPSAltitude]    = [Math.round(Math.abs(alt) * 100), 100];
          G[gi.GPSAltitudeRef] = alt < 0 ? 1 : 0;
        } else {
          delete G[gi.GPSAltitude]; delete G[gi.GPSAltitudeRef];
        }

        this.exifObj['0th']  = I;
        this.exifObj['Exif'] = E;
        this.exifObj['GPS']  = G;

        const exifBytes = piexif.dump(this.exifObj);
        const newUrl    = piexif.insert(exifBytes, this.imageUrl);
        this.triggerDownload(newUrl, this.fileName);
        this.showToast('Downloaded with updated metadata!');
      } catch (err) {
        console.error(err);
        this.showToast('Error writing metadata — check console.');
      }
    },

    setOrDel(obj, tag, val) {
      if (val && val.trim()) obj[tag] = val.trim();
      else delete obj[tag];
    },

    stripAndDownload() {
      if (!this.imageUrl) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        const ext  = this.fileName.split('.').pop().toLowerCase();
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const base = this.fileName.replace(/\.[^.]+$/, '');
        this.triggerDownload(c.toDataURL(mime, 0.95), base + '-no-metadata.' + (ext === 'png' ? 'png' : 'jpg'));
        this.showToast('Downloaded — all metadata stripped!');
      };
      img.src = this.imageUrl;
    },

    triggerDownload(dataUrl, name) {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = name; a.click();
    },

    showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2600);
    },

    toggleFaq(btn) {
      btn.closest('.faq-item').classList.toggle('open');
    },
  };
}
