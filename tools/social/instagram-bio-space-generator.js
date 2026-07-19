/* Instagram Bio Space Generator */

/* Braille Pattern Blank U+2800 — invisible on Instagram, holds blank lines */
const IB_SEP = '⠀';

const IB_SYMBOL_GROUPS = [
  { group: 'Bullets',  chars: ['•', '●', '○', '◆', '◇', '✦', '✧', '★', '☆', '▸'] },
  { group: 'Dividers', chars: ['|', '·', '–', '—', '/', '×', '»', '«', '∙', '⁕'] },
  { group: 'Arrows',   chars: ['→', '←', '↓', '↑', '►', '▶', '›', '»', '⟩', '⇒'] },
  { group: 'Decor',    chars: ['✨', '💫', '🌟', '⚡', '🔥', '💎', '🌸', '🌿', '🦋', '🫶'] },
  { group: 'Lines',    chars: ['───', '—·—', '✦·✦', '· · ·', '- - -', '✿·✿', '★ ★', '◇·◇'] },
];

const IB_TEMPLATES = [
  {
    label: '🎨 Creator',
    lines: [
      { text: '🎨 [Your Title]', spaceAfter: 0 },
      { text: '📍 [Your City]', spaceAfter: 0 },
      { text: '✨ [What you create]', spaceAfter: 1 },
      { text: '👇 [Link / CTA]', spaceAfter: 0 },
    ],
  },
  {
    label: '💼 Business',
    lines: [
      { text: '💼 [What your business does]', spaceAfter: 1 },
      { text: '👥 Helping [who] achieve [what]', spaceAfter: 1 },
      { text: '📩 [contact@yourbrand.com]', spaceAfter: 0 },
    ],
  },
  {
    label: '🌿 Minimal',
    lines: [
      { text: '[Your Name or Title]', spaceAfter: 1 },
      { text: '[One line that describes you]', spaceAfter: 1 },
      { text: '↓ [Link or CTA here]', spaceAfter: 0 },
    ],
  },
  {
    label: '⭐ Influencer',
    lines: [
      { text: '✨ [Niche] content creator', spaceAfter: 0 },
      { text: '📍 [Location]', spaceAfter: 1 },
      { text: '📩 [collab@email.com]', spaceAfter: 0 },
      { text: '👇 New [post/video] every [day]', spaceAfter: 0 },
    ],
  },
  {
    label: '🏠 Personal',
    lines: [
      { text: '[Your Name] 🌟', spaceAfter: 0 },
      { text: '[Hobby 1] · [Hobby 2] · [Hobby 3]', spaceAfter: 1 },
      { text: '📍 [City, Country]', spaceAfter: 0 },
    ],
  },
];

function igBioSpaceApp() {
  return {
    lines: [
      { id: 1, text: '', spaceAfter: 0 },
      { id: 2, text: '', spaceAfter: 0 },
      { id: 3, text: '', spaceAfter: 0 },
    ],
    _nextId:  4,
    _focused: 0, // last focused line index (not reactive, just tracked)

    copied:        false,
    showSymbols:   true,
    showTemplates: false,
    activeGroup:   0,

    symbols:   IB_SYMBOL_GROUPS,
    templates: IB_TEMPLATES,

    /* ── computed ── */
    get bioOutput() {
      if (!this.lines.length) return '';
      let out = this.lines[0].text;
      for (let i = 1; i < this.lines.length; i++) {
        const prev = this.lines[i - 1];
        if (prev.spaceAfter > 0) {
          out += ('\n' + IB_SEP).repeat(prev.spaceAfter);
        }
        out += '\n' + this.lines[i].text;
      }
      return out;
    },
    get charCount()     { return this.bioOutput.length; },
    get charOverLimit() { return this.charCount > 150; },
    get charNearLimit() { return this.charCount > 120 && !this.charOverLimit; },
    get charPct()       { return Math.min(100, (this.charCount / 150) * 100); },

    /* ── line management ── */
    addLine() {
      this.lines.push({ id: this._nextId++, text: '', spaceAfter: 0 });
      this.$nextTick(() => {
        const inputs = document.querySelectorAll('.bio-line-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      });
    },
    removeLine(i) {
      if (this.lines.length <= 1) return;
      this.lines.splice(i, 1);
      if (this._focused >= this.lines.length) this._focused = this.lines.length - 1;
    },
    moveLine(i, dir) {
      const j = i + dir;
      if (j < 0 || j >= this.lines.length) return;
      const [moved] = this.lines.splice(i, 1);
      this.lines.splice(j, 0, moved);
      this._focused = j;
    },

    /* ── symbol insertion ── */
    onLineFocus(i) { this._focused = i; },
    insertSymbol(sym) {
      const inputs = document.querySelectorAll('.bio-line-input');
      const ta = inputs[this._focused];
      if (!ta) return;
      const pos = ta.selectionStart;
      this.lines[this._focused].text =
        this.lines[this._focused].text.slice(0, pos) +
        sym +
        this.lines[this._focused].text.slice(pos);
      this.$nextTick(() => {
        ta.selectionStart = ta.selectionEnd = pos + [...sym].length;
        ta.focus();
      });
    },

    /* ── templates ── */
    applyTemplate(t) {
      this.lines = t.lines.map(l => ({ id: this._nextId++, ...l }));
      this.showTemplates = false;
    },

    /* ── copy & clear ── */
    async copyBio() {
      try {
        await navigator.clipboard.writeText(this.bioOutput);
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      } catch (_) {}
    },
    clear() {
      this.lines = [
        { id: this._nextId++, text: '', spaceAfter: 0 },
        { id: this._nextId++, text: '', spaceAfter: 0 },
        { id: this._nextId++, text: '', spaceAfter: 0 },
      ];
      this._focused = 0;
    },
  };
}
