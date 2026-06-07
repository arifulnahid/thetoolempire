/* ── GeoJSON Validator — Alpine component ── */

function geojsonValidatorApp() {
  return {
    inputText: '',
    validated: false,
    issues: [],        /* [{level:'error'|'warning'|'info', title, path, detail}] */
    stats: {},         /* {featureCount, geomTypes, hasCrs, hasName, bbox} */
    isValid: false,    /* no errors */

    init() {},

    /* ── File / drop ── */
    handleFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { this.inputText = ev.target.result; this.validate(); };
      reader.readAsText(file);
      e.target.value = '';
    },
    handleDrop(e) {
      e.preventDefault();
      e.currentTarget.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { this.inputText = ev.target.result; this.validate(); };
      reader.readAsText(file);
    },

    /* ── Sample data ── */
    loadValid() {
      this.inputText = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Eiffel Tower', city: 'Paris', height_m: 330 },
            geometry: { type: 'Point', coordinates: [2.2945, 48.8584] },
          },
          {
            type: 'Feature',
            properties: { name: 'Seine River segment', category: 'river' },
            geometry: {
              type: 'LineString',
              coordinates: [[2.29, 48.86], [2.32, 48.86], [2.35, 48.855], [2.38, 48.848]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Champ de Mars', type: 'park' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[2.293, 48.855], [2.300, 48.857], [2.302, 48.852], [2.295, 48.850], [2.293, 48.855]]],
            },
          },
        ],
      }, null, 2);
      this.validate();
    },

    loadInvalid() {
      this.inputText = `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": null,
      "geometry": {
        "type": "Point",
        "coordinates": [200, 48.8584]
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[2.3, 48.8], [2.4, 48.9], [2.5, 48.8]]]
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "LineString",
        "coordinates": [[2.3, 48.8]]
      }
    },
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[2.3, 48.8], [2.4, 48.9], [2.5, 48.8], [2.3, 48.8]], [[2.35, 48.82], [2.4, 48.85], [2.38, 48.82], [2.35, 48.82]]]
      }
    }
  ]
}`;
      this.validate();
    },

    clear() {
      this.inputText = '';
      this.validated = false;
      this.issues = [];
      this.stats = {};
      this.isValid = false;
    },

    /* ── Core validator ── */
    validate() {
      this.issues = [];
      this.stats = {};
      this.validated = false;
      this.isValid = false;

      const raw = this.inputText.trim();
      if (!raw) return;

      /* 1 — Parse JSON */
      let gj;
      try {
        gj = JSON.parse(raw);
      } catch (e) {
        this.issues.push({ level: 'error', title: 'Invalid JSON', path: '', detail: e.message });
        this.validated = true;
        return;
      }

      /* 2 — Validate recursively */
      this._validateObject(gj, '');

      /* 3 — Collect stats */
      this.stats = this._collectStats(gj);

      this.validated = true;
      this.isValid = !this.issues.some(i => i.level === 'error');
    },

    _validateObject(obj, path) {
      if (obj === null || typeof obj !== 'object') {
        this._err('Expected a JSON object', path, `Got ${obj === null ? 'null' : typeof obj}`);
        return;
      }

      const t = obj.type;
      if (!t) {
        this._err('Missing "type" member', path, 'Every GeoJSON object must have a "type" property.');
        return;
      }

      const GEOM_TYPES = ['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon','GeometryCollection'];
      const ALL_TYPES  = [...GEOM_TYPES, 'Feature', 'FeatureCollection'];

      if (!ALL_TYPES.includes(t)) {
        this._err(`Unknown type "${t}"`, path, `Must be one of: ${ALL_TYPES.join(', ')}`);
        return;
      }

      if (t === 'FeatureCollection') this._validateFC(obj, path);
      else if (t === 'Feature')      this._validateFeature(obj, path);
      else                           this._validateGeometry(obj, path);
    },

    _validateFC(fc, path) {
      if (!Array.isArray(fc.features)) {
        this._err('"features" must be an array', path, 'FeatureCollection requires a "features" array, even if empty.');
        return;
      }
      if (fc.features.length === 0) {
        this._warn('Empty FeatureCollection', path, '"features" array is empty. This is valid GeoJSON but likely unintentional.');
      }
      if (fc.bbox !== undefined) this._validateBbox(fc.bbox, path + '.bbox');
      if (fc.crs !== undefined) {
        this._warn('"crs" member is deprecated', path + '.crs', 'The "crs" member was removed in RFC 7946. CRS is always WGS 84 (EPSG:4326). Remove it to comply with the current spec.');
      }
      fc.features.forEach((f, i) => this._validateObject(f, `${path}.features[${i}]`));
    },

    _validateFeature(f, path) {
      if (f.geometry !== null && f.geometry !== undefined) {
        this._validateGeometry(f.geometry, path + '.geometry');
      } else if (f.geometry === undefined) {
        this._err('Missing "geometry" member', path, 'Feature must have a "geometry" key. Use null for features with no geometry.');
      }
      /* properties may be null or object — both valid */
      if (f.properties === undefined) {
        this._warn('Missing "properties" member', path, 'Feature should have a "properties" key. Use null if there are no properties.');
      }
      if (f.bbox !== undefined) this._validateBbox(f.bbox, path + '.bbox');
      /* id — may be string or number */
      if (f.id !== undefined && typeof f.id !== 'string' && typeof f.id !== 'number') {
        this._warn('"id" must be a string or number', path + '.id', `Got ${typeof f.id}`);
      }
    },

    _validateGeometry(geom, path) {
      if (geom === null) return; /* null geometry is valid */
      if (typeof geom !== 'object') {
        this._err('Geometry must be an object or null', path, `Got ${typeof geom}`);
        return;
      }

      const t = geom.type;
      if (!t) { this._err('Missing "type" in geometry', path); return; }

      if (t === 'GeometryCollection') {
        if (!Array.isArray(geom.geometries)) {
          this._err('"geometries" must be an array', path);
          return;
        }
        if (geom.geometries.length === 0) {
          this._warn('Empty GeometryCollection', path, 'Valid per spec but unusual.');
        }
        geom.geometries.forEach((g, i) => this._validateGeometry(g, `${path}.geometries[${i}]`));
        return;
      }

      const coords = geom.coordinates;
      if (!Array.isArray(coords)) {
        this._err('"coordinates" must be an array', path + '.coordinates', `Type is "${t}" but coordinates is ${coords === undefined ? 'missing' : typeof coords}`);
        return;
      }

      switch (t) {
        case 'Point':
          this._validatePosition(coords, path + '.coordinates');
          break;
        case 'MultiPoint':
          if (coords.length === 0) this._warn('Empty MultiPoint', path);
          coords.forEach((p, i) => this._validatePosition(p, `${path}.coordinates[${i}]`));
          break;
        case 'LineString':
          if (coords.length < 2) this._err('LineString must have at least 2 positions', path + '.coordinates', `Has ${coords.length}`);
          coords.forEach((p, i) => this._validatePosition(p, `${path}.coordinates[${i}]`));
          break;
        case 'MultiLineString':
          if (coords.length === 0) this._warn('Empty MultiLineString', path);
          coords.forEach((line, i) => {
            if (!Array.isArray(line)) { this._err('Each ring must be an array', `${path}.coordinates[${i}]`); return; }
            if (line.length < 2) this._err('Each LineString in MultiLineString must have ≥ 2 positions', `${path}.coordinates[${i}]`, `Has ${line.length}`);
            line.forEach((p, j) => this._validatePosition(p, `${path}.coordinates[${i}][${j}]`));
          });
          break;
        case 'Polygon':
          this._validatePolygonCoords(coords, path + '.coordinates');
          break;
        case 'MultiPolygon':
          if (coords.length === 0) this._warn('Empty MultiPolygon', path);
          coords.forEach((poly, i) => this._validatePolygonCoords(poly, `${path}.coordinates[${i}]`));
          break;
      }
    },

    _validatePolygonCoords(rings, path) {
      if (!Array.isArray(rings) || rings.length === 0) {
        this._err('Polygon must have at least one ring', path);
        return;
      }
      rings.forEach((ring, i) => {
        if (!Array.isArray(ring)) { this._err('Each ring must be an array', `${path}[${i}]`); return; }
        if (ring.length < 4) {
          this._err('Polygon ring must have at least 4 positions (first = last)', `${path}[${i}]`, `Has ${ring.length}. A triangle needs 4 positions: p1, p2, p3, p1.`);
        }
        /* Check ring closure */
        if (ring.length >= 2) {
          const first = ring[0], last = ring[ring.length - 1];
          if (Array.isArray(first) && Array.isArray(last)) {
            if (first[0] !== last[0] || first[1] !== last[1]) {
              this._err('Polygon ring is not closed', `${path}[${i}]`, `First position [${first[0]},${first[1]}] ≠ last [${last[0]},${last[1]}]. The first and last coordinates must be identical.`);
            }
          }
        }
        ring.forEach((p, j) => this._validatePosition(p, `${path}[${i}][${j}]`));
      });
    },

    _validatePosition(pos, path) {
      if (!Array.isArray(pos)) {
        this._err('Position must be an array', path, `Got ${typeof pos}: ${JSON.stringify(pos)}`);
        return;
      }
      if (pos.length < 2) {
        this._err('Position must have at least 2 elements [lon, lat]', path, `Has ${pos.length} element(s)`);
        return;
      }
      const [lon, lat] = pos;
      if (typeof lon !== 'number' || typeof lat !== 'number') {
        this._err('Longitude and latitude must be numbers', path, `Got [${typeof lon}, ${typeof lat}]`);
        return;
      }
      if (!isFinite(lon) || !isFinite(lat)) {
        this._err('Coordinates must be finite numbers', path, `Got [${lon}, ${lat}]`);
        return;
      }
      if (lon < -180 || lon > 180) {
        this._err(`Longitude ${lon} is out of range [-180, 180]`, path, 'Remember GeoJSON uses [longitude, latitude] order, not [latitude, longitude].');
      }
      if (lat < -90 || lat > 90) {
        this._err(`Latitude ${lat} is out of range [-90, 90]`, path, 'Remember GeoJSON uses [longitude, latitude] order, not [latitude, longitude].');
      }
      if (pos.length > 3) {
        this._info('Position has more than 3 elements', path, 'RFC 7946 allows altitude as a 3rd element. Additional elements beyond the 3rd are allowed but applications may ignore them.');
      }
    },

    _validateBbox(bbox, path) {
      if (!Array.isArray(bbox)) { this._err('"bbox" must be an array', path); return; }
      if (bbox.length !== 4 && bbox.length !== 6) {
        this._err('"bbox" must have 4 elements (2D) or 6 elements (3D)', path, `Has ${bbox.length}`);
      }
      if (!bbox.every(n => typeof n === 'number' && isFinite(n))) {
        this._err('All "bbox" values must be finite numbers', path);
      }
    },

    /* ── Stats collector ── */
    _collectStats(gj) {
      const stats = { featureCount: 0, geomTypes: {}, hasName: false, hasBbox: !!gj.bbox, hasCrs: !!gj.crs };
      if (gj.name) stats.hasName = true;
      const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.type === 'Feature') {
          stats.featureCount++;
          if (obj.geometry?.type) {
            stats.geomTypes[obj.geometry.type] = (stats.geomTypes[obj.geometry.type] || 0) + 1;
          }
        } else if (obj.type === 'FeatureCollection') {
          (obj.features || []).forEach(walk);
        } else if (obj.type === 'GeometryCollection') {
          (obj.geometries || []).forEach(walk);
        } else if (obj.type && obj.coordinates) {
          stats.geomTypes[obj.type] = (stats.geomTypes[obj.type] || 0) + 1;
        }
      };
      walk(gj);
      return stats;
    },

    /* ── Issue helpers ── */
    _err(title, path, detail) {
      this.issues.push({ level: 'error', title, path: path || '', detail: detail || '' });
    },
    _warn(title, path, detail) {
      this.issues.push({ level: 'warning', title, path: path || '', detail: detail || '' });
    },
    _info(title, path, detail) {
      this.issues.push({ level: 'info', title, path: path || '', detail: detail || '' });
    },

    /* ── Computed ── */
    get errorCount()   { return this.issues.filter(i => i.level === 'error').length; },
    get warningCount() { return this.issues.filter(i => i.level === 'warning').length; },
    get infoCount()    { return this.issues.filter(i => i.level === 'info').length; },

    get geomTypesSummary() {
      return Object.entries(this.stats.geomTypes || {})
        .map(([k, v]) => `${v} ${k}${v > 1 ? '' : ''}`)
        .join(', ') || 'none';
    },

    get editorClass() {
      if (!this.validated) return '';
      return this.isValid ? 'valid' : 'invalid';
    },

    /* ── Copy / download fixed ── */
    async copyInput() {
      if (!this.inputText) return;
      try { await navigator.clipboard.writeText(this.inputText); }
      catch { const ta=document.createElement('textarea');ta.value=this.inputText;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta); }
      this._toast('Copied to clipboard');
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
