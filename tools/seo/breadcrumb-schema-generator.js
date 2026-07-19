/* Breadcrumb Schema Generator */

let _bcId = 0;
function _mkCrumb(name = '', url = '') {
  return { id: ++_bcId, name, url };
}

function breadcrumbSchemaApp() {
  return {
    /* ── state ── */
    crumbs: [_mkCrumb('Home', 'https://example.com/'), _mkCrumb('', ''), _mkCrumb('', '')],
    parseInput: '',
    parseError: '',
    showParse: false,
    codeCopied: false,
    jsonCopied: false,

    /* ── crumb management ── */
    addCrumb() {
      this.crumbs.push(_mkCrumb());
    },
    removeCrumb(id) {
      if (this.crumbs.length <= 1) return;
      this.crumbs = this.crumbs.filter(c => c.id !== id);
    },
    moveUp(idx) {
      if (idx === 0) return;
      [this.crumbs[idx - 1], this.crumbs[idx]] = [this.crumbs[idx], this.crumbs[idx - 1]];
    },
    moveDown(idx) {
      if (idx === this.crumbs.length - 1) return;
      [this.crumbs[idx], this.crumbs[idx + 1]] = [this.crumbs[idx + 1], this.crumbs[idx]];
    },
    clearAll() {
      this.crumbs = [_mkCrumb('Home', 'https://example.com/'), _mkCrumb(), _mkCrumb()];
      this.parseInput = '';
      this.parseError = '';
    },

    /* ── parse URL into crumbs ── */
    parseUrl() {
      this.parseError = '';
      let raw = this.parseInput.trim();
      if (!raw) { this.parseError = 'Enter a URL above.'; return; }
      if (!raw.startsWith('http')) raw = 'https://' + raw;
      try {
        const u = new URL(raw);
        const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        const crumbs = [_mkCrumb('Home', u.origin + '/')];
        let built = u.origin;
        for (let i = 0; i < parts.length; i++) {
          built += '/' + parts[i];
          const label = parts[i]
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
          crumbs.push(_mkCrumb(label, built + (i < parts.length - 1 ? '/' : '')));
        }
        if (crumbs.length < 2) { this.parseError = 'URL has no path segments to parse.'; return; }
        this.crumbs = crumbs;
        this.showParse = false;
        this.parseInput = '';
      } catch {
        this.parseError = 'Invalid URL — include the full address (https://…).';
      }
    },

    /* ── computed ── */
    get filledCrumbs() {
      return this.crumbs.filter(c => c.name.trim());
    },

    get generatedSchema() {
      const items = this.filledCrumbs.map((c, i) => {
        const item = {
          '@type': 'ListItem',
          position: i + 1,
          name: c.name.trim(),
        };
        if (c.url.trim()) item.item = c.url.trim();
        return item;
      });
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
      };
      return JSON.stringify(schema, null, 2);
    },

    get breadcrumbPath() {
      return this.filledCrumbs.map(c => c.name.trim()).join(' › ');
    },

    get baseUrl() {
      const first = this.crumbs.find(c => c.url.trim());
      if (!first) return 'example.com';
      try {
        const u = new URL(first.url.startsWith('http') ? first.url : 'https://' + first.url);
        return u.hostname.replace(/^www\./, '');
      } catch { return 'example.com'; }
    },

    get validations() {
      const v = [];
      const chk = (label, pass, note, level = 'warn') => v.push({ label, pass, note, level });

      chk('At least 2 breadcrumb items', this.filledCrumbs.length >= 2,
          this.filledCrumbs.length >= 2
            ? `${this.filledCrumbs.length} items`
            : 'Google recommends at least 2 levels (e.g. Home › Page)', 'error');

      chk('All items have a name', this.crumbs.every(c => c.name.trim()),
          this.crumbs.every(c => c.name.trim())
            ? 'OK'
            : `${this.crumbs.filter(c => !c.name.trim()).length} item(s) missing names`, 'error');

      const withUrl = this.filledCrumbs.filter(c => c.url.trim());
      chk('All items have a URL', withUrl.length === this.filledCrumbs.length,
          withUrl.length === this.filledCrumbs.length
            ? 'OK'
            : `${this.filledCrumbs.length - withUrl.length} item(s) missing URLs — strongly recommended`, 'warn');

      const allHttps = this.filledCrumbs.filter(c => c.url.trim()).every(c => c.url.startsWith('https://'));
      chk('All URLs are HTTPS', allHttps,
          allHttps ? 'OK' : 'HTTP URLs may be treated as lower quality by Google', 'warn');

      const sameDomain = this._checkSameDomain();
      chk('All URLs share the same domain', sameDomain.ok,
          sameDomain.ok ? 'Consistent domain' : `Mixed domains detected: ${sameDomain.note}`, 'warn');

      const lastUrl = this.filledCrumbs[this.filledCrumbs.length - 1];
      chk('Last item has a URL', !lastUrl || !!lastUrl.url.trim(),
          lastUrl && !lastUrl.url.trim()
            ? 'The current page (last item) should include its canonical URL'
            : 'OK', 'warn');

      const dup = this._hasDuplicateNames();
      chk('No duplicate item names', !dup,
          dup ? 'Duplicate names found — each breadcrumb level should be unique' : 'All unique', 'warn');

      return v;
    },

    get scorePass()  { return this.validations.filter(v => v.pass).length; },
    get scoreTotal() { return this.validations.length; },
    get errorCount() { return this.validations.filter(v => !v.pass && v.level === 'error').length; },
    get warnCount()  { return this.validations.filter(v => !v.pass && v.level === 'warn').length; },

    _checkSameDomain() {
      const urls = this.filledCrumbs.map(c => c.url.trim()).filter(Boolean);
      if (urls.length < 2) return { ok: true };
      try {
        const domains = urls.map(u => new URL(u.startsWith('http') ? u : 'https://' + u).hostname);
        const unique = [...new Set(domains)];
        return unique.length === 1 ? { ok: true } : { ok: false, note: unique.join(', ') };
      } catch { return { ok: true }; }
    },

    _hasDuplicateNames() {
      const names = this.filledCrumbs.map(c => c.name.trim().toLowerCase());
      return names.length !== new Set(names).size;
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
      try {
        await navigator.clipboard.writeText(this.generatedSchema);
        this.jsonCopied = true;
        setTimeout(() => (this.jsonCopied = false), 2200);
      } catch {}
    },
  };
}
