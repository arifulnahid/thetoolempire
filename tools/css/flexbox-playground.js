/* ── Flexbox Playground — Alpine component ── */

const FP_DIR_OPTS = [
  { val: 'row',            label: 'row'     },
  { val: 'row-reverse',    label: 'row-rev' },
  { val: 'column',         label: 'column'  },
  { val: 'column-reverse', label: 'col-rev' },
];

const FP_WRAP_OPTS = [
  { val: 'nowrap',       label: 'nowrap'   },
  { val: 'wrap',         label: 'wrap'     },
  { val: 'wrap-reverse', label: 'wrap-rev' },
];

const FP_JC_OPTS = [
  { val: 'flex-start',    label: 'start'   },
  { val: 'flex-end',      label: 'end'     },
  { val: 'center',        label: 'center'  },
  { val: 'space-between', label: 'between' },
  { val: 'space-around',  label: 'around'  },
  { val: 'space-evenly',  label: 'evenly'  },
];

const FP_AI_OPTS = [
  { val: 'flex-start', label: 'start'    },
  { val: 'flex-end',   label: 'end'      },
  { val: 'center',     label: 'center'   },
  { val: 'stretch',    label: 'stretch'  },
  { val: 'baseline',   label: 'baseline' },
];

const FP_AC_OPTS = [
  { val: 'normal',        label: 'normal'  },
  { val: 'flex-start',    label: 'start'   },
  { val: 'flex-end',      label: 'end'     },
  { val: 'center',        label: 'center'  },
  { val: 'space-between', label: 'between' },
  { val: 'space-around',  label: 'around'  },
  { val: 'stretch',       label: 'stretch' },
];

const FP_AS_OPTS = [
  { val: 'auto',       label: 'auto'     },
  { val: 'flex-start', label: 'start'    },
  { val: 'flex-end',   label: 'end'      },
  { val: 'center',     label: 'center'   },
  { val: 'stretch',    label: 'stretch'  },
  { val: 'baseline',   label: 'baseline' },
];

const FP_COLORS = ['#6366f1','#f97316','#10b981','#f43f5e','#06b6d4','#eab308','#ec4899','#a855f7'];

const FP_BASIS_PRESETS = ['auto','0','25%','50%','100px','150px','200px'];

function flexboxPlaygroundApp() {
  return {
    // Container
    direction:      'row',
    wrap:           'nowrap',
    justifyContent: 'flex-start',
    alignItems:     'stretch',
    alignContent:   'normal',
    rowGap:         8,
    colGap:         8,
    containerH:     320,

    // Items
    items: [
      { id: 1, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0, customW: null, customH: null },
      { id: 2, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0, customW: null, customH: null },
      { id: 3, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0, customW: null, customH: null },
    ],
    _nextId:    4,
    selectedId: null,

    copied: false,

    // Exposed option arrays
    dirOpts:  FP_DIR_OPTS,
    wrapOpts: FP_WRAP_OPTS,
    jcOpts:   FP_JC_OPTS,
    aiOpts:   FP_AI_OPTS,
    acOpts:   FP_AC_OPTS,
    asOpts:   FP_AS_OPTS,
    colors:   FP_COLORS,
    basisPresets: FP_BASIS_PRESETS,

    get selectedItem() {
      return this.selectedId !== null ? this.items.find(it => it.id === this.selectedId) ?? null : null;
    },

    itemColor(item) {
      const idx = this.items.indexOf(item);
      return FP_COLORS[idx % FP_COLORS.length];
    },

    get containerStyle() {
      return {
        display:        'flex',
        flexDirection:  this.direction,
        flexWrap:       this.wrap,
        justifyContent: this.justifyContent,
        alignItems:     this.alignItems,
        alignContent:   this.alignContent,
        gap:            `${this.rowGap}px ${this.colGap}px`,
        height:         this.containerH + 'px',
        width:          '100%',
      };
    },

    itemStyle(item) {
      const style = {
        flexGrow:   String(item.flexGrow),
        flexShrink: String(item.flexShrink),
        flexBasis:  item.flexBasis,
        alignSelf:  item.alignSelf,
        order:      String(item.order),
        background: this.itemColor(item),
        outline:    this.selectedId === item.id
                      ? `3px solid #fff`
                      : 'none',
        outlineOffset: '2px',
        boxShadow:  this.selectedId === item.id
                      ? `0 0 0 5px ${this.itemColor(item)}88`
                      : 'none',
      };
      if (item.customW !== null) style.width  = item.customW  + 'px';
      if (item.customH !== null) style.height = item.customH + 'px';
      return style;
    },

    selectItem(id) {
      this.selectedId = this.selectedId === id ? null : id;
    },

    addItem() {
      if (this.items.length >= 8) return;
      this.items.push({
        id: this._nextId++,
        flexGrow: 0, flexShrink: 1, flexBasis: 'auto',
        alignSelf: 'auto', order: 0, customW: null, customH: null,
      });
    },

    removeSelected() {
      if (!this.selectedId || this.items.length <= 1) return;
      this.items = this.items.filter(it => it.id !== this.selectedId);
      this.selectedId = null;
    },

    resetAll() {
      this.direction      = 'row';
      this.wrap           = 'nowrap';
      this.justifyContent = 'flex-start';
      this.alignItems     = 'stretch';
      this.alignContent   = 'normal';
      this.rowGap         = 8;
      this.colGap         = 8;
      this.containerH     = 320;
      this.items = [
        { id: 1, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0, customW: null, customH: null },
        { id: 2, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0, customW: null, customH: null },
        { id: 3, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0, customW: null, customH: null },
      ];
      this._nextId    = 4;
      this.selectedId = null;
    },

    enableCustomW() {
      if (this.selectedItem) this.selectedItem.customW = 100;
    },
    disableCustomW() {
      if (this.selectedItem) this.selectedItem.customW = null;
    },
    enableCustomH() {
      if (this.selectedItem) this.selectedItem.customH = 100;
    },
    disableCustomH() {
      if (this.selectedItem) this.selectedItem.customH = null;
    },

    get containerCSS() {
      const lines = ['.flex-container {', '  display: flex;'];
      lines.push(`  flex-direction: ${this.direction};`);
      lines.push(`  flex-wrap: ${this.wrap};`);
      lines.push(`  justify-content: ${this.justifyContent};`);
      lines.push(`  align-items: ${this.alignItems};`);
      if (this.wrap !== 'nowrap') {
        lines.push(`  align-content: ${this.alignContent};`);
      }
      if (this.rowGap === this.colGap) {
        lines.push(`  gap: ${this.rowGap}px;`);
      } else {
        lines.push(`  gap: ${this.rowGap}px ${this.colGap}px;`);
      }
      lines.push('}');
      return lines.join('\n');
    },

    itemCSS(item) {
      const idx   = this.items.indexOf(item) + 1;
      const lines = [`.flex-item:nth-child(${idx}) {`];
      const flex  = `${item.flexGrow} ${item.flexShrink} ${item.flexBasis}`;
      lines.push(`  flex: ${flex};`);
      if (item.alignSelf !== 'auto') lines.push(`  align-self: ${item.alignSelf};`);
      if (item.order !== 0)          lines.push(`  order: ${item.order};`);
      if (item.customW !== null)     lines.push(`  width: ${item.customW}px;`);
      if (item.customH !== null)     lines.push(`  height: ${item.customH}px;`);
      lines.push('}');
      return lines.join('\n');
    },

    get cssCode() {
      let out = this.containerCSS;
      if (this.selectedItem) {
        out += '\n\n/* Selected item */\n' + this.itemCSS(this.selectedItem);
      }
      return out;
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
