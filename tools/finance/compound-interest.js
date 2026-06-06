/* ── Compound Interest Calculator Alpine component ── */
function compoundApp() {
  return {
    /* ── Inputs ── */
    preset:       'savings',
    principal:    10000,
    annualRate:   7,
    years:        10,
    months:       0,
    frequency:    'monthly',
    contribution: 0,
    contribWhen:  'end',   // 'start' | 'end'
    inflation:    0,
    currency:     'USD',

    /* ── UI ── */
    showTable:   false,
    tableRows:   12,
    result:      null,

    /* ── Currency symbols ── */
    currencies: {
      USD:'$', EUR:'€', GBP:'£', JPY:'¥',
      CAD:'C$', AUD:'A$', INR:'₹', BRL:'R$',
      MXN:'MX$', SGD:'S$', CHF:'Fr', CNY:'¥',
    },
    get sym() { return this.currencies[this.currency] || '$'; },

    /* ── Presets ── */
    presets: [
      { id:'savings',      label:'💰 Savings',       rate:4.5,  years:5  },
      { id:'investment',   label:'📈 Investment',    rate:7,    years:10 },
      { id:'retirement',   label:'🏖️ Retirement',   rate:8,    years:30 },
      { id:'education',    label:'🎓 Education',     rate:5,    years:18 },
      { id:'aggressive',   label:'🚀 Aggressive',    rate:12,   years:15 },
      { id:'custom',       label:'⚙️ Custom',         rate:null, years:null },
    ],

    setPreset(id) {
      this.preset = id;
      const p = this.presets.find(p => p.id === id);
      if (p && id !== 'custom') {
        this.annualRate = p.rate;
        this.years      = p.years;
        this.months     = 0;
      }
      this.calculate();
    },

    /* ── Compounding frequencies ── */
    frequencies: {
      annually:    { label:'Annually',     n:1    },
      semiannually:{ label:'Semi-annually',n:2    },
      quarterly:   { label:'Quarterly',    n:4    },
      monthly:     { label:'Monthly',      n:12   },
      weekly:      { label:'Weekly',       n:52   },
      daily:       { label:'Daily',        n:365  },
      continuous:  { label:'Continuous',   n:null },
    },

    /* ── Core formula: A = P(1 + r/n)^(nt) + PMT * [(1+r/n)^(nt) - 1] / (r/n) ── */
    _calc(P, annualRate, totalYears, n, pmt, pmtAtStart) {
      const r = annualRate / 100;
      if (n === null) {
        // Continuous: A = Pe^(rt) — contributions approximated monthly
        const A_principal = P * Math.exp(r * totalYears);
        if (pmt === 0) return A_principal;
        // For contributions with continuous: approximate with monthly
        return this._calc(P, annualRate, totalYears, 12, pmt, pmtAtStart);
      }
      const nt = n * totalYears;
      const factor = Math.pow(1 + r / n, nt);
      const A_principal = P * factor;
      if (pmt === 0) return A_principal;
      const pmtFactor = pmtAtStart
        ? pmt * (factor - 1) / (r / n) * (1 + r / n)
        : pmt * (factor - 1) / (r / n);
      return A_principal + pmtFactor;
    },

    /* ── Build yearly schedule ── */
    _buildSchedule(P, r, n, pmt, pmtAtStart, totalYears) {
      const rows = [];
      let balance = P;
      const ratePerPeriod = r / n;
      const periodsPerYear = n;

      for (let yr = 1; yr <= Math.ceil(totalYears); yr++) {
        const periodsThisYear = yr <= Math.floor(totalYears)
          ? periodsPerYear
          : Math.round((totalYears - Math.floor(totalYears)) * periodsPerYear);
        if (periodsThisYear === 0) break;

        const startBalance = balance;
        let interestThisYear = 0;
        let contribThisYear = 0;

        for (let p = 0; p < periodsThisYear; p++) {
          if (pmtAtStart && pmt) { balance += pmt; contribThisYear += pmt; }
          const interest = balance * ratePerPeriod;
          balance += interest;
          interestThisYear += interest;
          if (!pmtAtStart && pmt) { balance += pmt; contribThisYear += pmt; }
        }

        rows.push({
          year: yr,
          startBalance,
          contributions: contribThisYear,
          interest: interestThisYear,
          endBalance: balance,
        });
        if (yr >= Math.ceil(totalYears)) break;
      }
      return rows;
    },

    /* ── Main calculation ── */
    calculate() {
      const P    = parseFloat(this.principal) || 0;
      const rate = parseFloat(this.annualRate);
      const yrs  = parseInt(this.years) || 0;
      const mos  = parseInt(this.months) || 0;
      const totalYears = yrs + mos / 12;
      const pmt  = parseFloat(this.contribution) || 0;
      const inf  = parseFloat(this.inflation) || 0;
      const pmtAtStart = this.contribWhen === 'start';

      if (!totalYears || totalYears <= 0 || isNaN(rate) || rate < 0) {
        this.result = null; return;
      }

      const freqData = this.frequencies[this.frequency];
      const n = freqData.n ?? 12; // use 12 for continuous display
      const r = rate / 100;

      /* Future value */
      const futureValue = this._calc(P, rate, totalYears, freqData.n, pmt, pmtAtStart);
      const totalContributions = P + pmt * n * totalYears;
      const totalInterest = futureValue - totalContributions;
      const principalPct = (P / futureValue * 100).toFixed(1);
      const interestPct  = (totalInterest / futureValue * 100).toFixed(1);

      /* Inflation-adjusted */
      const realValue = inf > 0
        ? futureValue / Math.pow(1 + inf / 100, totalYears)
        : null;

      /* APY (effective annual yield) */
      const fn = freqData.n;
      const apy = fn === null
        ? (Math.exp(r) - 1) * 100
        : (Math.pow(1 + r / fn, fn) - 1) * 100;

      /* Doubling time (Rule of 72) */
      const doublingTime = rate > 0 ? (72 / rate).toFixed(1) : null;

      /* Frequency comparison */
      const freqComparisons = Object.entries(this.frequencies).map(([key, fd]) => {
        const fv = this._calc(P, rate, totalYears, fd.n ?? 12, pmt, pmtAtStart);
        return { key, label: fd.label, fv, interest: fv - totalContributions };
      });

      /* Yearly schedule */
      const schedule = this._buildSchedule(P, r, n, pmt, pmtAtStart, totalYears);

      this.result = {
        futureValue, totalContributions, totalInterest,
        principalPct, interestPct,
        realValue, apy: apy.toFixed(3),
        doublingTime,
        freqComparisons,
        schedule,
      };
    },

    showMore() { this.tableRows = Math.min(this.tableRows + 10, this.result?.schedule?.length || 10); },
    showAll()  { this.tableRows = this.result?.schedule?.length || 99; },

    /* ── Format helpers ── */
    fmt(n, decimals = 0) {
      if (n == null || isNaN(n)) return '—';
      return this.sym + Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    },
    fmtNum(n, d = 2) {
      if (n == null || isNaN(n)) return '—';
      return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    },
    barHeight(val, maxVal) {
      if (!maxVal || maxVal === 0) return '0%';
      return Math.max(4, (val / maxVal) * 100) + '%';
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
