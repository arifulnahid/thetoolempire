const STOP_WORDS = new Set([
  'a','about','above','after','again','against','all','am','an','and','any','are',
  'as','at','be','because','been','before','being','below','between','both','but',
  'by','can','cannot','could','did','do','does','doing','down','during','each','few',
  'for','from','further','get','got','had','has','have','having','he','her','here',
  'hers','herself','him','himself','his','how','i','if','in','into','is','it','its',
  'itself','just','know','let','like','may','me','might','more','most','my','myself',
  'need','no','nor','not','now','of','off','on','once','only','or','other','our',
  'ours','ourselves','out','over','own','said','same','she','should','so','some',
  'such','than','that','the','their','theirs','them','themselves','then','there',
  'these','they','this','those','through','to','too','under','until','up','us',
  'very','was','we','were','what','when','where','which','while','who','whom','why',
  'will','with','would','you','your','yours','yourself','yourselves','also','been',
  'has','been','had','have','do','does','did','will','would','could','should','may',
  'might','shall','can','must','am','is','are','was','were','be','being','been'
]);

function kwDensityApp() {
  return {
    text: '',
    keyword: '',
    filterStopWords: true,
    caseInsensitive: true,
    totalWords: 0,
    uniqueWords: 0,
    sentences: 0,
    kwCount: 0,
    kwDensity: '0.00',
    topKeywords: [],
    highlightedText: '',

    get meterStyle() {
      const d = parseFloat(this.kwDensity);
      let pct = Math.min((d / 5) * 100, 100);
      let color = d < 0.5 ? '#fbbf24' : d <= 3 ? '#34d399' : '#f87171';
      return `width:${pct}%;background:${color}`;
    },

    get densityStatusClass() {
      const d = parseFloat(this.kwDensity);
      return d < 0.5 ? 'status-low' : d <= 3 ? 'status-ok' : 'status-high';
    },

    get densityStatusText() {
      const d = parseFloat(this.kwDensity);
      if (this.kwCount === 0) return 'Keyword not found in text.';
      if (d < 0.5) return `Low density (${this.kwDensity}%) — consider mentioning this keyword more naturally.`;
      if (d <= 3) return `Optimal density (${this.kwDensity}%) — well balanced.`;
      return `High density (${this.kwDensity}%) — risk of keyword stuffing.`;
    },

    init() {},

    analyze() {
      const raw = this.text;
      if (!raw.trim()) {
        this.totalWords = 0; this.uniqueWords = 0; this.sentences = 0;
        this.kwCount = 0; this.kwDensity = '0.00';
        this.topKeywords = []; this.highlightedText = '';
        return;
      }

      // Count sentences
      this.sentences = (raw.match(/[.!?](?:\s+[A-Z]|\s*$)/g) || []).length || 1;

      // Tokenize words
      const tokens = raw
        .replace(/[–—]/g, '-')
        .split(/[\s,;:!?"'()\[\]{}<>\/\\|@#$%^&*+=~`]+/)
        .map(w => w.replace(/^[-.']+|[-.']+$/g, ''))
        .filter(w => w.length > 0);

      this.totalWords = tokens.length;

      // Frequency map
      const freq = {};
      tokens.forEach(w => {
        const key = this.caseInsensitive ? w.toLowerCase() : w;
        freq[key] = (freq[key] || 0) + 1;
      });

      this.uniqueWords = Object.keys(freq).length;

      // Target keyword density
      const kw = this.keyword.trim();
      if (kw) {
        const kwNorm = this.caseInsensitive ? kw.toLowerCase() : kw;
        const textNorm = this.caseInsensitive ? raw.toLowerCase() : raw;
        const kwWords = kwNorm.split(/\s+/);
        let count = 0;
        if (kwWords.length === 1) {
          count = freq[kwNorm] || 0;
        } else {
          // Phrase search
          const pattern = new RegExp('\\b' + kwWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+') + '\\b', 'gi');
          count = (raw.match(pattern) || []).length;
        }
        this.kwCount = count;
        this.kwDensity = this.totalWords > 0 ? ((count / this.totalWords) * 100).toFixed(2) : '0.00';

        // Highlight
        if (count > 0) {
          const escKw = kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          const hiPattern = new RegExp('(' + escKw + ')', this.caseInsensitive ? 'gi' : 'g');
          this.highlightedText = this.escHtml(raw).replace(
            new RegExp('(' + escKw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', this.caseInsensitive ? 'gi' : 'g'),
            '<mark class="kw-hi">$1</mark>'
          );
        } else {
          this.highlightedText = this.escHtml(raw);
        }
      } else {
        this.kwCount = 0; this.kwDensity = '0.00'; this.highlightedText = '';
      }

      // Top keywords table
      const filtered = Object.entries(freq)
        .filter(([w]) => !this.filterStopWords || !STOP_WORDS.has(w.toLowerCase()))
        .filter(([w]) => w.length > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30);

      this.topKeywords = filtered.map(([word, count]) => ({
        word,
        count,
        density: this.totalWords > 0 ? ((count / this.totalWords) * 100).toFixed(2) : '0.00',
      }));
    },

    escHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    },

    loadSample() {
      this.text = `Search engine optimization (SEO) is the process of improving a website's visibility in search engine results. Effective SEO involves keyword research, quality content creation, technical optimization, and building authoritative backlinks.

Keyword density is one aspect of on-page SEO. When optimizing content, it is important to include your target keywords naturally throughout the text. Over-optimization, or keyword stuffing, occurs when keywords are used excessively and unnaturally. This can harm your SEO performance rather than improve it.

Modern SEO focuses on user intent and content quality over simple keyword frequency. Google's algorithms have become sophisticated enough to understand context, synonyms, and related terms. Writing naturally for human readers while covering a topic thoroughly tends to produce content that performs well in search results.

For best results, aim for keyword density between one and three percent. Use related terms and synonyms to support your primary keyword without forcing it in unnaturally. Always prioritize readability and value for your audience.`;
      this.keyword = 'keyword density';
      this.analyze();
    },

    clearAll() {
      this.text = ''; this.keyword = ''; this.analyze();
    },
  };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}
