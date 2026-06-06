/* ── Date Difference Calculator Alpine component ── */
function dateDiffApp() {
  return {
    /* ── Inputs ── */
    startDate: '',
    endDate: '',
    excludeWeekends: false,
    excludeHolidays: false,

    /* ── Result ── */
    result: null,
    error: '',

    /* ── Init ── */
    init() {
      const today = this._fmt(new Date());
      const later = this._fmt(new Date(Date.now() + 30 * 86400000));
      this.startDate = today;
      this.endDate   = later;
      this.calculate();
    },

    /* ── Swap dates ── */
    swap() {
      [this.startDate, this.endDate] = [this.endDate, this.startDate];
      this.calculate();
    },

    /* ── Presets ── */
    applyPreset(label) {
      const now = new Date();
      now.setHours(0,0,0,0);
      let start, end;
      switch (label) {
        case 'today-week':
          start = new Date(now);
          end   = new Date(now.getTime() + 7 * 86400000);
          break;
        case 'today-month':
          start = new Date(now);
          end   = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
        case 'today-year':
          start = new Date(now);
          end   = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
          break;
        case 'ytd':
          start = new Date(now.getFullYear(), 0, 1);
          end   = new Date(now);
          break;
        case 'this-quarter': {
          const q = Math.floor(now.getMonth() / 3);
          start = new Date(now.getFullYear(), q * 3, 1);
          end   = new Date(now.getFullYear(), q * 3 + 3, 0);
          break;
        }
        case 'this-year':
          start = new Date(now.getFullYear(), 0, 1);
          end   = new Date(now.getFullYear(), 11, 31);
          break;
        case 'last-30':
          start = new Date(now.getTime() - 30 * 86400000);
          end   = new Date(now);
          break;
        case 'last-90':
          start = new Date(now.getTime() - 90 * 86400000);
          end   = new Date(now);
          break;
        default:
          return;
      }
      this.startDate = this._fmt(start);
      this.endDate   = this._fmt(end);
      this.calculate();
    },

    /* ── Main calculation ── */
    calculate() {
      this.error  = '';
      this.result = null;
      if (!this.startDate || !this.endDate) return;

      const s = new Date(this.startDate + 'T00:00:00');
      const e = new Date(this.endDate   + 'T00:00:00');
      if (isNaN(s) || isNaN(e)) { this.error = 'Invalid date. Use YYYY-MM-DD format.'; return; }

      const sign   = e >= s ? 1 : -1;
      const earlier = sign === 1 ? s : e;
      const later   = sign === 1 ? e : s;
      const isPast  = sign === -1;

      // Total calendar days (absolute)
      const totalMs   = later - earlier;
      const totalDays = Math.round(totalMs / 86400000);

      // Y M D breakdown
      let ymd = this._ymd(earlier, later);

      // Weeks + remaining days
      const weeks    = Math.floor(totalDays / 7);
      const remDays  = totalDays % 7;

      // All units
      const totalWeeks   = totalDays / 7;
      const totalMonths  = totalDays / 30.4375;
      const totalYears   = totalDays / 365.25;
      const totalHours   = totalDays * 24;
      const totalMinutes = totalDays * 1440;
      const totalSeconds = totalDays * 86400;

      // Workdays (Mon–Fri)
      const workdays = this._countWorkdays(earlier, later);
      const weekendDays = totalDays - workdays;

      // Progress in year
      const yearStart   = new Date(earlier.getFullYear(), 0, 1);
      const yearEnd     = new Date(earlier.getFullYear() + 1, 0, 1);
      const yearProgress = ((earlier - yearStart) / (yearEnd - yearStart) * 100).toFixed(1);

      // Season at start date
      const season = this._season(earlier);

      // Day of week labels
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const startDay = days[earlier.getDay()];
      const endDay   = days[later.getDay()];

      // Which is leap year
      const startLeap = this._isLeap(earlier.getFullYear());
      const endLeap   = this._isLeap(later.getFullYear());

      // Days until/since
      const todayMs = new Date(); todayMs.setHours(0,0,0,0);
      const daysFromToday = Math.round((earlier.getTime() - todayMs.getTime()) / 86400000);

      this.result = {
        totalDays, totalMs, sign, isPast, earlier, later,
        ymd,
        weeks, remDays,
        totalWeeks:   totalWeeks.toFixed(2),
        totalMonths:  totalMonths.toFixed(2),
        totalYears:   totalYears.toFixed(4),
        totalHours:   Math.round(totalHours).toLocaleString(),
        totalMinutes: Math.round(totalMinutes).toLocaleString(),
        totalSeconds: Math.round(totalSeconds).toLocaleString(),
        workdays, weekendDays,
        yearProgress,
        season,
        startDay, endDay,
        startLeap, endLeap,
        // Timeline: progress of end within a 10-year range from start
        barPct: Math.min(100, (totalDays / 3650) * 100).toFixed(1),
      };
    },

    /* ── Y/M/D breakdown ── */
    _ymd(start, end) {
      let years  = end.getFullYear() - start.getFullYear();
      let months = end.getMonth()    - start.getMonth();
      let days   = end.getDate()     - start.getDate();
      if (days < 0) {
        months--;
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
      }
      if (months < 0) { years--; months += 12; }
      return { years, months, days };
    },

    /* ── Count Mon–Fri workdays ── */
    _countWorkdays(start, end) {
      let count = 0;
      const d = new Date(start);
      while (d < end) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    },

    /* ── Helpers ── */
    _fmt(d) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    _isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; },
    _season(d) {
      const m = d.getMonth() + 1, day = d.getDate();
      if ((m === 3 && day >= 20) || m === 4 || m === 5 || (m === 6 && day < 21)) return 'Spring 🌸';
      if ((m === 6 && day >= 21) || m === 7 || m === 8 || (m === 9 && day < 23)) return 'Summer ☀️';
      if ((m === 9 && day >= 23) || m === 10 || m === 11 || (m === 12 && day < 21)) return 'Autumn 🍂';
      return 'Winter ❄️';
    },

    get directionLabel() {
      if (!this.result) return '';
      if (this.result.totalDays === 0) return 'Same day';
      return this.result.isPast ? 'End date is before start date' : '';
    },

    async copyResult(text, label) {
      try { await navigator.clipboard.writeText(String(text)); this._toast(`${label} copied!`); }
      catch { this._toast('Copy failed'); }
    },
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
