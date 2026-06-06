/* ── Case conversion helpers ── */
function toUpperCase(t)    { return t.toUpperCase(); }
function toLowerCase(t)    { return t.toLowerCase(); }
function toTitleCase(t)    { return t.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()); }
function toSentenceCase(t) {
  return t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase());
}
function toCamelCase(t) {
  return t.trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toLowerCase());
}
function toPascalCase(t) {
  const cc = toCamelCase(t);
  return cc.charAt(0).toUpperCase() + cc.slice(1);
}
function toSnakeCase(t) {
  return t.trim()
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s\-\.]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
}
function toKebabCase(t) {
  return t.trim()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_\.]+/g, '-')
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toLowerCase();
}
function toDotCase(t) {
  return t.trim()
    .replace(/([a-z])([A-Z])/g, '$1.$2')
    .replace(/[\s_\-]+/g, '.')
    .replace(/[^a-zA-Z0-9\.]/g, '')
    .toLowerCase();
}
function toAlternatingCase(t) {
  return t.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
}
function toInverseCase(t) {
  return t.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
}
function toConstantCase(t) {
  return toSnakeCase(t).toUpperCase();
}

const CONVERSIONS = [
  { id: 'upper',       label: 'UPPER CASE',      example: 'HELLO WORLD',   fn: toUpperCase },
  { id: 'lower',       label: 'lower case',       example: 'hello world',   fn: toLowerCase },
  { id: 'title',       label: 'Title Case',       example: 'Hello World',   fn: toTitleCase },
  { id: 'sentence',    label: 'Sentence case',    example: 'Hello world.',  fn: toSentenceCase },
  { id: 'camel',       label: 'camelCase',        example: 'helloWorld',    fn: toCamelCase },
  { id: 'pascal',      label: 'PascalCase',       example: 'HelloWorld',    fn: toPascalCase },
  { id: 'snake',       label: 'snake_case',       example: 'hello_world',   fn: toSnakeCase },
  { id: 'kebab',       label: 'kebab-case',       example: 'hello-world',   fn: toKebabCase },
  { id: 'dot',         label: 'dot.case',         example: 'hello.world',   fn: toDotCase },
  { id: 'constant',    label: 'CONSTANT_CASE',    example: 'HELLO_WORLD',   fn: toConstantCase },
  { id: 'alternating', label: 'aLtErNaTiNg',      example: 'hElLo wOrLd',   fn: toAlternatingCase },
  { id: 'inverse',     label: 'iNVERSE cASE',     example: 'hELLO wORLD',   fn: toInverseCase },
];

/* ── Alpine.js component ── */
function caseConverterApp() {
  return {
    input: '',
    activeCase: 'upper',
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,
    conversions: CONVERSIONS,

    get output() {
      if (!this.input.trim()) return '';
      const conv = CONVERSIONS.find(c => c.id === this.activeCase);
      return conv ? conv.fn(this.input) : this.input;
    },

    get charCount()   { return this.input.length; },
    get wordCount()   { return this.input.trim() ? this.input.trim().split(/\s+/).length : 0; },
    get lineCount()   { return this.input ? this.input.split('\n').length : 0; },
    get outLength()   { return this.output.length; },

    setCase(id) { this.activeCase = id; },

    copyOutput() {
      if (!this.output) { this.showToast('Nothing to copy'); return; }
      navigator.clipboard.writeText(this.output)
        .then(() => this.showToast('Copied to clipboard!'))
        .catch(() => this.showToast('Copy failed'));
    },

    copyAll() {
      const lines = CONVERSIONS.map(c => `${c.label}: ${c.fn(this.input)}`).join('\n');
      navigator.clipboard.writeText(lines)
        .then(() => this.showToast('All conversions copied!'))
        .catch(() => this.showToast('Copy failed'));
    },

    clearInput() {
      this.input = '';
    },

    pasteInput() {
      navigator.clipboard.readText()
        .then(t => { this.input = t; this.showToast('Pasted!'); })
        .catch(() => this.showToast('Clipboard access denied'));
    },

    convertFn(id) {
      const conv = CONVERSIONS.find(c => c.id === id);
      return conv ? conv.fn(this.input) : '';
    },

    toggleFaq(i) { this.openFaq = this.openFaq === i ? null : i; },

    submitReport() { if (this.reportSelected) this.reportSent = true; },
    closeReport() {
      this.reportOpen = false;
      setTimeout(() => { this.reportSent = false; this.reportSelected = ''; }, 400);
    },

    showToast(msg) {
      this.toastMsg = msg;
      clearTimeout(this._toastTimer);
      this.$nextTick(() => {
        const el = document.getElementById('cc-toast');
        if (el) el.classList.add('show');
        this._toastTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2500);
      });
    },

    init() {
      document.addEventListener('scroll', () => {
        const h = document.querySelector('.site-header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }
  };
}

function switchInfoTab(id) {
  document.querySelectorAll('.info-tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('tab-' + id);
  const btn = document.querySelector('[data-tab="' + id + '"]');
  if (pane) pane.classList.add('active');
  if (btn) btn.classList.add('active');
}
