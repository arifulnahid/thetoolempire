/* ── PDF Bookmark Tool ── */
/* Uses pdf-lib (pure JS) to add a bookmark/outline tree to any PDF */

const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

let _pdflibLoaded = false;
function _loadPdfLib() {
  if (_pdflibLoaded || window.PDFLib) { _pdflibLoaded = true; return Promise.resolve(); }
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PDFLIB_CDN;
    s.onload = () => { _pdflibLoaded = true; res(); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

function pdfBookmarkApp() {
  return {
    mobileMenuOpen: false,

    /* file */
    file: null,
    fileName: '',
    fileSize: '',
    totalPages: 0,
    pdfBytes: null,

    /* bookmarks */
    bookmarks: [],
    _idSeq: 1,

    /* ui */
    dragging: false,
    processing: false,
    progress: 0,
    dragSrcId: null,

    /* ── init ── */
    init() {},

    /* ── file ── */
    handleFile(ev) {
      const f = ev.target.files?.[0] || ev.dataTransfer?.files?.[0];
      if (!f) return;
      if (!f.name.toLowerCase().endsWith('.pdf')) { this._toast('Please upload a PDF file'); return; }
      ev.target && (ev.target.value = '');
      this.fileName = f.name;
      this.fileSize = this._fmtSize(f.size);
      const reader = new FileReader();
      reader.onload = async (e) => {
        this.pdfBytes = new Uint8Array(e.target.result);
        await this._readPageCount();
      };
      reader.readAsArrayBuffer(f);
      this.file = f;
    },

    handleDrop(ev) {
      ev.preventDefault();
      this.dragging = false;
      this.handleFile(ev);
    },

    async _readPageCount() {
      try {
        await _loadPdfLib();
        const doc = await PDFLib.PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });
        this.totalPages = doc.getPageCount();
        /* seed bookmarks from existing outline if any */
        this._seedFromOutline(doc);
        this._toast(`Loaded — ${this.totalPages} pages`);
      } catch (e) {
        this._toast('Could not read PDF: ' + e.message);
      }
    },

    _seedFromOutline(doc) {
      /* pdf-lib exposes raw outline nodes — try to read titles+page refs */
      const seeded = [];
      try {
        const catalog = doc.catalog;
        const outlineRef = catalog.get(PDFLib.PDFName.of('Outlines'));
        if (!outlineRef) return;
        const outline = doc.context.lookup(outlineRef);
        const firstRef = outline.get(PDFLib.PDFName.of('First'));
        if (!firstRef) return;
        const pages = doc.getPages();
        const walk = (nodeRef, depth) => {
          if (!nodeRef || depth > 6) return;
          try {
            const node = doc.context.lookup(nodeRef);
            if (!node) return;
            const titleObj = node.get(PDFLib.PDFName.of('Title'));
            const title = titleObj ? PDFLib.decodePDFRawStream ? titleObj.toString() : titleObj.value || '' : '';
            /* find dest page index */
            let pageNum = 1;
            const destRef = node.get(PDFLib.PDFName.of('Dest'));
            const aRef    = node.get(PDFLib.PDFName.of('A'));
            if (destRef) {
              const dest = Array.isArray(destRef.array) ? destRef.array : null;
              if (dest && dest[0]) {
                const idx = pages.findIndex(p => doc.context.getObjectRef(p.ref) === dest[0] || p.ref === dest[0]);
                if (idx >= 0) pageNum = idx + 1;
              }
            }
            seeded.push({ id: this._idSeq++, title: _decodeTitle(title), page: pageNum, level: depth });
            const firstChildRef = node.get(PDFLib.PDFName.of('First'));
            if (firstChildRef) walk(firstChildRef, depth + 1);
            const nextRef = node.get(PDFLib.PDFName.of('Next'));
            if (nextRef) walk(nextRef, depth);
          } catch {}
        };
        walk(firstRef, 0);
      } catch {}
      if (seeded.length > 0) {
        this.bookmarks = seeded;
        this._toast(`Imported ${seeded.length} existing bookmarks`);
      }
    },

    removeFile() {
      this.file = null; this.fileName = ''; this.fileSize = '';
      this.totalPages = 0; this.pdfBytes = null; this.bookmarks = [];
    },

    /* ── bookmarks ── */
    addBookmark(level = 0) {
      this.bookmarks.push({ id: this._idSeq++, title: '', page: 1, level });
    },

    removeBookmark(id) {
      this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    },

    indentMore(bm) {
      if (bm.level < 3) bm.level++;
    },
    indentLess(bm) {
      if (bm.level > 0) bm.level--;
    },

    moveUp(idx) {
      if (idx < 1) return;
      [this.bookmarks[idx - 1], this.bookmarks[idx]] = [this.bookmarks[idx], this.bookmarks[idx - 1]];
    },
    moveDown(idx) {
      if (idx >= this.bookmarks.length - 1) return;
      [this.bookmarks[idx], this.bookmarks[idx + 1]] = [this.bookmarks[idx + 1], this.bookmarks[idx]];
    },

    clearBookmarks() {
      if (this.bookmarks.length && !confirm('Clear all bookmarks?')) return;
      this.bookmarks = [];
    },

    /* drag-reorder */
    onDragStart(id) { this.dragSrcId = id; },
    onDragOver(ev, id) {
      ev.preventDefault();
      this.bookmarks.forEach(b => b._dragOver = b.id === id);
    },
    onDrop(ev, targetId) {
      ev.preventDefault();
      if (this.dragSrcId === targetId) return;
      const src = this.bookmarks.findIndex(b => b.id === this.dragSrcId);
      const tgt = this.bookmarks.findIndex(b => b.id === targetId);
      if (src < 0 || tgt < 0) return;
      const [item] = this.bookmarks.splice(src, 1);
      this.bookmarks.splice(tgt, 0, item);
      this.bookmarks.forEach(b => delete b._dragOver);
      this.dragSrcId = null;
    },
    onDragEnd() {
      this.bookmarks.forEach(b => delete b._dragOver);
      this.dragSrcId = null;
    },

    /* ── sample ── */
    loadSample() {
      this.bookmarks = [
        { id: this._idSeq++, title: 'Introduction',           page: 1,  level: 0 },
        { id: this._idSeq++, title: 'Background',             page: 2,  level: 1 },
        { id: this._idSeq++, title: 'Problem Statement',      page: 4,  level: 1 },
        { id: this._idSeq++, title: 'Chapter 1 — Setup',      page: 6,  level: 0 },
        { id: this._idSeq++, title: 'Installation',           page: 7,  level: 1 },
        { id: this._idSeq++, title: 'Configuration',          page: 9,  level: 1 },
        { id: this._idSeq++, title: 'Advanced Options',       page: 11, level: 2 },
        { id: this._idSeq++, title: 'Chapter 2 — Usage',      page: 14, level: 0 },
        { id: this._idSeq++, title: 'Basic Commands',         page: 15, level: 1 },
        { id: this._idSeq++, title: 'Examples',               page: 18, level: 1 },
        { id: this._idSeq++, title: 'Appendix',               page: 22, level: 0 },
        { id: this._idSeq++, title: 'References',             page: 24, level: 0 },
      ];
      this._toast('Sample bookmarks loaded');
    },

    /* ── sorted preview (by page) ── */
    get previewSorted() {
      return [...this.bookmarks].sort((a, b) => (a.page || 1) - (b.page || 1));
    },

    /* ── generate PDF ── */
    async generate() {
      if (!this.pdfBytes) { this._toast('Upload a PDF first'); return; }
      const valid = this.bookmarks.filter(b => b.title.trim());
      if (!valid.length) { this._toast('Add at least one bookmark'); return; }

      this.processing = true; this.progress = 5;

      try {
        await _loadPdfLib();
        this.progress = 20;

        const doc = await PDFLib.PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });
        this.progress = 40;

        const pages = doc.getPages();
        const totalPages = pages.length;

        /* Build outline tree from flat list with level */
        /* pdf-lib doesn't have a high-level outline API — we write raw PDF objects */
        const context = doc.context;

        /* Create page destination helper */
        const makeDestArray = (pageIdx) => {
          const page = pages[Math.min(pageIdx, totalPages - 1)];
          return context.obj([page.ref, PDFLib.PDFName.of('XYZ'), PDFLib.PDFNull, PDFLib.PDFNull, PDFLib.PDFNull]);
        };

        /* Encode title as UTF-16 BE with BOM (for unicode safety) */
        const encodeTitle = (str) => {
          const bom = '﻿';
          return PDFLib.PDFHexString.fromText(bom + str);
        };

        /* Build node refs first */
        const nodes = valid.map(bm => ({
          bm,
          ref: context.nextRef(),
          pageIdx: Math.max(0, Math.min((parseInt(bm.page) || 1) - 1, totalPages - 1))
        }));

        /* Build parent chain references for nested structure */
        /* Flatten into a hierarchical tree */
        const tree = _buildTree(nodes);
        this.progress = 60;

        /* Outline root */
        const rootRef = context.nextRef();

        /* Recursively write node dicts */
        const writeNodes = (nodeList, parentRef) => {
          for (let i = 0; i < nodeList.length; i++) {
            const n = nodeList[i];
            const prevRef = i > 0 ? nodeList[i - 1].node.ref : null;
            const nextRef = i < nodeList.length - 1 ? nodeList[i + 1].node.ref : null;
            const firstChildRef = n.children.length ? n.children[0].node.ref : null;
            const lastChildRef  = n.children.length ? n.children[n.children.length - 1].node.ref : null;
            const count = _countDescendants(n);

            const dict = context.obj({
              Title: encodeTitle(n.node.bm.title.trim()),
              Parent: parentRef,
              Dest: makeDestArray(n.node.pageIdx),
              ...(prevRef  ? { Prev: prevRef }  : {}),
              ...(nextRef  ? { Next: nextRef }  : {}),
              ...(firstChildRef ? { First: firstChildRef, Last: lastChildRef, Count: PDFLib.PDFNumber.of(-count) } : {}),
            });
            context.assign(n.node.ref, dict);
            if (n.children.length) writeNodes(n.children, n.node.ref);
          }
        };

        writeNodes(tree, rootRef);

        const rootDict = context.obj({
          Type: PDFLib.PDFName.of('Outlines'),
          First: tree[0]?.node.ref,
          Last: tree[tree.length - 1]?.node.ref,
          Count: PDFLib.PDFNumber.of(nodes.length),
        });
        context.assign(rootRef, rootDict);

        doc.catalog.set(PDFLib.PDFName.of('Outlines'), rootRef);
        doc.catalog.set(PDFLib.PDFName.of('PageMode'), PDFLib.PDFName.of('UseOutlines'));

        this.progress = 80;

        const outBytes = await doc.save();
        this.progress = 95;

        /* download */
        const blob = new Blob([outBytes], { type: 'application/pdf' });
        const name = this.fileName.replace(/\.pdf$/i, '') + '-bookmarked.pdf';
        const a = Object.assign(document.createElement('a'), {
          href: URL.createObjectURL(blob),
          download: name
        });
        a.click(); URL.revokeObjectURL(a.href);

        this.progress = 100;
        this._toast(`Downloaded: ${name}`);
      } catch (e) {
        this._toast('Error: ' + e.message);
        console.error(e);
      } finally {
        this.processing = false;
        setTimeout(() => { this.progress = 0; }, 1200);
      }
    },

    /* ── helpers ── */
    _fmtSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2400);
    }
  };
}

/* ── tree helpers (outside Alpine) ── */
function _buildTree(nodes) {
  /* flat list with .level → nested {node, children}[] */
  const root = [];
  const stack = []; /* [{level, list}] */

  for (const n of nodes) {
    const item = { node: n, children: [] };
    while (stack.length && stack[stack.length - 1].level >= n.bm.level) stack.pop();

    if (!stack.length) {
      root.push(item);
    } else {
      stack[stack.length - 1].list.push(item);
    }
    stack.push({ level: n.bm.level, list: item.children });
  }
  return root;
}

function _countDescendants(n) {
  let c = n.children.length;
  for (const child of n.children) c += _countDescendants(child);
  return c;
}

function _decodeTitle(raw) {
  /* strip PDF literal string markers and decode basic escape sequences */
  if (!raw) return '';
  return String(raw)
    .replace(/^\(/, '').replace(/\)$/, '')
    .replace(/\\n/g,'\n').replace(/\\r/g,'\r')
    .replace(/\\t/g,'\t').replace(/\\(.)/g,'$1')
    .trim();
}
