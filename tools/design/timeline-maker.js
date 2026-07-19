/* ── Timeline Maker — Alpine component ── */

const TL_COLORS = [
  { id: 'violet',  bg: '#8b5cf6', light: 'rgba(139,92,246,.15)'  },
  { id: 'blue',    bg: '#3b82f6', light: 'rgba(59,130,246,.15)'  },
  { id: 'cyan',    bg: '#06b6d4', light: 'rgba(6,182,212,.15)'   },
  { id: 'green',   bg: '#10b981', light: 'rgba(16,185,129,.15)'  },
  { id: 'amber',   bg: '#f59e0b', light: 'rgba(245,158,11,.15)'  },
  { id: 'orange',  bg: '#f97316', light: 'rgba(249,115,22,.15)'  },
  { id: 'rose',    bg: '#f43f5e', light: 'rgba(244,63,94,.15)'   },
  { id: 'pink',    bg: '#ec4899', light: 'rgba(236,72,153,.15)'  },
];

let _tlId = 1;

function timelineMakerApp() {
  return {
    /* ── state ─────────────────────────── */
    title:       'My Timeline',
    subtitle:    '',
    events:      [],
    sortByDate:  true,
    layout:      'vertical',   /* vertical | horizontal */
    showYear:    true,
    showDates:   true,

    /* ── editing ────────────────────────── */
    editId:      null,
    form: {
      title: '', date: '', endDate: '', desc: '', color: 'violet', icon: '',
    },
    showForm:    false,
    dragId:      null,
    dragOver:    null,

    /* ── export / toast ─────────────────── */
    exporting:   false,
    toast:       '',

    /* ── init ─────────────────────────── */
    init() {
      const saved = localStorage.getItem('tl_data');
      if (saved) {
        try {
          const d = JSON.parse(saved);
          this.title     = d.title    ?? this.title;
          this.subtitle  = d.subtitle ?? '';
          this.events    = d.events   ?? [];
          this.sortByDate= d.sortByDate ?? true;
          this.layout    = d.layout   ?? 'vertical';
          this.showYear  = d.showYear ?? true;
          this.showDates = d.showDates ?? true;
        } catch(_) {}
      }
      if (!this.events.length) this._loadSample();
      this.$watch('events',   () => this._save(), { deep: true });
      this.$watch('title',    () => this._save());
      this.$watch('subtitle', () => this._save());
      this.$watch('sortByDate',() => this._save());
      this.$watch('layout',   () => this._save());
      this.$watch('showYear', () => this._save());
      this.$watch('showDates',() => this._save());
    },

    _save() {
      localStorage.setItem('tl_data', JSON.stringify({
        title: this.title, subtitle: this.subtitle,
        events: this.events, sortByDate: this.sortByDate,
        layout: this.layout, showYear: this.showYear, showDates: this.showDates,
      }));
    },

    _loadSample() {
      const colors = TL_COLORS.map(c => c.id);
      const samples = [
        { title: 'Project Kickoff',       date: '2024-01-15', desc: 'Initial planning session and stakeholder alignment.',        color: 'violet' },
        { title: 'Design Phase',          date: '2024-02-01', endDate: '2024-02-28', desc: 'UI/UX wireframes and design system.', color: 'blue'   },
        { title: 'Development Sprint 1',  date: '2024-03-01', endDate: '2024-03-21', desc: 'Core feature implementation.',       color: 'cyan'   },
        { title: 'Beta Launch',           date: '2024-04-10', desc: 'Limited release to early adopters.',                        color: 'green'  },
        { title: 'Public Release',        date: '2024-06-01', desc: 'Full public launch and marketing campaign.',                color: 'amber'  },
      ];
      this.events = samples.map(s => ({ ...s, id: _tlId++ }));
    },

    /* ── sorted events ──────────────────── */
    get sorted() {
      if (!this.sortByDate) return this.events;
      return [...this.events].sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db = b.date ? new Date(b.date) : new Date(0);
        return da - db;
      });
    },

    get colorMap() {
      const m = {};
      TL_COLORS.forEach(c => m[c.id] = c);
      return m;
    },

    /* ── Form helpers ───────────────────── */
    openAdd() {
      this.editId  = null;
      this.form    = { title:'', date:'', endDate:'', desc:'', color:'violet', icon:'' };
      this.showForm = true;
      this.$nextTick(() => this.$refs.formTitle?.focus());
    },

    openEdit(ev) {
      this.editId = ev.id;
      this.form   = { title: ev.title, date: ev.date || '', endDate: ev.endDate || '', desc: ev.desc || '', color: ev.color || 'violet', icon: ev.icon || '' };
      this.showForm = true;
      this.$nextTick(() => this.$refs.formTitle?.focus());
    },

    saveForm() {
      if (!this.form.title.trim()) return;
      if (this.editId !== null) {
        const idx = this.events.findIndex(e => e.id === this.editId);
        if (idx !== -1) this.events[idx] = { ...this.events[idx], ...this.form, title: this.form.title.trim() };
      } else {
        this.events.push({ id: _tlId++, ...this.form, title: this.form.title.trim() });
      }
      this.showForm = false;
      this.editId   = null;
    },

    deleteEvent(id) {
      this.events = this.events.filter(e => e.id !== id);
    },

    duplicateEvent(ev) {
      this.events.push({ ...ev, id: _tlId++, title: ev.title + ' (copy)' });
    },

    clearAll() {
      if (!confirm('Clear all events?')) return;
      this.events = [];
    },

    /* ── Drag ───────────────────────────── */
    dragStart(id) { this.dragId = id; },
    dragEnter(id) { if (id !== this.dragId) this.dragOver = id; },
    dragLeave()   { this.dragOver = null; },
    dragEnd()     { this.dragId = null; this.dragOver = null; },
    drop(targetId) {
      if (this.dragId === null || this.dragId === targetId) return;
      const from = this.events.findIndex(e => e.id === this.dragId);
      const to   = this.events.findIndex(e => e.id === targetId);
      if (from === -1 || to === -1) return;
      const copy = [...this.events];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      this.events    = copy;
      this.sortByDate = false;
      this.dragOver  = null;
    },

    /* ── Formatting helpers ─────────────── */
    formatDate(str) {
      if (!str) return '';
      try {
        const d = new Date(str + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(this.showYear ? { year: 'numeric' } : {}) });
      } catch(_) { return str; }
    },

    dateRange(ev) {
      if (!ev.date) return '';
      const s = this.formatDate(ev.date);
      const e = ev.endDate ? this.formatDate(ev.endDate) : '';
      return e ? `${s} – ${e}` : s;
    },

    getColor(id) { return this.colorMap[id] || TL_COLORS[0]; },

    /* ── Export ─────────────────────────── */
    async exportPng() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.tlCanvas;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = (this.title || 'timeline') + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        this._toast('PNG downloaded!');
      } catch(e) { this._toast('Export failed: ' + e.message); }
      finally { this.exporting = false; }
    },

    async exportPdf() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.tlCanvas;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width/2, canvas.height/2] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width/2, canvas.height/2);
        pdf.save((this.title || 'timeline') + '.pdf');
        this._toast('PDF downloaded!');
      } catch(e) { this._toast('Export failed: ' + e.message); }
      finally { this.exporting = false; }
    },

    async copyJson() {
      const data = JSON.stringify({ title: this.title, subtitle: this.subtitle, events: this.events }, null, 2);
      try {
        await navigator.clipboard.writeText(data);
        this._toast('JSON copied!');
      } catch(_) {}
    },

    importJson() {
      const raw = prompt('Paste timeline JSON:');
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.events) {
          this.events   = d.events.map(e => ({ ...e, id: _tlId++ }));
          this.title    = d.title    || this.title;
          this.subtitle = d.subtitle || '';
          this._toast('Timeline imported!');
        }
      } catch(_) { this._toast('Invalid JSON'); }
    },

    _toast(msg) {
      this.toast = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => this.toast = '', 2000);
    },
  };
}
