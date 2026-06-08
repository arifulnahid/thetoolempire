/* Invoice PDF Generator */

const PAPER_SIZES = [
  { id: 'a4',      label: 'A4',      dim: '210×297mm', w: 794,  h: 1123, pdfW: 210, pdfH: 297, ratio: 297/210 },
  { id: 'letter',  label: 'Letter',  dim: '8.5×11in',  w: 816,  h: 1056, pdfW: 216, pdfH: 279, ratio: 11/8.5  },
  { id: 'a5',      label: 'A5',      dim: '148×210mm', w: 559,  h: 794,  pdfW: 148, pdfH: 210, ratio: 210/148 },
  { id: 'legal',   label: 'Legal',   dim: '8.5×14in',  w: 816,  h: 1344, pdfW: 216, pdfH: 356, ratio: 14/8.5  },
  { id: 'b5',      label: 'B5',      dim: '176×250mm', w: 665,  h: 945,  pdfW: 176, pdfH: 250, ratio: 250/176 },
  { id: 'half',    label: 'Half',    dim: '5.5×8.5in', w: 520,  h: 808,  pdfW: 139, pdfH: 216, ratio: 8.5/5.5 },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$',   name: 'US Dollar'        },
  { code: 'EUR', symbol: '€',   name: 'Euro'              },
  { code: 'GBP', symbol: '£',   name: 'British Pound'     },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen'      },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar'   },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee'      },
  { code: 'BDT', symbol: '৳',   name: 'Bangladeshi Taka'  },
];

const ACCENT_COLORS = [
  '#3b82f6','#6366f1','#8b5cf6','#0891b2',
  '#059669','#d97706','#dc2626','#db2777',
];

let _canvas = null;
let _ctx    = null;
let _nextId = 1;

/* ── number formatting ── */
function fmtMoney(n, symbol) {
  const abs = Math.abs(n);
  const str = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + symbol + str;
}

/* ── canvas text wrap helper ── */
function _wrapCanvas(ctx, text, x, y, maxW, lineH) {
  const words = String(text || '').split(' ');
  let line = '';
  let curY  = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word; curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY; /* return final y so caller can advance */
}

/* ── returns height consumed by wrapped text ── */
function _wrapHeight(ctx, text, maxW, lineH) {
  const words = String(text || '').split(' ');
  let line = ''; let lines = 1;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) { lines++; line = word; }
    else line = test;
  }
  return lines * lineH;
}

/* ═══════════════════════════════════════════════
   CANVAS RENDERER
═══════════════════════════════════════════════ */
function renderInvoice(ctx, W, H, cfg) {
  const {
    accentColor, fromName, fromAddress, fromEmail, fromPhone,
    toName,   toAddress, toEmail, toPhone,
    invoiceNum, invoiceDate, dueDate, poNumber,
    items, taxRate, discountRate, notes, terms,
    currency, logoText, logoImg,
  } = cfg;

  const sym = currency.symbol;

  /* scale helpers so sizes feel right on every paper size */
  const S = W / 794; /* scale factor relative to A4 width */

  const f  = (px) => px * S;  /* scale font/margin */
  const fs = (...px) => px.map(f);

  /* ── white background ── */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  /* ── accent header bar ── */
  const HDR_H = f(100);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 0, W, HDR_H);

  /* ── logo image or text ── */
  const PAD = f(44);

  if (logoImg) {
    /* draw uploaded logo — fit inside a 140×60 box */
    const maxLW = f(140), maxLH = f(50);
    const scale = Math.min(maxLW / logoImg.naturalWidth, maxLH / logoImg.naturalHeight);
    const lw = logoImg.naturalWidth * scale;
    const lh = logoImg.naturalHeight * scale;
    ctx.drawImage(logoImg, PAD, (HDR_H - lh) / 2, lw, lh);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${f(22)}px system-ui, Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(logoText || fromName || 'Your Company', PAD, HDR_H / 2);
  }

  /* ── INVOICE label (right of header) ── */
  ctx.textAlign = 'right';
  ctx.font = `900 ${f(28)}px system-ui, Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.fillText('INVOICE', W - PAD, HDR_H * .42);

  ctx.font = `${f(13)}px system-ui, Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText('#' + (invoiceNum || '0001'), W - PAD, HDR_H * .72);

  /* ── three-column info block ── */
  const BLOC_TOP  = HDR_H + f(24);
  const COL1X     = PAD;
  const COL2X     = W * .40;
  const COL3X     = W * .68;
  const COL1W     = COL2X - COL1X - f(10);
  const COL2W     = COL3X - COL2X - f(10);
  const COL3W     = W - COL3X - PAD;

  /* helper: section label */
  function sLabel(text, x, y) {
    ctx.font = `700 ${f(9)}px system-ui, Arial, sans-serif`;
    ctx.fillStyle = accentColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text.toUpperCase(), x, y);
  }

  /* helper: body line */
  function bLine(text, x, y, maxW, muted) {
    ctx.font = `${f(11)}px system-ui, Arial, sans-serif`;
    ctx.fillStyle = muted ? '#777777' : '#111111';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return _wrapCanvas(ctx, text || '', x, y, maxW, f(16));
  }

  /* FROM */
  let fy = BLOC_TOP + f(4);
  sLabel('From', COL1X, fy); fy += f(14);
  ctx.font = `700 ${f(13)}px system-ui, Arial, sans-serif`;
  ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(fromName || 'Your Company', COL1X, fy); fy += f(17);
  if (fromAddress) { fy = bLine(fromAddress, COL1X, fy, COL1W, true) + f(15); }
  if (fromEmail)   { bLine(fromEmail, COL1X, fy, COL1W, true); fy += f(15); }
  if (fromPhone)   { bLine(fromPhone, COL1X, fy, COL1W, true); fy += f(15); }

  /* BILL TO */
  let ty2 = BLOC_TOP + f(4);
  sLabel('Bill To', COL2X, ty2); ty2 += f(14);
  ctx.font = `700 ${f(13)}px system-ui, Arial, sans-serif`;
  ctx.fillStyle = '#111'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(toName || 'Client Name', COL2X, ty2); ty2 += f(17);
  if (toAddress) { ty2 = bLine(toAddress, COL2X, ty2, COL2W, true) + f(15); }
  if (toEmail)   { bLine(toEmail, COL2X, ty2, COL2W, true); ty2 += f(15); }
  if (toPhone)   { bLine(toPhone, COL2X, ty2, COL2W, true); ty2 += f(15); }

  /* META (Invoice Date / Due / PO) */
  const metaItems = [
    ['Invoice Date', invoiceDate],
    ['Due Date',     dueDate    ],
    ['PO Number',    poNumber   ],
  ].filter(([, v]) => v);

  let my = BLOC_TOP + f(4);
  metaItems.forEach(([label, val]) => {
    ctx.font = `600 ${f(9)}px system-ui, Arial, sans-serif`;
    ctx.fillStyle = '#999'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, W - PAD, my);
    ctx.font = `${f(11)}px system-ui, Arial, sans-serif`;
    ctx.fillStyle = '#111'; ctx.textAlign = 'right';
    ctx.fillText(val, W - PAD, my + f(14));
    my += f(33);
  });

  /* ── divider ── */
  const DIVIDER_Y = Math.max(fy, ty2, my) + f(16);
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD, DIVIDER_Y); ctx.lineTo(W - PAD, DIVIDER_Y); ctx.stroke();

  /* ── items table ── */
  const TBL_TOP = DIVIDER_Y + f(16);
  const CDESC   = { x: PAD,        w: W * .42 };
  const CQTY    = { x: W * .48,    w: W * .09 };
  const CRATE   = { x: W * .58,    w: W * .16 };
  const CAMT    = { x: W * .75,    w: W - PAD - W * .75 };

  /* table header row */
  const ROW_H = f(30);
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(PAD * .8, TBL_TOP, W - PAD * 1.6, ROW_H);

  const HDR_Y = TBL_TOP + f(20);
  ctx.font = `700 ${f(9)}px system-ui, Arial, sans-serif`;
  ctx.fillStyle = '#555'; ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';   ctx.fillText('DESCRIPTION', CDESC.x, HDR_Y);
  ctx.textAlign = 'center'; ctx.fillText('QTY',  CQTY.x + CQTY.w / 2, HDR_Y);
  ctx.textAlign = 'right';  ctx.fillText('RATE', CRATE.x + CRATE.w, HDR_Y);
  ctx.textAlign = 'right';  ctx.fillText('AMOUNT', CAMT.x + CAMT.w, HDR_Y);

  /* item rows */
  let rowY = TBL_TOP + ROW_H;
  let subtotal = 0;

  (items || []).forEach((item, i) => {
    const qty  = parseFloat(item.qty)  || 0;
    const rate = parseFloat(item.rate) || 0;
    const amt  = qty * rate;
    subtotal += amt;

    /* measure description height to set row height */
    ctx.font = `${f(11)}px system-ui, Arial, sans-serif`;
    const descH = _wrapHeight(ctx, item.desc || '', CDESC.w - f(8), f(16));
    const thisRowH = Math.max(f(30), descH + f(16));

    if (i % 2 === 1) {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(PAD * .8, rowY, W - PAD * 1.6, thisRowH);
    }

    const ry = rowY + f(14);
    ctx.font = `${f(11)}px system-ui, Arial, sans-serif`;
    ctx.fillStyle = '#222'; ctx.textBaseline = 'alphabetic';

    ctx.textAlign = 'left';
    _wrapCanvas(ctx, item.desc || '', CDESC.x, ry, CDESC.w - f(8), f(16));

    ctx.textAlign = 'center';
    ctx.fillText(qty.toString(), CQTY.x + CQTY.w / 2, ry);

    ctx.textAlign = 'right';
    ctx.fillText(fmtMoney(rate, sym), CRATE.x + CRATE.w, ry);
    ctx.fillText(fmtMoney(amt,  sym), CAMT.x  + CAMT.w,  ry);

    rowY += thisRowH;
  });

  /* bottom border */
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(PAD * .8, rowY); ctx.lineTo(W - PAD * .8, rowY); ctx.stroke();
  rowY += f(16);

  /* ── totals block ── */
  const discount  = subtotal * (parseFloat(discountRate) || 0) / 100;
  const taxable   = subtotal - discount;
  const tax       = taxable  * (parseFloat(taxRate)      || 0) / 100;
  const total     = taxable  + tax;

  /* totals sit right-aligned; label col starts at ~62% */
  const TOT_LABEL_X = W * .62;
  const TOT_VAL_X   = W - PAD;
  const TOT_COL_W   = TOT_VAL_X - TOT_LABEL_X - f(4);

  function totRow(label, valueStr, bold) {
    const lineH = bold ? f(34) : f(26);

    if (bold) {
      ctx.fillStyle = accentColor + '18'; /* tinted bg */
      ctx.fillRect(TOT_LABEL_X - f(8), rowY - f(2), W - TOT_LABEL_X + f(8) + PAD, lineH);
    }

    ctx.textBaseline = 'alphabetic';
    ctx.font = bold
      ? `700 ${f(12)}px system-ui, Arial, sans-serif`
      : `${f(11)}px system-ui, Arial, sans-serif`;

    /* label — left aligned within tot col */
    ctx.fillStyle = bold ? '#111' : '#555';
    ctx.textAlign = 'left';
    ctx.fillText(label, TOT_LABEL_X, rowY + (bold ? f(22) : f(18)));

    /* value — right aligned, clipped to col width */
    ctx.textAlign = 'right';
    ctx.fillStyle = bold ? '#111' : '#333';
    /* truncate if too wide */
    let valStr = valueStr;
    while (ctx.measureText(valStr).width > TOT_COL_W && valStr.length > 1) valStr = valStr.slice(0, -1);
    ctx.fillText(valStr, TOT_VAL_X, rowY + (bold ? f(22) : f(18)));

    rowY += lineH;
  }

  totRow('Subtotal', fmtMoney(subtotal, sym));
  if (discount > 0) totRow(`Discount (${discountRate}%)`, '−' + fmtMoney(discount, sym));
  if (tax > 0)      totRow(`Tax (${taxRate}%)`,           fmtMoney(tax, sym));

  /* hairline above total */
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(TOT_LABEL_X - f(8), rowY); ctx.lineTo(W - PAD * .8, rowY); ctx.stroke();
  rowY += f(4);

  totRow('Total Due', fmtMoney(total, sym), true);
  rowY += f(10);

  /* ── notes & terms ── */
  if (notes || terms) {
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, rowY); ctx.lineTo(W - PAD, rowY); ctx.stroke();
    rowY += f(18);

    if (notes) {
      ctx.font = `700 ${f(10)}px system-ui, Arial, sans-serif`;
      ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Notes', PAD, rowY); rowY += f(14);
      ctx.font = `${f(10)}px system-ui, Arial, sans-serif`;
      ctx.fillStyle = '#666';
      const endY = _wrapCanvas(ctx, notes, PAD, rowY, W * .43, f(15));
      rowY = endY + f(20);
    }

    if (terms) {
      const tx = notes ? W * .52 : PAD;
      const baseY = notes ? (rowY - f(20)) : rowY;
      ctx.font = `700 ${f(10)}px system-ui, Arial, sans-serif`;
      ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Payment Terms', tx, baseY - f(14));
      ctx.font = `${f(10)}px system-ui, Arial, sans-serif`;
      ctx.fillStyle = '#666';
      _wrapCanvas(ctx, terms, tx, baseY, W * .42, f(15));
    }
  }

  /* ── footer accent bar ── */
  const FTR_H = f(14);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, H - FTR_H, W, FTR_H);

  if (fromEmail || fromPhone) {
    ctx.font = `${f(9)}px system-ui, Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const footerTxt = [fromEmail, fromPhone].filter(Boolean).join('  ·  ');
    ctx.fillText(footerTxt, W / 2, H - FTR_H / 2);
  }
}

/* ═══════════════════════════════════════════════
   ALPINE COMPONENT
═══════════════════════════════════════════════ */
function invoiceGeneratorApp() {
  return {
    mobileMenuOpen: false,

    /* sender */
    fromName:    '',
    fromAddress: '',
    fromEmail:   '',
    fromPhone:   '',
    logoText:    '',
    logoImg:     null, /* HTMLImageElement or null */

    /* client */
    toName:    '',
    toAddress: '',
    toEmail:   '',
    toPhone:   '',

    /* invoice meta */
    invoiceNum:  '',
    invoiceDate: '',
    dueDate:     '',
    poNumber:    '',

    /* items */
    items: [],

    /* financials */
    taxRate:      '0',
    discountRate: '0',

    /* notes */
    notes: '',
    terms: 'Payment due within 30 days.',

    /* style */
    accentColor:  '#3b82f6',
    currencyCode: 'USD',
    paperSizeId:  'a4',

    currencies:   CURRENCIES,
    accentColors: ACCENT_COLORS,
    paperSizes:   PAPER_SIZES,

    get paperSize()  { return PAPER_SIZES.find(p => p.id === this.paperSizeId) || PAPER_SIZES[0]; },
    get currency()   { return CURRENCIES.find(c => c.code === this.currencyCode) || CURRENCIES[0]; },
    get sym()        { return this.currency.symbol; },

    get subtotal()    { return this.items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0); },
    get discountAmt() { return this.subtotal * (parseFloat(this.discountRate) || 0) / 100; },
    get taxAmt()      { return (this.subtotal - this.discountAmt) * (parseFloat(this.taxRate) || 0) / 100; },
    get total()       { return this.subtotal - this.discountAmt + this.taxAmt; },

    fmtMoney(n) { return fmtMoney(n, this.sym); },

    /* ── init ── */
    init() {
      _canvas = this.$refs.previewCanvas;
      _ctx    = _canvas.getContext('2d');

      const today = new Date();
      const due   = new Date(today); due.setDate(due.getDate() + 30);
      this.invoiceDate = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      this.dueDate     = due.toLocaleDateString('en-US',   { year: 'numeric', month: 'long', day: 'numeric' });
      this.invoiceNum  = '0001';

      this.items = [
        { id: _nextId++, desc: 'Design Services',  qty: '1', rate: '500.00' },
        { id: _nextId++, desc: 'Development Work', qty: '8', rate: '75.00'  },
      ];

      this.$nextTick(() => this.render());

      const fields = [
        'fromName','fromAddress','fromEmail','fromPhone','logoText',
        'toName','toAddress','toEmail','toPhone',
        'invoiceNum','invoiceDate','dueDate','poNumber',
        'taxRate','discountRate','notes','terms',
        'accentColor','currencyCode','paperSizeId',
      ];
      fields.forEach(f => this.$watch(f, () => this.render()));
      this.$watch('items', () => this.render(), { deep: true });
      this.$watch('logoImg', () => this.render());
    },

    /* ── canvas render ── */
    render() {
      const { w: W, h: H } = this.paperSize;
      _canvas.width  = W;
      _canvas.height = H;
      renderInvoice(_ctx, W, H, this._cfg());
    },

    _cfg() {
      return {
        accentColor:  this.accentColor,
        fromName:     this.fromName,
        fromAddress:  this.fromAddress,
        fromEmail:    this.fromEmail,
        fromPhone:    this.fromPhone,
        toName:       this.toName,
        toAddress:    this.toAddress,
        toEmail:      this.toEmail,
        toPhone:      this.toPhone,
        invoiceNum:   this.invoiceNum,
        invoiceDate:  this.invoiceDate,
        dueDate:      this.dueDate,
        poNumber:     this.poNumber,
        items:        this.items,
        taxRate:      this.taxRate,
        discountRate: this.discountRate,
        notes:        this.notes,
        terms:        this.terms,
        currency:     this.currency,
        logoText:     this.logoText,
        logoImg:      this.logoImg,
      };
    },

    /* ── logo upload ── */
    handleLogoUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => { this.logoImg = img; };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    removeLogo() {
      this.logoImg = null;
      const inp = document.getElementById('logoInput');
      if (inp) inp.value = '';
    },

    /* ── items ── */
    addItem() {
      this.items.push({ id: _nextId++, desc: '', qty: '1', rate: '0.00' });
      this.render();
    },

    removeItem(id) {
      this.items = this.items.filter(it => it.id !== id);
      this.render();
    },

    itemAmount(it) {
      return fmtMoney((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), this.sym);
    },

    /* ── download PDF ── */
    downloadPdf() {
      if (typeof window.jspdf === 'undefined') {
        this._toast('PDF library not loaded yet — try again in a moment.');
        return;
      }
      const { jsPDF } = window.jspdf;
      const ps = this.paperSize;
      const off = document.createElement('canvas');
      off.width  = ps.w * 2; off.height = ps.h * 2;
      const octx = off.getContext('2d');
      octx.scale(2, 2);
      renderInvoice(octx, ps.w, ps.h, this._cfg());

      const img = off.toDataURL('image/jpeg', 0.96);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [ps.pdfW, ps.pdfH] });
      pdf.addImage(img, 'JPEG', 0, 0, ps.pdfW, ps.pdfH);

      const slug = (this.toName || 'invoice').replace(/[^a-z0-9]/gi, '_');
      pdf.save(`invoice_${this.invoiceNum || '0001'}_${slug}.pdf`);
      this._toast('Invoice downloaded!');
    },

    /* ── download PNG ── */
    downloadPng() {
      const ps = this.paperSize;
      const off = document.createElement('canvas');
      off.width  = ps.w * 2; off.height = ps.h * 2;
      const octx = off.getContext('2d');
      octx.scale(2, 2);
      renderInvoice(octx, ps.w, ps.h, this._cfg());
      off.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url;
        a.download = `invoice_${this.invoiceNum || '0001'}.png`;
        a.click();
        URL.revokeObjectURL(url);
        this._toast('PNG downloaded!');
      }, 'image/png');
    },

    /* ── sample data ── */
    loadSample() {
      this.fromName    = 'Acme Studio';
      this.fromAddress = '123 Creative Ave\nNew York, NY 10001';
      this.fromEmail   = 'billing@acmestudio.com';
      this.fromPhone   = '+1 (212) 555-0100';
      this.logoText    = 'Acme Studio';
      this.toName      = 'GlobalTech Corp';
      this.toAddress   = '456 Business Blvd\nSan Francisco, CA 94105';
      this.toEmail     = 'ap@globaltech.com';
      this.toPhone     = '+1 (415) 555-0200';
      this.taxRate     = '10';
      this.discountRate= '5';
      this.notes       = 'Thank you for your business! Payment can be made via bank transfer or PayPal.';
      this.terms       = 'Payment due within 30 days. Late payments subject to 1.5% monthly interest.';
      this.items = [
        { id: _nextId++, desc: 'Brand Identity Design',   qty: '1',  rate: '1200.00' },
        { id: _nextId++, desc: 'UI/UX Design (per hour)', qty: '16', rate: '95.00'   },
        { id: _nextId++, desc: 'Frontend Development',    qty: '12', rate: '110.00'  },
        { id: _nextId++, desc: 'Project Management',      qty: '5',  rate: '80.00'   },
      ];
      this.render();
      this._toast('Sample invoice loaded');
    },

    clearAll() {
      this.fromName = this.fromAddress = this.fromEmail = this.fromPhone = this.logoText = '';
      this.toName   = this.toAddress   = this.toEmail   = this.toPhone   = '';
      this.invoiceNum = '0001'; this.poNumber = '';
      this.taxRate = '0'; this.discountRate = '0';
      this.notes = ''; this.terms = 'Payment due within 30 days.';
      this.items = [{ id: _nextId++, desc: '', qty: '1', rate: '0.00' }];
      this.logoImg = null;
      const inp = document.getElementById('logoInput');
      if (inp) inp.value = '';
      this.render();
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    },
  };
}
