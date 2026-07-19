/* ── CSS Shape Generator — Alpine component ── */

const SG_SHAPES = [
  // Basic
  { id: 'circle',        label: 'Circle',        cat: 'basic',   sq: true  },
  { id: 'ellipse',       label: 'Ellipse',        cat: 'basic',   sq: false },
  { id: 'pill',          label: 'Pill',           cat: 'basic',   sq: false },
  { id: 'square',        label: 'Square',         cat: 'basic',   sq: true  },
  { id: 'rectangle',     label: 'Rectangle',      cat: 'basic',   sq: false },
  { id: 'rounded',       label: 'Rounded Rect',   cat: 'basic',   sq: false, hasRadius: true },
  // Polygons
  { id: 'diamond',       label: 'Diamond',        cat: 'polygon', sq: true  },
  { id: 'tri-up',        label: 'Triangle ↑',     cat: 'polygon', sq: false },
  { id: 'tri-down',      label: 'Triangle ↓',     cat: 'polygon', sq: false },
  { id: 'pentagon',      label: 'Pentagon',       cat: 'polygon', sq: true  },
  { id: 'hexagon',       label: 'Hexagon',        cat: 'polygon', sq: true  },
  { id: 'octagon',       label: 'Octagon',        cat: 'polygon', sq: true  },
  { id: 'trapezoid',     label: 'Trapezoid',      cat: 'polygon', sq: false },
  { id: 'parallelogram', label: 'Parallelogram',  cat: 'polygon', sq: false },
  // Stars
  { id: 'star4',         label: 'Star 4pt',       cat: 'star',    sq: true  },
  { id: 'star5',         label: 'Star 5pt',       cat: 'star',    sq: true  },
  { id: 'star6',         label: 'Star 6pt',       cat: 'star',    sq: true  },
  // Symbols
  { id: 'cross',         label: 'Cross',          cat: 'symbol',  sq: true  },
  { id: 'arrow-r',       label: 'Arrow →',        cat: 'symbol',  sq: false },
  { id: 'chevron-r',     label: 'Chevron →',      cat: 'symbol',  sq: false },
  { id: 'tag',           label: 'Tag',            cat: 'symbol',  sq: false },
  { id: 'heart',         label: 'Heart',          cat: 'symbol',  sq: true  },
];

const SG_COLOR_PRESETS = [
  '#f43f5e','#f97316','#eab308','#22c55e','#14b8a6',
  '#0ea5e9','#6366f1','#a855f7','#ec4899','#64748b',
];

function cssShapeApp() {
  return {
    shape:        'circle',
    color:        '#f43f5e',
    width:        140,
    height:       140,
    cornerRadius: 16,
    filterCat:    'all',
    copied:       false,

    shapes:       SG_SHAPES,
    colorPresets: SG_COLOR_PRESETS,

    cats: [
      { id: 'all',     label: 'All'      },
      { id: 'basic',   label: 'Basic'    },
      { id: 'polygon', label: 'Polygons' },
      { id: 'star',    label: 'Stars'    },
      { id: 'symbol',  label: 'Symbols'  },
    ],

    get filteredShapes() {
      return this.filterCat === 'all' ? this.shapes : this.shapes.filter(s => s.cat === this.filterCat);
    },

    get currentShape() {
      return this.shapes.find(s => s.id === this.shape) || this.shapes[0];
    },

    selectShape(id) {
      this.shape = id;
      const s = this.shapes.find(sh => sh.id === id);
      if (s?.sq) this.height = this.width;
    },

    /* Returns Alpine style-object (camelCase) for the given shape id */
    _styleProps(id, cornerRadius) {
      const r = cornerRadius ?? this.cornerRadius;
      switch (id) {
        case 'circle':
        case 'ellipse':       return { borderRadius: '50%' };
        case 'pill':          return { borderRadius: '9999px' };
        case 'square':
        case 'rectangle':     return {};
        case 'rounded':       return { borderRadius: r + 'px' };
        case 'diamond':       return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
        case 'tri-up':        return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
        case 'tri-down':      return { clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' };
        case 'pentagon':      return { clipPath: 'polygon(50% 0%, 98% 35%, 79% 91%, 21% 91%, 2% 35%)' };
        case 'hexagon':       return { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' };
        case 'octagon':       return { clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' };
        case 'trapezoid':     return { clipPath: 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)' };
        case 'parallelogram': return { clipPath: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)' };
        case 'star4':         return { clipPath: 'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)' };
        case 'star5':         return { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' };
        case 'star6':         return { clipPath: 'polygon(50% 0%, 63% 28%, 93% 25%, 75% 50%, 93% 75%, 63% 72%, 50% 100%, 37% 72%, 7% 75%, 25% 50%, 7% 25%, 37% 28%)' };
        case 'cross':         return { clipPath: 'polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)' };
        case 'arrow-r':       return { clipPath: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)' };
        case 'chevron-r':     return { clipPath: 'polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)' };
        case 'tag':           return { clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)' };
        case 'heart':         return { clipPath: 'polygon(50% 30%, 61% 22%, 74% 18%, 85% 24%, 91% 35%, 90% 47%, 83% 59%, 73% 70%, 60% 79%, 50% 86%, 40% 79%, 27% 70%, 17% 59%, 10% 47%, 9% 35%, 15% 24%, 26% 18%, 39% 22%)' };
        default:              return {};
      }
    },

    /* Style for mini shape thumbnails in the picker */
    miniStyle(id) {
      const p    = this._styleProps(id);
      const wide = ['pill','rectangle','rounded','trapezoid','parallelogram','arrow-r','chevron-r','tag'].includes(id);
      const w    = wide ? 44 : 30;
      const h    = ['tri-up','tri-down'].includes(id) ? 24 : (wide ? 18 : 30);
      return { width: w + 'px', height: h + 'px', background: this.color, flexShrink: '0', ...p };
    },

    get previewStyle() {
      return {
        width:      this.width  + 'px',
        height:     this.height + 'px',
        background: this.color,
        transition: 'all .15s',
        ...this._styleProps(this.shape),
      };
    },

    get cssCode() {
      const p     = this._styleProps(this.shape);
      const lines = ['.shape {'];
      lines.push(`  width: ${this.width}px;`);
      lines.push(`  height: ${this.height}px;`);
      lines.push(`  background: ${this.color};`);
      if (p.borderRadius) lines.push(`  border-radius: ${p.borderRadius};`);
      if (p.clipPath)     lines.push(`  clip-path: ${p.clipPath};`);
      lines.push('}');
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
