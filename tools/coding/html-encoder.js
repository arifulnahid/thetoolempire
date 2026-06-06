/* ── Entity maps ── */
const NAMED_ENTITIES = {
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;',
  '©':'&copy;', '®':'&reg;', '™':'&trade;',
  '£':'&pound;', '€':'&euro;', '¥':'&yen;', '¢':'&cent;',
  '°':'&deg;', '±':'&plusmn;', '×':'&times;', '÷':'&divide;',
  '²':'&sup2;', '³':'&sup3;', '½':'&frac12;', '¼':'&frac14;', '¾':'&frac34;',
  '→':'&rarr;', '←':'&larr;', '↑':'&uarr;', '↓':'&darr;', '↔':'&harr;',
  '•':'&bull;', '…':'&hellip;', '–':'&ndash;', '—':'&mdash;',
  ' ':'&nbsp;', '«':'&laquo;', '»':'&raquo;',
  '‹':'&lsaquo;', '›':'&rsaquo;',
  '‘':'&lsquo;', '’':'&rsquo;', '“':'&ldquo;', '”':'&rdquo;',
  '♠':'&spades;', '♣':'&clubs;', '♥':'&hearts;', '♦':'&diams;',
  '∞':'&infin;', '√':'&radic;', '∑':'&sum;', '∏':'&prod;',
  'α':'&alpha;', 'β':'&beta;', 'γ':'&gamma;', 'δ':'&delta;', 'ε':'&epsilon;',
  'π':'&pi;', 'σ':'&sigma;', 'τ':'&tau;', 'φ':'&phi;', 'ω':'&omega;',
  'Α':'&Alpha;', 'Β':'&Beta;', 'Γ':'&Gamma;', 'Δ':'&Delta;', 'Ω':'&Omega;',
  '¡':'&iexcl;', '¿':'&iquest;', 'ñ':'&ntilde;', 'ü':'&uuml;', 'ö':'&ouml;',
  'ä':'&auml;', 'â':'&acirc;', 'à':'&agrave;', 'á':'&aacute;', 'ã':'&atilde;',
  'ê':'&ecirc;', 'è':'&egrave;', 'é':'&eacute;', 'ë':'&euml;',
  'î':'&icirc;', 'ì':'&igrave;', 'í':'&iacute;', 'ï':'&iuml;',
  'ô':'&ocirc;', 'ò':'&ograve;', 'ó':'&oacute;', 'õ':'&otilde;', 'ø':'&oslash;',
  'û':'&ucirc;', 'ù':'&ugrave;', 'ú':'&uacute;',
  'ç':'&ccedil;', 'ý':'&yacute;', 'ÿ':'&yuml;', 'æ':'&aelig;',
  'Ñ':'&Ntilde;', 'Ü':'&Uuml;', 'Ö':'&Ouml;', 'Ä':'&Auml;', 'Ç':'&Ccedil;',
  'Æ':'&AElig;', 'Ø':'&Oslash;', 'ß':'&szlig;',
};

/* Reverse map for decode */
const DECODE_MAP = {};
for (const [char, entity] of Object.entries(NAMED_ENTITIES)) {
  DECODE_MAP[entity] = char;
}

/* ── Encode ── */
function htmlEncode(str, opts = {}) {
  const { namedEntities = true, encodeAll = false, encodeQuotes = true } = opts;
  let result = '';
  for (const ch of str) {
    const code = ch.codePointAt(0);
    if (namedEntities && NAMED_ENTITIES[ch]) {
      // always encode & < > ; quotes optional
      if (!encodeQuotes && (ch === '"' || ch === "'")) {
        result += ch;
      } else {
        result += NAMED_ENTITIES[ch];
      }
    } else if (encodeAll && code > 127) {
      result += `&#${code};`;
    } else {
      result += ch;
    }
  }
  return result;
}

/* ── Decode ── */
function htmlDecode(str) {
  // named entities
  let s = str.replace(/&[a-zA-Z]+;/g, match => DECODE_MAP[match] ?? match);
  // decimal numeric &#123;
  s = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
  // hex numeric &#x1F600;
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
  return s;
}

/* ── Count entities in encoded string ── */
function countEntities(str) {
  const matches = str.match(/&[#a-zA-Z][a-zA-Z0-9]*;/g);
  return matches ? matches.length : 0;
}

/* ── Reference entries for the table ── */
const ENTITY_REF = [
  { char: '&',  entity: '&amp;',   desc: 'Ampersand' },
  { char: '<',  entity: '&lt;',    desc: 'Less-than' },
  { char: '>',  entity: '&gt;',    desc: 'Greater-than' },
  { char: '"',  entity: '&quot;',  desc: 'Double quote' },
  { char: "'",  entity: '&apos;',  desc: 'Apostrophe' },
  { char: ' ',  entity: '&nbsp;',  desc: 'Non-breaking space' },
  { char: '©',  entity: '&copy;',  desc: 'Copyright' },
  { char: '®',  entity: '&reg;',   desc: 'Registered' },
  { char: '™',  entity: '&trade;', desc: 'Trademark' },
  { char: '€',  entity: '&euro;',  desc: 'Euro sign' },
  { char: '£',  entity: '&pound;', desc: 'Pound sign' },
  { char: '¥',  entity: '&yen;',   desc: 'Yen sign' },
  { char: '°',  entity: '&deg;',   desc: 'Degree' },
  { char: '±',  entity: '&plusmn;',desc: 'Plus-minus' },
  { char: '×',  entity: '&times;', desc: 'Multiply' },
  { char: '÷',  entity: '&divide;',desc: 'Divide' },
  { char: '→',  entity: '&rarr;',  desc: 'Right arrow' },
  { char: '←',  entity: '&larr;',  desc: 'Left arrow' },
  { char: '•',  entity: '&bull;',  desc: 'Bullet' },
  { char: '…',  entity: '&hellip;',desc: 'Ellipsis' },
  { char: '–',  entity: '&ndash;', desc: 'En dash' },
  { char: '—',  entity: '&mdash;', desc: 'Em dash' },
  { char: '½',  entity: '&frac12;',desc: 'One half' },
  { char: '¼',  entity: '&frac14;',desc: 'One quarter' },
  { char: '∞',  entity: '&infin;', desc: 'Infinity' },
  { char: 'π',  entity: '&pi;',    desc: 'Pi' },
  { char: 'α',  entity: '&alpha;', desc: 'Alpha' },
  { char: 'β',  entity: '&beta;',  desc: 'Beta' },
  { char: '♠',  entity: '&spades;',desc: 'Spades' },
  { char: '♥',  entity: '&hearts;',desc: 'Hearts' },
  { char: '♦',  entity: '&diams;', desc: 'Diamonds' },
  { char: '♣',  entity: '&clubs;', desc: 'Clubs' },
];

/* ── Alpine component ── */
function htmlEncoderApp() {
  return {
    mode: 'encode',
    input: '',
    output: '',
    errorMsg: '',
    isValid: null,

    /* options */
    namedEntities: true,
    encodeAll: false,
    encodeQuotes: true,

    entityRef: ENTITY_REF,

    sampleHtml: `<h1>Hello & Welcome!</h1>
<p>Use "quotes" and 'apostrophes' freely.</p>
<p>Symbols: © 2026, price €49.99, temp 37°C</p>
<a href="https://example.com?a=1&b=2">Link</a>`,

    sampleEncoded: `&lt;h1&gt;Hello &amp; Welcome!&lt;/h1&gt;
&lt;p&gt;Use &quot;quotes&quot; and &apos;apostrophes&apos; freely.&lt;/p&gt;
&lt;p&gt;Symbols: &copy; 2026, price &euro;49.99, temp 37&deg;C&lt;/p&gt;
&lt;a href=&quot;https://example.com?a=1&amp;b=2&quot;&gt;Link&lt;/a&gt;`,

    init() {
      this.input = this.sampleHtml;
      this.run();
    },

    run() {
      if (!this.input.trim()) {
        this.output = ''; this.errorMsg = ''; this.isValid = null; return;
      }
      if (this.mode === 'encode') {
        this.output = htmlEncode(this.input, {
          namedEntities: this.namedEntities,
          encodeAll: this.encodeAll,
          encodeQuotes: this.encodeQuotes,
        });
        this.isValid = true;
        this.errorMsg = '';
      } else {
        try {
          this.output = htmlDecode(this.input);
          this.isValid = true;
          this.errorMsg = '';
        } catch (e) {
          this.output = '';
          this.errorMsg = e.message;
          this.isValid = false;
        }
      }
    },

    setMode(m) {
      this.mode = m;
      this.errorMsg = ''; this.isValid = null;
      if (this.input.trim()) this.run();
    },

    swap() {
      if (!this.output) return;
      this.input = this.output;
      this.mode = this.mode === 'encode' ? 'decode' : 'encode';
      this.run();
    },

    loadSample() {
      this.mode = 'encode';
      this.input = this.sampleHtml;
      this.run();
    },

    loadSampleDecode() {
      this.mode = 'decode';
      this.input = this.sampleEncoded;
      this.run();
    },

    clear() {
      this.input = ''; this.output = ''; this.errorMsg = ''; this.isValid = null;
    },

    insertEntity(entity) {
      this.input += entity;
      this.run();
      this._toast('Inserted ' + entity);
    },

    get previewHtml() {
      if (this.mode === 'encode') {
        return this.input;
      }
      return this.output;
    },

    get entityCount() {
      if (this.mode === 'encode') return countEntities(this.output);
      return countEntities(this.input);
    },

    get statusLabel() {
      if (this.isValid === null) return 'Empty';
      return this.isValid ? (this.mode === 'encode' ? 'Encoded' : 'Decoded') : 'Error';
    },
    get statusClass() {
      if (this.isValid === null) return 'status-empty';
      return this.isValid ? 'status-valid' : 'status-error';
    },
    get inputSize() {
      const b = new Blob([this.input]).size;
      return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
    },
    get outputSize() {
      if (!this.output) return '—';
      const b = new Blob([this.output]).size;
      return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    async copyOutput() {
      if (!this.output) return;
      try { await navigator.clipboard.writeText(this.output); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyInput() {
      if (!this.input) return;
      try { await navigator.clipboard.writeText(this.input); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },

    download() {
      if (!this.output) return;
      const ext = this.mode === 'encode' ? '-encoded.html' : '-decoded.html';
      const blob = new Blob([this.output], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'html_output' + ext;
      a.click();
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
