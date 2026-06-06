/* ── OG Tag Generator Alpine component ── */
function ogTagApp() {
  return {
    /* ── Core fields ── */
    title: '',
    description: '',
    url: '',
    image: '',
    imageWidth: '1200',
    imageHeight: '630',
    imageAlt: '',
    siteName: '',
    type: 'website',
    locale: 'en_US',
    localeAlt: '',

    /* ── Article fields ── */
    articleEnabled: false,
    articlePublished: '',
    articleModified: '',
    articleAuthor: '',
    articleSection: '',
    articleTag: '',

    /* ── Twitter / X ── */
    twitterEnabled: true,
    twitterCard: 'summary_large_image',
    twitterSite: '',
    twitterCreator: '',
    twitterTitle: '',
    twitterDesc: '',
    twitterImage: '',

    /* ── Extra OG ── */
    videoEnabled: false,
    videoUrl: '',
    videoWidth: '',
    videoHeight: '',
    videoType: 'video/mp4',
    audioEnabled: false,
    audioUrl: '',

    /* ── UI ── */
    activeTab: 'html',

    /* ── Char helpers ── */
    titleCharClass() {
      const l = this.title.length;
      if (!l) return '';
      return l <= 60 ? 'char-ok' : l <= 80 ? 'char-warn' : 'char-err';
    },
    descCharClass() {
      const l = this.description.length;
      if (!l) return '';
      return l <= 200 ? 'char-ok' : l <= 250 ? 'char-warn' : 'char-err';
    },

    /* ── Effective twitter values (OG fallback) ── */
    get _twTitle()  { return this.twitterTitle  || this.title; },
    get _twDesc()   { return this.twitterDesc   || this.description; },
    get _twImage()  { return this.twitterImage  || this.image; },

    /* ── Domain helper ── */
    get _domain() {
      try { return new URL(this.url).hostname; } catch { return this.url.replace(/https?:\/\//,'').split('/')[0] || 'yoursite.com'; }
    },

    /* ── Tag list ── */
    get tags() {
      const lines = [];

      lines.push({ type: 'comment', text: 'Open Graph — Core' });
      lines.push({ tag: 'meta', property: 'og:type',        content: this.type });
      if (this.title)       lines.push({ tag: 'meta', property: 'og:title',       content: this.title });
      if (this.description) lines.push({ tag: 'meta', property: 'og:description', content: this.description });
      if (this.url)         lines.push({ tag: 'meta', property: 'og:url',          content: this.url });
      if (this.siteName)    lines.push({ tag: 'meta', property: 'og:site_name',   content: this.siteName });
      if (this.locale)      lines.push({ tag: 'meta', property: 'og:locale',      content: this.locale });
      if (this.localeAlt)   lines.push({ tag: 'meta', property: 'og:locale:alternate', content: this.localeAlt });

      if (this.image) {
        lines.push({ type: 'comment', text: 'Open Graph — Image' });
        lines.push({ tag: 'meta', property: 'og:image',        content: this.image });
        if (this.imageWidth)  lines.push({ tag: 'meta', property: 'og:image:width',  content: this.imageWidth });
        if (this.imageHeight) lines.push({ tag: 'meta', property: 'og:image:height', content: this.imageHeight });
        if (this.imageAlt)    lines.push({ tag: 'meta', property: 'og:image:alt',    content: this.imageAlt });
        lines.push({ tag: 'meta', property: 'og:image:type', content: this.image.endsWith('.png') ? 'image/png' : 'image/jpeg' });
      }

      if (this.articleEnabled && this.type === 'article') {
        lines.push({ type: 'comment', text: 'Open Graph — Article' });
        if (this.articlePublished) lines.push({ tag: 'meta', property: 'article:published_time', content: this.articlePublished });
        if (this.articleModified)  lines.push({ tag: 'meta', property: 'article:modified_time',  content: this.articleModified });
        if (this.articleAuthor)    lines.push({ tag: 'meta', property: 'article:author',          content: this.articleAuthor });
        if (this.articleSection)   lines.push({ tag: 'meta', property: 'article:section',         content: this.articleSection });
        if (this.articleTag) {
          this.articleTag.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => {
            lines.push({ tag: 'meta', property: 'article:tag', content: tag });
          });
        }
      }

      if (this.videoEnabled && this.videoUrl) {
        lines.push({ type: 'comment', text: 'Open Graph — Video' });
        lines.push({ tag: 'meta', property: 'og:video',         content: this.videoUrl });
        if (this.videoWidth)  lines.push({ tag: 'meta', property: 'og:video:width',  content: this.videoWidth });
        if (this.videoHeight) lines.push({ tag: 'meta', property: 'og:video:height', content: this.videoHeight });
        lines.push({ tag: 'meta', property: 'og:video:type', content: this.videoType });
      }

      if (this.audioEnabled && this.audioUrl) {
        lines.push({ type: 'comment', text: 'Open Graph — Audio' });
        lines.push({ tag: 'meta', property: 'og:audio', content: this.audioUrl });
        lines.push({ tag: 'meta', property: 'og:audio:type', content: 'audio/mpeg' });
      }

      if (this.twitterEnabled) {
        lines.push({ type: 'comment', text: 'Twitter / X Card' });
        lines.push({ tag: 'meta', name: 'twitter:card',        content: this.twitterCard });
        if (this._twTitle)  lines.push({ tag: 'meta', name: 'twitter:title',       content: this._twTitle });
        if (this._twDesc)   lines.push({ tag: 'meta', name: 'twitter:description', content: this._twDesc });
        if (this._twImage)  lines.push({ tag: 'meta', name: 'twitter:image',       content: this._twImage });
        if (this.imageAlt && this._twImage) lines.push({ tag: 'meta', name: 'twitter:image:alt', content: this.imageAlt });
        if (this.twitterSite)    lines.push({ tag: 'meta', name: 'twitter:site',    content: this._atSign(this.twitterSite) });
        if (this.twitterCreator) lines.push({ tag: 'meta', name: 'twitter:creator', content: this._atSign(this.twitterCreator) });
      }

      return lines;
    },

    /* ── Render HTML string ── */
    get htmlOutput() {
      return this.tags.map(t => {
        if (t.type === 'comment') return `\n<!-- ${t.text} -->`;
        const attrs = [];
        if (t.property) attrs.push(`property="${this._esc(t.property)}"`);
        if (t.name)     attrs.push(`name="${this._esc(t.name)}"`);
        if (t.content !== undefined) attrs.push(`content="${this._esc(t.content)}"`);
        return `<meta ${attrs.join(' ')}>`;
      }).join('\n').trim();
    },

    /* ── Highlighted HTML ── */
    get htmlHighlighted() {
      if (!this.htmlOutput) return '<span style="color:var(--text-faint)">Fill in the fields to generate tags…</span>';
      return this.htmlOutput
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/&lt;!--(.*?)--&gt;/g, '<span class="oc">$&</span>')
        .replace(/&lt;meta /g, '&lt;<span class="tn">meta</span> ')
        .replace(/(property|name|content)=/g, '<span class="an">$1</span>=')
        .replace(/="([^"]*?)"/g, '="<span class="av">$1</span>"');
    },

    /* ── JSON-LD snippet ── */
    get jsonLdOutput() {
      if (!this.title && !this.url) return '// Fill in title and URL to generate JSON-LD';
      const typeMap = { website: 'WebPage', article: 'Article', product: 'Product', profile: 'ProfilePage', 'video.other': 'VideoObject', 'music.song': 'MusicRecording' };
      const obj = { '@context': 'https://schema.org', '@type': typeMap[this.type] || 'WebPage' };
      if (this.title) obj.name = this.title;
      if (this.description) obj.description = this.description;
      if (this.url) obj.url = this.url;
      if (this.image) obj.image = { '@type': 'ImageObject', url: this.image, width: parseInt(this.imageWidth)||1200, height: parseInt(this.imageHeight)||630 };
      if (this.siteName) obj.publisher = { '@type': 'Organization', name: this.siteName };
      if (this.type === 'article') {
        if (this.articlePublished) obj.datePublished = this.articlePublished;
        if (this.articleModified)  obj.dateModified  = this.articleModified;
        if (this.articleAuthor)    obj.author = { '@type': 'Person', name: this.articleAuthor };
        if (this.articleTag) obj.keywords = this.articleTag;
      }
      return JSON.stringify(obj, null, 2);
    },

    /* ── Tag count ── */
    get tagCount() { return this.tags.filter(t => !t.type).length; },

    /* ── Title / desc status ── */
    get titleStatus() {
      const l = this.title.length;
      if (!l) return { label: '—', cls: '' };
      if (l <= 60) return { label: `${l}/60 — Good`, cls: 'good' };
      if (l <= 80) return { label: `${l}/60 — Long`, cls: 'warn' };
      return { label: `${l}/60 — Too long`, cls: 'bad' };
    },
    get descStatus() {
      const l = this.description.length;
      if (!l) return { label: '—', cls: '' };
      if (l <= 200) return { label: `${l}/200 — Good`, cls: 'good' };
      if (l <= 250) return { label: `${l}/200 — Long`, cls: 'warn' };
      return { label: `${l}/200 — Too long`, cls: 'bad' };
    },

    /* ── Image resolution status ── */
    get imageStatus() {
      const w = parseInt(this.imageWidth), h = parseInt(this.imageHeight);
      if (!w || !h) return { label: '—', cls: '' };
      if (w >= 1200 && h >= 630) return { label: `${w}×${h} — Ideal`, cls: 'good' };
      if (w >= 600 && h >= 315)  return { label: `${w}×${h} — OK`, cls: 'warn' };
      return { label: `${w}×${h} — Too small`, cls: 'bad' };
    },

    /* ── Load example ── */
    loadExample() {
      this.title       = 'The Best Free Online Tools for Developers';
      this.description = 'Format JSON, encode Base64, test regex, generate meta tags, write Markdown — all free, all in your browser, no signup required.';
      this.url         = 'https://thetoolempire.com/';
      this.image       = 'https://thetoolempire.com/assets/og-image.png';
      this.imageAlt    = 'The Tool Empire — Free developer tools';
      this.siteName    = 'The Tool Empire';
      this.type        = 'website';
      this.twitterSite = '@thetoolempire';
      this._toast('Example loaded!');
    },

    reset() {
      const keep = ['activeTab','twitterEnabled','articleEnabled','videoEnabled','audioEnabled'];
      const defaults = { title:'',description:'',url:'',image:'',imageWidth:'1200',imageHeight:'630',imageAlt:'',siteName:'',type:'website',locale:'en_US',localeAlt:'',articlePublished:'',articleModified:'',articleAuthor:'',articleSection:'',articleTag:'',twitterCard:'summary_large_image',twitterSite:'',twitterCreator:'',twitterTitle:'',twitterDesc:'',twitterImage:'',videoUrl:'',videoWidth:'',videoHeight:'',videoType:'video/mp4',audioUrl:'' };
      Object.assign(this, defaults);
      this._toast('Reset');
    },

    /* ── Clipboard ── */
    async copyHtml() {
      if (!this.htmlOutput) return;
      try { await navigator.clipboard.writeText(this.htmlOutput); this._toast('HTML tags copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyJsonLd() {
      try { await navigator.clipboard.writeText(this.jsonLdOutput); this._toast('JSON-LD copied!'); }
      catch { this._toast('Copy failed'); }
    },

    /* ── Helpers ── */
    _atSign(h) { return h.startsWith('@') ? h : '@' + h; },
    _esc(s)    { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
