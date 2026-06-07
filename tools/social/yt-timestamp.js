/* ── YouTube Timestamp Link Generator Alpine component ── */
function ytTimestampApp() {
  return {
    /* ── Video URL input ── */
    videoUrl: '',
    videoId:  '',

    /* ── Current timestamp entry ── */
    hrs: 0, mins: 0, secs: 0,
    tsLabel: '',

    /* ── Timestamp list ── */
    timestamps: [],

    /* ── Tags & Hashtags ── */
    tagsInput: '',
    hashtagsInput: '',

    /* ── Output ── */
    bulkText: '',
    chaptersText: '',

    /* ── Drag state ── */
    dragIdx: null,

    /* ── Extract video ID from any YouTube URL ── */
    parseVideoId(url) {
      if (!url) return '';
      url = url.trim();
      // youtu.be/ID
      let m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
      // youtube.com/watch?v=ID
      m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
      // youtube.com/embed/ID
      m = url.match(/embed\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
      // youtube.com/shorts/ID
      m = url.match(/shorts\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
      // youtube.com/live/ID
      m = url.match(/live\/([A-Za-z0-9_-]{11})/);
      if (m) return m[1];
      // raw 11-char ID
      if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
      return '';
    },

    onUrlInput() {
      this.videoId = this.parseVideoId(this.videoUrl);
      this.rebuildOutputs();
    },

    /* ── Time helpers ── */
    totalSecs() {
      return (parseInt(this.hrs)||0)*3600 + (parseInt(this.mins)||0)*60 + (parseInt(this.secs)||0);
    },
    formatTime(secs) {
      const h = Math.floor(secs/3600);
      const m = Math.floor((secs%3600)/60);
      const s = secs%60;
      if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      return `${m}:${String(s).padStart(2,'0')}`;
    },
    buildUrl(secs) {
      if (!this.videoId) return '';
      return `https://youtu.be/${this.videoId}?t=${secs}`;
    },

    /* ── Add timestamp ── */
    addTimestamp() {
      const secs = this.totalSecs();
      if (!this.videoId) { this._toast('Paste a YouTube URL or video ID first'); return; }
      // prevent exact duplicate seconds
      if (this.timestamps.some(t => t.secs === secs)) {
        this._toast('A timestamp at this time already exists'); return;
      }
      this.timestamps.push({
        id: Date.now(),
        secs,
        time: this.formatTime(secs),
        label: this.tsLabel.trim() || 'Chapter ' + (this.timestamps.length + 1),
        url: this.buildUrl(secs),
      });
      // sort by time
      this.timestamps.sort((a, b) => a.secs - b.secs);
      // advance time by 30s for convenience
      let next = secs + 30;
      this.hrs  = Math.floor(next/3600);
      this.mins = Math.floor((next%3600)/60);
      this.secs = next%60;
      this.tsLabel = '';
      this.rebuildOutputs();
    },

    removeTimestamp(id) {
      this.timestamps = this.timestamps.filter(t => t.id !== id);
      this.rebuildOutputs();
    },

    /* ── Edit label inline ── */
    startEdit(item) { item._editing = true; item._draft = item.label; },
    saveEdit(item)  { item.label = item._draft || item.label; item._editing = false; this.rebuildOutputs(); },

    /* ── Quick time shortcuts ── */
    setTime(secs) {
      this.hrs  = Math.floor(secs/3600);
      this.mins = Math.floor((secs%3600)/60);
      this.secs = secs%60;
    },

    /* ── Rebuild all outputs ── */
    rebuildOutputs() {
      if (!this.videoId || !this.timestamps.length) { this.bulkText = ''; this.chaptersText = ''; return; }

      // Bulk links (plain text)
      this.bulkText = this.timestamps
        .map(t => `${t.time} ${t.label}\n${t.url}`)
        .join('\n\n');

      // YouTube chapters description format
      this.chaptersText = this.timestamps
        .map(t => `${t.time} ${t.label}`)
        .join('\n');
    },

    /* ── Tags processing ── */
    get parsedTags() {
      return this.tagsInput.split(/[\n,]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean)
        .slice(0, 500);
    },
    get parsedHashtags() {
      return this.hashtagsInput.split(/[\n,\s]+/)
        .map(t => t.trim().replace(/^#+/, ''))
        .filter(Boolean)
        .slice(0, 30);
    },
    get hashtagString() {
      return this.parsedHashtags.map(h => '#' + h).join(' ');
    },
    get tagsForYT() {
      // YouTube tags: comma-separated, max 500 chars total, no # prefix
      return this.parsedTags.join(', ');
    },

    /* ── Clipboard helpers ── */
    async copyText(text, label) {
      if (!text) return;
      try { await navigator.clipboard.writeText(text); this._toast(label + ' copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyUrl(url) {
      if (!url) return;
      try { await navigator.clipboard.writeText(url); this._toast('Link copied!'); }
      catch { this._toast('Copy failed'); }
    },

    /* ── Clear ── */
    clearAll() {
      this.timestamps = [];
      this.bulkText = '';
      this.chaptersText = '';
      this.tsLabel = '';
      this.hrs = this.mins = this.secs = 0;
      this._toast('Cleared');
    },

    /* ── Load example ── */
    loadExample() {
      this.videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      this.videoId  = 'dQw4w9WgXcQ';
      this.timestamps = [
        { id:1, secs:0,   time:'0:00',  label:'Intro',                url:this.buildUrl(0)   },
        { id:2, secs:45,  time:'0:45',  label:'Main topic starts',    url:this.buildUrl(45)  },
        { id:3, secs:183, time:'3:03',  label:'Key moment',           url:this.buildUrl(183) },
        { id:4, secs:310, time:'5:10',  label:'Q&A section',          url:this.buildUrl(310) },
        { id:5, secs:502, time:'8:22',  label:'Outro & subscribe CTA',url:this.buildUrl(502) },
      ];
      this.tagsInput      = 'youtube tips, video creation, content creator, how to, tutorial';
      this.hashtagsInput  = 'YouTube YouTubeTips ContentCreator VideoMarketing';
      this.rebuildOutputs();
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },

    init() {},
  };
}
