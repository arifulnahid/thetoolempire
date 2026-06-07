function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function readabilityApp() {
  return {
    text: '',
    words: 0,
    sents: 0,
    sylls: 0,
    complexWords: 0,
    chars: 0,
    flesch: '—',
    fkGrade: '—',
    fog: '—',
    smog: '—',
    clIndex: '—',
    readingTime: '—',

    // Flesch
    get fleschBarStyle() {
      const v = parseFloat(this.flesch);
      if (isNaN(v)) return 'width:0%;background:#555570';
      const pct = Math.min(Math.max(v, 0), 100);
      const color = v >= 60 ? '#34d399' : v >= 30 ? '#fbbf24' : '#f87171';
      return `width:${pct}%;background:${color}`;
    },
    get fleschLabel() {
      const v = parseFloat(this.flesch);
      if (isNaN(v)) return '';
      if (v >= 90) return 'Very Easy — 5th grade';
      if (v >= 80) return 'Easy — 6th grade';
      if (v >= 70) return 'Fairly Easy — 7th grade';
      if (v >= 60) return 'Standard — 8th–9th grade';
      if (v >= 50) return 'Fairly Difficult — 10th–12th grade';
      if (v >= 30) return 'Difficult — College level';
      return 'Very Difficult — College graduate';
    },
    get fleschGrade() {
      const v = parseFloat(this.flesch);
      if (isNaN(v)) return '—';
      return v >= 60 ? 'Easy' : v >= 30 ? 'Medium' : 'Hard';
    },
    get fleschGradeClass() {
      const v = parseFloat(this.flesch);
      return v >= 60 ? 'grade-easy' : v >= 30 ? 'grade-medium' : 'grade-hard';
    },

    // FK
    get fkBarStyle() {
      const v = parseFloat(this.fkGrade);
      if (isNaN(v)) return 'width:0%;background:#555570';
      const pct = Math.min((v / 18) * 100, 100);
      const color = v <= 9 ? '#34d399' : v <= 13 ? '#fbbf24' : '#f87171';
      return `width:${pct}%;background:${color}`;
    },
    get fkLabel() {
      const v = parseFloat(this.fkGrade);
      if (isNaN(v)) return '';
      if (v <= 6) return 'Very easy to read';
      if (v <= 9) return 'Easy — middle school';
      if (v <= 12) return 'Standard — high school';
      if (v <= 16) return 'Difficult — college';
      return 'Very difficult — professional';
    },
    get fkGradeClass() {
      const v = parseFloat(this.fkGrade);
      return v <= 9 ? 'grade-easy' : v <= 12 ? 'grade-medium' : 'grade-hard';
    },

    // Fog
    get fogBarStyle() {
      const v = parseFloat(this.fog);
      if (isNaN(v)) return 'width:0%;background:#555570';
      const pct = Math.min((v / 20) * 100, 100);
      const color = v <= 10 ? '#34d399' : v <= 14 ? '#fbbf24' : '#f87171';
      return `width:${pct}%;background:${color}`;
    },
    get fogLabel() {
      const v = parseFloat(this.fog);
      if (isNaN(v)) return '';
      if (v <= 8) return 'Easy — most readers';
      if (v <= 12) return 'Acceptable — high school';
      if (v <= 17) return 'Hard — college level';
      return 'Very hard — academic';
    },
    get fogGrade() {
      const v = parseFloat(this.fog);
      return v <= 12 ? 'Acceptable' : v <= 17 ? 'Hard' : 'Very Hard';
    },
    get fogGradeClass() {
      const v = parseFloat(this.fog);
      return v <= 12 ? 'grade-easy' : v <= 17 ? 'grade-medium' : 'grade-hard';
    },

    // SMOG
    get smogBarStyle() {
      const v = parseFloat(this.smog);
      if (isNaN(v)) return 'width:0%;background:#555570';
      const pct = Math.min((v / 18) * 100, 100);
      const color = v <= 9 ? '#34d399' : v <= 13 ? '#fbbf24' : '#f87171';
      return `width:${pct}%;background:${color}`;
    },
    get smogLabel() {
      const v = parseFloat(this.smog);
      if (isNaN(v)) return '';
      if (v <= 6) return 'Very easy';
      if (v <= 9) return 'Easy';
      if (v <= 13) return 'Standard';
      return 'Difficult';
    },
    get smogGrade() {
      const v = parseFloat(this.smog);
      return v <= 9 ? 'Easy' : v <= 13 ? 'Standard' : 'Hard';
    },
    get smogGradeClass() {
      const v = parseFloat(this.smog);
      return v <= 9 ? 'grade-easy' : v <= 13 ? 'grade-medium' : 'grade-hard';
    },

    // CL
    get clBarStyle() {
      const v = parseFloat(this.clIndex);
      if (isNaN(v)) return 'width:0%;background:#555570';
      const pct = Math.min((v / 18) * 100, 100);
      const color = v <= 9 ? '#34d399' : v <= 13 ? '#fbbf24' : '#f87171';
      return `width:${pct}%;background:${color}`;
    },
    get clLabel() {
      const v = parseFloat(this.clIndex);
      if (isNaN(v)) return '';
      if (v <= 6) return 'Very easy — elementary';
      if (v <= 9) return 'Easy — middle school';
      if (v <= 13) return 'Standard — high school';
      return 'Difficult — college';
    },
    get clGrade() {
      const v = parseFloat(this.clIndex);
      return v <= 9 ? 'Easy' : v <= 13 ? 'Standard' : 'Hard';
    },
    get clGradeClass() {
      const v = parseFloat(this.clIndex);
      return v <= 9 ? 'grade-easy' : v <= 13 ? 'grade-medium' : 'grade-hard';
    },

    init() {},

    analyze() {
      const txt = this.text;
      if (!txt.trim()) {
        this.words = 0; this.sents = 0; this.sylls = 0;
        this.complexWords = 0; this.chars = 0;
        this.flesch = '—'; this.fkGrade = '—'; this.fog = '—';
        this.smog = '—'; this.clIndex = '—'; this.readingTime = '—';
        return;
      }

      // Sentence count
      const sentMatches = txt.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const S = Math.max(sentMatches.length, 1);

      // Word tokenize
      const wordTokens = txt.trim().split(/\s+/).filter(w => w.replace(/[^a-zA-Z]/g,'').length > 0);
      const W = wordTokens.length;
      if (W === 0) { this.words = 0; return; }

      this.words = W;
      this.sents = S;
      this.chars = txt.replace(/\s/g,'').length;

      // Syllables
      let totalSylls = 0, complex = 0;
      wordTokens.forEach(w => {
        const s = countSyllables(w);
        totalSylls += s;
        if (s >= 3) complex++;
      });
      this.sylls = totalSylls;
      this.complexWords = complex;

      const ASL = W / S;       // avg sentence length
      const ASW = totalSylls / W; // avg syllables per word

      // Flesch Reading Ease
      const fe = 206.835 - 1.015 * ASL - 84.6 * ASW;
      this.flesch = Math.min(Math.max(fe, 0), 100).toFixed(1);

      // Flesch-Kincaid Grade Level
      const fk = 0.39 * ASL + 11.8 * ASW - 15.59;
      this.fkGrade = Math.max(fk, 0).toFixed(1);

      // Gunning Fog
      const fogVal = 0.4 * (ASL + 100 * (complex / W));
      this.fog = fogVal.toFixed(1);

      // SMOG (needs at least 30 sentences for accuracy; approximate otherwise)
      const smogVal = 3 + Math.sqrt(complex * (30 / S));
      this.smog = smogVal.toFixed(1);

      // Coleman-Liau
      const L = (this.chars / W) * 100;  // avg letters per 100 words
      const Sent = (S / W) * 100;        // avg sentences per 100 words
      const cl = 0.0588 * L - 0.296 * Sent - 15.8;
      this.clIndex = Math.max(cl, 0).toFixed(1);

      // Reading time (200 wpm average)
      const mins = W / 200;
      if (mins < 1) this.readingTime = 'Less than 1 minute';
      else this.readingTime = `About ${Math.ceil(mins)} minute${Math.ceil(mins) > 1 ? 's' : ''}`;
    },

    loadSample() {
      this.text = `The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet. Readability scores measure how easy a text is to understand.

Flesch Reading Ease is one of the most widely used readability formulas. It was developed by Rudolf Flesch in 1948 and considers both sentence length and syllable count. A higher score indicates text that is easier to read. Most web content should aim for a score between sixty and seventy.

The Gunning Fog Index was created by Robert Gunning in 1952. It estimates how many years of education a reader needs to understand a text on first reading. Fog scores above twelve are considered difficult for most general audiences.

Good writing uses short, clear sentences. It avoids unnecessary jargon and complex terminology when simpler words will do. The goal is always to communicate ideas as clearly as possible to the intended audience.`;
      this.analyze();
    },
  };
}
