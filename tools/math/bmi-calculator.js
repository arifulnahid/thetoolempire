/* ── BMI engines ── */
function calcBMIMetric(kg, cm) {
  const m = cm / 100;
  return kg / (m * m);
}
function calcBMIImperial(lbs, ft, inches) {
  const totalInches = ft * 12 + inches;
  return (703 * lbs) / (totalInches * totalInches);
}
function getBMICategory(bmi) {
  if (bmi < 18.5) return { key: 'underweight', label: 'Underweight', color: '#60a5fa' };
  if (bmi < 25)   return { key: 'normal',      label: 'Normal weight', color: '#4ade80' };
  if (bmi < 30)   return { key: 'overweight',  label: 'Overweight',   color: '#fbbf24' };
  if (bmi < 35)   return { key: 'obese1',      label: 'Obese (Class I)',   color: '#fb923c' };
  if (bmi < 40)   return { key: 'obese2',      label: 'Obese (Class II)',  color: '#f87171' };
  return           { key: 'obese3',             label: 'Obese (Class III)', color: '#ef4444' };
}
/* Ideal weight uses Devine formula */
function getIdealWeightKg(cm, sex) {
  const inchesOver5ft = (cm / 2.54) - 60;
  const base = sex === 'female' ? 45.5 : 50;
  const ideal = base + 2.3 * inchesOver5ft;
  return { min: Math.max(ideal - 5, 0), max: ideal + 5 };
}
function idealToLbs(kg) { return kg * 2.2046; }
/* Weight range for BMI 18.5–24.9 */
function getHealthyWeightRange(cm) {
  const m = cm / 100;
  return { min: 18.5 * m * m, max: 24.9 * m * m };
}
function fmt2(n) { return Math.round(n * 10) / 10; }

/* ── Alpine.js component ── */
function bmiCalcApp() {
  return {
    unit: 'metric',   /* metric | imperial */
    sex: 'male',
    age: '',
    /* metric inputs */
    cm: '', kg: '',
    /* imperial inputs */
    ft: '', inch: '', lbs: '',
    /* result */
    bmi: null,
    category: null,
    gaugeLeft: '0%',
    weightRange: null,  /* { min, max } in current unit */
    idealWeight: null,  /* { min, max } in current unit */
    /* ui */
    hasResult: false,
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,

    setUnit(u) {
      this.unit = u;
      this.reset();
    },

    calculate() {
      let bmiVal, cmVal;
      if (this.unit === 'metric') {
        const kg = parseFloat(this.kg), cm = parseFloat(this.cm);
        if (!kg || !cm || kg <= 0 || cm <= 0) return;
        bmiVal = calcBMIMetric(kg, cm);
        cmVal = cm;
        const wr = getHealthyWeightRange(cm);
        this.weightRange = { min: fmt2(wr.min), max: fmt2(wr.max), unit: 'kg' };
        const iw = getIdealWeightKg(cm, this.sex);
        this.idealWeight = { min: fmt2(iw.min), max: fmt2(iw.max), unit: 'kg' };
      } else {
        const lbs = parseFloat(this.lbs), ft = parseInt(this.ft)||0, inch = parseInt(this.inch)||0;
        if (!lbs || lbs <= 0 || (!ft && !inch)) return;
        bmiVal = calcBMIImperial(lbs, ft, inch);
        cmVal = (ft * 12 + inch) * 2.54;
        const wr = getHealthyWeightRange(cmVal);
        this.weightRange = { min: fmt2(wr.min * 2.2046), max: fmt2(wr.max * 2.2046), unit: 'lbs' };
        const iw = getIdealWeightKg(cmVal, this.sex);
        this.idealWeight = { min: fmt2(iw.min * 2.2046), max: fmt2(iw.max * 2.2046), unit: 'lbs' };
      }
      this.bmi = fmt2(bmiVal);
      this.category = getBMICategory(bmiVal);
      this.gaugeLeft = this._bmiToGaugePos(bmiVal) + '%';
      this.hasResult = true;
      /* pre-compute overweight/obese boundary for display */
      if (this.weightRange) {
        const hm = cmVal / 100;
        const owMaxKg = 29.9 * hm * hm;
        this.weightRange.owMax = fmt2(this.unit === 'metric' ? owMaxKg : owMaxKg * 2.2046);
      }
    },

    _bmiToGaugePos(bmi) {
      /* map BMI 10-45 to 0-100% */
      const clamped = Math.max(10, Math.min(45, bmi));
      return ((clamped - 10) / 35) * 100;
    },

    reset() {
      this.bmi = null; this.category = null; this.hasResult = false;
      this.cm = ''; this.kg = ''; this.ft = ''; this.inch = ''; this.lbs = '';
    },

    get bmiDesc() {
      if (!this.category) return '';
      const descs = {
        underweight: 'Your weight is below the healthy range. Consider consulting a healthcare professional.',
        normal: 'Your weight is within the healthy range. Keep up the great lifestyle!',
        overweight: 'Your weight is slightly above the healthy range. Small lifestyle changes can help.',
        obese1: 'Class I obesity. Consulting a healthcare professional is recommended.',
        obese2: 'Class II obesity. Medical guidance is strongly recommended.',
        obese3: 'Class III obesity. Please consult a healthcare professional promptly.'
      };
      return descs[this.category.key] || '';
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
        const el = document.getElementById('bmi-toast');
        if (el) el.classList.add('show');
        this._toastTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2500);
      });
    },

    copyBMI() {
      if (!this.bmi) return;
      navigator.clipboard.writeText(this.bmi)
        .then(() => this.showToast('BMI copied!'))
        .catch(() => this.showToast('Copy failed'));
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
