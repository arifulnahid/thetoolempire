/* ── GeoJSON ↔ KML Converter — Alpine component ── */

function geoConverterApp() {
  return {
    /* ── Direction: 'toKml' | 'toGeoJSON' ── */
    direction: 'toKml',

    /* ── Input / output ── */
    inputText: '',
    outputText: '',
    error: '',
    convertedOk: false,

    /* ── Stats ── */
    featureCount: 0,
    geometryTypes: [],

    /* ── Sample data ── */
    SAMPLE_GEOJSON: `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Eiffel Tower", "city": "Paris" },
      "geometry": { "type": "Point", "coordinates": [2.2945, 48.8584] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Seine River Path" },
      "geometry": {
        "type": "LineString",
        "coordinates": [[2.2945,48.8584],[2.3200,48.8600],[2.3500,48.8550]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Champ de Mars" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[2.2900,48.8560],[2.3000,48.8560],[2.3000,48.8610],[2.2900,48.8610],[2.2900,48.8560]]]
      }
    }
  ]
}`,

    SAMPLE_KML: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Sample Places</name>
    <Placemark>
      <name>Eiffel Tower</name>
      <description>Landmark in Paris</description>
      <Point>
        <coordinates>2.2945,48.8584,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Seine River Path</name>
      <LineString>
        <coordinates>2.2945,48.8584,0 2.3200,48.8600,0 2.3500,48.8550,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Champ de Mars</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>2.2900,48.8560,0 2.3000,48.8560,0 2.3000,48.8610,0 2.2900,48.8610,0 2.2900,48.8560,0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`,

    init() {},

    /* ── Load sample ── */
    loadSample() {
      this.inputText = this.direction === 'toKml' ? this.SAMPLE_GEOJSON : this.SAMPLE_KML;
      this.outputText = '';
      this.error = '';
      this.convertedOk = false;
    },

    /* ── Convert ── */
    convert() {
      this.error = '';
      this.outputText = '';
      this.convertedOk = false;
      this.featureCount = 0;
      this.geometryTypes = [];

      const raw = this.inputText.trim();
      if (!raw) { this.error = 'Paste some input first.'; return; }

      try {
        if (this.direction === 'toKml') {
          this._geoJsonToKml(raw);
        } else {
          this._kmlToGeoJson(raw);
        }
        this.convertedOk = true;
      } catch (e) {
        this.error = e.message || 'Conversion failed. Check the input format.';
      }
    },

    /* ════════════════════ GeoJSON → KML ════════════════════ */
    _geoJsonToKml(raw) {
      let gj;
      try { gj = JSON.parse(raw); } catch { throw new Error('Invalid JSON — check for missing commas, brackets, or quotes.'); }

      const features = this._extractFeatures(gj);
      this.featureCount = features.length;
      const typeSet = new Set();

      const placemarks = features.map(f => {
        const geom = f.geometry;
        const props = f.properties || {};
        const name  = props.name || props.Name || props.title || '';
        const desc  = props.description || props.desc || '';
        if (geom) typeSet.add(geom.type);
        return this._featureToPlacemark(name, desc, props, geom);
      }).join('\n');

      this.geometryTypes = [...typeSet];

      const docName = gj.name || (gj.features ? 'FeatureCollection' : 'GeoJSON');
      this.outputText =
`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this._escXml(docName)}</name>
${placemarks}
  </Document>
</kml>`;
    },

    _extractFeatures(gj) {
      if (gj.type === 'FeatureCollection') return gj.features || [];
      if (gj.type === 'Feature') return [gj];
      /* Plain geometry object */
      if (gj.type) return [{ type:'Feature', properties:{}, geometry: gj }];
      throw new Error('Unrecognised GeoJSON: root must be FeatureCollection, Feature, or a geometry object.');
    },

    _featureToPlacemark(name, desc, props, geom) {
      const extData = this._propsToExtendedData(props);
      const geomKml = geom ? this._geomToKml(geom) : '';
      return [
        '    <Placemark>',
        name  ? `      <name>${this._escXml(name)}</name>`        : '',
        desc  ? `      <description>${this._escXml(desc)}</description>` : '',
        extData,
        geomKml,
        '    </Placemark>',
      ].filter(Boolean).join('\n');
    },

    _propsToExtendedData(props) {
      const skip = new Set(['name','Name','title','description','desc']);
      const entries = Object.entries(props).filter(([k]) => !skip.has(k));
      if (!entries.length) return '';
      const data = entries.map(([k,v]) =>
        `        <Data name="${this._escXml(k)}"><value>${this._escXml(String(v))}</value></Data>`
      ).join('\n');
      return `      <ExtendedData>\n${data}\n      </ExtendedData>`;
    },

    _geomToKml(geom) {
      switch (geom.type) {
        case 'Point':
          return `      <Point>\n        <coordinates>${this._coord(geom.coordinates)}</coordinates>\n      </Point>`;
        case 'MultiPoint':
          return geom.coordinates.map(c =>
            `      <Point>\n        <coordinates>${this._coord(c)}</coordinates>\n      </Point>`
          ).join('\n');
        case 'LineString':
          return `      <LineString>\n        <coordinates>${this._coordList(geom.coordinates)}</coordinates>\n      </LineString>`;
        case 'MultiLineString':
          return geom.coordinates.map(ring =>
            `      <LineString>\n        <coordinates>${this._coordList(ring)}</coordinates>\n      </LineString>`
          ).join('\n');
        case 'Polygon':
          return this._polygonToKml(geom.coordinates);
        case 'MultiPolygon':
          return geom.coordinates.map(poly => this._polygonToKml(poly)).join('\n');
        case 'GeometryCollection':
          return (geom.geometries || []).map(g => this._geomToKml(g)).join('\n');
        default:
          return `      <!-- Unsupported geometry: ${geom.type} -->`;
      }
    },

    _polygonToKml(rings) {
      const outer = rings[0];
      const inners = rings.slice(1);
      let kml = '      <Polygon>\n';
      kml += '        <outerBoundaryIs><LinearRing>\n';
      kml += `          <coordinates>${this._coordList(outer)}</coordinates>\n`;
      kml += '        </LinearRing></outerBoundaryIs>\n';
      for (const inner of inners) {
        kml += '        <innerBoundaryIs><LinearRing>\n';
        kml += `          <coordinates>${this._coordList(inner)}</coordinates>\n`;
        kml += '        </LinearRing></innerBoundaryIs>\n';
      }
      kml += '      </Polygon>';
      return kml;
    },

    _coord(c)     { return `${c[0]},${c[1]},${c[2] || 0}`; },
    _coordList(cs){ return cs.map(c => this._coord(c)).join(' '); },

    /* ════════════════════ KML → GeoJSON ════════════════════ */
    _kmlToGeoJson(raw) {
      let doc;
      try {
        const parser = new DOMParser();
        doc = parser.parseFromString(raw, 'text/xml');
        const parseErr = doc.querySelector('parsererror');
        if (parseErr) throw new Error(parseErr.textContent.split('\n')[0]);
      } catch(e) {
        throw new Error('Invalid XML: ' + (e.message || 'parse error'));
      }

      const placemarks = [...doc.querySelectorAll('Placemark')];
      this.featureCount = placemarks.length;
      const typeSet = new Set();

      const features = placemarks.map(pm => {
        const name = pm.querySelector('name')?.textContent?.trim() || '';
        const desc = pm.querySelector('description')?.textContent?.trim() || '';
        const props = { ...(name ? {name} : {}), ...(desc ? {description:desc} : {}) };

        /* ExtendedData */
        for (const d of pm.querySelectorAll('ExtendedData > Data')) {
          const k = d.getAttribute('name');
          const v = d.querySelector('value')?.textContent;
          if (k) props[k] = v ?? '';
        }
        /* SimpleData */
        for (const sd of pm.querySelectorAll('SimpleData')) {
          const k = sd.getAttribute('name');
          if (k) props[k] = sd.textContent;
        }

        const geom = this._pmToGeom(pm, typeSet);
        return { type:'Feature', properties: props, geometry: geom };
      });

      this.geometryTypes = [...typeSet];

      const fc = { type:'FeatureCollection', features };
      this.outputText = JSON.stringify(fc, null, 2);
    },

    _pmToGeom(pm, typeSet) {
      /* Try each geometry element in order */
      const point = pm.querySelector('Point > coordinates');
      if (point) {
        typeSet.add('Point');
        return { type:'Point', coordinates: this._parseCoord(point.textContent.trim()) };
      }

      const ls = pm.querySelector('LineString > coordinates');
      if (ls) {
        typeSet.add('LineString');
        return { type:'LineString', coordinates: this._parseCoordList(ls.textContent) };
      }

      const poly = pm.querySelector('Polygon');
      if (poly) {
        typeSet.add('Polygon');
        return this._parsePoly(poly);
      }

      const mls = [...pm.querySelectorAll('MultiGeometry > LineString')];
      if (mls.length) {
        typeSet.add('MultiLineString');
        return { type:'MultiLineString', coordinates: mls.map(l => this._parseCoordList(l.querySelector('coordinates').textContent)) };
      }

      const mp = [...pm.querySelectorAll('MultiGeometry > Point')];
      if (mp.length) {
        typeSet.add('MultiPoint');
        return { type:'MultiPoint', coordinates: mp.map(p => this._parseCoord(p.querySelector('coordinates').textContent.trim())) };
      }

      const mpoly = [...pm.querySelectorAll('MultiGeometry > Polygon')];
      if (mpoly.length) {
        typeSet.add('MultiPolygon');
        return { type:'MultiPolygon', coordinates: mpoly.map(p => this._parsePoly(p).coordinates) };
      }

      return null;
    },

    _parsePoly(poly) {
      const rings = [];
      const outer = poly.querySelector('outerBoundaryIs coordinates') ||
                    poly.querySelector('outerBoundaryIs LinearRing coordinates');
      if (outer) rings.push(this._parseCoordList(outer.textContent));
      for (const inner of poly.querySelectorAll('innerBoundaryIs coordinates, innerBoundaryIs LinearRing coordinates')) {
        rings.push(this._parseCoordList(inner.textContent));
      }
      return { type:'Polygon', coordinates: rings };
    },

    _parseCoord(s) {
      const parts = s.trim().split(',').map(Number);
      return parts.length >= 3 ? parts.slice(0,3) : parts.slice(0,2);
    },

    _parseCoordList(s) {
      return s.trim().split(/\s+/).filter(Boolean).map(t => this._parseCoord(t));
    },

    /* ════════════════════ Utilities ════════════════════ */
    _escXml(s) {
      return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&apos;');
    },

    /* ── Copy ── */
    async copyOutput() {
      if (!this.outputText) return;
      try {
        await navigator.clipboard.writeText(this.outputText);
        this._toast('Copied to clipboard');
      } catch {
        this._fallbackCopy(this.outputText);
      }
    },

    _fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      this._toast('Copied to clipboard');
    },

    /* ── Download ── */
    download() {
      if (!this.outputText) return;
      const isKml  = this.direction === 'toKml';
      const mime   = isKml ? 'application/vnd.google-earth.kml+xml' : 'application/geo+json';
      const fname  = isKml ? 'output.kml' : 'output.geojson';
      const blob   = new Blob([this.outputText], { type: mime });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      a.href=url; a.download=fname; a.click();
      URL.revokeObjectURL(url);
      this._toast(`Downloaded ${fname}`);
    },

    /* ── File upload ── */
    handleFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        this.inputText = ev.target.result;
        this.outputText = '';
        this.error = '';
        this.convertedOk = false;
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
      reader.onload = ev => { this.inputText = ev.target.result; this.outputText=''; this.error=''; this.convertedOk=false; };
      reader.readAsText(file);
    },

    /* ── Clear ── */
    clear() {
      this.inputText = '';
      this.outputText = '';
      this.error = '';
      this.convertedOk = false;
      this.featureCount = 0;
      this.geometryTypes = [];
    },

    /* ── Swap direction ── */
    swap() {
      if (this.outputText && this.convertedOk) {
        this.inputText  = this.outputText;
        this.outputText = '';
      }
      this.direction = this.direction === 'toKml' ? 'toGeoJSON' : 'toKml';
      this.error = '';
      this.convertedOk = false;
    },

    /* ── Input format label ── */
    get inputFmt()  { return this.direction === 'toKml' ? 'GeoJSON' : 'KML'; },
    get outputFmt() { return this.direction === 'toKml' ? 'KML'     : 'GeoJSON'; },
    get inputPlaceholder() {
      return this.direction === 'toKml'
        ? '{ "type": "FeatureCollection", "features": [...] }'
        : '<?xml version="1.0"?><kml><Document>...</Document></kml>';
    },

    /* ── FAQ ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
