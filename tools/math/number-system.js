/* ── Number System Tool — Alpine component ── */

const NS_DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/* ── conversion helpers ── */
function nsFromBase(str, base) {
  str = str.toLowerCase().trim();
  if (!str || str === '-') return NaN;
  const neg = str[0] === '-';
  if (neg) str = str.slice(1);
  const dot = str.indexOf('.');
  const intStr  = dot >= 0 ? str.slice(0, dot) : str;
  const fracStr = dot >= 0 ? str.slice(dot + 1) : '';
  let val = 0;
  for (const c of intStr) {
    const d = NS_DIGITS.indexOf(c);
    if (d < 0 || d >= base) return NaN;
    val = val * base + d;
  }
  let m = 1 / base;
  for (const c of fracStr) {
    const d = NS_DIGITS.indexOf(c);
    if (d < 0 || d >= base) return NaN;
    val += d * m; m /= base;
  }
  return neg ? -val : val;
}

function nsToBase(n, base, fracDigits = 10) {
  if (!isFinite(n) || isNaN(n)) return '';
  const neg = n < 0;
  n = Math.abs(n);
  const intPart  = Math.floor(n);
  let   fracPart = n - intPart;

  let intStr = '';
  let tmp = intPart;
  if (tmp === 0) { intStr = '0'; }
  while (tmp > 0) { intStr = NS_DIGITS[tmp % base] + intStr; tmp = Math.floor(tmp / base); }

  let fracStr = '';
  let prec = fracDigits;
  while (fracPart > 1e-14 && prec-- > 0) {
    fracPart *= base;
    const d = Math.floor(fracPart);
    fracStr += NS_DIGITS[d];
    fracPart -= d;
  }
  return (neg ? '-' : '') + intStr + (fracStr ? '.' + fracStr : '');
}

function nsPad(binStr, bits) {
  binStr = binStr.replace('-', '');
  while (binStr.length % bits !== 0) binStr = '0' + binStr;
  return binStr;
}

/* ── IEEE 754 ── */
function ieee754_32(f) {
  const buf = new ArrayBuffer(4);
  new Float32Array(buf)[0] = f;
  const bits = new Uint32Array(buf)[0];
  const bin  = bits.toString(2).padStart(32, '0');
  const sign = bin[0];
  const exp  = bin.slice(1, 9);
  const mant = bin.slice(9);
  const expVal  = parseInt(exp, 2);
  const expBias = expVal - 127;
  let value;
  if (expVal === 0)   value = expBias === -127 ? 'subnormal' : '0';
  else if (expVal === 255) value = parseInt(mant, 2) === 0 ? (sign === '1' ? '-∞' : '+∞') : 'NaN';
  else value = null;
  return { sign, exp, mant, expVal, expBias, bin, hex: bits.toString(16).padStart(8,'0').toUpperCase(), value };
}

function ieee754_64(f) {
  const buf  = new ArrayBuffer(8);
  new Float64Array(buf)[0] = f;
  const view = new DataView(buf);
  const hiU  = view.getUint32(4, false);
  const loU  = view.getUint32(0, false);
  const hi   = hiU.toString(2).padStart(32, '0');
  const lo   = loU.toString(2).padStart(32, '0');
  const bin  = hi + lo;
  const sign = bin[0];
  const exp  = bin.slice(1, 12);
  const mant = bin.slice(12);
  const expVal  = parseInt(exp, 2);
  const expBias = expVal - 1023;
  const hex = hiU.toString(16).padStart(8,'0').toUpperCase() + loU.toString(16).padStart(8,'0').toUpperCase();
  return { sign, exp, mant, expVal, expBias, bin, hex };
}

/* ── Alpine component ── */
function nsApp() {
  return {
    tab: 'convert',
    copyOk: '',

    /* ── Tab 1: Base Converter ── */
    cv: { bin:'', oct:'', dec:'', hex:'', cust:'' },
    cvBase: 16,
    cvErr:  '',
    _busy:  false,

    cvInput(field) {
      if (this._busy) return;
      this._busy = true;
      this.cvErr = '';
      const bases = { bin:2, oct:8, dec:10, hex:16, cust: Number(this.cvBase) };
      const raw = this.cv[field].trim();
      if (!raw) { Object.keys(this.cv).forEach(k => { if (k !== field) this.cv[k] = ''; }); this._busy = false; return; }
      const val = nsFromBase(raw, bases[field]);
      if (isNaN(val)) { this.cvErr = `"${raw}" is not valid in base ${bases[field]}.`; this._busy = false; return; }
      Object.keys(this.cv).forEach(k => {
        if (k === field) return;
        const b = bases[k];
        if (!b || b < 2 || b > 36) { this.cv[k] = ''; return; }
        this.cv[k] = nsToBase(val, b, Number.isInteger(val) ? 0 : 12);
      });
      this._busy = false;
    },

    cvBaseChange() {
      const b = Number(this.cvBase);
      if (b < 2 || b > 36 || isNaN(b)) return;
      /* recalc custom column from decimal if available */
      if (this.cv.dec) this.cvInput('dec');
    },

    cvClear() { Object.keys(this.cv).forEach(k => this.cv[k] = ''); this.cvErr = ''; },

    get cvBinGrouped() {
      const s = this.cv.bin.replace(/[^01]/g,'');
      if (!s) return '';
      return nsPad(s, 4).match(/.{1,4}/g)?.join(' ') ?? s;
    },

    /* ── Tab 2: Bitwise Calculator ── */
    bwA: '', bwB: '', bwBase: 'dec', bwOp: 'and',
    bwResult: null, bwErr: '',
    bwBits: 32,

    bwOps: [
      { id:'and',  label:'AND',   sym:'&',   unary:false },
      { id:'or',   label:'OR',    sym:'|',   unary:false },
      { id:'xor',  label:'XOR',   sym:'^',   unary:false },
      { id:'not',  label:'NOT A', sym:'~',   unary:true  },
      { id:'nand', label:'NAND',  sym:'~&',  unary:false },
      { id:'nor',  label:'NOR',   sym:'~|',  unary:false },
      { id:'lsh',  label:'A << B',sym:'<<',  unary:false },
      { id:'rsh',  label:'A >> B',sym:'>>',  unary:false },
      { id:'ursh', label:'A >>> B',sym:'>>>', unary:false },
    ],

    calcBw() {
      this.bwErr = ''; this.bwResult = null;
      const base = { bin:2, oct:8, dec:10, hex:16 }[this.bwBase] || 10;
      const a = Math.trunc(nsFromBase(this.bwA, base));
      if (isNaN(a)) { this.bwErr = 'Input A is not valid.'; return; }
      const op  = this.bwOps.find(o => o.id === this.bwOp);
      const unary = op?.unary;
      let b = 0;
      if (!unary) {
        b = Math.trunc(nsFromBase(this.bwB, base));
        if (isNaN(b)) { this.bwErr = 'Input B is not valid.'; return; }
      }
      let r;
      switch (this.bwOp) {
        case 'and':  r = (a & b) >>> 0; break;
        case 'or':   r = (a | b) >>> 0; break;
        case 'xor':  r = (a ^ b) >>> 0; break;
        case 'not':  r = (~a)    >>> 0; break;
        case 'nand': r = (~(a & b)) >>> 0; break;
        case 'nor':  r = (~(a | b)) >>> 0; break;
        case 'lsh':  r = (a << (b & 31)) >>> 0; break;
        case 'rsh':  r = (a >> (b & 31)) >>> 0; break;
        case 'ursh': r = (a >>> (b & 31)) >>> 0; break;
        default:     r = 0;
      }
      const bits = this.bwBits;
      const binFull = r.toString(2).padStart(32, '0');
      const binSliced = binFull.slice(32 - bits);
      this.bwResult = {
        bin: binSliced.match(/.{1,4}/g)?.join(' ') ?? binSliced,
        dec: r.toString(10),
        hex: r.toString(16).toUpperCase().padStart(Math.ceil(bits / 4), '0'),
        oct: r.toString(8),
        bits: binSliced.split(''),
        raw: r,
      };
    },

    get bwActiveOp() { return this.bwOps.find(o => o.id === this.bwOp); },

    /* ── Tab 3: IEEE 754 ── */
    f754In: '',
    f754: null, f754Err: '',

    calc754() {
      this.f754Err = ''; this.f754 = null;
      const v = parseFloat(this.f754In);
      if (isNaN(v) && this.f754In.trim().toLowerCase() !== 'nan') { this.f754Err = 'Enter a valid decimal number.'; return; }
      const n = isNaN(v) ? NaN : v;
      this.f754 = {
        input: isNaN(n) ? 'NaN' : n,
        f32: ieee754_32(isNaN(n) ? NaN : n),
        f64: ieee754_64(isNaN(n) ? NaN : n),
      };
    },

    /* ── Tab 4: ASCII / Unicode ── */
    ascIn: '', ascMode: 'char',
    ascResult: null, ascErr: '',

    calcAsc() {
      this.ascErr = ''; this.ascResult = null;
      if (!this.ascIn.trim()) return;
      let cp;
      if (this.ascMode === 'char') {
        const ch = this.ascIn[0];
        cp = ch.codePointAt(0);
      } else {
        /* allow 0x prefix for hex, 0b for binary, 0o for octal, or decimal */
        const raw = this.ascIn.trim();
        if (/^0x/i.test(raw))      cp = parseInt(raw, 16);
        else if (/^0b/i.test(raw)) cp = parseInt(raw.slice(2), 2);
        else if (/^0o/i.test(raw)) cp = parseInt(raw.slice(2), 8);
        else                       cp = parseInt(raw, 10);
        if (isNaN(cp) || cp < 0 || cp > 0x10FFFF) { this.ascErr = 'Enter a valid code point (0 – 1 114 111).'; return; }
      }
      const ch = String.fromCodePoint(cp);
      this.ascResult = {
        char:    ch,
        name:    cp < 128 ? ASCII_NAMES[cp] ?? '' : '',
        dec:     cp,
        hex:     cp.toString(16).toUpperCase().padStart(2,'0'),
        bin:     cp.toString(2).padStart(8, '0'),
        oct:     cp.toString(8),
        html:    cp < 128 && /[<>&"']/.test(ch) ? { '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[ch] : `&#${cp};`,
        unicode: `U+${cp.toString(16).toUpperCase().padStart(4,'0')}`,
        escape:  `\\u${cp.toString(16).toLowerCase().padStart(4,'0')}`,
        utf8:    [...new TextEncoder().encode(ch)].map(b => b.toString(16).toUpperCase().padStart(2,'0')).join(' '),
        isPrintable: cp >= 32 && cp !== 127,
      };
    },

    /* ── clipboard ── */
    async copy(text, key) {
      try {
        await navigator.clipboard.writeText(String(text));
        this.copyOk = key;
        setTimeout(() => { this.copyOk = ''; }, 1800);
      } catch(_) {}
    },
  };
}

/* ASCII name table (0–127) */
const ASCII_NAMES = ['NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','HT','LF','VT','FF','CR','SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB','ESC','FS','GS','RS','US','Space','!','"','#','$','%','&',"'",'(',')','*','+',',','-','.','/','0','1','2','3','4','5','6','7','8','9',':',';','<','=','>','?','@','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','[','\\',']','^','_','`','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','{','|','}','~','DEL'];
