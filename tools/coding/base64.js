/* ─── Base64 encode (handles full Unicode) ─── */
function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/* ─── Base64 decode (handles full Unicode) ─── */
function b64Decode(str) {
  try {
    return decodeURIComponent(escape(atob(str.trim())));
  } catch (e) {
    throw new Error('Invalid Base64 input — ' + e.message);
  }
}

/* ─── URL-safe Base64 encode ─── */
function b64UrlEncode(str) {
  return b64Encode(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ─── URL-safe Base64 decode ─── */
function b64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return b64Decode(s);
}

/* ─── File → Base64 ─── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result); // includes data URI prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Base64 (data URI) → Blob download ─── */
function base64ToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/* ─── Check if string looks like Base64 ─── */
function isBase64(str) {
  str = str.trim();
  if (!str) return false;
  // URL-safe variant
  const urlSafe = /^[A-Za-z0-9\-_]*={0,2}$/.test(str) && str.length % 4 === 0;
  const standard = /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0;
  return standard || urlSafe;
}

/* ─── Alpine component ─── */
function base64App() {
  return {
    mode: 'encode',    // 'encode' | 'decode'
    urlSafe: false,
    input: '',
    output: '',
    errorMsg: '',
    isValid: null,

    // Batch
    batchInput: '',
    batchOutput: '',
    batchMode: 'encode',

    // File
    fileName: '',
    fileSize: '',
    fileBase64: '',
    fileType: '',
    fileMime: '',
    fileError: '',
    imagePreviewSrc: '',

    init() {
      this.input = 'Hello, World! 🌍';
      this.run();
    },

    run() {
      if (!this.input.trim()) {
        this.output = ''; this.errorMsg = ''; this.isValid = null; return;
      }
      try {
        if (this.mode === 'encode') {
          this.output = this.urlSafe ? b64UrlEncode(this.input) : b64Encode(this.input);
        } else {
          this.output = this.urlSafe ? b64UrlDecode(this.input) : b64Decode(this.input);
        }
        this.errorMsg = '';
        this.isValid = true;
      } catch (e) {
        this.output = '';
        this.errorMsg = e.message;
        this.isValid = false;
      }
    },

    setMode(m) {
      this.mode = m;
      this.errorMsg = '';
      this.isValid = null;
      if (this.input.trim()) this.run();
    },

    swap() {
      if (!this.output) return;
      this.input = this.output;
      this.mode = this.mode === 'encode' ? 'decode' : 'encode';
      this.run();
    },

    clear() {
      this.input = ''; this.output = ''; this.errorMsg = ''; this.isValid = null;
    },

    runBatch() {
      if (!this.batchInput.trim()) { this.batchOutput = ''; return; }
      const lines = this.batchInput.split('\n');
      this.batchOutput = lines.map(line => {
        if (!line.trim()) return '';
        try {
          return this.batchMode === 'encode'
            ? (this.urlSafe ? b64UrlEncode(line) : b64Encode(line))
            : (this.urlSafe ? b64UrlDecode(line) : b64Decode(line));
        } catch (e) {
          return '[ERROR: ' + e.message + ']';
        }
      }).join('\n');
    },

    async handleFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      this.fileError = '';
      this.fileName = file.name;
      this.fileSize = file.size < 1024
        ? file.size + ' B'
        : file.size < 1048576
          ? (file.size / 1024).toFixed(1) + ' KB'
          : (file.size / 1048576).toFixed(2) + ' MB';
      this.fileMime = file.type || 'application/octet-stream';
      if (file.size > 5 * 1024 * 1024) {
        this.fileError = 'File too large — max 5 MB for browser-based encoding.';
        e.target.value = '';
        return;
      }
      try {
        const dataUrl = await fileToBase64(file);
        this.fileBase64 = dataUrl;
        this.imagePreviewSrc = file.type.startsWith('image/') ? dataUrl : '';
        this.fileType = file.type.startsWith('image/') ? 'image' : 'other';
      } catch (err) {
        this.fileError = 'Could not read file.';
      }
      e.target.value = '';
    },

    downloadFile() {
      if (!this.fileBase64) return;
      const blob = base64ToBlob(this.fileBase64);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'decoded_' + (this.fileName || 'file');
      a.click();
    },

    clearFile() {
      this.fileName = ''; this.fileSize = ''; this.fileBase64 = '';
      this.fileType = ''; this.fileMime = ''; this.fileError = ''; this.imagePreviewSrc = '';
    },

    get rawBase64() {
      if (!this.fileBase64) return '';
      const idx = this.fileBase64.indexOf(',');
      return idx !== -1 ? this.fileBase64.slice(idx + 1) : this.fileBase64;
    },

    get statusLabel() {
      if (this.isValid === null) return 'Empty';
      return this.isValid ? (this.mode === 'encode' ? 'Encoded' : 'Decoded') : 'Error';
    },
    get statusClass() {
      if (this.isValid === null) return 'status-empty';
      return this.isValid ? 'status-valid' : 'status-error';
    },
    get inputSize() {
      const b = new Blob([this.input]).size;
      return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
    },
    get outputSize() {
      if (!this.output) return '—';
      const b = new Blob([this.output]).size;
      return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
    },
    get outputSizeRatio() {
      const ib = new Blob([this.input]).size;
      const ob = new Blob([this.output]).size;
      if (!ib || !ob) return '';
      return (ob / ib * 100).toFixed(0) + '%';
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    async copyOutput() {
      if (!this.output) return;
      try { await navigator.clipboard.writeText(this.output); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyInput() {
      if (!this.input) return;
      try { await navigator.clipboard.writeText(this.input); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyRaw() {
      if (!this.rawBase64) return;
      try { await navigator.clipboard.writeText(this.rawBase64); this._toast('Base64 copied!'); }
      catch { this._toast('Copy failed'); }
    },
    async copyBatch() {
      if (!this.batchOutput) return;
      try { await navigator.clipboard.writeText(this.batchOutput); this._toast('Copied!'); }
      catch { this._toast('Copy failed'); }
    },

    download() {
      if (!this.output) return;
      const ext = this.mode === 'encode' ? '.b64.txt' : '.txt';
      const blob = new Blob([this.output], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'base64_output' + ext;
      a.click();
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
