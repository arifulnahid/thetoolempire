/* ── Longest Common Subsequence diff engine ── */
function computeDiff(aLines, bLines) {
  const m = aLines.length, n = bLines.length;
  // Build LCS table
  const dp = Array.from({ length: m + 1 }, () => new Int32Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = aLines[i-1] === bLines[j-1]
        ? dp[i-1][j-1] + 1
        : Math.max(dp[i-1][j], dp[i][j-1]);

  // Backtrack to build edit script
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i-1] === bLines[j-1]) {
      ops.push({ type: 'eq', a: aLines[i-1], b: bLines[j-1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      ops.push({ type: 'add', b: bLines[j-1] });
      j--;
    } else {
      ops.push({ type: 'del', a: aLines[i-1] });
      i--;
    }
  }
  return ops.reverse();
}

/* ── Inline word-level diff for a single changed line ── */
function inlineDiff(a, b) {
  const aW = a.split(/(\s+)/), bW = b.split(/(\s+)/);
  const ops = computeDiff(aW, bW);
  let aHtml = '', bHtml = '';
  for (const op of ops) {
    if (op.type === 'eq') {
      aHtml += escHtml(op.a);
      bHtml += escHtml(op.b);
    } else if (op.type === 'del') {
      aHtml += `<del>${escHtml(op.a)}</del>`;
    } else {
      bHtml += `<ins>${escHtml(op.b)}</ins>`;
    }
  }
  return { aHtml, bHtml };
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ── Alpine.js app ── */
function diffApp() {
  return {
    textA: '',
    textB: '',
    mode: 'split',     // 'split' | 'unified'
    ignoreCase: false,
    ignoreWhitespace: false,
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,

    get linesA() { return this.textA.split('\n'); },
    get linesB() { return this.textB.split('\n'); },

    get ops() {
      let a = this.linesA, b = this.linesB;
      if (this.ignoreCase) { a = a.map(l => l.toLowerCase()); b = b.map(l => l.toLowerCase()); }
      if (this.ignoreWhitespace) { a = a.map(l => l.replace(/\s+/g,' ').trim()); b = b.map(l => l.replace(/\s+/g,' ').trim()); }
      return computeDiff(a, b);
    },

    get addCount()  { return this.ops.filter(o => o.type === 'add').length; },
    get delCount()  { return this.ops.filter(o => o.type === 'del').length; },
    get eqCount()   { return this.ops.filter(o => o.type === 'eq').length; },
    get hasChanges(){ return this.addCount > 0 || this.delCount > 0; },
    get isEmpty()   { return !this.textA.trim() && !this.textB.trim(); },

    /* Build HTML rows for split view */
    get splitRows() {
      const rawOps = computeDiff(this.linesA, this.linesB);
      let aIdx = 0, bIdx = 0;
      const rows = [];
      for (const op of rawOps) {
        if (op.type === 'eq') {
          rows.push({ type: 'eq', aNum: ++aIdx, bNum: ++bIdx, aHtml: escHtml(op.a), bHtml: escHtml(op.b) });
        } else if (op.type === 'del') {
          rows.push({ type: 'del', aNum: ++aIdx, bNum: null, aHtml: escHtml(op.a), bHtml: '' });
        } else {
          rows.push({ type: 'add', aNum: null, bNum: ++bIdx, aHtml: '', bHtml: escHtml(op.b) });
        }
      }
      return rows;
    },

    /* Build HTML lines for unified view */
    get unifiedLines() {
      const rawOps = computeDiff(this.linesA, this.linesB);
      let aIdx = 0, bIdx = 0;
      const lines = [];
      for (const op of rawOps) {
        if (op.type === 'eq')  { lines.push({ type: 'eq',  num: `${++aIdx}`, text: escHtml(op.a) }); bIdx++; }
        if (op.type === 'del') { lines.push({ type: 'del', num: `−${++aIdx}`, text: escHtml(op.a) }); }
        if (op.type === 'add') { lines.push({ type: 'add', num: `+${++bIdx}`, text: escHtml(op.b) }); }
      }
      return lines;
    },

    swapTexts() {
      [this.textA, this.textB] = [this.textB, this.textA];
      this.showToast('Texts swapped');
    },

    clearAll() {
      this.textA = '';
      this.textB = '';
    },

    copyResult() {
      if (!this.hasChanges && !this.isEmpty) {
        navigator.clipboard.writeText('No differences found.').then(() => this.showToast('Copied'));
        return;
      }
      const lines = this.unifiedLines.map(l => {
        const prefix = l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  ';
        return prefix + l.text.replace(/<[^>]+>/g, '');
      });
      navigator.clipboard.writeText(lines.join('\n')).then(() => this.showToast('Diff copied!'));
    },

    pasteA() {
      navigator.clipboard.readText().then(t => { this.textA = t; this.showToast('Pasted to Original'); })
        .catch(() => this.showToast('Clipboard access denied'));
    },
    pasteB() {
      navigator.clipboard.readText().then(t => { this.textB = t; this.showToast('Pasted to Revised'); })
        .catch(() => this.showToast('Clipboard access denied'));
    },

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
        const el = document.getElementById('dc-toast');
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
