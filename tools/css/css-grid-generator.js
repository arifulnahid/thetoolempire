/* ── CSS Grid Generator — Alpine component ── */

const GRID_ITEM_COLORS = [
  '#10b981','#f97316','#8b5cf6','#f43f5e',
  '#06b6d4','#eab308','#ec4899','#3b82f6',
];

function cssGridApp() {
  return {
    cols: 3,
    rows: 3,
    colGap: 16,
    rowGap: 16,

    useCustomCols: false,
    useCustomRows: false,
    colSizes: ['1fr', '1fr', '1fr'],
    rowSizes: ['1fr', '1fr', '1fr'],

    items: [],
    _nextId: 1,
    _colorIdx: 0,

    placing: false,
    placeStart: null,
    placeHover: null,

    copied: false,

    init() {
      this.$watch('cols', v => this.updateCols(v));
      this.$watch('rows', v => this.updateRows(v));
    },

    updateCols(n) {
      const len = this.colSizes.length;
      if (n > len) {
        for (let i = len; i < n; i++) this.colSizes.push('1fr');
      } else {
        this.colSizes = this.colSizes.slice(0, n);
      }
      this.items = this.items.filter(it => it.colStart <= n && it.colEnd <= n + 1);
    },

    updateRows(n) {
      const len = this.rowSizes.length;
      if (n > len) {
        for (let i = len; i < n; i++) this.rowSizes.push('1fr');
      } else {
        this.rowSizes = this.rowSizes.slice(0, n);
      }
      this.items = this.items.filter(it => it.rowStart <= n && it.rowEnd <= n + 1);
    },

    get colTemplate() {
      if (!this.useCustomCols) return `repeat(${this.cols}, 1fr)`;
      return this.colSizes.slice(0, this.cols).join(' ');
    },

    get rowTemplate() {
      if (!this.useCustomRows) return `repeat(${this.rows}, 1fr)`;
      return this.rowSizes.slice(0, this.rows).join(' ');
    },

    get containerStyle() {
      return {
        display:              'grid',
        gridTemplateColumns:  this.colTemplate,
        gridTemplateRows:     this.rowTemplate,
        gap:                  `${this.rowGap}px ${this.colGap}px`,
        width:                '100%',
        height:               '100%',
      };
    },

    get cellList() {
      const cells = [];
      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          cells.push({ col: c, row: r });
        }
      }
      return cells;
    },

    cellStyle(c, r) {
      return `grid-column:${c}/${c + 1}; grid-row:${r}/${r + 1}`;
    },

    isDragHighlighted(c, r) {
      if (!this.placing || !this.placeStart || !this.placeHover) return false;
      const c1 = Math.min(this.placeStart.col, this.placeHover.col);
      const c2 = Math.max(this.placeStart.col, this.placeHover.col);
      const r1 = Math.min(this.placeStart.row, this.placeHover.row);
      const r2 = Math.max(this.placeStart.row, this.placeHover.row);
      return c >= c1 && c <= c2 && r >= r1 && r <= r2;
    },

    startCell(c, r) {
      this.placing    = true;
      this.placeStart = { col: c, row: r };
      this.placeHover = { col: c, row: r };
    },

    hoverCell(c, r) {
      if (this.placing) this.placeHover = { col: c, row: r };
    },

    endCell(c, r) {
      if (!this.placing || !this.placeStart) return;
      this.placeHover = { col: c, row: r };
      const c1 = Math.min(this.placeStart.col, this.placeHover.col);
      const c2 = Math.max(this.placeStart.col, this.placeHover.col) + 1;
      const r1 = Math.min(this.placeStart.row, this.placeHover.row);
      const r2 = Math.max(this.placeStart.row, this.placeHover.row) + 1;
      const color = GRID_ITEM_COLORS[this._colorIdx % GRID_ITEM_COLORS.length];
      const n     = this._nextId++;
      this._colorIdx++;
      this.items.push({ id: n, colStart: c1, colEnd: c2, rowStart: r1, rowEnd: r2, color, label: `Item ${n}` });
      this.placing    = false;
      this.placeStart = null;
      this.placeHover = null;
    },

    cancelPlace() {
      this.placing    = false;
      this.placeStart = null;
      this.placeHover = null;
    },

    removeItem(id) {
      this.items = this.items.filter(it => it.id !== id);
    },

    clearItems() {
      this.items      = [];
      this._nextId    = 1;
      this._colorIdx  = 0;
    },

    itemStyle(item) {
      return {
        gridColumn:     `${item.colStart} / ${item.colEnd}`,
        gridRow:        `${item.rowStart} / ${item.rowEnd}`,
        background:     item.color + 'cc',
        border:         `2px solid ${item.color}`,
        borderRadius:   '6px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       '.74rem',
        fontWeight:     '700',
        color:          '#fff',
        pointerEvents:  'none',
        zIndex:         '5',
        textShadow:     '0 1px 2px rgba(0,0,0,.4)',
      };
    },

    get cssCode() {
      const lines = [];
      lines.push('.grid-container {');
      lines.push('  display: grid;');
      lines.push(`  grid-template-columns: ${this.colTemplate};`);
      lines.push(`  grid-template-rows: ${this.rowTemplate};`);
      if (this.colGap === this.rowGap) {
        lines.push(`  gap: ${this.colGap}px;`);
      } else {
        lines.push(`  gap: ${this.rowGap}px ${this.colGap}px;`);
      }
      lines.push('}');

      if (this.items.length > 0) {
        lines.push('');
        lines.push('/* Grid items */');
        this.items.forEach((item, i) => {
          lines.push(`.item-${i + 1} {`);
          lines.push(`  grid-column: ${item.colStart} / ${item.colEnd};`);
          lines.push(`  grid-row: ${item.rowStart} / ${item.rowEnd};`);
          lines.push('}');
          if (i < this.items.length - 1) lines.push('');
        });
      }

      return lines.join('\n');
    },

    async copyCSS() {
      try {
        await navigator.clipboard.writeText(this.cssCode);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch (_) {}
    },
  };
}
