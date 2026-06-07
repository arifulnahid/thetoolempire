/* ── YouTube Thumbnail Downloader ── */
function ytThumbDownloaderApp() {
  return {
    url: '',
    videoId: '',
    loading: false,
    error: '',
    results: [],   // array of quality objects

    /* Quality definitions in descending order */
    QUALITIES: [
      { key: 'maxresdefault', label: '4K / Max Res', dims: 'up to 3840×2160', badge: 'maxres' },
      { key: 'sddefault',     label: 'SD Default',   dims: '640×480',          badge: 'sd'     },
      { key: 'hqdefault',     label: 'HQ Default',   dims: '480×360',          badge: 'hq'     },
      { key: 'mqdefault',     label: 'Medium',        dims: '320×180',          badge: 'mq'     },
      { key: '0',             label: 'Default',       dims: '120×90',           badge: 'default'},
    ],

    /* YouTube thumbnail URL patterns */
    /* i.ytimg.com is the standard CDN but some videos use i9.ytimg or img.youtube.com */
    _thumbUrl(id, key) {
      return `https://i.ytimg.com/vi/${id}/${key}.jpg`;
    },

    /* Extract video ID from any YouTube URL or plain ID */
    parseId(raw) {
      if (!raw) return '';
      raw = raw.trim();
      let m;
      m = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);         if (m) return m[1];
      m = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);              if (m) return m[1];
      m = raw.match(/embed\/([A-Za-z0-9_-]{11})/);             if (m) return m[1];
      m = raw.match(/shorts\/([A-Za-z0-9_-]{11})/);            if (m) return m[1];
      m = raw.match(/live\/([A-Za-z0-9_-]{11})/);              if (m) return m[1];
      if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
      return '';
    },

    /* Probe a URL to check if the image actually exists (not a placeholder 120×90 grey) */
    async _probe(url) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          /* YouTube returns a 120×90 grey placeholder for missing qualities */
          resolve(img.naturalWidth > 120 || img.naturalHeight > 90);
        };
        img.onerror = () => resolve(false);
        img.src = url + '?_=' + Date.now(); // cache-bust
      });
    },

    async fetch() {
      const id = this.parseId(this.url);
      if (!id) { this.error = 'Could not detect a YouTube video ID. Paste a valid YouTube URL or 11-character video ID.'; return; }
      this.error = '';
      this.videoId = id;
      this.loading = true;
      this.results = [];

      const probes = this.QUALITIES.map(async q => {
        const src = this._thumbUrl(id, q.key);
        const available = await this._probe(src);
        return { ...q, src, available };
      });

      this.results = await Promise.all(probes);
      this.loading = false;
    },

    /* Force-download via anchor + blob to avoid browser "open in tab" behaviour */
    async download(item) {
      if (!item.available) return;
      try {
        const resp = await fetch(item.src);
        if (!resp.ok) throw new Error('fetch failed');
        const blob = await resp.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `yt-thumbnail-${this.videoId}-${item.key}.jpg`;
        a.click();
        URL.revokeObjectURL(a.href);
        this._toast('Downloading ' + item.label);
      } catch {
        /* fallback: open in new tab */
        window.open(item.src, '_blank');
      }
    },

    downloadAll() {
      this.results.filter(r => r.available).forEach((r, i) => {
        setTimeout(() => this.download(r), i * 400);
      });
    },

    copyUrl(src) {
      navigator.clipboard.writeText(src).then(() => this._toast('URL copied!')).catch(() => this._toast('Copy failed'));
    },

    clear() {
      this.url = '';
      this.videoId = '';
      this.results = [];
      this.error = '';
    },

    /* Paste from clipboard */
    async pasteUrl() {
      try {
        const text = await navigator.clipboard.readText();
        if (text) { this.url = text.trim(); await this.fetch(); }
      } catch { this._toast('Clipboard access denied — paste manually'); }
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },

    init() {},
  };
}
