/* ── Calculation engines ── */
function calcWhatIsXofY(x, y)        { return (x / 100) * y; }
function calcXisWhatPctOfY(x, y)     { return y === 0 ? null : (x / y) * 100; }
function calcPctChange(from, to)     { return from === 0 ? null : ((to - from) / Math.abs(from)) * 100; }
function calcXisYpctOfWhat(x, pct)   { return pct === 0 ? null : (x / pct) * 100; }
function calcWhatIsXpctMoreThanY(x, y){ return y + (x / 100) * y; }
function calcWhatIsXpctLessThanY(x, y){ return y - (x / 100) * y; }

function fmt(n) {
  if (n === null || isNaN(n) || !isFinite(n)) return null;
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(8)).toString();
}

/* ── Alpine.js component ── */
function pctCalcApp() {
  return {
    activeTab: 'basic',
    history: [],
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,

    /* ── Basic: What is X% of Y? ── */
    b_pct: '', b_val: '', b_result: null,
    calcBasic() {
      const x = parseFloat(this.b_pct), y = parseFloat(this.b_val);
      if (isNaN(x) || isNaN(y)) { this.b_result = null; return; }
      const r = calcWhatIsXofY(x, y);
      this.b_result = fmt(r);
      this.addHistory(`${x}% of ${y}`, this.b_result);
    },

    /* ── What %: X is what % of Y? ── */
    w_x: '', w_y: '', w_result: null,
    calcWhatPct() {
      const x = parseFloat(this.w_x), y = parseFloat(this.w_y);
      if (isNaN(x) || isNaN(y)) { this.w_result = null; return; }
      const r = calcXisWhatPctOfY(x, y);
      this.w_result = r === null ? 'Cannot divide by zero' : fmt(r) + '%';
      if (r !== null) this.addHistory(`${x} is what % of ${y}`, this.w_result);
    },

    /* ── Change: % change from X to Y ── */
    c_from: '', c_to: '', c_result: null,
    calcChange() {
      const a = parseFloat(this.c_from), b = parseFloat(this.c_to);
      if (isNaN(a) || isNaN(b)) { this.c_result = null; return; }
      const r = calcPctChange(a, b);
      if (r === null) { this.c_result = 'Cannot calculate from zero'; return; }
      const sign = r >= 0 ? '+' : '';
      this.c_result = sign + fmt(r) + '%';
      this.addHistory(`% change ${a} → ${b}`, this.c_result);
    },
    get changeLabel() {
      if (!this.c_result) return '';
      const r = parseFloat(this.c_result);
      if (isNaN(r)) return this.c_result;
      return r >= 0 ? 'increase' : 'decrease';
    },

    /* ── Reverse: X is Y% of what? ── */
    r_x: '', r_pct: '', r_result: null,
    calcReverse() {
      const x = parseFloat(this.r_x), pct = parseFloat(this.r_pct);
      if (isNaN(x) || isNaN(pct)) { this.r_result = null; return; }
      const r = calcXisYpctOfWhat(x, pct);
      this.r_result = r === null ? 'Cannot divide by zero' : fmt(r);
      if (r !== null) this.addHistory(`${x} is ${pct}% of what?`, this.r_result);
    },

    /* ── Add/Sub: Y increased/decreased by X% ── */
    as_pct: '', as_val: '', as_add_result: null, as_sub_result: null,
    calcAddSub() {
      const x = parseFloat(this.as_pct), y = parseFloat(this.as_val);
      if (isNaN(x) || isNaN(y)) { this.as_add_result = null; this.as_sub_result = null; return; }
      this.as_add_result = fmt(calcWhatIsXpctMoreThanY(x, y));
      this.as_sub_result = fmt(calcWhatIsXpctLessThanY(x, y));
      this.addHistory(`${y} + ${x}%`, this.as_add_result);
      this.addHistory(`${y} − ${x}%`, this.as_sub_result);
    },

    addHistory(expr, ans) {
      this.history.unshift({ expr, ans, id: Date.now() + Math.random() });
      if (this.history.length > 20) this.history.pop();
    },
    clearHistory() { this.history = []; },

    copyResult(val) {
      if (!val) return;
      navigator.clipboard.writeText(val)
        .then(() => this.showToast('Copied!'))
        .catch(() => this.showToast('Copy failed'));
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
        const el = document.getElementById('pc-toast');
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
  const btn  = document.querySelector('[data-tab="' + id + '"]');
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
}
