/* ── Unix Timestamp Converter Alpine component ── */

const TIMEZONES = [
  'UTC','Africa/Cairo','Africa/Johannesburg','Africa/Lagos','America/Chicago',
  'America/Denver','America/Los_Angeles','America/New_York','America/Phoenix',
  'America/Sao_Paulo','America/Toronto','Asia/Bangkok','Asia/Colombo',
  'Asia/Dubai','Asia/Hong_Kong','Asia/Jakarta','Asia/Karachi','Asia/Kolkata',
  'Asia/Kuala_Lumpur','Asia/Seoul','Asia/Shanghai','Asia/Singapore',
  'Asia/Taipei','Asia/Tehran','Asia/Tokyo','Australia/Brisbane',
  'Australia/Melbourne','Australia/Sydney','Europe/Amsterdam','Europe/Berlin',
  'Europe/Istanbul','Europe/London','Europe/Madrid','Europe/Moscow',
  'Europe/Paris','Europe/Rome','Europe/Stockholm','Pacific/Auckland',
  'Pacific/Honolulu','Pacific/Sydney',
];

const FORMAT_TOKENS = {
  'YYYY': d => d.getFullYear(),
  'MM':   d => String(d.getMonth()+1).padStart(2,'0'),
  'DD':   d => String(d.getDate()).padStart(2,'0'),
  'HH':   d => String(d.getHours()).padStart(2,'0'),
  'mm':   d => String(d.getMinutes()).padStart(2,'0'),
  'ss':   d => String(d.getSeconds()).padStart(2,'0'),
  'SSS':  d => String(d.getMilliseconds()).padStart(3,'0'),
  'ddd':  d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()],
  'dddd': d => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()],
  'MMM':  d => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()],
  'MMMM':d => ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()],
  'X':    d => Math.floor(d.getTime()/1000),
  'x':    d => d.getTime(),
};

const MILESTONES = [
  { name: 'Unix Epoch',          ts: 0,           label: 'Jan 1, 1970 00:00:00 UTC' },
  { name: 'Y2K (Jan 1, 2000)',   ts: 946684800,   label: 'Jan 1, 2000 00:00:00 UTC' },
  { name: '1 Billion seconds',   ts: 1000000000,  label: 'Sep 9, 2001 01:46:40 UTC' },
  { name: '2 Billion seconds',   ts: 2000000000,  label: 'May 18, 2033 03:33:20 UTC' },
  { name: 'Y2K38 Problem',       ts: 2147483647,  label: 'Jan 19, 2038 03:14:07 UTC' },
  { name: '32-bit overflow',     ts: 2147483648,  label: 'Jan 19, 2038 03:14:08 UTC' },
  { name: 'Unix turns 50',       ts: 1000000000 + 60*60*24*365.25*21, label: 'Approx. Mar 2022' },
  { name: 'Year 2100',           ts: 4102444800,  label: 'Jan 1, 2100 00:00:00 UTC' },
];

function applyTz(date, tz) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',
      hour12: false,
    }).format(date);
  } catch { return 'Invalid timezone'; }
}

function formatWith(date, fmt) {
  if (!date || isNaN(date.getTime())) return '';
  let result = fmt;
  const tokens = Object.keys(FORMAT_TOKENS).sort((a,b) => b.length - a.length);
  tokens.forEach(t => {
    result = result.split(t).join(FORMAT_TOKENS[t](date));
  });
  return result;
}

function timestampApp() {
  return {
    /* ── Live clock ── */
    nowTs: Math.floor(Date.now()/1000),
    nowMs: Date.now(),
    _clockInterval: null,

    /* ── Timestamp → Date ── */
    tsInput: '',
    tsUnit: 'auto',
    tsTimezone: 'UTC',
    tsResult: null,
    tsError: '',

    /* ── Date → Timestamp ── */
    dtYear: '',
    dtMonth: '',
    dtDay: '',
    dtHour: '0',
    dtMinute: '0',
    dtSecond: '0',
    dtTimezone: 'UTC',
    dtResult: null,
    dtError: '',

    /* ── Diff ── */
    diffA: '',
    diffB: '',
    diffResult: null,

    /* ── Custom format ── */
    fmtTs: '',
    fmtPattern: 'YYYY-MM-DD HH:mm:ss',
    fmtResult: '',

    /* ── Milestones ── */
    milestones: MILESTONES,
    timezones: TIMEZONES,

    /* ── Init ── */
    init() {
      this._clockInterval = setInterval(() => {
        this.nowTs = Math.floor(Date.now()/1000);
        this.nowMs = Date.now();
      }, 1000);
      const n = new Date();
      this.dtYear  = n.getFullYear();
      this.dtMonth = n.getMonth()+1;
      this.dtDay   = n.getDate();
    },

    destroy() { clearInterval(this._clockInterval); },

    /* ── Now → inputs ── */
    useNowAsTs() {
      this.tsInput = String(this.nowTs);
      this.tsUnit = 'seconds';
      this.convertTs();
    },
    useNowAsDt() {
      const n = new Date();
      this.dtYear   = n.getUTCFullYear();
      this.dtMonth  = n.getUTCMonth()+1;
      this.dtDay    = n.getUTCDate();
      this.dtHour   = n.getUTCHours();
      this.dtMinute = n.getUTCMinutes();
      this.dtSecond = n.getUTCSeconds();
      this.dtTimezone = 'UTC';
      this.convertDt();
    },

    /* ── Detect unit ── */
    _detectUnit(raw) {
      const n = Math.abs(parseFloat(raw));
      if (n > 1e12) return 'milliseconds';
      return 'seconds';
    },

    /* ── Timestamp → Date conversion ── */
    convertTs() {
      this.tsError = '';
      this.tsResult = null;
      const raw = this.tsInput.trim();
      if (!raw) return;
      const num = parseFloat(raw);
      if (isNaN(num)) { this.tsError = 'Invalid timestamp — enter a number.'; return; }
      const unit = this.tsUnit === 'auto' ? this._detectUnit(raw) : this.tsUnit;
      const ms = unit === 'milliseconds' ? num : unit === 'microseconds' ? num / 1000 : num * 1000;
      const d = new Date(ms);
      if (isNaN(d.getTime()) || d.getFullYear() < 1970 || d.getFullYear() > 9999) {
        this.tsError = 'Timestamp out of range. Valid range: 1970–9999.';
        return;
      }
      const tz = this.tsTimezone;
      this.tsResult = {
        utc:        d.toUTCString(),
        iso:        d.toISOString(),
        local:      d.toLocaleString(),
        relative:   this._relativeTime(d),
        tz:         applyTz(d, tz),
        tzName:     tz,
        weekday:    ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getUTCDay()],
        dayOfYear:  Math.ceil((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1,
        weekNum:    this._isoWeek(d),
        ts_sec:     Math.floor(ms/1000),
        ts_ms:      Math.floor(ms),
      };
    },

    /* ── Date → Timestamp conversion ── */
    convertDt() {
      this.dtError = '';
      this.dtResult = null;
      const y = parseInt(this.dtYear), mo = parseInt(this.dtMonth), d = parseInt(this.dtDay);
      const h = parseInt(this.dtHour)||0, mi = parseInt(this.dtMinute)||0, s = parseInt(this.dtSecond)||0;
      if (!y || !mo || !d) { this.dtError = 'Fill in year, month, and day.'; return; }
      if (mo < 1 || mo > 12) { this.dtError = 'Month must be 1–12.'; return; }
      if (d < 1 || d > 31)   { this.dtError = 'Day must be 1–31.'; return; }
      let date;
      if (this.dtTimezone === 'UTC') {
        date = new Date(Date.UTC(y, mo-1, d, h, mi, s));
      } else {
        const isoStr = `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        try {
          const offset = this._tzOffset(this.dtTimezone, new Date(isoStr));
          date = new Date(new Date(isoStr).getTime() - offset * 60000);
        } catch { date = new Date(isoStr); }
      }
      if (isNaN(date.getTime())) { this.dtError = 'Invalid date. Check the values.'; return; }
      this.dtResult = {
        seconds: Math.floor(date.getTime()/1000),
        milliseconds: date.getTime(),
        iso: date.toISOString(),
        utc: date.toUTCString(),
      };
    },

    /* ── Diff calculation ── */
    calcDiff() {
      const a = parseFloat(this.diffA), b = parseFloat(this.diffB);
      if (isNaN(a) || isNaN(b)) { this.diffResult = null; return; }
      const ua = this._detectUnit(this.diffA), ub = this._detectUnit(this.diffB);
      const aMs = ua === 'milliseconds' ? a : a * 1000;
      const bMs = ub === 'milliseconds' ? b : b * 1000;
      const diffMs = Math.abs(bMs - aMs);
      const sec = diffMs / 1000;
      this.diffResult = {
        seconds: Math.round(sec),
        minutes: (sec / 60).toFixed(2),
        hours:   (sec / 3600).toFixed(4),
        days:    (sec / 86400).toFixed(4),
        weeks:   (sec / 604800).toFixed(4),
        years:   (sec / 31557600).toFixed(4),
        ms:      Math.round(diffMs),
      };
    },

    /* ── Custom format ── */
    applyFormat() {
      const raw = this.fmtTs.trim();
      if (!raw) { this.fmtResult = ''; return; }
      const num = parseFloat(raw);
      if (isNaN(num)) { this.fmtResult = 'Invalid timestamp'; return; }
      const unit = this._detectUnit(raw);
      const ms = unit === 'milliseconds' ? num : num * 1000;
      const d = new Date(ms);
      this.fmtResult = formatWith(d, this.fmtPattern);
    },

    /* ── Load milestone ── */
    loadMilestone(ts) {
      this.tsInput = String(ts);
      this.tsUnit = 'seconds';
      this.convertTs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /* ── Helpers ── */
    _relativeTime(d) {
      const diff = (Date.now() - d.getTime()) / 1000;
      const abs = Math.abs(diff);
      const past = diff > 0;
      if (abs < 60) return past ? `${Math.round(abs)} seconds ago` : `in ${Math.round(abs)} seconds`;
      if (abs < 3600) { const m = Math.round(abs/60); return past ? `${m} minute${m>1?'s':''} ago` : `in ${m} minute${m>1?'s':''}`; }
      if (abs < 86400) { const h = Math.round(abs/3600); return past ? `${h} hour${h>1?'s':''} ago` : `in ${h} hour${h>1?'s':''}`; }
      if (abs < 2592000) { const day = Math.round(abs/86400); return past ? `${day} day${day>1?'s':''} ago` : `in ${day} day${day>1?'s':''}`; }
      if (abs < 31557600) { const mo = Math.round(abs/2592000); return past ? `${mo} month${mo>1?'s':''} ago` : `in ${mo} month${mo>1?'s':''}`; }
      const yr = Math.round(abs/31557600); return past ? `${yr} year${yr>1?'s':''} ago` : `in ${yr} year${yr>1?'s':''}`;
    },
    _isoWeek(d) {
      const jan4 = new Date(d.getFullYear(), 0, 4);
      return Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
    },
    _tzOffset(tz, date) {
      const utcStr = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(date);
      const tzStr  = new Intl.DateTimeFormat('en-US', { timeZone: tz,    year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(date);
      return (new Date(utcStr) - new Date(tzStr)) / 60000;
    },

    async _copy(text, label) {
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
