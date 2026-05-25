/* ===== PLAYER STATE ===== */
let isPlaying = false, isTheater = false, isMini = false, isMuted = false;
let currentSpeed = 1, currentQuality = '1080', isSub = true, saved = false;
let introTimer = null, outroTimer = null, nextTimer = null;
let currentEpisode = 1, totalEpisodes = 12, duration = 1440;
let currentSeason = 1, totalSeasons = 1;
let controlsHideTimer = null, isControlsVisible = true;
let lastActivity = Date.now();
let wasPlayingBeforeMini = false;
let retryCount = 0;
let currentContentType = 'tv';
let currentTmdbId = null;
let isIframeFullscreen = false;

/* ===== DOM ELEMENTS ===== */
let video, playerBox, bigPlayWrap, loader, seekWrap, seekFill, seekBuffer, seekThumb;
let timeCur, timeTot, spbIcon, skipIntroBtn, skipOutroBtn, nextOverlay, nextNum, nextCircle;
let controlsLayer, speedBtnText, qualityBadge, playerBg, seasonDrop, seasonLabel;
let screenscapeContainer;

/* ===== LOCAL STORAGE ===== */
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }
};

/* ===== SCREENSCAPE EMBED FUNCTIONS ===== */
function createScreenscapePlayer(embedUrl) {
  const container = document.getElementById('screenscape-container');
  if (!container) {
    console.error('Screenscape container not found');
    return;
  }
  container.innerHTML = '';
  container.classList.add('loading');

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media');
  iframe.setAttribute('referrerpolicy', 'origin');
  iframe.setAttribute('loading', 'eager');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';

  iframe.onload = function() {
    container.classList.remove('loading');
  };

  iframe.onerror = function() {
    container.classList.remove('loading');
    showToast('Failed to load Screenscape');
  };

  container.appendChild(iframe);
  container.style.display = 'block';
}

function destroyScreenscapePlayer() {
  const container = document.getElementById('screenscape-container');
  if (container) {
    container.innerHTML = '';
    container.style.display = 'none';
    container.classList.remove('loading');
  }
}

function isScreenscapeActive() {
  const container = document.getElementById('screenscape-container');
  return container && container.style.display === 'block';
}

/* ===== IFRAME FULLSCREEN HANDLER ===== */
function enterIframeFullscreen() {
  const iframe = document.querySelector('#screenscape-container iframe');
  if (!iframe) return;

  // Method 1: Try iframe native fullscreen (best quality)
  const iframeReq = iframe.requestFullscreen || iframe.webkitRequestFullscreen || iframe.mozRequestFullScreen || iframe.msRequestFullscreen;
  if (iframeReq) {
    try {
      iframeReq.call(iframe);
      return;
    } catch(e) {
      console.log('Iframe fullscreen failed, trying container...');
    }
  }

  // Method 2: Try container fullscreen
  const containerReq = playerBox?.requestFullscreen || playerBox?.webkitRequestFullscreen || playerBox?.mozRequestFullScreen || playerBox?.msRequestFullscreen;
  if (containerReq) {
    try {
      containerReq.call(playerBox);
      return;
    } catch(e) {
      console.log('Container fullscreen failed, using CSS fallback...');
    }
  }

  // Method 3: CSS pseudo-fullscreen (guaranteed to work)
  playerBox?.classList.add('iframe-fullscreen');
  isIframeFullscreen = true;
  document.getElementById('iframe-exit-btn')?.classList.add('visible');
  showToast('Fullscreen mode');
}

function exitIframeFullscreen() {
  // Exit real fullscreen if active
  if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) {
      try {
        exit.call(document);
      } catch(e) {}
    }
  }

  // Exit CSS pseudo-fullscreen
  playerBox?.classList.remove('iframe-fullscreen');
  isIframeFullscreen = false;
  document.getElementById('iframe-exit-btn')?.classList.remove('visible');
}

function toggleIframeFullscreen() {
  if (isIframeFullscreen || document.fullscreenElement || document.webkitFullscreenElement) {
    exitIframeFullscreen();
  } else {
    enterIframeFullscreen();
  }
}

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  video = document.getElementById('video');
  playerBox = document.getElementById('player-box');
  bigPlayWrap = document.getElementById('big-play-wrap');
  loader = document.getElementById('loader');
  seekWrap = document.getElementById('seek-wrap');
  seekFill = document.getElementById('seek-fill');
  seekBuffer = document.getElementById('seek-buffer');
  seekThumb = document.getElementById('seek-thumb');
  timeCur = document.getElementById('time-current');
  timeTot = document.getElementById('time-total');
  spbIcon = document.getElementById('spb-icon');
  skipIntroBtn = document.getElementById('skip-intro');
  skipOutroBtn = document.getElementById('skip-outro');
  nextOverlay = document.getElementById('next-overlay');
  nextNum = document.getElementById('next-num');
  nextCircle = document.getElementById('next-circle');
  controlsLayer = document.querySelector('.controls-layer');
  qualityBadge = document.getElementById('quality-badge');
  playerBg = document.getElementById('player-bg');
  seasonDrop = document.getElementById('season-drop');
  seasonLabel = document.getElementById('season-label');
  screenscapeContainer = document.getElementById('screenscape-container');

  const p = new URLSearchParams(location.search);
  const id = p.get('id');
  const ep = parseInt(p.get('ep')) || 1;
  const season = parseInt(p.get('season')) || 1;
  currentEpisode = ep;
  currentSeason = season;
  currentTmdbId = id;

  const nextEpName = document.getElementById('next-ep-name');
  if (nextEpName) nextEpName.textContent = 'Episode ' + (ep + 1);

  loadPlayerSettings();

  if (id && typeof fetchAnimeDetails === 'function') {
    fetchAnimeDetails(id).then(d => {
      // Auto-detect content type for screenscape
      if (d.media_type === 'movie' || (d.title && !d.name)) {
        currentContentType = 'movie';
      } else {
        currentContentType = 'tv';
      }

      const titleEl = document.getElementById('player-title');
      const animeTitleEl = document.getElementById('player-anime-title');
      const synopsisEl = document.getElementById('anime-synopsis');

      if (titleEl) titleEl.textContent = d.name || d.title || 'Now Playing';
      if (animeTitleEl) animeTitleEl.textContent = (d.name || d.title || 'Anime') + (currentContentType === 'tv' ? ' - Episode ' + ep : '');

      // Set player background image (performance safe, no blur)
      const backdrop = d.backdrop_path || d.poster_path;
      if (backdrop && playerBg) {
        const bgUrl = typeof getBackdropUrl === 'function'
          ? getBackdropUrl(backdrop, 'w1280')
          : 'https://image.tmdb.org/t/p/w1280' + backdrop;
        playerBg.style.backgroundImage = 'url(' + bgUrl + ')';
      }
      if (d.backdrop_path && video) {
        const posterUrl = typeof getBackdropUrl === 'function'
          ? getBackdropUrl(d.backdrop_path, 'w780')
          : 'https://image.tmdb.org/t/p/w780' + d.backdrop_path;
        video.poster = posterUrl;
      }
      if (synopsisEl && d.overview) synopsisEl.textContent = d.overview;

      setupMediaSession(d.name || 'Anime', ep, d.backdrop_path || d.poster_path);

      if (typeof addToContinueWatching === 'function') {
        addToContinueWatching({
          id: d.id,
          title: d.name || d.title,
          poster: d.poster_path || d.backdrop_path,
          episode: ep,
          season: currentSeason,
          progress: 0
        });
      }
    }).catch(() => {});
  }

  // Mock seasons data - in real app, this comes from API
  setupSeasonsData(id);
  buildSeasons();
  buildEpisodes(ep);
  
  const lastServer = LS.get('lastServer', 'vidstream');
  document.querySelectorAll('.srv-btn').forEach(b => b.classList.toggle('on', b.dataset.srv === lastServer));
  loadVideoSource(lastServer);
  buildNextUp();
  buildComments();
  buildRelated();
  if (video) setupVideo();
  setupKeys();
  setupTouchGestures();
  setupAutoHideControls();
  setupFullscreenChange();
  setupVideoErrorHandling();
  resumeWatchProgress(id, ep);
});

/* ===== SEASONS ===== */
let seasonsData = [{ num: 1, eps: 12, title: 'Season 1' }];

function setupSeasonsData(animeId) {
  // In real implementation, fetch from API. Mock data for demo:
  if (animeId === '1429' || animeId === '1429') { // JJK example
    seasonsData = [
      { num: 1, eps: 24, title: 'Season 1' },
      { num: 2, eps: 23, title: 'Season 2' }
    ];
    totalSeasons = 2;
  } else if (animeId === '31911' || animeId === '31910') { // Naruto example
    seasonsData = [
      { num: 1, eps: 220, title: 'Naruto' },
      { num: 2, eps: 500, title: 'Shippuden' }
    ];
    totalSeasons = 2;
  } else {
    seasonsData = [{ num: 1, eps: 12, title: 'Season 1' }];
    totalSeasons = 1;
  }
  // Override with URL param if present
  const p = new URLSearchParams(location.search);
  const s = parseInt(p.get('season')) || 1;
  currentSeason = Math.min(s, totalSeasons);
  totalEpisodes = seasonsData.find(se => se.num === currentSeason)?.eps || 12;
}

function buildSeasons() {
  if (!seasonDrop) return;
  seasonDrop.innerHTML = '';
  seasonsData.forEach(s => {
    const el = document.createElement('div');
    el.className = 'season-item' + (s.num === currentSeason ? ' on' : '');
    el.textContent = s.title + ' (' + s.eps + ' eps)';
    el.onclick = () => switchSeason(s.num);
    seasonDrop.appendChild(el);
  });
  if (seasonLabel) seasonLabel.textContent = seasonsData.find(s => s.num === currentSeason)?.title || 'Season ' + currentSeason;
}

function toggleSeasonDrop() {
  if (!seasonDrop) return;
  const open = seasonDrop.classList.contains('open');
  document.querySelectorAll('.season-drop').forEach(m => m.classList.remove('open'));
  if (!open) seasonDrop.classList.add('open');
}

function switchSeason(seasonNum) {
  if (seasonNum === currentSeason) return;
  currentSeason = seasonNum;
  currentEpisode = 1;
  totalEpisodes = seasonsData.find(s => s.num === seasonNum)?.eps || 12;

  const u = new URL(location);
  u.searchParams.set('season', seasonNum);
  u.searchParams.set('ep', 1);
  location.href = u;
}

/* ===== SETTINGS PERSISTENCE ===== */
function loadPlayerSettings() {
  const s = LS.get('playerSettings', {});
  if (s.speed) currentSpeed = s.speed;
  if (s.quality) currentQuality = s.quality;
  if (s.isSub !== undefined) isSub = s.isSub;
  if (s.volume !== undefined && video) { video.volume = s.volume; video.muted = s.muted || false; }
  if (s.muted !== undefined && video) video.muted = s.muted;

  if (video) {
    video.playbackRate = currentSpeed;
    updateSpeedBtn();
    updateMuteIcon();
  }
  if (qualityBadge) qualityBadge.textContent = currentQuality === 'auto' ? 'AUTO' : currentQuality === '4k' ? '4K' : currentQuality + 'p';
  const sdBtn = document.getElementById('sd-btn');
  if (sdBtn) sdBtn.innerHTML = '<span style="font-size:10px;font-weight:700">' + (isSub ? 'SUB' : 'DUB') + '</span>';
  const subBadge = document.getElementById('sub-dub-badge');
  if (subBadge) subBadge.textContent = isSub ? 'Subbed' : 'Dubbed';
}

function savePlayerSettings() {
  if (!video) return;
  LS.set('playerSettings', {
    speed: currentSpeed,
    quality: currentQuality,
    isSub: isSub,
    volume: video.volume,
    muted: video.muted
  });
}

/* ===== WATCH PROGRESS ===== */
function saveWatchProgress() {
  if (!video || !video.duration) return;
  const p = new URLSearchParams(location.search);
  const id = p.get('id');
  if (!id) return;
  const key = 'watchProgress_' + id + '_s' + currentSeason + '_ep' + currentEpisode;
  LS.set(key, { time: video.currentTime, duration: video.duration, updated: Date.now() });
}

function resumeWatchProgress(id, ep) {
  if (!video || !id) return;
  if (isScreenscapeActive()) return;
  const key = 'watchProgress_' + id + '_s' + currentSeason + '_ep' + ep;
  const data = LS.get(key, null);
  if (data && data.time && data.duration) {
    const pct = data.time / data.duration;
    if (pct > 0.05 && pct < 0.95) {
      video.currentTime = data.time;
      showToast('Resumed from ' + fmtTime(data.time));
    }
  }
}

/* ===== VIDEO SOURCE ===== */
function loadVideoSource(server) {
  // SCREENSCAPE: Dynamic iframe embed
  if (server === 'screenscape') {
    const p = new URLSearchParams(location.search);
    const id = p.get('id') || currentTmdbId;
    const ep = parseInt(p.get('ep')) || currentEpisode || 1;
    const season = parseInt(p.get('season')) || currentSeason || 1;

    if (!id) {
      showToast('Error: No TMDB ID found');
      console.error('Screenscape: Missing TMDB ID');
      return;
    }

    let embedUrl = `https://screenscape.me/embed?tmdb=${id}&type=${currentContentType}`;
    if (currentContentType === 'tv') {
      embedUrl += `&s=${season}&e=${ep}`;
    }

    console.log('Screenscape URL:', embedUrl);

    destroyScreenscapePlayer();
    createScreenscapePlayer(embedUrl);

    if (video) {
      video.pause();
      video.style.display = 'none';
      video.src = '';
    }
    if (bigPlayWrap) bigPlayWrap.style.display = 'none';
    if (loader) loader.style.display = 'none';
    if (controlsLayer) controlsLayer.style.display = 'none';
    if (skipIntroBtn) skipIntroBtn.style.display = 'none';
    if (skipOutroBtn) skipOutroBtn.style.display = 'none';
    if (nextOverlay) nextOverlay.classList.remove('active');
    if (playerBg) playerBg.style.display = 'none';

    showToast('Loading Screenscape...');
    return;
  }

  // RESTORE native player
  destroyScreenscapePlayer();
  exitIframeFullscreen(); // Ensure we exit fullscreen if switching away

  if (playerBg) playerBg.style.display = '';
  if (video) video.style.display = '';
  if (bigPlayWrap) bigPlayWrap.style.display = '';
  if (controlsLayer) controlsLayer.style.display = '';
  if (skipIntroBtn) skipIntroBtn.style.display = '';
  if (skipOutroBtn) skipOutroBtn.style.display = '';

  // Existing native video logic
  if (!video) return;
  const sources = {
    vidstream: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    mycloud: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    filemoon: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    streamsb: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
  };
  const src = sources[server] || sources.vidstream;
  const currentSrc = video.querySelector('source')?.src || video.src;
  if (currentSrc === src) return;

  const wasPlaying = !video.paused;
  const currentTime = video.currentTime;

  video.src = src;
  video.load();
  if (loader) loader.style.display = 'flex';

  video.addEventListener('loadedmetadata', function onMeta() {
    video.removeEventListener('loadedmetadata', onMeta);
    if (currentTime > 0 && currentTime < (video.duration || Infinity)) {
      video.currentTime = currentTime;
    }
    if (wasPlaying) video.play().catch(()=>{});
    if (loader) loader.style.display = 'none';
  }, { once: true });
}

/* ===== MEDIA SESSION API ===== */
function setupMediaSession(title, ep, posterPath) {
  if (!('mediaSession' in navigator)) return;
  const poster = posterPath 
    ? (typeof getBackdropUrl === 'function' ? getBackdropUrl(posterPath, 'w300') : 'https://image.tmdb.org/t/p/w300' + posterPath)
    : '';
  navigator.mediaSession.metadata = new MediaMetadata({
    title: title + (currentContentType === 'tv' ? ' - Ep ' + ep : ''),
    artist: 'THRILLING ANIME',
    artwork: poster ? [{ src: poster, sizes: '300x450', type: 'image/jpeg' }] : []
  });
  navigator.mediaSession.setActionHandler('play', togglePlay);
  navigator.mediaSession.setActionHandler('pause', togglePlay);
  navigator.mediaSession.setActionHandler('seekbackward', skipBack);
  navigator.mediaSession.setActionHandler('seekforward', skipFwd);
  navigator.mediaSession.setActionHandler('previoustrack', () => { if (currentEpisode > 1) { const u = new URL(location); u.searchParams.set('ep', currentEpisode - 1); location.href = u; }});
  navigator.mediaSession.setActionHandler('nexttrack', goNext);
}

/* ===== VIDEO CONTROLS ===== */
function setupVideo() {
  video.addEventListener('click', togglePlay);
  video.addEventListener('play', () => {
    isPlaying = true; updatePlayBtn();
    if (bigPlayWrap) { bigPlayWrap.style.opacity = '0'; bigPlayWrap.style.pointerEvents = 'none'; }
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  video.addEventListener('pause', () => {
    isPlaying = false; updatePlayBtn();
    if (bigPlayWrap) { bigPlayWrap.style.opacity = '1'; bigPlayWrap.style.pointerEvents = 'auto'; }
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });
  video.addEventListener('waiting', () => { if (loader) loader.style.display = 'flex'; });
  video.addEventListener('playing', () => { if (loader) loader.style.display = 'none'; });
  video.addEventListener('ended', onEnded);
  video.addEventListener('timeupdate', onTimeUpdate);
  video.addEventListener('loadedmetadata', () => {
    if (timeTot) timeTot.textContent = fmtTime(video.duration || 1440);
    if (loader) loader.style.display = 'none';
  });
  video.addEventListener('progress', updateBuffer);
  video.addEventListener('volumechange', () => { updateMuteIcon(); savePlayerSettings(); });

  setInterval(() => { if (!isScreenscapeActive()) saveWatchProgress(); }, 5000);

  let dragging = false;
  if (seekWrap) {
    seekWrap.addEventListener('mousedown', e => { dragging = true; doSeek(e); });
    seekWrap.addEventListener('touchstart', e => { dragging = true; doSeek(e.touches[0]); }, {passive:true});
  }
  document.addEventListener('mousemove', e => { if (dragging) doSeek(e); });
  document.addEventListener('touchmove', e => { if (dragging) doSeek(e.touches[0]); }, {passive:true});
  document.addEventListener('mouseup', () => dragging = false);
  document.addEventListener('touchend', () => dragging = false);
  seekWrap?.addEventListener('click', doSeek);
}

function updateBuffer() {
  if (!video || !seekBuffer || !video.buffered.length) return;
  let maxEnd = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime) {
      maxEnd = video.buffered.end(i); break;
    }
  }
  if (!maxEnd) maxEnd = video.buffered.end(video.buffered.length - 1);
  seekBuffer.style.width = (maxEnd / (video.duration || 1)) * 100 + '%';
}

function togglePlay() {
  if (!video) return;
  if (isScreenscapeActive()) return;
  video.paused ? video.play().catch(()=>{}) : video.pause();
}

function updatePlayBtn() {
  if (!spbIcon) return;
  spbIcon.innerHTML = isPlaying
    ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>'
    : '<polygon points="5 3 19 12 5 21 5 3"/>';
}

function skipFwd() {
  if (!video) return;
  if (isScreenscapeActive()) return;
  video.currentTime = Math.min(video.currentTime + 10, video.duration || 1440);
  showToast('+10s');
  activity();
}

function skipBack() {
  if (!video) return;
  if (isScreenscapeActive()) return;
  video.currentTime = Math.max(video.currentTime - 10, 0);
  showToast('-10s');
  activity();
}

function doSeek(e) {
  if (!seekWrap || !video) return;
  if (isScreenscapeActive()) return;
  const r = seekWrap.getBoundingClientRect();
  const clientX = e.clientX || e.pageX || 0;
  const x = Math.max(0, Math.min(clientX - r.left, r.width));
  const pct = x / r.width;
  video.currentTime = pct * (video.duration || 1440);
  activity();
}

function onTimeUpdate() {
  if (!video || !seekFill) return;
  const pct = (video.currentTime / (video.duration || 1)) * 100;
  seekFill.style.width = pct + '%';
  if (seekThumb) seekThumb.style.left = pct + '%';
  if (timeCur) timeCur.textContent = fmtTime(video.currentTime);

  const introStart = parseFloat(video.dataset.introStart || '30');
  const introEnd = parseFloat(video.dataset.introEnd || '90');
  if (video.currentTime > introStart && video.currentTime < introEnd) {
    showSkip(skipIntroBtn, 'intro-timer', introTimer, doSkipIntro);
  } else hideSkip(skipIntroBtn, introTimer);

  if (video.duration && video.currentTime > video.duration - 120) {
    showSkip(skipOutroBtn, 'outro-timer', outroTimer, doSkipOutro);
  } else hideSkip(skipOutroBtn, outroTimer);
}

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s/60);
  const sec = Math.floor(s%60);
  const h = Math.floor(m/60);
  if (h > 0) return h + ':' + String(m%60).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
  return m + ':' + String(sec).padStart(2,'0');
}

/* ===== SKIP INTRO/OUTRO ===== */
function showSkip(btn, timerId, timerVar, cb) {
  if (!btn || btn.classList.contains('show')) return;
  btn.classList.add('show');
  let sec = 5;
  const t = btn.querySelector('span');
  if (t) t.textContent = '(' + sec + ')';
  const interval = setInterval(() => {
    sec--;
    if (t) t.textContent = '(' + sec + ')';
    if (sec <= 0) { clearInterval(interval); cb(); }
  }, 1000);
  if (timerId === 'intro-timer') introTimer = interval;
  else outroTimer = interval;
}

function hideSkip(btn, timerVar) {
  if (!btn) return;
  btn.classList.remove('show');
  clearInterval(timerVar);
  const t = btn.querySelector('span');
  if (t) t.textContent = '(5)';
}

function doSkipIntro() {
  if (!video) return;
  if (isScreenscapeActive()) return;
  const introEnd = parseFloat(video.dataset.introEnd || '90');
  video.currentTime = introEnd;
  hideSkip(skipIntroBtn, introTimer);
  showToast('Skipped Intro');
}

function doSkipOutro() {
  if (!video) return;
  if (isScreenscapeActive()) return;
  if (video.duration) video.currentTime = video.duration;
  hideSkip(skipOutroBtn, outroTimer);
  showToast('Skipped Outro');
}

/* ===== NEXT EPISODE ===== */
function onEnded() {
  if (currentEpisode < totalEpisodes) startNextCountdown();
  else showToast('Series Complete!');
}

function startNextCountdown() {
  if (!nextOverlay) return;
  nextOverlay.classList.add('active');
  let sec = 10;
  if (nextNum) nextNum.textContent = sec;
  const total = 283;
  if (nextCircle) nextCircle.style.strokeDashoffset = '0';
  nextTimer = setInterval(() => {
    sec--;
    if (nextNum) nextNum.textContent = sec;
    if (nextCircle) nextCircle.style.strokeDashoffset = String(total * (1 - sec / 10));
    if (sec <= 0) { clearInterval(nextTimer); goNext(); }
  }, 1000);
}

function cancelNext() {
  clearInterval(nextTimer);
  if (nextOverlay) nextOverlay.classList.remove('active');
}

function playNextNow() {
  clearInterval(nextTimer);
  goNext();
}

function goNext() {
  if (currentEpisode < totalEpisodes) {
    const u = new URL(location);
    u.searchParams.set('ep', currentEpisode + 1);
    location.href = u;
  }
}

/* ===== PLAYER SETTINGS ===== */
function pickServer(btn) {
  document.querySelectorAll('.srv-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  const server = btn.dataset.srv || 'vidstream';
  LS.set('lastServer', server);
  loadVideoSource(server);
  showToast('Switched server');
}

function toggleDrop(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const open = el.classList.contains('open');
  document.querySelectorAll('.drop-menu').forEach(m => m.classList.remove('open'));
  if (!open) el.classList.add('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.relative') && !e.target.closest('.season-btn') && !e.target.closest('.season-drop')) {
    document.querySelectorAll('.drop-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.season-drop').forEach(m => m.classList.remove('open'));
  }
});

function setSpeed(s) {
  if (!video) return;
  if (isScreenscapeActive()) return;
  video.playbackRate = s;
  currentSpeed = s;
  updateSpeedBtn();
  document.querySelectorAll('#drop-speed .drop-item').forEach(it => {
    it.classList.toggle('on', it.textContent.includes(s + 'x'));
  });
  showToast('Speed: ' + s + 'x');
  savePlayerSettings();
}

function updateSpeedBtn() {
  const btn = document.querySelector('[onclick*="drop-speed"] span');
  if (btn) btn.textContent = currentSpeed + 'x';
}

function setQuality(q) {
  currentQuality = q;
  document.querySelectorAll('#drop-quality .drop-item').forEach(it => {
    it.classList.toggle('on', it.textContent.toLowerCase().includes(q));
  });
  const badge = document.getElementById('quality-badge');
  if (badge) badge.textContent = q === 'auto' ? 'AUTO' : q === '4k' ? '4K' : q + 'p';
  showToast('Quality: ' + (q === 'auto' ? 'Auto' : q === '4k' ? '4K' : q + 'p'));
  savePlayerSettings();
}

function toggleSubDub() {
  isSub = !isSub;
  const sdBtn = document.getElementById('sd-btn');
  const badge = document.getElementById('sub-dub-badge');
  if (sdBtn) sdBtn.innerHTML = '<span style="font-size:10px;font-weight:700">' + (isSub ? 'SUB' : 'DUB') + '</span>';
  if (badge) badge.textContent = isSub ? 'Subbed' : 'Dubbed';
  showToast(isSub ? 'Subtitles On' : 'Dubbed Audio');
  savePlayerSettings();
}

function toggleTheater() {
  isTheater = !isTheater;
  if (playerBox) playerBox.classList.toggle('theater', isTheater);
  showToast(isTheater ? 'Theater On' : 'Theater Off');
}

function toggleFull() {
  // If screenscape is active, use iframe-specific fullscreen
  if (isScreenscapeActive()) {
    toggleIframeFullscreen();
    return;
  }

  // Native video fullscreen
  if (!document.fullscreenElement) {
    const el = playerBox || video;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(()=>{});
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (exit) exit.call(document).catch(()=>{});
  }
}

function toggleMini() {
  if (document.pictureInPictureEnabled && video) {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(()=>{});
    } else {
      video.requestPictureInPicture().catch(() => fallbackMini());
    }
    return;
  }
  fallbackMini();
}

function fallbackMini() {
  isMini = !isMini;
  if (playerBox) playerBox.classList.toggle('mini', isMini);
  const sp = document.getElementById('standalone-player');
  const nav = document.querySelector('.bottom-nav');
  if (sp) sp.style.display = isMini ? 'none' : 'block';
  if (nav) nav.style.display = isMini ? 'none' : 'block';

  if (isMini) {
    wasPlayingBeforeMini = isPlaying;
    if (video && !video.paused) video.play().catch(()=>{});
  } else {
    if (video && wasPlayingBeforeMini) video.play().catch(()=>{});
  }
  showToast(isMini ? 'Mini Player On' : 'Mini Player Off');
}

function setVol(v) {
  if (!video) return;
  if (isScreenscapeActive()) return;
  video.volume = v / 100;
  video.muted = v == 0;
  updateMuteIcon();
  savePlayerSettings();
}

function toggleMute() {
  if (!video) return;
  if (isScreenscapeActive()) return;
  video.muted = !video.muted;
  updateMuteIcon();
  savePlayerSettings();
}

function updateMuteIcon() {
  const btn = document.getElementById('mute-btn');
  if (!btn || !video) return;
  if (video.muted || video.volume === 0) {
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
  } else if (video.volume < 0.5) {
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  } else {
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
  }
}

/* ===== AUTO-HIDE CONTROLS ===== */
function setupAutoHideControls() {
  if (!playerBox || !controlsLayer) return;
  const hideDelay = 3000;

  function hideControls() {
    if (!isPlaying || isMini) return;
    controlsLayer.style.opacity = '0';
    controlsLayer.style.pointerEvents = 'none';
    if (bigPlayWrap) bigPlayWrap.style.opacity = '0';
    isControlsVisible = false;
  }

  function showControls() {
    controlsLayer.style.opacity = '1';
    controlsLayer.style.pointerEvents = 'auto';
    if (bigPlayWrap && !isPlaying) bigPlayWrap.style.opacity = '1';
    isControlsVisible = true;
    clearTimeout(controlsHideTimer);
    if (isPlaying) {
      controlsHideTimer = setTimeout(hideControls, hideDelay);
    }
  }

  playerBox.addEventListener('mousemove', showControls);
  playerBox.addEventListener('touchstart', showControls, {passive:true});
  playerBox.addEventListener('click', showControls);

  video?.addEventListener('play', () => {
    clearTimeout(controlsHideTimer);
    controlsHideTimer = setTimeout(hideControls, hideDelay);
  });
  video?.addEventListener('pause', () => {
    clearTimeout(controlsHideTimer);
    controlsLayer.style.opacity = '1';
    controlsLayer.style.pointerEvents = 'auto';
    isControlsVisible = true;
  });
}

function activity() {
  lastActivity = Date.now();
  if (controlsLayer && !isControlsVisible) {
    controlsLayer.style.opacity = '1';
    controlsLayer.style.pointerEvents = 'auto';
    isControlsVisible = true;
  }
  clearTimeout(controlsHideTimer);
  if (isPlaying) {
    controlsHideTimer = setTimeout(() => {
      if (controlsLayer && !isMini) {
        controlsLayer.style.opacity = '0';
        controlsLayer.style.pointerEvents = 'none';
      }
      isControlsVisible = false;
    }, 3000);
  }
}

/* ===== TOUCH GESTURES ===== */
function setupTouchGestures() {
  if (!playerBox || !video) return;
  let touchStartX = 0, touchStartY = 0, touchStartTime = 0;
  let lastTap = 0, tapTimeout;

  playerBox.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartTime = Date.now();
  }, {passive:true});

  playerBox.addEventListener('touchend', e => {
    if (isScreenscapeActive()) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;
    const rect = playerBox.getBoundingClientRect();
    const x = t.clientX - rect.left;

    const now = Date.now();
    if (now - lastTap < 300) {
      clearTimeout(tapTimeout);
      if (x < rect.width * 0.35) { skipBack(); showToast('-10s'); }
      else if (x > rect.width * 0.65) { skipFwd(); showToast('+10s'); }
      else { togglePlay(); }
      lastTap = 0;
      return;
    }
    lastTap = now;

    tapTimeout = setTimeout(() => {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 250) {
        togglePlay();
      }
    }, 300);

    if (Math.abs(dx) > 60 && Math.abs(dy) < 40 && dt < 600) {
      clearTimeout(tapTimeout);
      const seekAmt = dx > 0 ? 15 : -15;
      video.currentTime = Math.max(0, Math.min(video.currentTime + seekAmt, video.duration || 1440));
      showToast((seekAmt > 0 ? '+' : '') + seekAmt + 's');
    }
  }, {passive:true});
}

/* ===== FULLSCREEN CHANGE ===== */
function setupFullscreenChange() {
  const handler = () => {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (playerBox) playerBox.classList.toggle('fullscreen', isFull);

    // If exiting real fullscreen, also clean up CSS pseudo-fullscreen
    if (!isFull) {
      playerBox?.classList.remove('iframe-fullscreen');
      isIframeFullscreen = false;
      document.getElementById('iframe-exit-btn')?.classList.remove('visible');
    }
  };
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('mozfullscreenchange', handler);
  document.addEventListener('MSFullscreenChange', handler);
}

/* ===== VIDEO ERROR HANDLING ===== */
function setupVideoErrorHandling() {
  if (!video) return;
  video.addEventListener('error', () => {
    const err = video.error;
    let msg = 'Video error';
    if (err) {
      switch(err.code) {
        case MediaError.MEDIA_ERR_NETWORK: msg = 'Network error. Retrying...'; break;
        case MediaError.MEDIA_ERR_DECODE: msg = 'Decode error. Try another server.'; break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = 'Format not supported.'; break;
        default: msg = 'Unknown playback error.';
      }
    }
    showToast(msg);
    if (loader) loader.style.display = 'none';
    if (err?.code === MediaError.MEDIA_ERR_NETWORK && retryCount < 2) {
      retryCount++;
      setTimeout(() => { video.load(); video.play().catch(()=>{}); }, 2000);
    }
  });
  video.addEventListener('canplay', () => { retryCount = 0; });
}

/* ===== KEYBOARD SHORTCUTS ===== */
function setupKeys() {
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (isScreenscapeActive()) {
      const k = e.key.toLowerCase();
      if (k === 'f') { e.preventDefault(); toggleFull(); return; }
      if (k === 't') { e.preventDefault(); toggleTheater(); return; }
      if (k === 'escape') {
        if (isIframeFullscreen || document.fullscreenElement) {
          exitIframeFullscreen();
        }
        return;
      }
      return;
    }
    const k = e.key.toLowerCase();
    switch(k) {
      case ' ': case 'k': e.preventDefault(); togglePlay(); break;
      case 'arrowright': case 'l': e.preventDefault(); skipFwd(); break;
      case 'arrowleft': case 'j': e.preventDefault(); skipBack(); break;
      case 'arrowup': e.preventDefault(); setVol(Math.min(100, (video?.volume * 100 || 0) + 10)); break;
      case 'arrowdown': e.preventDefault(); setVol(Math.max(0, (video?.volume * 100 || 0) - 10)); break;
      case 'f': e.preventDefault(); toggleFull(); break;
      case 'm': e.preventDefault(); toggleMute(); break;
      case 't': e.preventDefault(); toggleTheater(); break;
      case 'n': e.preventDefault(); goNext(); break;
      case 's': e.preventDefault(); toggleSubDub(); break;
      case 'i': e.preventDefault(); doSkipIntro(); break;
      case ',': case '<': e.preventDefault(); setSpeed(Math.max(0.25, currentSpeed - 0.25)); break;
      case '.': case '>': e.preventDefault(); setSpeed(Math.min(4, currentSpeed + 0.25)); break;
      case '?': case '/': e.preventDefault(); showToast('Space:Play  K:Play  J:-10s  L:+10s  F:Full  M:Mute  T:Theater  N:Next  S:Sub<>Dub  I:SkipIntro  </>:Speed'); break;
    }
    activity();
  });
}

/* ===== EPISODES ===== */
function buildEpisodes(cur) {
  const list = document.getElementById('episodes-list');
  if (!list) return;
  const titles = ['Ryomen Sukuna','For Myself','Girl of Steel','Curse Womb Must Die','Curse Womb Must Die II','After Rain','Assault','Boredom','Small Fry and Reverse Retribution','Idle Transfiguration','Narrow-minded','To You Someday'];
  list.innerHTML = '';
  for (let i = 1; i <= totalEpisodes; i++) {
    const el = document.createElement('div');
    el.className = 'ep-card ' + (i === cur ? 'playing' : '');
    el.onclick = () => {
      if (i !== cur) {
        const u = new URL(location);
        u.searchParams.set('ep', i);
        u.searchParams.set('season', currentSeason);
        location.href = u;
      }
    };
    el.innerHTML = '<div class="relative">' +
      '<img class="ep-thumb" src="https://placehold.co/300x170/12121a/444444?text=EP+' + i + '" alt="EP' + i + '" loading="lazy">' +
      (i === cur ? '<div class="ep-badge">PLAYING</div>' : '') +
      (i < cur ? '<div class="ep-watched"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>' : '') +
      '</div><div class="ep-body"><div class="ep-num">EP ' + i + '</div><div class="ep-name">' + (titles[i-1] || 'Episode ' + i) + '</div></div>';
    list.appendChild(el);
  }
}

/* ===== NEXT UP ===== */
async function buildNextUp() {
  const c = document.getElementById('next-up-container');
  if (!c) return;
  try {
    const anime = (typeof fetchAnimeList === 'function') ? await fetchAnimeList('popular') : [];
    c.innerHTML = '';
    anime.slice(0, 6).forEach(item => {
      const card = document.createElement('div');
      card.className = 'anime-card card-tap';
      card.style.flexShrink = '0';
      card.style.width = '120px';
      card.onclick = () => location.href = './player.html?id=' + item.id + '&ep=1';
      const imgUrl = (typeof getImageUrl === 'function') ? getImageUrl(item.poster) : item.poster;
      card.innerHTML = '<div class="poster" style="border-radius:10px;overflow:hidden">' +
        '<img src="' + imgUrl + '" alt="' + item.title + '" loading="lazy" style="width:100%;aspect-ratio:3/4;object-fit:cover"></div>' +
        '<div class="title line-clamp-1" style="font-size:12px;margin-top:6px">' + item.title + '</div>';
      c.appendChild(card);
    });
  } catch(e) {
    c.innerHTML = '<div class="flex-shrink-0 w-28"><div class="skeleton w-full mb-2" style="aspect-ratio:3/4;border-radius:10px"></div><div class="skeleton-text w-20 h-3"></div></div>'.repeat(3);
  }
}

/* ===== COMMENTS ===== */
function buildComments() {
  const list = document.getElementById('comments-list');
  if (!list) return;
  const cmts = [
    { n:'AnimeKing', t:'This episode was absolutely insane! Fire', d:'2h ago', l:234 },
    { n:'SukunaFan', t:'MAPPA really outdid themselves with this fight.', d:'5h ago', l:189 },
    { n:'GojoSimp', t:'Gojo sensei is the GOAT no cap', d:'1d ago', l:567 },
    { n:'ItadoriY', t:'Manga readers know what is coming next Eyes', d:'1d ago', l:445 },
    { n:'MegumiL', t:'Domain expansion was beautiful.', d:'2d ago', l:312 },
  ];
  list.innerHTML = '';
  cmts.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'cmt-box fade-in';
    d.style.animationDelay = (i * 0.08) + 's';
    d.innerHTML = '<div class="flex gap-3">' +
      '<div class="cmt-avatar">' + c.n[0] + '</div>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2 mb-1"><span class="text-sm font-semibold">' + c.n + '</span><span class="text-[11px] text-white/30">' + c.d + '</span></div>' +
        '<p class="text-sm text-white/60 leading-relaxed">' + c.t + '</p>' +
        '<div class="flex items-center gap-3 mt-2">' +
          '<button class="text-[11px] text-white/30 hover:text-white transition-colors flex items-center gap-1" onclick="likeCmt(this)">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>' +
            '<span>' + c.l + '</span>' +
          '</button>' +
          '<button class="text-[11px] text-white/30 hover:text-white transition-colors">Reply</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    list.appendChild(d);
  });
}

function postCmt() {
  const inp = document.getElementById('cmt-input');
  if (!inp || !inp.value.trim()) return;
  const list = document.getElementById('comments-list');
  if (!list) return;
  const d = document.createElement('div');
  d.className = 'cmt-box fade-in';
  d.innerHTML = '<div class="flex gap-3">' +
    '<div class="cmt-avatar">U</div>' +
    '<div class="flex-1 min-w-0">' +
      '<div class="flex items-center gap-2 mb-1"><span class="text-sm font-semibold">You</span><span class="text-[11px] text-white/30">Just now</span></div>' +
      '<p class="text-sm text-white/60 leading-relaxed">' + inp.value + '</p>' +
      '<div class="flex items-center gap-3 mt-2">' +
        '<button class="text-[11px] text-white/30 hover:text-white transition-colors flex items-center gap-1" onclick="likeCmt(this)">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>' +
          '<span>0</span>' +
        '</button>' +
        '<button class="text-[11px] text-white/30 hover:text-white transition-colors">Reply</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  list.insertBefore(d, list.firstChild);
  inp.value = ''; inp.rows = 2;
  showToast('Comment posted!');
}

function likeCmt(btn) {
  const sp = btn.querySelector('span');
  const sv = btn.querySelector('svg');
  let v = parseInt(sp.textContent);
  const on = sv.getAttribute('fill') === 'var(--player-accent)';
  if (on) {
    v--; sv.setAttribute('fill','none'); sv.style.stroke = 'currentColor';
  } else {
    v++; sv.setAttribute('fill','var(--player-accent)'); sv.style.stroke = 'var(--player-accent)';
  }
  sp.textContent = v;
}

/* ===== RELATED ===== */
function buildRelated() {
  const g = document.getElementById('related-grid');
  if (!g) return;
  const data = [
    { t:'Chainsaw Man', s:'8.6', c:'ff6b35' }, { t:'Demon Slayer', s:'8.7', c:'b829dd' },
    { t:'Attack on Titan', s:'9.0', c:'00f0ff' }, { t:'My Hero Academia', s:'7.9', c:'39ff14' },
    { t:'Tokyo Revengers', s:'7.7', c:'ff2d95' }, { t:'Spy x Family', s:'8.5', c:'ffd700' },
  ];
  g.innerHTML = '';
  data.forEach((a, i) => {
    const card = document.createElement('div');
    card.className = 'rel-card fade-in';
    card.style.animationDelay = (i * 0.06) + 's';
    card.onclick = () => location.href = './player.html?id=' + (200+i) + '&ep=1';
    card.innerHTML = '<div class="relative">' +
      '<img src="https://placehold.co/200x300/12121a/' + a.c + '?text=' + encodeURIComponent(a.t.replace(/ /g,'+')) + '" alt="' + a.t + '" loading="lazy">' +
      '<div class="rel-score">&#9733; ' + a.s + '</div>' +
      '</div><div class="rel-info"><div class="rel-title">' + a.t + '</div><div class="rel-meta">TV &#8226; 2023</div></div>';
    g.appendChild(card);
  });
}

/* ===== ACTIONS ===== */
function toggleSave() {
  saved = !saved;
  const btn = document.getElementById('save-btn');
  const txt = document.getElementById('save-txt');
  if (!btn || !txt) return;
  if (saved) {
    btn.classList.add('save');
    txt.textContent = 'Saved';
    showToast('Added to Watchlist');
  } else {
    btn.classList.remove('save');
    txt.textContent = 'Bookmark';
    showToast('Removed from Watchlist');
  }
}

function shareIt() {
  if (navigator.share) {
    navigator.share({ title: document.title, url: location.href });
  } else {
    navigator.clipboard.writeText(location.href);
    showToast('Link copied!');
  }
}

function downloadIt() {
  showToast('Download started...');
}

function castIt() {
  showToast('Searching for devices...');
}

/* ===== TOAST ===== */
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ===== LEGACY COMPATIBILITY ===== */
function skipForward() { skipFwd(); }
function skipBackward() { skipBack(); }
function seekVideo(value) {
  if (!video) return;
  video.currentTime = (value / 100) * (video.duration || 1440);
}
function updateTimeDisplay() {
  const cur = document.getElementById('time-current');
  const tot = document.getElementById('time-total');
  if (cur) cur.textContent = fmtTime(video?.currentTime || 0);
  if (tot) tot.textContent = fmtTime(video?.duration || 1440);
}
function updateSeekBar() {
  const bar = document.getElementById('seek-bar');
  if (bar && video) bar.value = (video.currentTime / (video.duration || 1)) * 100;
  updateTimeDisplay();
}
function loadPlayerContent(animeId) {
  console.log('Loading player for anime:', animeId);
}
