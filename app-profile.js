// Profile Page Logic - IMPROVED (original UI preserved)

// Fallback if getContinueWatching is not defined in other files
if (typeof getContinueWatching !== 'function') {
  window.getContinueWatching = function() {
    try {
      const raw = localStorage.getItem('thrilling_continue');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  };
}

function haptic(pattern) {
  const enabled = localStorage.getItem('thrilling_haptic');
  if (enabled === 'false') return;
  if (navigator.vibrate) navigator.vibrate(pattern || 10);
}

function initProfile() {
  loadProfileStats();
}

function loadProfileStats() {
  const continueList = getContinueWatching();
  const totalWatched = continueList.length;
  const totalHours = continueList.reduce((acc, item) => acc + (item.progress || 0) * 0.24, 0);

  const watchedEl = document.getElementById('stat-watched');
  const hoursEl = document.getElementById('stat-hours');
  const streakEl = document.getElementById('stat-streak');

  if (watchedEl) watchedEl.dataset.target = totalWatched;
  if (hoursEl) hoursEl.dataset.target = Math.floor(totalHours);
  if (streakEl) streakEl.dataset.target = calculateStreak();
}

// NEW: IntersectionObserver - stats animate only when visible (no lag)
function setupStatsObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.target.dataset.animate === 'true') {
        const target = parseInt(entry.target.dataset.target || 0);
        const el = entry.target.querySelector('.value');
        if (el) {
          el.classList.remove('stat-skeleton');
          animateNumber(el, 0, target, 800);
        }
        entry.target.dataset.animate = 'done';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.stat-card[data-animate="true"]').forEach(card => {
    observer.observe(card);
  });
}

function animateNumber(element, start, end, duration) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (end - start) * easeOut);
    element.textContent = current;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function calculateStreak() {
  const list = getContinueWatching();
  if (list.length === 0) return 0;
  const days = new Set();
  list.forEach(item => {
    if (item.lastWatched) days.add(new Date(item.lastWatched).toDateString());
  });
  return days.size;
}

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

function getDateLabel(dateStr) {
  if (!dateStr) return 'Earlier';
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]}.${date.getDate()}`;
}

/* ============================================
   REAL WATCH HISTORY - Horizontal Cards
   ============================================ */

function renderWatchHistory() {
  const container = document.getElementById('watchHistoryContainer');
  if (!container) return;

  let historyData = getContinueWatching();

  historyData = historyData.map(item => ({
    id: item.id || item.animeId || 'unknown',
    title: item.title || 'Unknown Anime',
    poster: item.poster || item.thumbnail || item.image || '',
    progress: Math.min(100, Math.max(0, item.progress || 0)),
    episode: item.episode || 1,
    lastWatched: item.lastWatched || null
  })).sort((a, b) => {
    if (a.lastWatched && b.lastWatched) return new Date(b.lastWatched) - new Date(a.lastWatched);
    return 0;
  });

  const isEmpty = historyData.length === 0;
  if (isEmpty) historyData = getMockHistoryData();

  container.innerHTML = historyData.map(item => {
    const safeTitle = item.title.replace(/"/g, '&quot;');
    const posterUrl = item.poster || `https://placehold.co/304x171/1a1a2e/e5e7eb?text=${encodeURIComponent(item.title.substring(0,10))}`;

    return `
      <div class="wh-card ${isEmpty ? 'wh-demo' : ''}" onclick="haptic(); playAnime('${item.id}', ${item.episode || 1})">
        <div class="wh-thumb-wrap">
          <img src="${posterUrl}" alt="${safeTitle}" loading="lazy" decoding="async"
               onerror="this.src='https://placehold.co/304x171/1a1a2e/e5e7eb?text=Anime'">
          <div class="wh-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
              <polyline points="17 2 12 7 7 2"/>
            </svg>
          </div>
          <div class="wh-progress-track">
            <div class="wh-progress-fill" style="width: ${item.progress}%"></div>
          </div>
        </div>
        <span class="wh-title">${safeTitle}</span>
      </div>
    `;
  }).join('');

  if (isEmpty) {
    container.innerHTML += `
      <div class="wh-empty" style="display:none;" id="wh-empty-hint">
        <div class="wh-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
        <p>Start watching to build history</p>
      </div>
    `;
  }
}

function getMockHistoryData() {
  return [
    { id:'9479', title:'Alice in Borderland', poster:'https://image.tmdb.org/t/p/w300/qB6LZXsXWvkVvz2jvOkwDTI7n4D.jpg', progress:65, episode:3 },
    { id:'129600', title:'Matka King', poster:'https://image.tmdb.org/t/p/w300/placeholder.jpg', progress:30, episode:1 },
    { id:'220132', title:'Wistoria: Wand and Sword', poster:'https://image.tmdb.org/t/p/w300/8Wirh4exfOQtDbZCyQJ8kAG6RNB.jpg', progress:80, episode:5 },
    { id:'1429', title:'Demon Slayer', poster:'https://image.tmdb.org/t/p/w300/xUfRZu2mi8jHyXNqTNyBUIKR5Sb.jpg', progress:45, episode:12 },
    { id:'80725', title:'Jujutsu Kaisen', poster:'https://image.tmdb.org/t/p/w300/fHpKWq0pT9T1g1qLT9R4Cv6J0p1.jpg', progress:10, episode:2 }
  ];
}

function recordWatch(animeId, title, poster, episode, progressPercent, isHindiDub) {
  if (!animeId || !title) return;

  const key = 'thrilling_continue';
  let history = [];
  try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}

  history = history.filter(h => !(h.id == animeId && h.episode == episode));

  history.unshift({
    id: animeId,
    title: title,
    poster: poster || '',
    episode: episode || 1,
    progress: Math.min(100, Math.max(0, progressPercent || 0)),
    lastWatched: new Date().toISOString(),
    hindi_dubbed: !!isHindiDub
  });

  if (history.length > 50) history = history.slice(0, 50);

  localStorage.setItem(key, JSON.stringify(history));

  if (document.getElementById('profile-page')) {
    renderWatchHistory();
    loadProfileStats();
  }
}

function navigateToHistory() {
  haptic();
  window.location.href = 'history.html';
}

function playAnime(id, episode) {
  haptic();
  if (!id || id === 'unknown') {
    showToast('Anime ID missing');
    return;
  }
  window.location.href = `./player.html?id=${id}${episode ? '&ep='+episode : ''}`;
}

/* ============================================
   OLD COMPACT LIST (for history.html etc)
   ============================================ */

function loadWatchHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const list = getContinueWatching().slice(0, 5);
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box fade-in">
        <div class="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white/30">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <p class="text-sm font-medium text-white/60">No watch history yet</p>
        <p class="text-xs text-white/30">Start watching anime to see here</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  list.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'history-card fade-in-up';
    div.style.animationDelay = `${idx * 0.06}s`;
    div.onclick = () => { haptic(); window.location.href = `./player.html?id=${item.id}&ep=${item.episode || 1}`; };

    const progress = item.progress || 0;
    const hindiBadge = item.hindi_dubbed 
      ? '<span class="history-badge hindi">Hindi Dub</span>' 
      : '<span class="history-badge sub">Sub</span>';

    div.innerHTML = `
      <img src="${getImageUrl(item.poster, 'w200')}" alt="${item.title}" class="history-thumb" loading="lazy" onerror="this.src='https://placehold.co/64x90/12121A/333333?text=Anime'">
      <div class="history-info">
        <div class="history-title">${item.title}</div>
        <div class="history-meta">
          <span>Episode ${item.episode || 1}</span>
          <span class="history-meta-dot"></span>
          <span>${progress}% watched</span>
        </div>
        <div class="history-progress-bar">
          <div class="history-progress-fill" style="width: ${progress}%"></div>
        </div>
        ${hindiBadge}
      </div>
    `;
    container.appendChild(div);
  });
}

function loadFullWatchHistory() {
  const container = document.getElementById('history-full-list');
  if (!container) return;

  const list = getContinueWatching();
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box fade-in">
        <div class="empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white/30">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <p class="text-sm font-medium text-white/60">No watch history yet</p>
        <p class="text-xs text-white/30">Start watching anime to see here</p>
      </div>
    `;
    return;
  }

  const groups = {};
  list.forEach(item => {
    const label = getDateLabel(item.lastWatched);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });

  const order = ['Today', 'Yesterday'];
  const otherKeys = Object.keys(groups).filter(k => !order.includes(k));
  const sortedKeys = [...order.filter(k => groups[k]), ...otherKeys];

  container.innerHTML = '';
  sortedKeys.forEach((groupLabel, groupIdx) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'history-date-group fade-in-up';
    groupDiv.style.animationDelay = `${groupIdx * 0.1}s`;

    let itemsHtml = groups[groupLabel].map((item, idx) => {
      const progress = item.progress || 0;
      const duration = item.duration || 0;
      const titleDisplay = item.hindi_dubbed ? `${item.title} [Hindi]` : item.title;

      return `
        <div class="history-landscape-card fade-in-up" style="animation-delay: ${idx * 0.05}s" 
             onclick="haptic(); window.location.href='./player.html?id=${item.id}&ep=${item.episode || 1}'">
          <div class="history-landscape-thumb-wrap">
            <img src="${getImageUrl(item.poster, 'w300')}" alt="${item.title}" class="history-landscape-thumb" 
                 loading="lazy" onerror="this.src='https://placehold.co/300x170/12121A/333333?text=Anime'">
            ${item.hindi_dubbed ? '<div class="history-landscape-hindi-tag"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg></div>' : ''}
            <div class="history-landscape-duration">${formatDuration(duration)}</div>
            <div class="history-landscape-progress" style="width: ${progress}%"></div>
          </div>
          <div class="history-landscape-info">
            <div class="history-landscape-title">${titleDisplay}</div>
            <div class="history-landscape-episode">S01 E${(item.episode || 1).toString().padStart(2, '0')}</div>
            <div class="history-landscape-watched">${progress}% watched</div>
          </div>
          <div class="history-landscape-actions">
            <button class="history-landscape-menu" onclick="event.stopPropagation(); haptic(); showToast('More options coming soon')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            <button class="history-landscape-play" onclick="event.stopPropagation(); haptic(); window.location.href='./player.html?id=${item.id}&ep=${item.episode || 1}'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    groupDiv.innerHTML = `
      <div class="history-date-label">${groupLabel}</div>
      <div class="history-date-items">${itemsHtml}</div>
    `;
    container.appendChild(groupDiv);
  });
}

function clearHistory() {
  haptic(20);
  if (confirm('Clear all watch history? This cannot be undone.')) {
    haptic(30);
    localStorage.removeItem('thrilling_continue');
    loadWatchHistory();
    loadProfileStats();
    renderWatchHistory();
    showToast('History cleared');
  }
}

function logout() {
  haptic(20);
  if (confirm('Are you sure you want to sign out?')) {
    haptic(30);
    const settings = {
      lang: localStorage.getItem('thrilling_lang'),
      quality: localStorage.getItem('thrilling_quality'),
      autoplay: localStorage.getItem('thrilling_autoplay'),
      notifications: localStorage.getItem('thrilling_notifications'),
      skip_intro: localStorage.getItem('thrilling_skip_intro'),
      theme: localStorage.getItem('thrilling_theme'),
      tab_labels: localStorage.getItem('thrilling_tab_labels'),
      auto_check: localStorage.getItem('thrilling_auto_check'),
      auto_download: localStorage.getItem('thrilling_auto_download')
    };
    localStorage.clear();
    Object.entries(settings).forEach(([key, val]) => {
      if (val) localStorage.setItem(`thrilling_${key}`, val);
    });
    window.location.href = './login.html';
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('profile-page')) {
    initProfile();

    setTimeout(() => {
      renderWatchHistory();
      setupStatsObserver();
      const nameEl = document.getElementById('user-name');
      const emailEl = document.getElementById('user-email');
      if (nameEl) nameEl.classList.remove('name-skeleton');
      if (emailEl) emailEl.classList.remove('email-skeleton');
    }, 300);
  }
  if (document.getElementById('history-full-page')) {
    loadFullWatchHistory();
  }
});