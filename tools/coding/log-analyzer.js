/* ── Log File Analyzer ── */

/* ─── Format detection patterns ─── */
const FORMATS = {
  apache: {
    name: 'Apache Combined',
    re: /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\S+)(?:\s+"([^"]*)")?(?:\s+"([^"]*)")?/
  },
  nginx: {
    name: 'Nginx',
    re: /^(\S+)\s+-\s+\S+\s+\[([^\]]+)\]\s+"([^"]+)"\s+(\d{3})\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"/
  },
  syslog: {
    name: 'Syslog',
    re: /^(\w{3}\s+\d+\s+[\d:]+)\s+(\S+)\s+([^:[\s]+)(?:\[(\d+)\])?:\s+(.*)/
  },
  json: {
    name: 'JSON Lines',
    re: null /* handled separately */
  },
  log4j: {
    name: 'Log4j/Logback',
    re: /^(\d{4}-\d{2}-\d{2}\s[\d:.,]+)\s+\[([^\]]+)\]\s+(TRACE|DEBUG|INFO|WARN|ERROR|FATAL)\s+([^\s]+)\s+-\s+(.*)/i
  },
  python: {
    name: 'Python Logging',
    re: /^(\d{4}-\d{2}-\d{2}\s[\d:,]+)\s+(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s+([^:]+):\s+(.*)/i
  },
  docker: {
    name: 'Docker / K8s',
    re: /^(\d{4}-\d{2}-\d{2}T[\d:.Z+-]+)\s+(stdout|stderr)\s+[A-Z]\s+(.*)/i
  },
  common: {
    name: 'Generic',
    re: /^(?:(\d{4}-\d{2}-\d{2}[T\s][\d:.,Z+-]+)\s+)?(?:\[?(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|CRITICAL|FATAL|NOTICE|SEVERE)\]?\s+)?(.*)/i
  }
};

const LEVELS = ['error','warn','info','debug','trace','other'];
const LEVEL_MAP = {
  fatal:'error', severe:'error', critical:'error',
  error:'error',
  warn:'warn', warning:'warn',
  info:'info', notice:'info',
  debug:'debug',
  trace:'trace'
};

/* ─── Parser ─── */
function detectFormat(lines) {
  const sample = lines.slice(0, 20).filter(l => l.trim());
  for (const [key, fmt] of Object.entries(FORMATS)) {
    if (key === 'json') {
      const hit = sample.filter(l => { try { JSON.parse(l); return true; } catch { return false; } });
      if (hit.length >= Math.min(3, sample.length * .5)) return 'json';
      continue;
    }
    if (!fmt.re) continue;
    const hit = sample.filter(l => fmt.re.test(l));
    if (hit.length >= Math.min(3, sample.length * .5)) return key;
  }
  return 'common';
}

function normLevel(raw) {
  if (!raw) return 'other';
  return LEVEL_MAP[(raw || '').toLowerCase()] || 'other';
}

function parseLine(line, fmt, idx) {
  if (!line.trim()) return null;
  const entry = { idx, raw: line, ts: '', level: 'other', message: line, source: '', ip: '', status: '' };

  if (fmt === 'json') {
    try {
      const obj = JSON.parse(line);
      entry.ts      = obj.timestamp || obj.time || obj.ts || obj['@timestamp'] || obj.date || '';
      entry.level   = normLevel(obj.level || obj.severity || obj.lvl || obj.log_level || '');
      entry.message = obj.message || obj.msg || obj.text || obj.body || JSON.stringify(obj);
      entry.source  = obj.logger || obj.service || obj.module || obj.name || '';
      entry.ip      = obj.ip || obj.remote_ip || obj.client_ip || '';
      entry.status  = String(obj.status || obj.status_code || obj.http_status || '');
      return entry;
    } catch { /* fall through to common */ }
  }

  if (fmt === 'apache' || fmt === 'nginx') {
    const m = FORMATS.apache.re.exec(line) || FORMATS.nginx.re.exec(line);
    if (m) {
      entry.ip     = m[1] || '';
      entry.ts     = m[2] || '';
      entry.source = (m[3] || '').split(' ')[0];
      entry.status = m[4] || '';
      entry.level  = normLevel(
        parseInt(m[4]) >= 500 ? 'error' :
        parseInt(m[4]) >= 400 ? 'warn'  :
        parseInt(m[4]) >= 300 ? 'info'  : 'debug'
      );
      entry.message = m[3] || line;
      return entry;
    }
  }

  if (fmt === 'syslog') {
    const m = FORMATS.syslog.re.exec(line);
    if (m) {
      entry.ts      = m[1] || '';
      entry.source  = (m[3] || '') + (m[4] ? `[${m[4]}]` : '');
      entry.message = m[5] || line;
      const lvlGuess = /err|crit|emerg|alert/i.test(entry.message) ? 'error' :
                       /warn/i.test(entry.message) ? 'warn' :
                       /info|notice/i.test(entry.message) ? 'info' : 'debug';
      entry.level = normLevel(lvlGuess);
      return entry;
    }
  }

  if (fmt === 'log4j') {
    const m = FORMATS.log4j.re.exec(line);
    if (m) {
      entry.ts      = m[1] || '';
      entry.source  = m[4] || '';
      entry.level   = normLevel(m[3] || '');
      entry.message = m[5] || line;
      return entry;
    }
  }

  if (fmt === 'python') {
    const m = FORMATS.python.re.exec(line);
    if (m) {
      entry.ts      = m[1] || '';
      entry.level   = normLevel(m[2] || '');
      entry.source  = m[3] || '';
      entry.message = m[4] || line;
      return entry;
    }
  }

  if (fmt === 'docker') {
    const m = FORMATS.docker.re.exec(line);
    if (m) {
      entry.ts      = m[1] || '';
      entry.source  = m[2] || '';
      entry.level   = normLevel(m[2] === 'stderr' ? 'error' : 'info');
      entry.message = m[3] || line;
      return entry;
    }
  }

  /* common / fallback */
  const m = FORMATS.common.re.exec(line);
  if (m) {
    entry.ts      = m[1] || '';
    entry.level   = normLevel(m[2] || '');
    entry.message = m[3] || line;
  }
  return entry;
}

function parseLog(text) {
  const lines = text.split(/\r?\n/);
  const fmt   = detectFormat(lines);
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const e = parseLine(lines[i], fmt, i);
    if (e) entries.push(e);
  }
  return { entries, format: fmt, totalLines: lines.length };
}

/* ─── Stats ─── */
function computeStats(entries) {
  const counts = { error:0, warn:0, info:0, debug:0, trace:0, other:0 };
  const ips = {}, statuses = {}, hours = {};

  for (const e of entries) {
    counts[e.level] = (counts[e.level] || 0) + 1;
    if (e.ip)     ips[e.ip]         = (ips[e.ip] || 0) + 1;
    if (e.status) statuses[e.status]= (statuses[e.status] || 0) + 1;

    /* hour bucket */
    const hr = _extractHour(e.ts);
    if (hr !== null) hours[hr] = (hours[hr] || { error:0,warn:0,info:0,debug:0,trace:0,other:0 }),
                     hours[hr][e.level]++;
  }

  const topIPs     = _topN(ips, 8);
  const topStatus  = _topN(statuses, 8);

  return { total: entries.length, counts, topIPs, topStatus, hours };
}

function _extractHour(ts) {
  if (!ts) return null;
  /* ISO or Apache-style */
  const m = ts.match(/(\d{2}):(\d{2}):\d{2}/);
  if (m) return m[1] + ':00';
  return null;
}

function _topN(obj, n) {
  return Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([k,v])=>({key:k,count:v}));
}

/* ─── Timeline bars ─── */
function buildTimeline(hours, maxBars = 24) {
  const keys = Object.keys(hours).sort();
  const slice = keys.slice(-maxBars);
  if (!slice.length) return [];

  const maxVal = slice.reduce((mx, k) => {
    const t = Object.values(hours[k]).reduce((s,v)=>s+v, 0);
    return Math.max(mx, t);
  }, 1);

  return slice.map(k => {
    const h = hours[k];
    const total = Object.values(h).reduce((s,v)=>s+v, 0);
    return {
      label: k,
      total,
      segs: LEVELS.map(lv => ({ level: lv, pct: Math.round((h[lv]||0) / maxVal * 100) }))
    };
  });
}

/* ─── Highlight search term ─── */
function highlightTerm(text, term) {
  if (!term) return _esc(text);
  const re = new RegExp('(' + _escRe(term) + ')', 'gi');
  return _esc(text).replace(re, '<mark style="background:#fef08a;color:#111">$1</mark>');
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}

/* ─── Alpine component ─── */
function logAnalyzerApp() {
  return {
    /* state */
    mobileMenuOpen: false,
    rawText:    '',
    entries:    [],
    format:     '',
    stats:      null,
    timeline:   [],
    dragging:   false,

    /* filters */
    searchTerm: '',
    filterLevel: '',
    filterStatus: '',
    filterIp: '',
    dateFrom: '',
    dateTo: '',

    /* pagination */
    page:     1,
    pageSize: 200,

    /* ui */
    loaded:    false,
    processing:false,
    hasData:   false,

    init() {},

    /* ─── ingest ─── */
    analyzeText() {
      const text = this.rawText.trim();
      if (!text) return;
      this._process(text);
    },

    handleFile(ev) {
      const file = ev.target.files?.[0] || ev.dataTransfer?.files?.[0];
      if (!file) return;
      ev.target.value = '';
      const reader = new FileReader();
      reader.onload = e => this._process(e.target.result);
      reader.readAsText(file);
    },

    handleDrop(ev) {
      ev.preventDefault();
      this.dragging = false;
      this.handleFile(ev);
    },

    _process(text) {
      this.processing = true;
      this.page = 1;
      this.rawText = text;
      setTimeout(() => {
        const result = parseLog(text);
        this.entries  = result.entries;
        this.format   = FORMATS[result.format]?.name || result.format;
        this.stats    = computeStats(result.entries);
        this.timeline = buildTimeline(this.stats.hours);
        this.loaded   = true;
        this.hasData  = this.entries.length > 0;
        this.processing = false;
        this._toast(`Parsed ${this.entries.length.toLocaleString()} log entries`);
      }, 10);
    },

    /* ─── filtered view ─── */
    get filtered() {
      let rows = this.entries;
      if (this.filterLevel) rows = rows.filter(e => e.level === this.filterLevel);
      if (this.filterStatus) rows = rows.filter(e => e.status === this.filterStatus);
      if (this.filterIp) {
        const ip = this.filterIp.toLowerCase();
        rows = rows.filter(e => e.ip.toLowerCase().includes(ip));
      }
      if (this.searchTerm) {
        const s = this.searchTerm.toLowerCase();
        rows = rows.filter(e =>
          e.message.toLowerCase().includes(s) ||
          e.source.toLowerCase().includes(s) ||
          e.ts.toLowerCase().includes(s)
        );
      }
      return rows;
    },

    get paged() {
      const f = this.filtered;
      const start = (this.page - 1) * this.pageSize;
      return f.slice(start, start + this.pageSize);
    },

    get totalPages() {
      return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    },

    prevPage() { if (this.page > 1) this.page--; },
    nextPage() { if (this.page < this.totalPages) this.page++; },

    resetFilters() {
      this.searchTerm = '';
      this.filterLevel = '';
      this.filterStatus = '';
      this.filterIp = '';
      this.dateFrom = '';
      this.dateTo = '';
      this.page = 1;
    },

    /* ─── row rendering ─── */
    rowHtml(e) {
      return highlightTerm(e.message.length > 300 ? e.message.slice(0,300) + '…' : e.message, this.searchTerm);
    },

    /* ─── timeline ─── */
    get timelineData() {
      return this.timeline;
    },

    /* ─── top patterns ─── */
    get topIPs() { return this.stats?.topIPs || []; },
    get topStatus() { return this.stats?.topStatus || []; },
    get topMaxIP() { return (this.stats?.topIPs?.[0]?.count || 1); },
    get topMaxStatus() { return (this.stats?.topStatus?.[0]?.count || 1); },

    /* ─── sample ─── */
    loadSample() {
      const sample = `2024-01-15 08:00:01,234 [main] INFO  com.app.Server - Starting application server on port 8080
2024-01-15 08:00:02,567 [main] INFO  com.app.Database - Connected to PostgreSQL at localhost:5432
2024-01-15 08:00:03,890 [main] DEBUG com.app.Config - Loaded 48 configuration properties
2024-01-15 08:01:15,123 [http-1] INFO  com.app.Request - GET /api/users 200 45ms 192.168.1.10
2024-01-15 08:01:16,456 [http-2] INFO  com.app.Request - POST /api/login 200 120ms 192.168.1.20
2024-01-15 08:01:17,789 [http-3] WARN  com.app.Auth - Failed login attempt for user admin from 10.0.0.5
2024-01-15 08:01:18,012 [http-4] WARN  com.app.Auth - Failed login attempt for user root from 10.0.0.5
2024-01-15 08:01:20,345 [http-5] ERROR com.app.Request - GET /api/orders 500 Failed to connect to payment service
2024-01-15 08:01:21,678 [http-6] INFO  com.app.Request - GET /api/products 200 33ms 192.168.1.10
2024-01-15 08:02:00,901 [scheduler] DEBUG com.app.Jobs - Running cleanup job for expired sessions
2024-01-15 08:02:01,234 [scheduler] INFO  com.app.Jobs - Removed 127 expired sessions
2024-01-15 08:02:15,567 [http-7] ERROR com.app.Database - Query timeout after 5000ms: SELECT * FROM orders WHERE...
2024-01-15 08:02:16,890 [http-8] WARN  com.app.Request - Slow response GET /api/reports 3420ms 192.168.1.30
2024-01-15 08:02:20,123 [http-9] INFO  com.app.Request - GET /api/users/42 200 28ms 192.168.1.10
2024-01-15 08:02:22,456 [http-10] DEBUG com.app.Cache - Cache hit for key users:42
2024-01-15 08:03:01,789 [http-11] ERROR com.app.Auth - JWT token validation failed: signature mismatch from 172.16.0.8
2024-01-15 08:03:02,012 [http-12] INFO  com.app.Request - DELETE /api/sessions/abc123 200 12ms 192.168.1.20
2024-01-15 08:03:30,345 [monitor] WARN  com.app.System - Memory usage at 82% (heap: 1.6GB / 2GB)
2024-01-15 08:03:31,678 [monitor] INFO  com.app.System - CPU usage: 24% over last 60 seconds
2024-01-15 08:04:00,901 [http-13] ERROR com.app.Request - POST /api/checkout 503 Payment gateway timeout 10.0.0.5
2024-01-15 08:04:01,234 [http-14] INFO  com.app.Request - GET /api/health 200 3ms 10.0.0.1
2024-01-15 08:04:45,567 [http-15] WARN  com.app.RateLimit - Rate limit exceeded for IP 10.0.0.5 (120 req/min)
2024-01-15 08:05:00,890 [scheduler] DEBUG com.app.Jobs - Heartbeat check completed — all services healthy
2024-01-15 08:05:10,123 [http-16] ERROR com.app.Database - Connection pool exhausted, dropping request
2024-01-15 08:05:11,456 [http-17] INFO  com.app.Request - GET /api/categories 200 55ms 192.168.1.10`;
      this._process(sample);
    },

    /* ─── download ─── */
    download() {
      const rows = this.filtered;
      const lines = rows.map(e => `${e.ts}\t${e.level.toUpperCase()}\t${e.source}\t${e.message}`).join('\n');
      const blob = new Blob([lines], { type: 'text/plain' });
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: 'filtered-logs.txt'
      });
      a.click(); URL.revokeObjectURL(a.href);
      this._toast('Downloaded filtered logs');
    },

    clear() {
      this.rawText = '';
      this.entries = [];
      this.stats = null;
      this.timeline = [];
      this.loaded = false;
      this.hasData = false;
      this.resetFilters();
      this.format = '';
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    }
  };
}
