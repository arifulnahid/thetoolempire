/* ── GeoTIFF Inspector — Alpine component ── */
/* Uses geotiff.js CDN for TIFF parsing */

function geotiffInspectorApp() {
  return {
    state: 'idle',   /* idle | loading | done | error */
    errorMsg: '',
    fileName: '',
    fileSize: 0,
    activeTab: 'overview',

    /* ── Parsed data ── */
    meta: {},        /* width, height, bandCount, etc. */
    bands: [],       /* [{index, type, noData, min, max, colorInterp}] */
    crsInfo: {},     /* {epsg, proj4, wkt, name} */
    geoTransform: [],/* 6-element array */
    bbox: {},        /* minX, minY, maxX, maxY in source CRS + WGS84 */
    tags: {},        /* all TIFF tags as flat object */
    isBigTiff: false,
    hasCog: false,

    init() {},

    /* ── File handling ── */
    handleFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      this._processFile(file);
    },

    handleDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      this._processFile(file);
    },

    async _processFile(file) {
      this.state = 'loading';
      this.errorMsg = '';
      this.fileName = file.name;
      this.fileSize = file.size;
      this.bands = [];
      this.crsInfo = {};
      this.geoTransform = [];
      this.bbox = {};
      this.tags = {};
      this.meta = {};
      this.isBigTiff = false;
      this.hasCog = false;

      try {
        const buffer = await file.arrayBuffer();
        await this._parse(buffer);
        this.state = 'done';
        this.activeTab = 'overview';
      } catch (err) {
        this.state = 'error';
        this.errorMsg = err.message || String(err);
      }
    },

    async _parse(buffer) {
      /* geotiff.js must be loaded on the page */
      if (typeof GeoTIFF === 'undefined') throw new Error('geotiff.js library not loaded.');
      const tiff = await GeoTIFF.fromArrayBuffer(buffer);

      /* BigTIFF detection — check header magic */
      const view = new DataView(buffer);
      const byteOrder = view.getUint16(0, false);
      const littleEndian = byteOrder === 0x4949;
      const magic = view.getUint16(2, littleEndian);
      this.isBigTiff = magic === 43;

      const imageCount = await tiff.getImageCount();
      const image = await tiff.getImage(0);

      /* Dimensions */
      const width  = image.getWidth();
      const height = image.getHeight();
      const bandCount = image.getSamplesPerPixel();
      const tileWidth  = image.getTileWidth?.() || image.getBlockWidth?.() || null;
      const tileHeight = image.getTileHeight?.() || image.getBlockHeight?.() || null;
      const isTiled = tileWidth !== null && tileWidth !== width;

      /* File directory / tags */
      const fd = image.fileDirectory;

      /* Compression */
      const COMPRESSION_MAP = {1:'None (uncompressed)',2:'CCITT 1D',3:'CCITT Group 3',4:'CCITT Group 4',5:'LZW',6:'JPEG (old)',7:'JPEG',8:'Deflate/ZIP',32773:'PackBits',34925:'LZMA',50000:'ZSTD',50001:'WebP'};
      const compression = COMPRESSION_MAP[fd.Compression] || `Unknown (${fd.Compression})`;

      /* Photometric interpretation */
      const PHOTO_MAP = {0:'MinIsWhite (grayscale)',1:'MinIsBlack (grayscale)',2:'RGB',3:'Palette/colormap',4:'Transparency mask',5:'CMYK',6:'YCbCr',8:'CIELab',32844:'ICCLab',32845:'ITULab'};
      const photometric = PHOTO_MAP[fd.PhotometricInterpretation] || `Unknown (${fd.PhotometricInterpretation})`;

      /* Sample format */
      const SAMPLE_FORMAT = {1:'Unsigned integer',2:'Signed integer',3:'IEEE floating point',4:'Undefined'};
      const sampleFormats = fd.SampleFormat ? fd.SampleFormat.map(v => SAMPLE_FORMAT[v] || String(v)) : ['Unsigned integer'];

      /* Bits per sample */
      const bitsPerSample = fd.BitsPerSample ? Array.from(fd.BitsPerSample) : [8];

      /* Resolution */
      const xRes = fd.XResolution ? (Array.isArray(fd.XResolution) ? fd.XResolution[0]/fd.XResolution[1] : fd.XResolution) : null;
      const yRes = fd.YResolution ? (Array.isArray(fd.YResolution) ? fd.YResolution[0]/fd.YResolution[1] : fd.YResolution) : null;
      const resUnit = fd.ResolutionUnit === 3 ? 'cm' : fd.ResolutionUnit === 2 ? 'inch' : 'undefined';

      /* GeoTransform */
      let gt = [0,1,0,0,0,-1];
      try {
        const origin = image.getOrigin();
        const res    = image.getResolution();
        gt = [origin[0], res[0], 0, origin[1], 0, res[1]];
      } catch {}
      this.geoTransform = gt;

      /* BBox in source CRS */
      try {
        const bbox = image.getBoundingBox();
        this.bbox.minX = bbox[0]; this.bbox.minY = bbox[1];
        this.bbox.maxX = bbox[2]; this.bbox.maxY = bbox[3];
        /* Approximate geographic bbox — only reliable if CRS is geographic */
        const epsg = this._guessEpsg(fd);
        if (epsg === 4326 || !epsg) {
          this.bbox.minLon = bbox[0]; this.bbox.minLat = bbox[1];
          this.bbox.maxLon = bbox[2]; this.bbox.maxLat = bbox[3];
        }
      } catch {}

      /* CRS info */
      this.crsInfo = this._parseCrs(fd);

      /* Band info */
      this.bands = [];
      for (let i = 0; i < bandCount; i++) {
        const fmt = sampleFormats[i] || sampleFormats[0];
        const bits = bitsPerSample[i] || bitsPerSample[0];
        let noData = null;
        if (fd.GDAL_NODATA !== undefined) noData = String(fd.GDAL_NODATA).trim();

        const COLOR_INTERP = ['Undefined','Gray','Palette','Red','Green','Blue','Alpha','Hue','Saturation','Lightness','Cyan','Magenta','Yellow','Black'];
        const ci = fd.ExtraSamples ? null : null; /* simplified */
        const colorInterp = i < 3 && photometric.startsWith('RGB') ? ['Red','Green','Blue'][i] : photometric.includes('grayscale') ? 'Gray' : `Band ${i+1}`;

        this.bands.push({ index: i+1, format: fmt, bits, noData, colorInterp });
      }

      /* COG detection — look for multiple IFDs and tiled structure */
      this.hasCog = imageCount > 1 && isTiled;

      /* Interesting tags */
      const tagFields = ['ImageDescription','Software','DateTime','Artist','Copyright','Make','Model','GDAL_METADATA','GDAL_NODATA'];
      const collected = {};
      tagFields.forEach(k => { if (fd[k] !== undefined) collected[k] = String(fd[k]).trim(); });
      /* ModelTiepointTag, ModelPixelScaleTag as raw arrays */
      if (fd.ModelTiepointTag) collected['ModelTiepointTag'] = Array.from(fd.ModelTiepointTag).map(v=>v.toFixed(6)).join(', ');
      if (fd.ModelPixelScaleTag) collected['ModelPixelScaleTag'] = Array.from(fd.ModelPixelScaleTag).map(v=>v.toFixed(10)).join(', ');
      this.tags = collected;

      this.meta = {
        width, height, bandCount, compression, photometric,
        tileWidth, tileHeight, isTiled,
        xRes, yRes, resUnit,
        imageCount,
        fileSize: this.fileSize,
        isBigTiff: this.isBigTiff,
      };
    },

    /* ── CRS parsing from GeoTIFF file directory ── */
    _parseCrs(fd) {
      const info = { epsg: null, name: 'Unknown / not embedded', proj4: '', wkt: '' };
      try {
        /* GeoKeyDirectory */
        const gkd = fd.GeoKeyDirectory;
        if (!gkd) return info;
        const keys = {};
        for (let i = 4; i < gkd.length; i += 4) {
          const keyId = gkd[i]; const count = gkd[i+2]; const valOffset = gkd[i+3];
          const tiffTagLoc = gkd[i+1];
          if (tiffTagLoc === 0) keys[keyId] = valOffset;
          else if (tiffTagLoc === 34737 && fd.GeoAsciiParams) {
            keys[keyId] = fd.GeoAsciiParams.slice(valOffset, valOffset + count - 1);
          }
        }
        /* GTModelTypeGeoKey=1024, ProjectedCSTypeGeoKey=3072, GeographicTypeGeoKey=2048 */
        const modelType = keys[1024];
        const projCode  = keys[3072];
        const geogCode  = keys[2048];
        const citationKey = keys[1026] || keys[3073] || keys[2049] || '';

        if (projCode && projCode !== 32767) {
          info.epsg = projCode;
          info.name = citationKey || `EPSG:${projCode}`;
        } else if (geogCode && geogCode !== 32767) {
          info.epsg = geogCode;
          info.name = citationKey || `EPSG:${geogCode}`;
        } else if (citationKey) {
          info.name = citationKey;
        }

        /* Common EPSG→name lookup */
        const EPSG_NAMES = {4326:'WGS 84',4269:'NAD83',4258:'ETRS89',3857:'WGS 84 / Web Mercator',32632:'WGS 84 / UTM zone 32N',32633:'WGS 84 / UTM zone 33N',32618:'WGS 84 / UTM zone 18N',27700:'OSGB 1936 / British National Grid',2154:'RGF93 / Lambert-93',28992:'Amersfoort / RD New',3006:'SWEREF99 TM',3577:'GDA94 / Australian Albers'};
        if (info.epsg && EPSG_NAMES[info.epsg]) info.name = EPSG_NAMES[info.epsg];

        /* Build Proj4 for known codes */
        const PROJ4 = {4326:'+proj=longlat +datum=WGS84 +no_defs',4269:'+proj=longlat +datum=NAD83 +no_defs',3857:'+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +no_defs',27700:'+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +datum=OSGB36 +units=m +no_defs',32632:'+proj=utm +zone=32 +datum=WGS84 +units=m +no_defs',32633:'+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs',32618:'+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs',2154:'+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs',28992:'+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs'};
        if (info.epsg && PROJ4[info.epsg]) info.proj4 = PROJ4[info.epsg];

        /* GeoAsciiParams as fallback WKT-like string */
        if (fd.GeoAsciiParams) info.wkt = fd.GeoAsciiParams.replace(/\|/g, '\n');

      } catch {}
      return info;
    },

    _guessEpsg(fd) {
      try {
        const gkd = fd.GeoKeyDirectory;
        if (!gkd) return null;
        for (let i = 4; i < gkd.length; i += 4) {
          if (gkd[i] === 3072 && gkd[i+1] === 0) return gkd[i+3];
          if (gkd[i] === 2048 && gkd[i+1] === 0) return gkd[i+3];
        }
      } catch {}
      return null;
    },

    /* ── Tab management ── */
    setTab(tab) { this.activeTab = tab; },

    /* ── Helpers ── */
    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const units = ['B','KB','MB','GB'];
      let i = 0, b = bytes;
      while (b >= 1024 && i < units.length-1) { b /= 1024; i++; }
      return b.toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
    },

    formatNum(n) {
      if (n === null || n === undefined) return '—';
      if (typeof n === 'number') return n.toLocaleString(undefined, {maximumFractionDigits:6});
      return String(n);
    },

    get gtLabels() {
      return [
        {label:'Top-left X', val: this.geoTransform[0]},
        {label:'Pixel width (W→E)', val: this.geoTransform[1]},
        {label:'Row rotation', val: this.geoTransform[2]},
        {label:'Top-left Y', val: this.geoTransform[3]},
        {label:'Col rotation', val: this.geoTransform[4]},
        {label:'Pixel height (N→S)', val: this.geoTransform[5]},
      ];
    },

    async copyText(text, label) {
      try { await navigator.clipboard.writeText(text); }
      catch { const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta); }
      this._toast(`Copied ${label}`);
    },

    get bboxText() {
      if (!this.bbox.minX) return '';
      return `minX: ${this.bbox.minX}\nminY: ${this.bbox.minY}\nmaxX: ${this.bbox.maxX}\nmaxY: ${this.bbox.maxY}`;
    },

    get proj4Text() { return this.crsInfo.proj4 || ''; },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
