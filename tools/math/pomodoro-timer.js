const CIRCUMFERENCE = 2 * Math.PI * 110; // r=110 on 240px canvas

function pomodoroApp() {
  return {
    // Mode: 'focus' | 'short' | 'long'
    mode: 'focus',
    // Timer state
    running: false,
    remaining: 25 * 60,
    total: 25 * 60,
    _interval: null,
    // Sessions
    sessionsCompleted: 0,
    sessionGoal: 4,
    totalFocusToday: 0,
    // Settings
    focusMins: 25,
    shortMins: 5,
    longMins: 15,
    autoStart: false,
    soundOn: true,
    notifOn: false,
    showSettings: false,
    // Tasks
    newTask: '',
    tasks: [],
    activeTaskIndex: null,
    // History
    history: [],
    // FAQ / modal
    openFaq: null,
    showReport: false,
    reportText: '',
    activeTab: 'how',

    init() {
      this.remaining = this.focusMins * 60;
      this.total = this.remaining;
      this._updateRing();
      // Load from storage
      try {
        const saved = localStorage.getItem('pomo_state');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.tasks) this.tasks = s.tasks;
          if (s.sessionsCompleted) this.sessionsCompleted = s.sessionsCompleted;
          if (s.totalFocusToday) this.totalFocusToday = s.totalFocusToday;
          if (s.history) this.history = s.history.slice(0, 20);
          if (s.focusMins) this.focusMins = s.focusMins;
          if (s.shortMins) this.shortMins = s.shortMins;
          if (s.longMins) this.longMins = s.longMins;
          if (s.autoStart !== undefined) this.autoStart = s.autoStart;
          if (s.soundOn !== undefined) this.soundOn = s.soundOn;
          this._applyMode(this.mode);
        }
      } catch(e) {}
      // Check notification permission
      if (Notification && Notification.permission === 'granted') this.notifOn = true;
    },

    get modeLabel() {
      return { focus: 'Focus', short: 'Short Break', long: 'Long Break' }[this.mode];
    },

    get timeDisplay() {
      const m = Math.floor(this.remaining / 60).toString().padStart(2, '0');
      const s = (this.remaining % 60).toString().padStart(2, '0');
      return m + ':' + s;
    },

    get dashOffset() {
      const pct = this.remaining / this.total;
      return CIRCUMFERENCE * (1 - pct);
    },

    get ringColor() {
      if (this.mode === 'focus') return 'url(#ringGrad)';
      if (this.mode === 'short') return 'url(#ringGradGreen)';
      return 'url(#ringGradBlue)';
    },

    get totalFocusDisplay() {
      const m = Math.floor(this.totalFocusToday / 60);
      return m + ' min';
    },

    get activeTask() {
      if (this.activeTaskIndex !== null && this.tasks[this.activeTaskIndex]) {
        return this.tasks[this.activeTaskIndex].name;
      }
      return null;
    },

    setMode(m) {
      if (this.running) this._stop();
      this.mode = m;
      this._applyMode(m);
      this._updateRing();
    },

    _applyMode(m) {
      if (m === 'focus')     { this.remaining = this.focusMins * 60; this.total = this.remaining; }
      if (m === 'short')     { this.remaining = this.shortMins * 60; this.total = this.remaining; }
      if (m === 'long')      { this.remaining = this.longMins * 60; this.total = this.remaining; }
    },

    toggle() {
      if (this.running) this._stop(); else this._start();
    },

    _start() {
      this.running = true;
      this._interval = setInterval(() => this._tick(), 1000);
      document.title = this.timeDisplay + ' — Pomodoro | The Tool Empire';
    },

    _stop() {
      this.running = false;
      clearInterval(this._interval);
      this._interval = null;
      document.title = 'Pomodoro Timer | The Tool Empire';
    },

    _tick() {
      if (this.remaining <= 0) {
        this._complete();
        return;
      }
      this.remaining--;
      this._updateRing();
      document.title = this.timeDisplay + ' — ' + this.modeLabel + ' | The Tool Empire';
    },

    _complete() {
      this._stop();
      const wasMode = this.mode;

      if (wasMode === 'focus') {
        this.sessionsCompleted++;
        this.totalFocusToday += this.focusMins * 60;
        this.history.unshift({ type: 'focus', label: this.activeTask || 'Focus Session', time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
        if (this.history.length > 20) this.history.pop();
      } else {
        this.history.unshift({ type: 'break', label: wasMode === 'short' ? 'Short Break' : 'Long Break', time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) });
        if (this.history.length > 20) this.history.pop();
      }

      this._playSound(wasMode === 'focus');
      this._sendNotification(wasMode);
      this._save();

      // Auto-advance mode
      if (wasMode === 'focus') {
        if (this.sessionsCompleted % this.sessionGoal === 0) {
          this.mode = 'long';
        } else {
          this.mode = 'short';
        }
      } else {
        this.mode = 'focus';
      }
      this._applyMode(this.mode);
      this._updateRing();
      if (this.autoStart) {
        setTimeout(() => this._start(), 800);
      }
    },

    _updateRing() {
      this.$nextTick(() => {
        const ring = document.getElementById('pomo-ring');
        if (ring) ring.style.strokeDashoffset = this.dashOffset;
      });
    },

    skip() {
      this._stop();
      this._complete();
    },

    reset() {
      this._stop();
      this._applyMode(this.mode);
      this._updateRing();
    },

    applySettings() {
      this._stop();
      this._applyMode(this.mode);
      this._updateRing();
      this._save();
      this.showToast('Settings saved');
    },

    _playSound(isFocus) {
      if (!this.soundOn) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = isFocus ? [523, 659, 784] : [784, 659, 523];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
          gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.32);
          osc.start(ctx.currentTime + i * 0.18);
          osc.stop(ctx.currentTime + i * 0.18 + 0.35);
        });
      } catch(e) {}
    },

    _sendNotification(mode) {
      if (!this.notifOn || Notification.permission !== 'granted') return;
      const msgs = {
        focus: { title: '🍅 Focus session complete!', body: 'Time for a well-earned break.' },
        short: { title: '☕ Break over!', body: 'Ready for another focus session?' },
        long:  { title: '🎉 Long break done!', body: 'Start your next focus block.' },
      };
      const m = msgs[mode] || msgs.focus;
      new Notification(m.title, { body: m.body, icon: '/assets/favicon.svg' });
    },

    async requestNotif() {
      if (!('Notification' in window)) return;
      const perm = await Notification.requestPermission();
      this.notifOn = perm === 'granted';
      this.showToast(perm === 'granted' ? 'Notifications enabled!' : 'Notifications blocked');
    },

    // Tasks
    addTask() {
      const name = this.newTask.trim();
      if (!name) return;
      this.tasks.push({ name, done: false });
      this.newTask = '';
      this._save();
    },

    toggleTask(i) {
      this.tasks[i].done = !this.tasks[i].done;
      this._save();
    },

    setActiveTask(i) {
      this.activeTaskIndex = this.activeTaskIndex === i ? null : i;
    },

    deleteTask(i) {
      this.tasks.splice(i, 1);
      if (this.activeTaskIndex === i) this.activeTaskIndex = null;
      else if (this.activeTaskIndex > i) this.activeTaskIndex--;
      this._save();
    },

    _save() {
      try {
        localStorage.setItem('pomo_state', JSON.stringify({
          tasks: this.tasks,
          sessionsCompleted: this.sessionsCompleted,
          totalFocusToday: this.totalFocusToday,
          history: this.history,
          focusMins: this.focusMins,
          shortMins: this.shortMins,
          longMins: this.longMins,
          autoStart: this.autoStart,
          soundOn: this.soundOn,
        }));
      } catch(e) {}
    },

    toggleFaq(i) {
      this.openFaq = this.openFaq === i ? null : i;
      this.$nextTick(() => {
        document.querySelectorAll('.faq-item').forEach((el, idx) => {
          el.classList.toggle('open', idx === this.openFaq);
        });
      });
    },

    submitReport() {
      this.showReport = false;
      this.reportText = '';
      this.showToast('Report submitted — thank you!');
    },

    showToast(msg) {
      const t = document.getElementById('pomo-toast');
      if (!t) return;
      t.querySelector('.toast-msg').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2800);
    },
  };
}
