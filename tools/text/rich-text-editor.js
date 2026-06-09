/* ── Rich Text WYSIWYG Editor ── */

function richTextApp() {
  return {
    /* ── state ── */
    activeTab:  'html',   /* html | preview | text */
    wordCount:  0,
    charCount:  0,
    paraCount:  0,
    htmlOutput: '',
    textOutput: '',

    /* modal state */
    showLinkModal:  false,
    showImgModal:   false,
    showTableModal: false,
    linkUrl:    'https://',
    linkText:   '',
    imgUrl:     '',
    imgAlt:     '',
    tableRows:  '3',
    tableCols:  '3',

    /* saved selection for modals */
    _savedRange: null,

    /* ── init ── */
    init() {
      const ed = this.$refs.editor;

      /* load autosaved content */
      try {
        const saved = localStorage.getItem('rte_content');
        if (saved) ed.innerHTML = saved;
      } catch {}

      this._update();

      /* observe changes */
      ed.addEventListener('input', () => this._update());
      ed.addEventListener('paste', (e) => this._handlePaste(e));

      /* track active formats for toolbar highlight */
      document.addEventListener('selectionchange', () => this._updateActiveStates());
    },

    /* ── core exec ── */
    exec(cmd, value = null) {
      this.$refs.editor.focus();
      document.execCommand(cmd, false, value);
      this._update();
      this._updateActiveStates();
    },

    /* ── format commands ── */
    bold()          { this.exec('bold'); },
    italic()        { this.exec('italic'); },
    underline()     { this.exec('underline'); },
    strikethrough() { this.exec('strikeThrough'); },
    superscript()   { this.exec('superscript'); },
    subscript()     { this.exec('subscript'); },
    removeFormat()  { this.exec('removeFormat'); },

    alignLeft()   { this.exec('justifyLeft'); },
    alignCenter() { this.exec('justifyCenter'); },
    alignRight()  { this.exec('justifyRight'); },
    alignFull()   { this.exec('justifyFull'); },

    indent()  { this.exec('indent'); },
    outdent() { this.exec('outdent'); },

    orderedList()   { this.exec('insertOrderedList'); },
    unorderedList() { this.exec('insertUnorderedList'); },

    blockquote() {
      this.$refs.editor.focus();
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const range = sel.getRangeAt(0);
      const bq = document.createElement('blockquote');
      try { range.surroundContents(bq); }
      catch { bq.appendChild(range.extractContents()); range.insertNode(bq); }
      this._update();
    },

    insertHR() {
      this.exec('insertHorizontalRule');
    },

    insertCode() {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const selected = sel.getRangeAt(0).toString();
      const code = document.createElement('code');
      code.textContent = selected || 'code';
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(code);
      this._update();
    },

    highlight() { this.exec('hiliteColor', '#fef08a'); },

    setHeading(val) {
      if (val === 'p') this.exec('formatBlock', '<p>');
      else             this.exec('formatBlock', `<${val}>`);
    },

    setFont(val)  { this.exec('fontName', val); },
    setSize(val)  { this.exec('fontSize', val); },
    setColor(val) { this.exec('foreColor', val); },
    setBg(val)    { this.exec('hiliteColor', val); },

    undo() { this.exec('undo'); },
    redo() { this.exec('redo'); },

    /* ── link modal ── */
    openLinkModal() {
      this._saveSelection();
      const sel = window.getSelection();
      this.linkText = sel ? sel.toString() : '';
      this.linkUrl  = 'https://';
      this.showLinkModal = true;
      this.$nextTick(() => this.$refs.linkUrlInput?.focus());
    },

    insertLink() {
      this._restoreSelection();
      const url  = this.linkUrl.trim();
      const text = this.linkText.trim();
      if (!url) { this.showLinkModal = false; return; }
      if (text) {
        const a   = document.createElement('a');
        a.href    = url;
        a.target  = '_blank';
        a.rel     = 'noopener';
        a.textContent = text;
        const range = this._savedRange;
        if (range) { range.deleteContents(); range.insertNode(a); }
      } else {
        this.exec('createLink', url);
        /* make target=_blank */
        this.$refs.editor.querySelectorAll('a[href="' + url + '"]').forEach(a => {
          a.target = '_blank'; a.rel = 'noopener';
        });
      }
      this.showLinkModal = false;
      this._update();
    },

    unlink() { this.exec('unlink'); },

    /* ── image modal ── */
    openImgModal() {
      this._saveSelection();
      this.imgUrl = ''; this.imgAlt = '';
      this.showImgModal = true;
      this.$nextTick(() => this.$refs.imgUrlInput?.focus());
    },

    insertImage() {
      this._restoreSelection();
      const url = this.imgUrl.trim();
      if (!url) { this.showImgModal = false; return; }
      const img = document.createElement('img');
      img.src  = url; img.alt = this.imgAlt;
      img.style.maxWidth = '100%';
      const range = this._savedRange || window.getSelection()?.getRangeAt(0);
      if (range) { range.collapse(false); range.insertNode(img); }
      this.showImgModal = false;
      this._update();
    },

    /* image upload from disk */
    handleImageUpload(ev) {
      const file = ev.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        this._restoreSelection();
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = file.name;
        img.style.maxWidth = '100%';
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.collapse(false);
          range.insertNode(img);
        } else {
          this.$refs.editor.appendChild(img);
        }
        this._update();
      };
      reader.readAsDataURL(file);
      ev.target.value = '';
    },

    /* ── table modal ── */
    openTableModal() {
      this._saveSelection();
      this.tableRows = '3'; this.tableCols = '3';
      this.showTableModal = true;
    },

    insertTable() {
      this._restoreSelection();
      const rows = Math.min(20, Math.max(1, parseInt(this.tableRows) || 3));
      const cols = Math.min(10, Math.max(1, parseInt(this.tableCols) || 3));
      let html = '<table><thead><tr>';
      for (let c = 0; c < cols; c++) html += `<th>Header ${c + 1}</th>`;
      html += '</tr></thead><tbody>';
      for (let r = 0; r < rows - 1; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) html += '<td>Cell</td>';
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      this.exec('insertHTML', html);
      this.showTableModal = false;
    },

    /* ── clear ── */
    clearContent() {
      if (!confirm('Clear all content?')) return;
      this.$refs.editor.innerHTML = '';
      this._update();
      try { localStorage.removeItem('rte_content'); } catch {}
    },

    /* ── load sample ── */
    loadSample() {
      this.$refs.editor.innerHTML = `
<h1>Welcome to Rich Text Editor</h1>
<p>This is a fully-featured <strong>WYSIWYG</strong> editor that runs entirely in your browser. Use the toolbar to format text, insert tables, add links, and more — then export to <em>clean HTML</em> or plain text.</p>
<h2>Text Formatting</h2>
<p>You can make text <strong>bold</strong>, <em>italic</em>, <u>underlined</u>, or <s>strikethrough</s>. You can also <mark>highlight</mark> important passages, use <sup>superscript</sup> or <sub>subscript</sub>, and change font colours and sizes.</p>
<h2>Lists</h2>
<ul>
  <li>Unordered list item one</li>
  <li>Unordered list item two</li>
  <li>Unordered list item three</li>
</ul>
<ol>
  <li>First ordered item</li>
  <li>Second ordered item</li>
  <li>Third ordered item</li>
</ol>
<h2>Blockquote</h2>
<blockquote>The best way to predict the future is to invent it. — Alan Kay</blockquote>
<h2>Code</h2>
<p>Use inline <code>code()</code> for short snippets. Paste longer code blocks as needed.</p>
<h2>Table</h2>
<table>
  <thead><tr><th>Name</th><th>Role</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>Alice</td><td>Designer</td><td>Active</td></tr>
    <tr><td>Bob</td><td>Developer</td><td>Active</td></tr>
    <tr><td>Carol</td><td>Manager</td><td>On leave</td></tr>
  </tbody>
</table>
<hr>
<p>Edit anything above, or start fresh — your changes auto-save in your browser.</p>`;
      this._update();
      this._toast('Sample loaded');
    },

    /* ── print ── */
    print() {
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head><title>Document</title><style>
        body{font-family:Georgia,serif;max-width:800px;margin:40px auto;line-height:1.8;color:#111}
        h1,h2,h3{line-height:1.2}blockquote{border-left:4px solid #6C63FF;padding:6px 16px;color:#555;background:#f8f7ff}
        table{border-collapse:collapse;width:100%}th,td{border:1px solid #e5e7eb;padding:8px 12px}
        th{background:#f8f7ff;font-weight:700}code{background:#f1f5f9;padding:2px 5px;border-radius:3px}
        a{color:#6C63FF}mark{background:#fef08a}
      </style></head><body>${this.$refs.editor.innerHTML}</body></html>`);
      win.document.close();
      win.focus();
      win.print();
    },

    /* ── export HTML ── */
    copyHtml() {
      navigator.clipboard.writeText(this.htmlOutput).then(() => this._toast('HTML copied!'));
    },

    downloadHtml() {
      const blob = new Blob([`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"/>\n<title>Document</title>\n</head>\n<body>\n${this.htmlOutput}\n</body>\n</html>`], { type: 'text/html' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'document.html' });
      a.click(); URL.revokeObjectURL(a.href);
      this._toast('HTML downloaded!');
    },

    copyText() {
      navigator.clipboard.writeText(this.textOutput).then(() => this._toast('Text copied!'));
    },

    downloadText() {
      const blob = new Blob([this.textOutput], { type: 'text/plain' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'document.txt' });
      a.click(); URL.revokeObjectURL(a.href);
      this._toast('Text downloaded!');
    },

    /* ── paste handler — strips non-content formatting ── */
    _handlePaste(e) {
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      if (html) {
        e.preventDefault();
        /* clean up pasted HTML — remove style/class/id but keep structure */
        const clean = _cleanHtml(html);
        document.execCommand('insertHTML', false, clean);
      } else if (text) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
      }
    },

    /* ── stats & sync ── */
    _update() {
      const ed = this.$refs.editor;
      const text = ed.innerText || '';
      this.htmlOutput = ed.innerHTML;
      this.textOutput = text;

      /* word count */
      const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
      this.wordCount = words.length;
      this.charCount = text.length;
      const paras = ed.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote');
      this.paraCount = paras.length;

      /* autosave */
      try { localStorage.setItem('rte_content', ed.innerHTML); } catch {}
    },

    _updateActiveStates() {
      /* highlight toolbar buttons based on current selection state */
      const cmds = ['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','justifyFull','insertOrderedList','insertUnorderedList'];
      cmds.forEach(cmd => {
        const btn = document.querySelector(`[data-cmd="${cmd}"]`);
        if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
      });
    },

    /* ── selection helpers ── */
    _saveSelection() {
      const sel = window.getSelection();
      this._savedRange = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    },

    _restoreSelection() {
      if (!this._savedRange) return;
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(this._savedRange);
    },

    /* ── FAQ ── */
    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    /* ── toast ── */
    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    },
  };
}

/* ── HTML cleaner for paste ── */
function _cleanHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  /* remove script, style, meta, link tags */
  div.querySelectorAll('script,style,meta,link,head').forEach(el => el.remove());

  /* strip style/class/id from every element — keep structure */
  div.querySelectorAll('*').forEach(el => {
    el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('id');
    el.removeAttribute('bgcolor');
    el.removeAttribute('color');
    el.removeAttribute('face');
    el.removeAttribute('size');
    /* keep href on <a>, src/alt on <img> */
  });

  return div.innerHTML;
}
