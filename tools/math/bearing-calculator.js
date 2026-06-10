/* Bearing Calculator — pure browser, no dependencies */

function bearingApp() {
  return {
    activeTab: 'p2p',

    /* ── Point-to-Point ─── */
    lat1:'', lng1:'',
    lat2:'', lng2:'',
    p2p: null,
    p2pErr: '',

    /* ── Back Bearing ─── */
    bbInput: '',
    bb: null,
    bbErr: '',

    /* ── Converter ─── */
    cvInput:  '',
    cvFormat: 'decimal',
    cv: null,
    cvErr: '',

    /* ── Magnetic Correction ─── */
    mgTrue: '',
    mgDecl: '',
    mg: null,
    mgErr: '',

    /* ── Compass display ─── */
    compassDeg: 0,
    compassCard: '—',
    compassLabel: 'Enter data and calculate',

    /* ── Math helpers ────────────────────────────────────── */
    _rad(d) { return d * Math.PI / 180; },
    _deg(r) { return r * 180 / Math.PI; },
    _norm(d) { return ((d % 360) + 360) % 360; },

    _cardinal(deg) {
      const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE',
                    'S','SSW','SW','WSW','W','WNW','NW','NNW'];
      return dirs[Math.round(this._norm(deg) / 22.5) % 16];
    },

    _toDMS(dd) {
      const n    = this._norm(dd);
      const d    = Math.floor(n);
      const mf   = (n - d) * 60;
      const m    = Math.floor(mf);
      const s    = ((mf - m) * 60).toFixed(1);
      return `${d}° ${m}' ${s}"`;
    },

    _toQuadrant(deg) {
      const d = this._norm(deg);
      if (d === 0)   return 'N';
      if (d === 90)  return 'E';
      if (d === 180) return 'S';
      if (d === 270) return 'W';
      if (d < 90)   return `N${d.toFixed(2)}°E`;
      if (d < 180)  return `S${(180-d).toFixed(2)}°E`;
      if (d < 270)  return `S${(d-180).toFixed(2)}°W`;
      return `N${(360-d).toFixed(2)}°W`;
    },

    _parseDMS(str) {
      const m = str.match(/(\d+)[°d\s]+(\d+)['\s]+([0-9.]+)/);
      if (m) return +m[1] + +m[2]/60 + +m[3]/3600;
      return NaN;
    },

    _parseCompass(str) {
      const s = str.trim().toUpperCase();
      const plain = parseFloat(s);
      if (!isNaN(plain)) return plain;
      const map = {N:0,NNE:22.5,NE:45,ENE:67.5,E:90,ESE:112.5,SE:135,SSE:157.5,
                   S:180,SSW:202.5,SW:225,WSW:247.5,W:270,WNW:292.5,NW:315,NNW:337.5};
      if (map[s] !== undefined) return map[s];
      // quadrant: N45E, S30.5W, N 12.3 E, etc.
      const q = s.match(/^([NS])\s*([\d.]+)\s*°?\s*([EW])$/);
      if (q) {
        const base = q[1]==='N' ? 0 : 180;
        const ang  = parseFloat(q[2]);
        const east = (q[1]==='N' && q[3]==='E') || (q[1]==='S' && q[3]==='W');
        return this._norm(base + (east ? ang : -ang));
      }
      return NaN;
    },

    _haversine(la1, lo1, la2, lo2) {
      const R  = 6371;
      const dL = this._rad(la2-la1), dO = this._rad(lo2-lo1);
      const a  = Math.sin(dL/2)**2 + Math.cos(this._rad(la1))*Math.cos(this._rad(la2))*Math.sin(dO/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    _fwdBearing(la1, lo1, la2, lo2) {
      const φ1 = this._rad(la1), φ2 = this._rad(la2);
      const Δλ = this._rad(lo2-lo1);
      const y = Math.sin(Δλ)*Math.cos(φ2);
      const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
      return this._norm(this._deg(Math.atan2(y, x)));
    },

    /* ── Compass update ──────────────────────────────────── */
    _setCompass(deg, label) {
      this.compassDeg  = deg;
      this.compassCard = this._cardinal(deg);
      this.compassLabel = label || '';
    },

    /* ── Point-to-Point ──────────────────────────────────── */
    calcP2P() {
      this.p2pErr = ''; this.p2p = null;
      const la1=parseFloat(this.lat1), lo1=parseFloat(this.lng1);
      const la2=parseFloat(this.lat2), lo2=parseFloat(this.lng2);
      if ([la1,lo1,la2,lo2].some(isNaN)) { this.p2pErr='Enter valid decimal coordinates for both points.'; return; }
      if (la1<-90||la1>90||la2<-90||la2>90)    { this.p2pErr='Latitude must be between −90 and 90.'; return; }
      if (lo1<-180||lo1>180||lo2<-180||lo2>180) { this.p2pErr='Longitude must be between −180 and 180.'; return; }
      if (la1===la2 && lo1===lo2) { this.p2pErr='Points A and B are the same location.'; return; }

      const fwd  = this._fwdBearing(la1,lo1,la2,lo2);
      const back = this._norm(fwd+180);
      const dist = this._haversine(la1,lo1,la2,lo2);

      this.p2p = {
        fwd,  fwdDeg: fwd.toFixed(2),  fwdCard: this._cardinal(fwd),
              fwdDMS: this._toDMS(fwd),  fwdQ: this._toQuadrant(fwd),
        back, backDeg: back.toFixed(2), backCard: this._cardinal(back),
              backDMS: this._toDMS(back), backQ: this._toQuadrant(back),
        distKm: dist.toFixed(3),
        distMi: (dist*0.621371).toFixed(3),
        distNm: (dist*0.539957).toFixed(3),
      };
      this._setCompass(fwd, 'Forward bearing A → B');
    },

    swapPoints() {
      [this.lat1,this.lng1,this.lat2,this.lng2]=[this.lat2,this.lng2,this.lat1,this.lng1];
      if (this.p2p) this.calcP2P();
    },

    /* ── Back Bearing ────────────────────────────────────── */
    calcBack() {
      this.bbErr=''; this.bb=null;
      const d = parseFloat(this.bbInput);
      if (isNaN(d)) { this.bbErr='Enter a bearing in decimal degrees (e.g. 045 or 312.5).'; return; }
      const norm = this._norm(d);
      const back = this._norm(norm+180);
      this.bb = {
        fwd: norm.toFixed(2),  fwdCard: this._cardinal(norm),  fwdDMS: this._toDMS(norm),  fwdQ: this._toQuadrant(norm),
        back: back.toFixed(2), backCard: this._cardinal(back), backDMS: this._toDMS(back), backQ: this._toQuadrant(back),
      };
      this._setCompass(norm, 'Forward bearing');
    },

    /* ── Converter ───────────────────────────────────────── */
    convert() {
      this.cvErr=''; this.cv=null;
      let deg = NaN;
      const s = this.cvInput.trim();
      if (!s) { this.cvErr='Enter a bearing value.'; return; }
      if (this.cvFormat==='decimal')  deg = parseFloat(s);
      else if (this.cvFormat==='dms') deg = this._parseDMS(s);
      else                            deg = this._parseCompass(s);

      if (isNaN(deg)) { this.cvErr=`Cannot parse "${s}" as ${this.cvFormat} format.`; return; }
      deg = this._norm(deg);

      this.cv = {
        deg,
        decimal:  deg.toFixed(4)+'°',
        dms:      this._toDMS(deg),
        compass:  this._cardinal(deg),
        quadrant: this._toQuadrant(deg),
        paddedDeg: String(Math.round(deg)).padStart(3,'0')+'°',
      };
      this._setCompass(deg, 'Converted bearing');
    },

    /* ── Magnetic Correction ─────────────────────────────── */
    calcMag() {
      this.mgErr=''; this.mg=null;
      const tb=parseFloat(this.mgTrue), dc=parseFloat(this.mgDecl);
      if (isNaN(tb)) { this.mgErr='Enter a true bearing (0–360°).'; return; }
      if (isNaN(dc)) { this.mgErr='Enter declination in degrees (positive = East, negative = West).'; return; }
      const norm = this._norm(tb);
      const mag  = this._norm(tb-dc);   // true → magnetic: subtract East declination
      this.mg = {
        true:     norm.toFixed(2), trueCard:  this._cardinal(norm),
        magnetic: mag.toFixed(2),  magCard:   this._cardinal(mag),
        decl:     Math.abs(dc).toFixed(2),
        declDir:  dc>0?'East':dc<0?'West':'None',
        formula:  dc>0
          ? `${norm.toFixed(1)}° − ${dc.toFixed(1)}° = ${mag.toFixed(1)}°`
          : dc<0
          ? `${norm.toFixed(1)}° + ${Math.abs(dc).toFixed(1)}° = ${mag.toFixed(1)}°`
          : `No correction applied`,
      };
      this._setCompass(norm, 'True bearing');
    },

    /* ── Helpers ─────────────────────────────────────────── */
    copy(txt) {
      navigator.clipboard?.writeText(txt).then(()=>this._toast('Copied!'));
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t=document.getElementById('toast');
      if (!t) return;
      t.textContent=msg; t.classList.add('show');
      setTimeout(()=>t.classList.remove('show'),2000);
    },

    /* ── Example presets ─────────────────────────────────── */
    loadExample(which) {
      if (which==='london-paris') {
        this.lat1='51.5074'; this.lng1='-0.1278';
        this.lat2='48.8566'; this.lng2='2.3522';
        this.activeTab='p2p'; this.calcP2P();
      } else if (which==='nyc-la') {
        this.lat1='40.7128'; this.lng1='-74.0060';
        this.lat2='34.0522'; this.lng2='-118.2437';
        this.activeTab='p2p'; this.calcP2P();
      }
    },
  };
}
