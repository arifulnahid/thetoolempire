function tipCalcApp() {
  return {
    bill: '',
    tipPct: 18,
    customTip: '',
    people: 1,
    roundUp: false,
    result: null,
    openFaq: null,
    showReport: false,
    reportText: '',
    activeTab: 'how',
    TIP_PRESETS: [10, 15, 18, 20, 25],

    init() {
      this.$watch('bill',      () => this.calculate());
      this.$watch('tipPct',    () => this.calculate());
      this.$watch('customTip', () => this.calculate());
      this.$watch('people',    () => this.calculate());
      this.$watch('roundUp',   () => this.calculate());
    },

    setPreset(pct) {
      this.tipPct = pct;
      this.customTip = '';
    },

    get effectiveTip() {
      if (this.customTip !== '' && !isNaN(parseFloat(this.customTip))) {
        return Math.max(0, parseFloat(this.customTip));
      }
      return this.tipPct;
    },

    incrementPeople() { if (this.people < 50) this.people++; },
    decrementPeople() { if (this.people > 1) this.people--; },

    calculate() {
      const billVal = parseFloat(this.bill);
      if (!billVal || billVal <= 0 || isNaN(billVal)) { this.result = null; return; }

      const tipPct = this.effectiveTip;
      const tipAmt = billVal * (tipPct / 100);
      let total = billVal + tipAmt;

      if (this.roundUp && this.people > 1) {
        const perPersonRaw = total / this.people;
        total = Math.ceil(perPersonRaw) * this.people;
      } else if (this.roundUp) {
        total = Math.ceil(total);
      }

      const finalTip = total - billVal;

      this.result = {
        bill:       billVal,
        tipPct,
        tipAmt:     finalTip,
        total,
        perBill:    this.people > 1 ? billVal / this.people    : null,
        perTip:     this.people > 1 ? finalTip / this.people   : null,
        perTotal:   this.people > 1 ? total / this.people      : null,
        people:     this.people,
      };
    },

    fmt(n) {
      if (n == null || isNaN(n)) return '—';
      return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    reset() {
      this.bill = '';
      this.tipPct = 18;
      this.customTip = '';
      this.people = 1;
      this.roundUp = false;
      this.result = null;
    },

    toggleFaq(i) {
      this.openFaq = this.openFaq === i ? null : i;
      this.$nextTick(() => {
        const el = document.querySelectorAll('.faq-item')[i];
        if (el) el.classList.toggle('open', this.openFaq === i);
      });
    },

    submitReport() {
      this.showReport = false;
      this.reportText = '';
      this.showToast('Report submitted — thank you!');
    },

    showToast(msg) {
      const t = document.getElementById('tip-toast');
      if (!t) return;
      t.querySelector('.toast-msg').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    },
  };
}
