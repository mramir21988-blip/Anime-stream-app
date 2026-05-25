const App = {
  currentUser: null,
  data: { series: [] },
  // ... baaki sab
};

// Core App Utilities & Navigation

// Show toast notification (ENHANCED for player)
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  // Check if player-style toast (has toast-msg child)
  let msgEl = document.getElementById('toast-msg');
  if (msgEl) {
    msgEl.textContent = message;
  } else {
    toast.textContent = message;
  }

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Legacy alias for player compatibility
function toast(msg) {
  showToast(msg);
}

// Active nav item handler
function setNavActive(element) {
  if (!element) return;
  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => {
    el.classList.remove('active');
    const span = el.querySelector('span');
    const svg = el.querySelector('svg');
    if (span) {
      span.classList.remove('text-accent');
      span.classList.add('text-white/40');
    }
    if (svg) {
      svg.classList.remove('text-accent');
      svg.classList.add('text-white/40');
    }
  });
  element.classList.add('active');
  const span = element.querySelector('span');
  const svg = element.querySelector('svg');
  if (span) {
    span.classList.remove('text-white/40');
    span.classList.add('text-accent');
  }
  if (svg) {
    svg.classList.remove('text-white/40');
    svg.classList.add('text-accent');
  }
}

// Highlight current page in nav - FIXED: uses data-page attributes (reliable everywhere)
function highlightCurrentNav() {
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '') || 'home';
  const navMap = {
    'home': 'home',
    'index': 'home',
    'search': 'search',
    'categories': 'categories',
    'category-view': 'categories',
    'profile': 'profile'
  };
  const targetPage = navMap[page];
  if (!targetPage) return;

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.classList.remove('active');
    const span = item.querySelector('span');
    const svg = item.querySelector('svg');
    if (span) span.classList.remove('text-accent');
    if (svg) svg.classList.remove('text-accent');
  });

  const target = document.querySelector(`.bottom-nav .nav-item[data-page="${targetPage}"]`);
  if (target) {
    target.classList.add('active');
    const span = target.querySelector('span');
    const svg = target.querySelector('svg');
    if (span) span.classList.add('text-accent');
    if (svg) svg.classList.add('text-accent');
  }
}

// Navigate to page - FIXED: uses PageTransitions if available (no lag)
function goToPage(pageName) {
  // Use smooth transitions if available
  if (window.PageTransitions && window.PageTransitions.go) {
    window.PageTransitions.go(`./${pageName}.html`);
    return;
  }
  // Fallback: direct navigation
  window.location.href = `./${pageName}.html`;
}

// Player Modal Functions
function openPlayerModal(animeId = null) {
  const modal = document.getElementById('player-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (animeId) loadPlayerContent(animeId);
  }
}

function closePlayerModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('player-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closePlayerModalDirect() {
  const modal = document.getElementById('player-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Language selection
let currentLanguage = localStorage.getItem('thrilling_lang') || 'all';

function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('thrilling_lang', lang);

  // Update UI
  document.querySelectorAll('#lang-pills .pill-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`pill-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

  showToast(`Language: ${lang.toUpperCase()}`);

  // Refresh sections if on home
  if (typeof refreshHomeSections === 'function') {
    refreshHomeSections();
  }
}

// Init language pills
function initLanguagePills() {
  const saved = localStorage.getItem('thrilling_lang') || 'all';
  const btn = document.getElementById(`pill-${saved}`);
  if (btn) btn.classList.add('active');
}

// Storage helpers
const Storage = {
  get(key, def = null) {
    try {
      const val = localStorage.getItem(`thrilling_${key}`);
      return val ? JSON.parse(val) : def;
    } catch { return def; }
  },
  set(key, val) {
    localStorage.setItem(`thrilling_${key}`, JSON.stringify(val));
  },
  remove(key) {
    localStorage.removeItem(`thrilling_${key}`);
  }
};

// Format time
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Debounce
function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Throttle for scroll performance
function throttle(fn, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Ripple effect for buttons
function createRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
  circle.classList.add('ripple-effect');

  const existing = btn.querySelector('.ripple-effect');
  if (existing) existing.remove();

  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

// Preload adjacent pages for faster navigation
function preloadAdjacentPages() {
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'home';
  const adjacentMap = {
    'home': ['search', 'categories'],
    'search': ['home', 'categories'],
    'categories': ['search', 'profile'],
    'profile': ['categories', 'home']
  };

  const pages = adjacentMap[currentPage] || [];
  pages.forEach(page => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `./${page}.html`;
    document.head.appendChild(link);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  highlightCurrentNav();
  initLanguagePills();
  preloadAdjacentPages();

  // Add ripple to buttons and nav items
  document.querySelectorAll('button, .nav-item, .settings-item').forEach(btn => {
    btn.addEventListener('click', createRipple);
  });
});

// Passive scroll listener for performance
window.addEventListener('scroll', throttle(() => {
  // Any scroll-based logic here
}, 100), { passive: true });
