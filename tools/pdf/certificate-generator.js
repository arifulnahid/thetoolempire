/* Certificate PDF Generator */

/* ── template definitions ──────────────────────────────────────────────────── */
const TEMPLATES = [
  { id: 'classic',    label: 'Classic'     },
  { id: 'modern',     label: 'Modern'      },
  { id: 'elegant',    label: 'Elegant'     },
  { id: 'bold',       label: 'Bold'        },
  { id: 'minimal',    label: 'Minimal'     },
  { id: 'academic',   label: 'Academic'    },
];

const PALETTE = [
  '#7c3aed','#2563eb','#0891b2','#059669','#d97706',
  '#dc2626','#db2777','#4f46e5',
];

const FONTS = [
  { id: 'serif',    label: 'Serif',      family: 'Georgia, "Times New Roman", serif' },
  { id: 'sans',     label: 'Sans-serif', family: 'system-ui, Arial, sans-serif'       },
  { id: 'mono',     label: 'Monospace',  family: '"Courier New", Courier, monospace'  },
  { id: 'cursive',  label: 'Cursive',    family: 'cursive'                            },
];

/* ── canvas helpers ─────────────────────────────────────────────────────────── */

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const l = v => Math.min(255, Math.round(v + (255 - v) * amt));
  return `rgb(${l(r)},${l(g)},${l(b)})`;
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const d = v => Math.max(0, Math.round(v * (1 - amt)));
  return `rgb(${d(r)},${d(g)},${d(b)})`;
}

function hexAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* Draw certificate on a canvas context (used for preview + PDF export).
   W/H are the logical dimensions; ctx is already scaled to them. */
function drawCertificate(ctx, W, H, cfg) {
  const { template, color, fontFamily, recipient, title, subtitle, date, issuer, description, orientation } = cfg;
  ctx.clearRect(0, 0, W, H);

  switch (template) {
    case 'classic':  drawClassic(ctx, W, H, cfg); break;
    case 'modern':   drawModern(ctx, W, H, cfg);  break;
    case 'elegant':  drawElegant(ctx, W, H, cfg); break;
    case 'bold':     drawBold(ctx, W, H, cfg);    break;
    case 'minimal':  drawMinimal(ctx, W, H, cfg); break;
    case 'academic': drawAcademic(ctx, W, H, cfg); break;
    default:         drawClassic(ctx, W, H, cfg);
  }
}

/* ── template renderers ─────────────────────────────────────────────────────── */

function drawClassic(ctx, W, H, { color, fontFamily, recipient, title, subtitle, date, issuer, description }) {
  /* parchment-like background */
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#fdf8f0');
  grad.addColorStop(1, '#f5ede0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  /* outer border */
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  /* inner double border */
  ctx.strokeStyle = hexAlpha(color, .4);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  /* corner ornaments */
  _corners(ctx, W, H, 42, color, 18);

  /* title */
  ctx.fillStyle = color;
  ctx.font = `bold ${H * .065}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title || 'Certificate of Achievement', W / 2, H * .22);

  /* subtitle stripe */
  ctx.fillStyle = hexAlpha(color, .12);
  ctx.fillRect(W * .1, H * .26, W * .8, 2);

  ctx.fillStyle = '#555';
  ctx.font = `italic ${H * .034}px ${fontFamily}`;
  ctx.fillText('This is to certify that', W / 2, H * .35);

  /* recipient */
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold ${H * .072}px ${fontFamily}`;
  _underlineText(ctx, recipient || 'Recipient Name', W / 2, H * .46, color);

  if (subtitle) {
    ctx.fillStyle = '#444';
    ctx.font = `${H * .032}px ${fontFamily}`;
    ctx.fillText(subtitle, W / 2, H * .55);
  }

  if (description) {
    ctx.fillStyle = '#666';
    ctx.font = `${H * .026}px ${fontFamily}`;
    _wrapText(ctx, description, W / 2, H * .61, W * .7, H * .034);
  }

  /* footer line */
  ctx.strokeStyle = hexAlpha(color, .35);
  ctx.lineWidth = 1;
  const fy = H * .76;
  _dashLine(ctx, W * .12, fy, W * .4, fy);
  _dashLine(ctx, W * .6, fy, W * .88, fy);

  ctx.fillStyle = '#555';
  ctx.font = `${H * .026}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(issuer || 'Issuing Authority', W * .26, fy + H * .04);
  ctx.fillText(date || 'Date', W * .74, fy + H * .04);

  ctx.fillStyle = '#999';
  ctx.font = `${H * .02}px ${fontFamily}`;
  ctx.fillText('Authorized Signature', W * .26, fy + H * .065);
  ctx.fillText('Date Issued', W * .74, fy + H * .065);
}

function drawModern(ctx, W, H, { color, fontFamily, recipient, title, subtitle, date, issuer, description }) {
  /* clean white background */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  /* left accent bar */
  const bar = ctx.createLinearGradient(0, 0, 0, H);
  bar.addColorStop(0, color);
  bar.addColorStop(1, darken(color, .3));
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, W * .06, H);

  /* top-right circle accent */
  ctx.beginPath();
  ctx.arc(W, 0, H * .45, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha(color, .07);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(W, 0, H * .3, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha(color, .08);
  ctx.fill();

  /* headline */
  ctx.fillStyle = color;
  ctx.font = `900 ${H * .05}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText((title || 'Certificate of Achievement').toUpperCase(), W * .1, H * .2);

  /* thin separator */
  ctx.fillStyle = color;
  ctx.fillRect(W * .1, H * .24, W * .08, 3);

  ctx.fillStyle = '#888';
  ctx.font = `${H * .03}px ${fontFamily}`;
  ctx.fillText('Presented to', W * .1, H * .32);

  /* recipient */
  ctx.fillStyle = '#111';
  ctx.font = `700 ${H * .075}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W * .1, H * .44);

  if (subtitle) {
    ctx.fillStyle = '#555';
    ctx.font = `${H * .032}px ${fontFamily}`;
    ctx.fillText(subtitle, W * .1, H * .52);
  }

  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${H * .026}px ${fontFamily}`;
    _wrapTextLeft(ctx, description, W * .1, H * .58, W * .72, H * .034);
  }

  /* bottom meta */
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * .1, H * .77); ctx.lineTo(W * .5, H * .77); ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = `600 ${H * .028}px ${fontFamily}`;
  ctx.fillText(issuer || 'Issuing Authority', W * .1, H * .83);
  ctx.fillStyle = '#888';
  ctx.font = `${H * .024}px ${fontFamily}`;
  ctx.fillText(date || 'Date', W * .1, H * .89);
}

function drawElegant(ctx, W, H, { color, fontFamily, recipient, title, subtitle, date, issuer, description }) {
  /* dark luxury background */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0d0d1a');
  bg.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* gold-toned border glow */
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(25, 25, W - 50, H - 50);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = hexAlpha(color, .3);
  ctx.lineWidth = 1;
  ctx.strokeRect(34, 34, W - 68, H - 68);

  /* corner diamonds */
  _diamonds(ctx, W, H, 38, color);

  /* ornate top divider */
  _ornament(ctx, W * .5, H * .15, color, W * .15);

  ctx.fillStyle = lighten(color, .6);
  ctx.font = `${H * .03}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('✦ ' + (title || 'Certificate of Excellence') + ' ✦', W / 2, H * .23);

  ctx.fillStyle = hexAlpha(color, .5);
  ctx.fillRect(W * .2, H * .27, W * .6, 1);

  ctx.fillStyle = '#aaa';
  ctx.font = `italic ${H * .028}px ${fontFamily}`;
  ctx.fillText('Awarded with distinction to', W / 2, H * .35);

  /* recipient in gold */
  ctx.fillStyle = lighten(color, .5);
  ctx.font = `bold ${H * .068}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W / 2, H * .46);

  if (subtitle) {
    ctx.fillStyle = '#bbb';
    ctx.font = `italic ${H * .03}px ${fontFamily}`;
    ctx.fillText(subtitle, W / 2, H * .54);
  }

  if (description) {
    ctx.fillStyle = '#888';
    ctx.font = `${H * .024}px ${fontFamily}`;
    _wrapText(ctx, description, W / 2, H * .6, W * .65, H * .032);
  }

  _ornament(ctx, W * .5, H * .72, color, W * .12);

  ctx.fillStyle = hexAlpha(color, .5);
  ctx.fillRect(W * .15, H * .77, W * .31, 1);
  ctx.fillRect(W * .54, H * .77, W * .31, 1);

  ctx.fillStyle = lighten(color, .4);
  ctx.font = `${H * .025}px ${fontFamily}`;
  ctx.fillText(issuer || 'Issuing Authority', W * .3, H * .83);
  ctx.fillText(date || 'Date', W * .7, H * .83);

  ctx.fillStyle = '#666';
  ctx.font = `${H * .019}px ${fontFamily}`;
  ctx.fillText('Signature', W * .3, H * .875);
  ctx.fillText('Date', W * .7, H * .875);
}

function drawBold(ctx, W, H, { color, fontFamily, recipient, title, subtitle, date, issuer, description }) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);

  /* white card area */
  ctx.fillStyle = '#fff';
  ctx.fillRect(W * .08, H * .12, W * .84, H * .76);

  /* accent stripe top of card */
  ctx.fillStyle = darken(color, .2);
  ctx.fillRect(W * .08, H * .12, W * .84, H * .07);

  /* geometric circles bottom-right */
  ctx.beginPath(); ctx.arc(W * .94, H * .95, H * .35, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha('#fff', .08); ctx.fill();
  ctx.beginPath(); ctx.arc(W * .94, H * .95, H * .22, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha('#fff', .08); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `900 ${H * .055}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText((title || 'Certificate').toUpperCase(), W / 2, H * .17);

  ctx.fillStyle = color;
  ctx.font = `900 ${H * .036}px ${fontFamily}`;
  ctx.fillText('OF ACHIEVEMENT', W / 2, H * .25);

  ctx.fillStyle = '#666';
  ctx.font = `${H * .03}px ${fontFamily}`;
  ctx.fillText('This certificate is proudly presented to', W / 2, H * .33);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${H * .072}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W / 2, H * .445);

  if (subtitle) {
    ctx.fillStyle = color;
    ctx.font = `600 ${H * .032}px ${fontFamily}`;
    ctx.fillText(subtitle, W / 2, H * .52);
  }

  if (description) {
    ctx.fillStyle = '#666';
    ctx.font = `${H * .026}px ${fontFamily}`;
    _wrapText(ctx, description, W / 2, H * .59, W * .66, H * .033);
  }

  /* footer divider */
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * .13, H * .74); ctx.lineTo(W * .44, H * .74); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * .56, H * .74); ctx.lineTo(W * .87, H * .74); ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = `600 ${H * .026}px ${fontFamily}`;
  ctx.fillText(issuer || 'Director', W * .285, H * .79);
  ctx.fillText(date || 'Date', W * .715, H * .79);
}

function drawMinimal(ctx, W, H, { color, fontFamily, recipient, title, subtitle, date, issuer, description }) {
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, W, H);

  /* thin top bar */
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H * .007);

  ctx.fillStyle = color;
  ctx.font = `300 ${H * .032}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText((title || 'CERTIFICATE OF ACHIEVEMENT').toUpperCase(), W / 2, H * .17);
  ctx.letterSpacing = '0px';

  ctx.strokeStyle = hexAlpha(color, .3);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * .35, H * .2); ctx.lineTo(W * .65, H * .2); ctx.stroke();

  ctx.fillStyle = '#ccc';
  ctx.font = `300 ${H * .025}px ${fontFamily}`;
  ctx.fillText('presented to', W / 2, H * .3);

  ctx.fillStyle = '#111';
  ctx.font = `300 ${H * .075}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W / 2, H * .43);

  if (subtitle) {
    ctx.fillStyle = '#888';
    ctx.font = `300 ${H * .03}px ${fontFamily}`;
    ctx.fillText(subtitle, W / 2, H * .51);
  }

  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * .2, H * .58); ctx.lineTo(W * .8, H * .58); ctx.stroke();

  if (description) {
    ctx.fillStyle = '#999';
    ctx.font = `300 ${H * .026}px ${fontFamily}`;
    _wrapText(ctx, description, W / 2, H * .64, W * .65, H * .033);
  }

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W * .18, H * .79); ctx.lineTo(W * .42, H * .79); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * .58, H * .79); ctx.lineTo(W * .82, H * .79); ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = `400 ${H * .025}px ${fontFamily}`;
  ctx.fillText(issuer || 'Authorized By', W * .3, H * .85);
  ctx.fillText(date || 'Date', W * .7, H * .85);

  /* thin bottom bar */
  ctx.fillStyle = color;
  ctx.fillRect(0, H - H * .007, W, H * .007);
}

function drawAcademic(ctx, W, H, { color, fontFamily, recipient, title, subtitle, date, issuer, description }) {
  /* cream background */
  ctx.fillStyle = '#fffef5';
  ctx.fillRect(0, 0, W, H);

  /* outer double border */
  ctx.strokeStyle = darken(color, .1);
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.strokeStyle = hexAlpha(color, .5);
  ctx.lineWidth = 1;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  /* top seal placeholder */
  ctx.beginPath(); ctx.arc(W / 2, H * .13, H * .07, 0, Math.PI * 2);
  ctx.fillStyle = hexAlpha(color, .1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.fill(); ctx.stroke();

  /* inner ring */
  ctx.beginPath(); ctx.arc(W / 2, H * .13, H * .055, 0, Math.PI * 2);
  ctx.strokeStyle = hexAlpha(color, .5); ctx.lineWidth = 1; ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `bold ${H * .045}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('★', W / 2, H * .145);

  ctx.fillStyle = '#333';
  ctx.font = `bold ${H * .04}px ${fontFamily}`;
  ctx.fillText(title || 'Certificate of Completion', W / 2, H * .26);

  ctx.fillStyle = hexAlpha(color, .6);
  const sw = W * .35;
  ctx.fillRect(W / 2 - sw / 2, H * .29, sw, 1.5);

  ctx.fillStyle = '#666';
  ctx.font = `italic ${H * .029}px ${fontFamily}`;
  ctx.fillText('This is to certify that', W / 2, H * .36);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${H * .066}px ${fontFamily}`;
  _underlineText(ctx, recipient || 'Recipient Name', W / 2, H * .455, color);

  if (subtitle) {
    ctx.fillStyle = '#555';
    ctx.font = `italic ${H * .03}px ${fontFamily}`;
    ctx.fillText('has successfully completed ' + subtitle, W / 2, H * .535);
  }

  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${H * .025}px ${fontFamily}`;
    _wrapText(ctx, description, W / 2, H * .61, W * .68, H * .032);
  }

  /* seal text */
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  const yl = H * .76;
  ctx.beginPath(); ctx.moveTo(W * .12, yl); ctx.lineTo(W * .4, yl); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W * .6, yl); ctx.lineTo(W * .88, yl); ctx.stroke();

  ctx.fillStyle = '#333';
  ctx.font = `600 ${H * .026}px ${fontFamily}`;
  ctx.fillText(issuer || 'Institution Name', W * .26, H * .82);
  ctx.fillText(date || 'Date', W * .74, H * .82);

  ctx.fillStyle = '#999';
  ctx.font = `${H * .02}px ${fontFamily}`;
  ctx.fillText('Director / Dean', W * .26, H * .86);
  ctx.fillText('Date of Issue', W * .74, H * .86);
}

/* ── shared drawing utilities ──────────────────────────────────────────────── */

function _corners(ctx, W, H, inset, color, size) {
  const pts = [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ];
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const dirs = [[1,1],[-1,1],[1,-1],[-1,-1]];
  pts.forEach(([x, y], i) => {
    const [dx, dy] = dirs[i];
    ctx.beginPath();
    ctx.moveTo(x + dx * size, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * size);
    ctx.stroke();
  });
}

function _diamonds(ctx, W, H, inset, color) {
  const pts = [
    [inset, inset],
    [W - inset, inset],
    [inset, H - inset],
    [W - inset, H - inset],
  ];
  ctx.fillStyle = color;
  const s = 7;
  pts.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
    ctx.closePath(); ctx.fill();
  });
}

function _ornament(ctx, cx, cy, color, halfW) {
  ctx.strokeStyle = hexAlpha(color, .6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - halfW, cy); ctx.lineTo(cx - halfW * .3, cy); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + halfW * .3, cy); ctx.lineTo(cx + halfW, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
}

function _dashLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function _underlineText(ctx, text, x, y, color) {
  ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width;
  ctx.strokeStyle = hexAlpha(color, .5);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + 6);
  ctx.lineTo(x + w / 2, y + 6);
  ctx.stroke();
}

function _wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, y);
      line = word; y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, y);
}

function _wrapTextLeft(ctx, text, lx, y, maxW, lineH) {
  const save = ctx.textAlign;
  ctx.textAlign = 'left';
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, lx, y);
      line = word; y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, lx, y);
  ctx.textAlign = save;
}

/* ── Alpine component ───────────────────────────────────────────────────────── */

let _previewCanvas = null;
let _previewCtx    = null;

// Thumbnail canvases rendered per template
const _thumbCtxs = {};

function certificateGeneratorApp() {
  return {
    template:    'classic',
    color:       '#7c3aed',
    fontId:      'serif',
    orientation: 'landscape',
    recipient:   '',
    title:       'Certificate of Achievement',
    subtitle:    '',
    date:        '',
    issuer:      '',
    description: '',

    templates: TEMPLATES,
    palette:   PALETTE,
    fonts:     FONTS,

    get fontFamily() {
      return FONTS.find(f => f.id === this.fontId)?.family || FONTS[0].family;
    },

    get cfg() {
      return {
        template:    this.template,
        color:       this.color,
        fontFamily:  this.fontFamily,
        recipient:   this.recipient,
        title:       this.title,
        subtitle:    this.subtitle,
        date:        this.date,
        issuer:      this.issuer,
        description: this.description,
        orientation: this.orientation,
      };
    },

    /* ── init ─────────────────────────────────── */
    init() {
      _previewCanvas = this.$refs.previewCanvas;
      _previewCtx    = _previewCanvas.getContext('2d');

      // set today as default date
      this.date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      this._renderThumbs();
      this.$nextTick(() => this.renderPreview());

      this.$watch('template',    () => this.renderPreview());
      this.$watch('color',       () => { this._renderThumbs(); this.renderPreview(); });
      this.$watch('fontId',      () => this.renderPreview());
      this.$watch('orientation', () => this.renderPreview());
      this.$watch('recipient',   () => this.renderPreview());
      this.$watch('title',       () => { this._renderThumbs(); this.renderPreview(); });
      this.$watch('subtitle',    () => this.renderPreview());
      this.$watch('date',        () => this.renderPreview());
      this.$watch('issuer',      () => this.renderPreview());
      this.$watch('description', () => this.renderPreview());
    },

    /* ── dimensions ───────────────────────────── */
    _dims() {
      /* A4 @ 150ppi */
      return this.orientation === 'landscape'
        ? { W: 1122, H: 794 }
        : { W: 794,  H: 1122 };
    },

    /* ── preview render ───────────────────────── */
    renderPreview() {
      const { W, H } = this._dims();
      _previewCanvas.width  = W;
      _previewCanvas.height = H;
      drawCertificate(_previewCtx, W, H, this.cfg);
    },

    /* ── thumbnail render ─────────────────────── */
    _renderThumbs() {
      this.templates.forEach(tpl => {
        const el = document.getElementById('thumb-' + tpl.id);
        if (!el) return;
        const tc = el.getContext('2d');
        el.width  = 160;
        el.height = 120;
        const cfg = { ...this.cfg, template: tpl.id, recipient: 'Jane Doe', title: tpl.label };
        drawCertificate(tc, 160, 120, cfg);
      });
    },

    /* ── download PDF ─────────────────────────── */
    downloadPdf() {
      if (typeof window.jspdf === 'undefined') {
        this._toast('PDF library not loaded yet — try again in a moment.');
        return;
      }
      const { jsPDF } = window.jspdf;
      const { W, H }  = this._dims();
      const orient    = this.orientation === 'landscape' ? 'l' : 'p';

      /* render at 2× for quality */
      const offCanvas  = document.createElement('canvas');
      offCanvas.width  = W * 2;
      offCanvas.height = H * 2;
      const offCtx = offCanvas.getContext('2d');
      offCtx.scale(2, 2);
      drawCertificate(offCtx, W, H, this.cfg);

      const imgData = offCanvas.toDataURL('image/jpeg', 0.95);

      /* jsPDF uses mm; A4 = 297×210mm landscape, 210×297mm portrait */
      const pw = orient === 'l' ? 297 : 210;
      const ph = orient === 'l' ? 210 : 297;

      const pdf = new jsPDF({ orientation: orient, unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, pw, ph);

      const name = (this.recipient || 'certificate').replace(/[^a-z0-9]/gi, '_');
      pdf.save(name + '_certificate.pdf');
      this._toast('Certificate downloaded!');
    },

    /* ── download PNG ─────────────────────────── */
    downloadPng() {
      const { W, H } = this._dims();
      const off = document.createElement('canvas');
      off.width  = W * 2;
      off.height = H * 2;
      const tc = off.getContext('2d');
      tc.scale(2, 2);
      drawCertificate(tc, W, H, this.cfg);
      off.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (this.recipient || 'certificate').replace(/[^a-z0-9]/gi, '_') + '_certificate.png';
        a.click();
        URL.revokeObjectURL(url);
        this._toast('PNG downloaded!');
      }, 'image/png');
    },

    toggleFaq(el) {
      el.closest('.faq-item').classList.toggle('open');
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },
  };
}
