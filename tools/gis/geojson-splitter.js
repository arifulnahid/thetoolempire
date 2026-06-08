/* ── GeoJSON Splitter — Alpine component ── */

function geojsonSplitterApp() {
  return {
    /* ── Input ── */
    inputText: '',
    features: [],
    parseError: '',
    propKeys: [],          /* all property keys found in the collection */

    /* ── Split mode ── */
    mode: 'property',      /* 'property' | 'count' | 'type' */
    splitKey: '',          /* property key to split by */
    chunkSize: 100,        /* features per chunk (count mode) */

    /* ── Options ── */
    prettyPrint: true,

    /* ── Output ── */
    chunks: [],            /* [{label, features, collapsed}] */
    splitDone: false,
    splitError: '',

    init() {},

    /* ── Parse input ── */
    parseInput() {
      this.parseError = '';
      this.features = [];
      this.propKeys = [];
      this.chunks = [];
      this.splitDone = false;
      this.splitError = '';

      const raw = this.inputText.trim();
      if (!raw) return;

      try {
        const gj = JSON.parse(raw);
        if (gj.type === 'FeatureCollection') {
          this.features = gj.features || [];
        } else if (gj.type === 'Feature') {
          this.features = [gj];
        } else if (gj.type) {
          this.features = [{ type: 'Feature', properties: {}, geometry: gj }];
        } else {
          this.parseError = 'Not a valid GeoJSON object.';
          return;
        }
        this._buildPropKeys();
        if (this.splitKey === '' && this.propKeys.length > 0) {
          this.splitKey = this.propKeys[0];
        }
      } catch (e) {
        this.parseError = e.message || 'Invalid JSON';
      }
    },

    _buildPropKeys() {
      const keySet = new Set();
      for (const f of this.features) {
        if (f.properties) {
          Object.keys(f.properties).forEach(k => keySet.add(k));
        }
      }
      this.propKeys = Array.from(keySet).sort();
    },

    /* ── File upload ── */
    handleFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        this.inputText = ev.target.result;
        this.parseInput();
      };
      reader.readAsText(file);
      e.target.value = '';
    },

    handleDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        this.inputText = ev.target.result;
        this.parseInput();
      };
      reader.readAsText(file);
    },

    /* ── Load sample ── */
    loadSample() {
      this.inputText = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { name: 'Paris',     country: 'France',   type: 'capital'  }, geometry: { type: 'Point', coordinates: [2.3522,  48.8566] } },
          { type: 'Feature', properties: { name: 'Lyon',      country: 'France',   type: 'city'     }, geometry: { type: 'Point', coordinates: [4.8357,  45.7640] } },
          { type: 'Feature', properties: { name: 'Marseille', country: 'France',   type: 'city'     }, geometry: { type: 'Point', coordinates: [5.3698,  43.2965] } },
          { type: 'Feature', properties: { name: 'Berlin',    country: 'Germany',  type: 'capital'  }, geometry: { type: 'Point', coordinates: [13.4050, 52.5200] } },
          { type: 'Feature', properties: { name: 'Munich',    country: 'Germany',  type: 'city'     }, geometry: { type: 'Point', coordinates: [11.5820, 48.1351] } },
          { type: 'Feature', properties: { name: 'Hamburg',   country: 'Germany',  type: 'city'     }, geometry: { type: 'Point', coordinates: [9.9937,  53.5511] } },
          { type: 'Feature', properties: { name: 'Madrid',    country: 'Spain',    type: 'capital'  }, geometry: { type: 'Point', coordinates: [-3.7038, 40.4168] } },
          { type: 'Feature', properties: { name: 'Barcelona', country: 'Spain',    type: 'city'     }, geometry: { type: 'Point', coordinates: [2.1734,  41.3851] } },
          { type: 'Feature', properties: { name: 'Rome',      country: 'Italy',    type: 'capital'  }, geometry: { type: 'Point', coordinates: [12.4964, 41.9028] } },
          { type: 'Feature', properties: { name: 'Milan',     country: 'Italy',    type: 'city'     }, geometry: { type: 'Point', coordinates: [9.1900,  45.4654] } },
        ],
      }, null, 2);
      this.parseInput();
    },

    /* ── Clear ── */
    clear() {
      this.inputText = '';
      this.features = [];
      this.parseError = '';
      this.propKeys = [];
      this.splitKey = '';
      this.chunks = [];
      this.splitDone = false;
      this.splitError = '';
    },

    /* ── Split ── */
    split() {
      this.splitError = '';
      this.chunks = [];
      this.splitDone = false;

      if (!this.inputText.trim()) { this.splitError = 'Paste or upload a GeoJSON file first.'; return; }
      this.parseInput();
      if (this.parseError) { this.splitError = this.parseError; return; }
      if (!this.features.length) { this.splitError = 'No features found.'; return; }

      if (this.mode === 'property') {
        if (!this.splitKey) { this.splitError = 'Select a property to split by.'; return; }
        this._splitByProperty();
      } else if (this.mode === 'count') {
        const n = parseInt(this.chunkSize, 10);
        if (!n || n < 1) { this.splitError = 'Enter a valid chunk size (≥ 1).'; return; }
        this._splitByCount(n);
      } else {
        this._splitByType();
      }

      if (!this.chunks.length) {
        this.splitError = 'No output chunks were produced.';
        return;
      }
      this.splitDone = true;
    },

    _splitByProperty() {
      const map = new Map();
      for (const f of this.features) {
        const val = f.properties?.[this.splitKey];
        const key = val === undefined || val === null ? '(null)' : String(val);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(f);
      }
      for (const [val, feats] of map) {
        this.chunks.push({
          label: `${this.splitKey}=${val}`,
          filename: this._safeFilename(`${this.splitKey}_${val}`),
          features: feats,
          collapsed: false,
        });
      }
    },

    _splitByCount(n) {
      const total = this.features.length;
      let i = 0, part = 1;
      while (i < total) {
        const slice = this.features.slice(i, i + n);
        const from = i + 1;
        const to   = Math.min(i + n, total);
        this.chunks.push({
          label: `Part ${part} (features ${from}–${to})`,
          filename: `part_${part}`,
          features: slice,
          collapsed: false,
        });
        i += n;
        part++;
      }
    },

    _splitByType() {
      const map = new Map();
      for (const f of this.features) {
        const gtype = f.geometry?.type || 'Unknown';
        if (!map.has(gtype)) map.set(gtype, []);
        map.get(gtype).push(f);
      }
      for (const [gtype, feats] of map) {
        this.chunks.push({
          label: gtype,
          filename: gtype.toLowerCase(),
          features: feats,
          collapsed: false,
        });
      }
    },

    /* ── Serialise a chunk ── */
    _serialise(feats) {
      const fc = { type: 'FeatureCollection', features: feats };
      return this.prettyPrint ? JSON.stringify(fc, null, 2) : JSON.stringify(fc);
    },

    chunkPreview(chunk) {
      const text = this._serialise(chunk.features);
      return text.length > 800 ? text.slice(0, 800) + '\n…' : text;
    },

    /* ── Copy single chunk ── */
    async copyChunk(chunk) {
      const text = this._serialise(chunk.features);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      this._toast(`Copied "${chunk.label}"`);
    },

    /* ── Download single chunk ── */
    downloadChunk(chunk) {
      const text = this._serialise(chunk.features);
      const blob = new Blob([text], { type: 'application/geo+json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${chunk.filename}.geojson`; a.click();
      URL.revokeObjectURL(url);
      this._toast(`Downloaded ${chunk.filename}.geojson`);
    },

    /* ── Download all as sequential files ── */
    downloadAll() {
      this.chunks.forEach((chunk, i) => {
        setTimeout(() => this.downloadChunk(chunk), i * 120);
      });
    },

    _safeFilename(str) {
      return str.replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_').slice(0, 64);
    },

    /* ── Helpers ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },
  };
}
