/* FAQ Schema Generator */

let _faqId = 0;
function _mkFaq(q = '', a = '') {
  return { id: ++_faqId, question: q, answer: a };
}

function faqSchemaApp() {
  return {
    /* ── state ── */
    faqs: [_mkFaq('', ''), _mkFaq('', '')],
    pageName: '',
    pageUrl: '',
    importRaw: '',
    showImport: false,
    importError: '',
    codeCopied: false,
    activePreviewId: null,

    /* ── faq management ── */
    addFaq() {
      this.faqs.push(_mkFaq());
    },
    removeFaq(id) {
      if (this.faqs.length <= 1) return;
      this.faqs = this.faqs.filter(f => f.id !== id);
    },
    moveUp(idx) {
      if (idx === 0) return;
      [this.faqs[idx - 1], this.faqs[idx]] = [this.faqs[idx], this.faqs[idx - 1]];
    },
    moveDown(idx) {
      if (idx === this.faqs.length - 1) return;
      [this.faqs[idx], this.faqs[idx + 1]] = [this.faqs[idx + 1], this.faqs[idx]];
    },
    clearAll() {
      this.faqs = [_mkFaq(), _mkFaq()];
      this.pageName = '';
      this.pageUrl = '';
      this.activePreviewId = null;
    },

    togglePreview(id) {
      this.activePreviewId = this.activePreviewId === id ? null : id;
    },

    /* ── computed ── */
    get filledFaqs() {
      return this.faqs.filter(f => f.question.trim() && f.answer.trim());
    },

    get generatedSchema() {
      const mainEntity = this.filledFaqs.map(f => ({
        '@type': 'Question',
        name: f.question.trim(),
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer.trim(),
        },
      }));
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        ...(this.pageName.trim() ? { name: this.pageName.trim() } : {}),
        ...(this.pageUrl.trim()  ? { url: this.pageUrl.trim()   } : {}),
        mainEntity,
      };
      return JSON.stringify(schema, null, 2);
    },

    get embeddedCode() {
      const e = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `&lt;script type="application/ld+json"&gt;\n${e(this.generatedSchema)}\n&lt;/script&gt;`;
    },

    get validations() {
      const v = [];
      const chk = (label, pass, note, level = 'warn') => v.push({ label, pass, note, level });

      chk('At least one FAQ item', this.filledFaqs.length >= 1,
          this.filledFaqs.length >= 1
            ? `${this.filledFaqs.length} item${this.filledFaqs.length > 1 ? 's' : ''} ready`
            : 'Add at least one question + answer', 'error');

      chk('All questions are non-empty', this.faqs.every(f => f.question.trim()),
          this.faqs.every(f => f.question.trim())
            ? 'OK' : `${this.faqs.filter(f => !f.question.trim()).length} question(s) empty`, 'error');

      chk('All answers are non-empty', this.faqs.every(f => f.answer.trim()),
          this.faqs.every(f => f.answer.trim())
            ? 'OK' : `${this.faqs.filter(f => !f.answer.trim()).length} answer(s) empty`, 'error');

      const dupQ = this._hasDuplicateQuestions();
      chk('Questions are unique', !dupQ,
          dupQ ? 'Duplicate questions detected — each must be unique' : 'All unique', 'warn');

      const longQ = this.filledFaqs.find(f => f.question.length > 180);
      chk('Questions under 180 chars', !longQ,
          longQ ? `"${longQ.question.slice(0, 40)}…" is ${longQ.question.length} chars` : 'All within limit', 'warn');

      chk('Answers contain no HTML scripts', !this.filledFaqs.some(f => /<script/i.test(f.answer)),
          'Avoid embedding <script> tags in answers', 'warn');

      chk('Page URL is HTTPS (if set)', !this.pageUrl || this.pageUrl.startsWith('https://'),
          this.pageUrl && !this.pageUrl.startsWith('https://')
            ? 'Google prefers HTTPS URLs' : (this.pageUrl ? 'HTTPS OK' : 'Optional'), 'info');

      return v;
    },

    get scorePass()  { return this.validations.filter(v => v.pass).length; },
    get scoreTotal() { return this.validations.length; },
    get errorCount() { return this.validations.filter(v => !v.pass && v.level === 'error').length; },
    get warnCount()  { return this.validations.filter(v => !v.pass && v.level === 'warn').length; },
    get isValid()    { return this.errorCount === 0 && this.filledFaqs.length >= 1; },

    _hasDuplicateQuestions() {
      const qs = this.filledFaqs.map(f => f.question.trim().toLowerCase());
      return qs.length !== new Set(qs).size;
    },

    /* ── import ── */
    tryImport() {
      this.importError = '';
      try {
        const raw = this.importRaw.trim();
        if (!raw) { this.importError = 'Paste JSON-LD above.'; return; }
        let obj = JSON.parse(raw);
        if (obj['@graph']) obj = obj['@graph'].find(n => n['@type'] === 'FAQPage') || obj;
        if (obj['@type'] !== 'FAQPage') { this.importError = 'Not a FAQPage schema.'; return; }
        const items = (obj.mainEntity || []).map(q => _mkFaq(
          q.name || '',
          (q.acceptedAnswer || {}).text || ''
        ));
        if (!items.length) { this.importError = 'No questions found.'; return; }
        this.faqs = items;
        if (obj.name) this.pageName = obj.name;
        if (obj.url)  this.pageUrl  = obj.url;
        this.showImport = false;
        this.importRaw  = '';
      } catch {
        this.importError = 'Invalid JSON — check for syntax errors.';
      }
    },

    /* ── clipboard ── */
    async copyCode() {
      try {
        await navigator.clipboard.writeText(
          `<script type="application/ld+json">\n${this.generatedSchema}\n</script>`
        );
        this.codeCopied = true;
        setTimeout(() => (this.codeCopied = false), 2200);
      } catch {}
    },

    async copyJson() {
      try { await navigator.clipboard.writeText(this.generatedSchema); } catch {}
    },
  };
}
