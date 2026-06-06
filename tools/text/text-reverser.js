/* ── Reversal functions ── */
function reverseText(t)        { return t.split('').reverse().join(''); }
function reverseWords(t)       { return t.split(/\s+/).reverse().join(' '); }
function reverseLines(t)       { return t.split('\n').reverse().join('\n'); }
function reverseEachWord(t)    { return t.split(/(\s+)/).map(tok => /\s/.test(tok) ? tok : tok.split('').reverse().join('')).join(''); }
function reverseEachLine(t)    { return t.split('\n').map(line => line.split('').reverse().join('')).join('\n'); }
function flipUpsideDown(t) {
  const MAP = {
    a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'l',m:'ɯ',
    n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',
    A:'∀',B:'ꓭ',C:'Ɔ',D:'ᗡ',E:'Ǝ',F:'Ⅎ',G:'פ',H:'H',I:'I',J:'ɾ',K:'ʞ',L:'˥',M:'W',
    N:'N',O:'O',P:'Ԁ',Q:'Q',R:'ɹ',S:'S',T:'┴',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z',
    '0':'0','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ᔭ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6',
    '.':'˙',',':'\'','\'':',','!':'¡','?':'¿','(':')',')':'(','{':'}','}':'{','[':']',']':'[',
    '<':'>','>':'<','&':'⅋','_':'‾',' ':' '
  };
  return t.split('').reverse().map(c => MAP[c] || c).join('');
}
function mirrorText(t) {
  const MAP = {
    a:'ɒ',b:'d',c:'ɔ',d:'b',e:'ɘ',f:'ʇ',g:'ϱ',h:'ʜ',i:'i',j:'ʖ',k:'ʞ',l:'l',m:'m',
    n:'n',o:'o',p:'q',q:'p',r:'ɿ',s:'ƨ',t:'ƚ',u:'u',v:'v',w:'w',x:'x',y:'y',z:'ƹ',
    A:'A',B:'ᗺ',C:'Ɔ',D:'ᗡ',E:'Ǝ',F:'ꟻ',G:'Ꭾ',H:'H',I:'I',J:'Ⴑ',K:'ʞ',L:'⅃',M:'M',
    N:'И',O:'O',P:'ꟼ',Q:'Ọ',R:'Я',S:'Ƨ',T:'T',U:'U',V:'V',W:'W',X:'X',Y:'Y',Z:'Z',
    '(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<',' ':' '
  };
  return t.split('').reverse().map(c => MAP[c] || c).join('');
}

const MODES = [
  { id: 'text',        label: 'Reverse Text',       desc: 'Reverse every character' },
  { id: 'words',       label: 'Reverse Words',      desc: 'Reverse word order' },
  { id: 'lines',       label: 'Reverse Lines',      desc: 'Reverse line order' },
  { id: 'each-word',   label: 'Reverse Each Word',  desc: 'Flip letters in each word' },
  { id: 'each-line',   label: 'Reverse Each Line',  desc: 'Flip chars on each line' },
  { id: 'upside-down', label: 'Upside Down',        desc: 'Flip text upside-down' },
  { id: 'mirror',      label: 'Mirror Text',        desc: 'Horizontally mirrored' },
];

function applyMode(id, text) {
  switch (id) {
    case 'text':        return reverseText(text);
    case 'words':       return reverseWords(text);
    case 'lines':       return reverseLines(text);
    case 'each-word':   return reverseEachWord(text);
    case 'each-line':   return reverseEachLine(text);
    case 'upside-down': return flipUpsideDown(text);
    case 'mirror':      return mirrorText(text);
    default: return text;
  }
}

/* ── Alpine.js component ── */
function textReverserApp() {
  return {
    input: '',
    mode: 'text',
    modes: MODES,
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,

    get output() {
      if (!this.input) return '';
      return applyMode(this.mode, this.input);
    },

    get charCount()  { return this.input.length; },
    get wordCount()  { return this.input.trim() ? this.input.trim().split(/\s+/).length : 0; },
    get lineCount()  { return this.input ? this.input.split('\n').length : 0; },
    get outLength()  { return this.output.length; },

    setMode(id) { this.mode = id; },

    swapTexts() {
      const out = this.output;
      this.input = out;
      this.showToast('Swapped to input');
    },

    copyOutput() {
      if (!this.output) { this.showToast('Nothing to copy'); return; }
      navigator.clipboard.writeText(this.output)
        .then(() => this.showToast('Copied to clipboard!'))
        .catch(() => this.showToast('Copy failed'));
    },

    pasteInput() {
      navigator.clipboard.readText()
        .then(t => { this.input = t; this.showToast('Pasted!'); })
        .catch(() => this.showToast('Clipboard access denied'));
    },

    clearInput() { this.input = ''; },

    toggleFaq(i) { this.openFaq = this.openFaq === i ? null : i; },

    submitReport() { if (this.reportSelected) this.reportSent = true; },
    closeReport() {
      this.reportOpen = false;
      setTimeout(() => { this.reportSent = false; this.reportSelected = ''; }, 400);
    },

    showToast(msg) {
      this.toastMsg = msg;
      clearTimeout(this._toastTimer);
      this.$nextTick(() => {
        const el = document.getElementById('tr-toast');
        if (el) el.classList.add('show');
        this._toastTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2500);
      });
    },

    init() {
      document.addEventListener('scroll', () => {
        const h = document.querySelector('.site-header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    }
  };
}

function switchInfoTab(id) {
  document.querySelectorAll('.info-tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('tab-' + id);
  const btn = document.querySelector('[data-tab="' + id + '"]');
  if (pane) pane.classList.add('active');
  if (btn) btn.classList.add('active');
}
