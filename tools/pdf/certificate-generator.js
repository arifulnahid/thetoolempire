/* Certificate PDF Generator — v3
   FS = S * fontScale for all font sizes (consistent across orientations + user scale).
   _logoImgs[] lives outside Alpine proxy; up to 3 logos drawn horizontally.
   _drawSigBlock() is a shared helper used by all templates.              */

const TEMPLATES = [
  { id: 'classic',    label: 'Classic'    },
  { id: 'modern',     label: 'Modern'     },
  { id: 'elegant',    label: 'Elegant'    },
  { id: 'bold',       label: 'Bold'       },
  { id: 'minimal',    label: 'Minimal'    },
  { id: 'academic',   label: 'Academic'   },
  { id: 'ribbon',     label: 'Ribbon'     },
  { id: 'corporate',  label: 'Corporate'  },
  { id: 'diploma',    label: 'Diploma'    },
];

const BORDERS = [
  { id: 'none',   label: 'None'   },
  { id: 'single', label: 'Single' },
  { id: 'double', label: 'Double' },
  { id: 'thick',  label: 'Thick'  },
  { id: 'ornate', label: 'Ornate' },
];

const FONT_SCALES = [
  { id: 0.82, label: 'S'   },
  { id: 1.0,  label: 'M'   },
  { id: 1.18, label: 'L'   },
  { id: 1.36, label: 'XL'  },
];

const FONTS = [
  { id: 'serif',   label: 'Serif',      family: 'Georgia, "Times New Roman", serif' },
  { id: 'sans',    label: 'Sans',       family: 'system-ui, Arial, sans-serif'       },
  { id: 'mono',    label: 'Mono',       family: '"Courier New", Courier, monospace'  },
  { id: 'cursive', label: 'Cursive',    family: 'cursive'                            },
];

/* ── color helpers ─────────────────────────────────────── */
function hexToRgb(hex) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}
function lighten(hex, amt) {
  const {r,g,b} = hexToRgb(hex);
  const l = v => Math.min(255, Math.round(v + (255-v)*amt));
  return `rgb(${l(r)},${l(g)},${l(b)})`;
}
function darken(hex, amt) {
  const {r,g,b} = hexToRgb(hex);
  const d = v => Math.max(0, Math.round(v*(1-amt)));
  return `rgb(${d(r)},${d(g)},${d(b)})`;
}
function hexAlpha(hex, a) {
  const {r,g,b} = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── module-level vars (outside Alpine proxy) ──────────── */
let _previewCanvas = null;
let _previewCtx    = null;
let _logoImgs      = [];   /* array of Image objects, up to 3 */
const _thumbCtxs   = {};

/* ── logo drawing (multiple, horizontally) ─────────────── */
function _drawLogos(ctx, W, H, S) {
  const imgs = _logoImgs.filter(i => i && i.width);
  if (!imgs.length) return;
  const maxH = S * 0.1;
  const maxW = W * 0.22;
  const gap   = S * 0.03;
  const scaled = imgs.map(img => {
    const sc = Math.min(maxW / img.width, maxH / img.height);
    return { img, w: img.width * sc, h: img.height * sc };
  });
  const totalW = scaled.reduce((s, i) => s + i.w, 0) + gap * (scaled.length - 1);
  let lx = (W - totalW) / 2;
  const ly = H * 0.025;
  ctx.save();
  ctx.globalAlpha = 0.92;
  scaled.forEach(({ img, w, h }) => {
    ctx.drawImage(img, lx, ly, w, h);
    lx += w + gap;
  });
  ctx.restore();
}

/* ── shared signature block ────────────────────────────── */
/* fy  = Y of the signature line(s)
   All text sizes use FS (font-scaled S).                  */
function _drawSigBlock(ctx, W, H, FS, cfg, fy) {
  const { color, fontFamily, issuer, issuerTitle, issuer2, issuerTitle2, date } = cfg;
  const twoSigs = !!(issuer2 && issuer2.trim());
  const nameY  = fy + H * 0.046;
  const titleY = nameY + H * 0.034;

  ctx.textAlign = 'center';
  ctx.strokeStyle = hexAlpha(color, 0.3);
  ctx.lineWidth = 1;

  if (twoSigs) {
    /* two sig lines */
    ctx.beginPath(); ctx.moveTo(W*0.08, fy); ctx.lineTo(W*0.4, fy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W*0.6, fy);  ctx.lineTo(W*0.92, fy); ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = `600 ${FS * 0.024}px ${fontFamily}`;
    ctx.fillText(issuer || 'Signatory 1', W*0.24, nameY);
    ctx.fillText(issuer2, W*0.76, nameY);

    ctx.fillStyle = '#999';
    ctx.font = `${FS * 0.018}px ${fontFamily}`;
    ctx.fillText(issuerTitle || 'Designation', W*0.24, titleY);
    ctx.fillText(issuerTitle2 || 'Designation', W*0.76, titleY);
  } else {
    /* single sig line — left half */
    ctx.beginPath(); ctx.moveTo(W*0.1, fy); ctx.lineTo(W*0.45, fy); ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = `600 ${FS * 0.025}px ${fontFamily}`;
    ctx.fillText(issuer || 'Issuing Authority', W*0.275, nameY);

    if (issuerTitle) {
      ctx.fillStyle = '#999';
      ctx.font = `${FS * 0.019}px ${fontFamily}`;
      ctx.fillText(issuerTitle, W*0.275, titleY);
    }
  }

  /* date — always bottom-center below sigs */
  if (date) {
    ctx.fillStyle = hexAlpha(color, 0.7);
    ctx.font = `italic ${FS * 0.022}px ${fontFamily}`;
    ctx.fillText(date, W * 0.5, titleY + H * 0.04);
  }
}

/* ── main dispatcher ───────────────────────────────────── */
function drawCertificate(ctx, W, H, cfg) {
  ctx.clearRect(0, 0, W, H);
  const S  = Math.min(W, H);
  const FS = S * (cfg.fontScale || 1);
  switch (cfg.template) {
    case 'classic':   drawClassic(ctx, W, H, S, FS, cfg);   break;
    case 'modern':    drawModern(ctx, W, H, S, FS, cfg);     break;
    case 'elegant':   drawElegant(ctx, W, H, S, FS, cfg);    break;
    case 'bold':      drawBold(ctx, W, H, S, FS, cfg);       break;
    case 'minimal':   drawMinimal(ctx, W, H, S, FS, cfg);    break;
    case 'academic':  drawAcademic(ctx, W, H, S, FS, cfg);   break;
    case 'ribbon':    drawRibbon(ctx, W, H, S, FS, cfg);     break;
    case 'corporate': drawCorporate(ctx, W, H, S, FS, cfg);  break;
    case 'diploma':   drawDiploma(ctx, W, H, S, FS, cfg);    break;
    default:          drawClassic(ctx, W, H, S, FS, cfg);
  }
  _applyBorder(ctx, W, H, S, cfg);
  if (_logoImgs.length) _drawLogos(ctx, W, H, S);
}

/* ══════════════════════════════════════════════════════════
   TEMPLATES  (all use FS for font sizes, S for positions)
══════════════════════════════════════════════════════════ */

function drawClassic(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  const grad = ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0, '#fdf8f0');
  grad.addColorStop(1, '#f5ede0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  _corners(ctx, W, H, S * 0.05, color, S * 0.025);

  ctx.fillStyle = color;
  ctx.font = `bold ${FS * 0.062}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title || 'Certificate of Achievement', W/2, H * 0.22);

  ctx.fillStyle = hexAlpha(color, .12);
  ctx.fillRect(W*.1, H*.265, W*.8, 2);

  ctx.fillStyle = '#555';
  ctx.font = `italic ${FS * 0.032}px ${fontFamily}`;
  ctx.fillText('This is to certify that', W/2, H * 0.34);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold ${FS * 0.068}px ${fontFamily}`;
  _underlineText(ctx, recipient || 'Recipient Name', W/2, H * 0.455, color);

  let cy = H * 0.545;
  if (subtitle) {
    ctx.fillStyle = '#444';
    ctx.font = `${FS * 0.03}px ${fontFamily}`;
    ctx.fillText(subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.7);
    ctx.font = `italic ${FS * 0.026}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#666';
    ctx.font = `${FS * 0.026}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.7, S * 0.034);
  }

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.75);
}

function drawModern(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  const bar = ctx.createLinearGradient(0,0,0,H);
  bar.addColorStop(0, color); bar.addColorStop(1, darken(color, .3));
  ctx.fillStyle = bar; ctx.fillRect(0, 0, W * .055, H);

  ctx.beginPath(); ctx.arc(W, 0, H*.45, 0, Math.PI*2);
  ctx.fillStyle = hexAlpha(color, .06); ctx.fill();
  ctx.beginPath(); ctx.arc(W, 0, H*.28, 0, Math.PI*2);
  ctx.fillStyle = hexAlpha(color, .08); ctx.fill();

  ctx.fillStyle = color;
  ctx.font = `900 ${FS * 0.048}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText((title || 'Certificate of Achievement').toUpperCase(), W*.1, H * 0.22);

  ctx.fillStyle = color; ctx.fillRect(W*.1, H*.255, W*.08, 3);

  ctx.fillStyle = '#888';
  ctx.font = `${FS * 0.029}px ${fontFamily}`;
  ctx.fillText('Presented to', W*.1, H * 0.325);

  ctx.fillStyle = '#111';
  ctx.font = `700 ${FS * 0.072}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W*.1, H * 0.44);

  let cy = H * 0.515;
  if (subtitle) {
    ctx.fillStyle = '#555';
    ctx.font = `${FS * 0.031}px ${fontFamily}`;
    ctx.fillText(subtitle, W*.1, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.7);
    ctx.font = `italic ${FS * 0.026}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W*.1, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${FS * 0.025}px ${fontFamily}`;
    _wrapTextLeft(ctx, description, W*.1, cy, W * 0.72, S * 0.032);
  }

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.755);
}

function drawElegant(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  const bg = ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0, '#0d0d1a'); bg.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  _diamonds(ctx, W, H, S * 0.048, color);
  _ornament(ctx, W*.5, H*.15, color, W*.15);

  ctx.fillStyle = lighten(color, .6);
  ctx.font = `${FS * 0.03}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('✦ ' + (title || 'Certificate of Excellence') + ' ✦', W/2, H * 0.235);

  ctx.fillStyle = hexAlpha(color, .5); ctx.fillRect(W*.2, H*.27, W*.6, 1);

  ctx.fillStyle = '#aaa';
  ctx.font = `italic ${FS * 0.027}px ${fontFamily}`;
  ctx.fillText('Awarded with distinction to', W/2, H * 0.35);

  ctx.fillStyle = lighten(color, .5);
  ctx.font = `bold ${FS * 0.065}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W/2, H * 0.455);

  let cy = H * 0.535;
  if (subtitle) {
    ctx.fillStyle = '#bbb';
    ctx.font = `italic ${FS * 0.029}px ${fontFamily}`;
    ctx.fillText(subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.6);
    ctx.font = `italic ${FS * 0.024}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.038;
  }
  if (description) {
    ctx.fillStyle = '#888';
    ctx.font = `${FS * 0.024}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.65, S * 0.032);
  }

  _ornament(ctx, W*.5, H*.73, color, W*.12);
  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.755);
}

function drawBold(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(W*.07, H*.11, W*.86, H*.78);
  ctx.fillStyle = darken(color, .2); ctx.fillRect(W*.07, H*.11, W*.86, H*.07);

  ctx.beginPath(); ctx.arc(W*.95, H*.96, H*.38, 0, Math.PI*2);
  ctx.fillStyle = hexAlpha('#fff', .06); ctx.fill();
  ctx.beginPath(); ctx.arc(W*.95, H*.96, H*.24, 0, Math.PI*2);
  ctx.fillStyle = hexAlpha('#fff', .07); ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = `900 ${FS * 0.052}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText((title || 'Certificate').toUpperCase(), W/2, H * 0.165);

  ctx.fillStyle = color;
  ctx.font = `900 ${FS * 0.034}px ${fontFamily}`;
  ctx.fillText('OF ACHIEVEMENT', W/2, H * 0.25);

  ctx.fillStyle = '#666';
  ctx.font = `${FS * 0.029}px ${fontFamily}`;
  ctx.fillText('This certificate is proudly presented to', W/2, H * 0.335);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${FS * 0.07}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W/2, H * 0.445);

  let cy = H * 0.525;
  if (subtitle) {
    ctx.fillStyle = color;
    ctx.font = `600 ${FS * 0.031}px ${fontFamily}`;
    ctx.fillText(subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = darken(color, 0.1);
    ctx.font = `italic ${FS * 0.026}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#666';
    ctx.font = `${FS * 0.025}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.66, S * 0.032);
  }

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.75);
}

function drawMinimal(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  ctx.fillStyle = '#fafafa'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H * 0.007);

  ctx.fillStyle = color;
  ctx.font = `300 ${FS * 0.031}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText((title || 'CERTIFICATE OF ACHIEVEMENT').toUpperCase(), W/2, H * 0.18);

  ctx.strokeStyle = hexAlpha(color, .3); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W*.35, H*.21); ctx.lineTo(W*.65, H*.21); ctx.stroke();

  ctx.fillStyle = '#ccc';
  ctx.font = `300 ${FS * 0.025}px ${fontFamily}`;
  ctx.fillText('presented to', W/2, H * 0.305);

  ctx.fillStyle = '#111';
  ctx.font = `300 ${FS * 0.072}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W/2, H * 0.43);

  let cy = H * 0.515;
  if (subtitle) {
    ctx.fillStyle = '#888';
    ctx.font = `300 ${FS * 0.029}px ${fontFamily}`;
    ctx.fillText(subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.6);
    ctx.font = `300 italic ${FS * 0.025}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }

  ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W*.2, cy + H*.01); ctx.lineTo(W*.8, cy + H*.01); ctx.stroke();
  cy += H * 0.04;

  if (description) {
    ctx.fillStyle = '#999';
    ctx.font = `300 ${FS * 0.025}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.65, S * 0.032);
  }

  ctx.fillStyle = color; ctx.fillRect(0, H - H*.007, W, H*.007);
  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.755);
}

function drawAcademic(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  ctx.fillStyle = '#fffef5'; ctx.fillRect(0, 0, W, H);

  ctx.beginPath(); ctx.arc(W/2, H*.135, S*.072, 0, Math.PI*2);
  ctx.fillStyle = hexAlpha(color, .1); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(W/2, H*.135, S*.056, 0, Math.PI*2);
  ctx.strokeStyle = hexAlpha(color, .5); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${FS * 0.044}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('★', W/2, H*.148);

  ctx.fillStyle = '#333';
  ctx.font = `bold ${FS * 0.039}px ${fontFamily}`;
  ctx.fillText(title || 'Certificate of Completion', W/2, H * 0.265);

  ctx.fillStyle = hexAlpha(color, .6);
  const sw = W*.36;
  ctx.fillRect(W/2 - sw/2, H*.295, sw, 1.5);

  ctx.fillStyle = '#666';
  ctx.font = `italic ${FS * 0.028}px ${fontFamily}`;
  ctx.fillText('This is to certify that', W/2, H * 0.365);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${FS * 0.064}px ${fontFamily}`;
  _underlineText(ctx, recipient || 'Recipient Name', W/2, H * 0.455, color);

  let cy = H * 0.535;
  if (subtitle) {
    ctx.fillStyle = '#555';
    ctx.font = `italic ${FS * 0.029}px ${fontFamily}`;
    ctx.fillText('has successfully completed ' + subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.65);
    ctx.font = `italic ${FS * 0.025}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${FS * 0.024}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.68, S * 0.032);
  }

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.755);
}

function drawRibbon(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H * 0.185);

  ctx.fillStyle = hexAlpha('#fff', .09);
  ctx.beginPath();
  ctx.moveTo(W*.25, 0); ctx.lineTo(W*.42, H*.185);
  ctx.lineTo(W*.32, H*.185); ctx.lineTo(W*.15, 0);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = darken(color, .25);
  ctx.beginPath();
  ctx.moveTo(0, H*.185); ctx.lineTo(W*.045, H*.12); ctx.lineTo(0, H*.06);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, H*.185); ctx.lineTo(W*.955, H*.12); ctx.lineTo(W, H*.06);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = hexAlpha('#fff', .7);
  ctx.font = `${FS * 0.04}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★', W*.12, H*.118);
  ctx.fillText('★', W*.88, H*.118);

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${FS * 0.046}px ${fontFamily}`;
  ctx.fillText(title || 'Certificate of Achievement', W/2, H * 0.112);

  ctx.fillStyle = '#555';
  ctx.font = `${FS * 0.029}px ${fontFamily}`;
  ctx.fillText('This certificate is proudly presented to', W/2, H * 0.315);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${FS * 0.068}px ${fontFamily}`;
  _underlineText(ctx, recipient || 'Recipient Name', W/2, H * 0.435, color);

  let cy = H * 0.515;
  if (subtitle) {
    ctx.fillStyle = color;
    ctx.font = `600 ${FS * 0.03}px ${fontFamily}`;
    ctx.fillText(subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = darken(color, 0.1);
    ctx.font = `italic ${FS * 0.026}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${FS * 0.025}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.72, S * 0.032);
  }

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.755);
}

function drawCorporate(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod, issuer } = cfg;

  ctx.fillStyle = '#f7f8fa'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H * 0.008);
  ctx.fillStyle = color; ctx.fillRect(0, H - H*.008, W, H*.008);

  ctx.fillStyle = '#eef0f4'; ctx.fillRect(0, H*.008, W, H * 0.115);

  ctx.fillStyle = '#333';
  ctx.font = `600 ${FS * 0.027}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText((issuer || 'Organization Name').toUpperCase(), W/2, H * 0.068);

  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W*.36, H*.098); ctx.lineTo(W*.64, H*.098); ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = `300 ${FS * 0.021}px ${fontFamily}`;
  ctx.fillText('CERTIFICATE OF RECOGNITION', W/2, H * 0.205);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${FS * 0.058}px ${fontFamily}`;
  ctx.fillText(title || 'Certificate', W/2, H * 0.3);

  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W*.15, H*.345); ctx.lineTo(W*.85, H*.345); ctx.stroke();

  ctx.fillStyle = '#777';
  ctx.font = `${FS * 0.027}px ${fontFamily}`;
  ctx.fillText('This certificate is presented to', W/2, H * 0.42);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${FS * 0.068}px ${fontFamily}`;
  ctx.fillText(recipient || 'Recipient Name', W/2, H * 0.515);

  let cy = H * 0.59;
  if (subtitle) {
    ctx.fillStyle = '#555';
    ctx.font = `${FS * 0.028}px ${fontFamily}`;
    ctx.fillText(subtitle, W/2, cy); cy += H * 0.045;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.7);
    ctx.font = `italic ${FS * 0.024}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${FS * 0.024}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * 0.7, S * 0.031);
  }

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.76);
}

function drawDiploma(ctx, W, H, S, FS, cfg) {
  const { color, fontFamily, recipient, title, subtitle, description, timePeriod } = cfg;

  ctx.fillStyle = '#fffef8'; ctx.fillRect(0, 0, W, H);

  const bandGrad = ctx.createLinearGradient(0,0,W,0);
  bandGrad.addColorStop(0, darken(color,.3));
  bandGrad.addColorStop(.5, color);
  bandGrad.addColorStop(1, darken(color,.3));
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, 0, W, H*.028);
  ctx.fillRect(0, H - H*.028, W, H*.028);
  ctx.fillStyle = hexAlpha(color, .3);
  ctx.fillRect(0, H*.028, W, H*.007);
  ctx.fillRect(0, H - H*.035, W, H*.007);

  _ornament(ctx, W/2, H * .098, color, W * .17);

  ctx.fillStyle = color;
  ctx.font = `bold ${FS * 0.037}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title || 'Diploma', W/2, H * .192);

  ctx.fillStyle = hexAlpha(color, .45);
  ctx.fillRect(W*.3, H*.22, W*.4, 1.5);

  ctx.fillStyle = '#555';
  ctx.font = `italic ${FS * 0.027}px ${fontFamily}`;
  ctx.fillText('This is to certify that', W/2, H * .305);

  ctx.fillStyle = '#111';
  ctx.font = `bold ${FS * 0.068}px ${fontFamily}`;
  _underlineText(ctx, recipient || 'Recipient Name', W/2, H * .41, color);

  let cy = H * 0.49;
  if (subtitle) {
    ctx.fillStyle = '#555';
    ctx.font = `italic ${FS * 0.029}px ${fontFamily}`;
    ctx.fillText('has successfully completed ' + subtitle, W/2, cy); cy += H * 0.048;
  }
  if (timePeriod) {
    ctx.fillStyle = hexAlpha(color, 0.65);
    ctx.font = `italic ${FS * 0.025}px ${fontFamily}`;
    ctx.fillText('Duration: ' + timePeriod, W/2, cy); cy += H * 0.04;
  }
  if (description) {
    ctx.fillStyle = '#777';
    ctx.font = `${FS * 0.025}px ${fontFamily}`;
    _wrapText(ctx, description, W/2, cy, W * .68, S * 0.032);
  }

  /* seal */
  const sx = W/2, sy = H * .765;
  ctx.beginPath(); ctx.arc(sx, sy, S * .058, 0, Math.PI*2);
  ctx.fillStyle = hexAlpha(color, .1); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy, S * .046, 0, Math.PI*2);
  ctx.strokeStyle = hexAlpha(color, .45); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${FS * 0.042}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('★', sx, sy + S*.016);

  _drawSigBlock(ctx, W, H, FS, cfg, H * 0.84);
}

/* ── border layer ──────────────────────────────────────── */
function _applyBorder(ctx, W, H, S, {color, border}) {
  if (!border || border === 'none') return;
  const m  = S * 0.022;
  const m2 = S * 0.034;
  switch (border) {
    case 'single':
      ctx.strokeStyle = color; ctx.lineWidth = S * 0.006;
      ctx.strokeRect(m, m, W - m*2, H - m*2);
      break;
    case 'double':
      ctx.strokeStyle = color; ctx.lineWidth = S * 0.005;
      ctx.strokeRect(m, m, W - m*2, H - m*2);
      ctx.strokeStyle = hexAlpha(color, .4); ctx.lineWidth = 1.5;
      ctx.strokeRect(m2, m2, W - m2*2, H - m2*2);
      break;
    case 'thick':
      ctx.strokeStyle = color; ctx.lineWidth = S * 0.018;
      const t = S * 0.018;
      ctx.strokeRect(t, t, W - t*2, H - t*2);
      ctx.strokeStyle = hexAlpha(color, .25); ctx.lineWidth = 1;
      ctx.strokeRect(S * 0.04, S * 0.04, W - S * 0.08, H - S * 0.08);
      break;
    case 'ornate':
      ctx.strokeStyle = color; ctx.lineWidth = S * 0.005;
      ctx.strokeRect(m, m, W - m*2, H - m*2);
      ctx.strokeStyle = hexAlpha(color, .35); ctx.lineWidth = 1;
      ctx.strokeRect(m2, m2, W - m2*2, H - m2*2);
      _corners(ctx, W, H, m2, color, S * 0.025);
      _diamonds(ctx, W, H, m2 - 1, color);
      break;
  }
}

/* ── shared drawing utilities ──────────────────────────── */
function _corners(ctx, W, H, inset, color, size) {
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  [[inset,inset,1,1],[W-inset,inset,-1,1],[inset,H-inset,1,-1],[W-inset,H-inset,-1,-1]]
    .forEach(([x,y,dx,dy]) => {
      ctx.beginPath();
      ctx.moveTo(x+dx*size, y); ctx.lineTo(x,y); ctx.lineTo(x, y+dy*size);
      ctx.stroke();
    });
}

function _diamonds(ctx, W, H, inset, color) {
  ctx.fillStyle = color;
  const s = 6;
  [[inset,inset],[W-inset,inset],[inset,H-inset],[W-inset,H-inset]]
    .forEach(([x,y]) => {
      ctx.beginPath();
      ctx.moveTo(x,y-s); ctx.lineTo(x+s,y); ctx.lineTo(x,y+s); ctx.lineTo(x-s,y);
      ctx.closePath(); ctx.fill();
    });
}

function _ornament(ctx, cx, cy, color, halfW) {
  ctx.strokeStyle = hexAlpha(color, .6); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx-halfW, cy); ctx.lineTo(cx-halfW*.3, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+halfW*.3, cy); ctx.lineTo(cx+halfW, cy); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
  ctx.fillStyle = color; ctx.fill();
}

function _dashLine(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
}

function _underlineText(ctx, text, x, y, color) {
  ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width;
  ctx.strokeStyle = hexAlpha(color, .5); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x-w/2, y+6); ctx.lineTo(x+w/2, y+6); ctx.stroke();
}

function _wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line+' '+word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, y); line = word; y += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, cx, y);
}

function _wrapTextLeft(ctx, text, lx, y, maxW, lineH) {
  const save = ctx.textAlign; ctx.textAlign = 'left';
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line+' '+word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, lx, y); line = word; y += lineH;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, lx, y);
  ctx.textAlign = save;
}

/* ══════════════════════════════════════════════════════════
   ALPINE COMPONENT
══════════════════════════════════════════════════════════ */
function certificateGeneratorApp() {
  return {
    template:     'classic',
    color:        '#7c3aed',
    fontId:       'serif',
    fontScale:    1.0,
    orientation:  'landscape',
    border:       'double',

    recipient:    '',
    title:        'Certificate of Achievement',
    subtitle:     '',
    timePeriod:   '',
    description:  '',
    issuer:       '',
    issuerTitle:  '',
    issuer2:      '',
    issuerTitle2: '',
    date:         '',

    hasLogo:    false,
    logoNames:  [],
    logoCount:  0,

    templates:   TEMPLATES,
    borders:     BORDERS,
    fontScales:  FONT_SCALES,
    fonts:       FONTS,

    get fontFamily() {
      return FONTS.find(f => f.id === this.fontId)?.family || FONTS[0].family;
    },

    get cfg() {
      return {
        template:     this.template,
        color:        this.color,
        fontFamily:   this.fontFamily,
        fontScale:    this.fontScale,
        recipient:    this.recipient,
        title:        this.title,
        subtitle:     this.subtitle,
        timePeriod:   this.timePeriod,
        description:  this.description,
        issuer:       this.issuer,
        issuerTitle:  this.issuerTitle,
        issuer2:      this.issuer2,
        issuerTitle2: this.issuerTitle2,
        date:         this.date,
        orientation:  this.orientation,
        border:       this.border,
      };
    },

    /* ── init ─────────────────────────────────── */
    init() {
      _previewCanvas = this.$refs.previewCanvas;
      _previewCtx    = _previewCanvas.getContext('2d');
      this.date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
      this.$nextTick(() => { this._renderThumbs(); this.renderPreview(); });

      const rerenderThumbs = ['color','template','fontId','fontScale'];
      ['template','color','fontId','fontScale','orientation','border',
       'recipient','title','subtitle','timePeriod','description',
       'issuer','issuerTitle','issuer2','issuerTitle2','date']
        .forEach(k => {
          this.$watch(k, () => {
            if (rerenderThumbs.includes(k)) this._renderThumbs();
            this.renderPreview();
          });
        });
    },

    _dims() {
      return this.orientation === 'landscape'
        ? { W: 1122, H: 794 }
        : { W: 794,  H: 1122 };
    },

    renderPreview() {
      const { W, H } = this._dims();
      _previewCanvas.width  = W;
      _previewCanvas.height = H;
      drawCertificate(_previewCtx, W, H, this.cfg);
    },

    _renderThumbs() {
      this.templates.forEach(tpl => {
        const el = document.getElementById('thumb-' + tpl.id);
        if (!el) return;
        const tc = el.getContext('2d');
        el.width = 160; el.height = 100;
        drawCertificate(tc, 160, 100, { ...this.cfg, template: tpl.id, recipient: 'Jane Doe', title: tpl.label });
      });
    },

    /* ── logo ─────────────────────────────────── */
    onLogoUpload(e) {
      const files = Array.from(e.target.files).slice(0, 3 - _logoImgs.length);
      e.target.value = '';
      if (!files.length) return;
      let loaded = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            _logoImgs.push(img);
            this.logoNames = [...this.logoNames, file.name];
            this.logoCount = _logoImgs.length;
            this.hasLogo   = true;
            loaded++;
            if (loaded === files.length) this.renderPreview();
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    },

    removeLogo(idx) {
      _logoImgs.splice(idx, 1);
      this.logoNames.splice(idx, 1);
      this.logoNames  = [...this.logoNames];
      this.logoCount  = _logoImgs.length;
      this.hasLogo    = _logoImgs.length > 0;
      this.renderPreview();
    },

    /* ── render offscreen at 2× ───────────────── */
    _renderOff() {
      const { W, H } = this._dims();
      const off = document.createElement('canvas');
      off.width  = W * 2;
      off.height = H * 2;
      const tc = off.getContext('2d');
      tc.scale(2, 2);
      drawCertificate(tc, W, H, this.cfg);
      return { off, W, H };
    },

    /* ── downloads ────────────────────────────── */
    downloadPdf() {
      if (typeof window.jspdf === 'undefined') { this._toast('PDF library not ready — refresh.'); return; }
      const { jsPDF } = window.jspdf;
      const { off, W, H } = this._renderOff();
      const orient = this.orientation === 'landscape' ? 'l' : 'p';
      const pw = orient === 'l' ? 297 : 210;
      const ph = orient === 'l' ? 210 : 297;
      const pdf = new jsPDF({ orientation: orient, unit: 'mm', format: 'a4' });
      pdf.addImage(off.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pw, ph);
      pdf.save(this._filename('pdf'));
      this._toast('PDF downloaded!');
    },

    downloadPng() {
      const { off } = this._renderOff();
      off.toBlob(blob => {
        this._saveBlob(blob, this._filename('png'));
        this._toast('PNG downloaded!');
      }, 'image/png');
    },

    downloadJpg() {
      const { off, W, H } = this._renderOff();
      const flat = document.createElement('canvas');
      flat.width = off.width; flat.height = off.height;
      const fc = flat.getContext('2d');
      fc.fillStyle = '#ffffff';
      fc.fillRect(0, 0, flat.width, flat.height);
      fc.drawImage(off, 0, 0);
      flat.toBlob(blob => {
        this._saveBlob(blob, this._filename('jpg'));
        this._toast('JPG downloaded!');
      }, 'image/jpeg', 0.93);
    },

    _filename(ext) {
      return (this.recipient || 'certificate').replace(/[^a-z0-9]/gi, '_') + '_certificate.' + ext;
    },

    _saveBlob(blob, name) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },
  };
}
