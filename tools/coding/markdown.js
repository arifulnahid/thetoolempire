/* ── Minimal Markdown → HTML parser ── */
function parseMarkdown(md) {
  if (!md) return '';

  let html = md;

  // Escape HTML entities first (except we need to preserve code blocks)
  // Process code blocks before anything else
  const codeBlocks = [];
  html = html.replace(/```([a-z]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    codeBlocks.push(`<pre><code class="lang-${lang || 'text'}">${escaped}</code></pre>`);
    return `\x00CODE${idx}\x00`;
  });

  // Inline code (protect from further processing)
  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCodes.length;
    const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    inlineCodes.push(`<code>${escaped}</code>`);
    return `\x00INLINE${idx}\x00`;
  });

  // Escape remaining HTML
  html = html.replace(/&(?!amp;|lt;|gt;|quot;|#)/g,'&amp;')
             .replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Setext headings
  html = html.replace(/^(.+)\n={3,}$/gm, '<h1>$1</h1>');
  html = html.replace(/^(.+)\n-{3,}$/gm, '<h2>$1</h2>');

  // Horizontal rules
  html = html.replace(/^[-*_]{3,}\s*$/gm, '<hr>');

  // Blockquotes (simple single level)
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // Task lists (must be before ul)
  html = html.replace(/^[ \t]*[-*+] \[x\] (.+)$/gim, '<li class="task-item"><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^[ \t]*[-*+] \[ \] (.+)$/gim, '<li class="task-item"><input type="checkbox" disabled> $1</li>');

  // Unordered lists
  html = html.replace(/^[ \t]*[-*+] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`);

  // Ordered lists
  html = html.replace(/^[ \t]*\d+\. (.+)$/gm, '<li>$1</li>');
  // Wrap orphan <li> not yet wrapped (crude but works for basic use)
  html = html.replace(/(?<!<\/ul>\n?)(<li>(?:(?!<ul>|<ol>)[\s\S])*?<\/li>\n?)+/g, m => {
    if (m.includes('<ul>')) return m;
    return `<ol>${m}</ol>`;
  });

  // Tables
  html = html.replace(/(?:^|\n)((?:\|.+\|\n)+)/g, (_, block) => {
    const rows = block.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return _;
    const isSep = r => /^\|[-: |]+\|$/.test(r.trim());
    let thead = '', tbody = '';
    let headerDone = false;
    for (let i = 0; i < rows.length; i++) {
      if (isSep(rows[i])) { headerDone = true; continue; }
      const cells = rows[i].split('|').slice(1,-1).map(c => c.trim());
      if (!headerDone) {
        thead += '<tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr>';
      } else {
        tbody += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
    }
    return `\n<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  });

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_\n]+)_/g, '<em>$1</em>');

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Images (before links)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Auto-links
  html = html.replace(/(?<![">])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  // Paragraphs — wrap lines not already in block elements
  const blockTags = /^(<h[1-6]|<ul|<ol|<li|<blockquote|<pre|<hr|<table|<thead|<tbody|<tr|<th|<td|\x00CODE)/;
  const lines = html.split('\n');
  const out = [];
  let inPara = false;
  for (const line of lines) {
    if (line.trim() === '') {
      if (inPara) { out.push('</p>'); inPara = false; }
      continue;
    }
    if (blockTags.test(line.trim())) {
      if (inPara) { out.push('</p>'); inPara = false; }
      out.push(line);
    } else {
      if (!inPara) { out.push('<p>'); inPara = true; }
      out.push(line);
    }
  }
  if (inPara) out.push('</p>');
  html = out.join('\n');

  // Restore code blocks and inline code
  codeBlocks.forEach((block, i) => { html = html.replace(`\x00CODE${i}\x00`, block); });
  inlineCodes.forEach((code, i) => { html = html.replace(`\x00INLINE${i}\x00`, code); });

  return html;
}

/* ── Word / char / reading time stats ── */
function calcStats(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g,'').length;
  const lines = text ? text.split('\n').length : 0;
  const readMin = Math.max(1, Math.round(words / 200));
  return { words, chars, charsNoSpace, lines, readMin };
}

/* ── SAMPLE markdown content ── */
const SAMPLE_MD = `# Welcome to Markdown Editor

A **free, live-preview** Markdown editor that runs entirely in your browser.

## What is Markdown?

Markdown is a lightweight markup language that converts plain text to formatted HTML. It's used everywhere — GitHub READMEs, documentation, blog posts, and chat apps.

## Text Formatting

You can make text **bold**, *italic*, ~~strikethrough~~, or ***bold and italic***.

Inline \`code\` looks like this.

## Lists

### Unordered
- Item one
- Item two
  - Nested item
- Item three

### Ordered
1. First step
2. Second step
3. Third step

### Task list
- [x] Write Markdown
- [x] Preview it live
- [ ] Export to HTML

## Code Block

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

## Blockquote

> "The best tool is the one you actually use."

## Table

| Syntax | Description |
|--------|-------------|
| \`# Heading\` | H1–H6 headings |
| \`**bold**\` | Bold text |
| \`*italic*\` | Italic text |
| \`[link](url)\` | Hyperlink |
| \`\`\`code\`\`\` | Code block |

## Links & Images

[Visit The Tool Empire](https://thetoolempire.com)

---

*Start typing in the editor on the left to see your Markdown rendered here in real time.*
`;

/* ── Alpine component ── */
function markdownApp() {
  return {
    input: '',
    view: 'split', // 'split' | 'editor' | 'preview'
    wordWrap: true,

    init() {
      this.input = SAMPLE_MD;
    },

    get rendered() {
      return parseMarkdown(this.input);
    },

    get stats() {
      return calcStats(this.input);
    },

    get editorVisible() { return this.view === 'split' || this.view === 'editor'; },
    get previewVisible() { return this.view === 'split' || this.view === 'preview'; },
    get layoutClass() {
      if (this.view === 'split') return 'split';
      if (this.view === 'preview') return 'preview-only';
      return 'editor-only';
    },

    setView(v) { this.view = v; },

    loadSample() { this.input = SAMPLE_MD; },

    clearAll() { this.input = ''; },

    async copyMarkdown() {
      try { await navigator.clipboard.writeText(this.input); this._toast('Markdown copied!'); }
      catch { this._toast('Copy failed'); }
    },

    async copyHtml() {
      try { await navigator.clipboard.writeText(this.rendered); this._toast('HTML copied!'); }
      catch { this._toast('Copy failed'); }
    },

    downloadMd() {
      const blob = new Blob([this.input], { type: 'text/markdown' });
      this._download(blob, 'document.md');
    },

    downloadHtml() {
      const full = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Exported Markdown</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#222}
  pre{background:#f4f4f8;border-radius:6px;padding:16px;overflow-x:auto}
  code{background:#f0f0f5;border-radius:3px;padding:2px 5px;font-size:.9em}
  pre code{background:none;padding:0}
  blockquote{border-left:3px solid #aaa;padding:10px 16px;color:#555;margin:16px 0}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ddd;padding:8px 12px}
  th{background:#f8f8f8}
  img{max-width:100%}
</style>
</head>
<body>
${this.rendered}
</body>
</html>`;
      const blob = new Blob([full], { type: 'text/html' });
      this._download(blob, 'document.html');
    },

    insertSyntax(before, after, placeholder) {
      const ta = document.querySelector('.md-textarea');
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = this.input.slice(start, end) || placeholder;
      const replacement = before + sel + after;
      this.input = this.input.slice(0, start) + replacement + this.input.slice(end);
      this.$nextTick(() => {
        ta.focus();
        const cursor = start + before.length + sel.length + after.length;
        ta.setSelectionRange(cursor, cursor);
      });
    },

    handleTab(e) {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      this.input = this.input.slice(0, start) + '  ' + this.input.slice(ta.selectionEnd);
      this.$nextTick(() => { ta.setSelectionRange(start + 2, start + 2); });
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _download(blob, filename) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
