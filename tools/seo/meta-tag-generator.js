/* ── Meta Tag Generator Alpine Component ── */
function metaTagApp() {
  return {
    /* ── Basic SEO ── */
    title: '',
    description: '',
    keywords: '',
    canonical: '',
    robots: 'index, follow',
    language: 'en',
    author: '',
    viewport: 'width=device-width, initial-scale=1.0',

    /* ── Open Graph ── */
    ogEnabled: true,
    ogType: 'website',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    ogUrl: '',
    ogSiteName: '',

    /* ── Twitter Card ── */
    twitterEnabled: true,
    twitterCard: 'summary_large_image',
    twitterSite: '',
    twitterCreator: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',

    /* ── Extras ── */
    extrasEnabled: false,
    themeColor: '#0f0f14',
    appleMobileCapable: false,
    googleBot: '',
    rating: '',

    /* ── UI ── */
    activeTab: 'html',

    /* ── Char limit helpers ── */
    titleMax: 60,
    descMax: 160,

    titleCharClass() {
      const l = this.title.length;
      if (l === 0) return '';
      if (l <= 60) return 'char-ok';
      if (l <= 70) return 'char-warn';
      return 'char-err';
    },
    descCharClass() {
      const l = this.description.length;
      if (l === 0) return '';
      if (l <= 160) return 'char-ok';
      if (l <= 180) return 'char-warn';
      return 'char-err';
    },

    /* ── Derived values (use og/twitter fallbacks) ── */
    get _ogTitle() { return this.ogTitle || this.title; },
    get _ogDesc() { return this.ogDescription || this.description; },
    get _ogUrl() { return this.ogUrl || this.canonical; },
    get _twTitle() { return this.twitterTitle || this._ogTitle; },
    get _twDesc() { return this.twitterDescription || this._ogDesc; },
    get _twImage() { return this.twitterImage || this.ogImage; },

    /* ── Raw tags array ── */
    get tags() {
      const lines = [];

      /* ── Basic ── */
      lines.push({ type: 'comment', text: 'Basic SEO' });
      lines.push({ tag: 'meta', attrs: { charset: 'UTF-8' } });
      if (this.viewport) lines.push({ tag: 'meta', attrs: { name: 'viewport', content: this.viewport } });
      if (this.title) lines.push({ tag: 'title', text: this.title });
      if (this.description) lines.push({ tag: 'meta', attrs: { name: 'description', content: this.description } });
      if (this.keywords) lines.push({ tag: 'meta', attrs: { name: 'keywords', content: this.keywords } });
      lines.push({ tag: 'meta', attrs: { name: 'robots', content: this.robots } });
      if (this.language) lines.push({ tag: 'meta', attrs: { 'http-equiv': 'content-language', content: this.language } });
      if (this.author) lines.push({ tag: 'meta', attrs: { name: 'author', content: this.author } });
      if (this.canonical) lines.push({ tag: 'link', attrs: { rel: 'canonical', href: this.canonical } });

      /* ── Open Graph ── */
      if (this.ogEnabled) {
        lines.push({ type: 'comment', text: 'Open Graph (Facebook, LinkedIn)' });
        lines.push({ tag: 'meta', attrs: { property: 'og:type', content: this.ogType } });
        if (this._ogTitle) lines.push({ tag: 'meta', attrs: { property: 'og:title', content: this._ogTitle } });
        if (this._ogDesc) lines.push({ tag: 'meta', attrs: { property: 'og:description', content: this._ogDesc } });
        if (this._ogUrl) lines.push({ tag: 'meta', attrs: { property: 'og:url', content: this._ogUrl } });
        if (this.ogImage) lines.push({ tag: 'meta', attrs: { property: 'og:image', content: this.ogImage } });
        if (this.ogSiteName) lines.push({ tag: 'meta', attrs: { property: 'og:site_name', content: this.ogSiteName } });
        if (this.language) lines.push({ tag: 'meta', attrs: { property: 'og:locale', content: this.language.replace('-','_') } });
      }

      /* ── Twitter ── */
      if (this.twitterEnabled) {
        lines.push({ type: 'comment', text: 'Twitter / X Card' });
        lines.push({ tag: 'meta', attrs: { name: 'twitter:card', content: this.twitterCard } });
        if (this._twTitle) lines.push({ tag: 'meta', attrs: { name: 'twitter:title', content: this._twTitle } });
        if (this._twDesc) lines.push({ tag: 'meta', attrs: { name: 'twitter:description', content: this._twDesc } });
        if (this._twImage) lines.push({ tag: 'meta', attrs: { name: 'twitter:image', content: this._twImage } });
        if (this.twitterSite) lines.push({ tag: 'meta', attrs: { name: 'twitter:site', content: this.twitterSite.startsWith('@') ? this.twitterSite : '@' + this.twitterSite } });
        if (this.twitterCreator) lines.push({ tag: 'meta', attrs: { name: 'twitter:creator', content: this.twitterCreator.startsWith('@') ? this.twitterCreator : '@' + this.twitterCreator } });
      }

      /* ── Extras ── */
      if (this.extrasEnabled) {
        lines.push({ type: 'comment', text: 'Additional tags' });
        if (this.themeColor) lines.push({ tag: 'meta', attrs: { name: 'theme-color', content: this.themeColor } });
        if (this.appleMobileCapable) {
          lines.push({ tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } });
          lines.push({ tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' } });
        }
        if (this.googleBot) lines.push({ tag: 'meta', attrs: { name: 'googlebot', content: this.googleBot } });
        if (this.rating) lines.push({ tag: 'meta', attrs: { name: 'rating', content: this.rating } });
      }

      return lines;
    },

    /* ── Render to HTML string ── */
    get htmlOutput() {
      return this.tags.map(t => {
        if (t.type === 'comment') return `\n<!-- ${t.text} -->`;
        if (t.tag === 'title') return `<title>${this._esc(t.text)}</title>`;
        const attrs = Object.entries(t.attrs)
          .map(([k, v]) => `${k}="${this._esc(v)}"`)
          .join(' ');
        if (t.tag === 'link') return `<link ${attrs}>`;
        return `<meta ${attrs}>`;
      }).join('\n').trim();
    },

    /* ── Render HTML with syntax highlighting spans ── */
    get htmlHighlighted() {
      return this.htmlOutput
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/&lt;!--(.*?)--&gt;/g, '<span style="color:#555570">$&</span>')
        .replace(/&lt;(\/?)(title|meta|link)(\s|&gt;)/g, '&lt;<span class="tag-name">$1$2</span>$3')
        .replace(/(charset|name|property|content|rel|href|http-equiv)=/g, '<span class="attr-name">$1</span>=')
        .replace(/="([^"]*?)"/g, '="<span class="attr-val">$1</span>"');
    },

    /* ── JSON-LD output ── */
    get jsonLdOutput() {
      if (!this._ogTitle && !this.title) return '// Fill in title and URL to generate JSON-LD';
      const obj = {
        '@context': 'https://schema.org',
        '@type': this.ogType === 'article' ? 'Article' : 'WebPage',
        name: this._ogTitle || this.title,
      };
      if (this._ogDesc) obj.description = this._ogDesc;
      if (this._ogUrl) obj.url = this._ogUrl;
      if (this.ogImage) obj.image = this.ogImage;
      if (this.author) obj.author = { '@type': 'Person', name: this.author };
      if (this.ogSiteName) obj.publisher = { '@type': 'Organization', name: this.ogSiteName };
      return JSON.stringify(obj, null, 2);
    },

    /* ── Count of generated tags ── */
    get tagCount() {
      return this.tags.filter(t => !t.type).length;
    },

    /* ── Title length status ── */
    get titleStatus() {
      const l = this.title.length;
      if (!l) return { label: 'Empty', cls: '' };
      if (l <= 60) return { label: `${l}/60 — Good`, cls: 'good' };
      if (l <= 70) return { label: `${l}/60 — Too long`, cls: 'warn' };
      return { label: `${l}/60 — Way too long`, cls: 'bad' };
    },

    /* ── Description length status ── */
    get descStatus() {
      const l = this.description.length;
      if (!l) return { label: 'Empty', cls: '' };
      if (l <= 160) return { label: `${l}/160 — Good`, cls: 'good' };
      if (l <= 180) return { label: `${l}/160 — Too long`, cls: 'warn' };
      return { label: `${l}/160 — Way too long`, cls: 'bad' };
    },

    /* ── Helpers ── */
    _esc(s) {
      return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    async copyHtml() {
      try { await navigator.clipboard.writeText(this.htmlOutput); this._toast('HTML copied!'); }
      catch { this._toast('Copy failed'); }
    },

    async copyJsonLd() {
      try { await navigator.clipboard.writeText(this.jsonLdOutput); this._toast('JSON-LD copied!'); }
      catch { this._toast('Copy failed'); }
    },

    async copyTag(text) {
      try { await navigator.clipboard.writeText(text); this._toast('Tag copied!'); }
      catch {}
    },

    loadExample() {
      this.title = 'The Best Free Online Tools for Developers';
      this.description = 'Format JSON, encode Base64, test regex, generate meta tags, and more — all free, all in your browser, no signup required.';
      this.keywords = 'free online tools, developer tools, json formatter, base64 encoder, regex tester';
      this.canonical = 'https://thetoolempire.com/';
      this.robots = 'index, follow';
      this.author = 'The Tool Empire Team';
      this.ogType = 'website';
      this.ogImage = 'https://thetoolempire.com/assets/og-image.png';
      this.ogSiteName = 'The Tool Empire';
      this.twitterSite = '@thetoolempire';
      this._toast('Example loaded!');
    },

    reset() {
      this.title = ''; this.description = ''; this.keywords = '';
      this.canonical = ''; this.author = ''; this.ogTitle = '';
      this.ogDescription = ''; this.ogImage = ''; this.ogUrl = '';
      this.ogSiteName = ''; this.twitterSite = ''; this.twitterCreator = '';
      this.twitterTitle = ''; this.twitterDescription = ''; this.twitterImage = '';
      this._toast('Cleared');
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    toggleSection(el) { el.classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
