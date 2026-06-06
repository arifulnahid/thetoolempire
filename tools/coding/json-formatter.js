/* ─── JSON syntax highlighter ─── */
function syntaxHighlight(json) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      match => {
        let cls = 'jn'; // number
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'jk' : 'js';
        } else if (/true|false/.test(match)) {
          cls = 'jb';
        } else if (/null/.test(match)) {
          cls = 'jnu';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    )
    .replace(/([{}\[\],])/g, '<span class="jbr">$1</span>');
}

/* ─── Path extractor ─── */
function extractPaths(obj, prefix = '') {
  const paths = [];
  if (typeof obj !== 'object' || obj === null) return [prefix || '$'];
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => paths.push(...extractPaths(v, `${prefix}[${i}]`)));
  } else {
    Object.keys(obj).forEach(k => {
      const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? `.${k}` : `["${k}"]`;
      paths.push(...extractPaths(obj[k], prefix + key));
    });
  }
  return paths.length ? paths : [prefix];
}

/* ─── Stats ─── */
function getStats(obj) {
  let keys = 0, arrays = 0, strings = 0, numbers = 0, booleans = 0, nulls = 0, depth = 0;
  function walk(v, d = 0) {
    depth = Math.max(depth, d);
    if (v === null) { nulls++; return; }
    if (typeof v === 'string') { strings++; return; }
    if (typeof v === 'number') { numbers++; return; }
    if (typeof v === 'boolean') { booleans++; return; }
    if (Array.isArray(v)) { arrays++; v.forEach(i => walk(i, d + 1)); return; }
    if (typeof v === 'object') { Object.keys(v).forEach(k => { keys++; walk(v[k], d + 1); }); }
  }
  walk(obj);
  return { keys, arrays, strings, numbers, booleans, nulls, depth };
}

/* ─── Simple line-level JSON diff ─── */
function jsonDiff(a, b) {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const setA = new Set(linesA.map(l => l.trim()).filter(Boolean));
  const setB = new Set(linesB.map(l => l.trim()).filter(Boolean));
  const result = [];
  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    const la = (linesA[i] || '').trimEnd();
    const lb = (linesB[i] || '').trimEnd();
    if (la === lb) { result.push({ type: 'same', text: la }); }
    else {
      if (la) result.push({ type: 'del', text: la });
      if (lb) result.push({ type: 'add', text: lb });
    }
  }
  return result;
}

/* ─── Alpine component ─── */
function jsonFormatterApp() {
  return {
    input: '',
    output: '',
    outputHtml: '',
    errorMsg: '',
    isValid: null,
    indent: 2,
    sortKeys: false,
    stats: null,

    diffA: '',
    diffB: '',
    diffResult: [],

    searchQuery: '',
    searchPaths: [],

    sample: `{\n  "name": "The Tool Empire",\n  "version": "2026",\n  "tools": ["json-formatter","color-picker","gradient-generator"],\n  "meta": {\n    "free": true,\n    "signup": false,\n    "users": 42000\n  }\n}`,

    init() {
      this.input = this.sample;
      this.format();
    },

    /* ── Format / Beautify ── */
    format() {
      if (!this.input.trim()) { this.clear(); return; }
      try {
        let parsed = JSON.parse(this.input);
        if (this.sortKeys) parsed = this._sortObj(parsed);
        const spaces = this.indent === 'tab' ? '\t' : Number(this.indent);
        this.output = JSON.stringify(parsed, null, spaces);
        this.outputHtml = syntaxHighlight(this.output);
        this.errorMsg = '';
        this.isValid = true;
        this.stats = getStats(parsed);
      } catch (e) {
        this.output = '';
        this.outputHtml = '';
        this.errorMsg = e.message;
        this.isValid = false;
        this.stats = null;
      }
    },

    /* ── Minify ── */
    minify() {
      if (!this.input.trim()) return;
      try {
        const parsed = JSON.parse(this.input);
        this.output = JSON.stringify(parsed);
        this.outputHtml = syntaxHighlight(this.output);
        this.errorMsg = '';
        this.isValid = true;
        this.stats = getStats(parsed);
      } catch (e) {
        this.errorMsg = e.message;
        this.isValid = false;
      }
    },

    /* ── Validate only ── */
    validate() {
      if (!this.input.trim()) return;
      try {
        JSON.parse(this.input);
        this.isValid = true;
        this.errorMsg = '';
        this._toast('✓ Valid JSON');
      } catch (e) {
        this.isValid = false;
        this.errorMsg = e.message;
      }
    },

    /* ── Sort keys ── */
    _sortObj(obj) {
      if (Array.isArray(obj)) return obj.map(i => this._sortObj(i));
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).sort().reduce((acc, k) => {
          acc[k] = this._sortObj(obj[k]);
          return acc;
        }, {});
      }
      return obj;
    },

    /* ── Repair (lenient parse) ── */
    repair() {
      let s = this.input.trim();
      // trailing commas
      s = s.replace(/,\s*([}\]])/g, '$1');
      // single quotes → double quotes (simple heuristic)
      s = s.replace(/'/g, '"');
      // unquoted keys
      s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
      try {
        const parsed = JSON.parse(s);
        this.input = s;
        this.format();
        this._toast('Repaired & formatted');
      } catch (e) {
        this.errorMsg = 'Could not auto-repair: ' + e.message;
        this.isValid = false;
      }
    },

    /* ── Load sample ── */
    loadSample() {
      this.input = this.sample;
      this.format();
    },

    /* ── Clear ── */
    clear() {
      this.input = '';
      this.output = '';
      this.outputHtml = '';
      this.errorMsg = '';
      this.isValid = null;
      this.stats = null;
    },

    /* ── Diff ── */
    runDiff() {
      let a = this.diffA.trim(), b = this.diffB.trim();
      try { a = JSON.stringify(JSON.parse(a), null, 2); } catch(e) {}
      try { b = JSON.stringify(JSON.parse(b), null, 2); } catch(e) {}
      this.diffResult = jsonDiff(a, b);
    },

    /* ── Search / path ── */
    runSearch() {
      if (!this.output || !this.searchQuery.trim()) { this.searchPaths = []; return; }
      try {
        const parsed = JSON.parse(this.output);
        const q = this.searchQuery.toLowerCase();
        const all = extractPaths(parsed);
        this.searchPaths = all.filter(p => p.toLowerCase().includes(q)).slice(0, 50);
      } catch(e) { this.searchPaths = []; }
    },

    /* ── Copy ── */
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

    /* ── Download ── */
    download() {
      if (!this.output) return;
      const blob = new Blob([this.output], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'formatted.json';
      a.click();
    },

    /* ── Upload file ── */
    handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { this.input = ev.target.result; this.format(); };
      reader.readAsText(file);
      e.target.value = '';
    },

    /* ── Computed ── */
    get statusLabel() {
      if (this.isValid === null) return 'Empty';
      return this.isValid ? 'Valid JSON' : 'Invalid JSON';
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

    /* ── FAQ toggle ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
