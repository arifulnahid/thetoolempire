/* ── GeoJSON Merger — Alpine component ── */

function geojsonMergerApp() {
  return {
    /* ── Source slots ── */
    slots: [
      { id: 1, label: 'Source 1', text: '', features: [], error: '', expanded: true  },
      { id: 2, label: 'Source 2', text: '', features: [], error: '', expanded: true  },
    ],
    _nextId: 3,

    /* ── Options ── */
    addSourceTag: true,       /* inject _source property */
    deduplicateGeom: false,   /* skip features with identical geometry */
    prettyPrint: true,

    /* ── Output ── */
    outputText: '',
    mergedOk: false,
    mergeError: '',
    totalFeatures: 0,
    dedupedCount: 0,
    summaryRows: [],          /* per-slot summary */

    init() {},

    /* ── Add slot ── */
    addSlot() {
      this.slots.push({
        id: this._nextId++,
        label: `Source ${this.slots.length + 1}`,
        text: '',
        features: [],
        error: '',
        expanded: true,
      });
    },

    /* ── Remove slot ── */
    removeSlot(id) {
      if (this.slots.length <= 2) return; /* keep minimum 2 */
      this.slots = this.slots.filter(s => s.id !== id);
      this._renumberLabels();
    },

    _renumberLabels() {
      this.slots.forEach((s, i) => {
        if (/^Source \d+$/.test(s.label)) s.label = `Source ${i + 1}`;
      });
    },

    /* ── Parse a single slot ── */
    parseSlot(slot) {
      slot.error = '';
      slot.features = [];
      const raw = slot.text.trim();
      if (!raw) return;
      try {
        const gj = JSON.parse(raw);
        slot.features = this._extractFeatures(gj);
      } catch (e) {
        slot.error = e.message || 'Invalid JSON';
      }
    },

    _extractFeatures(gj) {
      if (gj.type === 'FeatureCollection') return gj.features || [];
      if (gj.type === 'Feature') return [gj];
      if (gj.type) return [{ type: 'Feature', properties: {}, geometry: gj }];
      throw new Error('Not a valid GeoJSON object (must be FeatureCollection, Feature, or geometry).');
    },

    /* ── File upload per slot ── */
    handleFile(e, slot) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        slot.text = ev.target.result;
        slot.expanded = true;
        this.parseSlot(slot);
        this.mergedOk = false;
        this.outputText = '';
      };
      reader.readAsText(file);
      e.target.value = '';
    },

    handleDrop(e, slot) {
      e.preventDefault();
      e.currentTarget.classList.remove('dragover');
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        slot.text = ev.target.result;
        slot.expanded = true;
        this.parseSlot(slot);
        this.mergedOk = false;
        this.outputText = '';
      };
      reader.readAsText(file);
    },

    /* ── Load samples ── */
    loadSamples() {
      const s1 = `{
  "type": "FeatureCollection",
  "name": "Cities A",
  "features": [
    { "type": "Feature", "properties": { "name": "Paris",   "country": "France"  }, "geometry": { "type": "Point", "coordinates": [2.3522, 48.8566] } },
    { "type": "Feature", "properties": { "name": "Lyon",    "country": "France"  }, "geometry": { "type": "Point", "coordinates": [4.8357, 45.7640] } },
    { "type": "Feature", "properties": { "name": "Bordeaux","country": "France"  }, "geometry": { "type": "Point", "coordinates": [-0.5792, 44.8378] } }
  ]
}`;
      const s2 = `{
  "type": "FeatureCollection",
  "name": "Cities B",
  "features": [
    { "type": "Feature", "properties": { "name": "Berlin",  "country": "Germany" }, "geometry": { "type": "Point", "coordinates": [13.4050, 52.5200] } },
    { "type": "Feature", "properties": { "name": "Munich",  "country": "Germany" }, "geometry": { "type": "Point", "coordinates": [11.5820, 48.1351] } },
    { "type": "Feature", "properties": { "name": "Paris",   "country": "France"  }, "geometry": { "type": "Point", "coordinates": [2.3522, 48.8566] } }
  ]
}`;
      this.slots[0].text = s1;
      this.slots[0].label = 'Cities A';
      this.slots[1].text = s2;
      this.slots[1].label = 'Cities B';
      this.slots.forEach(s => this.parseSlot(s));
      this.mergedOk = false;
      this.outputText = '';
      this.mergeError = '';
    },

    /* ── Merge ── */
    merge() {
      this.mergeError = '';
      this.outputText = '';
      this.mergedOk = false;
      this.totalFeatures = 0;
      this.dedupedCount = 0;
      this.summaryRows = [];

      /* Parse all slots first */
      this.slots.forEach(s => this.parseSlot(s));

      const hasAnyData = this.slots.some(s => s.text.trim());
      if (!hasAnyData) { this.mergeError = 'Add at least one GeoJSON source.'; return; }

      const anyError = this.slots.some(s => s.text.trim() && s.error);
      if (anyError) { this.mergeError = 'Fix JSON errors in sources before merging.'; return; }

      const allFeatures = [];
      const geomSigs = new Set(); /* for dedup */

      for (const slot of this.slots) {
        if (!slot.text.trim() || slot.error) continue;
        let added = 0;
        let skipped = 0;

        for (const f of slot.features) {
          const feature = JSON.parse(JSON.stringify(f)); /* deep clone */

          if (this.deduplicateGeom && feature.geometry) {
            const sig = JSON.stringify(feature.geometry);
            if (geomSigs.has(sig)) { skipped++; this.dedupedCount++; continue; }
            geomSigs.add(sig);
          }

          if (this.addSourceTag) {
            feature.properties = feature.properties || {};
            feature.properties._source = slot.label;
          }

          allFeatures.push(feature);
          added++;
        }

        this.summaryRows.push({
          label: slot.label,
          total: slot.features.length,
          added,
          skipped,
        });
      }

      if (!allFeatures.length) {
        this.mergeError = 'No features to merge. All sources are empty or all features were deduplicated.';
        return;
      }

      this.totalFeatures = allFeatures.length;

      const fc = { type: 'FeatureCollection', features: allFeatures };
      this.outputText = this.prettyPrint
        ? JSON.stringify(fc, null, 2)
        : JSON.stringify(fc);
      this.mergedOk = true;
    },

    /* ── Copy ── */
    async copyOutput() {
      if (!this.outputText) return;
      try {
        await navigator.clipboard.writeText(this.outputText);
        this._toast('Copied to clipboard');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = this.outputText; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        this._toast('Copied to clipboard');
      }
    },

    /* ── Download ── */
    download() {
      if (!this.outputText) return;
      const blob = new Blob([this.outputText], { type: 'application/geo+json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'merged.geojson'; a.click();
      URL.revokeObjectURL(url);
      this._toast('Downloaded merged.geojson');
    },

    /* ── Clear all ── */
    clearAll() {
      this.slots = [
        { id: 1, label: 'Source 1', text: '', features: [], error: '', expanded: true },
        { id: 2, label: 'Source 2', text: '', features: [], error: '', expanded: true },
      ];
      this._nextId = 3;
      this.outputText = '';
      this.mergedOk = false;
      this.mergeError = '';
      this.totalFeatures = 0;
      this.dedupedCount = 0;
      this.summaryRows = [];
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2000);
    },
  };
}
