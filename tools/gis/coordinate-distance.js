/* ── Coordinate Distance Calculator ── */

const EARTH_RADIUS_KM = 6371.0088;  /* mean radius (IUGG) */
const EARTH_RADIUS_MI = 3958.8;
const WGS84_A = 6378137.0;          /* semi-major axis m */
const WGS84_B = 6356752.3142;       /* semi-minor axis m */
const WGS84_F = 1 / 298.257223563; /* flattening */

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

/* ── Haversine formula ── */
function haversine(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/* ── Vincenty inverse formula ── */
function vincenty(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const L = toRad(lon2 - lon1);
  const a = WGS84_A, b = WGS84_B, f = WGS84_F;
  const U1 = Math.atan((1-f) * Math.tan(φ1));
  const U2 = Math.atan((1-f) * Math.tan(φ2));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let λ = L, λPrev, iter = 0;
  let sinλ, cosλ, sinσ, cosσ, σ, sinα, cos2α, cos2σm, C;
  do {
    sinλ = Math.sin(λ); cosλ = Math.cos(λ);
    sinσ = Math.sqrt((cosU2*sinλ)**2 + (cosU1*sinU2 - sinU1*cosU2*cosλ)**2);
    if (sinσ === 0) return 0;
    cosσ = sinU1*sinU2 + cosU1*cosU2*cosλ;
    σ = Math.atan2(sinσ, cosσ);
    sinα = cosU1*cosU2*sinλ / sinσ;
    cos2α = 1 - sinα**2;
    cos2σm = cos2α !== 0 ? cosσ - 2*sinU1*sinU2/cos2α : 0;
    C = f/16 * cos2α * (4 + f*(4 - 3*cos2α));
    λPrev = λ;
    λ = L + (1-C)*f*sinα*(σ + C*sinσ*(cos2σm + C*cosσ*(-1+2*cos2σm**2)));
  } while (Math.abs(λ - λPrev) > 1e-12 && ++iter < 200);
  const uSq = cos2α * (a**2 - b**2) / b**2;
  const A = 1 + uSq/16384*(4096 + uSq*(-768 + uSq*(320 - 175*uSq)));
  const B = uSq/1024*(256 + uSq*(-128 + uSq*(74 - 47*uSq)));
  const Δσ = B*sinσ*(cos2σm + B/4*(cosσ*(-1+2*cos2σm**2) - B/6*cos2σm*(-3+4*sinσ**2)*(-3+4*cos2σm**2)));
  return b * A * (σ - Δσ) / 1000; /* km */
}

/* ── Initial bearing (degrees, 0-360) ── */
function bearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2), Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* ── Midpoint ── */
function midpoint(lat1, lon1, lat2, lon2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const Bx = Math.cos(φ2) * Math.cos(Δλ);
  const By = Math.cos(φ2) * Math.sin(Δλ);
  const φm = Math.atan2(Math.sin(φ1)+Math.sin(φ2), Math.sqrt((Math.cos(φ1)+Bx)**2+By**2));
  const λm = toRad(lon1) + Math.atan2(By, Math.cos(φ1)+Bx);
  return { lat: toDeg(φm), lon: ((toDeg(λm)+540)%360)-180 };
}

/* ── Bearing to compass ── */
function toCompass(b) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(b/22.5) % 16];
}

/* ── Parse coordinate string: accepts DD, DMS, DDM ── */
function parseCoord(s) {
  s = s.trim();
  /* Plain decimal */
  const dec = parseFloat(s);
  if (!isNaN(dec) && /^-?\d+(\.\d+)?$/.test(s.replace(/\s/g,''))) return dec;
  /* DMS: 40°26'46"N or 40 26 46 N */
  const dms = s.match(/^(-?\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)["\s]*([NSEW]?)$/i);
  if (dms) {
    let v = parseInt(dms[1]) + parseInt(dms[2])/60 + parseFloat(dms[3])/3600;
    if (/[SW]/i.test(dms[4])) v = -v;
    return v;
  }
  /* DDM: 40°26.7667'N */
  const ddm = s.match(/^(-?\d+)[°\s]+(\d+(?:\.\d+)?)['\s]*([NSEW]?)$/i);
  if (ddm) {
    let v = parseInt(ddm[1]) + parseFloat(ddm[2])/60;
    if (/[SW]/i.test(ddm[3])) v = -v;
    return v;
  }
  /* Decimal with direction: 40.4461N */
  const dd = s.match(/^(\d+(?:\.\d+)?)\s*([NSEW])$/i);
  if (dd) {
    let v = parseFloat(dd[1]);
    if (/[SW]/i.test(dd[2])) v = -v;
    return v;
  }
  return NaN;
}

/* ── Format number with separators ── */
function fmtN(n, dec = 3) {
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

/* ── Alpine component ── */
function coordinateDistanceApp() {
  return {
    /* Two-point mode */
    lat1: '', lon1: '', name1: 'Point A',
    lat2: '', lon2: '', name2: 'Point B',
    err1lat: '', err1lon: '', err2lat: '', err2lon: '',

    formula: 'vincenty',   /* 'haversine' | 'vincenty' */
    inputFormat: 'dd',     /* 'dd' | 'dms' */

    result: null,   /* { km, mi, nm, m, ft, bearing, bearing2, compass, compass2, midLat, midLon } */
    calcError: '',

    /* Multi-point (route) mode */
    mode: 'two',   /* 'two' | 'multi' */
    multiPoints: [
      { lat: '', lon: '', name: 'Point 1' },
      { lat: '', lon: '', name: 'Point 2' },
      { lat: '', lon: '', name: 'Point 3' },
    ],
    multiLegs: [],
    multiTotal: 0,

    init() {},

    /* ── Validation helpers ── */
    _parseLat(s) {
      const v = parseCoord(s);
      if (isNaN(v)) return { ok: false, val: NaN, err: 'Enter a valid latitude' };
      if (v < -90 || v > 90) return { ok: false, val: NaN, err: 'Latitude must be −90 to 90' };
      return { ok: true, val: v, err: '' };
    },
    _parseLon(s) {
      const v = parseCoord(s);
      if (isNaN(v)) return { ok: false, val: NaN, err: 'Enter a valid longitude' };
      if (v < -180 || v > 180) return { ok: false, val: NaN, err: 'Longitude must be −180 to 180' };
      return { ok: true, val: v, err: '' };
    },

    /* ── Calculate two-point ── */
    calculate() {
      const r1lat = this._parseLat(this.lat1);
      const r1lon = this._parseLon(this.lon1);
      const r2lat = this._parseLat(this.lat2);
      const r2lon = this._parseLon(this.lon2);
      this.err1lat = r1lat.err; this.err1lon = r1lon.err;
      this.err2lat = r2lat.err; this.err2lon = r2lon.err;
      this.calcError = '';
      if (!r1lat.ok || !r1lon.ok || !r2lat.ok || !r2lon.ok) { this.result = null; return; }

      const la1 = r1lat.val, lo1 = r1lon.val, la2 = r2lat.val, lo2 = r2lon.val;
      try {
        const km = this.formula === 'vincenty' ? vincenty(la1, lo1, la2, lo2) : haversine(la1, lo1, la2, lo2);
        const b1 = bearing(la1, lo1, la2, lo2);
        const b2 = (bearing(la2, lo2, la1, lo1) + 180) % 360; /* back bearing */
        const mid = midpoint(la1, lo1, la2, lo2);
        this.result = {
          km, mi: km * 0.621371, nm: km * 0.539957,
          m: km * 1000, ft: km * 3280.84, yd: km * 1093.61,
          bearing: b1, bearing2: b2,
          compass: toCompass(b1), compass2: toCompass(b2),
          midLat: mid.lat, midLon: mid.lon,
        };
      } catch(e) {
        this.result = null;
        this.calcError = 'Calculation error: ' + e.message;
      }
    },

    swapPoints() {
      [this.lat1, this.lat2] = [this.lat2, this.lat1];
      [this.lon1, this.lon2] = [this.lon2, this.lon1];
      [this.name1, this.name2] = [this.name2, this.name1];
      this.result = null;
    },

    /* ── Multi-point route ── */
    addPoint() {
      this.multiPoints.push({ lat: '', lon: '', name: `Point ${this.multiPoints.length + 1}` });
    },
    removePoint(i) {
      if (this.multiPoints.length <= 2) return;
      this.multiPoints.splice(i, 1);
      this.calcRoute();
    },
    calcRoute() {
      this.multiLegs = [];
      this.multiTotal = 0;
      const pts = this.multiPoints;
      for (let i = 0; i < pts.length - 1; i++) {
        const la1 = parseCoord(pts[i].lat), lo1 = parseCoord(pts[i].lon);
        const la2 = parseCoord(pts[i+1].lat), lo2 = parseCoord(pts[i+1].lon);
        if (isNaN(la1) || isNaN(lo1) || isNaN(la2) || isNaN(lo2)) {
          this.multiLegs.push({ from: pts[i].name || `P${i+1}`, to: pts[i+1].name || `P${i+2}`, km: null });
          continue;
        }
        const km = this.formula === 'vincenty' ? vincenty(la1, lo1, la2, lo2) : haversine(la1, lo1, la2, lo2);
        this.multiLegs.push({ from: pts[i].name || `P${i+1}`, to: pts[i+1].name || `P${i+2}`, km });
        this.multiTotal += km;
      }
    },

    /* ── Sample data ── */
    loadSample() {
      this.lat1 = '51.5074'; this.lon1 = '-0.1278'; this.name1 = 'London';
      this.lat2 = '48.8566'; this.lon2 = '2.3522';  this.name2 = 'Paris';
      this.result = null;
    },
    loadSampleRoute() {
      this.multiPoints = [
        { lat: '51.5074',  lon: '-0.1278', name: 'London' },
        { lat: '50.8503',  lon: '4.3517',  name: 'Brussels' },
        { lat: '52.3676',  lon: '4.9041',  name: 'Amsterdam' },
        { lat: '53.5488',  lon: '9.9872',  name: 'Hamburg' },
        { lat: '52.5200',  lon: '13.4050', name: 'Berlin' },
      ];
      this.calcRoute();
    },
    clearAll() {
      this.lat1='';this.lon1='';this.name1='Point A';
      this.lat2='';this.lon2='';this.name2='Point B';
      this.err1lat='';this.err1lon='';this.err2lat='';this.err2lon='';
      this.result=null;this.calcError='';
    },
    clearRoute() {
      this.multiPoints=[{lat:'',lon:'',name:'Point 1'},{lat:'',lon:'',name:'Point 2'},{lat:'',lon:'',name:'Point 3'}];
      this.multiLegs=[];this.multiTotal=0;
    },

    /* ── Formatting ── */
    fmtKm(km)  { return fmtN(km, km < 1 ? 4 : km < 10 ? 3 : 2); },
    fmtMi(km)  { const mi = km * 0.621371; return fmtN(mi, mi < 1 ? 4 : mi < 10 ? 3 : 2); },
    fmtNm(km)  { const nm = km * 0.539957; return fmtN(nm, nm < 1 ? 4 : nm < 10 ? 3 : 2); },
    fmtM(km)   { return fmtN(km * 1000, 0); },
    fmtFt(km)  { return fmtN(km * 3280.84, 0); },
    fmtYd(km)  { return fmtN(km * 1093.61, 0); },
    fmtBear(b) { return b.toFixed(2) + '°'; },
    fmtLat(v)  { return v.toFixed(6) + (v >= 0 ? '°N' : '°S'); },
    fmtLon(v)  { return Math.abs(v).toFixed(6) + (v >= 0 ? '°E' : '°W'); },
    fmtDms(dd) {
      const abs = Math.abs(dd);
      const d = Math.floor(abs), m = Math.floor((abs-d)*60), s = ((abs-d-m/60)*3600).toFixed(2);
      return `${d}° ${m}' ${s}"`;
    },

    /* ── Copy ── */
    async copyText(text, label) {
      try { await navigator.clipboard.writeText(text); }
      catch { const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta); }
      this._toast(`Copied ${label}`);
    },
    copyResult() {
      if (!this.result) return;
      const r = this.result;
      const text = [
        `Distance (${this.formula}):`,
        `  ${this.fmtKm(r.km)} km`,
        `  ${this.fmtMi(r.km)} mi`,
        `  ${this.fmtNm(r.km)} nautical miles`,
        `  ${this.fmtM(r.km)} m`,
        `  ${this.fmtFt(r.km)} ft`,
        `Initial bearing: ${this.fmtBear(r.bearing)} (${r.compass})`,
        `Final bearing:   ${this.fmtBear(r.bearing2)} (${r.compass2})`,
        `Midpoint: ${this.fmtLat(r.midLat)}, ${this.fmtLon(r.midLon)}`,
      ].join('\n');
      this.copyText(text, 'result');
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
