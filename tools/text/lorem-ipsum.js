/* ── Lorem Ipsum word bank ── */
const LOREM_WORDS = [
  'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit',
  'sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore',
  'magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation',
  'ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis',
  'aute','irure','in','reprehenderit','voluptate','velit','esse','cillum',
  'fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non',
  'proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est',
  'laborum','curabitur','pretium','tincidunt','lacus','nunc','purus','augue',
  'luctus','nibh','lectus','pellentesque','egestas','neque','asperiores',
  'proin','faucibus','arcu','quis','aliquam','odio','hendrerit','malesuada',
  'dictum','sapien','imperdiet','auctor','arcu','porttitor','rhoncus','vitae',
  'suspendisse','potenti','nullam','eu','feugiat','lorem','ultrices','maximus',
  'maecenas','accumsan','lacinia','erat','pede','quam','felis','urna','pretium',
  'risus','interdum','ligula','fusce','fermentum','nec','orci','venenatis',
  'vulputate','vestibulum','ante','primis','faucibus','orci','luctus','ultrices',
  'posuere','cubilia','curae','proin','vel','ante','bibendum','augue','finibus',
  'morbi','turpis','mi','auctor','eleifend','viverra','lobortis','sodales',
  'magna','nunc','vulputate','tortor','cursus','consequat','congue','tincidunt',
  'eget','condimentum','enim','dapibus','scelerisque','varius','fringilla'
];

const CLASSIC_START = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

/* ── Random helpers ── */
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickWord() { return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)]; }

function makeSentence(minWords = 6, maxWords = 18) {
  const len = rnd(minWords, maxWords);
  const words = Array.from({ length: len }, () => pickWord());
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function makeParagraph(minSentences = 3, maxSentences = 7, classic = false, idx = 0) {
  if (classic && idx === 0) {
    const extra = Array.from({ length: rnd(2, 5) }, () => makeSentence()).join(' ');
    return CLASSIC_START + ' ' + extra;
  }
  const count = rnd(minSentences, maxSentences);
  return Array.from({ length: count }, () => makeSentence()).join(' ');
}

function generateWords(count) {
  const words = [];
  for (let i = 0; i < count; i++) words.push(pickWord());
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

function generateSentences(count, classic) {
  const sentences = [];
  for (let i = 0; i < count; i++) {
    if (classic && i === 0) sentences.push(CLASSIC_START);
    else sentences.push(makeSentence());
  }
  return sentences.join(' ');
}

function generateParagraphs(count, classic) {
  const paras = [];
  for (let i = 0; i < count; i++) paras.push(makeParagraph(3, 7, classic, i));
  return paras;
}

function generateList(count, classic) {
  const items = [];
  for (let i = 0; i < count; i++) {
    if (classic && i === 0) items.push(makeSentence(3, 8).replace(/\.$/, '') + ' lorem ipsum.');
    else items.push(makeSentence(3, 8));
  }
  return items;
}

/* ── Alpine.js component ── */
function loremIpsumApp() {
  return {
    type: 'paragraphs',   // paragraphs | sentences | words | list
    count: 3,
    classicStart: true,
    includeHtml: false,
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,
    generated: null,      // null = not yet generated

    get charCount() {
      if (!this.generated) return 0;
      return this.plainText.length;
    },
    get wordCountStat() {
      if (!this.generated) return 0;
      return this.plainText.trim().split(/\s+/).filter(Boolean).length;
    },
    get paraCount() {
      if (!this.generated) return 0;
      if (this.type === 'paragraphs') return this.count;
      return 1;
    },

    get plainText() {
      if (!this.generated) return '';
      if (Array.isArray(this.generated)) return this.generated.join('\n\n');
      return this.generated;
    },

    get displayHtml() {
      if (!this.generated) return '';
      if (this.type === 'paragraphs') {
        return this.generated.map(p => `<p>${p}</p>`).join('');
      }
      if (this.type === 'list') {
        const tag = this.includeHtml ? 'ul' : 'ul';
        const items = this.generated.map(i => `<li>${i}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      return `<p>${this.generated}</p>`;
    },

    generate() {
      const n = Math.max(1, Math.min(this.count, this.type === 'words' ? 500 : 50));
      this.count = n;

      if (this.type === 'paragraphs') {
        this.generated = generateParagraphs(n, this.classicStart);
      } else if (this.type === 'sentences') {
        this.generated = generateSentences(n, this.classicStart);
      } else if (this.type === 'words') {
        this.generated = generateWords(n);
      } else if (this.type === 'list') {
        this.generated = generateList(n, this.classicStart);
      }
    },

    copyText() {
      if (!this.generated) { this.showToast('Generate text first'); return; }
      navigator.clipboard.writeText(this.plainText)
        .then(() => this.showToast('Copied to clipboard!'))
        .catch(() => this.showToast('Copy failed'));
    },

    copyHtml() {
      if (!this.generated) { this.showToast('Generate text first'); return; }
      navigator.clipboard.writeText(this.displayHtml)
        .then(() => this.showToast('HTML copied!'))
        .catch(() => this.showToast('Copy failed'));
    },

    clearOutput() { this.generated = null; },

    increment() { this.count = Math.min(this.count + 1, this.type === 'words' ? 500 : 50); },
    decrement() { this.count = Math.max(1, this.count - 1); },

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
        const el = document.getElementById('li-toast');
        if (el) el.classList.add('show');
        this._toastTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2500);
      });
    },

    init() {
      this.generate();
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
