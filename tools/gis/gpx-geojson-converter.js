/* ── GPX ↔ GeoJSON Converter — Alpine component ── */

function gpxConverterApp() {
  return {
    direction: 'toGeoJSON', /* 'toGeoJSON' | 'toGpx' */

    inputText: '',
    outputText: '',
    error: '',
    convertedOk: false,

    /* stats */
    waypointCount: 0,
    trackCount: 0,
    routeCount: 0,
    featureCount: 0,

    SAMPLE_GPX: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sample" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Sample GPX</name>
  </metadata>
  <wpt lat="48.8584" lon="2.2945">
    <name>Eiffel Tower</name>
    <desc>Iconic iron lattice tower in Paris</desc>
    <ele>330</ele>
  </wpt>
  <wpt lat="48.8606" lon="2.3376">
    <name>Louvre Museum</name>
    <ele>34</ele>
  </wpt>
  <trk>
    <name>Seine River Walk</name>
    <desc>Walk along the Seine</desc>
    <trkseg>
      <trkpt lat="48.8584" lon="2.2945"><ele>33</ele><time>2026-06-07T09:00:00Z</time></trkpt>
      <trkpt lat="48.8600" lon="2.3200"><ele>34</ele><time>2026-06-07T09:15:00Z</time></trkpt>
      <trkpt lat="48.8550" lon="2.3500"><ele>35</ele><time>2026-06-07T09:30:00Z</time></trkpt>
    </trkseg>
  </trk>
  <rte>
    <name>Planned Route</name>
    <rtept lat="48.8606" lon="2.3376"><name>Start — Louvre</name></rtept>
    <rtept lat="48.8584" lon="2.2945"><name>End — Eiffel Tower</name></rtept>
  </rte>
</gpx>`,

    SAMPLE_GEOJSON: `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [2.2945, 48.8584, 330] },
      "properties": { "name": "Eiffel Tower", "description": "Iconic iron lattice tower in Paris", "_gpxType": "wpt" }
    },
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [2.3376, 48.8606, 34] },
      "properties": { "name": "Louvre Museum", "_gpxType": "wpt" }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [2.2945, 48.8584, 33],
          [2.3200, 48.8600, 34],
          [2.3500, 48.8550, 35]
        ]
      },
      "properties": { "name": "Seine River Walk", "description": "Walk along the Seine", "_gpxType": "trk" }
    }
  ]
}`,

    init() {},

    loadSample() {
      this.inputText = this.direction === 'toGeoJSON' ? this.SAMPLE_GPX : this.SAMPLE_GEOJSON;
      this.outputText = '';
      this.error = '';
      this.convertedOk = false;
    },

    convert() {
      this.error = '';
      this.outputText = '';
      this.convertedOk = false;
      this.waypointCount = 0;
      this.trackCount = 0;
      this.routeCount = 0;
      this.featureCount = 0;

      const raw = this.inputText.trim();
      if (!raw) { this.error = 'Paste some input first.'; return; }

      try {
        if (this.direction === 'toGeoJSON') {
          this._gpxToGeoJson(raw);
        } else {
          this._geoJsonToGpx(raw);
        }
        this.convertedOk = true;
      } catch (e) {
        this.error = e.message || 'Conversion failed. Check the input format.';
      }
    },

    /* ════════════════════ GPX → GeoJSON ════════════════════ */
    _gpxToGeoJson(raw) {
      let doc;
      try {
        const parser = new DOMParser();
        doc = parser.parseFromString(raw, 'text/xml');
        const err = doc.querySelector('parsererror');
        if (err) throw new Error(err.textContent.split('\n')[0]);
      } catch (e) {
        throw new Error('Invalid XML: ' + (e.message || 'parse error'));
      }

      /* Detect namespace — GPX 1.0 and 1.1 differ */
      const ns = doc.documentElement.getAttribute('xmlns') || '';
      const sel = (tag) => [...doc.querySelectorAll(tag)];
      const txt = (el, tag) => el.querySelector(tag)?.textContent?.trim() || '';

      const features = [];

      /* ── Waypoints ── */
      for (const wpt of sel('wpt')) {
        const lat = parseFloat(wpt.getAttribute('lat'));
        const lon = parseFloat(wpt.getAttribute('lon'));
        if (isNaN(lat) || isNaN(lon)) continue;
        const ele = txt(wpt, 'ele');
        const coords = ele ? [lon, lat, parseFloat(ele)] : [lon, lat];
        const props = { _gpxType: 'wpt' };
        const name = txt(wpt, 'name'); if (name) props.name = name;
        const desc = txt(wpt, 'desc'); if (desc) props.description = desc;
        const sym  = txt(wpt, 'sym');  if (sym)  props.sym = sym;
        const cmt  = txt(wpt, 'cmt');  if (cmt)  props.comment = cmt;
        const time = txt(wpt, 'time'); if (time) props.time = time;
        features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: props });
        this.waypointCount++;
      }

      /* ── Tracks ── */
      for (const trk of sel('trk')) {
        const trkName = txt(trk, 'name');
        const trkDesc = txt(trk, 'desc');
        const trkCmt  = txt(trk, 'cmt');
        const segs = [...trk.querySelectorAll('trkseg')];

        if (segs.length === 1) {
          /* Single segment → LineString */
          const coords = this._parseTrkSeg(segs[0], txt);
          if (!coords.length) continue;
          const props = { _gpxType: 'trk' };
          if (trkName) props.name = trkName;
          if (trkDesc) props.description = trkDesc;
          if (trkCmt)  props.comment = trkCmt;
          /* Collect times as array property if present */
          const times = this._parseTrkSegTimes(segs[0]);
          if (times.length) props.coordTimes = times;
          features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props });
        } else if (segs.length > 1) {
          /* Multiple segments → MultiLineString */
          const lines = segs.map(s => this._parseTrkSeg(s, txt)).filter(c => c.length);
          if (!lines.length) continue;
          const props = { _gpxType: 'trk' };
          if (trkName) props.name = trkName;
          if (trkDesc) props.description = trkDesc;
          const allTimes = segs.map(s => this._parseTrkSegTimes(s));
          if (allTimes.some(t => t.length)) props.coordTimes = allTimes;
          features.push({ type: 'Feature', geometry: { type: 'MultiLineString', coordinates: lines }, properties: props });
        }
        this.trackCount++;
      }

      /* ── Routes ── */
      for (const rte of sel('rte')) {
        const rteName = txt(rte, 'name');
        const rteDesc = txt(rte, 'desc');
        const rtepts  = [...rte.querySelectorAll('rtept')];
        const coords  = [];
        for (const pt of rtepts) {
          const lat = parseFloat(pt.getAttribute('lat'));
          const lon = parseFloat(pt.getAttribute('lon'));
          if (isNaN(lat) || isNaN(lon)) continue;
          const ele = txt(pt, 'ele');
          coords.push(ele ? [lon, lat, parseFloat(ele)] : [lon, lat]);
        }
        if (!coords.length) continue;
        const props = { _gpxType: 'rte' };
        if (rteName) props.name = rteName;
        if (rteDesc) props.description = rteDesc;
        /* Route point names as array */
        const ptNames = rtepts.map(p => txt(p, 'name')).filter(Boolean);
        if (ptNames.length) props.routePointNames = ptNames;
        features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: props });
        this.routeCount++;
      }

      this.featureCount = features.length;

      const meta = doc.querySelector('metadata');
      const fcName = meta ? txt(meta, 'name') : '';
      const fc = { type: 'FeatureCollection', features };
      if (fcName) fc.name = fcName;
      this.outputText = JSON.stringify(fc, null, 2);
    },

    _parseTrkSeg(seg, txt) {
      const coords = [];
      for (const pt of seg.querySelectorAll('trkpt')) {
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        if (isNaN(lat) || isNaN(lon)) continue;
        const ele = pt.querySelector('ele')?.textContent?.trim();
        coords.push(ele ? [lon, lat, parseFloat(ele)] : [lon, lat]);
      }
      return coords;
    },

    _parseTrkSegTimes(seg) {
      const times = [];
      for (const pt of seg.querySelectorAll('trkpt')) {
        const t = pt.querySelector('time')?.textContent?.trim();
        times.push(t || null);
      }
      return times.some(t => t !== null) ? times : [];
    },

    /* ════════════════════ GeoJSON → GPX ════════════════════ */
    _geoJsonToGpx(raw) {
      let gj;
      try { gj = JSON.parse(raw); } catch { throw new Error('Invalid JSON — check for missing commas, brackets, or quotes.'); }

      const features = this._extractFeatures(gj);
      this.featureCount = features.length;

      const wpts   = [];
      const trks   = [];
      const rtes   = [];

      for (const f of features) {
        const geom  = f.geometry;
        const props = f.properties || {};
        if (!geom) continue;

        const hint = (props._gpxType || '').toLowerCase();

        if (geom.type === 'Point') {
          /* Points → waypoints */
          wpts.push(this._pointToWpt(geom.coordinates, props));
          this.waypointCount++;
        } else if (geom.type === 'LineString') {
          if (hint === 'rte') {
            rtes.push(this._lineToRte(geom.coordinates, props));
            this.routeCount++;
          } else {
            trks.push(this._lineToTrk(geom.coordinates, props));
            this.trackCount++;
          }
        } else if (geom.type === 'MultiLineString') {
          trks.push(this._multiLineToTrk(geom.coordinates, props));
          this.trackCount++;
        } else if (geom.type === 'MultiPoint') {
          for (const c of geom.coordinates) {
            wpts.push(this._pointToWpt(c, props));
            this.waypointCount++;
          }
        }
        /* Polygons and other types have no GPX equivalent — skipped */
      }

      const name = gj.name || 'Exported from GeoJSON';
      this.outputText =
`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="The Tool Empire — gpx-geojson-converter"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${this._escXml(name)}</name>
  </metadata>
${wpts.join('\n')}
${trks.join('\n')}
${rtes.join('\n')}
</gpx>`;
    },

    _pointToWpt(coords, props) {
      const lon = coords[0], lat = coords[1], ele = coords[2];
      const name = props.name || props.Name || props.title || '';
      const desc = props.description || props.desc || '';
      const sym  = props.sym || '';
      const time = props.time || '';
      let xml = `  <wpt lat="${lat}" lon="${lon}">`;
      if (ele !== undefined) xml += `\n    <ele>${ele}</ele>`;
      if (time) xml += `\n    <time>${this._escXml(time)}</time>`;
      if (name) xml += `\n    <name>${this._escXml(name)}</name>`;
      if (desc) xml += `\n    <desc>${this._escXml(desc)}</desc>`;
      if (sym)  xml += `\n    <sym>${this._escXml(sym)}</sym>`;
      xml += '\n  </wpt>';
      return xml;
    },

    _lineToTrk(coords, props) {
      const name  = props.name || props.Name || '';
      const desc  = props.description || props.desc || '';
      const times = props.coordTimes || [];
      let xml = '  <trk>';
      if (name) xml += `\n    <name>${this._escXml(name)}</name>`;
      if (desc) xml += `\n    <desc>${this._escXml(desc)}</desc>`;
      xml += '\n    <trkseg>';
      for (let i = 0; i < coords.length; i++) {
        const [lon, lat, ele] = coords[i];
        xml += `\n      <trkpt lat="${lat}" lon="${lon}">`;
        if (ele !== undefined) xml += `\n        <ele>${ele}</ele>`;
        const t = Array.isArray(times) && times[i];
        if (t) xml += `\n        <time>${this._escXml(t)}</time>`;
        xml += '\n      </trkpt>';
      }
      xml += '\n    </trkseg>';
      xml += '\n  </trk>';
      return xml;
    },

    _multiLineToTrk(lines, props) {
      const name  = props.name || props.Name || '';
      const desc  = props.description || props.desc || '';
      const allTimes = props.coordTimes || [];
      let xml = '  <trk>';
      if (name) xml += `\n    <name>${this._escXml(name)}</name>`;
      if (desc) xml += `\n    <desc>${this._escXml(desc)}</desc>`;
      for (let si = 0; si < lines.length; si++) {
        const segTimes = Array.isArray(allTimes[si]) ? allTimes[si] : [];
        xml += '\n    <trkseg>';
        for (let i = 0; i < lines[si].length; i++) {
          const [lon, lat, ele] = lines[si][i];
          xml += `\n      <trkpt lat="${lat}" lon="${lon}">`;
          if (ele !== undefined) xml += `\n        <ele>${ele}</ele>`;
          const t = segTimes[i];
          if (t) xml += `\n        <time>${this._escXml(t)}</time>`;
          xml += '\n      </trkpt>';
        }
        xml += '\n    </trkseg>';
      }
      xml += '\n  </trk>';
      return xml;
    },

    _lineToRte(coords, props) {
      const name   = props.name || props.Name || '';
      const desc   = props.description || props.desc || '';
      const ptNames = props.routePointNames || [];
      let xml = '  <rte>';
      if (name) xml += `\n    <name>${this._escXml(name)}</name>`;
      if (desc) xml += `\n    <desc>${this._escXml(desc)}</desc>`;
      for (let i = 0; i < coords.length; i++) {
        const [lon, lat, ele] = coords[i];
        xml += `\n    <rtept lat="${lat}" lon="${lon}">`;
        if (ele !== undefined) xml += `\n      <ele>${ele}</ele>`;
        const pn = ptNames[i];
        if (pn) xml += `\n      <name>${this._escXml(pn)}</name>`;
        xml += '\n    </rtept>';
      }
      xml += '\n  </rte>';
      return xml;
    },

    /* ── Shared helpers ── */
    _extractFeatures(gj) {
      if (gj.type === 'FeatureCollection') return gj.features || [];
      if (gj.type === 'Feature') return [gj];
      if (gj.type) return [{ type: 'Feature', properties: {}, geometry: gj }];
      throw new Error('Unrecognised GeoJSON: root must be FeatureCollection, Feature, or a geometry object.');
    },

    _escXml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
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
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      this._toast('Copied to clipboard');
    },

    /* ── Download ── */
    download() {
      if (!this.outputText) return;
      const isGeoJson = this.direction === 'toGeoJSON';
      const mime  = isGeoJson ? 'application/geo+json' : 'application/gpx+xml';
      const fname = isGeoJson ? 'output.geojson' : 'output.gpx';
      const blob  = new Blob([this.outputText], { type: mime });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href = url; a.download = fname; a.click();
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
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { this.inputText = ev.target.result; this.outputText = ''; this.error = ''; this.convertedOk = false; };
      reader.readAsText(file);
    },

    /* ── Clear ── */
    clear() {
      this.inputText = '';
      this.outputText = '';
      this.error = '';
      this.convertedOk = false;
      this.waypointCount = 0;
      this.trackCount = 0;
      this.routeCount = 0;
      this.featureCount = 0;
    },

    /* ── Swap ── */
    swap() {
      if (this.outputText && this.convertedOk) {
        this.inputText  = this.outputText;
        this.outputText = '';
      }
      this.direction = this.direction === 'toGeoJSON' ? 'toGpx' : 'toGeoJSON';
      this.error = '';
      this.convertedOk = false;
    },

    get inputFmt()  { return this.direction === 'toGeoJSON' ? 'GPX'     : 'GeoJSON'; },
    get outputFmt() { return this.direction === 'toGeoJSON' ? 'GeoJSON' : 'GPX'; },
    get inputPlaceholder() {
      return this.direction === 'toGeoJSON'
        ? '<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1">...</gpx>'
        : '{ "type": "FeatureCollection", "features": [...] }';
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
