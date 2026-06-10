/* ── ASCII / Unicode Converter — Alpine component ── */

/* Full printable ASCII table (32–126) */
const ASCII_TABLE = Array.from({ length: 95 }, (_, i) => {
  const code = i + 32;
  const ch   = String.fromCharCode(code);
  const cats = {
    32:  'Space',
    33:  'Punctuation', 34: 'Punctuation', 35: 'Punctuation', 36: 'Symbol',
    37:  'Punctuation', 38: 'Punctuation', 39: 'Punctuation', 40: 'Punctuation',
    41:  'Punctuation', 42: 'Symbol',      43: 'Symbol',      44: 'Punctuation',
    45:  'Punctuation', 46: 'Punctuation', 47: 'Symbol',
  };
  let cat = cats[code] || '';
  if (!cat) {
    if (code >= 48 && code <= 57)  cat = 'Digit';
    else if (code >= 65 && code <= 90)  cat = 'Uppercase';
    else if (code >= 97 && code <= 122) cat = 'Lowercase';
    else cat = 'Symbol';
  }
  return { code, ch, hex: code.toString(16).padStart(2,'0').toUpperCase(), binary: code.toString(2).padStart(8,'0'), cat };
});

/* C0 control characters */
const CONTROL_NAMES = [
  'NUL','SOH','STX','ETX','EOT','ENQ','ACK','BEL','BS','HT','LF','VT','FF','CR',
  'SO','SI','DLE','DC1','DC2','DC3','DC4','NAK','SYN','ETB','CAN','EM','SUB',
  'ESC','FS','GS','RS','US',
];

function asciiUnicodeApp() {
  return {
    /* ─ tabs ─────────────────────────── */
    tab: 'text',        /* text | char | table | special */

    /* ─ text ↔ codes ─────────────────── */
    textInput:   '',
    textMode:    'decimal',   /* decimal | hex | binary | octal | html | url */
    textResult:  '',
    textReverse: false,       /* true = codes → text */

    /* ─ single char lookup ────────────── */
    charInput: '',
    charResult: null,

    /* ─ table filter ─────────────────── */
    tableSearch:  '',
    tableCat:     'All',
    tableMode:    'decimal',  /* decimal | hex | binary | octal */

    /* ─ special / unicode ─────────────── */
    uInput:      '',
    uMode:       'codepoint', /* codepoint | name | emoji */
    uResult:     null,
    uErr:        '',

    /* ─ copy toast ───────────────────── */
    copyKey: '',

    /* ── init ────────────────────────── */
    init() {
      this.$watch('textInput',   () => this._convertText());
      this.$watch('textMode',    () => this._convertText());
      this.$watch('textReverse', () => this._convertText());
      this.$watch('charInput',   () => this._lookupChar());
      this.$watch('uInput',      () => this._lookupUnicode());
      this.$watch('uMode',       () => this._lookupUnicode());
    },

    /* ── Text ↔ Codes ─────────────────── */
    _convertText() {
      const v = this.textInput.trim();
      if (!v) { this.textResult = ''; return; }

      if (!this.textReverse) {
        /* text → codes */
        const parts = [];
        for (const ch of v) {
          const cp = ch.codePointAt(0);
          switch (this.textMode) {
            case 'decimal': parts.push(cp); break;
            case 'hex':     parts.push('0x' + cp.toString(16).toUpperCase()); break;
            case 'binary':  parts.push(cp.toString(2)); break;
            case 'octal':   parts.push('0o' + cp.toString(8)); break;
            case 'html':    parts.push(`&#${cp};`); break;
            case 'url':     parts.push(encodeURIComponent(ch)); break;
          }
        }
        this.textResult = this.textMode === 'url' ? parts.join('') : parts.join(' ');
      } else {
        /* codes → text */
        try {
          let out = '';
          const m = this.textMode;
          if (m === 'url') {
            out = decodeURIComponent(v);
          } else if (m === 'html') {
            const tmp = document.createElement('textarea');
            tmp.innerHTML = v;
            out = tmp.value;
          } else {
            const tokens = v.split(/[\s,]+/).filter(Boolean);
            for (const t of tokens) {
              let cp;
              if (m === 'decimal') cp = parseInt(t, 10);
              else if (m === 'hex') cp = parseInt(t.replace(/^0x/i,''), 16);
              else if (m === 'binary') cp = parseInt(t.replace(/^0b/i,''), 2);
              else if (m === 'octal')  cp = parseInt(t.replace(/^0o/i,''), 8);
              if (isNaN(cp) || cp < 0 || cp > 0x10FFFF) throw new Error(`Invalid: ${t}`);
              out += String.fromCodePoint(cp);
            }
          }
          this.textResult = out;
        } catch (e) {
          this.textResult = '⚠ ' + e.message;
        }
      }
    },

    /* ── Single char lookup ───────────── */
    _lookupChar() {
      const v = this.charInput.trim();
      if (!v) { this.charResult = null; return; }

      let cp;
      /* detect if input is a code rather than a glyph */
      const isNum = /^(?:0x[\da-f]+|\d+|0b[01]+|0o[0-7]+|U\+[\da-f]+)$/i.test(v);
      if (isNum) {
        const clean = v.replace(/^U\+/i,'0x').replace(/^0b/i,'').replace(/^0o/i,'');
        if (/^0x/i.test(v) || /^U\+/i.test(v)) cp = parseInt(clean,16);
        else if (/^0b/i.test(v)) cp = parseInt(v.replace(/^0b/i,''),2);
        else if (/^0o/i.test(v)) cp = parseInt(v.replace(/^0o/i,''),8);
        else cp = parseInt(v, 10);
      } else {
        cp = v.codePointAt(0);
      }

      if (isNaN(cp) || cp < 0 || cp > 0x10FFFF) { this.charResult = { err: 'Invalid code point' }; return; }

      const ch = String.fromCodePoint(cp);
      const inAscii = cp < 128;
      const ctrlName = cp < 32 ? CONTROL_NAMES[cp] : cp === 127 ? 'DEL' : '';
      const block   = this._unicodeBlock(cp);
      const cat     = this._unicodeCat(cp);

      this.charResult = {
        ch: cp >= 32 && cp !== 127 ? ch : '',
        cp,
        decimal:  cp,
        hex:      cp.toString(16).toUpperCase().padStart(cp <= 0xFF ? 2 : cp <= 0xFFFF ? 4 : 6, '0'),
        uplus:    'U+' + cp.toString(16).toUpperCase().padStart(4,'0'),
        binary:   cp.toString(2).padStart(cp <= 0xFF ? 8 : cp <= 0xFFFF ? 16 : 21, '0'),
        octal:    '0o' + cp.toString(8),
        htmlDec:  `&#${cp};`,
        htmlHex:  `&#x${cp.toString(16).toUpperCase()};`,
        urlEnc:   encodeURIComponent(ch),
        utf8:     this._toUtf8Bytes(cp),
        utf16:    this._toUtf16(cp),
        ctrlName,
        inAscii,
        block,
        cat,
      };
    },

    /* ── Unicode special lookup ───────── */
    _lookupUnicode() {
      const v = this.uInput.trim();
      if (!v) { this.uResult = null; this.uErr = ''; return; }
      this.uErr = '';
      try {
        if (this.uMode === 'codepoint') {
          const clean = v.replace(/^U\+/i,'');
          const cp    = parseInt(clean, 16);
          if (isNaN(cp) || cp < 0 || cp > 0x10FFFF) throw new Error('Code point out of range (0 – 10FFFF)');
          const ch = String.fromCodePoint(cp);
          this.uResult = {
            ch, cp,
            uplus:    'U+' + cp.toString(16).toUpperCase().padStart(4,'0'),
            block:    this._unicodeBlock(cp),
            cat:      this._unicodeCat(cp),
            decimal:  cp,
            hex:      cp.toString(16).toUpperCase(),
            htmlDec:  `&#${cp};`,
            htmlHex:  `&#x${cp.toString(16).toUpperCase()};`,
            urlEnc:   encodeURIComponent(ch),
            utf8:     this._toUtf8Bytes(cp),
          };
        } else if (this.uMode === 'emoji') {
          const ch  = [...v][0];
          const cp  = ch?.codePointAt(0);
          if (!cp) throw new Error('Enter an emoji character');
          const isEmoji = cp > 0xFF;
          if (!isEmoji) throw new Error('Not a multi-byte emoji');
          this.uResult = {
            ch, cp,
            uplus:    'U+' + cp.toString(16).toUpperCase().padStart(4,'0'),
            block:    this._unicodeBlock(cp),
            cat:      'Emoji / Symbol',
            decimal:  cp,
            hex:      cp.toString(16).toUpperCase(),
            htmlDec:  `&#${cp};`,
            htmlHex:  `&#x${cp.toString(16).toUpperCase()};`,
            urlEnc:   encodeURIComponent(ch),
            utf8:     this._toUtf8Bytes(cp),
          };
        }
      } catch(e) {
        this.uErr = e.message;
        this.uResult = null;
      }
    },

    /* ── Computed: filtered table ─────── */
    get filteredTable() {
      const q   = this.tableSearch.toLowerCase();
      const cat = this.tableCat;
      return ASCII_TABLE.filter(r => {
        if (cat !== 'All' && r.cat !== cat) return false;
        if (!q) return true;
        return r.ch.toLowerCase().includes(q)
            || String(r.code).includes(q)
            || r.hex.toLowerCase().includes(q)
            || r.cat.toLowerCase().includes(q)
            || r.binary.includes(q);
      });
    },

    /* ── Copy ─────────────────────────── */
    async copy(text, key) {
      try {
        await navigator.clipboard.writeText(text);
        this.copyKey = key;
        setTimeout(() => { this.copyKey = ''; }, 1600);
      } catch (_) {}
    },

    /* ── Helpers ──────────────────────── */
    _toUtf8Bytes(cp) {
      const bytes = [];
      const enc = new TextEncoder().encode(String.fromCodePoint(cp));
      enc.forEach(b => bytes.push('0x' + b.toString(16).toUpperCase().padStart(2,'0')));
      return bytes.join(' ');
    },

    _toUtf16(cp) {
      if (cp <= 0xFFFF) return 'U+' + cp.toString(16).toUpperCase().padStart(4,'0');
      const hi = 0xD800 + ((cp - 0x10000) >> 10);
      const lo = 0xDC00 + ((cp - 0x10000) & 0x3FF);
      return `U+${hi.toString(16).toUpperCase()} U+${lo.toString(16).toUpperCase()}`;
    },

    _unicodeBlock(cp) {
      if (cp < 0x0080)  return 'Basic Latin';
      if (cp < 0x0100)  return 'Latin-1 Supplement';
      if (cp < 0x0180)  return 'Latin Extended-A';
      if (cp < 0x0250)  return 'Latin Extended-B';
      if (cp < 0x02B0)  return 'IPA Extensions';
      if (cp < 0x0300)  return 'Spacing Modifier Letters';
      if (cp < 0x0370)  return 'Combining Diacritical Marks';
      if (cp < 0x0400)  return 'Greek and Coptic';
      if (cp < 0x0500)  return 'Cyrillic';
      if (cp < 0x0600)  return 'Armenian / Hebrew';
      if (cp < 0x0700)  return 'Arabic';
      if (cp < 0x0900)  return 'Syriac / Thaana';
      if (cp < 0x0A00)  return 'Devanagari';
      if (cp < 0x0B00)  return 'Bengali / Gurmukhi';
      if (cp < 0x0C00)  return 'Oriya';
      if (cp < 0x0D00)  return 'Tamil / Telugu';
      if (cp < 0x0E00)  return 'Kannada / Malayalam';
      if (cp < 0x0F00)  return 'Thai / Lao';
      if (cp < 0x1000)  return 'Tibetan';
      if (cp < 0x10A0)  return 'Myanmar';
      if (cp < 0x1100)  return 'Georgian';
      if (cp < 0x1200)  return 'Hangul Jamo';
      if (cp < 0x1380)  return 'Ethiopic';
      if (cp < 0x2000)  return 'Latin Extended / Modifiers';
      if (cp < 0x2070)  return 'General Punctuation';
      if (cp < 0x20A0)  return 'Superscripts & Subscripts';
      if (cp < 0x20D0)  return 'Currency Symbols';
      if (cp < 0x2100)  return 'Combining Diacritical Marks';
      if (cp < 0x2150)  return 'Letterlike Symbols';
      if (cp < 0x2190)  return 'Number Forms';
      if (cp < 0x2200)  return 'Arrows';
      if (cp < 0x2300)  return 'Mathematical Operators';
      if (cp < 0x2400)  return 'Miscellaneous Technical';
      if (cp < 0x2440)  return 'Control Pictures';
      if (cp < 0x2460)  return 'Optical Character Recognition';
      if (cp < 0x2500)  return 'Enclosed Alphanumerics';
      if (cp < 0x2580)  return 'Box Drawing';
      if (cp < 0x25A0)  return 'Block Elements';
      if (cp < 0x2600)  return 'Geometric Shapes';
      if (cp < 0x2700)  return 'Miscellaneous Symbols';
      if (cp < 0x27C0)  return 'Dingbats';
      if (cp < 0x3000)  return 'Arrows / Math';
      if (cp < 0x3040)  return 'CJK Symbols & Punctuation';
      if (cp < 0x30A0)  return 'Hiragana';
      if (cp < 0x3100)  return 'Katakana';
      if (cp < 0x3200)  return 'Bopomofo';
      if (cp < 0x3400)  return 'CJK Unified Ideographs Extension A';
      if (cp < 0x4E00)  return 'CJK Unified Ideographs Ext-A';
      if (cp < 0xA000)  return 'CJK Unified Ideographs';
      if (cp < 0xA490)  return 'Yi Syllables';
      if (cp < 0xAC00)  return 'Yi Radicals / Lisu';
      if (cp < 0xD800)  return 'Hangul Syllables';
      if (cp < 0xE000)  return 'Surrogates';
      if (cp < 0xF900)  return 'Private Use Area';
      if (cp < 0xFB00)  return 'CJK Compatibility Ideographs';
      if (cp < 0xFE00)  return 'Alphabetic Presentation Forms';
      if (cp < 0xFF00)  return 'Variation Selectors / Etc';
      if (cp < 0x10000) return 'Halfwidth & Fullwidth Forms';
      if (cp < 0x10100) return 'Linear B Syllabary';
      if (cp < 0x10400) return 'Gothic / Ugaritic / Etc';
      if (cp < 0x10600) return 'Deseret / Shavian / Etc';
      if (cp < 0x10900) return 'Various Ancient Scripts';
      if (cp < 0x1F000) return 'Symbols & Ancient Scripts';
      if (cp < 0x1F200) return 'Mahjong / Domino Tiles';
      if (cp < 0x1F600) return 'Enclosed Alphanumeric Supplement';
      if (cp < 0x1F650) return 'Emoticons (Emoji)';
      if (cp < 0x1F700) return 'Ornamental Dingbats';
      if (cp < 0x1F780) return 'Alchemical Symbols';
      if (cp < 0x1F800) return 'Geometric Shapes Extended';
      if (cp < 0x1F900) return 'Supplemental Arrows-C';
      if (cp < 0x1FA00) return 'Supplemental Symbols & Pictographs';
      if (cp < 0x20000) return 'Chess / Symbols / Etc';
      if (cp < 0x2A6E0) return 'CJK Extension B';
      if (cp < 0x2CEB0) return 'CJK Extension C/D';
      if (cp < 0x2FA20) return 'CJK Compatibility Supplement';
      return 'Supplementary Private Use / Tags';
    },

    _unicodeCat(cp) {
      if (cp < 32 || cp === 127) return 'Control';
      if (cp >= 48  && cp <= 57)  return 'Decimal Digit';
      if (cp >= 65  && cp <= 90)  return 'Uppercase Letter';
      if (cp >= 97  && cp <= 122) return 'Lowercase Letter';
      if (cp >= 0xC0 && cp <= 0x2AF) return 'Latin Letter';
      if (cp >= 0x370 && cp <= 0x3FF) return 'Greek Letter';
      if (cp >= 0x400 && cp <= 0x4FF) return 'Cyrillic Letter';
      if (cp >= 0x600 && cp <= 0x6FF) return 'Arabic Letter';
      if (cp >= 0x900 && cp <= 0x97F) return 'Devanagari Letter';
      if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK Ideograph';
      if (cp >= 0xAC00 && cp <= 0xD7AF) return 'Hangul Syllable';
      if (cp >= 0x3041 && cp <= 0x309F) return 'Hiragana';
      if (cp >= 0x30A0 && cp <= 0x30FF) return 'Katakana';
      if (cp >= 0x1F600 && cp <= 0x1FAFF) return 'Emoji';
      if (cp >= 0x2600 && cp <= 0x27FF) return 'Symbol';
      if (cp >= 0x2000 && cp <= 0x206F) return 'Punctuation';
      if (cp >= 0x20A0 && cp <= 0x20CF) return 'Currency';
      if (cp >= 0x2190 && cp <= 0x21FF) return 'Arrow';
      if (cp >= 0x2200 && cp <= 0x22FF) return 'Math Operator';
      return 'Other';
    },

    tableColLabel(col) {
      return { decimal:'Dec', hex:'Hex', binary:'Binary', octal:'Oct' }[col] || col;
    },

    tableColValue(row, col) {
      if (col === 'decimal') return row.code;
      if (col === 'hex')     return '0x' + row.hex;
      if (col === 'binary')  return row.binary;
      if (col === 'octal')   return '0o' + row.code.toString(8).padStart(3,'0');
      return '';
    },
  };
}
