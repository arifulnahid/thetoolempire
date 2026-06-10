/* ── GPX Viewer — core logic + Alpine component ── */

/* module-level instances — kept outside Alpine proxy */
let _map       = null;
let _polyline  = null;
let _wptGroup  = null;
let _elevChart = null;

const EARTH_R = 6371000;

/* ── maths ── */
function haversine(a, b) {
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const s = Math.sin(dLat/2)**2 +
            Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/* ── GPX parser ── */
function parseGPX(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror'))
    throw new Error('Invalid file — not well-formed XML.');

  function pt(el, latAttr = 'lat', lonAttr = 'lon') {
    const lat = parseFloat(el.getAttribute(latAttr));
    const lon = parseFloat(el.getAttribute(lonAttr));
    if (isNaN(lat) || isNaN(lon)) return null;
    return {
      lat, lon,
      ele:  parseFloat(el.querySelector('ele')?.textContent  ?? 'NaN'),
      time: el.querySelector('time')?.textContent?.trim()   || null,
    };
  }

  const tracks = [];

  doc.querySelectorAll('trk').forEach(trk => {
    const name   = trk.querySelector('name')?.textContent?.trim() || 'Track';
    const points = [];
    trk.querySelectorAll('trkpt').forEach(tp => { const p = pt(tp); if (p) points.push(p); });
    if (points.length) tracks.push({ name, points });
  });

  doc.querySelectorAll('rte').forEach(rte => {
    const name   = rte.querySelector('name')?.textContent?.trim() || 'Route';
    const points = [];
    rte.querySelectorAll('rtept').forEach(tp => { const p = pt(tp); if (p) points.push(p); });
    if (points.length) tracks.push({ name, points });
  });

  const waypoints = [];
  doc.querySelectorAll('wpt').forEach(wpt => {
    const p = pt(wpt);
    if (!p) return;
    waypoints.push({
      ...p,
      name: wpt.querySelector('name')?.textContent?.trim() || 'Waypoint',
      desc: wpt.querySelector('desc')?.textContent?.trim() || '',
      sym:  wpt.querySelector('sym')?.textContent?.trim()  || '',
    });
  });

  if (!tracks.length && !waypoints.length)
    throw new Error('No tracks, routes, or waypoints found in this GPX file.');

  return {
    name:     doc.querySelector('metadata > name')?.textContent?.trim() || tracks[0]?.name || 'GPX File',
    creator:  doc.documentElement.getAttribute('creator') || '',
    tracks,
    waypoints,
  };
}

/* ── stats ── */
function calcStats(points) {
  let dist = 0, gain = 0, loss = 0;
  let maxEle = -Infinity, minEle = Infinity;
  const hasEle = points.some(p => !isNaN(p.ele));

  for (let i = 1; i < points.length; i++) {
    dist += haversine(points[i-1], points[i]);
    if (hasEle && !isNaN(points[i].ele) && !isNaN(points[i-1].ele)) {
      const d = points[i].ele - points[i-1].ele;
      if (d > 0) gain += d; else loss += -d;
    }
  }
  points.forEach(p => {
    if (!isNaN(p.ele)) { maxEle = Math.max(maxEle, p.ele); minEle = Math.min(minEle, p.ele); }
  });

  let duration = null, avgSpeed = null, maxSpeed = 0;
  const hasTimes = !!(points[0]?.time && points[points.length - 1]?.time);
  if (hasTimes) {
    const dt = new Date(points[points.length-1].time) - new Date(points[0].time);
    duration = dt / 1000;
    if (duration > 0) avgSpeed = (dist / 1000) / (duration / 3600);
    for (let i = 1; i < points.length; i++) {
      if (!points[i].time || !points[i-1].time) continue;
      const seg = (new Date(points[i].time) - new Date(points[i-1].time)) / 1000;
      if (seg > 0) {
        const spd = (haversine(points[i-1], points[i]) / 1000) / (seg / 3600);
        if (spd < 200) maxSpeed = Math.max(maxSpeed, spd); // sanity cap
      }
    }
  }

  return {
    dist,
    gain:      hasEle ? gain  : null,
    loss:      hasEle ? loss  : null,
    maxEle:    isFinite(maxEle) ? maxEle : null,
    minEle:    isFinite(minEle) ? minEle : null,
    duration,
    avgSpeed,
    maxSpeed:  maxSpeed > 0 ? maxSpeed : null,
    pointCount: points.length,
    startTime:  hasTimes ? points[0].time : null,
    endTime:    hasTimes ? points[points.length-1].time : null,
  };
}

/* ── formatters ── */
function fmtDist(m) {
  if (m == null) return '—';
  return m >= 1000 ? (m / 1000).toFixed(2) + ' km' : Math.round(m) + ' m';
}
function fmtEle(m) {
  if (m == null || isNaN(m)) return '—';
  return Math.round(m) + ' m';
}
function fmtDuration(secs) {
  if (!secs || secs < 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
function fmtSpeed(kmh) {
  return kmh == null ? '—' : kmh.toFixed(1) + ' km/h';
}
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { dateStyle:'medium', timeStyle:'short' }); }
  catch { return iso; }
}

/* ── Leaflet map ── */
function initMap(points, waypoints) {
  if (_map) { _map.remove(); _map = null; _polyline = null; _wptGroup = null; }

  _map = L.map('gpx-map', { zoomControl: true });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
  }).addTo(_map);

  if (points.length) {
    const lls = points.map(p => [p.lat, p.lon]);
    _polyline = L.polyline(lls, { color: '#22c55e', weight: 3.5, opacity: .9 }).addTo(_map);

    const mkIcon = (bg) => L.divIcon({
      className: '',
      html: `<div style="width:13px;height:13px;background:${bg};border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 5px rgba(0,0,0,.6)"></div>`,
      iconSize: [13,13], iconAnchor: [6,6],
    });

    L.marker([points[0].lat, points[0].lon], { icon: mkIcon('#22c55e') })
      .bindPopup('<strong>Start</strong>' + (points[0].time ? '<br>' + fmtDate(points[0].time) : ''))
      .addTo(_map);

    if (points.length > 1) {
      const last = points[points.length - 1];
      L.marker([last.lat, last.lon], { icon: mkIcon('#ef4444') })
        .bindPopup('<strong>End</strong>' + (last.time ? '<br>' + fmtDate(last.time) : ''))
        .addTo(_map);
    }

    _map.fitBounds(_polyline.getBounds(), { padding: [28, 28] });
  }

  if (waypoints.length) {
    _wptGroup = L.layerGroup().addTo(_map);
    const wIcon = L.divIcon({
      className: '',
      html: '<div style="width:11px;height:11px;background:#f59e0b;border:2px solid #fff;border-radius:50%;"></div>',
      iconSize: [11,11], iconAnchor: [5,5],
    });
    waypoints.forEach(w => {
      L.marker([w.lat, w.lon], { icon: wIcon })
       .bindPopup(`<strong>${w.name}</strong>${w.desc ? '<br><em>' + w.desc + '</em>' : ''}`)
       .addTo(_wptGroup);
    });
    if (!points.length) _map.fitBounds(L.featureGroup([_wptGroup]).getBounds(), { padding: [28,28] });
  }
}

/* ── elevation chart ── */
function drawElevation(points) {
  const wrap   = document.getElementById('elev-wrap');
  const canvas = document.getElementById('elev-chart');
  if (!wrap || !canvas) return;

  const hasEle = points.some(p => !isNaN(p.ele));
  wrap.style.display = hasEle ? 'block' : 'none';
  if (!hasEle) return;

  if (_elevChart) { _elevChart.destroy(); _elevChart = null; }

  const step    = Math.max(1, Math.floor(points.length / 600));
  const sampled = points.filter((_, i) => i % step === 0);

  let cum = 0;
  const labels = sampled.map((p, i) => {
    if (i > 0) cum += haversine(sampled[i-1], p);
    return +(cum / 1000).toFixed(3);
  });

  _elevChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data:            sampled.map(p => isNaN(p.ele) ? null : Math.round(p.ele * 10) / 10),
        fill:            true,
        borderColor:     '#22c55e',
        backgroundColor: 'rgba(34,197,94,.1)',
        borderWidth:     1.5,
        pointRadius:     0,
        tension:         0.3,
        spanGaps:        true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => ctx[0].label + ' km',
            label: ctx => ctx.parsed.y + ' m',
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#64748b', maxTicksLimit: 8, callback: (_, i) => labels[i] + ' km' },
          grid:  { color: '#1e293b' },
        },
        y: {
          ticks: { color: '#64748b', callback: v => v + ' m' },
          grid:  { color: '#1e293b' },
        },
      },
    },
  });
}

/* ── Alpine component ── */
function gpxApp() {
  return {
    loaded:      false,
    dragging:    false,
    error:       '',
    fileName:    '',
    gpx:         null,
    stats:       null,
    activeTrack: 0,

    handleDrop(e) {
      this.dragging = false;
      const file = (e.dataTransfer?.files ?? e.target.files)?.[0];
      if (file) this.loadFile(file);
    },

    loadFile(file) {
      this.error = '';
      if (!file.name.toLowerCase().endsWith('.gpx')) {
        this.error = 'Please choose a .gpx file.';
        return;
      }
      this.fileName = file.name;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          this.gpx         = parseGPX(ev.target.result);
          this.activeTrack = 0;
          this.loaded      = true;
          this.$nextTick(() => this.renderTrack());
        } catch (err) {
          this.error = err.message;
        }
      };
      reader.readAsText(file);
    },

    selectTrack(i) {
      this.activeTrack = i;
      this.$nextTick(() => this.renderTrack());
    },

    renderTrack() {
      const pts    = this.currentPoints;
      this.stats   = pts.length ? calcStats(pts) : null;
      initMap(pts, this.gpx?.waypoints ?? []);
      drawElevation(pts);
    },

    get currentPoints() {
      return this.gpx?.tracks[this.activeTrack]?.points ?? [];
    },

    reset() {
      if (_map) { _map.remove(); _map = null; }
      if (_elevChart) { _elevChart.destroy(); _elevChart = null; }
      this.loaded = false; this.gpx = null; this.stats = null;
      this.fileName = ''; this.error = '';
    },

    /* expose formatters to template */
    fmtDist, fmtEle, fmtDuration, fmtSpeed, fmtDate,
  };
}
