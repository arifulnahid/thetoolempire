/* ── Lat/Long Converter & Tools — Alpine component ── */

function latLongApp() {
  return {
    /* ── Active section ── */
    section: 'converter', /* converter | map | distance */

    /* ── Converter mode ── */
    convMode: 'dd', /* dd | dms | ddm */

    /* ── DD inputs ── */
    ddLat: '',
    ddLng: '',

    /* ── DMS inputs ── */
    dmsLatD: '', dmsLatM: '', dmsLatS: '', dmsLatDir: 'N',
    dmsLngD: '', dmsLngM: '', dmsLngS: '', dmsLngDir: 'E',

    /* ── DDM inputs ── */
    ddmLatD: '', ddmLatM: '', ddmLatDir: 'N',
    ddmLngD: '', ddmLngM: '', ddmLngDir: 'E',

    /* ── Results ── */
    result: null,
    convError: '',

    /* ── Map ── */
    mapLat: '',
    mapLng: '',
    mapZoom: 13,
    mapError: '',
    mapSrc: '',

    /* ── Distance ── */
    distLat1: '', distLng1: '',
    distLat2: '', distLng2: '',
    distError: '',
    distResult: null,

    /* ── Init ── */
    init() {},

    /* ─────────────────────────────── CONVERTER ── */

    convert() {
      this.convError = '';
      this.result = null;
      let lat, lng;

      if (this.convMode === 'dd') {
        lat = parseFloat(this.ddLat);
        lng = parseFloat(this.ddLng);
        if (isNaN(lat) || isNaN(lng)) { this.convError = 'Enter valid decimal degree values.'; return; }
      } else if (this.convMode === 'dms') {
        lat = this._dmsToDD(
          parseFloat(this.dmsLatD)||0,
          parseFloat(this.dmsLatM)||0,
          parseFloat(this.dmsLatS)||0,
          this.dmsLatDir
        );
        lng = this._dmsToDD(
          parseFloat(this.dmsLngD)||0,
          parseFloat(this.dmsLngM)||0,
          parseFloat(this.dmsLngS)||0,
          this.dmsLngDir
        );
        if (isNaN(lat) || isNaN(lng)) { this.convError = 'Enter valid DMS values.'; return; }
      } else {
        lat = this._ddmToDD(
          parseFloat(this.ddmLatD)||0,
          parseFloat(this.ddmLatM)||0,
          this.ddmLatDir
        );
        lng = this._ddmToDD(
          parseFloat(this.ddmLngD)||0,
          parseFloat(this.ddmLngM)||0,
          this.ddmLngDir
        );
        if (isNaN(lat) || isNaN(lng)) { this.convError = 'Enter valid DDM values.'; return; }
      }

      if (lat < -90 || lat > 90)  { this.convError = 'Latitude must be between -90 and 90.'; return; }
      if (lng < -180 || lng > 180){ this.convError = 'Longitude must be between -180 and 180.'; return; }

      this.result = this._buildResult(lat, lng);
    },

    _buildResult(lat, lng) {
      const dmsLat = this._ddToDMS(lat,  'lat');
      const dmsLng = this._ddToDMS(lng,  'lng');
      const ddmLat = this._ddToDDM(lat,  'lat');
      const ddmLng = this._ddToDDM(lng,  'lng');
      const utm    = this._ddToUTM(lat, lng);
      const geohash= this._ddToGeohash(lat, lng, 8);
      const what3w = `${this._w3wWord(lat, lng, 0)}.${this._w3wWord(lat, lng, 1)}.${this._w3wWord(lat, lng, 2)}`;

      return {
        lat, lng,
        ddFmt:     `${lat.toFixed(7)}, ${lng.toFixed(7)}`,
        dmsFmt:    `${dmsLat}, ${dmsLng}`,
        ddmFmt:    `${ddmLat}, ${ddmLng}`,
        utmFmt:    utm,
        geohash,
        what3w,
        quadrant:  this._quadrant(lat, lng),
        googleUrl: `https://www.google.com/maps?q=${lat},${lng}`,
        osmUrl:    `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=13`,
      };
    },

    /* ── DMS ↔ DD ── */
    _dmsToDD(d, m, s, dir) {
      const dd = d + m/60 + s/3600;
      return (dir === 'S' || dir === 'W') ? -dd : dd;
    },

    _ddToDMS(dd, axis) {
      const abs  = Math.abs(dd);
      const deg  = Math.floor(abs);
      const min  = Math.floor((abs - deg) * 60);
      const sec  = ((abs - deg - min/60) * 3600).toFixed(4);
      const dir  = axis === 'lat'
        ? (dd >= 0 ? 'N' : 'S')
        : (dd >= 0 ? 'E' : 'W');
      return `${deg}° ${min}' ${sec}" ${dir}`;
    },

    /* ── DDM ↔ DD ── */
    _ddmToDD(d, m, dir) {
      const dd = d + m/60;
      return (dir === 'S' || dir === 'W') ? -dd : dd;
    },

    _ddToDDM(dd, axis) {
      const abs = Math.abs(dd);
      const deg = Math.floor(abs);
      const min = ((abs - deg) * 60).toFixed(6);
      const dir = axis === 'lat'
        ? (dd >= 0 ? 'N' : 'S')
        : (dd >= 0 ? 'E' : 'W');
      return `${deg}° ${min}' ${dir}`;
    },

    /* ── UTM ── */
    _ddToUTM(lat, lng) {
      const zone = Math.floor((lng + 180) / 6) + 1;
      const latBand = 'CDEFGHJKLMNPQRSTUVWX'[Math.floor((lat + 80) / 8)] || 'Z';
      /* Simplified UTM — full Karney/Krüger projection is complex;
         we compute approximate easting/northing for display */
      const a  = 6378137.0;
      const f  = 1 / 298.257223563;
      const k0 = 0.9996;
      const e2 = 2*f - f*f;
      const latR = lat * Math.PI / 180;
      const lngR = lng * Math.PI / 180;
      const lng0R = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
      const N  = a / Math.sqrt(1 - e2 * Math.sin(latR)**2);
      const T  = Math.tan(latR)**2;
      const C  = e2 / (1 - e2) * Math.cos(latR)**2;
      const A  = Math.cos(latR) * (lngR - lng0R);
      const M  = a * (
        (1 - e2/4 - 3*e2**2/64 - 5*e2**3/256) * latR
        - (3*e2/8 + 3*e2**2/32 + 45*e2**3/1024) * Math.sin(2*latR)
        + (15*e2**2/256 + 45*e2**3/1024) * Math.sin(4*latR)
        - (35*e2**3/3072) * Math.sin(6*latR)
      );
      const easting  = k0 * N * (A + (1-T+C)*A**3/6 + (5-18*T+T**2+72*C-58*(e2/(1-e2)))*A**5/120) + 500000;
      const northing = k0 * (M + N * Math.tan(latR) * (A**2/2 + (5-T+9*C+4*C**2)*A**4/24 + (61-58*T+T**2+600*C-330*(e2/(1-e2)))*A**6/720)) + (lat < 0 ? 10000000 : 0);
      return `${zone}${latBand} ${Math.round(easting)}E ${Math.round(northing)}N`;
    },

    /* ── Geohash ── */
    _ddToGeohash(lat, lng, precision) {
      const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
      let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
      let hash = '', bit = 0, even = true, chr = 0;
      while (hash.length < precision) {
        if (even) {
          const mid = (minLng + maxLng) / 2;
          if (lng >= mid) { chr |= (1 << (4 - bit)); minLng = mid; } else { maxLng = mid; }
        } else {
          const mid = (minLat + maxLat) / 2;
          if (lat >= mid) { chr |= (1 << (4 - bit)); minLat = mid; } else { maxLat = mid; }
        }
        even = !even;
        if (bit < 4) { bit++; } else { hash += BASE32[chr]; chr = 0; bit = 0; }
      }
      return hash;
    },

    /* ── Deterministic word gen (not real what3words — illustrative) ── */
    _w3wWord(lat, lng, idx) {
      const words = ['table','river','cloud','stone','apple','forest','tiger','copper',
        'silver','bridge','amber','coral','falcon','glacier','harbor','iris',
        'jasper','kiwi','lotus','maple','noble','oasis','pebble','quartz','ridge','sage'];
      const hash = Math.abs(Math.round((lat * 1000 + lng * 100 + idx * 37) * 997)) % words.length;
      return words[hash];
    },

    /* ── Quadrant ── */
    _quadrant(lat, lng) {
      const ns = lat >= 0 ? 'N' : 'S';
      const ew = lng >= 0 ? 'E' : 'W';
      return `${ns}${ew} Hemisphere`;
    },

    /* ── Reset converter ── */
    resetConv() {
      this.ddLat = ''; this.ddLng = '';
      this.dmsLatD='';this.dmsLatM='';this.dmsLatS='';
      this.dmsLngD='';this.dmsLngM='';this.dmsLngS='';
      this.ddmLatD='';this.ddmLatM='';
      this.ddmLngD='';this.ddmLngM='';
      this.result = null;
      this.convError = '';
    },

    /* ── Load result into map ── */
    showOnMap(lat, lng) {
      this.mapLat = String(lat);
      this.mapLng = String(lng);
      this.section = 'map';
      this._updateMap();
      this.$nextTick(() => {
        const el = document.getElementById('map-section');
        if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    },

    /* ─────────────────────────────── MAP ── */

    _updateMap() {
      const lat = parseFloat(this.mapLat);
      const lng = parseFloat(this.mapLng);
      if (isNaN(lat) || isNaN(lng)) { this.mapSrc = ''; this.mapError = ''; return; }
      if (lat < -90 || lat > 90)  { this.mapError = 'Latitude must be −90 to 90.'; return; }
      if (lng < -180 || lng > 180){ this.mapError = 'Longitude must be −180 to 180.'; return; }
      this.mapError = '';
      const z = Math.max(1, Math.min(19, parseInt(this.mapZoom)||13));
      this.mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01*(20-z)},${lat-0.007*(20-z)},${lng+0.01*(20-z)},${lat+0.007*(20-z)}&layer=mapnik&marker=${lat},${lng}`;
    },

    loadMap() {
      this.mapError = '';
      const lat = parseFloat(this.mapLat);
      const lng = parseFloat(this.mapLng);
      if (isNaN(lat) || isNaN(lng)) { this.mapError = 'Enter valid latitude and longitude.'; return; }
      if (lat < -90 || lat > 90)  { this.mapError = 'Latitude must be −90 to 90.'; return; }
      if (lng < -180 || lng > 180){ this.mapError = 'Longitude must be −180 to 180.'; return; }
      this._updateMap();
    },

    get mapGoogleUrl() {
      const lat = parseFloat(this.mapLat);
      const lng = parseFloat(this.mapLng);
      if (isNaN(lat) || isNaN(lng)) return '#';
      return `https://www.google.com/maps?q=${lat},${lng}`;
    },

    get mapOsmUrl() {
      const lat = parseFloat(this.mapLat);
      const lng = parseFloat(this.mapLng);
      if (isNaN(lat) || isNaN(lng)) return '#';
      return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${this.mapZoom}`;
    },

    /* ─────────────────────────────── DISTANCE ── */

    calcDistance() {
      this.distError = '';
      this.distResult = null;
      const lat1 = parseFloat(this.distLat1);
      const lng1 = parseFloat(this.distLng1);
      const lat2 = parseFloat(this.distLat2);
      const lng2 = parseFloat(this.distLng2);
      if ([lat1,lng1,lat2,lng2].some(isNaN)) {
        this.distError = 'Enter valid coordinates for both points.'; return;
      }
      if (lat1 < -90||lat1 > 90||lat2 < -90||lat2 > 90) {
        this.distError = 'Latitude must be between −90 and 90.'; return;
      }
      if (lng1 < -180||lng1 > 180||lng2 < -180||lng2 > 180) {
        this.distError = 'Longitude must be between −180 and 180.'; return;
      }

      const km  = this._haversine(lat1, lng1, lat2, lng2);
      const bearing = this._bearing(lat1, lng1, lat2, lng2);

      this.distResult = {
        km:     km.toFixed(4),
        mi:     (km * 0.621371).toFixed(4),
        nm:     (km * 0.539957).toFixed(4),
        m:      Math.round(km * 1000),
        ft:     Math.round(km * 3280.84),
        bearing: bearing.toFixed(2),
        bearingDir: this._bearingDir(bearing),
        midLat: ((lat1 + lat2) / 2).toFixed(7),
        midLng: ((lng1 + lng2) / 2).toFixed(7),
      };
    },

    _haversine(lat1, lng1, lat2, lng2) {
      const R = 6371.0088; /* mean Earth radius km */
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 +
                Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    _bearing(lat1, lng1, lat2, lng2) {
      const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
      const Δλ = (lng2 - lng1) * Math.PI/180;
      const y  = Math.sin(Δλ) * Math.cos(φ2);
      const x  = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
      return (Math.atan2(y, x) * 180/Math.PI + 360) % 360;
    },

    _bearingDir(b) {
      const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
      return dirs[Math.round(b / 22.5) % 16];
    },

    resetDist() {
      this.distLat1='';this.distLng1='';
      this.distLat2='';this.distLng2='';
      this.distResult=null;this.distError='';
    },

    /* ─────────────────────────────── HELPERS ── */

    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        this._toast('Copied');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.select();
        document.execCommand('copy');document.body.removeChild(ta);
        this._toast('Copied');
      }
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 1800);
    },
  };
}
