/* ── JSON syntax highlighter ── */
function syntaxHighlight(json) {
  return json
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      m => {
        let c = 'jn';
        if (/^"/.test(m)) c = /:$/.test(m) ? 'jk' : 'js';
        else if (/true|false/.test(m)) c = 'jb';
        else if (/null/.test(m)) c = 'jnu';
        return `<span class="${c}">${m}</span>`;
      }
    )
    .replace(/([{}\[\],])/g,'<span class="jbr">$1</span>');
}

/* ── Estimate error position ── */
function locateError(src, msg) {
  const m = msg.match(/position (\d+)/i) || msg.match(/at (\d+)$/);
  if (!m) return null;
  const pos = parseInt(m[1]);
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < src.length; i++) {
    if (src[i] === '\n') { line++; col = 1; } else col++;
  }
  return { pos, line, col };
}

/* ── Deep type tree builder (up to depth 4) ── */
function buildTypeTree(val, depth = 0, key = null) {
  const MAX = 4;
  const keyHtml = key !== null ? `<span class="tt-key">${escHtml(String(key))}</span>: ` : '';
  if (val === null) return `${keyHtml}<span class="tt-type tt-null">null</span>`;
  const t = Array.isArray(val) ? 'array' : typeof val;
  const badge = `<span class="tt-type tt-${t}">${t}${t==='array'?` [${val.length}]`:t==='object'?` {${Object.keys(val).length}}`:''}</span>`;
  if ((t === 'object' || t === 'array') && depth < MAX) {
    const entries = t === 'array'
      ? val.slice(0, 12).map((v, i) => buildTypeTree(v, depth+1, i))
      : Object.keys(val).slice(0, 24).map(k => buildTypeTree(val[k], depth+1, k));
    const more = (t === 'array' ? val.length : Object.keys(val).length) > entries.length;
    return `${keyHtml}${badge}\n<div class="tt-indent">${entries.join('\n')}${more ? '\n<span style="color:var(--text-faint)">…</span>' : ''}</div>`;
  }
  return `${keyHtml}${badge}`;
}

function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ── Stats collector ── */
function collectStats(val) {
  let keys=0,arrays=0,strings=0,numbers=0,booleans=0,nulls=0,depth=0;
  function walk(v, d) {
    depth = Math.max(depth, d);
    if (v === null) { nulls++; return; }
    if (typeof v === 'string') { strings++; return; }
    if (typeof v === 'number') { numbers++; return; }
    if (typeof v === 'boolean') { booleans++; return; }
    if (Array.isArray(v)) { arrays++; v.forEach(i => walk(i, d+1)); return; }
    if (typeof v === 'object') { Object.keys(v).forEach(k => { keys++; walk(v[k], d+1); }); }
  }
  walk(val, 0);
  return { keys, arrays, strings, numbers, booleans, nulls, depth };
}

/* ── Simple JSON Schema validator (draft-07 subset) ── */
function validateSchema(data, schema, path = '$') {
  const errs = [];
  function check(d, s, p) {
    if (!s || typeof s !== 'object') return;
    /* type */
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      const actual = d === null ? 'null' : Array.isArray(d) ? 'array' : typeof d;
      if (!types.includes(actual)) errs.push(`${p}: expected type ${types.join('|')}, got ${actual}`);
    }
    /* required */
    if (s.required && typeof d === 'object' && d !== null && !Array.isArray(d)) {
      s.required.forEach(k => { if (!(k in d)) errs.push(`${p}: missing required property "${k}"`); });
    }
    /* properties */
    if (s.properties && typeof d === 'object' && d !== null && !Array.isArray(d)) {
      Object.keys(s.properties).forEach(k => { if (k in d) check(d[k], s.properties[k], `${p}.${k}`); });
    }
    /* additionalProperties = false */
    if (s.additionalProperties === false && typeof d === 'object' && d !== null && !Array.isArray(d)) {
      const allowed = new Set(Object.keys(s.properties || {}));
      Object.keys(d).forEach(k => { if (!allowed.has(k)) errs.push(`${p}: additional property "${k}" not allowed`); });
    }
    /* minLength / maxLength */
    if (typeof d === 'string') {
      if (s.minLength !== undefined && d.length < s.minLength) errs.push(`${p}: string length ${d.length} < minLength ${s.minLength}`);
      if (s.maxLength !== undefined && d.length > s.maxLength) errs.push(`${p}: string length ${d.length} > maxLength ${s.maxLength}`);
      if (s.pattern) { try { if (!new RegExp(s.pattern).test(d)) errs.push(`${p}: string does not match pattern ${s.pattern}`); } catch {} }
    }
    /* minimum / maximum */
    if (typeof d === 'number') {
      if (s.minimum !== undefined && d < s.minimum) errs.push(`${p}: ${d} < minimum ${s.minimum}`);
      if (s.maximum !== undefined && d > s.maximum) errs.push(`${p}: ${d} > maximum ${s.maximum}`);
      if (s.exclusiveMinimum !== undefined && d <= s.exclusiveMinimum) errs.push(`${p}: ${d} <= exclusiveMinimum ${s.exclusiveMinimum}`);
      if (s.exclusiveMaximum !== undefined && d >= s.exclusiveMaximum) errs.push(`${p}: ${d} >= exclusiveMaximum ${s.exclusiveMaximum}`);
      if (s.multipleOf !== undefined && d % s.multipleOf !== 0) errs.push(`${p}: ${d} is not a multiple of ${s.multipleOf}`);
    }
    /* enum */
    if (s.enum) {
      if (!s.enum.some(e => JSON.stringify(e) === JSON.stringify(d))) errs.push(`${p}: value not in enum [${s.enum.map(e=>JSON.stringify(e)).join(', ')}]`);
    }
    /* const */
    if ('const' in s && JSON.stringify(d) !== JSON.stringify(s.const)) errs.push(`${p}: value does not equal const ${JSON.stringify(s.const)}`);
    /* items / minItems / maxItems */
    if (Array.isArray(d)) {
      if (s.minItems !== undefined && d.length < s.minItems) errs.push(`${p}: array length ${d.length} < minItems ${s.minItems}`);
      if (s.maxItems !== undefined && d.length > s.maxItems) errs.push(`${p}: array length ${d.length} > maxItems ${s.maxItems}`);
      if (s.items) d.forEach((item, i) => check(item, Array.isArray(s.items) ? s.items[i] : s.items, `${p}[${i}]`));
      if (s.uniqueItems) {
        const seen = new Set(); let dup = false;
        d.forEach(item => { const k = JSON.stringify(item); if (seen.has(k)) dup = true; seen.add(k); });
        if (dup) errs.push(`${p}: array items are not unique`);
      }
    }
    /* allOf / anyOf / oneOf */
    if (s.allOf) s.allOf.forEach((sub, i) => check(d, sub, `${p}[allOf[${i}]]`));
    if (s.anyOf) {
      const matches = s.anyOf.filter(sub => { const e=[]; validateSchema(d,sub,p); return e.length===0; });
      if (matches.length === 0) errs.push(`${p}: value does not match any schema in anyOf`);
    }
    if (s.oneOf) {
      const cnt = s.oneOf.filter(sub => { const tmp=[]; return tmp.length===0; }).length;
      if (cnt !== 1) errs.push(`${p}: value must match exactly one schema in oneOf`);
    }
    /* not */
    if (s.not) {
      const subErrs = validateSchema(d, s.not, p);
      if (subErrs.length === 0) errs.push(`${p}: value must NOT match the "not" schema`);
    }
  }
  check(data, schema, path);
  return errs;
}

/* ══════════════════════════════════════════
   Alpine component
══════════════════════════════════════════ */
function jsonValidatorApp() {
  return {
    input: '',
    outputHtml: '',
    parsed: null,
    issues: [],
    stats: null,
    typeTreeHtml: '',
    isValid: null,   /* null=empty, true, false */

    schemaText: '',
    schemaResult: null,  /* null | {ok:bool, msgs:[]} */

    liveMode: true,
    activeSection: 'issues',  /* issues | tree | stats | schema */

    SAMPLE_VALID: `{
  "user": {
    "id": 1042,
    "name": "Alice Nguyen",
    "email": "alice@example.com",
    "roles": ["admin", "editor"],
    "active": true,
    "address": null
  },
  "meta": {
    "version": "2.1.0",
    "generated": "2026-06-07T00:00:00Z"
  }
}`,

    SAMPLE_INVALID: `{
  "name": 'Alice',
  "roles": ["admin", "editor",],
  "score": 99.9.1,
  "active": True,
}`,

    init() {
      this.input = this.SAMPLE_VALID;
      this._run();
    },

    /* ── Live validation on input ── */
    onInput() {
      if (this.liveMode) this._run();
    },

    validate() { this._run(); },

    _run() {
      const src = this.input.trim();
      if (!src) {
        this.isValid = null;
        this.issues = [];
        this.outputHtml = '';
        this.stats = null;
        this.typeTreeHtml = '';
        this.parsed = null;
        this.schemaResult = null;
        return;
      }
      try {
        this.parsed = JSON.parse(src);
        this.isValid = true;
        this.issues = [];
        /* syntax-highlighted output */
        const pretty = JSON.stringify(this.parsed, null, 2);
        this.outputHtml = syntaxHighlight(pretty);
        /* stats */
        this.stats = collectStats(this.parsed);
        /* type tree */
        this.typeTreeHtml = buildTypeTree(this.parsed);
        /* re-run schema if one is loaded */
        if (this.schemaText.trim()) this._runSchema();
      } catch (e) {
        this.isValid = false;
        this.outputHtml = '';
        this.stats = null;
        this.typeTreeHtml = '';
        this.parsed = null;
        this.schemaResult = null;

        const loc = locateError(src, e.message);
        this.issues = [{
          level: 'error',
          msg: e.message,
          path: loc ? `Line ${loc.line}, column ${loc.col}` : null,
          detail: loc ? `Character position: ${loc.pos}` : null,
        }];
      }
    },

    /* ── Schema validation ── */
    _runSchema() {
      if (!this.parsed) return;
      let schema;
      try {
        schema = JSON.parse(this.schemaText.trim());
      } catch(e) {
        this.schemaResult = { ok: false, msgs: ['Schema is not valid JSON: ' + e.message] };
        return;
      }
      const errs = validateSchema(this.parsed, schema);
      this.schemaResult = { ok: errs.length === 0, msgs: errs };
      if (!this.schemaResult.ok) this.activeSection = 'schema';
    },

    validateSchema() { this._runSchema(); },

    clearSchema() { this.schemaText = ''; this.schemaResult = null; },

    loadSchemaExample() {
      this.schemaText = JSON.stringify({
        type: 'object',
        required: ['user', 'meta'],
        properties: {
          user: {
            type: 'object',
            required: ['id', 'name', 'email'],
            properties: {
              id: { type: 'number' },
              name: { type: 'string', minLength: 1 },
              email: { type: 'string', pattern: '^[^@]+@[^@]+\\.[^@]+$' },
              roles: { type: 'array', items: { type: 'string' } },
              active: { type: 'boolean' }
            }
          },
          meta: {
            type: 'object',
            required: ['version'],
            properties: { version: { type: 'string' } }
          }
        }
      }, null, 2);
    },

    /* ── Samples ── */
    loadValid()   { this.input = this.SAMPLE_VALID;   this._run(); },
    loadInvalid() { this.input = this.SAMPLE_INVALID; this._run(); },

    clear() {
      this.input = '';
      this.isValid = null;
      this.issues = [];
      this.outputHtml = '';
      this.stats = null;
      this.typeTreeHtml = '';
      this.parsed = null;
      this.schemaText = '';
      this.schemaResult = null;
    },

    /* ── File upload ── */
    handleFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => { this.input = ev.target.result; this._run(); };
      reader.readAsText(file);
      e.target.value = '';
    },

    /* ── Copy / Download ── */
    async copyInput() {
      try { await navigator.clipboard.writeText(this.input); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },

    async copyFormatted() {
      if (!this.parsed) return;
      const text = JSON.stringify(this.parsed, null, 2);
      try { await navigator.clipboard.writeText(text); this._toast('Copied formatted JSON!'); }
      catch { this._toast('Copy failed'); }
    },

    download() {
      if (!this.parsed) return;
      const blob = new Blob([JSON.stringify(this.parsed, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'validated.json';
      a.click();
    },

    /* ── Computed ── */
    get statusLabel() {
      if (this.isValid === null) return 'No input';
      return this.isValid ? 'Valid JSON ✓' : 'Invalid JSON ✗';
    },
    get statusClass() {
      if (this.isValid === null) return 'status-empty';
      return this.isValid ? 'status-valid' : 'status-error';
    },
    get inputPaneClass() {
      if (this.isValid === null) return '';
      return this.isValid ? 'valid-state' : 'error-state';
    },
    get errorCount() { return this.issues.filter(i=>i.level==='error').length; },
    get warningCount() { return this.issues.filter(i=>i.level==='warning').length; },

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
