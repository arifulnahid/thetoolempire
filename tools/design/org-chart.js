/* ── Org Chart Maker — Alpine component ── */

const OC_COLORS = [
  { id: 'emerald', hex: '#10b981' },
  { id: 'blue',    hex: '#3b82f6' },
  { id: 'violet',  hex: '#8b5cf6' },
  { id: 'rose',    hex: '#f43f5e' },
  { id: 'amber',   hex: '#f59e0b' },
  { id: 'cyan',    hex: '#06b6d4' },
  { id: 'orange',  hex: '#f97316' },
  { id: 'slate',   hex: '#64748b' },
];

const NODE_W = 172;
const NODE_H = 82;
const H_GAP  = 36;
const V_GAP  = 64;
const PAD    = 30;   /* canvas padding */

let _ocId = 1;

function _initials(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function orgChartApp() {
  return {
    title:    'Organization Chart',
    subtitle: '',
    nodes:    [],
    colors:   OC_COLORS,

    /* ── view ─────────────────────────────── */
    zoom:   1,
    minZoom: 0.3,
    maxZoom: 2,

    /* ── selection ───────────────────────── */
    selectedId: null,

    /* ── form ────────────────────────────── */
    showForm:      false,
    editId:        null,
    defaultParent: null,
    form: { name: '', role: '', dept: '', color: 'emerald', parentId: null },

    /* ── export ──────────────────────────── */
    exporting: false,
    toast: '',

    /* ── init ────────────────────────────── */
    init() {
      const saved = localStorage.getItem('orgchart_data');
      if (saved) {
        try {
          const d = JSON.parse(saved);
          this.title    = d.title    ?? this.title;
          this.subtitle = d.subtitle ?? '';
          this.nodes    = d.nodes    ?? [];
          this.zoom     = d.zoom     ?? 1;
        } catch (_) {}
      }
      if (!this.nodes.length) this._loadSample();
      this.$watch('nodes',    () => this._save(), { deep: true });
      this.$watch('title',    () => this._save());
      this.$watch('subtitle', () => this._save());
      this.$watch('zoom',     () => this._save());
    },

    _save() {
      localStorage.setItem('orgchart_data', JSON.stringify({
        title: this.title, subtitle: this.subtitle, nodes: this.nodes, zoom: this.zoom,
      }));
    },

    _loadSample() {
      this.title    = 'Acme Corp';
      this.subtitle = 'Q3 2025';
      const n = (name, role, dept, color, parentId) => ({
        id: _ocId++, name, role, dept, color, parentId,
      });
      this.nodes = [
        n('Sarah Chen',     'CEO',                  'Executive',  'emerald', null),
        n('Marcus Rivera',  'CTO',                  'Technology', 'blue',    1),
        n('Lena Fischer',   'CFO',                  'Finance',    'violet',  1),
        n('James Okafor',   'CMO',                  'Marketing',  'rose',    1),
        n('Priya Nair',     'VP Engineering',       'Technology', 'blue',    2),
        n('Tom Schultz',    'VP Infrastructure',    'Technology', 'blue',    2),
        n('Ana Costa',      'Head of Finance',      'Finance',    'violet',  3),
        n('Eli Bergmann',   'Head of Growth',       'Marketing',  'rose',    4),
        n('Yuki Tanaka',    'Lead Engineer',        'Technology', 'cyan',    5),
        n('Omar Hassan',    'Senior Engineer',      'Technology', 'cyan',    5),
        n('Fatima Al-Said', 'Finance Manager',      'Finance',    'amber',   7),
      ];
    },

    /* ── computed tree layout ─────────────── */
    get layoutData() {
      if (!this.nodes.length) return { nodes: [], lines: [], width: 600, height: 260 };

      /* build adjacency map */
      const map = {};
      this.nodes.forEach(n => (map[n.id] = { ...n, children: [], x: 0, y: 0 }));

      const roots = [];
      this.nodes.forEach(n => {
        if (n.parentId !== null && map[n.parentId]) {
          map[n.parentId].children.push(map[n.id]);
        } else {
          roots.push(map[n.id]);
        }
      });

      /* subtree width */
      function sw(node) {
        if (!node.children.length) return NODE_W;
        const total = node.children.reduce((s, c) => s + sw(c), 0) + H_GAP * (node.children.length - 1);
        return Math.max(NODE_W, total);
      }

      const positioned = [];
      const lines = [];

      function place(node, x, y) {
        const nw = sw(node);
        node.x = x + (nw - NODE_W) / 2;
        node.y = y;
        positioned.push(node);
        if (node.children.length) {
          const midY = y + NODE_H + V_GAP / 2;
          let cx = x;
          node.children.forEach(child => {
            const csw = sw(child);
            place(child, cx, y + NODE_H + V_GAP);
            /* elbow connector */
            const x1 = node.x + NODE_W / 2;
            const y1 = node.y + NODE_H;
            const x2 = child.x + NODE_W / 2;
            const y2 = child.y;
            lines.push({ x1, y1, x2, y2, mid: midY });
            cx += csw + H_GAP;
          });
        }
      }

      let totalW = 0;
      roots.forEach(root => {
        place(root, PAD + totalW, PAD);
        totalW += sw(root) + H_GAP;
      });

      const maxX = Math.max(...positioned.map(n => n.x + NODE_W));
      const maxY = Math.max(...positioned.map(n => n.y + NODE_H));

      return {
        nodes: positioned,
        lines,
        width:  maxX + PAD,
        height: maxY + PAD,
      };
    },

    /* ── helpers ──────────────────────────── */
    colorHex(id) { return OC_COLORS.find(c => c.id === id)?.hex || '#10b981'; },
    initials(name) { return _initials(name); },

    get selectedNode() { return this.nodes.find(n => n.id === this.selectedId) || null; },

    layoutNode(id) { return this.layoutData.nodes.find(n => n.id === id); },

    parentOptions(excludeId) {
      return this.nodes.filter(n => n.id !== excludeId);
    },

    /* ── selection ───────────────────────── */
    select(id) {
      this.selectedId = this.selectedId === id ? null : id;
    },

    deselect() { this.selectedId = null; },

    /* ── CRUD ────────────────────────────── */
    openAddRoot() {
      this.editId = null;
      this.form   = { name: '', role: '', dept: '', color: 'emerald', parentId: null };
      this.showForm = true;
      this.$nextTick(() => this.$refs.ocName?.focus());
    },

    openAddChild(parentId) {
      this.editId = null;
      this.form   = { name: '', role: '', dept: '', color: 'emerald', parentId };
      this.showForm = true;
      this.$nextTick(() => this.$refs.ocName?.focus());
    },

    openEdit(node) {
      this.editId = node.id;
      this.form   = { name: node.name, role: node.role || '', dept: node.dept || '', color: node.color || 'emerald', parentId: node.parentId };
      this.showForm = true;
      this.$nextTick(() => this.$refs.ocName?.focus());
    },

    saveForm() {
      if (!this.form.name.trim()) return;
      /* prevent circular parent */
      if (this.editId !== null && this.form.parentId === this.editId) {
        this.form.parentId = null;
      }
      if (this.editId !== null) {
        const idx = this.nodes.findIndex(n => n.id === this.editId);
        if (idx !== -1) {
          this.nodes[idx] = { ...this.nodes[idx], ...this.form, name: this.form.name.trim(), parentId: this.form.parentId === '' ? null : this.form.parentId };
        }
      } else {
        this.nodes.push({ id: _ocId++, ...this.form, name: this.form.name.trim(), parentId: this.form.parentId === '' ? null : this.form.parentId });
      }
      this.showForm = false;
      this.editId   = null;
    },

    deleteNode(id) {
      /* reparent children to deleted node's parent */
      const node = this.nodes.find(n => n.id === id);
      if (!node) return;
      this.nodes = this.nodes
        .map(n => n.parentId === id ? { ...n, parentId: node.parentId } : n)
        .filter(n => n.id !== id);
      if (this.selectedId === id) this.selectedId = null;
    },

    deleteSubtree(id) {
      if (!confirm('Delete this node and all its descendants?')) return;
      const toDelete = new Set();
      const collect = (nodeId) => {
        toDelete.add(nodeId);
        this.nodes.filter(n => n.parentId === nodeId).forEach(c => collect(c.id));
      };
      collect(id);
      this.nodes = this.nodes.filter(n => !toDelete.has(n.id));
      if (toDelete.has(this.selectedId)) this.selectedId = null;
    },

    clearAll() {
      if (!confirm('Clear entire org chart?')) return;
      this.nodes = [];
      this.selectedId = null;
    },

    /* ── zoom ────────────────────────────── */
    zoomIn()  { this.zoom = Math.min(this.maxZoom, +(this.zoom + 0.15).toFixed(2)); },
    zoomOut() { this.zoom = Math.max(this.minZoom, +(this.zoom - 0.15).toFixed(2)); },
    zoomReset() { this.zoom = 1; },
    fitScreen() {
      const wrap = this.$refs.canvasWrap;
      if (!wrap || !this.nodes.length) return;
      const ww = wrap.clientWidth  - 32;
      const wh = wrap.clientHeight - 32;
      const tw = this.layoutData.width;
      const th = this.layoutData.height;
      this.zoom = +Math.min(1, Math.min(ww / tw, wh / th)).toFixed(2);
    },

    /* ── JSON ────────────────────────────── */
    async copyJson() {
      const d = JSON.stringify({ title: this.title, subtitle: this.subtitle, nodes: this.nodes }, null, 2);
      try { await navigator.clipboard.writeText(d); this._toast('JSON copied!'); } catch (_) {}
    },

    importJson() {
      const raw = prompt('Paste org chart JSON:');
      if (!raw) return;
      try {
        const d = JSON.parse(raw);
        if (d.nodes) {
          const idMap = {};
          this.nodes    = d.nodes.map(n => {
            const newId = _ocId++;
            idMap[n.id] = newId;
            return { ...n, id: newId };
          }).map(n => ({ ...n, parentId: n.parentId !== null ? (idMap[n.parentId] ?? null) : null }));
          this.title    = d.title    || this.title;
          this.subtitle = d.subtitle || '';
          this._toast('Imported!');
        }
      } catch (_) { this._toast('Invalid JSON'); }
    },

    /* ── export ──────────────────────────── */
    async exportPng() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.chartRoot;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const a = document.createElement('a');
        a.download = (this.title || 'org-chart') + '.png';
        a.href = canvas.toDataURL('image/png');
        a.click();
        this._toast('PNG downloaded!');
      } catch (_) { this._toast('Export failed'); }
      finally { this.exporting = false; }
    },

    async exportPdf() {
      if (this.exporting) return;
      this.exporting = true;
      await this.$nextTick();
      try {
        const el = this.$refs.chartRoot;
        const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
        const canvas = await html2canvas(el, { backgroundColor: '#0f0f14', scale: 2, useCORS: true, logging: false });
        const { jsPDF } = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
        pdf.save((this.title || 'org-chart') + '.pdf');
        this._toast('PDF downloaded!');
      } catch (_) { this._toast('Export failed'); }
      finally { this.exporting = false; }
    },

    _toast(msg) {
      this.toast = msg;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => (this.toast = ''), 2200);
    },
  };
}
