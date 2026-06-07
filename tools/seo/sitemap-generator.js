/* ── Sitemap Generator Alpine component ── */

function sitemapApp() {
  return {
    /* ── Global settings ── */
    baseUrl: '',
    defaultChangefreq: 'weekly',
    defaultPriority: '0.8',
    defaultLastmod: '',

    /* ── Mode ── */
    mode: 'manual', /* 'manual' | 'bulk' */

    /* ── Add-row inputs ── */
    addLoc: '',
    addChangefreq: 'weekly',
    addPriority: '0.8',
    addLastmod: '',

    /* ── Bulk import ── */
    bulkText: '',
    bulkError: '',

    /* ── URL list ── */
    urls: [],
    _nextId: 1,

    /* ── Edit modal ── */
    editOpen: false,
    editItem: null,

    /* ── Output ── */
    showOutput: false,
    xmlFormat: 'pretty', /* 'pretty' | 'minified' */

    /* ── Changefreq options ── */
    freqOptions: ['always','hourly','daily','weekly','monthly','yearly','never'],
    priorityOptions: ['1.0','0.9','0.8','0.7','0.6','0.5','0.4','0.3','0.2','0.1'],

    /* ── Init ── */
    init() {
      /* default lastmod to today */
      this.defaultLastmod = this._today();
      this.addLastmod      = this._today();
    },

    /* ── Today string ── */
    _today() {
      return new Date().toISOString().split('T')[0];
    },

    /* ── Normalise URL ── */
    _normalize(url) {
      url = url.trim();
      if (!url) return '';
      /* If user typed a bare domain, prepend https:// */
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      try { return new URL(url).href; } catch { return url; }
    },

    /* ── Add a single URL ── */
    addUrl() {
      let loc = this._normalize(this.addLoc);
      if (!loc) { this._toast('Enter a URL first', 'err'); return; }
      if (this.urls.some(u => u.loc === loc)) {
        this._toast('URL already in list', 'err'); return;
      }
      this.urls.push({
        id: this._nextId++,
        loc,
        changefreq: this.addChangefreq,
        priority:   this.addPriority,
        lastmod:    this.addLastmod,
      });
      this.addLoc = '';
      this.addLastmod = this._today();
      this.showOutput = false;
    },

    /* ── Bulk import ── */
    importBulk() {
      this.bulkError = '';
      const lines = this.bulkText.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) { this.bulkError = 'No URLs found in the text box.'; return; }
      let added = 0, skipped = 0;
      for (const raw of lines) {
        const loc = this._normalize(raw);
        if (!loc) { skipped++; continue; }
        if (this.urls.some(u => u.loc === loc)) { skipped++; continue; }
        this.urls.push({
          id: this._nextId++,
          loc,
          changefreq: this.defaultChangefreq,
          priority:   this.defaultPriority,
          lastmod:    this.defaultLastmod || this._today(),
        });
        added++;
      }
      this.bulkText = '';
      this.showOutput = false;
      this._toast(`Added ${added} URL${added !== 1 ? 's' : ''}${skipped ? `, skipped ${skipped}` : ''}`);
    },

    /* ── Delete URL ── */
    deleteUrl(id) {
      this.urls = this.urls.filter(u => u.id !== id);
      this.showOutput = false;
    },

    /* ── Clear all ── */
    clearAll() {
      if (!this.urls.length) return;
      if (!confirm('Remove all URLs from the list?')) return;
      this.urls = [];
      this.showOutput = false;
    },

    /* ── Edit modal ── */
    openEdit(item) {
      this.editItem = { ...item };
      this.editOpen = true;
    },
    saveEdit() {
      const idx = this.urls.findIndex(u => u.id === this.editItem.id);
      if (idx !== -1) {
        this.editItem.loc = this._normalize(this.editItem.loc) || this.editItem.loc;
        this.urls[idx] = { ...this.editItem };
        this.showOutput = false;
      }
      this.editOpen = false;
    },

    /* ── Priority CSS class ── */
    priClass(p) {
      return 'pri-' + p;
    },

    /* ── Stats ── */
    get totalUrls()    { return this.urls.length; },
    get uniqueHosts()  {
      const hosts = new Set();
      for (const u of this.urls) {
        try { hosts.add(new URL(u.loc).hostname); } catch {}
      }
      return hosts.size;
    },
    get hasHighPri()   { return this.urls.filter(u => parseFloat(u.priority) >= 0.8).length; },

    /* ── XML generation ── */
    get xmlOutput() {
      if (!this.urls.length) return '';
      return this.xmlFormat === 'minified' ? this._buildMinified() : this._buildPretty();
    },

    _buildPretty() {
      const lines = [];
      lines.push('<?xml version="1.0" encoding="UTF-8"?>');
      lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      for (const u of this.urls) {
        lines.push('  <url>');
        lines.push(`    <loc>${this._escXml(u.loc)}</loc>`);
        if (u.lastmod)    lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
        if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
        if (u.priority)   lines.push(`    <priority>${u.priority}</priority>`);
        lines.push('  </url>');
      }
      lines.push('</urlset>');
      return lines.join('\n');
    },

    _buildMinified() {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
      for (const u of this.urls) {
        xml += '<url>';
        xml += `<loc>${this._escXml(u.loc)}</loc>`;
        if (u.lastmod)    xml += `<lastmod>${u.lastmod}</lastmod>`;
        if (u.changefreq) xml += `<changefreq>${u.changefreq}</changefreq>`;
        if (u.priority)   xml += `<priority>${u.priority}</priority>`;
        xml += '</url>';
      }
      xml += '</urlset>';
      return xml;
    },

    _escXml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    /* ── Highlighted XML for display ── */
    get xmlHighlighted() {
      let s = this.xmlOutput;
      if (!s) return '';
      s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      /* Color XML declaration */
      s = s.replace(/(&lt;\?xml[^?]*\?&gt;)/g,'<span class="xml-kw">$1</span>');
      /* Color comments */
      s = s.replace(/(&lt;!--[\s\S]*?--&gt;)/g,'<span class="xml-comment">$1</span>');
      /* Color closing tags */
      s = s.replace(/(&lt;\/[\w:]+&gt;)/g,'<span class="xml-tag">$1</span>');
      /* Color opening/self-closing tags */
      s = s.replace(/(&lt;[\w:][^&]*?&gt;)/g,(m) => {
        return '<span class="xml-tag">' + m + '</span>';
      });
      return s;
    },

    /* ── Generate / update ── */
    generate() {
      if (!this.urls.length) { this._toast('Add at least one URL first', 'err'); return; }
      this.showOutput = true;
      this.$nextTick(() => {
        const el = document.getElementById('output-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    /* ── Copy to clipboard ── */
    async copyXml() {
      try {
        await navigator.clipboard.writeText(this.xmlOutput);
        this._toast('Copied to clipboard');
      } catch {
        this._fallbackCopy(this.xmlOutput);
      }
    },

    _fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this._toast('Copied to clipboard');
    },

    /* ── Download ── */
    downloadXml() {
      if (!this.xmlOutput) return;
      const blob = new Blob([this.xmlOutput], { type: 'application/xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'sitemap.xml';
      a.click();
      URL.revokeObjectURL(url);
      this._toast('Downloaded sitemap.xml');
    },

    /* ── Sort helpers ── */
    sortByPriority() {
      this.urls.sort((a,b) => parseFloat(b.priority) - parseFloat(a.priority));
      this.showOutput = false;
    },
    sortByUrl() {
      this.urls.sort((a,b) => a.loc.localeCompare(b.loc));
      this.showOutput = false;
    },

    /* ── FAQ toggle ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    /* ── Toast ── */
    _toast(msg, type) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.background = type === 'err' ? '#ef4444' : '#22c55e';
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },
  };
}
