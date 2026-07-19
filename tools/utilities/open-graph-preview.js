/* Open Graph Preview Tool */

function ogPreviewApp() {
  return {
    /* ── form fields ── */
    fetchInput:     '',
    title:          '',
    description:    '',
    imageUrl:       '',
    url:            '',
    siteName:       '',
    ogType:         'website',
    twitterCard:    'summary_large_image',
    twitterCreator: '',
    /* twitter-specific overrides (optional) */
    twTitle:        '',
    twDescription:  '',
    twImageUrl:     '',

    /* ── ui state ── */
    fetching:    false,
    fetchError:  '',
    imageLoaded: false,
    imageError:  false,
    activeTab:   'twitter',
    showAdv:     false,
    codeCopied:  false,

    /* ── computed ── */
    get effTwTitle() { return this.twTitle       || this.title; },
    get effTwDesc()  { return this.twDescription || this.description; },
    get effTwImg()   { return this.twImageUrl    || this.imageUrl; },

    get domain() {
      const src = this.url || this.fetchInput;
      if (!src) return 'example.com';
      try {
        const u = src.startsWith('http') ? src : 'https://' + src;
        return new URL(u).hostname.replace(/^www\./, '');
      } catch { return 'example.com'; }
    },

    get titleLen() { return this.title.length; },
    get descLen()  { return this.description.length; },

    get validations() {
      const v = [];
      const chk = (label, pass, note, level = 'warn') => v.push({ label, pass, note, level });

      chk('og:title is present', !!this.title,
          this.title ? `${this.titleLen} chars` : 'Missing — required for all cards', 'error');
      if (this.title) chk('Title ≤ 60 chars', this.titleLen <= 60,
          `${this.titleLen}/60 — longer titles get truncated`, 'warn');

      chk('og:description is present', !!this.description,
          this.description ? `${this.descLen} chars` : 'Missing — shown in most cards', 'error');
      if (this.description) chk('Description ≤ 155 chars', this.descLen <= 155,
          `${this.descLen}/155`, 'warn');

      chk('og:image is present', !!this.imageUrl,
          this.imageUrl ? 'Set' : 'Missing — no image card without this', 'error');
      if (this.imageUrl) {
        chk('Image URL is HTTPS', this.imageUrl.startsWith('https://'),
            this.imageUrl.startsWith('https://') ? 'OK' : 'HTTP images may be blocked by some platforms', 'warn');
        chk('Image loads correctly', !this.imageError,
            this.imageError ? 'Image failed to load — check the URL' : (this.imageLoaded ? 'Loaded OK' : 'Load status pending'), 'warn');
      }

      chk('og:url is present', !!this.url, this.url ? 'Set' : 'Recommended — helps deduplication', 'warn');
      chk('og:site_name is present', !!this.siteName,
          this.siteName ? 'Set' : 'Recommended — shown by Facebook & Discord', 'info');
      chk('twitter:card is set', !!this.twitterCard, this.twitterCard || 'Missing', 'warn');
      chk('Image at least 1200×630 px', true,
          'Recommended — use a 1200×630 px image for best quality across all platforms', 'info');

      return v;
    },

    get scorePass()  { return this.validations.filter(v => v.pass).length; },
    get scoreTotal() { return this.validations.length; },
    get errorCount() { return this.validations.filter(v => !v.pass && v.level === 'error').length; },
    get warnCount()  { return this.validations.filter(v => !v.pass && v.level === 'warn').length; },

    get generatedCode() {
      const e = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      const L = [];

      L.push('<!-- Primary Meta Tags -->');
      if (this.title)       L.push(`<title>${e(this.title)}</title>`);
      if (this.description) L.push(`<meta name="description" content="${e(this.description)}"/>`);

      L.push('');
      L.push('<!-- Open Graph / Facebook -->');
      L.push(`<meta property="og:type" content="${this.ogType}"/>`);
      if (this.url)         L.push(`<meta property="og:url" content="${e(this.url)}"/>`);
      if (this.title)       L.push(`<meta property="og:title" content="${e(this.title)}"/>`);
      if (this.description) L.push(`<meta property="og:description" content="${e(this.description)}"/>`);
      if (this.imageUrl)    L.push(`<meta property="og:image" content="${e(this.imageUrl)}"/>`);
      if (this.siteName)    L.push(`<meta property="og:site_name" content="${e(this.siteName)}"/>`);

      L.push('');
      L.push('<!-- Twitter / X -->');
      L.push(`<meta name="twitter:card" content="${this.twitterCard}"/>`);
      if (this.url)          L.push(`<meta name="twitter:url" content="${e(this.url)}"/>`);
      if (this.effTwTitle)   L.push(`<meta name="twitter:title" content="${e(this.effTwTitle)}"/>`);
      if (this.effTwDesc)    L.push(`<meta name="twitter:description" content="${e(this.effTwDesc)}"/>`);
      if (this.effTwImg)     L.push(`<meta name="twitter:image" content="${e(this.effTwImg)}"/>`);
      if (this.twitterCreator) L.push(`<meta name="twitter:creator" content="${e(this.twitterCreator)}"/>`);

      return L.join('\n');
    },

    /* ── image handlers ── */
    onImageLoad()  { this.imageLoaded = true;  this.imageError = false; },
    onImageError() { this.imageError  = true;  this.imageLoaded = false; },
    onImgChange()  { this.imageLoaded = false; this.imageError  = false; },

    /* ── fetch via CORS proxy ── */
    async fetchMeta() {
      let target = this.fetchInput.trim();
      if (!target) return;
      if (!target.startsWith('http')) target = 'https://' + target;

      this.fetching   = true;
      this.fetchError = '';

      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`);
        if (!res.ok) throw new Error('network');
        const { contents } = await res.json();
        if (!contents) throw new Error('empty');

        const doc = new DOMParser().parseFromString(contents, 'text/html');

        const g = (...sels) => {
          for (const s of sels) {
            const el = doc.querySelector(s);
            if (el) { const c = el.getAttribute('content'); if (c?.trim()) return c.trim(); }
          }
          return '';
        };

        const abs = (u) => {
          if (!u) return '';
          if (/^https?:\/\//.test(u)) return u;
          try { return new URL(u, target).href; } catch { return u; }
        };

        this.title          = g('meta[property="og:title"]','meta[name="twitter:title"]') || doc.title.trim();
        this.description    = g('meta[property="og:description"]','meta[name="twitter:description"]','meta[name="description"]');
        this.imageUrl       = abs(g('meta[property="og:image"]','meta[name="twitter:image"]'));
        this.url            = g('meta[property="og:url"]') || target;
        this.siteName       = g('meta[property="og:site_name"]');
        this.ogType         = g('meta[property="og:type"]') || 'website';
        this.twitterCard    = g('meta[name="twitter:card"]') || 'summary_large_image';
        this.twitterCreator = g('meta[name="twitter:creator"]');
        this.imageLoaded    = false;
        this.imageError     = false;

      } catch {
        this.fetchError = 'Could not fetch that URL. The site may block external requests or use CSP headers. Fill in the fields manually below.';
      }

      this.fetching = false;
    },

    /* ── clipboard ── */
    async copyCode() {
      /* Build the unescaped version for clipboard */
      const e2 = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      const L = [];
      L.push('<!-- Primary Meta Tags -->');
      if (this.title)       L.push(`<title>${this.title}</title>`);
      if (this.description) L.push(`<meta name="description" content="${e2(this.description)}"/>`);
      L.push('');
      L.push('<!-- Open Graph / Facebook -->');
      L.push(`<meta property="og:type" content="${this.ogType}"/>`);
      if (this.url)         L.push(`<meta property="og:url" content="${e2(this.url)}"/>`);
      if (this.title)       L.push(`<meta property="og:title" content="${e2(this.title)}"/>`);
      if (this.description) L.push(`<meta property="og:description" content="${e2(this.description)}"/>`);
      if (this.imageUrl)    L.push(`<meta property="og:image" content="${e2(this.imageUrl)}"/>`);
      if (this.siteName)    L.push(`<meta property="og:site_name" content="${e2(this.siteName)}"/>`);
      L.push('');
      L.push('<!-- Twitter / X -->');
      L.push(`<meta name="twitter:card" content="${this.twitterCard}"/>`);
      if (this.url)          L.push(`<meta name="twitter:url" content="${e2(this.url)}"/>`);
      if (this.effTwTitle)   L.push(`<meta name="twitter:title" content="${e2(this.effTwTitle)}"/>`);
      if (this.effTwDesc)    L.push(`<meta name="twitter:description" content="${e2(this.effTwDesc)}"/>`);
      if (this.effTwImg)     L.push(`<meta name="twitter:image" content="${e2(this.effTwImg)}"/>`);
      if (this.twitterCreator) L.push(`<meta name="twitter:creator" content="${e2(this.twitterCreator)}"/>`);
      try {
        await navigator.clipboard.writeText(L.join('\n'));
        this.codeCopied = true;
        setTimeout(() => (this.codeCopied = false), 2200);
      } catch {}
    },

    clearAll() {
      Object.assign(this, {
        fetchInput:'', title:'', description:'', imageUrl:'', url:'', siteName:'',
        ogType:'website', twitterCard:'summary_large_image', twitterCreator:'',
        twTitle:'', twDescription:'', twImageUrl:'',
        imageLoaded:false, imageError:false, fetchError:'',
      });
    },
  };
}
