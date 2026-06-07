/* ── CSV Coordinates → GIS Formats — Alpine component ── */

function csvToGisApp() {
  return {
    /* ── Input ── */
    csvText: '',
    delimiter: 'auto',   /* 'auto' | ',' | ';' | '\t' | '|' */
    hasHeader: true,

    /* ── Column mapping ── */
    headers: [],         /* detected column names / indices */
    latCol: '',
    lngCol: '',
    nameCol: '',
    altCol: '',

    /* ── Output format ── */
    outputFmt: 'geojson', /* 'geojson' | 'kml' | 'gpx' | 'wkt' */

    /* ── State ── */
    parsed: [],          /* array of row objects */
    outputText: '',
    error: '',
    convertedOk: false,
    rowCount: 0,
    skippedCount: 0,
    previewRows: [],

    SAMPLE_CSV:
`name,latitude,longitude,altitude,category
Eiffel Tower,48.8584,2.2945,330,landmark
Louvre Museum,48.8606,2.3376,34,museum
Notre-Dame Cathedral,48.8530,2.3499,35,landmark
Arc de Triomphe,48.8738,2.2950,50,landmark
Sacré-Cœur,48.8867,2.3431,130,church
Musée d'Orsay,48.8600,2.3266,36,museum`,

    init() {},

    /* ── Load sample ── */
    loadSample() {
      this.csvText = this.SAMPLE_CSV;
      this.error = '';
      this.outputText = '';
      this.convertedOk = false;
      this._parseHeaders();
    },

    /* ── Auto-detect delimiter ── */
    _detectDelim(line) {
      if (this.delimiter !== 'auto') return this.delimiter === '\\t' ? '\t' : this.delimiter;
      const counts = { ',': 0, ';': 0, '\t': 0, '|': 0 };
      for (const ch of line) if (ch in counts) counts[ch]++;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    },

    /* ── Parse a single CSV line respecting quoted fields ── */
    _parseLine(line, delim) {
      const fields = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === delim && !inQ) {
          fields.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      fields.push(cur.trim());
      return fields;
    },

    /* ── Parse headers from first line ── */
    _parseHeaders() {
      const lines = this.csvText.trim().split(/\r?\n/).filter(Boolean);
      if (!lines.length) { this.headers = []; return; }
      const delim = this._detectDelim(lines[0]);
      const firstLine = this._parseLine(lines[0], delim);
      if (this.hasHeader) {
        this.headers = firstLine.map((h, i) => ({ label: h || `Column ${i + 1}`, value: String(i) }));
      } else {
        this.headers = firstLine.map((_, i) => ({ label: `Column ${i + 1}`, value: String(i) }));
      }
      /* Auto-detect common column names */
      const lower = this.headers.map(h => h.label.toLowerCase());
      this.latCol  = this._autoCol(lower, ['lat','latitude','y','ylat','lat_dd','latdd']) || this.headers[0]?.value || '';
      this.lngCol  = this._autoCol(lower, ['lon','lng','long','longitude','x','xlon','lon_dd','londd']) || this.headers[1]?.value || '';
      this.nameCol = this._autoCol(lower, ['name','title','label','place','location','id','placename']) || '';
      this.altCol  = this._autoCol(lower, ['alt','altitude','ele','elevation','elev','height','z']) || '';
      /* Live preview */
      this._buildPreview(lines, delim);
    },

    _autoCol(lower, candidates) {
      for (const c of candidates) {
        const idx = lower.indexOf(c);
        if (idx !== -1) return String(idx);
      }
      return null;
    },

    _buildPreview(lines, delim) {
      const dataLines = this.hasHeader ? lines.slice(1) : lines;
      this.previewRows = dataLines.slice(0, 5).map(l => this._parseLine(l, delim));
    },

    /* ── Full parse ── */
    _parseAll() {
      const lines = this.csvText.trim().split(/\r?\n/).filter(Boolean);
      if (!lines.length) throw new Error('Input is empty.');
      const delim = this._detectDelim(lines[0]);
      const dataLines = this.hasHeader ? lines.slice(1) : lines;
      if (!dataLines.length) throw new Error('No data rows found (only a header row).');

      const latIdx = parseInt(this.latCol, 10);
      const lngIdx = parseInt(this.lngCol, 10);
      if (isNaN(latIdx) || isNaN(lngIdx)) throw new Error('Select the latitude and longitude columns.');

      const nameIdx = this.nameCol !== '' ? parseInt(this.nameCol, 10) : -1;
      const altIdx  = this.altCol  !== '' ? parseInt(this.altCol,  10) : -1;

      const rows = [];
      let skipped = 0;

      for (let i = 0; i < dataLines.length; i++) {
        const fields = this._parseLine(dataLines[i], delim);
        const rawLat = fields[latIdx];
        const rawLng = fields[lngIdx];
        const lat = parseFloat(rawLat);
        const lng = parseFloat(rawLng);
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          skipped++;
          continue;
        }
        const name = nameIdx >= 0 ? (fields[nameIdx] || '') : '';
        const alt  = altIdx  >= 0 ? parseFloat(fields[altIdx]) : null;
        /* Collect all remaining fields as extra properties */
        const props = {};
        if (this.hasHeader) {
          this.headers.forEach((h, ci) => {
            if (ci !== latIdx && ci !== lngIdx && fields[ci] !== undefined) {
              props[h.label] = fields[ci];
            }
          });
        }
        rows.push({ lat, lng, name, alt: isNaN(alt) ? null : alt, props });
      }

      if (!rows.length) throw new Error(`No valid coordinate rows found. ${skipped} row(s) skipped due to invalid or out-of-range values.`);
      this.skippedCount = skipped;
      return rows;
    },

    /* ── Convert ── */
    convert() {
      this.error = '';
      this.outputText = '';
      this.convertedOk = false;
      this.rowCount = 0;
      this.skippedCount = 0;

      if (!this.csvText.trim()) { this.error = 'Paste CSV data first.'; return; }
      if (!this.latCol && this.latCol !== '0') { this.error = 'Select the latitude column.'; return; }
      if (!this.lngCol && this.lngCol !== '0') { this.error = 'Select the longitude column.'; return; }

      try {
        const rows = this._parseAll();
        this.rowCount = rows.length;
        switch (this.outputFmt) {
          case 'geojson': this.outputText = this._toGeoJSON(rows); break;
          case 'kml':     this.outputText = this._toKML(rows);     break;
          case 'gpx':     this.outputText = this._toGPX(rows);     break;
          case 'wkt':     this.outputText = this._toWKT(rows);     break;
        }
        this.convertedOk = true;
      } catch (e) {
        this.error = e.message || 'Conversion failed.';
      }
    },

    /* ════ GeoJSON output ════ */
    _toGeoJSON(rows) {
      const features = rows.map(r => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: r.alt !== null ? [r.lng, r.lat, r.alt] : [r.lng, r.lat],
        },
        properties: r.props,
      }));
      return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
    },

    /* ════ KML output ════ */
    _toKML(rows) {
      const placemarks = rows.map(r => {
        const coord = r.alt !== null ? `${r.lng},${r.lat},${r.alt}` : `${r.lng},${r.lat},0`;
        const name  = r.name ? `      <name>${this._escXml(r.name)}</name>\n` : '';
        /* Extended data from extra props */
        const extEntries = Object.entries(r.props)
          .filter(([k]) => k !== r.name)
          .map(([k, v]) => `        <Data name="${this._escXml(k)}"><value>${this._escXml(String(v))}</value></Data>`)
          .join('\n');
        const ext = extEntries ? `      <ExtendedData>\n${extEntries}\n      </ExtendedData>\n` : '';
        return `    <Placemark>\n${name}${ext}      <Point><coordinates>${coord}</coordinates></Point>\n    </Placemark>`;
      }).join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Converted from CSV</name>
${placemarks}
  </Document>
</kml>`;
    },

    /* ════ GPX output ════ */
    _toGPX(rows) {
      const wpts = rows.map(r => {
        let w = `  <wpt lat="${r.lat}" lon="${r.lng}">\n`;
        if (r.alt !== null) w += `    <ele>${r.alt}</ele>\n`;
        if (r.name) w += `    <name>${this._escXml(r.name)}</name>\n`;
        w += '  </wpt>';
        return w;
      }).join('\n');
      return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="The Tool Empire — csv-to-gis"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata><name>Converted from CSV</name></metadata>
${wpts}
</gpx>`;
    },

    /* ════ WKT output ════ */
    _toWKT(rows) {
      return rows.map(r => {
        const coord = r.alt !== null ? `${r.lng} ${r.lat} ${r.alt}` : `${r.lng} ${r.lat}`;
        const geom = r.alt !== null ? `POINT Z (${coord})` : `POINT (${coord})`;
        const name = r.name ? `"${r.name.replace(/"/g, '""')}"` : '""';
        return `${geom}\t${name}`;
      }).join('\n');
    },

    /* ── XML escape ── */
    _escXml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },

    /* ── Download ── */
    download() {
      if (!this.outputText) return;
      const map = {
        geojson: { mime: 'application/geo+json',                  ext: 'geojson' },
        kml:     { mime: 'application/vnd.google-earth.kml+xml',  ext: 'kml'     },
        gpx:     { mime: 'application/gpx+xml',                   ext: 'gpx'     },
        wkt:     { mime: 'text/plain',                             ext: 'txt'     },
      };
      const { mime, ext } = map[this.outputFmt];
      const blob = new Blob([this.outputText], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `output.${ext}`; a.click();
      URL.revokeObjectURL(url);
      this._toast(`Downloaded output.${ext}`);
    },

    /* ── Copy ── */
    async copyOutput() {
      if (!this.outputText) return;
      try {
        await navigator.clipboard.writeText(this.outputText);
        this._toast('Copied to clipboard');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = this.outputText; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        this._toast('Copied to clipboard');
      }
    },

    /* ── File upload ── */
    handleFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        this.csvText = ev.target.result;
        this.outputText = '';
        this.error = '';
        this.convertedOk = false;
        this._parseHeaders();
      };
      reader.readAsText(file);
      e.target.value = '';
    },

    handleDrop(e) {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        this.csvText = ev.target.result;
        this.outputText = '';
        this.error = '';
        this.convertedOk = false;
        this._parseHeaders();
      };
      reader.readAsText(file);
    },

    /* ── Clear ── */
    clear() {
      this.csvText = '';
      this.outputText = '';
      this.error = '';
      this.convertedOk = false;
      this.headers = [];
      this.latCol = '';
      this.lngCol = '';
      this.nameCol = '';
      this.altCol = '';
      this.parsed = [];
      this.previewRows = [];
      this.rowCount = 0;
      this.skippedCount = 0;
    },

    /* ── Watchers ── */
    onCsvChange() {
      this.outputText = '';
      this.convertedOk = false;
      this.error = '';
      if (this.csvText.trim()) this._parseHeaders();
      else { this.headers = []; this.previewRows = []; }
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },

    get outputFmtLabel() {
      return { geojson: 'GeoJSON', kml: 'KML', gpx: 'GPX', wkt: 'WKT' }[this.outputFmt];
    },
  };
}
