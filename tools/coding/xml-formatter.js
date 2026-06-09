/* ── XML Formatter & Validator ── */

/* ════════════════════════════════════════════════
   XML PARSER / FORMATTER
   Pure JS — no external deps
════════════════════════════════════════════════ */

const INDENT_MAP = { '2': '  ', '4': '    ', 'tab': '\t' };

/* ── tokeniser ── */
const TOKEN_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/[^>]+>|<[^>]+\/>|<[^>]+>|[^<]+/g;

function tokenise(xml) {
  return (xml.match(TOKEN_RE) || []).filter(t => t.trim() !== '');
}

/* classify a single token */
function tokenType(t) {
  if (t.startsWith('<!--'))             return 'comment';
  if (t.startsWith('<![CDATA['))        return 'cdata';
  if (t.startsWith('<?'))              return 'pi';
  if (t.startsWith('<!DOCTYPE'))       return 'doctype';
  if (t.startsWith('</'))              return 'close';
  if (t.endsWith('/>'))                return 'self';
  if (t.startsWith('<'))               return 'open';
  return 'text';
}

/* ── formatter ── */
function formatXml(xml, indentStr) {
  const tokens = tokenise(xml.trim());
  let depth  = 0;
  let output = '';

  for (const tok of tokens) {
    const type = tokenType(tok);
    if (type === 'close') {
      depth = Math.max(0, depth - 1);
      output += indentStr.repeat(depth) + tok + '\n';
    } else if (type === 'open') {
      output += indentStr.repeat(depth) + tok + '\n';
      depth++;
    } else if (type === 'self' || type === 'comment' || type === 'cdata' || type === 'pi' || type === 'doctype') {
      output += indentStr.repeat(depth) + tok + '\n';
    } else {
      /* text node — trim and skip blank */
      const trimmed = tok.trim();
      if (trimmed) output += indentStr.repeat(depth) + trimmed + '\n';
    }
  }
  return output.trimEnd();
}

/* ── minifier ── */
function minifyXml(xml) {
  return xml
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ══════════════════════════════════════════════
   VALIDATOR
   Returns { ok, errors[], warnings[] }
══════════════════════════════════════════════ */
function validateXml(xml) {
  const errors   = [];
  const warnings = [];
  const src      = xml.trim();

  if (!src) return { ok: false, errors: [{ msg: 'Document is empty', line: 1 }], warnings };

  /* ── try DOMParser (available in all modern browsers) ── */
  const parser  = new DOMParser();
  const doc     = parser.parseFromString(src, 'application/xml');
  const parseErr = doc.querySelector('parsererror');

  if (parseErr) {
    /* extract the error text */
    const raw = parseErr.textContent.trim();
    /* try to extract line/col */
    const lineMatch = raw.match(/line\s+(\d+)/i);
    const colMatch  = raw.match(/column\s+(\d+)/i);
    const lineNum   = lineMatch ? parseInt(lineMatch[1]) : '?';
    const colNum    = colMatch  ? parseInt(colMatch[1])  : '?';
    /* clean up the message */
    const msg = raw.split('\n')[0].replace(/error on line \d+ at column \d+:/i, '').trim()
                || raw.split('\n').slice(-1)[0].trim();
    errors.push({ msg, line: lineNum, col: colNum });
    return { ok: false, errors, warnings };
  }

  /* ── extra well-formedness checks ── */

  /* duplicate attributes check (DOMParser silently dedupes) */
  const tagRe = /<[^/?!][^>]*>/g;
  let m;
  const lines = src.split('\n');
  while ((m = tagRe.exec(src)) !== null) {
    const tag    = m[0];
    const attrRe = /(\w[\w\-.:]*)=/g;
    const seen   = new Set();
    let am;
    while ((am = attrRe.exec(tag)) !== null) {
      const name = am[1];
      if (seen.has(name)) {
        const lineIdx = src.slice(0, m.index).split('\n').length;
        errors.push({ msg: `Duplicate attribute "${name}"`, line: lineIdx });
      }
      seen.add(name);
    }
  }

  /* encoding declaration warning */
  if (!src.startsWith('<?xml')) {
    warnings.push({ msg: 'No XML declaration found. Consider adding <?xml version="1.0" encoding="UTF-8"?>' });
  }

  /* namespace without prefix warning */
  if (src.includes('xmlns=') && src.includes('xmlns:')) {
    /* fine, just informational */
  }

  /* mixed content warning — text alongside child elements */
  const allElems = doc.querySelectorAll('*');
  allElems.forEach(el => {
    let hasText = false, hasElem = false;
    el.childNodes.forEach(n => {
      if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
      if (n.nodeType === 1) hasElem = true;
    });
    if (hasText && hasElem) {
      warnings.push({ msg: `Mixed content in <${el.tagName}>: contains both text and child elements` });
    }
  });

  return { ok: errors.length === 0, errors, warnings };
}

/* ══════════════════════════════════════════════
   SYNTAX HIGHLIGHTER
   Input: formatted XML string → HTML string
══════════════════════════════════════════════ */
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlightXml(xml) {
  /* Process line by line for accurate colouring */
  return xml.split('\n').map(line => {
    /* comment */
    if (/^\s*<!--/.test(line)) {
      return `<span class="xc">${escHtml(line)}</span>`;
    }
    /* CDATA */
    if (/^\s*<!\[CDATA\[/.test(line)) {
      return `<span class="xd">${escHtml(line)}</span>`;
    }
    /* processing instruction */
    if (/^\s*<\?/.test(line)) {
      return `<span class="xp">${escHtml(line)}</span>`;
    }
    /* DOCTYPE */
    if (/^\s*<!DOCTYPE/.test(line)) {
      return `<span class="xp">${escHtml(line)}</span>`;
    }
    /* closing tag */
    if (/^\s*<\//.test(line)) {
      return line.replace(/(<\/)([\w:.-]+)(>)/, (_, a, b, c) =>
        `<span class="xbr">${escHtml(a)}</span><span class="xt">${escHtml(b)}</span><span class="xbr">${escHtml(c)}</span>`
      );
    }
    /* self-closing or open tag with possible attributes */
    if (/^\s*<[\w:]/.test(line)) {
      return line
        /* tag name */
        .replace(/(<)([\w:.-]+)/, (_, lt, name) =>
          `<span class="xbr">${escHtml(lt)}</span><span class="xt">${escHtml(name)}</span>`
        )
        /* attribute name=value */
        .replace(/([\w:.-]+)(=)("[^"]*"|'[^']*')/g, (_, attr, eq, val) =>
          `<span class="xa">${escHtml(attr)}</span><span class="xbr">${escHtml(eq)}</span><span class="xv">${escHtml(val)}</span>`
        )
        /* standalone attribute (no value) */
        .replace(/\s([\w:.-]+)(?==|>|\s|\/)/g, (_, attr) => ` <span class="xa">${escHtml(attr)}</span>`)
        /* closing bracket */
        .replace(/(\/?>)$/, c => `<span class="xbr">${escHtml(c)}</span>`);
    }
    /* plain text node */
    return `<span class="xtxt">${escHtml(line)}</span>`;
  }).join('\n');
}

/* ══════════════════════════════════════════════
   STATS COLLECTOR
══════════════════════════════════════════════ */
function collectStats(xml) {
  try {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return null;

    let elements = 0, attrs = 0, textNodes = 0, comments = 0, cdatas = 0, depth = 0, maxDepth = 0;

    function walk(node, d) {
      if (node.nodeType === 1) { elements++; attrs += node.attributes.length; }
      if (node.nodeType === 3 && node.textContent.trim()) textNodes++;
      if (node.nodeType === 8) comments++;
      if (node.nodeType === 4) cdatas++;
      depth = d;
      if (d > maxDepth) maxDepth = d;
      node.childNodes.forEach(c => walk(c, d + 1));
    }
    walk(doc.documentElement, 0);

    return {
      elements,
      attrs,
      textNodes,
      comments,
      cdatas,
      depth: maxDepth,
    };
  } catch { return null; }
}

/* ══════════════════════════════════════════════
   SIMPLE XPATH-LIKE QUERY
   Supports: /tag, //tag, /tag/child, @attr
══════════════════════════════════════════════ */
function queryXpath(xml, expr) {
  try {
    const parser  = new DOMParser();
    const doc     = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return [];

    const results = [];

    /* Use document.evaluate if supported */
    const ns = (prefix) => null;
    try {
      const xr = doc.evaluate(expr, doc, ns, XPathResult.ANY_TYPE, null);
      let node;
      const seen = new Set();
      while ((node = xr.iterateNext())) {
        const path = getNodePath(node);
        if (!seen.has(path)) { results.push(path); seen.add(path); }
        if (results.length >= 50) break;
      }
    } catch {
      /* If XPath expression is invalid, return a hint */
      results.push('Invalid XPath expression. Try: /root/child or //tagname or //@attrname');
    }
    return results;
  } catch { return []; }
}

function getNodePath(node) {
  const parts = [];
  let cur = node;
  while (cur && cur.nodeType !== 9 /* DOCUMENT */) {
    if (cur.nodeType === 2 /* ATTRIBUTE */) {
      parts.unshift('@' + cur.name + '="' + cur.value + '"');
      cur = cur.ownerElement;
    } else if (cur.nodeType === 1) {
      let idx = 1;
      let sib = cur.previousSibling;
      while (sib) { if (sib.nodeType === 1 && sib.tagName === cur.tagName) idx++; sib = sib.previousSibling; }
      parts.unshift(cur.tagName + (idx > 1 ? `[${idx}]` : ''));
      cur = cur.parentNode;
    } else break;
  }
  return '/' + parts.join('/');
}

/* ══════════════════════════════════════════════
   ALPINE COMPONENT
══════════════════════════════════════════════ */
function xmlFormatterApp() {
  return {
    input:       '',
    output:      '',
    outputHtml:  '',
    indent:      '2',
    isValid:     null,   /* true / false / null */
    errorMsg:    '',
    statusLabel: 'Empty',
    statusClass: 'status-empty',
    stats:       null,
    validation:  null,  /* { ok, errors, warnings } */
    xpathQuery:  '',
    xpathResults:[],
    inputSize:   '—',
    outputSize:  '—',

    /* ── init ── */
    init() {
      this.$watch('input', () => this._run());
      this.$watch('indent', () => this._run());
    },

    /* ── main pipeline ── */
    _run() {
      const src = this.input.trim();
      if (!src) {
        this.output = ''; this.outputHtml = ''; this.isValid = null;
        this.statusLabel = 'Empty'; this.statusClass = 'status-empty';
        this.errorMsg = ''; this.stats = null; this.validation = null;
        this.inputSize = '—'; this.outputSize = '—';
        return;
      }

      this.inputSize = this._size(this.input);
      const indentStr = INDENT_MAP[this.indent] || '  ';

      /* validate first */
      const vr = validateXml(src);
      this.validation = vr;

      if (!vr.ok) {
        this.isValid     = false;
        this.statusLabel = 'Invalid XML';
        this.statusClass = 'status-error';
        const e = vr.errors[0];
        this.errorMsg = `Line ${e.line}${e.col ? `:${e.col}` : ''} — ${e.msg}`;
        /* still attempt to format */
        try {
          const fmt  = formatXml(src, indentStr);
          this.output     = fmt;
          this.outputHtml = highlightXml(fmt);
          this.outputSize = this._size(fmt);
        } catch {
          this.output = src; this.outputHtml = escHtml(src);
        }
        this.stats = null;
        return;
      }

      /* valid → format + highlight */
      const fmt = formatXml(src, indentStr);
      this.output     = fmt;
      this.outputHtml = highlightXml(fmt);
      this.outputSize = this._size(fmt);
      this.isValid    = true;
      this.errorMsg   = '';
      this.statusLabel = 'Valid XML';
      this.statusClass = 'status-valid';
      this.stats      = collectStats(src);

      if (this.xpathQuery) this._runXpath();
    },

    /* ── format button ── */
    format() { this._run(); },

    /* ── minify ── */
    minify() {
      const src = this.input.trim();
      if (!src) return;
      const min = minifyXml(src);
      this.output    = min;
      this.outputHtml = `<span class="xtxt">${escHtml(min)}</span>`;
      this.outputSize = this._size(min);
      this._toast('Minified!');
    },

    /* ── validate explicitly ── */
    validate() {
      this._run();
      this._toast(this.isValid ? '✓ Valid XML' : '✗ Invalid XML — see validation panel');
    },

    /* ── convert to JSON (basic) ── */
    toJson() {
      const src = this.input.trim();
      if (!src) return;
      try {
        const parser = new DOMParser();
        const doc    = parser.parseFromString(src, 'application/xml');
        if (doc.querySelector('parsererror')) { this._toast('Fix XML errors first'); return; }
        const obj  = _xmlNodeToObj(doc.documentElement);
        const json = JSON.stringify(obj, null, INDENT_MAP[this.indent] || '  ');
        this.output     = json;
        this.outputHtml = _jsonHighlight(json);
        this.outputSize = this._size(json);
        this._toast('Converted to JSON!');
      } catch (e) { this._toast('Conversion failed: ' + e.message); }
    },

    /* ── xpath search ── */
    _runXpath() {
      if (!this.xpathQuery || !this.input.trim()) { this.xpathResults = []; return; }
      this.xpathResults = queryXpath(this.input, this.xpathQuery);
    },

    runXpath() { this._runXpath(); },

    /* ── file upload ── */
    handleFile(ev) {
      const f = ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (e) => { this.input = e.target.result; };
      reader.readAsText(f);
    },

    /* ── download ── */
    download() {
      if (!this.output) return;
      const blob = new Blob([this.output], { type: 'application/xml' });
      const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'formatted.xml' });
      a.click(); URL.revokeObjectURL(a.href);
      this._toast('Downloaded!');
    },

    /* ── copy ── */
    copyInput()  { this._copy(this.input,  'Input copied!'); },
    copyOutput() { this._copy(this.output, 'Output copied!'); },
    _copy(text, msg) {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => this._toast(msg));
    },

    /* ── sample ── */
    loadSample() {
      this.input = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Sample library catalog XML -->
<library name="City Library" established="1920">
  <catalog>
    <book id="bk001" available="true">
      <title>The Great Gatsby</title>
      <author>
        <first>F. Scott</first>
        <last>Fitzgerald</last>
      </author>
      <year>1925</year>
      <genre>Fiction</genre>
      <price currency="USD">12.99</price>
    </book>
    <book id="bk002" available="false">
      <title>To Kill a Mockingbird</title>
      <author>
        <first>Harper</first>
        <last>Lee</last>
      </author>
      <year>1960</year>
      <genre>Fiction</genre>
      <price currency="USD">14.50</price>
    </book>
    <book id="bk003" available="true">
      <title>1984</title>
      <author>
        <first>George</first>
        <last>Orwell</last>
      </author>
      <year>1949</year>
      <genre>Dystopian</genre>
      <price currency="USD">11.25</price>
    </book>
  </catalog>
  <members total="1482">
    <member id="m001" type="premium">
      <name>Alice Johnson</name>
      <joined>2019-03-15</joined>
    </member>
  </members>
</library>`;
    },

    /* ── clear ── */
    clear() {
      this.input = ''; this.output = ''; this.outputHtml = '';
      this.xpathQuery = ''; this.xpathResults = [];
    },

    /* ── FAQ toggle ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    /* ── helpers ── */
    _size(s) {
      const bytes = new TextEncoder().encode(s).length;
      return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    },
  };
}

/* ── XML node → JS object (for JSON conversion) ── */
function _xmlNodeToObj(node) {
  const obj = {};

  /* attributes */
  if (node.attributes && node.attributes.length) {
    obj['@attributes'] = {};
    for (const attr of node.attributes) obj['@attributes'][attr.name] = attr.value;
  }

  /* children */
  const childEls = Array.from(node.childNodes).filter(n => n.nodeType === 1);
  const textOnly = Array.from(node.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim());

  if (!childEls.length && textOnly.length) {
    const text = node.textContent.trim();
    return obj['@attributes'] ? { ...obj, '#text': text } : text;
  }

  childEls.forEach(child => {
    const val = _xmlNodeToObj(child);
    if (obj[child.tagName] !== undefined) {
      if (!Array.isArray(obj[child.tagName])) obj[child.tagName] = [obj[child.tagName]];
      obj[child.tagName].push(val);
    } else {
      obj[child.tagName] = val;
    }
  });

  return Object.keys(obj).length ? obj : '';
}

/* minimal JSON syntax highlighter for converted output */
function _jsonHighlight(json) {
  return escHtml(json)
    .replace(/"((?:[^"\\]|\\.)*)"\s*:/g, '<span style="color:#7dd3fc">"$1"</span>:')
    .replace(/:\s*"((?:[^"\\]|\\.)*)"/g, ': <span style="color:#86efac">"$1"</span>')
    .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span style="color:#fbbf24">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:#f472b6">$1</span>')
    .replace(/:\s*(null)/g, ': <span style="color:#94a3b8">$1</span>');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
