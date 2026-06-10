/* ── Two's Complement Calculator ── */

function tcApp() {
  return {
    mode:   'dec2bin',  /* 'dec2bin' | 'bin2dec' */
    bits:   8,
    input:  '',
    result: null,
    steps:  null,
    err:    '',
    copyOk: '',

    /* ── Dec → Bin ── */
    calculate() {
      this.err = ''; this.result = null; this.steps = null;
      const raw = this.input.trim();
      if (!raw) return;

      if (this.mode === 'dec2bin') {
        const n = parseInt(raw, 10);
        if (isNaN(n) || raw.replace(/^-/, '') !== Math.abs(n).toString()) {
          this.err = 'Enter a whole decimal integer (e.g. -13 or 42).'; return;
        }
        const bits = this.bits;
        const min = -(2 ** (bits - 1));
        const max =  (2 ** (bits - 1)) - 1;
        if (n < min || n > max) {
          this.err = `Value out of range for ${bits}-bit two's complement (${min} to ${max}).`; return;
        }
        this.result = this._dec2bin(n, bits);
        if (n < 0) this.steps = this._steps(n, bits);

      } else {
        const clean = raw.replace(/\s/g, '');
        if (!/^[01]+$/.test(clean)) {
          this.err = 'Binary input must contain only 0s and 1s.'; return;
        }
        const bits = clean.length;
        const n = this._bin2dec(clean);
        this.result = {
          decimal: n,
          binary:  clean,
          hex:     this._toHex(n < 0 ? (n + 2 ** bits) >>> 0 : n, bits),
          octal:   this._toOctal(n < 0 ? (n + 2 ** bits) >>> 0 : n),
          bits,
          isNeg: n < 0,
        };
        if (n < 0) this.steps = this._stepsReverse(clean, n);
      }
    },

    _dec2bin(n, bits) {
      let unsigned = n < 0 ? (n + 2 ** bits) >>> 0 : n;
      const bin = unsigned.toString(2).padStart(bits, '0');
      return {
        decimal: n,
        binary:  bin,
        hex:     this._toHex(unsigned, bits),
        octal:   this._toOctal(unsigned),
        bits,
        isNeg: n < 0,
      };
    },

    _bin2dec(bin) {
      const bits = bin.length;
      if (bin[0] === '1') {
        return parseInt(bin, 2) - 2 ** bits;
      }
      return parseInt(bin, 2);
    },

    _toHex(unsigned, bits) {
      const nibbles = Math.ceil(bits / 4);
      return '0x' + unsigned.toString(16).toUpperCase().padStart(nibbles, '0');
    },

    _toOctal(unsigned) {
      return '0o' + unsigned.toString(8);
    },

    /* Steps for negative decimal → two's complement */
    _steps(n, bits) {
      const abs     = Math.abs(n);
      const magBin  = abs.toString(2).padStart(bits, '0');
      const invBin  = magBin.split('').map(b => b === '0' ? '1' : '0').join('');
      /* add 1 to inverted */
      let carry = 1, addArr = invBin.split('').reverse();
      for (let i = 0; i < addArr.length; i++) {
        const s = parseInt(addArr[i]) + carry;
        addArr[i] = (s % 2).toString();
        carry = Math.floor(s / 2);
        if (!carry) break;
      }
      const result = addArr.reverse().join('');
      return { abs, magBin, invBin, result, bits };
    },

    /* Steps for binary → negative decimal */
    _stepsReverse(bin, decimal) {
      const inv = bin.split('').map(b => b === '0' ? '1' : '0').join('');
      let carry = 1, addArr = inv.split('').reverse();
      for (let i = 0; i < addArr.length; i++) {
        const s = parseInt(addArr[i]) + carry;
        addArr[i] = (s % 2).toString();
        carry = Math.floor(s / 2);
        if (!carry) break;
      }
      const magnitude = addArr.reverse().join('');
      return { bin, inv, magnitude, decimal };
    },

    /* Bit groups of 4 for display */
    grouped(bin) {
      if (!bin) return '';
      return bin.match(/.{1,4}/g)?.join(' ') ?? bin;
    },

    async copy(text, key) {
      try {
        await navigator.clipboard.writeText(String(text));
        this.copyOk = key;
        setTimeout(() => { this.copyOk = ''; }, 1800);
      } catch (_) {}
    },

    clear() { this.input = ''; this.result = null; this.steps = null; this.err = ''; },

    switchMode(m) {
      this.mode = m;
      this.clear();
    },

    get bitOptions() { return [8, 16, 32, 64]; },
  };
}
