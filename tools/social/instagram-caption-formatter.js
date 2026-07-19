/* Instagram Caption Formatter */

/* ── Unicode font ranges (Mathematical Sans-Serif family) ── */
const _UB_U  = 0x1D5D4, _UB_L  = 0x1D5EE; // Sans-Serif Bold
const _UI_U  = 0x1D608, _UI_L  = 0x1D622; // Sans-Serif Italic
const _UBI_U = 0x1D63C, _UBI_L = 0x1D656; // Sans-Serif Bold Italic
const _UM_U  = 0x1D670, _UM_L  = 0x1D68A; // Monospace

const _SC_MAP = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',
  k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'q',r:'ʀ',s:'ꜱ',t:'ᴛ',
  u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
};

function _mapFont(text, uOff, lOff) {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90)  out += String.fromCodePoint(uOff + c - 65);
    else if (c >= 97 && c <= 122) out += String.fromCodePoint(lOff + c - 97);
    else out += ch;
  }
  return out;
}

function _transformText(text, style) {
  if (!text) return text;
  switch (style) {
    case 'bold':       return _mapFont(text, _UB_U,  _UB_L);
    case 'italic':     return _mapFont(text, _UI_U,  _UI_L);
    case 'boldital':   return _mapFont(text, _UBI_U, _UBI_L);
    case 'mono':       return _mapFont(text, _UM_U,  _UM_L);
    case 'small_caps': {
      let out = '';
      for (const ch of text) {
        const c = ch.codePointAt(0);
        if (c >= 65 && c <= 90) out += ch; // keep uppercase as-is
        else out += (_SC_MAP[ch.toLowerCase()] || ch);
      }
      return out;
    }
    case 'strike': {
      let out = '';
      for (const ch of text) out += ch + '̶'; // combining long stroke overlay
      return out;
    }
    case 'upper':    return text.toUpperCase();
    case 'lower':    return text.toLowerCase();
    case 'title':    return text.replace(/\b\w/g, c => c.toUpperCase());
    case 'sentence': return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase());
    case 'alt': {
      let out = '', up = true;
      for (const ch of text) {
        if (/[a-zA-Z]/.test(ch)) { out += up ? ch.toUpperCase() : ch.toLowerCase(); up = !up; }
        else out += ch;
      }
      return out;
    }
    default: return text;
  }
}

/* Braille Pattern Blank U+2800 — visually empty on Instagram but prevents blank-line collapse */
const IG_SEP = '⠀';

const IG_CTAS = [
  '💾 Save this for later',
  '👇 Tag someone who needs this',
  '💬 Share your thoughts below',
  '✨ Follow for more content like this',
  '🔗 Link in bio',
  '❤️ Double tap if you agree',
  '🔔 Turn on post notifications',
  '📲 Share this with a friend',
  '👇 What do you think? Comment below',
  '💡 DM me for more info',
];

const IG_TEMPLATES = [
  { label: '📖 Story',        text: "Here's something I've been wanting to share for a while…\n\n[Your story here]\n\nWhat are your thoughts? Drop them below 👇" },
  { label: '🛍️ Product',     text: "✨ Introducing [Product Name] ✨\n\n[Key benefit 1]\n[Key benefit 2]\n[Key benefit 3]\n\n👉 Shop now — link in bio!" },
  { label: '💪 Motivation',   text: '"[Inspiring quote here]"\n\n— [Author]\n\n[Your thoughts on this quote]\n\n💾 Save this for when you need it most' },
  { label: '❓ Engagement',   text: "[Ask your audience a question?]\n\nI personally [your opinion], but I want to hear YOUR take.\n\nComment below 👇 I read every single one." },
  { label: '🎬 Behind Scenes', text: "Taking you behind the scenes today 👀\n\n[Describe what you're showing]\n\nSave this + share with someone who'd find it useful!" },
  { label: '🎉 Announcement', text: "🚨 BIG NEWS 🚨\n\n[Your exciting announcement here]\n\nMore details coming soon — make sure you're following so you don't miss it!" },
];

function igCaptionApp() {
  return {
    caption:       '',
    hashtags:      [],
    hashInput:     '',
    hashMode:      'caption',   // 'caption' | 'comment'

    copied:        false,
    hashCopied:    false,
    fullCopied:    false,

    showFullPreview: false,
    showCTAs:        true,
    showTemplates:   false,

    ctas:      IG_CTAS,
    templates: IG_TEMPLATES,

    /* ── computed ── */
    get hashtagText() {
      return this.hashtags.map(h => '#' + h.replace(/^#+/, '')).join(' ');
    },
    get fullOutput() {
      if (this.hashMode === 'caption' && this.hashtags.length) {
        return this.caption + '\n\n' + this.hashtagText;
      }
      return this.caption;
    },
    get charCount()     { return this.fullOutput.length; },
    get charOverLimit() { return this.charCount > 2200; },
    get charNearLimit() { return this.charCount > 1800 && !this.charOverLimit; },
    get charPct()       { return Math.min(100, (this.charCount / 2200) * 100); },
    get captionHashCount() {
      return (this.caption.match(/#[^\s#]+/g) || []).length;
    },
    get totalHashCount() {
      return this.captionHashCount + (this.hashMode === 'caption' ? this.hashtags.length : 0);
    },
    get hashOverLimit()  { return this.totalHashCount > 30; },
    get hashNearLimit()  { return this.totalHashCount >= 25 && !this.hashOverLimit; },
    get previewShort() {
      const LIMIT = 125;
      if (!this.caption || this.caption.length <= LIMIT) return this.caption;
      const cutAt = this.caption.lastIndexOf(' ', LIMIT) || LIMIT;
      return this.caption.slice(0, cutAt) + '…';
    },
    get previewTruncated() {
      return this.caption.length > 125;
    },

    /* ── text transform ── */
    _withSelection(fn) {
      const ta = this.$refs.ta;
      if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      if (s === e) {
        this.caption = fn(this.caption);
      } else {
        const result = fn(this.caption.slice(s, e));
        this.caption = this.caption.slice(0, s) + result + this.caption.slice(e);
        this.$nextTick(() => {
          ta.selectionStart = s;
          ta.selectionEnd   = s + result.length;
          ta.focus();
        });
      }
    },
    applyStyle(style) { this._withSelection(t => _transformText(t, style)); },

    /* ── line break tools ── */
    fixLineBreaks() {
      /* Replace blank/whitespace-only lines with invisible braille separator */
      this.caption = this.caption.replace(/\n[ \t]*\n+/g, `\n${IG_SEP}\n`);
    },
    insertSeparator() {
      const ta = this.$refs.ta;
      if (!ta) return;
      const pos = ta.selectionStart;
      const ins = `\n${IG_SEP}\n`;
      this.caption = this.caption.slice(0, pos) + ins + this.caption.slice(pos);
      this.$nextTick(() => {
        ta.selectionStart = ta.selectionEnd = pos + ins.length;
        ta.focus();
      });
    },

    /* ── hashtag manager ── */
    onHashKey(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
        e.preventDefault();
        this.addHashtag();
      }
    },
    addHashtag() {
      const raw = this.hashInput.trim();
      if (!raw) return;
      raw.split(/[\s,]+/).forEach(t => {
        t = t.replace(/^#+/, '').trim();
        if (t && !this.hashtags.includes(t)) this.hashtags.push(t);
      });
      this.hashInput = '';
    },
    removeHashtag(i) { this.hashtags.splice(i, 1); },
    clearHashtags()  { this.hashtags = []; },
    extractHashtags() {
      /* Pull hashtags out of the caption text into the hashtag list */
      const found = (this.caption.match(/#[^\s#]+/g) || []).map(h => h.replace(/^#/, ''));
      this.caption = this.caption.replace(/#[^\s#]+/g, '').replace(/[ \t]{2,}/g, ' ').trim();
      found.forEach(h => { if (!this.hashtags.includes(h)) this.hashtags.push(h); });
    },

    /* ── CTAs & templates ── */
    insertCTA(text) {
      const ta = this.$refs.ta;
      const pos = ta ? ta.selectionStart : this.caption.length;
      const before = this.caption.slice(0, pos);
      const after  = this.caption.slice(pos);
      const sep = before && !before.endsWith('\n') ? '\n\n' : '';
      const tail = after && !after.startsWith('\n') ? '\n' : '';
      this.caption = before + sep + text + tail + after;
      this.$nextTick(() => { if (ta) ta.focus(); });
    },
    applyTemplate(t) {
      this.caption = t.text;
      this.showTemplates = false;
      this.$nextTick(() => { if (this.$refs.ta) this.$refs.ta.focus(); });
    },

    /* ── clipboard ── */
    async _doCopy(text, flag) {
      try {
        await navigator.clipboard.writeText(text);
        this[flag] = true;
        setTimeout(() => (this[flag] = false), 2200);
      } catch (_) {}
    },
    copyCaption()  { this._doCopy(this.caption,     'copied'); },
    copyHashtags() { this._doCopy(this.hashtagText, 'hashCopied'); },
    copyFull()     { this._doCopy(this.fullOutput,  'fullCopied'); },

    clear() {
      this.caption   = '';
      this.hashtags  = [];
      this.hashInput = '';
      this.showFullPreview = false;
    },
  };
}
