/* PDF Metadata Editor
   pdf-lib reads and writes document metadata without re-rendering pages.
   _pdf and _pdfBytes live outside Alpine's reactive proxy. */

let _pdf      = null;   /* PDFDocument instance     */
let _pdfBytes = null;   /* ArrayBuffer of source PDF */
let _resultBlob = null; /* Blob for download         */

function pdfMetadataApp() {
  return {
    stage:      'upload',   /* upload | editor | saving | done */
    pdfName:    '',
    pdfSize:    0,
    pageCount:  0,
    pdfVersion: '',
    isDragOver: false,
    processing: false,
    error:      '',
    resultSize: 0,

    /* Editable fields — populated from loaded PDF */
    title:    '',
    author:   '',
    subject:  '',
    keywords: '',
    creator:  '',
    producer: '',
    createdAt:  '',   /* datetime-local string */
    modifiedAt: '',   /* datetime-local string */

    /* Originals shown as "current value" hints */
    orig: {},

    /* ── init ───────────────────────────── */
    init() {
      if (typeof PDFLib === 'undefined') {
        this.error = 'pdf-lib failed to load — please refresh.';
      }
    },

    /* ── file intake ────────────────────── */
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._load(f);
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files)
        .find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (f) this._load(f);
    },

    async _load(file) {
      if (typeof PDFLib === 'undefined') {
        this.error = 'pdf-lib failed to load — please refresh.';
        return;
      }
      this.error   = '';
      this.pdfName = file.name;
      this.pdfSize = file.size;

      try {
        _pdfBytes    = await file.arrayBuffer();
        _pdf         = await PDFLib.PDFDocument.load(_pdfBytes, { ignoreEncryption: true });
        _resultBlob  = null;

        this.pageCount = _pdf.getPageCount();

        /* Read PDF version from raw header bytes */
        const hdr = String.fromCharCode(...new Uint8Array(_pdfBytes.slice(0, 12)));
        const vm  = hdr.match(/%PDF-(\d+\.\d+)/);
        this.pdfVersion = vm ? vm[1] : '—';

        /* Read current metadata */
        const t  = _pdf.getTitle()           || '';
        const a  = _pdf.getAuthor()          || '';
        const s  = _pdf.getSubject()         || '';
        const k  = _pdf.getKeywords()        || '';
        const cr = _pdf.getCreator()         || '';
        const pr = _pdf.getProducer()        || '';
        const cd = _pdf.getCreationDate();
        const md = _pdf.getModificationDate();

        this.title    = t;
        this.author   = a;
        this.subject  = s;
        this.keywords = k;
        this.creator  = cr;
        this.producer = pr;
        this.createdAt  = cd ? this._dateToInput(cd) : '';
        this.modifiedAt = md ? this._dateToInput(md) : '';

        /* Snapshot originals for hints */
        this.orig = { title: t, author: a, subject: s, keywords: k, creator: cr, producer: pr,
                      createdAt: this.createdAt, modifiedAt: this.modifiedAt };

        this.stage = 'editor';
      } catch (err) {
        this.error = 'Could not open this PDF. It may be encrypted or corrupted.';
      }
    },

    /* ── save ───────────────────────────── */
    async save() {
      if (this.processing) return;
      this.processing = true;
      this.error = '';

      try {
        /* Reload a fresh copy so we never double-mutate */
        const doc = await PDFLib.PDFDocument.load(_pdfBytes, { ignoreEncryption: true });

        /* Apply each field — set to empty string clears it */
        doc.setTitle(this.title.trim());
        doc.setAuthor(this.author.trim());
        doc.setSubject(this.subject.trim());
        doc.setKeywords([this.keywords.trim()]);
        doc.setCreator(this.creator.trim());
        doc.setProducer(this.producer.trim());

        if (this.createdAt)  doc.setCreationDate(new Date(this.createdAt));
        if (this.modifiedAt) doc.setModificationDate(new Date(this.modifiedAt));

        const bytes = await doc.save();
        this.resultSize = bytes.byteLength;
        _resultBlob = new Blob([bytes], { type: 'application/pdf' });
        this._triggerDownload();
        this.stage = 'done';
      } catch (err) {
        this.error = err.message || 'Failed to save metadata.';
      }

      this.processing = false;
    },

    /* ── download ───────────────────────── */
    _triggerDownload() {
      if (!_resultBlob) return;
      const url  = URL.createObjectURL(_resultBlob);
      const base = this.pdfName.replace(/\.pdf$/i, '');
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${base}_metadata.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    },

    downloadAgain() { this._triggerDownload(); },

    editAgain() {
      this.stage      = 'editor';
      this.resultSize = 0;
      this.error      = '';
    },

    clearAll() {
      this.title = this.author = this.subject = this.keywords =
      this.creator = this.producer = this.createdAt = this.modifiedAt = '';
    },

    reset() {
      _pdf = null; _pdfBytes = null; _resultBlob = null;
      this.stage = 'upload';
      this.pdfName = ''; this.pdfSize = 0; this.pageCount = 0; this.pdfVersion = '';
      this.error = ''; this.resultSize = 0; this.processing = false;
      this.title = this.author = this.subject = this.keywords =
      this.creator = this.producer = this.createdAt = this.modifiedAt = '';
      this.orig = {};
    },

    /* ── helpers ────────────────────────── */
    _dateToInput(d) {
      if (!(d instanceof Date) || isNaN(d)) return '';
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
             `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes < 1024)    return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    },

    toggleFaq(btn) {
      btn.closest('.faq-item').classList.toggle('open');
    },
  };
}
