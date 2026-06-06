function wordCounterApp() {
  return {
    text: '',
    wordGoal: 500,
    customGoal: 500,
    ignoreNumbers: false,
    caseSensitiveDensity: false,
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,

    get words() {
      const t = this.ignoreNumbers
        ? this.text.replace(/\b\d+\b/g, '')
        : this.text;
      const m = t.match(/\b\w+\b/g);
      return m ? m.length : 0;
    },
    get chars() { return this.text.length; },
    get charsNoSpace() { return this.text.replace(/\s/g, '').length; },
    get sentences() {
      const m = this.text.match(/[^.!?]*[.!?]+/g);
      return m ? m.length : (this.text.trim() ? 1 : 0);
    },
    get paragraphs() {
      return this.text.trim()
        ? this.text.split(/\n\s*\n/).filter(p => p.trim()).length
        : 0;
    },
    get lines() {
      return this.text ? this.text.split('\n').length : 0;
    },
    get uniqueWords() {
      const t = this.ignoreNumbers ? this.text.replace(/\b\d+\b/g,'') : this.text;
      const words = (t.match(/\b\w+\b/g) || []).map(w =>
        this.caseSensitiveDensity ? w : w.toLowerCase()
      );
      return new Set(words).size;
    },
    get readTimeMin() {
      const mins = this.words / 200;
      if (mins < 1) return '< 1 min';
      return Math.round(mins) + ' min';
    },
    get speakTimeMin() {
      const mins = this.words / 130;
      if (mins < 1) return '< 1 min';
      return Math.round(mins) + ' min';
    },
    get avgWordLen() {
      const t = this.ignoreNumbers ? this.text.replace(/\b\d+\b/g,'') : this.text;
      const words = (t.match(/\b\w+\b/g) || []);
      if (!words.length) return '0';
      const total = words.reduce((s, w) => s + w.length, 0);
      return (total / words.length).toFixed(1);
    },
    get charLimitPct() {
      return Math.min((this.chars / 5000) * 100, 100);
    },
    get goalPct() {
      return Math.min((this.words / this.wordGoal) * 100, 100);
    },
    get goalDone() { return this.words >= this.wordGoal; },
    get topKeywords() {
      const t = this.ignoreNumbers ? this.text.replace(/\b\d+\b/g,'') : this.text;
      const words = (t.match(/\b[a-zA-Z]{4,}\b/g) || []).map(w =>
        this.caseSensitiveDensity ? w : w.toLowerCase()
      );
      if (!words.length) return [];
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
      const max = sorted[0]?.[1] || 1;
      return sorted.slice(0, 8).map(([word, count]) => ({
        word,
        count,
        pct: Math.round((count / max) * 100)
      }));
    },

    setGoal(n) {
      this.wordGoal = n;
      this.customGoal = n;
    },

    copyText() {
      if (!this.text) return;
      navigator.clipboard.writeText(this.text).then(() => this.showToast('Text copied!'));
    },
    clearText() {
      this.text = '';
    },
    pasteText() {
      navigator.clipboard.readText().then(t => {
        this.text = t;
        this.showToast('Pasted from clipboard!');
      }).catch(() => this.showToast('Clipboard access denied'));
    },

    toggleFaq(i) {
      this.openFaq = this.openFaq === i ? null : i;
    },

    submitReport() {
      if (!this.reportSelected) return;
      this.reportSent = true;
    },
    closeReport() {
      this.reportOpen = false;
      setTimeout(() => { this.reportSent = false; this.reportSelected = ''; }, 400);
    },

    showToast(msg) {
      this.toastMsg = msg;
      clearTimeout(this._toastTimer);
      this.$nextTick(() => {
        const el = document.getElementById('wc-toast');
        if (el) { el.classList.add('show'); }
        this._toastTimer = setTimeout(() => {
          if (el) el.classList.remove('show');
        }, 2500);
      });
    },

    init() {
      document.addEventListener('scroll', () => {
        const h = document.querySelector('.site-header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }
  };
}

function switchInfoTab(id) {
  document.querySelectorAll('.info-tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('tab-' + id);
  const btn = document.querySelector('[data-tab="' + id + '"]');
  if (pane) pane.classList.add('active');
  if (btn) btn.classList.add('active');
}
