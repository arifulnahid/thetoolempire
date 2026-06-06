/* ── Snippet library ── */
const SNIPPETS = [
  { name:'Email Address',      pattern:'^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$',    flags:'i',  desc:'Validates a standard email address.' },
  { name:'URL (http/https)',   pattern:'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)', flags:'i', desc:'Matches http and https URLs.' },
  { name:'IPv4 Address',       pattern:'\\b((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b', flags:'g', desc:'Matches valid IPv4 addresses.' },
  { name:'Phone (US)',         pattern:'\\+?1?[\\s.\\-]?\\(?\\d{3}\\)?[\\s.\\-]?\\d{3}[\\s.\\-]?\\d{4}', flags:'g', desc:'US phone numbers in common formats.' },
  { name:'Date (YYYY-MM-DD)',  pattern:'\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b', flags:'g', desc:'ISO 8601 dates with capture groups for year/month/day.' },
  { name:'HEX Color',          pattern:'#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\\b', flags:'gi', desc:'CSS hex color codes — 3 or 6 digit.' },
  { name:'CSS Class Name',     pattern:'\\.[a-zA-Z_\\-][a-zA-Z0-9_\\-]*', flags:'g',  desc:'Matches CSS class selectors in a stylesheet.' },
  { name:'HTML Tag',           pattern:'<\\/?[a-zA-Z][a-zA-Z0-9]*(?:\\s[^>]*)?\\/?>',  flags:'g', desc:'Matches opening and closing HTML tags.' },
  { name:'Credit Card',        pattern:'\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b', flags:'g', desc:'Visa, Mastercard, Amex, Discover.' },
  { name:'Password (strong)',  pattern:'^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$', flags:'',  desc:'Min 8 chars, upper, lower, digit, special char.' },
  { name:'Username',           pattern:'^[a-zA-Z0-9_\\-]{3,20}$', flags:'',  desc:'3–20 chars, letters, digits, underscore, hyphen.' },
  { name:'Whitespace (trim)',  pattern:'^\\s+|\\s+$', flags:'g', desc:'Matches leading and trailing whitespace.' },
  { name:'Blank lines',        pattern:'^\\s*$', flags:'gm', desc:'Matches empty or whitespace-only lines.' },
  { name:'Duplicate words',    pattern:'\\b(\\w+)\\s+\\1\\b', flags:'gi', desc:'Finds repeated consecutive words.' },
  { name:'JSON string value',  pattern:'"([^"\\\\]|\\\\.)*"', flags:'g', desc:'Matches quoted JSON string values.' },
  { name:'Markdown link',      pattern:'\\[([^\\]]+)\\]\\(([^)]+)\\)', flags:'g', desc:'Captures link text and URL from Markdown links.' },
];

/* ── Escape HTML for safe display ── */
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Build highlighted HTML from matches ── */
function buildHighlight(text, matches, groups) {
  if (!matches.length) return escapeHtml(text);

  // sort by index, handle overlaps (skip inner overlaps)
  const sorted = [...matches].sort((a,b) => a.index - b.index);
  let result = '';
  let pos = 0;
  for (const m of sorted) {
    if (m.index < pos) continue; // overlap — skip
    result += escapeHtml(text.slice(pos, m.index));
    result += `<mark class="m0">${escapeHtml(m[0])}</mark>`;
    pos = m.index + m[0].length;
  }
  result += escapeHtml(text.slice(pos));
  return result;
}

/* ── Alpine component ── */
function regexApp() {
  return {
    pattern: '',
    flags: { g: true, i: false, m: false, s: false },
    testString: '',
    replaceStr: '',
    showReplace: false,
    matches: [],
    replaceOutput: '',
    errorMsg: '',
    isValid: null,
    highlightHtml: '',
    snippets: SNIPPETS,

    sampleTest: `Hello, my email is jane@example.com and I also use jane.doe+work@company.org.
Visit https://thetoolempire.com or http://example.com/path?q=1&a=2 for tools.
Phone: +1 (555) 123-4567 or 555.987.6543.
Today is 2026-06-06, meeting at 2026-12-31.
Colors: #ff6b6b, #34d399, #a78bfa, #fff.
Duplicate duplicate words are are caught.`,

    init() {
      this.pattern = '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}';
      this.testString = this.sampleTest;
      this.run();
    },

    get flagStr() {
      return Object.entries(this.flags).filter(([,v])=>v).map(([k])=>k).join('');
    },

    get fullRegex() {
      return `/${this.pattern}/${this.flagStr}`;
    },

    toggleFlag(f) {
      this.flags[f] = !this.flags[f];
      this.run();
    },

    run() {
      this.matches = [];
      this.highlightHtml = escapeHtml(this.testString);
      this.replaceOutput = '';
      this.errorMsg = '';
      this.isValid = null;

      if (!this.pattern.trim()) return;

      let re;
      try {
        re = new RegExp(this.pattern, this.flagStr);
        this.isValid = true;
      } catch (e) {
        this.errorMsg = e.message;
        this.isValid = false;
        return;
      }

      const text = this.testString;
      if (!text) return;

      // Collect matches
      if (this.flags.g) {
        let m;
        const safeRe = new RegExp(this.pattern, this.flagStr);
        while ((m = safeRe.exec(text)) !== null) {
          this.matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
          if (m[0].length === 0) safeRe.lastIndex++; // prevent infinite loop
        }
      } else {
        const m = re.exec(text);
        if (m) this.matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
      }

      // Build highlight
      this.highlightHtml = buildHighlight(text, this.matches.map(m => ({ index: m.index, 0: m.match })), []);

      // Replace
      if (this.showReplace) {
        try {
          this.replaceOutput = text.replace(re, this.replaceStr);
        } catch(e) {}
      }
    },

    loadSnippet(s) {
      this.pattern = s.pattern;
      const flagSet = { g: false, i: false, m: false, s: false };
      for (const f of s.flags.split('')) if (f in flagSet) flagSet[f] = true;
      this.flags = flagSet;
      this.run();
      this._toast('Loaded: ' + s.name);
    },

    clearAll() {
      this.pattern = '';
      this.testString = '';
      this.replaceStr = '';
      this.matches = [];
      this.highlightHtml = '';
      this.errorMsg = '';
      this.isValid = null;
    },

    loadSample() {
      this.testString = this.sampleTest;
      this.run();
    },

    get matchCount() { return this.matches.length; },
    get statusLabel() {
      if (this.isValid === null) return 'Empty';
      if (!this.isValid) return 'Invalid';
      return this.matchCount > 0 ? `${this.matchCount} match${this.matchCount!==1?'es':''}` : '0 matches';
    },
    get statusClass() {
      if (this.isValid === null) return 'status-empty';
      if (!this.isValid) return 'status-error';
      return this.matchCount > 0 ? 'status-valid' : 'status-empty';
    },

    groupClass(i) { return 'g' + ((i % 4) + 1); },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    async copyPattern() {
      try { await navigator.clipboard.writeText(this.fullRegex); this._toast('Pattern copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyOutput() {
      if (!this.replaceOutput) return;
      try { await navigator.clipboard.writeText(this.replaceOutput); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
