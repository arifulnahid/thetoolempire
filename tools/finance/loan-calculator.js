/* ── Loan Calculator Alpine component ── */
function loanApp() {
  return {
    /* ── Inputs ── */
    loanType:    'mortgage',
    principal:   250000,
    annualRate:  6.5,
    termYears:   30,
    termMonths:  0,
    extraPayment: 0,
    startYear:   new Date().getFullYear(),
    startMonth:  new Date().getMonth() + 1,
    currency:    'USD',

    /* ── UI ── */
    showAmort:     false,
    amortRows:     12,
    result:        null,

    /* ── Currency symbols ── */
    currencies: {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥',
      CAD: 'C$', AUD: 'A$', INR: '₹', BRL: 'R$',
      MXN: 'MX$', SGD: 'S$', CHF: 'Fr', CNY: '¥',
    },

    get sym() { return this.currencies[this.currency] || '$'; },

    /* ── Loan type presets ── */
    loanTypes: [
      { id: 'mortgage',  label: '🏠 Mortgage',    rate: 6.5,  term: 30 },
      { id: 'auto',      label: '🚗 Auto',         rate: 7.2,  term: 5  },
      { id: 'personal',  label: '💳 Personal',     rate: 11.5, term: 5  },
      { id: 'student',   label: '🎓 Student',      rate: 5.5,  term: 10 },
      { id: 'business',  label: '💼 Business',     rate: 8.0,  term: 7  },
      { id: 'custom',    label: '⚙️ Custom',        rate: null, term: null },
    ],

    setLoanType(id) {
      this.loanType = id;
      const preset = this.loanTypes.find(t => t.id === id);
      if (preset && id !== 'custom') {
        this.annualRate = preset.rate;
        this.termYears  = preset.term;
        this.termMonths = 0;
      }
      this.calculate();
    },

    /* ── Core PMT formula ── */
    _pmt(principal, monthlyRate, nPayments) {
      if (monthlyRate === 0) return principal / nPayments;
      const r = monthlyRate;
      return principal * (r * Math.pow(1 + r, nPayments)) / (Math.pow(1 + r, nPayments) - 1);
    },

    /* ── Main calculation ── */
    calculate() {
      const P = parseFloat(this.principal);
      const r = parseFloat(this.annualRate) / 100 / 12;
      const n = parseInt(this.termYears) * 12 + parseInt(this.termMonths || 0);
      const extra = parseFloat(this.extraPayment) || 0;

      if (!P || P <= 0 || n <= 0 || isNaN(r) || r < 0) { this.result = null; return; }

      const monthlyPayment = this._pmt(P, r, n);
      const totalPayment   = monthlyPayment * n;
      const totalInterest  = totalPayment - P;
      const interestPct    = (totalInterest / P * 100).toFixed(1);

      /* ── Build amortization schedule ── */
      const schedule = [];
      let balance = P;
      let cumPrincipal = 0, cumInterest = 0;
      let actualMonths = 0;

      for (let i = 1; i <= n && balance > 0.005; i++) {
        const interestCharge = balance * r;
        let principalPaid = monthlyPayment - interestCharge + extra;
        if (principalPaid > balance) principalPaid = balance;
        balance = Math.max(0, balance - principalPaid);
        cumPrincipal += principalPaid;
        cumInterest  += interestCharge;
        actualMonths  = i;

        const d = new Date(this.startYear, this.startMonth - 1 + i - 1);
        schedule.push({
          month:      i,
          date:       d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          payment:    monthlyPayment + extra,
          principal:  principalPaid,
          interest:   interestCharge,
          balance:    balance,
          cumInterest,
        });
      }

      /* ── Early payoff from extra payments ── */
      const savedMonths   = extra > 0 ? n - actualMonths : 0;
      const savedInterest = extra > 0 ? totalInterest - (schedule.reduce((s, r) => s + r.interest, 0)) : 0;

      /* ── Term comparisons ── */
      const comparisons = [10, 15, 20, 25, 30].filter(y => y * 12 !== n).map(y => {
        const pmt = this._pmt(P, r, y * 12);
        const tot = pmt * y * 12;
        return { years: y, payment: pmt, total: tot, interest: tot - P };
      });

      this.result = {
        monthlyPayment, totalPayment, totalInterest, interestPct,
        principal: P, rate: parseFloat(this.annualRate), n,
        schedule, comparisons,
        savedMonths, savedInterest,
        payoffDate: schedule.length ? schedule[schedule.length - 1].date : '',
        principalPct: (P / totalPayment * 100).toFixed(1),
      };
    },

    /* ── Show more rows ── */
    showMore() { this.amortRows = Math.min(this.amortRows + 12, this.result?.schedule?.length || 12); },
    showAll()  { this.amortRows = this.result?.schedule?.length || 360; },

    /* ── SVG donut ── */
    donutPath(pct, r, cx, cy) {
      const angle = pct / 100 * 2 * Math.PI;
      const x = cx + r * Math.sin(angle);
      const y = cy - r * Math.cos(angle);
      const large = pct > 50 ? 1 : 0;
      return `M ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} L ${cx} ${cy}`;
    },

    /* ── Format helpers ── */
    fmt(n, decimals = 0) {
      if (n == null || isNaN(n)) return '—';
      return this.sym + Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    },
    fmtNum(n) {
      if (n == null || isNaN(n)) return '—';
      return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    async copyVal(text, label) {
      try { await navigator.clipboard.writeText(String(text)); this._toast(`${label} copied!`); }
      catch { this._toast('Copy failed'); }
    },
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },

    init() { this.calculate(); },
  };
}
