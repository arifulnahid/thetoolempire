/* ── YouTube Chapter Generator — Alpine component ── */

function ytChaptersApp() {
  return {
    tab: 'build',
    chapters: [
      { id: 1, time: '0:00', title: 'Introduction'  },
      { id: 2, time: '',     title: ''              },
      { id: 3, time: '',     title: ''              },
    ],
    _nextId: 4,

    importText:   '',
    importParsed: [],
    importDone:   false,
    copied:       false,

    /* ── time helpers ── */
    _secs(t) {
      if (!t || !t.trim()) return -1;
      const p = t.trim().split(':').map(Number);
      if (p.length < 2 || p.length > 3) return -1;
      if (p.some(v => isNaN(v) || v < 0)) return -1;
      if (p.length === 2 && p[1] > 59) return -1;
      if (p.length === 3 && (p[1] > 59 || p[2] > 59)) return -1;
      return p.length === 2 ? p[0] * 60 + p[1] : p[0] * 3600 + p[1] * 60 + p[2];
    },
    _fmt(s) {
      if (s < 0) return '';
      const h   = Math.floor(s / 3600);
      const m   = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const p2  = n => String(n).padStart(2, '0');
      return h > 0 ? `${h}:${p2(m)}:${p2(sec)}` : `${m}:${p2(sec)}`;
    },
    blurTime(ch) {
      const s = this._secs(ch.time);
      if (s >= 0) ch.time = this._fmt(s);
    },

    /* ── computed ── */
    get sorted() {
      return [...this.chapters].sort((a, b) => {
        const sa = this._secs(a.time), sb = this._secs(b.time);
        if (sa < 0 && sb < 0) return 0;
        if (sa < 0) return 1;
        if (sb < 0) return -1;
        return sa - sb;
      });
    },
    get output() {
      return this.sorted
        .filter(c => this._secs(c.time) >= 0 && c.title.trim())
        .map(c => `${c.time} ${c.title.trim()}`)
        .join('\n');
    },
    get validLines() {
      return this.sorted.filter(c => this._secs(c.time) >= 0 && c.title.trim()).length;
    },
    get charCount() { return this.output.length; },
    get errors() {
      const e = [];
      if (this.validLines < 3)
        e.push(`YouTube requires at least 3 chapters — you have ${this.validLines}.`);
      const first = this.sorted.find(c => this._secs(c.time) >= 0);
      if (first && this._secs(first.time) !== 0)
        e.push('First chapter must start at 0:00.');
      const emptyTitle = this.chapters.filter(c => this._secs(c.time) >= 0 && !c.title.trim()).length;
      if (emptyTitle) e.push(`${emptyTitle} chapter(s) are missing a title.`);
      const badTime = this.chapters.filter(c => c.title.trim() && this._secs(c.time) < 0).length;
      if (badTime) e.push(`${badTime} chapter(s) have an invalid timestamp.`);
      const times = this.chapters.map(c => this._secs(c.time)).filter(s => s >= 0);
      if (new Set(times).size !== times.length) e.push('Duplicate timestamps found.');
      const st = [...times].sort((a, b) => a - b);
      for (let i = 1; i < st.length; i++) {
        if (st[i] - st[i - 1] < 10) {
          e.push('Chapters must be at least 10 seconds apart.');
          break;
        }
      }
      return e;
    },
    get isValid() { return this.errors.length === 0 && this.validLines >= 3; },

    /* ── chapter management ── */
    addChapter() {
      this.chapters.push({ id: this._nextId++, time: '', title: '' });
      this.$nextTick(() => {
        const inputs = document.querySelectorAll('.ch-time-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    },
    removeChapter(id) {
      if (this.chapters.length <= 1) return;
      this.chapters = this.chapters.filter(c => c.id !== id);
    },
    sortInPlace() {
      this.chapters = this.sorted;
    },
    clearAll() {
      this.chapters = [
        { id: 1, time: '0:00', title: 'Introduction' },
        { id: 2, time: '', title: '' },
        { id: 3, time: '', title: '' },
      ];
      this._nextId = 4;
      this.copied = false;
    },

    /* ── clipboard ── */
    async copyOutput() {
      if (!this.output) return;
      try {
        await navigator.clipboard.writeText(this.output);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch (_) {}
    },

    /* ── import ── */
    parseImport() {
      const lines = this.importText.split('\n');
      // Handles: "0:00 Title", "(0:00) Title", "0:00 - Title", "0:00:00 Title", timestamps with dashes/em-dashes
      const pat = /^\(?(\d{1,2}:\d{2}(?::\d{2})?)\)?\s*[-–—]?\s*(.+)/;
      this.importParsed = [];
      for (const line of lines) {
        const m = line.trim().match(pat);
        if (m && m[2].trim()) {
          this.importParsed.push({ time: m[1], title: m[2].trim() });
        }
      }
      this.importDone = true;
    },
    applyImport() {
      if (!this.importParsed.length) return;
      this.chapters = this.importParsed.map((c, i) => ({ id: i + 1, time: c.time, title: c.title }));
      this._nextId = this.chapters.length + 1;
      this.importText   = '';
      this.importParsed = [];
      this.importDone   = false;
      this.tab          = 'build';
    },
    clearImport() {
      this.importText   = '';
      this.importParsed = [];
      this.importDone   = false;
    },
  };
}
