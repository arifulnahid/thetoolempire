/* ──────────────────────────────────────────────
   Report / Feedback Modal — Alpine.js component
   Usage: <div x-data="reportModal()"> … </div>
   Load with a plain <script> (no defer) so the
   function is defined before Alpine initializes.
   Tool name is auto-read from <title> unless
   passed as an argument: reportModal('My Tool')
────────────────────────────────────────────── */

const _RM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyX9HY2bL_HxM4UHFU9B2cQh-VZ5OqAhQNDyTFzBqjgCCfNdu2f_21A-HRCftHVrYPesw/exec';

function reportModal(toolName) {
  return {

    /* ── state ── */
    open:        false,
    submitted:   false,
    submitting:  false,
    submitError: '',
    form: { type: 'bug', message: '', email: '' },
    errors: {},
    _tool: '',

    /* ── lifecycle ── */
    init() {
      this._tool = toolName ||
        document.title.replace(/\s*[—–-]\s*The Tool Empire.*/i, '').trim() ||
        'Unknown Tool';

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.open) this.closeModal();
      });
    },

    /* ── modal control ── */
    openModal() {
      this.open = true;
      document.body.style.overflow = 'hidden';
    },
    closeModal() {
      this.open = false;
      document.body.style.overflow = '';
    },

    /* ── validation ── */
    validate() {
      this.errors = {};
      if (!this.form.message.trim())
        this.errors.message = 'Please describe the issue or feedback.';
      if (this.form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email))
        this.errors.email = 'Enter a valid email address.';
      return !Object.keys(this.errors).length;
    },

    /* ── submit ── */
    async submit() {
      if (!this.validate()) return;
      this.submitting = true;
      this.submitError = '';

      const ua = navigator.userAgent;
      const browserName = (() => {
        if (/Edg\//.test(ua))     return 'Edge';
        if (/OPR\//.test(ua))     return 'Opera';
        if (/Chrome\//.test(ua))  return 'Chrome';
        if (/Firefox\//.test(ua)) return 'Firefox';
        if (/Safari\//.test(ua))  return 'Safari';
        return 'Unknown';
      })();
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      const payload = {
        formType:   'feedback',
        toolname:       this._tool,
        issues: this.form.type,
        message:    this.form.message.trim(),
        email:      this.form.email.trim(),
        device:     /Mobi|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop',
        browser:    browserName,
        os:         navigator.platform || '',
        screenSize: `${screen.width}x${screen.height}`,
        language:   navigator.language || '',
        location:   Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        connection: conn ? (conn.effectiveType || '') : '',
        referrer:   document.referrer || '',
      };

      try {
        const res  = await fetch(_RM_ENDPOINT, {
          method:  'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        // const data = await res.json();
        // if (data.status !== 'success') throw new Error(data.message || 'Submission failed');
      } catch (err) {
        this.submitting  = false;
        this.submitError = err.message || 'Something went wrong. Please try again.';
        return;
      }

      this.submitting = false;
      this.submitted  = true;
    },

    /* ── reset after success ── */
    reset() {
      this.submitted   = false;
      this.submitError = '';
      this.form        = { type: 'bug', message: '', email: '' };
      this.errors      = {};
      this.closeModal();
    },
  };
}
