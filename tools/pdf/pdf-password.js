/* PDF Password — Protect & Remove
   pdf-lib handles both encryption and decryption natively.
   _pdfBytes lives outside Alpine's reactive proxy. */

let _pdfBytes   = null;   /* ArrayBuffer of the loaded PDF */
let _resultBlob = null;   /* Blob for pending download     */

function pdfPasswordApp() {
  return {
    mode:        'protect',   /* 'protect' | 'remove' */
    stage:       'upload',    /* 'upload' | 'form' | 'processing' | 'done' */
    pdfName:     '',
    pdfSize:     0,
    isDragOver:  false,

    /* protect-mode fields */
    userPw:      '',
    userPwShow:  false,
    confirmPw:   '',
    confirmShow: false,
    ownerPw:     '',
    ownerShow:   false,
    allowPrint:  true,
    allowCopy:   true,
    allowEdit:   false,

    /* remove-mode fields */
    currentPw:   '',
    currentShow: false,

    /* result */
    resultSize:  0,
    error:       '',
    processing:  false,

    /* ── init ─────────────────────────────── */
    init() {
      if (typeof PDFLib === 'undefined') {
        this.error = 'pdf-lib failed to load — please refresh.';
      }
    },

    /* ── mode switch ──────────────────────── */
    setMode(m) {
      this.mode  = m;
      this.error = '';
      if (this.stage === 'done') this.stage = _pdfBytes ? 'form' : 'upload';
    },

    /* ── computed ─────────────────────────── */
    get pwStrength() {
      const p = this.userPw;
      if (!p) return { pct: 0, color: '#636380', label: '' };
      let score = 0;
      if (p.length >= 6)  score++;
      if (p.length >= 10) score++;
      if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
      if (/\d/.test(p)) score++;
      if (/[^A-Za-z0-9]/.test(p)) score++;
      if (score <= 1) return { pct: 20,  color: '#ef4444', label: 'Weak' };
      if (score === 2) return { pct: 45,  color: '#f97316', label: 'Fair' };
      if (score === 3) return { pct: 70,  color: '#facc15', label: 'Good' };
      return               { pct: 100, color: '#4ade80', label: 'Strong' };
    },

    get canProtect() {
      return this.userPw.length > 0 &&
             this.userPw === this.confirmPw &&
             !this.processing;
    },

    get canRemove() {
      return this.currentPw.length > 0 && !this.processing;
    },

    get confirmMismatch() {
      return this.confirmPw.length > 0 && this.userPw !== this.confirmPw;
    },

    /* ── file intake ──────────────────────── */
    onFileInput(e) {
      const f = e.target.files[0];
      if (f) this._loadFile(f);
      e.target.value = '';
    },

    onDrop(e) {
      this.isDragOver = false;
      const f = Array.from(e.dataTransfer.files)
        .find(x => x.type === 'application/pdf' || /\.pdf$/i.test(x.name));
      if (f) this._loadFile(f);
    },

    async _loadFile(file) {
      this.error   = '';
      _pdfBytes    = await file.arrayBuffer();
      _resultBlob  = null;
      this.pdfName = file.name;
      this.pdfSize = file.size;
      this.stage   = 'form';
      /* reset field values */
      this.userPw = this.confirmPw = this.ownerPw = this.currentPw = '';
      this.resultSize = 0;
    },

    reset() {
      _pdfBytes   = null;
      _resultBlob = null;
      this.stage      = 'upload';
      this.pdfName    = '';
      this.pdfSize    = 0;
      this.error      = '';
      this.resultSize = 0;
      this.userPw = this.confirmPw = this.ownerPw = this.currentPw = '';
    },

    /* ── PROTECT ──────────────────────────── */
    async protect() {
      if (!this.canProtect) return;
      this.processing = true;
      this.error      = '';
      try {
        const doc = await PDFLib.PDFDocument.load(_pdfBytes);
        const bytes = await doc.save({
          userPassword:  this.userPw,
          ownerPassword: this.ownerPw.trim() || this.userPw,
          permissions: {
            printing:             this.allowPrint ? 'highResolution' : 'none',
            modifying:            this.allowEdit,
            copying:              this.allowCopy,
            annotating:           true,
            fillingForms:         true,
            contentAccessibility: true,
            documentAssembly:     false,
          },
        });
        this.resultSize = bytes.byteLength;
        _resultBlob     = new Blob([bytes], { type: 'application/pdf' });
        this.stage      = 'done';
        this._triggerDownload('protected');
      } catch (err) {
        this.error = err.message || 'Failed to encrypt PDF.';
      }
      this.processing = false;
    },

    /* ── REMOVE ───────────────────────────── */
    async remove() {
      if (!this.canRemove) return;
      this.processing = true;
      this.error      = '';
      try {
        /* Check if the PDF is actually encrypted first.
           An unencrypted PDF loads fine with no options — if that succeeds,
           there is no password to remove. */
        let isEncrypted = false;
        try {
          await PDFLib.PDFDocument.load(_pdfBytes);
        } catch (_) {
          isEncrypted = true;
        }
        if (!isEncrypted) {
          this.error = 'This PDF is not password-protected — there is no password to remove.';
          this.processing = false;
          return;
        }

        const doc = await PDFLib.PDFDocument.load(_pdfBytes, {
          password: this.currentPw,
          ignoreEncryption: false,
        });
        const bytes = await doc.save();
        this.resultSize = bytes.byteLength;
        _resultBlob     = new Blob([bytes], { type: 'application/pdf' });
        this.stage      = 'done';
        this._triggerDownload('unlocked');
      } catch (err) {
        if (/password|decrypt|encrypt/i.test(err.message)) {
          this.error = 'Incorrect password — could not open this PDF. Please check the password and try again.';
        } else {
          this.error = err.message || 'Failed to remove password.';
        }
      }
      this.processing = false;
    },

    /* ── download helpers ─────────────────── */
    _triggerDownload(suffix) {
      if (!_resultBlob) return;
      const url  = URL.createObjectURL(_resultBlob);
      const base = this.pdfName.replace(/\.pdf$/i, '');
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${base}_${suffix}.pdf`;
      /* Must be in the DOM for Firefox and some Chromium builds to honour download */
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    },

    downloadAgain() { this._triggerDownload(this.mode === 'protect' ? 'protected' : 'unlocked'); },

    doAnother() {
      /* Keep same file, go back to form */
      this.stage      = 'form';
      this.resultSize = 0;
      this.error      = '';
      this.userPw = this.confirmPw = this.ownerPw = this.currentPw = '';
    },

    /* ── helpers ──────────────────────────── */
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
