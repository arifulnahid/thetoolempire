/* PDF Password — Protect & Remove
   Protect: PDF.js renders pages → jsPDF rebuilds with RC4 encryption.
   Remove:  pdf-lib loads with password → saves without (native decrypt).
   _pdfBytes lives outside Alpine's reactive proxy. */

let _pdfBytes   = null;
let _resultBlob = null;

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
    resultSize:   0,
    error:        '',
    processing:   false,
    progressPage: 0,
    progressTotal:0,

    /* ── init ─────────────────────────────── */
    init() {
      if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
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
      this.processing    = true;
      this.error         = '';
      this.progressPage  = 0;
      this.progressTotal = 0;

      try {
        if (typeof pdfjsLib === 'undefined' || typeof window.jspdf === 'undefined') {
          throw new Error('Required libraries failed to load — please refresh.');
        }

        const pdfDoc = await pdfjsLib.getDocument({ data: _pdfBytes.slice(0) }).promise;
        const n      = pdfDoc.numPages;
        this.progressTotal = n;

        /* Get first page size to initialise jsPDF */
        const firstPage = await pdfDoc.getPage(1);
        const vp1       = firstPage.getViewport({ scale: 1 });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
          unit:   'pt',
          format: [vp1.width, vp1.height],
          encryption: {
            userPassword:    this.userPw,
            ownerPassword:   this.ownerPw.trim() || this.userPw,
            userPermissions: [
              ...(this.allowPrint ? ['print']  : []),
              ...(this.allowCopy  ? ['copy']   : []),
              ...(this.allowEdit  ? ['modify'] : []),
              'annot-forms',
            ],
          },
        });

        for (let i = 1; i <= n; i++) {
          this.progressPage = i;

          const page    = await pdfDoc.getPage(i);
          const vpNat   = page.getViewport({ scale: 1 });
          const vpRend  = page.getViewport({ scale: 2 });

          const canvas    = document.createElement('canvas');
          canvas.width    = vpRend.width;
          canvas.height   = vpRend.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vpRend }).promise;
          const imgData   = canvas.toDataURL('image/jpeg', 0.92);

          if (i > 1) doc.addPage([vpNat.width, vpNat.height]);
          doc.addImage(imgData, 'JPEG', 0, 0, vpNat.width, vpNat.height, '', 'FAST');
        }

        const bytes     = doc.output('arraybuffer');
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
