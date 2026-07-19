/* ── SWOT Analysis Maker — Alpine component ── */

const SWOT_QUADRANTS = [
  { key: 'strengths',     label: 'Strengths',     icon: '💪', accent: '#22c55e', bg: 'rgba(34,197,94,.1)',   bd: 'rgba(34,197,94,.25)'  },
  { key: 'weaknesses',    label: 'Weaknesses',    icon: '⚠️',  accent: '#f87171', bg: 'rgba(248,113,113,.1)', bd: 'rgba(248,113,113,.25)'},
  { key: 'opportunities', label: 'Opportunities', icon: '🚀', accent: '#60a5fa', bg: 'rgba(96,165,250,.1)',  bd: 'rgba(96,165,250,.25)' },
  { key: 'threats',       label: 'Threats',       icon: '⚡', accent: '#fbbf24', bg: 'rgba(251,191,36,.1)',  bd: 'rgba(251,191,36,.25)' },
];

let _swotId = 1;

function swotApp() {
  return {
    title:    'SWOT Analysis',
    subtitle: '',
    data: {
      strengths:     [],
      weaknesses:    [],
      opportunities: [],
      threats:       [],
    },
    quadrants: SWOT_QUADRANTS,

    /* editing */
    editQ:    null,   /* quadrant key */
    editId:   null,   /* item id (null = new) */
    editText: '',
    editNote: '',
    editPriority: 'medium',  /* high | medium | low */
    showForm: false,

    /* export */
    exporting: false,
    toast: '',

    /* ── init ─────────────────────────────── */
    init() {
      const saved = localStorage.getItem('swot_data');
      if (saved) {
        try {
          const d = JSON.parse(saved);
          this.title    = d.title    ?? this.title;
          this.subtitle = d.subtitle ?? '';
          this.data     = { strengths: [], weaknesses: [], opportunities: [], threats: [], ...d.data };
        } catch(_) {}
      }
      if (this._totalItems() === 0) this._loadSample();
      this.$watch('data',     () => this._save(), { deep: true });
      this.$watch('title',    () => this._save());
      this.$watch('subtitle', () => this._save());
    },

    _save() {
      localStorage.setItem('swot_data', JSON.stringify({ title: this.title, subtitle: this.subtitle, data: this.data }));
    },

    _totalItems() {
      return Object.values(this.data).reduce((s, arr) => s + arr.length, 0);
    },

    _loadSample() {
      this.title    = 'Product Launch SWOT';
      this.subtitle = 'Q3 2025 Analysis';
      this.data.strengths     = [
        { id: _swotId++, text: 'Strong brand recognition',       note: '', priority: 'high'   },
        { id: _swotId++, text: 'Experienced development team',    note: '', priority: 'high'   },
        { id: _swotId++, text: 'Proprietary technology stack',    note: '', priority: 'medium' },
      ];
      this.data.weaknesses    = [
        { id: _swotId++, text: 'Limited marketing budget',        note: 'Need to explore organic channels', priority: 'high'   },
        { id: _swotId++, text: 'High customer acquisition cost',  note: '', priority: 'medium' },
      ];
      this.data.opportunities = [
        { id: _swotId++, text: 'Growing market demand',           note: '', priority: 'high'   },
        { id: _swotId++, text: 'Partnership with distributors',   note: '', priority: 'medium' },
        { id: _swotId++, text: 'Emerging international markets',  note: '', priority: 'low'    },
      ];
      this.data.threats       = [
        { id: _swotId++, text: 'Established competitors',         note: '', priority: 'high'   },
        { id: _swotId++, text: 'Regulatory uncertainty',          note: '', priority: 'medium' },
      ];
    },

    /* ── counts ───────────────────────────── */
    count(key) { return this.data[key]?.length ?? 0; },

    /* ── form ─────────────────────────────── */
    openAdd(quadrantKey) {
      this.editQ        = quadrantKey;
      this.editId       = null;
      this.editText     = '';
      this.editNote     = '';
      this.editPriority = 'medium';
      this.showForm     = true;
      this.$nextTick(() => this.$refs.swotInput?.focus());
    },

    openEdit(quadrantKey, item) {
      this.editQ        = quadrantKey;
      this.editId       = item.id;
      this.editText     = item.text;
      this.editNote     = item.note || '';
      this.editPriority = item.priority || 'medium';
      this.showForm     = true;
      this.$nextTick(() => this.$refs.swotInput?.focus());
    },

    saveForm() {
      if (!this.editText.trim()) return;
      const arr = this.data[this.editQ];
      if (this.editId !== null) {
        const idx = arr.findIndex(i => i.id === this.editId);
        if (idx !== -1) arr[idx] = { id: this.editId, text: this.editText.trim(), note: this.editNote.trim(), priority: this.editPriority };
      } else {
        arr.push({ id: _swotId++, text: this.editText.trim(), note: this.editNote.trim(), priority: this.editPriority });
      }
      this.showForm = false;
    },

    deleteItem(quadrantKey, id) {
      this.data[quadrantKey] = this.data[quadrantKey].filter(i => i.id !== id);
    },

    clearQuadrant(key) {
      if (!confirm(`Clear all items from ${key}?`)) return;
      this.data[key] = [];
    },

    clearAll() {
      if (!confirm('Clear entire SWOT analysis?')) return;
      Object.keys(this.data).forEach(k => this.data[k] = []);
    },

    /* ── drag to reorder within a quadrant ── */
    dragId:   null,
    dragFromQ: null,
    dragOverId: null,

    dragStart(q, id) { this.dragId = id; this.dragFromQ = q; },
    dragEnterItem(id) { if (id !== this.dragId) this.dragOverId = id; },
    dragLeaveItem()   { this.dragOverId = null; },
    dragEnd()         { this.dragId = null; this.dragFromQ = null; this.dragOverId = null; },
    dropItem(q, targetId) {
      if (!this.dragId || this.dragFromQ !== q) return;
      const arr  = this.data[q];
      const from = arr.findIndex(i => i.id === this.dragId);
      const to   = arr.findIndex(i => i.id === targetId);
      if (from === -1 || to === -1 || from === to) return;
      const copy = [...arr];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      this.data[q] = copy;
      this.dragOverId = null;
    },

    /* ── priority helpers ─────────────────── */
    priorityColor(p) {
      return { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }[p] || '#4ade80';
    },
    priorityLabel(p) {
      return { high: 'High', medium: 'Med', low: 'Low' }[p] || '';
    },

    quadrantMeta(key) { return SWOT_QUADRANTS.find(q => q.key === key); },

    /* ── JSON ─────────────────────────────── */
    async copyJson() {
      const d = JSON.stringify({ title: this.title, subtitle: this.subtitle, data: this.data }, null, 2);
      try { await navigator.clipboard.writeText(d); this._toast('JSON copied!'); } catch(_) {}
    },

    importJson() {
      const raw = prompt('Paste SWOT JSON:');
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.data) {
          this.title    = d.title    || this.title;
          this.subtitle = d.subtitle || '';
          ['strengths','weaknesses','opportunities','threats'].forEach(k => {
            this.data[k] = (d.data[k] || []).map(i => ({ ...i, id: _swotId++ }));
          });
          this._toast('SWOT imported!');
        }
      } catch(_) { this._toast('Invalid JSON'); }
    },

    /* ── Export ───────────────────────────── */
    async exportPng() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.swotCanvas;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = (this.title || 'swot-analysis') + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        this._toast('PNG downloaded!');
      } catch(e) { this._toast('Export failed'); }
      finally { this.exporting = false; }
    },

    async exportPdf() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.swotCanvas;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width/2, canvas.height/2] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width/2, canvas.height/2);
        pdf.save((this.title || 'swot-analysis') + '.pdf');
        this._toast('PDF downloaded!');
      } catch(e) { this._toast('Export failed'); }
      finally { this.exporting = false; }
    },

    _toast(msg) {
      this.toast = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => this.toast = '', 2200);
    },
  };
}
