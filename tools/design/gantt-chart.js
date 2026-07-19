/* ── Gantt Chart Maker — Alpine component ── */

const GANTT_COLORS = [
  { id: 'indigo',  hex: '#6366f1' },
  { id: 'violet',  hex: '#8b5cf6' },
  { id: 'blue',    hex: '#3b82f6' },
  { id: 'cyan',    hex: '#06b6d4' },
  { id: 'green',   hex: '#22c55e' },
  { id: 'amber',   hex: '#f59e0b' },
  { id: 'orange',  hex: '#f97316' },
  { id: 'rose',    hex: '#f43f5e' },
];

const MS_DAY = 86400000;

let _gId = 1;

function _dateStr(d) {
  return d.toISOString().slice(0, 10);
}
function _parseDate(str) {
  return new Date(str + 'T00:00:00');
}
function _addDays(d, n) {
  return new Date(d.getTime() + n * MS_DAY);
}
function _diffDays(a, b) {
  return Math.round((b.getTime() - a.getTime()) / MS_DAY);
}

function ganttApp() {
  return {
    /* ── project meta ────────────────────── */
    title:    'Project Roadmap',
    subtitle: '',

    /* ── tasks ───────────────────────────── */
    tasks: [],

    /* ── view options ────────────────────── */
    zoom:         'week',   /* day | week | month */
    showToday:    true,
    showProgress: true,
    showWeekends: true,

    /* ── form ────────────────────────────── */
    showForm:     false,
    editId:       null,
    form: {
      name: '', startDate: '', endDate: '', color: 'indigo',
      progress: 0, group: '', note: '',
    },

    /* ── drag reorder ────────────────────── */
    dragId:   null,
    dragOver: null,

    /* ── misc ────────────────────────────── */
    exporting: false,
    toast:     '',
    colors:    GANTT_COLORS,

    /* ── init ────────────────────────────── */
    init() {
      const saved = localStorage.getItem('gantt_data');
      if (saved) {
        try {
          const d = JSON.parse(saved);
          this.title    = d.title    ?? this.title;
          this.subtitle = d.subtitle ?? '';
          this.tasks    = d.tasks    ?? [];
          this.zoom     = d.zoom     ?? 'week';
          this.showToday    = d.showToday    ?? true;
          this.showProgress = d.showProgress ?? true;
          this.showWeekends = d.showWeekends ?? true;
        } catch (_) {}
      }
      if (!this.tasks.length) this._loadSample();
      this.$watch('tasks',        () => this._save(), { deep: true });
      this.$watch('title',        () => this._save());
      this.$watch('subtitle',     () => this._save());
      this.$watch('zoom',         () => this._save());
      this.$watch('showToday',    () => this._save());
      this.$watch('showProgress', () => this._save());
      this.$watch('showWeekends', () => this._save());
    },

    _save() {
      localStorage.setItem('gantt_data', JSON.stringify({
        title: this.title, subtitle: this.subtitle, tasks: this.tasks,
        zoom: this.zoom, showToday: this.showToday,
        showProgress: this.showProgress, showWeekends: this.showWeekends,
      }));
    },

    _loadSample() {
      const today = new Date();
      const t = (offsetStart, offsetEnd, name, color, progress, group) => ({
        id: _gId++, name, group: group || '',
        startDate: _dateStr(_addDays(today, offsetStart)),
        endDate:   _dateStr(_addDays(today, offsetEnd)),
        color, progress: progress || 0, note: '',
      });
      this.tasks = [
        t(-28, -14, 'Project Kick-off',        'violet', 100, 'Planning'),
        t(-20, -5,  'Requirements & Research',  'violet', 100, 'Planning'),
        t(-10, 10,  'UI/UX Design',             'blue',   75,  'Design'),
        t(-5,  20,  'Design Review & Approval', 'blue',   40,  'Design'),
        t(5,   35,  'Backend Development',       'indigo', 20,  'Development'),
        t(10,  40,  'Frontend Development',      'indigo', 10,  'Development'),
        t(30,  50,  'Integration & QA Testing',  'amber',  0,   'Testing'),
        t(45,  60,  'UAT & Bug Fixes',           'orange', 0,   'Testing'),
        t(55,  65,  'Deployment & Release',      'green',  0,   'Launch'),
      ];
    },

    /* ── computed chart range ──────────────── */
    get chartStart() {
      if (!this.tasks.length) return _addDays(new Date(), -7);
      const min = this.tasks.reduce((m, t) => {
        const d = _parseDate(t.startDate);
        return d < m ? d : m;
      }, _parseDate(this.tasks[0].startDate));
      return _addDays(min, -3);
    },

    get chartEnd() {
      if (!this.tasks.length) return _addDays(new Date(), 30);
      const max = this.tasks.reduce((m, t) => {
        const d = _parseDate(t.endDate);
        return d > m ? d : m;
      }, _parseDate(this.tasks[0].endDate));
      return _addDays(max, 3);
    },

    get totalDays() {
      return Math.max(1, _diffDays(this.chartStart, this.chartEnd));
    },

    /* ── grid columns ─────────────────────── */
    get gridCols() {
      const cols = [];
      const start = this.chartStart;
      const end   = this.chartEnd;

      if (this.zoom === 'day') {
        let cur = new Date(start);
        while (cur < end) {
          const dow = cur.getDay();
          cols.push({
            label:     cur.getDate(),
            subLabel:  cur.toLocaleDateString('en-US', { month: 'short' }),
            days:      1,
            isWeekend: dow === 0 || dow === 6,
            date:      new Date(cur),
          });
          cur = _addDays(cur, 1);
        }
      } else if (this.zoom === 'week') {
        /* align to monday before chartStart */
        let cur = new Date(start);
        const dow = cur.getDay();
        cur = _addDays(cur, -(dow === 0 ? 6 : dow - 1));
        while (cur < end) {
          const next = _addDays(cur, 7);
          const days = Math.min(7, _diffDays(cur < start ? start : cur, next > end ? end : next));
          cols.push({
            label:    cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            subLabel: cur.getFullYear(),
            days:     7,
            isWeekend: false,
            date:     new Date(cur),
          });
          cur = next;
        }
      } else {
        /* month */
        let cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur < end) {
          const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          const daysInMonth = _diffDays(cur, next);
          cols.push({
            label:    cur.toLocaleDateString('en-US', { month: 'short' }),
            subLabel: cur.getFullYear(),
            days:     daysInMonth,
            isWeekend: false,
            date:     new Date(cur),
          });
          cur = next;
        }
      }
      return cols;
    },

    /* ── task positioning ─────────────────── */
    taskLeft(task) {
      const days = _diffDays(this.chartStart, _parseDate(task.startDate));
      return Math.max(0, (days / this.totalDays) * 100);
    },

    taskWidth(task) {
      const s   = _parseDate(task.startDate);
      const e   = _parseDate(task.endDate);
      const dur = Math.max(1, _diffDays(s, e));
      return Math.max(0.3, (dur / this.totalDays) * 100);
    },

    colLeft(col) {
      const days = Math.max(0, _diffDays(this.chartStart, col.date));
      return (days / this.totalDays) * 100;
    },

    colWidth(col) {
      return (col.days / this.totalDays) * 100;
    },

    /* today line */
    get todayLeft() {
      const days = _diffDays(this.chartStart, new Date());
      return (days / this.totalDays) * 100;
    },

    get showTodayLine() {
      const tl = this.todayLeft;
      return this.showToday && tl >= 0 && tl <= 100;
    },

    /* ── task CRUD ────────────────────────── */
    openAdd() {
      const today = _dateStr(new Date());
      const next  = _dateStr(_addDays(new Date(), 7));
      this.editId = null;
      this.form   = { name: '', startDate: today, endDate: next, color: 'indigo', progress: 0, group: '', note: '' };
      this.showForm = true;
      this.$nextTick(() => this.$refs.gFormName?.focus());
    },

    openEdit(task) {
      this.editId = task.id;
      this.form   = { name: task.name, startDate: task.startDate, endDate: task.endDate, color: task.color, progress: task.progress, group: task.group || '', note: task.note || '' };
      this.showForm = true;
      this.$nextTick(() => this.$refs.gFormName?.focus());
    },

    saveForm() {
      if (!this.form.name.trim() || !this.form.startDate || !this.form.endDate) return;
      if (this.editId !== null) {
        const idx = this.tasks.findIndex(t => t.id === this.editId);
        if (idx !== -1) this.tasks[idx] = { ...this.tasks[idx], ...this.form, name: this.form.name.trim() };
      } else {
        this.tasks.push({ id: _gId++, ...this.form, name: this.form.name.trim() });
      }
      this.showForm = false;
      this.editId   = null;
    },

    deleteTask(id) {
      this.tasks = this.tasks.filter(t => t.id !== id);
    },

    clearAll() {
      if (!confirm('Clear all tasks?')) return;
      this.tasks = [];
    },

    /* ── drag reorder ─────────────────────── */
    dragStart(id) { this.dragId = id; },
    dragEnter(id) { if (id !== this.dragId) this.dragOver = id; },
    dragLeave()   { this.dragOver = null; },
    dragEnd()     { this.dragId = null; this.dragOver = null; },
    drop(targetId) {
      if (!this.dragId || this.dragId === targetId) return;
      const from = this.tasks.findIndex(t => t.id === this.dragId);
      const to   = this.tasks.findIndex(t => t.id === targetId);
      if (from === -1 || to === -1) return;
      const copy = [...this.tasks];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      this.tasks   = copy;
      this.dragOver = null;
    },

    /* ── helpers ──────────────────────────── */
    colorHex(id) {
      return GANTT_COLORS.find(c => c.id === id)?.hex || '#6366f1';
    },

    formatDate(str) {
      if (!str) return '';
      try { return _parseDate(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
      catch (_) { return str; }
    },

    taskDuration(task) {
      const s = _parseDate(task.startDate);
      const e = _parseDate(task.endDate);
      return Math.max(1, _diffDays(s, e)) + ' days';
    },

    /* ── JSON ─────────────────────────────── */
    async copyJson() {
      const d = JSON.stringify({ title: this.title, subtitle: this.subtitle, tasks: this.tasks }, null, 2);
      try { await navigator.clipboard.writeText(d); this._toast('JSON copied!'); } catch (_) {}
    },

    importJson() {
      const raw = prompt('Paste Gantt JSON:');
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.tasks) {
          this.tasks    = d.tasks.map(t => ({ ...t, id: _gId++ }));
          this.title    = d.title    || this.title;
          this.subtitle = d.subtitle || '';
          this._toast('Imported!');
        }
      } catch (_) { this._toast('Invalid JSON'); }
    },

    /* ── Export ───────────────────────────── */
    async exportPng() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.ganttCanvas;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const link = document.createElement('a');
        link.download = (this.title || 'gantt-chart') + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        this._toast('PNG downloaded!');
      } catch (e) { this._toast('Export failed'); }
      finally { this.exporting = false; }
    },

    async exportPdf() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.ganttCanvas;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save((this.title || 'gantt-chart') + '.pdf');
        this._toast('PDF downloaded!');
      } catch (e) { this._toast('Export failed'); }
      finally { this.exporting = false; }
    },

    _toast(msg) {
      this.toast = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => (this.toast = ''), 2200);
    },
  };
}
