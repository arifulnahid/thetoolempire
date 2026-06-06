/* ══════════════════════════════════════════════════════════
   Unit Converter — conversion data & Alpine.js component
   ══════════════════════════════════════════════════════════ */

const CATEGORIES = {
  length: {
    label: 'Length', emoji: '📏',
    base: 'meter',
    units: {
      kilometer:   { label: 'Kilometer',   symbol: 'km',   factor: 1000 },
      meter:       { label: 'Meter',       symbol: 'm',    factor: 1 },
      centimeter:  { label: 'Centimeter',  symbol: 'cm',   factor: 0.01 },
      millimeter:  { label: 'Millimeter',  symbol: 'mm',   factor: 0.001 },
      micrometer:  { label: 'Micrometer',  symbol: 'µm',   factor: 1e-6 },
      nanometer:   { label: 'Nanometer',   symbol: 'nm',   factor: 1e-9 },
      mile:        { label: 'Mile',        symbol: 'mi',   factor: 1609.344 },
      yard:        { label: 'Yard',        symbol: 'yd',   factor: 0.9144 },
      foot:        { label: 'Foot',        symbol: 'ft',   factor: 0.3048 },
      inch:        { label: 'Inch',        symbol: 'in',   factor: 0.0254 },
      nautical_mile: { label: 'Nautical Mile', symbol: 'nmi', factor: 1852 },
      light_year:  { label: 'Light Year',  symbol: 'ly',   factor: 9.461e15 },
    }
  },
  weight: {
    label: 'Weight / Mass', emoji: '⚖️',
    base: 'kilogram',
    units: {
      metric_ton:  { label: 'Metric Ton',  symbol: 't',    factor: 1000 },
      kilogram:    { label: 'Kilogram',    symbol: 'kg',   factor: 1 },
      gram:        { label: 'Gram',        symbol: 'g',    factor: 0.001 },
      milligram:   { label: 'Milligram',   symbol: 'mg',   factor: 1e-6 },
      microgram:   { label: 'Microgram',   symbol: 'µg',   factor: 1e-9 },
      pound:       { label: 'Pound',       symbol: 'lb',   factor: 0.45359237 },
      ounce:       { label: 'Ounce',       symbol: 'oz',   factor: 0.028349523 },
      stone:       { label: 'Stone',       symbol: 'st',   factor: 6.35029318 },
      us_ton:      { label: 'US Ton',      symbol: 'ton',  factor: 907.18474 },
      long_ton:    { label: 'Long Ton',    symbol: 'LT',   factor: 1016.05 },
    }
  },
  temperature: {
    label: 'Temperature', emoji: '🌡️',
    base: 'celsius',
    units: {
      celsius:    { label: 'Celsius',    symbol: '°C' },
      fahrenheit: { label: 'Fahrenheit', symbol: '°F' },
      kelvin:     { label: 'Kelvin',     symbol: 'K'  },
      rankine:    { label: 'Rankine',    symbol: '°R' },
    }
  },
  area: {
    label: 'Area', emoji: '⬜',
    base: 'square_meter',
    units: {
      square_kilometer: { label: 'Square Kilometer', symbol: 'km²', factor: 1e6 },
      square_meter:     { label: 'Square Meter',     symbol: 'm²',  factor: 1 },
      square_centimeter:{ label: 'Sq. Centimeter',   symbol: 'cm²', factor: 1e-4 },
      square_millimeter:{ label: 'Sq. Millimeter',   symbol: 'mm²', factor: 1e-6 },
      hectare:          { label: 'Hectare',          symbol: 'ha',  factor: 10000 },
      acre:             { label: 'Acre',             symbol: 'ac',  factor: 4046.8564 },
      square_mile:      { label: 'Square Mile',      symbol: 'mi²', factor: 2589988.11 },
      square_yard:      { label: 'Square Yard',      symbol: 'yd²', factor: 0.83612736 },
      square_foot:      { label: 'Square Foot',      symbol: 'ft²', factor: 0.09290304 },
      square_inch:      { label: 'Square Inch',      symbol: 'in²', factor: 6.4516e-4 },
    }
  },
  volume: {
    label: 'Volume', emoji: '🧪',
    base: 'liter',
    units: {
      cubic_meter:  { label: 'Cubic Meter',   symbol: 'm³',   factor: 1000 },
      liter:        { label: 'Liter',         symbol: 'L',    factor: 1 },
      milliliter:   { label: 'Milliliter',    symbol: 'mL',   factor: 0.001 },
      cubic_cm:     { label: 'Cubic Cm',      symbol: 'cm³',  factor: 0.001 },
      cubic_inch:   { label: 'Cubic Inch',    symbol: 'in³',  factor: 0.016387 },
      cubic_foot:   { label: 'Cubic Foot',    symbol: 'ft³',  factor: 28.3168 },
      us_gallon:    { label: 'US Gallon',     symbol: 'gal',  factor: 3.785411784 },
      us_quart:     { label: 'US Quart',      symbol: 'qt',   factor: 0.946353 },
      us_pint:      { label: 'US Pint',       symbol: 'pt',   factor: 0.473176 },
      us_cup:       { label: 'US Cup',        symbol: 'cup',  factor: 0.236588 },
      us_fl_oz:     { label: 'US Fl. Oz.',    symbol: 'fl oz',factor: 0.029574 },
      us_tablespoon:{ label: 'Tablespoon',    symbol: 'tbsp', factor: 0.014787 },
      us_teaspoon:  { label: 'Teaspoon',      symbol: 'tsp',  factor: 0.004929 },
      imperial_gallon: { label: 'Imp. Gallon', symbol: 'imp gal', factor: 4.54609 },
    }
  },
  speed: {
    label: 'Speed', emoji: '💨',
    base: 'meter_per_second',
    units: {
      meter_per_second:  { label: 'Meter / Second', symbol: 'm/s',  factor: 1 },
      kilometer_per_hour:{ label: 'Kilometer / Hour',symbol: 'km/h', factor: 1/3.6 },
      mile_per_hour:     { label: 'Mile / Hour',    symbol: 'mph',  factor: 0.44704 },
      foot_per_second:   { label: 'Foot / Second',  symbol: 'ft/s', factor: 0.3048 },
      knot:              { label: 'Knot',           symbol: 'kn',   factor: 0.514444 },
      mach:              { label: 'Mach',           symbol: 'Ma',   factor: 343 },
      speed_of_light:    { label: 'Speed of Light', symbol: 'c',    factor: 299792458 },
    }
  },
  time: {
    label: 'Time', emoji: '⏱️',
    base: 'second',
    units: {
      year:        { label: 'Year',        symbol: 'yr',  factor: 31536000 },
      month:       { label: 'Month (avg)', symbol: 'mo',  factor: 2628000 },
      week:        { label: 'Week',        symbol: 'wk',  factor: 604800 },
      day:         { label: 'Day',         symbol: 'd',   factor: 86400 },
      hour:        { label: 'Hour',        symbol: 'hr',  factor: 3600 },
      minute:      { label: 'Minute',      symbol: 'min', factor: 60 },
      second:      { label: 'Second',      symbol: 's',   factor: 1 },
      millisecond: { label: 'Millisecond', symbol: 'ms',  factor: 0.001 },
      microsecond: { label: 'Microsecond', symbol: 'µs',  factor: 1e-6 },
      nanosecond:  { label: 'Nanosecond',  symbol: 'ns',  factor: 1e-9 },
    }
  },
  data: {
    label: 'Data Storage', emoji: '💾',
    base: 'byte',
    units: {
      bit:       { label: 'Bit',       symbol: 'b',   factor: 0.125 },
      byte:      { label: 'Byte',      symbol: 'B',   factor: 1 },
      kilobyte:  { label: 'Kilobyte',  symbol: 'KB',  factor: 1024 },
      megabyte:  { label: 'Megabyte',  symbol: 'MB',  factor: 1048576 },
      gigabyte:  { label: 'Gigabyte',  symbol: 'GB',  factor: 1073741824 },
      terabyte:  { label: 'Terabyte',  symbol: 'TB',  factor: 1099511627776 },
      petabyte:  { label: 'Petabyte',  symbol: 'PB',  factor: 1.126e15 },
      kibibyte:  { label: 'Kibibyte',  symbol: 'KiB', factor: 1024 },
      mebibyte:  { label: 'Mebibyte',  symbol: 'MiB', factor: 1048576 },
      gibibyte:  { label: 'Gibibyte',  symbol: 'GiB', factor: 1073741824 },
    }
  },
  energy: {
    label: 'Energy', emoji: '⚡',
    base: 'joule',
    units: {
      joule:      { label: 'Joule',      symbol: 'J',    factor: 1 },
      kilojoule:  { label: 'Kilojoule',  symbol: 'kJ',   factor: 1000 },
      calorie:    { label: 'Calorie',    symbol: 'cal',  factor: 4.184 },
      kilocalorie:{ label: 'Kilocalorie',symbol: 'kcal', factor: 4184 },
      watt_hour:  { label: 'Watt-hour',  symbol: 'Wh',   factor: 3600 },
      kilowatt_hour:{ label: 'Kilowatt-hour', symbol: 'kWh', factor: 3600000 },
      btu:        { label: 'BTU',        symbol: 'BTU',  factor: 1055.06 },
      electronvolt:{ label: 'Electronvolt',symbol: 'eV', factor: 1.60218e-19 },
      foot_pound: { label: 'Foot-pound', symbol: 'ft·lb',factor: 1.35582 },
    }
  },
  pressure: {
    label: 'Pressure', emoji: '🔵',
    base: 'pascal',
    units: {
      pascal:     { label: 'Pascal',     symbol: 'Pa',   factor: 1 },
      kilopascal: { label: 'Kilopascal', symbol: 'kPa',  factor: 1000 },
      megapascal: { label: 'Megapascal', symbol: 'MPa',  factor: 1e6 },
      bar:        { label: 'Bar',        symbol: 'bar',  factor: 100000 },
      millibar:   { label: 'Millibar',   symbol: 'mbar', factor: 100 },
      atmosphere: { label: 'Atmosphere', symbol: 'atm',  factor: 101325 },
      torr:       { label: 'Torr',       symbol: 'Torr', factor: 133.322 },
      psi:        { label: 'PSI',        symbol: 'psi',  factor: 6894.76 },
      mmhg:       { label: 'mmHg',       symbol: 'mmHg', factor: 133.322 },
    }
  },
};

/* ── Conversion engines ── */
function toBaseUnit(value, catKey, unitKey) {
  const cat = CATEGORIES[catKey];
  if (catKey === 'temperature') return toCelsius(value, unitKey);
  return value * cat.units[unitKey].factor;
}

function fromBaseUnit(baseVal, catKey, unitKey) {
  const cat = CATEGORIES[catKey];
  if (catKey === 'temperature') return fromCelsius(baseVal, unitKey);
  return baseVal / cat.units[unitKey].factor;
}

function toCelsius(v, unit) {
  if (unit === 'celsius')    return v;
  if (unit === 'fahrenheit') return (v - 32) * 5/9;
  if (unit === 'kelvin')     return v - 273.15;
  if (unit === 'rankine')    return (v - 491.67) * 5/9;
  return v;
}
function fromCelsius(c, unit) {
  if (unit === 'celsius')    return c;
  if (unit === 'fahrenheit') return c * 9/5 + 32;
  if (unit === 'kelvin')     return c + 273.15;
  if (unit === 'rankine')    return (c + 273.15) * 9/5;
  return c;
}

function fmtResult(n) {
  if (!isFinite(n) || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs >= 1e15 || (abs < 1e-9 && abs > 0)) return n.toExponential(6);
  if (abs >= 1000) return parseFloat(n.toPrecision(10)).toLocaleString('en-US', { maximumFractionDigits: 6 });
  if (abs >= 1)    return parseFloat(n.toPrecision(10)).toLocaleString('en-US', { maximumFractionDigits: 8 });
  return parseFloat(n.toPrecision(8)).toString();
}

/* ── Alpine.js component ── */
function unitConverterApp() {
  return {
    activeCat: 'length',
    fromUnit: 'meter',
    toUnit: 'kilometer',
    inputVal: '1',
    reportOpen: false,
    reportSelected: '',
    reportSent: false,
    openFaq: null,
    toastMsg: '',
    _toastTimer: null,
    mobileMenuOpen: false,

    init() {
      document.addEventListener('scroll', () => {
        const h = document.querySelector('.site-header');
        if (h) h.classList.toggle('scrolled', window.scrollY > 10);
      }, { passive: true });
    },

    get categories() { return CATEGORIES; },
    get catKeys() { return Object.keys(CATEGORIES); },

    get currentCat() { return CATEGORIES[this.activeCat]; },

    get unitKeys() { return Object.keys(this.currentCat.units); },

    setCat(key) {
      this.activeCat = key;
      const units = Object.keys(CATEGORIES[key].units);
      this.fromUnit = units[0];
      this.toUnit   = units[1] || units[0];
      this.inputVal = '1';
    },

    get outputVal() {
      const v = parseFloat(this.inputVal);
      if (isNaN(v)) return '';
      const base = toBaseUnit(v, this.activeCat, this.fromUnit);
      return fmtResult(fromBaseUnit(base, this.activeCat, this.toUnit));
    },

    get allResults() {
      const v = parseFloat(this.inputVal);
      if (isNaN(v)) return [];
      const base = toBaseUnit(v, this.activeCat, this.fromUnit);
      return Object.entries(this.currentCat.units).map(([key, u]) => ({
        key,
        label: u.label,
        symbol: u.symbol,
        val: fmtResult(fromBaseUnit(base, this.activeCat, key)),
        isTo: key === this.toUnit,
        isFrom: key === this.fromUnit,
      }));
    },

    get formulaText() {
      const v = parseFloat(this.inputVal) || 1;
      const fu = this.currentCat.units[this.fromUnit];
      const tu = this.currentCat.units[this.toUnit];
      if (!fu || !tu) return '';
      return `${v} ${fu.symbol} = ${this.outputVal} ${tu.symbol}`;
    },

    swap() {
      [this.fromUnit, this.toUnit] = [this.toUnit, this.fromUnit];
      const prev = this.outputVal;
      this.inputVal = prev !== '—' ? prev : '1';
    },

    copyResult(val, unit) {
      if (!val || val === '—') return;
      const u = this.currentCat.units[unit];
      navigator.clipboard.writeText(`${val} ${u?.symbol || unit}`)
        .then(() => this.showToast(`Copied: ${val} ${u?.symbol || ''}`))
        .catch(() => {});
    },

    copyFormula() {
      navigator.clipboard.writeText(this.formulaText)
        .then(() => this.showToast('Formula copied!'))
        .catch(() => {});
    },

    clearInput() { this.inputVal = ''; },

    toggleFaq(i) { this.openFaq = this.openFaq === i ? null : i; },
    submitReport() { if (this.reportSelected) this.reportSent = true; },
    closeReport() {
      this.reportOpen = false;
      setTimeout(() => { this.reportSent = false; this.reportSelected = ''; }, 400);
    },

    showToast(msg) {
      this.toastMsg = msg;
      clearTimeout(this._toastTimer);
      this.$nextTick(() => {
        const el = document.getElementById('uc-toast');
        if (el) el.classList.add('show');
        this._toastTimer = setTimeout(() => { if (el) el.classList.remove('show'); }, 2200);
      });
    }
  };
}

function switchInfoTab(id) {
  document.querySelectorAll('.info-tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.info-tab-btn').forEach(b => b.classList.remove('active'));
  const pane = document.getElementById('tab-' + id);
  const btn  = document.querySelector('[data-tab="' + id + '"]');
  if (pane) pane.classList.add('active');
  if (btn)  btn.classList.add('active');
}
