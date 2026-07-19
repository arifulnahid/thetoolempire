/* ── Pastebin — Alpine component ── */

const PB_LANGUAGES = [
  { id: 'plain',      label: 'Plain Text'   },
  { id: 'javascript', label: 'JavaScript'   },
  { id: 'typescript', label: 'TypeScript'   },
  { id: 'jsx',        label: 'JSX'          },
  { id: 'tsx',        label: 'TSX'          },
  { id: 'python',     label: 'Python'       },
  { id: 'java',       label: 'Java'         },
  { id: 'c',          label: 'C'            },
  { id: 'cpp',        label: 'C++'          },
  { id: 'csharp',     label: 'C#'           },
  { id: 'go',         label: 'Go'           },
  { id: 'rust',       label: 'Rust'         },
  { id: 'php',        label: 'PHP'          },
  { id: 'ruby',       label: 'Ruby'         },
  { id: 'swift',      label: 'Swift'        },
  { id: 'kotlin',     label: 'Kotlin'       },
  { id: 'html',       label: 'HTML'         },
  { id: 'css',        label: 'CSS'          },
  { id: 'scss',       label: 'SCSS / Sass'  },
  { id: 'sql',        label: 'SQL'          },
  { id: 'json',       label: 'JSON'         },
  { id: 'yaml',       label: 'YAML'         },
  { id: 'xml',        label: 'XML'          },
  { id: 'graphql',    label: 'GraphQL'      },
  { id: 'bash',       label: 'Bash / Shell' },
  { id: 'markdown',   label: 'Markdown'     },
  { id: 'docker',     label: 'Dockerfile'   },
  { id: 'nginx',      label: 'Nginx'        },
];

const PB_EXTS = {
  javascript:'.js', typescript:'.ts', jsx:'.jsx', tsx:'.tsx',
  python:'.py', java:'.java', c:'.c', cpp:'.cpp', csharp:'.cs',
  go:'.go', rust:'.rs', php:'.php', ruby:'.rb', swift:'.swift',
  kotlin:'.kt', html:'.html', css:'.css', scss:'.scss', sql:'.sql',
  json:'.json', yaml:'.yaml', xml:'.xml', graphql:'.graphql',
  bash:'.sh', markdown:'.md', docker:'', nginx:'.conf', plain:'.txt',
};

function pastebinApp() {
  return {
    title:    '',
    lang:     'javascript',
    content:  '',
    tab:      'write',

    showShareBar:   false,
    linkCopied:     false,
    contentCopied:  false,

    recentPastes: [],
    languages:    PB_LANGUAGES,

    init() {
      // Decode paste from URL hash
      const hash = window.location.hash.slice(1);
      if (hash) {
        try {
          const raw  = decodeURIComponent(escape(atob(hash)));
          const data = JSON.parse(raw);
          this.title   = data.title   || '';
          this.lang    = data.lang    || 'plain';
          this.content = data.content || '';
          this.tab     = 'preview';
        } catch (_) {}
      }

      // Load history
      try {
        this.recentPastes = JSON.parse(localStorage.getItem('tte-pastebin') || '[]');
      } catch (_) { this.recentPastes = []; }

      // Re-highlight when switching to preview or changing lang
      this.$watch('tab',  v => { if (v === 'preview') this._highlight(); });
      this.$watch('lang', () => { if (this.tab === 'preview') this._highlight(); });

      if (this.tab === 'preview') this.$nextTick(() => this._highlight());
    },

    _highlight() {
      this.$nextTick(() => {
        const el = this.$refs.codeBlock;
        if (!el) return;
        el.textContent = this.content || '';
        el.className = this.lang === 'plain' ? '' : `language-${this.lang}`;
        if (typeof Prism !== 'undefined' && this.lang !== 'plain') {
          Prism.highlightElement(el);
        }
      });
    },

    get lineCount() {
      return this.content ? this.content.split('\n').length : 0;
    },
    get charCount() { return this.content.length; },
    get wordCount()  {
      return this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
    },
    get langLabel() {
      return PB_LANGUAGES.find(l => l.id === this.lang)?.label || this.lang;
    },

    get shareUrl() {
      if (!this.content) return '';
      try {
        const raw     = JSON.stringify({ title: this.title, lang: this.lang, content: this.content });
        const encoded = btoa(unescape(encodeURIComponent(raw)));
        return window.location.origin + window.location.pathname + '#' + encoded;
      } catch (_) { return ''; }
    },

    getLink() {
      if (!this.content) return;
      this._saveToHistory();
      const url = this.shareUrl;
      if (url) history.pushState(null, '', url);
      this.showShareBar = true;
      this.$nextTick(() => {
        const inp = this.$refs.shareInput;
        if (inp) { inp.focus(); inp.select(); }
      });
    },

    async copyLink() {
      const url = this.shareUrl;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        this.linkCopied = true;
        setTimeout(() => (this.linkCopied = false), 2500);
      } catch (_) {}
    },

    async copyContent() {
      if (!this.content) return;
      try {
        await navigator.clipboard.writeText(this.content);
        this.contentCopied = true;
        setTimeout(() => (this.contentCopied = false), 2200);
      } catch (_) {}
    },

    download() {
      if (!this.content) return;
      const ext   = PB_EXTS[this.lang] ?? '.txt';
      const fname = (this.title || 'paste') + ext;
      const blob  = new Blob([this.content], { type: 'text/plain' });
      const a     = Object.assign(document.createElement('a'), {
        href:     URL.createObjectURL(blob),
        download: fname,
      });
      a.click();
      URL.revokeObjectURL(a.href);
    },

    clearAll() {
      this.title = ''; this.content = ''; this.lang = 'javascript';
      this.tab = 'write'; this.showShareBar = false;
      history.replaceState(null, '', window.location.pathname);
    },

    _saveToHistory() {
      if (!this.content) return;
      const url   = this.shareUrl;
      const paste = {
        id:      Date.now(),
        title:   this.title || 'Untitled',
        lang:    this.lang,
        preview: this.content.slice(0, 100).replace(/\n/g, ' '),
        chars:   this.content.length,
        lines:   this.lineCount,
        created: new Date().toISOString(),
        url,
      };
      this.recentPastes = [paste, ...this.recentPastes.filter(p => p.url !== url)].slice(0, 8);
      try { localStorage.setItem('tte-pastebin', JSON.stringify(this.recentPastes)); } catch (_) {}
    },

    openRecent(paste) {
      const h = paste.url.split('#')[1] || '';
      window.location.hash = h;
      window.location.reload();
    },

    removeRecent(id) {
      this.recentPastes = this.recentPastes.filter(p => p.id !== id);
      try { localStorage.setItem('tte-pastebin', JSON.stringify(this.recentPastes)); } catch (_) {}
    },

    handleTab(e) {
      e.preventDefault();
      const ta = e.target, s = ta.selectionStart, end = ta.selectionEnd;
      this.content = this.content.slice(0, s) + '  ' + this.content.slice(end);
      this.$nextTick(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    },

    formatDate(iso) {
      try {
        return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
      } catch (_) { return ''; }
    },
  };
}
