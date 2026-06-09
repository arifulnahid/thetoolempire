# The Tool Empire

A collection of free, fast, browser-based tools — no signup, no installs, no server-side processing. Every tool runs 100% client-side.

**Live site:** https://thetoolempire.com

| Page | URL |
|---|---|
| Home | https://thetoolempire.com/ |
| All Tools | https://thetoolempire.com/tools.html |
| Blog | https://thetoolempire.com/blog.html |
| Contact | https://thetoolempire.com/contact.html |
| About | https://thetoolempire.com/about.html |

---

## Project overview

Pure static HTML site. No build step, no framework, no backend. Each tool is a self-contained HTML page that loads the libraries it needs from CDN. Monetised via Google AdSense. SEO-first: every page has JSON-LD structured data (SoftwareApplication + BreadcrumbList + FAQPage), canonical URLs, and sitemap entries.

---

## Tech stack

| Concern | How |
|---|---|
| Reactivity | [Alpine.js v3](https://alpinejs.dev/) — `x-data`, `x-model`, `x-ref`, computed getters |
| Styling | Vanilla CSS, dark theme, per-tool accent colour, CSS custom properties |
| PDF rendering | [pdfjs-dist 3.11.174](https://mozilla.github.io/pdf.js/) — rasterises pages to canvas |
| PDF manipulation | [pdf-lib 1.17.1](https://pdf-lib.js.org/) — lossless edits (delete pages, metadata, decrypt) |
| PDF encryption | [jsPDF 2.5.1](https://github.com/parallax/jsPDF) — RC4-128 encryption via `encryption` constructor option |
| PDF creation | jsPDF — builds new PDFs from images |
| Image conversion | [heic2any 0.0.4](https://github.com/alexcorvi/heic2any) — HEIC/HEIF decoding in the browser |
| ZIP downloads | [JSZip 3.10.1](https://stuk.github.io/jszip/) — batch file downloads |
| Analytics | Google Analytics 4 (`G-CNN44ER8MF`) |
| Ads | Google AdSense |
| Hosting | Static — GitHub Pages / any CDN |

---

## Repository structure

```
thetoolempire/
├── index.html                  # Homepage — tool grid loaded from tools-data.js
├── tools.html                  # All tools listing page
├── blog.html                   # Blog index
├── about.html / contact.html / privacy.html / terms.html
├── sitemap.xml
├── manifest.json
│
├── assets/
│   ├── css/main.css            # Shared site-wide styles
│   ├── js/
│   │   ├── main.js             # Homepage / tools page JS
│   │   ├── tools-data.js       # Master tool registry (add new tools here)
│   │   └── blog-data.js        # Blog post registry
│   ├── favicon.svg
│   └── logo.svg
│
├── tools/
│   ├── coding/                 # Developer utilities
│   ├── datetime/               # Date & time tools
│   ├── design/                 # Colour & design tools
│   ├── finance/                # Financial calculators
│   ├── gis/                    # Geospatial tools
│   ├── image/                  # Image processing tools
│   ├── math/                   # Calculators
│   ├── pdf/                    # PDF tools
│   ├── security/               # Password tools
│   ├── seo/                    # SEO utilities
│   ├── social/                 # Social media tools
│   └── text/                   # Text manipulation
│
└── blog/                       # Individual blog post pages
```

Each tool folder follows the pattern:
```
tools/<category>/
├── tool-name.html
├── tool-name.css
└── tool-name.js
```

---

## Tool catalogue

### Text
| Tool | File |
|---|---|
| Rich Text WYSIWYG Editor | `tools/text/rich-text-editor.html` |
| Word Counter | `tools/text/word-counter.html` |
| Case Converter | `tools/text/case-converter.html` |
| Lorem Ipsum Generator | `tools/text/lorem-ipsum.html` |
| Text Reverser | `tools/text/text-reverser.html` |
| Text Diff Checker | `tools/text/diff-checker.html` |

### Math & Calculators
| Tool | File |
|---|---|
| Percentage Calculator | `tools/math/percentage-calculator.html` |
| BMI Calculator | `tools/math/bmi-calculator.html` |
| Age Calculator | `tools/math/age-calculator.html` |
| Tip Calculator | `tools/math/tip-calculator.html` |
| Unit Converter | `tools/math/unit-converter.html` |
| XY Coordinate Graph | `tools/math/xy-graph.html` |
| Pomodoro Timer | `tools/math/pomodoro-timer.html` |
| Loan Calculator | `tools/finance/loan-calculator.html` |
| Compound Interest | `tools/finance/compound-interest.html` |

### Design & Colour
| Tool | File |
|---|---|
| Color Picker | `tools/design/color-picker.html` |
| CSS Gradient Generator | `tools/design/gradient-generator.html` |
| Contrast Checker (WCAG) | `tools/design/contrast-checker.html` |
| HEX ↔ RGB Converter | `tools/design/hex-rgb-converter.html` |

### Coding & Dev
| Tool | File |
|---|---|
| JSON Formatter | `tools/coding/json-formatter.html` |
| JSON Validator | `tools/coding/json-validator.html` |
| XML Formatter | `tools/coding/xml-formatter.html` |
| Base64 Encoder/Decoder | `tools/coding/base64.html` |
| HTML Encoder/Decoder | `tools/coding/html-encoder.html` |
| URL Encoder/Decoder | `tools/coding/url-encoder.html` |
| Regex Tester | `tools/coding/regex.html` |
| Markdown Editor | `tools/coding/markdown.html` |
| QR Code Maker | `tools/coding/qr-code-maker.html` |
| Log Analyzer | `tools/coding/log-analyzer.html` |

### SEO
| Tool | File |
|---|---|
| Meta Tag Generator | `tools/seo/meta-tag-generator.html` |
| OG Tag Generator | `tools/seo/og-tag-generator.html` |
| Robots.txt Generator | `tools/seo/robots-txt-generator.html` |
| Sitemap Generator | `tools/seo/sitemap-generator.html` |
| Keyword Density Checker | `tools/seo/keyword-density.html` |
| Readability Checker | `tools/seo/readability-checker.html` |

### Image
| Tool | File |
|---|---|
| Image Compressor | `tools/image/image-compressor.html` |
| Image Resizer | `tools/image/image-resizer.html` |
| Image Converter | `tools/image/image-converter.html` |
| Image Crop | `tools/image/image-crop.html` |
| Image Metadata Editor | `tools/image/image-metadata-editor.html` |
| Compare Two Images | `tools/image/compare-two-images.html` |
| SVG to PNG | `tools/image/svg-to-png.html` |
| WebP to JPG | `tools/image/webp-to-jpg.html` |
| HEIC to JPG | `tools/image/heic-to-jpg.html` |

### PDF
| Tool | File |
|---|---|
| PDF to Image | `tools/pdf/pdf-to-image.html` |
| Image to PDF | `tools/pdf/image-to-pdf.html` |
| PDF Compressor | `tools/pdf/pdf-compressor.html` |
| Delete PDF Pages | `tools/pdf/delete-pdf-pages.html` |
| PDF Password Protector & Remover | `tools/pdf/pdf-password.html` |
| PDF Metadata Editor | `tools/pdf/pdf-metadata.html` |
| Certificate Generator | `tools/pdf/certificate-generator.html` |
| Invoice Generator | `tools/pdf/invoice-generator.html` |

### GIS & Geospatial
| Tool | File |
|---|---|
| Lat/Long Converter | `tools/gis/lat-long.html` |
| Coordinate Distance Calculator | `tools/gis/coordinate-distance.html` |
| GeoJSON Validator | `tools/gis/geojson-validator.html` |
| GeoJSON ↔ KML Converter | `tools/gis/geojson-kml-converter.html` |
| GeoJSON Merger | `tools/gis/geojson-merger.html` |
| GeoJSON Splitter | `tools/gis/geojson-splitter.html` |
| GPX ↔ GeoJSON Converter | `tools/gis/gpx-geojson-converter.html` |
| GPX ↔ KML Converter | `tools/gis/gpx-kml-converter.html` |
| CSV to GIS | `tools/gis/csv-to-gis.html` |
| GeoTIFF Inspector | `tools/gis/geotiff-inspector.html` |
| Projection Finder | `tools/gis/projection-finder.html` |

### Social Media
| Tool | File |
|---|---|
| YouTube Thumbnail Checker | `tools/social/yt-thumbnail-checker.html` |
| YouTube Thumbnail Downloader | `tools/social/yt-thumbnail-downloader.html` |
| YouTube Timestamp Generator | `tools/social/yt-timestamp.html` |
| YouTube Custom Player | `tools/social/yt-custom-player.html` |
| Instagram Post Resizer | `tools/social/instagram-post-resizer.html` |

### Security
| Tool | File |
|---|---|
| Password Generator | `tools/security/password-generator.html` |
| Password Strength Checker | `tools/security/password-strength-checker.html` |

### Date & Time
| Tool | File |
|---|---|
| Date Difference Calculator | `tools/datetime/date-difference.html` |
| Unix Timestamp Converter | `tools/datetime/unix-timestamp.html` |

---

## Adding a new tool

1. **Create the files** — `tools/<category>/tool-name.css`, `.js`, `.html`

2. **Register in `assets/js/tools-data.js`** — add an entry to `TOOLS_DATA`:
   ```js
   {
     id: 'tool-name',
     title: 'Tool Display Name',
     description: 'One-sentence description for the tool card.',
     icon: '<svg .../>',
     color: 'linear-gradient(135deg,#hex1,#hex2)',
     categories: ['Category'],
     url: 'tools/category/tool-name.html',
   }
   ```

3. **Add to `sitemap.xml`** — add a `<url>` block under the relevant category comment:
   ```xml
   <url>
     <loc>https://thetoolempire.com/tools/category/tool-name.html</loc>
     <lastmod>YYYY-MM-DD</lastmod>
     <changefreq>monthly</changefreq>
     <priority>0.85</priority>
   </url>
   ```

4. **Follow the Alpine.js proxy rule** — never store `HTMLCanvasElement`, `CanvasRenderingContext2D`, `ArrayBuffer`, pdfjs documents, pdf-lib documents, or raw `File`/`Blob` objects inside Alpine's reactive data object. Always use module-level `let` variables outside the `return {}` block.

5. **Add JSON-LD** — every tool page needs three schemas in a `<script type="application/ld+json">` block: `SoftwareApplication`, `BreadcrumbList`, and `FAQPage`.

---

## Key implementation notes

### Alpine.js proxy rule
Alpine wraps your `return {}` object in a JavaScript `Proxy`. Storing certain non-serialisable objects inside it causes silent failures (most commonly: `canvas.width = n` has no effect). Keep these **outside** the Alpine `return {}`:

```js
let _pdf      = null;  // pdfjsLib document
let _pdfBytes = null;  // ArrayBuffer
let _canvas   = null;  // HTMLCanvasElement
let _result   = null;  // Uint8Array / Blob output
```

### PDF tool library choices
| Operation | Library | Why |
|---|---|---|
| Render pages to canvas | pdfjs-dist | Only option; renders at arbitrary scale |
| Delete pages, edit metadata | pdf-lib | Lossless — text/vectors preserved |
| Decrypt existing PDF | pdf-lib (`load` with `password` option) | Native support |
| Encrypt / password protect | jsPDF with `encryption` option | Only browser-compatible library with working RC4-128 encryption; rasterises pages |
| Compress (reduce file size) | pdfjs-dist render + jsPDF rebuild | Rasterises at lower quality to reduce size |
| Create PDF from images | jsPDF `addImage` | Purpose-built |

### PDF page dimensions
When converting PDF.js viewport dimensions (CSS pixels at scale=1) to millimetres for jsPDF:
```js
const pageW = viewport.width  * 25.4 / 72;  // pts → mm
const pageH = viewport.height * 25.4 / 72;
```

### Consistent dark theme variables
```css
--bg:         #0f0f14;
--bg-card:    #1e1e28;
--bg-surface: #18181f;
--border:     #2e2e3e;
--text:       #e8e8f0;
--text-muted: #9898b8;
--text-faint: #55556a;
```

---

## Development

No build step required. Open any `.html` file directly in a browser, or serve the root with any static file server:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

All CDN libraries are loaded from jsDelivr. No `npm install` needed.

---

## Deployment

The site is fully static. Drop the entire directory onto any static host:

- **GitHub Pages** — push to `main`, enable Pages in repo settings
- **Netlify / Vercel** — connect repo, no build command needed
- **Any web server** — copy files, ensure `.html` files are served as `text/html`

---

## License

All tool source code in this repository is proprietary. Content and tools are provided free for end users via the website. Do not reproduce or redistribute without permission.
