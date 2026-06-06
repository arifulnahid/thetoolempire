/* ── Age calculation engine ── */
function calcAge(birthDate, toDate) {
  const b = new Date(birthDate);
  const t = new Date(toDate);
  if (isNaN(b) || isNaN(t) || b > t) return null;

  let years  = t.getFullYear() - b.getFullYear();
  let months = t.getMonth()    - b.getMonth();
  let days   = t.getDate()     - b.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(t.getFullYear(), t.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) { years--; months += 12; }

  /* totals */
  const msPerDay   = 86400000;
  const totalDays  = Math.floor((t - b) / msPerDay);
  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonths = years * 12 + months;
  const totalHours  = totalDays * 24;
  const totalMins   = totalHours * 60;

  /* next birthday */
  let nextBday = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (nextBday <= t) nextBday.setFullYear(nextBday.getFullYear() + 1);
  const daysToNextBday = Math.ceil((nextBday - t) / msPerDay);
  const nextBdayAge = nextBday.getFullYear() - b.getFullYear();

  /* day of week born */
  const days_of_week = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const bornOnDay = days_of_week[b.getDay()];

  /* zodiac */
  const zodiac = getZodiac(b.getMonth() + 1, b.getDate());

  return {
    years, months, days,
    totalDays, totalWeeks, totalMonths,
    totalHours, totalMins,
    daysToNextBday, nextBdayAge,
    nextBdayDate: nextBday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    bornOnDay, zodiac
  };
}

function getZodiac(month, day) {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: 'Aries',       emoji: '♈' };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: 'Taurus',      emoji: '♉' };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: 'Gemini',      emoji: '♊' };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: 'Cancer',      emoji: '♋' };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: 'Leo',         emoji: '♌' };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: 'Virgo',       emoji: '♍' };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: 'Libra',      emoji: '♎' };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: 'Scorpio',   emoji: '♏' };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: 'Sagittarius', emoji: '♐' };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: 'Capricorn',  emoji: '♑' };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: 'Aquarius',    emoji: '♒' };
  return { sign: 'Pisces', emoji: '♓' };
}

function fmtNum(n) {
  return n.toLocaleString('en-US');
}

/* ── Age card canvas renderer ── */
function downloadAgeCard(result, name, birthDate) {
  const W = 900, H = 520;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  /* ── background gradient ── */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#13131c');
  bg.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  /* ── decorative top gradient bar ── */
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, '#818cf8');
  bar.addColorStop(1, '#38bdf8');
  ctx.fillStyle = bar;
  roundRect(ctx, 0, 0, W, 6, 0);
  ctx.fill();

  /* ── glowing circle accent ── */
  const glow = ctx.createRadialGradient(W - 100, 100, 0, W - 100, 100, 200);
  glow.addColorStop(0, 'rgba(129,140,248,0.18)');
  glow.addColorStop(1, 'rgba(129,140,248,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(W - 100, 100, 200, 0, Math.PI * 2); ctx.fill();

  /* ── logo text top-left ── */
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillText('thetoolempire.com', 36, 44);

  /* ── name / title ── */
  const displayName = (name && name.trim()) ? name.trim() : 'My Age Card';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px Inter, system-ui, sans-serif';
  ctx.fillText(displayName, 36, 100);

  /* birth date subtitle */
  const bDate = birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '400 15px Inter, system-ui, sans-serif';
  ctx.fillText(bDate ? `Born  ${bDate}  ·  ${result.bornOnDay}` : '', 36, 126);

  /* ── big age number ── */
  const ageGrad = ctx.createLinearGradient(36, 140, 36 + 260, 260);
  ageGrad.addColorStop(0, '#818cf8');
  ageGrad.addColorStop(1, '#38bdf8');
  ctx.fillStyle = ageGrad;
  ctx.font = '900 130px Inter, system-ui, sans-serif';
  ctx.fillText(String(result.years), 30, 272);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '500 18px Inter, system-ui, sans-serif';
  ctx.fillText('YEARS OLD', 38, 302);

  /* ── divider ── */
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(36, 322); ctx.lineTo(W - 36, 322); ctx.stroke();

  /* ── stats row ── */
  const stats = [
    { label: 'Months', val: fmtNum(result.totalMonths) },
    { label: 'Weeks',  val: fmtNum(result.totalWeeks)  },
    { label: 'Days',   val: fmtNum(result.totalDays)   },
    { label: 'Hours',  val: fmtNum(result.totalHours)  },
  ];
  const colW = (W - 72) / stats.length;
  stats.forEach((s, i) => {
    const x = 36 + i * colW;
    /* value */
    const vGrad = ctx.createLinearGradient(x, 0, x + colW, 0);
    vGrad.addColorStop(0, '#818cf8'); vGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = vGrad;
    ctx.font = '800 26px Inter, system-ui, sans-serif';
    ctx.fillText(s.val, x, 368);
    /* label */
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 12px Inter, system-ui, sans-serif';
    ctx.fillText(s.label.toUpperCase(), x, 390);
  });

  /* ── divider 2 ── */
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.moveTo(36, 410); ctx.lineTo(W - 36, 410); ctx.stroke();

  /* ── bottom row: zodiac + next birthday ── */
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillText(`${result.zodiac.emoji}  ${result.zodiac.sign}`, 36, 445);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  const bdayText = `🎂  Next birthday: ${result.nextBdayDate}  ·  ${result.daysToNextBday} days away`;
  ctx.fillText(bdayText, 36, 472);

  /* ── years / months / days exact ── */
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '400 12px Inter, system-ui, sans-serif';
  ctx.fillText(`Exact: ${result.years} yrs, ${result.months} mo, ${result.days} d`, 36, 500);

  /* ── watermark right ── */
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.font = '500 12px Inter, system-ui, sans-serif';
  const wm = 'Generated by thetoolempire.com';
  const wmW = ctx.measureText(wm).width;
  ctx.fillText(wm, W - 36 - wmW, 500);

  /* ── download ── */
  const link = document.createElement('a');
  link.download = `age-card-${(name || 'my-age').toLowerCase().replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ── Alpine.js component ── */
function ageCalcApp() {
  return {
    birthDate: '',
    toDate: '',
    cardName: '',
    result: null,
    hasResult: false,
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,

    init() {
      /* default toDate = today */
      this.toDate = new Date().toISOString().slice(0, 10);
      document.addEventListener('scroll', () => {
        const h = document.querySelector('.site-header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    },

    setQuickBirth(yearsAgo) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - yearsAgo);
      this.birthDate = d.toISOString().slice(0, 10);
      this.calculate();
    },

    calculate() {
      if (!this.birthDate || !this.toDate) return;
      const r = calcAge(this.birthDate, this.toDate);
      if (!r) { this.result = null; this.hasResult = false; return; }
      this.result = r;
      this.hasResult = true;
    },

    reset() {
      this.birthDate = '';
      this.toDate = new Date().toISOString().slice(0, 10);
      this.result = null;
      this.hasResult = false;
    },

    downloadCard() {
      if (!this.result) return;
      downloadAgeCard(this.result, this.cardName, this.birthDate);
      this.showToast('Age card downloaded!');
    },

    copyResult() {
      if (!this.result) return;
      const r = this.result;
      const text = `Age: ${r.years} years, ${r.months} months, ${r.days} days\n` +
                   `Total days: ${fmtNum(r.totalDays)}\n` +
                   `Total weeks: ${fmtNum(r.totalWeeks)}\n` +
                   `Next birthday: ${r.nextBdayDate} (${r.daysToNextBday} days away)`;
      navigator.clipboard.writeText(text)
        .then(() => this.showToast('Copied to clipboard!'))
        .catch(() => this.showToast('Copy failed'));
    },

    get fmtTotalDays()   { return this.result ? fmtNum(this.result.totalDays)   : ''; },
    get fmtTotalWeeks()  { return this.result ? fmtNum(this.result.totalWeeks)  : ''; },
    get fmtTotalMonths() { return this.result ? fmtNum(this.result.totalMonths) : ''; },
    get fmtTotalHours()  { return this.result ? fmtNum(this.result.totalHours)  : ''; },
    get fmtTotalMins()   { return this.result ? fmtNum(this.result.totalMins)   : ''; },

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
        const el = document.getElementById('age-toast');
        if (el) el.classList.add('show');
        this._toastTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2500);
      });
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
