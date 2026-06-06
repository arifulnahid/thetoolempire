/* ── Robots.txt Generator Alpine component ── */
function robotsApp() {
  return {
    /* ── Global settings ── */
    sitemapUrl: '',
    crawlDelay: '',
    hostDirective: '',

    /* ── Rule groups ── */
    groups: [
      {
        id: 1,
        userAgent: '*',
        rules: [
          { type: 'disallow', path: '' }
        ],
        crawlDelay: '',
        expanded: true,
      }
    ],
    _nextId: 2,

    /* ── UI ── */
    showValidation: true,

    /* ── Add / remove groups ── */
    addGroup() {
      this.groups.push({
        id: this._nextId++,
        userAgent: '*',
        rules: [{ type: 'disallow', path: '' }],
        crawlDelay: '',
        expanded: true,
      });
    },
    removeGroup(id) {
      if (this.groups.length <= 1) { this._toast('At least one group required'); return; }
      this.groups = this.groups.filter(g => g.id !== id);
    },
    duplicateGroup(id) {
      const src = this.groups.find(g => g.id === id);
      if (!src) return;
      this.groups.push({
        id: this._nextId++,
        userAgent: src.userAgent,
        rules: src.rules.map(r => ({ ...r })),
        crawlDelay: src.crawlDelay,
        expanded: true,
      });
    },
    toggleGroup(id) {
      const g = this.groups.find(g => g.id === id);
      if (g) g.expanded = !g.expanded;
    },

    /* ── Rules within a group ── */
    addRule(group, type) {
      group.rules.push({ type, path: '' });
    },
    removeRule(group, idx) {
      group.rules.splice(idx, 1);
    },

    /* ── Output ── */
    get output() {
      const lines = [];
      if (this.sitemapUrl) lines.push(`Sitemap: ${this.sitemapUrl}`);
      if (this.hostDirective) lines.push(`Host: ${this.hostDirective}`);
      if (lines.length) lines.push('');

      this.groups.forEach((g, gi) => {
        if (gi > 0) lines.push('');
        const ua = g.userAgent.trim() || '*';
        lines.push(`User-agent: ${ua}`);
        if (g.crawlDelay) lines.push(`Crawl-delay: ${g.crawlDelay}`);
        g.rules.forEach(r => {
          const cap = r.type.charAt(0).toUpperCase() + r.type.slice(1);
          lines.push(`${cap}: ${r.path}`);
        });
      });

      return lines.join('\n');
    },

    get outputHighlighted() {
      if (!this.output) return '<span style="color:var(--text-faint)">Fill in the form to generate robots.txt…</span>';
      return this.output
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^(#.*)$/gm, '<span class="rb-com">$1</span>')
        .replace(/^(User-agent:)/gm, '<span class="rb-key">$1</span>')
        .replace(/^(Disallow:|Allow:|Crawl-delay:|Host:|Sitemap:)/gm, '<span class="rb-dir">$1</span>')
        .replace(/(User-agent:|Disallow:|Allow:|Crawl-delay:|Host:|Sitemap:)\s*(.+)/g, (m, k, v) =>
          `${k} <span class="rb-val">${v}</span>`
        );
    },

    /* ── Validation ── */
    get validationItems() {
      const items = [];
      const out = this.output;

      // Check sitemap
      if (!this.sitemapUrl) {
        items.push({ type: 'warn', msg: 'No Sitemap URL — add one so crawlers can find all your pages.' });
      } else if (!this.sitemapUrl.startsWith('https://') && !this.sitemapUrl.startsWith('http://')) {
        items.push({ type: 'err', msg: 'Sitemap URL should be a full absolute URL starting with https://.' });
      } else {
        items.push({ type: 'ok', msg: 'Sitemap URL present.' });
      }

      // Check for wildcard disallow all
      const hasDisallowAll = this.groups.some(g =>
        g.userAgent === '*' && g.rules.some(r => r.type === 'disallow' && r.path === '/')
      );
      if (hasDisallowAll) {
        items.push({ type: 'warn', msg: 'Disallow: / blocks all crawlers from your entire site. Intentional?' });
      }

      // Check for allow all (Disallow: empty)
      const hasAllowAll = this.groups.some(g =>
        g.userAgent === '*' && g.rules.some(r => r.type === 'disallow' && r.path === '')
      );
      if (hasAllowAll) {
        items.push({ type: 'ok', msg: 'Empty Disallow allows full crawling of your site.' });
      }

      // Check groups
      this.groups.forEach((g, i) => {
        if (!g.userAgent.trim()) {
          items.push({ type: 'err', msg: `Group ${i + 1}: User-agent cannot be blank.` });
        }
        if (g.crawlDelay && isNaN(Number(g.crawlDelay))) {
          items.push({ type: 'err', msg: `Group ${i + 1}: Crawl-delay must be a number.` });
        }
        g.rules.forEach((r, ri) => {
          if (r.path && !r.path.startsWith('/') && !r.path.startsWith('*') && !r.path.startsWith('$')) {
            items.push({ type: 'warn', msg: `Group ${i + 1}, rule ${ri + 1}: Path "${r.path}" should start with /.` });
          }
        });
      });

      if (items.length === 0) {
        items.push({ type: 'ok', msg: 'Looks good! No obvious issues found.' });
      }

      return items;
    },

    get lineCount() { return this.output ? this.output.split('\n').length : 0; },
    get ruleCount() { return this.groups.reduce((n, g) => n + g.rules.length, 0); },
    get groupCount() { return this.groups.length; },

    /* ── Presets ── */
    applyPreset(name) {
      this.groups = [];
      this._nextId = 1;
      this.sitemapUrl = '';
      this.crawlDelay = '';
      this.hostDirective = '';

      switch (name) {
        case 'allow-all':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [{ type: 'disallow', path: '' }], crawlDelay: '', expanded: true });
          break;

        case 'block-all':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [{ type: 'disallow', path: '/' }], crawlDelay: '', expanded: true });
          break;

        case 'wordpress':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [
            { type: 'disallow', path: '/wp-admin/' },
            { type: 'disallow', path: '/wp-includes/' },
            { type: 'disallow', path: '/wp-content/plugins/' },
            { type: 'disallow', path: '/wp-content/themes/' },
            { type: 'disallow', path: '/?s=' },
            { type: 'disallow', path: '/search' },
            { type: 'allow', path: '/wp-admin/admin-ajax.php' },
          ], crawlDelay: '', expanded: true });
          this.sitemapUrl = 'https://example.com/sitemap.xml';
          break;

        case 'ecommerce':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [
            { type: 'disallow', path: '/cart' },
            { type: 'disallow', path: '/checkout' },
            { type: 'disallow', path: '/account' },
            { type: 'disallow', path: '/order-confirmation' },
            { type: 'disallow', path: '/?sort=' },
            { type: 'disallow', path: '/?filter=' },
            { type: 'disallow', path: '/?page=' },
          ], crawlDelay: '', expanded: true });
          this.sitemapUrl = 'https://example.com/sitemap.xml';
          break;

        case 'block-bots':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [{ type: 'disallow', path: '' }], crawlDelay: '', expanded: true });
          const badBots = ['AhrefsBot', 'SemrushBot', 'DotBot', 'MJ12bot', 'BLEXBot'];
          badBots.forEach(bot => {
            this.groups.push({ id: this._nextId++, userAgent: bot, rules: [{ type: 'disallow', path: '/' }], crawlDelay: '', expanded: false });
          });
          break;

        case 'nextjs':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [
            { type: 'disallow', path: '/api/' },
            { type: 'disallow', path: '/_next/' },
            { type: 'disallow', path: '/admin' },
          ], crawlDelay: '', expanded: true });
          this.sitemapUrl = 'https://example.com/sitemap.xml';
          break;

        case 'minimal':
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [
            { type: 'disallow', path: '/admin' },
            { type: 'disallow', path: '/private/' },
          ], crawlDelay: '', expanded: true });
          this.sitemapUrl = 'https://example.com/sitemap.xml';
          break;

        default:
          this.groups.push({ id: this._nextId++, userAgent: '*', rules: [{ type: 'disallow', path: '' }], crawlDelay: '', expanded: true });
      }
      this._toast(`Preset "${name}" loaded`);
    },

    /* ── Clipboard + download ── */
    async copyOutput() {
      if (!this.output) return;
      try { await navigator.clipboard.writeText(this.output); this._toast('Copied to clipboard!'); }
      catch { this._toast('Copy failed'); }
    },
    downloadFile() {
      if (!this.output) return;
      const blob = new Blob([this.output], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'robots.txt';
      a.click();
      URL.revokeObjectURL(a.href);
      this._toast('Downloaded robots.txt');
    },

    /* ── Helpers ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
