/* ── UTM Zone Finder — Alpine.js component ── */

/* WGS84 ellipsoid constants */
const _A  = 6378137.0;
const _F  = 1 / 298.257223563;
const _B  = _A * (1 - _F);
const _E2 = 1 - (_B * _B) / (_A * _A);
const _EP2 = _E2 / (1 - _E2);
const _K0 = 0.9996;

const ZONE_LETTERS = 'CDEFGHJKLMNPQRSTUVWX';

function _zoneNumber(lat, lon) {
  let z = Math.floor((lon + 180) / 6) + 1;
  /* Norway exception (zone V) */
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) z = 32;
  /* Svalbard exceptions (zone X) */
  if (lat >= 72 && lat < 84) {
    if      (lon >= 0  && lon < 9)  z = 31;
    else if (lon >= 9  && lon < 21) z = 33;
    else if (lon >= 21 && lon < 33) z = 35;
    else if (lon >= 33 && lon < 42) z = 37;
  }
  return z;
}

function _zoneLetter(lat) {
  if (lat >= 84 || lat < -80) return null;
  if (lat >= 72) return 'X';
  return ZONE_LETTERS[Math.floor((lat + 80) / 8)];
}

function _centralMeridian(zoneNum) {
  return (zoneNum - 1) * 6 - 180 + 3;
}

function latLonToUTM(lat, lon) {
  const letter = _zoneLetter(lat);
  if (!letter) return null; // polar — outside UTM coverage

  const zoneNum = _zoneNumber(lat, lon);
  const cm      = _centralMeridian(zoneNum);
  const φ       = lat * Math.PI / 180;
  const λ0      = cm  * Math.PI / 180;
  const λ       = lon * Math.PI / 180;

  const N = _A / Math.sqrt(1 - _E2 * Math.sin(φ) ** 2);
  const T = Math.tan(φ) ** 2;
  const C = _EP2 * Math.cos(φ) ** 2;
  const Av = Math.cos(φ) * (λ - λ0);

  const M = _A * (
    (1 - _E2/4 - 3*_E2**2/64 - 5*_E2**3/256)      * φ -
    (3*_E2/8   + 3*_E2**2/32 + 45*_E2**3/1024)    * Math.sin(2*φ) +
    (15*_E2**2/256 + 45*_E2**3/1024)               * Math.sin(4*φ) -
    (35*_E2**3/3072)                                * Math.sin(6*φ)
  );

  let easting = _K0 * N * (
    Av +
    (1 - T + C) * Av**3 / 6 +
    (5 - 18*T + T**2 + 72*C - 58*_EP2) * Av**5 / 120
  ) + 500000;

  let northing = _K0 * (
    M + N * Math.tan(φ) * (
      Av**2 / 2 +
      (5 - T + 9*C + 4*C**2) * Av**4 / 24 +
      (61 - 58*T + T**2 + 600*C - 330*_EP2) * Av**6 / 720
    )
  );
  if (lat < 0) northing += 10000000;

  return {
    zoneNum,
    letter,
    zone:        `${zoneNum}${letter}`,
    hemisphere:  lat >= 0 ? 'Northern' : 'Southern',
    easting:     Math.round(easting),
    northing:    Math.round(northing),
    centralMeridian: cm,
    special: _isSpecial(lat, lon) ? _specialNote(lat, lon) : null,
  };
}

function utmToLatLon(easting, northing, zoneNum, letter) {
  const isNorth = letter >= 'N';
  const N0 = isNorth ? 0 : 10000000;
  const cm = _centralMeridian(zoneNum);
  const λ0 = cm * Math.PI / 180;

  const x = easting - 500000;
  const y = northing - N0;

  const e1 = (1 - Math.sqrt(1 - _E2)) / (1 + Math.sqrt(1 - _E2));
  const M  = y / _K0;
  const μ  = M / (_A * (1 - _E2/4 - 3*_E2**2/64 - 5*_E2**3/256));

  const φ1 = μ +
    (3*e1/2   - 27*e1**3/32)  * Math.sin(2*μ) +
    (21*e1**2/16 - 55*e1**4/32) * Math.sin(4*μ) +
    (151*e1**3/96)              * Math.sin(6*μ) +
    (1097*e1**4/512)            * Math.sin(8*μ);

  const N1 = _A / Math.sqrt(1 - _E2 * Math.sin(φ1) ** 2);
  const T1 = Math.tan(φ1) ** 2;
  const C1 = _EP2 * Math.cos(φ1) ** 2;
  const R1 = _A * (1 - _E2) / (1 - _E2 * Math.sin(φ1) ** 2) ** 1.5;
  const D  = x / (N1 * _K0);

  const lat = φ1 - (N1 * Math.tan(φ1) / R1) * (
    D**2/2 -
    (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*_EP2) * D**4/24 +
    (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*_EP2 - 3*C1**2) * D**6/720
  );

  const lon = λ0 + (
    D -
    (1 + 2*T1 + C1) * D**3/6 +
    (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*_EP2 + 24*T1**2) * D**5/120
  ) / Math.cos(φ1);

  return {
    lat: +(lat * 180 / Math.PI).toFixed(7),
    lon: +(lon * 180 / Math.PI).toFixed(7),
  };
}

function _isSpecial(lat, lon) {
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) return true;
  if (lat >= 72 && lat < 84 && lon >= 0 && lon < 42) return true;
  return false;
}

function _specialNote(lat, lon) {
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12)
    return 'Norway exception: zone 32V is extended westward to cover southwest Norway.';
  if (lat >= 72 && lat < 84)
    return 'Svalbard exception: zones 31X/33X/35X/37X are widened; 32X/34X/36X are eliminated.';
  return null;
}

/* ── Alpine component ── */
function utmApp() {
  return {
    tab: 'fwd',

    /* forward (lat/lon → UTM) */
    fLat: '', fLon: '',
    fResult: null, fError: '',

    /* reverse (UTM → lat/lon) */
    rEasting: '', rNorthing: '', rZone: '', rLetter: '',
    rResult: null, rError: '',

    copySuccess: '',

    presets: [
      { name: 'London, UK',        lat: 51.5074,   lon: -0.1278  },
      { name: 'New York, USA',     lat: 40.7128,   lon: -74.0060 },
      { name: 'Tokyo, Japan',      lat: 35.6762,   lon: 139.6503 },
      { name: 'Sydney, Australia', lat: -33.8688,  lon: 151.2093 },
      { name: 'Dhaka, Bangladesh', lat: 23.8103,   lon: 90.4125  },
      { name: 'Cairo, Egypt',      lat: 30.0444,   lon: 31.2357  },
      { name: 'Oslo (Norway exc.)',lat: 59.9139,   lon: 10.7522  },
      { name: 'Longyearbyen (Svalbard)', lat: 78.2232, lon: 15.6469 },
    ],

    loadPreset(p) {
      this.tab   = 'fwd';
      this.fLat  = String(p.lat);
      this.fLon  = String(p.lon);
      this.calcForward();
    },

    calcForward() {
      this.fError  = '';
      this.fResult = null;
      const lat = parseFloat(this.fLat);
      const lon = parseFloat(this.fLon);
      if (isNaN(lat) || isNaN(lon))   { this.fError = 'Enter valid decimal-degree coordinates.'; return; }
      if (lat < -90  || lat > 90)     { this.fError = 'Latitude must be between −90 and 90.'; return; }
      if (lon < -180 || lon > 180)    { this.fError = 'Longitude must be between −180 and 180.'; return; }
      if (lat > 84   || lat < -80)    { this.fError = 'UTM does not cover polar regions (above 84°N or below 80°S). Use UPS instead.'; return; }
      this.fResult = latLonToUTM(lat, lon);
    },

    calcReverse() {
      this.rError  = '';
      this.rResult = null;
      const e = parseFloat(this.rEasting);
      const n = parseFloat(this.rNorthing);
      const z = parseInt(this.rZone);
      const l = this.rLetter.toUpperCase().trim();
      if (isNaN(e) || isNaN(n))              { this.rError = 'Enter valid easting and northing values.'; return; }
      if (isNaN(z) || z < 1 || z > 60)      { this.rError = 'Zone number must be between 1 and 60.'; return; }
      if (!ZONE_LETTERS.includes(l))         { this.rError = `Zone letter must be one of: ${ZONE_LETTERS}`; return; }
      if (e < 100000 || e > 900000)          { this.rError = 'Easting is typically between 100 000 and 900 000 m.'; return; }
      try {
        const r = utmToLatLon(e, n, z, l);
        if (r.lat < -90 || r.lat > 90 || r.lon < -180 || r.lon > 180)
          throw new Error('Result out of range — check your inputs.');
        this.rResult = r;
      } catch(err) {
        this.rError = err.message || 'Conversion failed. Check your inputs.';
      }
    },

    async copy(text, key) {
      try {
        await navigator.clipboard.writeText(String(text));
        this.copySuccess = key;
        setTimeout(() => { this.copySuccess = ''; }, 1800);
      } catch (_) {}
    },

    /* zone map helpers */
    zoneLetterBands() {
      return ZONE_LETTERS.split('');
    },
    activeZone() {
      return this.fResult ? this.fResult.zoneNum : null;
    },
    activeLetter() {
      return this.fResult ? this.fResult.letter : null;
    },
    bandLatRange(letter) {
      const i = ZONE_LETTERS.indexOf(letter);
      if (letter === 'X') return '72° to 84°N';
      const lo = -80 + i * 8;
      return `${lo < 0 ? lo+'°S' : lo+'°N'} to ${lo+8 < 0 ? (lo+8)+'°S' : (lo+8)+'°N'}`;
    },
  };
}
