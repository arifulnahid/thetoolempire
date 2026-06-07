/* ── YouTube Custom Player — IFrame API ── */

function ytCustomPlayerApp() {
  return {
    /* ── URL / ID state ── */
    urlInput: '',
    videoId: '',
    error: '',

    /* ── IFrame API player instance ── */
    player: null,
    apiReady: false,
    playerReady: false,

    /* ── Playback state ── */
    playing: false,
    muted: false,
    volume: 80,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    speed: 1,
    loop: false,
    showOverlay: true,

    /* ── Speed options ── */
    speeds: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    speedPopupOpen: false,

    /* ── Seek tooltip ── */
    seekTooltipTime: '0:00',
    seekTooltipX: 0,

    /* ── Playlist ── */
    playlist: [
      { id: 'dQw4w9WgXcQ', title: 'Rick Astley — Never Gonna Give You Up', channel: 'Rick Astley', dur: '3:33' },
      { id: 'jNQXAC9IVRw',  title: 'Me at the zoo (first YouTube video ever)', channel: 'jawed', dur: '0:19' },
      { id: '9bZkp7q19f0',  title: 'PSY — GANGNAM STYLE', channel: 'officialpsy', dur: '4:12' },
    ],
    plInput: '',
    currentPLIndex: 0,

    /* ── Theme ── */
    themes: [
      { name:'Red',    accent:'#ff0000', bg:'#0f0f14', ctrl:'rgba(0,0,0,.92)' },
      { name:'Blue',   accent:'#3b82f6', bg:'#0a0f1e', ctrl:'rgba(0,5,20,.92)' },
      { name:'Green',  accent:'#22c55e', bg:'#061410', ctrl:'rgba(0,10,5,.92)' },
      { name:'Purple', accent:'#a855f7', bg:'#0e0a14', ctrl:'rgba(5,0,15,.92)' },
      { name:'Gold',   accent:'#f59e0b', bg:'#12100a', ctrl:'rgba(15,10,0,.92)' },
    ],
    themeIdx: 0,

    /* ── Tick interval ── */
    _tickId: null,

    /* ─────────────────────────────── */
    init() {
      /* Apply default theme via CSS vars only (no DOM query needed) */
      const t = this.themes[0];
      document.documentElement.style.setProperty('--primary', t.accent);
      document.documentElement.style.setProperty('--secondary', t.accent);
      document.documentElement.style.setProperty('--accent', t.accent);

      /* Expose onYouTubeIframeAPIReady globally — the API calls this when loaded */
      window.onYouTubeIframeAPIReady = () => {
        this.apiReady = true;
        /* If load() was called before the API was ready, create the player now */
        if (this.videoId) this._createPlayer(this.videoId);
      };

      /* Inject the IFrame API script */
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script');
        s.id = 'yt-api-script';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }

      /* Keyboard shortcuts */
      document.addEventListener('keydown', (e) => {
        if (!this.playerReady) return;
        if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
        switch(e.key) {
          case ' ': case 'k': e.preventDefault(); this.togglePlay(); break;
          case 'ArrowLeft':   e.preventDefault(); this.skip(-10); break;
          case 'ArrowRight':  e.preventDefault(); this.skip(10); break;
          case 'ArrowUp':     e.preventDefault(); this.changeVolume(5); break;
          case 'ArrowDown':   e.preventDefault(); this.changeVolume(-5); break;
          case 'm': this.toggleMute(); break;
          case 'f': this.requestFullscreen(); break;
          case 'l': this.toggleLoop(); break;
          case '>': this.nextSpeed(); break;
          case '<': this.prevSpeed(); break;
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.speed-popup') && !e.target.closest('.speed-btn')) {
          this.speedPopupOpen = false;
        }
      });
    },

    /* ── Parse video ID ── */
    _parseId(raw) {
      if (!raw) return '';
      raw = raw.trim();
      let m;
      m = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);    if (m) return m[1];
      m = raw.match(/[?&]v=([A-Za-z0-9_-]{11})/);         if (m) return m[1];
      m = raw.match(/embed\/([A-Za-z0-9_-]{11})/);        if (m) return m[1];
      m = raw.match(/shorts\/([A-Za-z0-9_-]{11})/);       if (m) return m[1];
      m = raw.match(/live\/([A-Za-z0-9_-]{11})/);         if (m) return m[1];
      if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
      return '';
    },

    load() {
      const id = this._parseId(this.urlInput);
      if (!id) { this.error = 'No valid YouTube video ID found.'; return; }
      this.error = '';
      this.videoId = id;
      if (!this.apiReady) {
        /* Will be triggered by onYouTubeIframeAPIReady once the script loads */
        return;
      }
      if (this.player && this.playerReady) {
        this.player.loadVideoById(id);
        this.showOverlay = false;
        this.currentTime = 0;
        this.duration = 0;
      } else {
        this._createPlayer(id);
      }
    },

    /* ── Recreate the target div and build the player ── */
    _createPlayer(id) {
      /* Destroy existing player cleanly */
      if (this.player) {
        try { this.player.destroy(); } catch(e) {}
        this.player = null;
      }
      this.playerReady = false;
      this.playing = false;
      this.currentTime = 0;
      this.duration = 0;

      /* The IFrame API replaces the target element with an <iframe>.
         After destroy() that element is gone, so we must recreate it. */
      const wrap = document.getElementById('yt-iframe-wrap');
      if (!wrap) return;
      /* Remove old iframe if present */
      const old = document.getElementById('yt-iframe');
      if (old) old.remove();
      /* Insert fresh target div */
      const target = document.createElement('div');
      target.id = 'yt-iframe';
      wrap.insertBefore(target, wrap.firstChild);

      /* Use location.origin; fall back to empty string for file:// protocol */
      const origin = (location.origin && location.origin !== 'null') ? location.origin : '';

      this.player = new window.YT.Player('yt-iframe', {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          ...(origin ? { origin } : {}),
        },
        events: {
          onReady:       (e) => this._onReady(e),
          onStateChange: (e) => this._onState(e),
          onError:       (e) => this._onError(e),
        },
      });
    },

    _onReady(e) {
      this.playerReady = true;
      this.duration = this.player.getDuration() || 0;
      this.volume   = this.player.getVolume();
      this.muted    = this.player.isMuted();
      /* Apply current volume setting */
      this.player.setVolume(this.volume);
    },

    _onState(e) {
      const S = window.YT.PlayerState;
      if (e.data === S.PLAYING) {
        this.playing = true;
        this.showOverlay = false;
        this.duration = this.player.getDuration();
        this._startTick();
      } else if (e.data === S.PAUSED) {
        this.playing = false;
        this._stopTick();
      } else if (e.data === S.ENDED) {
        this.playing = false;
        this._stopTick();
        this.showOverlay = true;
        this.currentTime = this.duration;
        if (this.loop) {
          this.player.seekTo(0, true);
          this.player.playVideo();
        } else {
          this._playNext();
        }
      } else if (e.data === S.BUFFERING) {
        this.playing = true;
        this.showOverlay = false;
      }
    },

    _onError(e) {
      const codes = {
        2: 'Invalid video ID.',
        5: 'HTML5 player error.',
        100: 'Video not found or private.',
        101: 'Embedding disabled by owner.',
        150: 'Embedding disabled by owner.',
      };
      this.error = codes[e.data] || `Player error (code ${e.data}).`;
      this.playerReady = false;
    },

    /* ── Progress tick every 250ms ── */
    _startTick() {
      if (this._tickId) return;
      this._tickId = setInterval(() => {
        if (!this.player || !this.playerReady) return;
        try {
          this.currentTime = this.player.getCurrentTime() || 0;
          this.buffered    = (this.player.getVideoLoadedFraction() || 0) * 100;
        } catch(e) {}
      }, 250);
    },
    _stopTick() {
      clearInterval(this._tickId);
      this._tickId = null;
    },

    /* ── Playback controls ── */
    togglePlay() {
      if (!this.playerReady) return;
      if (this.playing) {
        this.player.pauseVideo();
      } else {
        this.player.playVideo();
        this.showOverlay = false;
      }
    },

    /* Big play button — just call togglePlay (player is already created on load) */
    bigPlayClick() {
      if (!this.playerReady) return;
      this.togglePlay();
    },

    skip(secs) {
      if (!this.playerReady) return;
      const t = Math.max(0, Math.min(this.duration, this.currentTime + secs));
      this.player.seekTo(t, true);
      this.currentTime = t;
    },

    toggleMute() {
      if (!this.playerReady) return;
      if (this.muted) { this.player.unMute(); this.muted = false; }
      else            { this.player.mute();   this.muted = true;  }
    },

    setVolume(v) {
      v = Math.max(0, Math.min(100, Number(v)));
      this.volume = v;
      if (!this.playerReady) return;
      this.player.setVolume(v);
      if (v === 0)          { this.player.mute();   this.muted = true;  }
      else if (this.muted)  { this.player.unMute(); this.muted = false; }
    },
    changeVolume(delta) { this.setVolume(this.volume + delta); },

    setSpeed(s) {
      this.speed = s;
      if (this.playerReady) this.player.setPlaybackRate(s);
      this.speedPopupOpen = false;
    },
    nextSpeed() {
      const i = this.speeds.indexOf(this.speed);
      if (i < this.speeds.length - 1) this.setSpeed(this.speeds[i + 1]);
    },
    prevSpeed() {
      const i = this.speeds.indexOf(this.speed);
      if (i > 0) this.setSpeed(this.speeds[i - 1]);
    },

    toggleLoop() { this.loop = !this.loop; },

    /* ── Seek bar ── */
    get seekPct() {
      return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    },

    onSeekClick(e) {
      if (!this.playerReady || !this.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const t    = pct * this.duration;
      this.player.seekTo(t, true);
      this.currentTime = t;
    },

    onSeekMouseMove(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.seekTooltipX    = pct * 100;
      this.seekTooltipTime = this._fmt(pct * this.duration);
    },

    /* ── Time format ── */
    _fmt(s) {
      s = Math.floor(s || 0);
      const h   = Math.floor(s / 3600);
      const m   = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
      return `${m}:${String(sec).padStart(2,'0')}`;
    },
    get fmtCurrent()  { return this._fmt(this.currentTime); },
    get fmtDuration() { return this._fmt(this.duration); },

    /* ── Fullscreen ── */
    requestFullscreen() {
      const el = document.getElementById('player-shell');
      if (!el) return;
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    },

    /* ── Theme ── */
    _applyTheme(idx) {
      const t = this.themes[idx];
      this.themeIdx = idx;
      document.documentElement.style.setProperty('--primary',   t.accent);
      document.documentElement.style.setProperty('--secondary', t.accent);
      document.documentElement.style.setProperty('--accent',    t.accent);
      document.documentElement.style.setProperty('--bg',        t.bg);
      /* Update controls bar gradient */
      const ctrl = document.querySelector('.controls');
      if (ctrl) ctrl.style.background =
        `linear-gradient(0deg,${t.ctrl} 0%,rgba(0,0,0,.7) 70%,transparent 100%)`;
    },

    /* ── Playlist ── */
    loadPlaylistItem(idx) {
      const item = this.playlist[idx];
      if (!item) return;
      this.currentPLIndex = idx;
      this.videoId  = item.id;
      this.urlInput = `https://youtu.be/${item.id}`;
      this.error    = '';
      this.showOverlay = false;
      if (this.player && this.playerReady) {
        this.player.loadVideoById(item.id);
        this.currentTime = 0;
      } else if (this.apiReady) {
        this._createPlayer(item.id);
      }
    },

    _playNext() {
      if (this.playlist.length <= 1) return;
      const next = (this.currentPLIndex + 1) % this.playlist.length;
      this.loadPlaylistItem(next);
    },

    addToPlaylist() {
      const id = this._parseId(this.plInput.trim());
      if (!id) { this._toast('Invalid URL or ID'); return; }
      if (this.playlist.some(p => p.id === id)) { this._toast('Already in playlist'); return; }
      this.playlist.push({ id, title: 'Video — ' + id, channel: 'YouTube', dur: '--:--' });
      this.plInput = '';
      this._toast('Added to playlist');
    },

    removeFromPlaylist(idx) {
      this.playlist.splice(idx, 1);
      if (this.currentPLIndex >= this.playlist.length)
        this.currentPLIndex = Math.max(0, this.playlist.length - 1);
    },

    toggleFaq(el) { el.closest('.faq-item').classList.toggle('open'); },

    _toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    },
  };
}
