function urlEncoderApp() {
  return {
    mode: 'encode',
    encodeMode: 'component',
    input: '',
    output: '',
    error: '',
    params: [],
    parsedPath: '',

    process() {
      this.error = '';
      if (this.mode === 'params') {
        this.parseQueryString();
        return;
      }
      if (!this.input.trim()) { this.output = ''; return; }
      try {
        if (this.mode === 'encode') {
          this.output = this.encodeText(this.input);
        } else {
          this.output = this.decodeText(this.input);
        }
      } catch(e) {
        this.error = 'Decoding error: ' + e.message;
        this.output = '';
      }
    },

    encodeText(str) {
      if (this.encodeMode === 'component') return encodeURIComponent(str);
      if (this.encodeMode === 'uri') return encodeURI(str);
      if (this.encodeMode === 'form') {
        return encodeURIComponent(str).replace(/%20/g, '+').replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
      }
      return encodeURIComponent(str);
    },

    decodeText(str) {
      if (this.encodeMode === 'form') {
        return decodeURIComponent(str.replace(/\+/g, '%20'));
      }
      // Try decodeURIComponent first; fall back to decodeURI
      try {
        return decodeURIComponent(str);
      } catch {
        return decodeURI(str);
      }
    },

    parseQueryString() {
      this.params = [];
      this.parsedPath = '';
      const raw = this.input.trim();
      if (!raw) return;

      let qs = raw;
      let path = '';

      // Extract path if full URL
      try {
        const u = new URL(raw);
        path = u.origin + u.pathname;
        qs = u.search.slice(1); // remove leading ?
        this.parsedPath = path;
      } catch {
        // Not a full URL — treat as query string
        if (raw.includes('?')) {
          qs = raw.split('?')[1];
          path = raw.split('?')[0];
          this.parsedPath = path || '';
        }
      }

      if (!qs) return;

      const pairs = qs.split('&');
      pairs.forEach(pair => {
        const [k, ...vParts] = pair.split('=');
        const encodedVal = vParts.join('=');
        let decodedKey = k, decodedVal = '';
        try { decodedKey = decodeURIComponent(k.replace(/\+/g, '%20')); } catch {}
        try { decodedVal = decodeURIComponent(encodedVal.replace(/\+/g, '%20')); } catch { decodedVal = encodedVal; }
        this.params.push({ key: decodedKey, encoded: encodedVal, decoded: decodedVal });
      });
    },

    swapInputOutput() {
      if (this.mode === 'encode') {
        this.input = this.output;
        this.mode = 'decode';
      } else {
        this.input = this.output;
        this.mode = 'encode';
      }
      this.process();
    },

    loadExample() {
      if (this.mode === 'encode') {
        this.input = 'https://example.com/search?q=hello world&category=web tools&lang=en';
      } else if (this.mode === 'decode') {
        this.input = 'https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26category%3Dweb%20tools%26lang%3Den';
      } else {
        this.input = 'https://example.com/search?q=hello+world&category=web+tools&page=1&sort=relevance&lang=en';
      }
      this.process();
    },

    copyOutput() {
      if (!this.output) return;
      navigator.clipboard.writeText(this.output).then(() => showToast('Copied!')).catch(() => {
        const el = document.createElement('textarea');
        el.value = this.output;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast('Copied!');
      });
    },
  };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
