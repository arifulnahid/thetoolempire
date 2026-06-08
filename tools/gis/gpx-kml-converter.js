/* ── GPX ↔ KML Converter — Alpine component ── */

function gpxKmlApp() {
  return {
    direction: 'toKml', /* 'toKml' | 'toGpx' */

    inputText: '',
    outputText: '',
    error: '',
    convertedOk: false,

    waypointCount: 0,
    trackCount: 0,
    routeCount: 0,
    placemarkCount: 0,

    SAMPLE_GPX: `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sample" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Paris Tour</name></metadata>
  <wpt lat="48.8584" lon="2.2945">
    <name>Eiffel Tower</name>
    <desc>Iconic iron lattice tower</desc>
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

    SAMPLE_KML: `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Paris Tour</name>
    <Placemark>
      <name>Eiffel Tower</name>
      <description>Iconic iron lattice tower</description>
      <Point>
        <coordinates>2.2945,48.8584,330</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Seine River Walk</name>
      <LineString>
        <coordinates>2.2945,48.8584,33 2.3200,48.8600,34 2.3500,48.8550,35</coordinates>
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

    loadSample() {
      this.inputText = this.direction === 'toKml' ? this.SAMPLE_GPX : this.SAMPLE_KML;
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
      this.placemarkCount = 0;

      const raw = this.inputText.trim();
      if (!raw) { this.error = 'Paste some input first.'; return; }

      try {
        if (this.direction === 'toKml') {
          this._gpxToKml(raw);
        } else {
          this._kmlToGpx(raw);
        }
        this.convertedOk = true;
      } catch (e) {
        this.error = e.message || 'Conversion failed. Check the input format.';
      }
    },

    /* ════════════════════ GPX → KML ════════════════════ */
    _gpxToKml(raw) {
      const doc = this._parseXml(raw);
      const txt = (el, tag) => el.querySelector(tag)?.textContent?.trim() || '';

      const placemarks = [];

      /* ── Waypoints → Points ── */
      for (const wpt of doc.querySelectorAll('wpt')) {
        const lat = wpt.getAttribute('lat');
        const lon = wpt.getAttribute('lon');
        if (!lat || !lon) continue;
        const ele  = txt(wpt, 'ele');
        const name = txt(wpt, 'name');
        const desc = txt(wpt, 'desc');
        const coord = `${lon},${lat},${ele || 0}`;
        let pm = '    <Placemark>\n';
        if (name) pm += `      <name>${this._escXml(name)}</name>\n`;
        if (desc) pm += `      <description>${this._escXml(desc)}</description>\n`;
        pm += `      <Point>\n        <coordinates>${coord}</coordinates>\n      </Point>\n`;
        pm += '    </Placemark>';
        placemarks.push(pm);
        this.waypointCount++;
      }

      /* ── Tracks → LineString(s) ── */
      for (const trk of doc.querySelectorAll('trk')) {
        const name = txt(trk, 'name');
        const desc = txt(trk, 'desc');
        const segs = [...trk.querySelectorAll('trkseg')];

        for (const seg of segs) {
          const coords = [];
          for (const pt of seg.querySelectorAll('trkpt')) {
            const lat = pt.getAttribute('lat');
            const lon = pt.getAttribute('lon');
            if (!lat || !lon) continue;
            const ele = pt.querySelector('ele')?.textContent?.trim() || '0';
            coords.push(`${lon},${lat},${ele}`);
          }
          if (!coords.length) continue;
          let pm = '    <Placemark>\n';
          if (name) pm += `      <name>${this._escXml(name)}</name>\n`;
          if (desc) pm += `      <description>${this._escXml(desc)}</description>\n`;
          pm += `      <LineString>\n        <coordinates>${coords.join(' ')}</coordinates>\n      </LineString>\n`;
          pm += '    </Placemark>';
          placemarks.push(pm);
        }
        this.trackCount++;
      }

      /* ── Routes → LineString ── */
      for (const rte of doc.querySelectorAll('rte')) {
        const name = txt(rte, 'name');
        const desc = txt(rte, 'desc');
        const coords = [];
        for (const pt of rte.querySelectorAll('rtept')) {
          const lat = pt.getAttribute('lat');
          const lon = pt.getAttribute('lon');
          if (!lat || !lon) continue;
          const ele = pt.querySelector('ele')?.textContent?.trim() || '0';
          coords.push(`${lon},${lat},${ele}`);
        }
        if (!coords.length) continue;
        let pm = '    <Placemark>\n';
        if (name) pm += `      <name>${this._escXml(name)}</name>\n`;
        if (desc) pm += `      <description>${this._escXml(desc)}</description>\n`;
        pm += `      <LineString>\n        <coordinates>${coords.join(' ')}</coordinates>\n      </LineString>\n`;
        pm += '    </Placemark>';
        placemarks.push(pm);
        this.routeCount++;
      }

      const meta = doc.querySelector('metadata');
      const docName = meta ? (meta.querySelector('name')?.textContent?.trim() || '') : '';

      this.outputText =
`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this._escXml(docName || 'Converted from GPX')}</name>
${placemarks.join('\n')}
  </Document>
</kml>`;
    },

    /* ════════════════════ KML → GPX ════════════════════ */
    _kmlToGpx(raw) {
      const doc = this._parseXml(raw);
      const txt = (el, tag) => el.querySelector(tag)?.textContent?.trim() || '';

      const wpts = [];
      const trks = [];

      for (const pm of doc.querySelectorAll('Placemark')) {
        const name = txt(pm, 'name');
        const desc = txt(pm, 'description');

        /* Point → wpt */
        const pointCoords = pm.querySelector('Point > coordinates');
        if (pointCoords) {
          const c = this._parseKmlCoord(pointCoords.textContent.trim());
          if (c) {
            let w = `  <wpt lat="${c.lat}" lon="${c.lon}">\n`;
            if (c.ele !== null) w += `    <ele>${c.ele}</ele>\n`;
            if (name) w += `    <name>${this._escXml(name)}</name>\n`;
            if (desc) w += `    <desc>${this._escXml(desc)}</desc>\n`;
            w += '  </wpt>';
            wpts.push(w);
            this.waypointCount++;
          }
          continue;
        }

        /* LineString → trk */
        const lsCoords = pm.querySelector('LineString > coordinates');
        if (lsCoords) {
          const pts = this._parseKmlCoordList(lsCoords.textContent);
          if (pts.length) {
            let t = '  <trk>\n';
            if (name) t += `    <name>${this._escXml(name)}</name>\n`;
            if (desc) t += `    <desc>${this._escXml(desc)}</desc>\n`;
            t += '    <trkseg>\n';
            for (const p of pts) {
              t += `      <trkpt lat="${p.lat}" lon="${p.lon}">`;
              if (p.ele !== null) t += `\n        <ele>${p.ele}</ele>\n      `;
              t += '</trkpt>\n';
            }
            t += '    </trkseg>\n  </trk>';
            trks.push(t);
            this.trackCount++;
          }
          continue;
        }

        /* Polygon outer ring → trk (approximate) */
        const outerCoords = pm.querySelector('outerBoundaryIs coordinates, outerBoundaryIs LinearRing coordinates');
        if (outerCoords) {
          const pts = this._parseKmlCoordList(outerCoords.textContent);
          if (pts.length) {
            let t = '  <trk>\n';
            if (name) t += `    <name>${this._escXml(name + ' (polygon boundary)')}</name>\n`;
            if (desc) t += `    <desc>${this._escXml(desc)}</desc>\n`;
            t += '    <trkseg>\n';
            for (const p of pts) {
              t += `      <trkpt lat="${p.lat}" lon="${p.lon}">`;
              if (p.ele !== null) t += `\n        <ele>${p.ele}</ele>\n      `;
              t += '</trkpt>\n';
            }
            t += '    </trkseg>\n  </trk>';
            trks.push(t);
            this.trackCount++;
          }
          continue;
        }

        this.placemarkCount++;
      }

      const docName = doc.querySelector('Document > name')?.textContent?.trim() || '';

      this.outputText =
`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="The Tool Empire — gpx-kml-converter"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${this._escXml(docName || 'Converted from KML')}</name>
  </metadata>
${wpts.join('\n')}
${trks.join('\n')}
</gpx>`;
    },

    /* ── Shared helpers ── */
    _parseXml(raw) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(raw, 'text/xml');
      const err = doc.querySelector('parsererror');
      if (err) throw new Error('Invalid XML: ' + err.textContent.split('\n')[0]);
      return doc;
    },

    _parseKmlCoord(s) {
      const parts = s.trim().split(',').map(v => v.trim());
      if (parts.length < 2) return null;
      const lon = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const ele = parts[2] !== undefined ? parseFloat(parts[2]) : null;
      if (isNaN(lon) || isNaN(lat)) return null;
      return { lon: lon.toString(), lat: lat.toString(), ele: ele !== null && !isNaN(ele) ? ele.toString() : null };
    },

    _parseKmlCoordList(s) {
      return s.trim().split(/\s+/).filter(Boolean).map(t => this._parseKmlCoord(t)).filter(Boolean);
    },

    _escXml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },

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

    download() {
      if (!this.outputText) return;
      const isKml = this.direction === 'toKml';
      const mime  = isKml ? 'application/vnd.google-earth.kml+xml' : 'application/gpx+xml';
      const fname = isKml ? 'output.kml' : 'output.gpx';
      const blob  = new Blob([this.outputText], { type: mime });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href = url; a.download = fname; a.click();
      URL.revokeObjectURL(url);
      this._toast(`Downloaded ${fname}`);
    },

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

    clear() {
      this.inputText = '';
      this.outputText = '';
      this.error = '';
      this.convertedOk = false;
      this.waypointCount = 0;
      this.trackCount = 0;
      this.routeCount = 0;
      this.placemarkCount = 0;
    },

    swap() {
      if (this.outputText && this.convertedOk) {
        this.inputText  = this.outputText;
        this.outputText = '';
      }
      this.direction = this.direction === 'toKml' ? 'toGpx' : 'toKml';
      this.error = '';
      this.convertedOk = false;
    },

    get inputFmt()  { return this.direction === 'toKml' ? 'GPX' : 'KML'; },
    get outputFmt() { return this.direction === 'toKml' ? 'KML' : 'GPX'; },
    get inputPlaceholder() {
      return this.direction === 'toKml'
        ? '<?xml version="1.0"?><gpx xmlns="http://www.topografix.com/GPX/1/1">...</gpx>'
        : '<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2">...</kml>';
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
