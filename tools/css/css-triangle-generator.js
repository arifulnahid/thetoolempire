/* ── CSS Triangle Generator — Alpine component ── */

function cssTriangleApp() {
  return {
    direction: 'up',
    color:     '#f97316',
    width:     80,
    height:    80,
    copied:    false,

    /* 3×3 grid positions: [col, row] (0-indexed) */
    dirGrid: [
      { id: 'top-left',     col: 0, row: 0, arrow: '↖' },
      { id: 'up',           col: 1, row: 0, arrow: '↑' },
      { id: 'top-right',    col: 2, row: 0, arrow: '↗' },
      { id: 'left',         col: 0, row: 1, arrow: '←' },
      { id: 'right',        col: 2, row: 1, arrow: '→' },
      { id: 'bottom-left',  col: 0, row: 2, arrow: '↙' },
      { id: 'down',         col: 1, row: 2, arrow: '↓' },
      { id: 'bottom-right', col: 2, row: 2, arrow: '↘' },
    ],

    get previewStyle() {
      const T = 'transparent';
      const hw = Math.round(this.width  / 2) + 'px';
      const hh = Math.round(this.height / 2) + 'px';
      const w  = this.width  + 'px';
      const h  = this.height + 'px';
      const c  = this.color;
      const base = { width: '0px', height: '0px' };

      switch (this.direction) {
        case 'up':
          return { ...base, borderLeft: `${hw} solid ${T}`, borderRight: `${hw} solid ${T}`, borderBottom: `${h} solid ${c}` };
        case 'down':
          return { ...base, borderLeft: `${hw} solid ${T}`, borderRight: `${hw} solid ${T}`, borderTop: `${h} solid ${c}` };
        case 'left':
          return { ...base, borderTop: `${hh} solid ${T}`, borderBottom: `${hh} solid ${T}`, borderRight: `${w} solid ${c}` };
        case 'right':
          return { ...base, borderTop: `${hh} solid ${T}`, borderBottom: `${hh} solid ${T}`, borderLeft: `${w} solid ${c}` };
        case 'top-left':
          return { ...base, borderTop: `${h} solid ${c}`, borderRight: `${w} solid ${T}` };
        case 'top-right':
          return { ...base, borderTop: `${h} solid ${c}`, borderLeft: `${w} solid ${T}` };
        case 'bottom-left':
          return { ...base, borderBottom: `${h} solid ${c}`, borderRight: `${w} solid ${T}` };
        case 'bottom-right':
          return { ...base, borderBottom: `${h} solid ${c}`, borderLeft: `${w} solid ${T}` };
      }
      return base;
    },

    get cssCode() {
      const T  = 'transparent';
      const hw = Math.round(this.width  / 2);
      const hh = Math.round(this.height / 2);
      const w  = this.width;
      const h  = this.height;
      const c  = this.color;
      const lines = ['.triangle {', '  width: 0;', '  height: 0;'];

      switch (this.direction) {
        case 'up':
          lines.push(`  border-left: ${hw}px solid ${T};`, `  border-right: ${hw}px solid ${T};`, `  border-bottom: ${h}px solid ${c};`); break;
        case 'down':
          lines.push(`  border-left: ${hw}px solid ${T};`, `  border-right: ${hw}px solid ${T};`, `  border-top: ${h}px solid ${c};`); break;
        case 'left':
          lines.push(`  border-top: ${hh}px solid ${T};`, `  border-bottom: ${hh}px solid ${T};`, `  border-right: ${w}px solid ${c};`); break;
        case 'right':
          lines.push(`  border-top: ${hh}px solid ${T};`, `  border-bottom: ${hh}px solid ${T};`, `  border-left: ${w}px solid ${c};`); break;
        case 'top-left':
          lines.push(`  border-top: ${h}px solid ${c};`, `  border-right: ${w}px solid ${T};`); break;
        case 'top-right':
          lines.push(`  border-top: ${h}px solid ${c};`, `  border-left: ${w}px solid ${T};`); break;
        case 'bottom-left':
          lines.push(`  border-bottom: ${h}px solid ${c};`, `  border-right: ${w}px solid ${T};`); break;
        case 'bottom-right':
          lines.push(`  border-bottom: ${h}px solid ${c};`, `  border-left: ${w}px solid ${T};`); break;
      }
      lines.push('}');
      return lines.join('\n');
    },

    get humanLabel() {
      return this.direction.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
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
