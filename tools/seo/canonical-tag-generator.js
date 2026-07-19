/* Canonical Tag Generator */

function canonicalApp() {
  return {
    /* ── mode ── */
    mode: 'single', /* 'single' | 'bulk' */

    /* ── single mode ── */
    rawUrl:       '',
    forceHttps:   true,
    stripWww:     false,
    stripTrailingSlash: false,
    stripQuery:   false,
    stripHash:    true,
    customParams: '',   /* comma-separated params to strip */
    copied:       false,
    htmlCopied:   false,

    /* ── bulk mode ── */
    bulkInput:  '',
    bulkOutput: '',
    bulkDone:   false,
    bulkCopied: false,

    /* ── checklist ── */
    showChecklist: true,

    /* ── computed: single ── */
    get canonical() {
      return this._process(this.rawUrl.trim());
    },

    get htmlTag() {
      const c = this.canonical;
      if (!c) return '';
      const escaped = c.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      return `<link rel="canonical" href="${escaped}"/>`;
    },

    get domain() {
      const c = this.canonical;
      if (!c) return '';
      try { return new URL(c).hostname; } catch { return ''; }
    },

    get validations() {
      const url = this.canonical;
      const raw = this.rawUrl.trim();
      const v = [];
      const chk = (label, pass, note, level = 'warn') => v.push({ label, pass, note, level });

      if (!raw) return v;

      let parsed = null;
      try { parsed = new URL(url.startsWith('http') ? url : 'https://' + url); } catch {}

      chk('URL is valid', !!parsed,
          parsed ? 'Parseable URL' : 'Cannot parse — check for typos', 'error');

      if (parsed) {
        chk('Protocol is HTTPS', parsed.protocol === 'https:',
            parsed.protocol === 'https:' ? 'HTTPS ✓' : 'HTTP may signal to Google this is not the preferred version', 'warn');

        chk('No query string', !parsed.search,
            parsed.search ? `Query string present: ${parsed.search}` : 'Clean URL', 'warn');

        chk('No fragment (#)', !parsed.hash,
            parsed.hash ? `Fragment present: ${parsed.hash} — canonicals ignore fragments` : 'No fragment', 'warn');

        chk('No session / tracking params', !/(utm_|fbclid|gclid|sessionid|sid=)/i.test(parsed.search),
            /(utm_|fbclid|gclid|sessionid|sid=)/i.test(parsed.search)
              ? 'Tracking parameters detected — strip them from canonicals'
              : 'OK', 'warn');

        chk('URL is lowercase', url === url.toLowerCase(),
            url === url.toLowerCase() ? 'Lowercase ✓' : 'Mixed case detected — canonical should be lowercase', 'warn');

        chk('No double slashes in path', !/\/{2,}/.test(parsed.pathname),
            /\/{2,}/.test(parsed.pathname) ? 'Double slashes in path' : 'Path looks clean', 'warn');

        chk('No port number', !parsed.port,
            parsed.port ? `Port ${parsed.port} is present — use the default port URL` : 'No port ✓', 'info');
      }

      return v;
    },

    get scorePass()  { return this.validations.filter(v => v.pass).length; },
    get scoreTotal() { return this.validations.length; },
    get errorCount() { return this.validations.filter(v => !v.pass && v.level === 'error').length; },
    get warnCount()  { return this.validations.filter(v => !v.pass && v.level === 'warn').length; },

    /* ── URL processing ── */
    _process(raw) {
      if (!raw) return '';
      let u = raw;

      /* Ensure scheme */
      if (!/^https?:\/\//i.test(u)) {
        u = (this.forceHttps ? 'https' : 'http') + '://' + u;
      } else if (this.forceHttps) {
        u = u.replace(/^http:\/\//i, 'https://');
      }

      let parsed;
      try { parsed = new URL(u); } catch { return u; }

      /* Strip www */
      if (this.stripWww && parsed.hostname.startsWith('www.')) {
        parsed.hostname = parsed.hostname.slice(4);
      }

      /* Strip hash */
      if (this.stripHash) parsed.hash = '';

      /* Strip query */
      if (this.stripQuery) {
        parsed.search = '';
      } else if (this.customParams.trim()) {
        const toRemove = this.customParams.split(',').map(s => s.trim()).filter(Boolean);
        toRemove.forEach(p => parsed.searchParams.delete(p));
      }

      /* Strip trailing slash (only on path, not root) */
      if (this.stripTrailingSlash && parsed.pathname !== '/') {
        parsed.pathname = parsed.pathname.replace(/\/$/, '');
      }

      return parsed.href;
    },

    /* ── bulk processing ── */
    runBulk() {
      const lines = this.bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
      const out = lines.map(line => {
        const processed = this._process(line);
        if (!processed) return `# invalid: ${line}`;
        const escaped = processed.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return `<link rel="canonical" href="${escaped}"/>`;
      });
      this.bulkOutput = out.join('\n');
      this.bulkDone = true;
    },

    clearBulk() {
      this.bulkInput  = '';
      this.bulkOutput = '';
      this.bulkDone   = false;
      this.bulkCopied = false;
    },

    /* ── clipboard ── */
    async copySingle() {
      try {
        await navigator.clipboard.writeText(this.htmlTag);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch {}
    },

    async copyUrl() {
      try {
        await navigator.clipboard.writeText(this.canonical);
        this.htmlCopied = true;
        setTimeout(() => (this.htmlCopied = false), 2200);
      } catch {}
    },

    async copyBulk() {
      try {
        await navigator.clipboard.writeText(this.bulkOutput);
        this.bulkCopied = true;
        setTimeout(() => (this.bulkCopied = false), 2200);
      } catch {}
    },
  };
}
