// Home Page Logic — ENDLESS FEED VERSION
// Performance: IntersectionObserver, rAF, transform-only, no layout thrashing

let heroSlides = [];
let currentHero = 0;
let heroInterval;
let touchStartX = 0;
const HERO_AUTO_ROTATE_INTERVAL = 5000;

// Endless scroll state
let sectionQueue = [];
let isLoadingSections = false;
let loadedSectionTypes = new Set();

// Scroll state
let lastScrollY = 0;
let scrollTicking = false;
let cardObserver;

// Init guard
let homeInitialized = false;

// ===== POPULAR GENRES — NO EMOJI =====
const POPULAR_GENRES = [
  { id: 'action', name: 'Action', color: '#FF4D4D', filter: 'action' },
  { id: 'adventure', name: 'Adventure', color: '#FF9933', filter: 'adventure' },
  { id: 'fantasy', name: 'Fantasy', color: '#B829DD', filter: 'fantasy' },
  { id: 'slice_of_life', name: 'Slice of Life', color: '#66CCFF', filter: 'slice_of_life' },
  { id: 'harem', name: 'Harem', color: '#FF1493', filter: 'harem' },
  { id: 'dark_fantasy', name: 'Dark Fantasy', color: '#8B0000', filter: 'dark_fantasy' },
  { id: 'sports', name: 'Sports', color: '#00CC66', filter: 'sports' },
  { id: 'mystery', name: 'Mystery', color: '#9966CC', filter: 'mystery' },
  { id: 'romance', name: 'Romance', color: '#FF66B2', filter: 'romance' },
  { id: 'isekai', name: 'Isekai', color: '#9966FF', filter: 'isekai' },
  { id: 'hentai', name: 'Hentai', color: '#FF0000', filter: 'hentai' }
];

// ===== ANIME SECTIONS (NO EMOJI BADGES) =====
const SECTION_DEFINITIONS = [
  { id: 'hindi', title: 'Hindi Dubbed', subtitle: 'Popular in India', filter: 'hindi', badge: 'DUB' },
  { id: 'new', title: 'New Episodes', subtitle: 'Just Released', filter: 'new' },
  { id: 'top', title: 'Top Rated', subtitle: 'Highest Rated', filter: 'top' },
  { id: 'movies', title: 'Anime Movies', subtitle: 'Theatrical Hits', filter: 'movies', badge: 'MOVIE' },
  { id: 'action', title: 'Action & Battle', subtitle: 'Most Popular Genre', filter: 'action', badge: 'ACTION' },
  { id: 'fantasy', title: 'Fantasy & Adventure', subtitle: 'Epic Worlds', filter: 'fantasy', badge: 'FANTASY' },
  { id: 'slice_of_life', title: 'Slice of Life', subtitle: 'Heartwarming Stories', filter: 'slice_of_life' },
  { id: 'comedy', title: 'Comedy & Gag', subtitle: 'Laugh Out Loud', filter: 'comedy' },
  { id: 'dark_fantasy', title: 'Dark Fantasy', subtitle: 'Grim & Intense', filter: 'dark_fantasy', badge: 'DARK' },
  { id: 'sports', title: 'Sports', subtitle: 'Competitive Spirit', filter: 'sports', badge: 'SPORTS' },
  { id: 'mystery', title: 'Mystery & Thriller', subtitle: 'Mind Games', filter: 'mystery' },
  { id: 'romance', title: 'Romance', subtitle: 'Love Stories', filter: 'romance' },
  { id: 'isekai', title: 'Isekai', subtitle: 'Another World', filter: 'isekai', badge: 'ISEKAI' },
  { id: 'hentai', title: 'Hentai', subtitle: 'NSFW Content', filter: 'hentai_jikan', badge: 'NSFW' },
];

// Initialize Home Page
async function initHome() {
  if (homeInitialized) return;
  homeInitialized = true;

  initScrollBehavior();
  initCardObserver();
  initEndlessScroll();
  await loadHero();
  await loadPopularGenres();
  await loadInitialSections();
  startHeroAutoRotate();
  initHeroSwipe();
}



// ===== POPULAR GENRES SECTION =====
async function loadPopularGenres() {
  const container = document.getElementById('sections-container');
  if (!container) return;

  const section = document.createElement('section');
  section.className = 'section-row';
  section.id = 'section-popular-genres';
  section.innerHTML = `
    <div class="section-header">
      <div class="section-title-wrap">
        <h3 class="section-title">Popular Genres</h3>
        <span class="section-subtitle">Top 10 in 2026</span>
      </div>
    </div>
    <div class="genre-chips-scroll" id="genre-chips-container"></div>
  `;

  container.insertBefore(section, container.firstChild);

  const chipsContainer = document.getElementById('genre-chips-container');

  // Inject styles once
  if (!document.getElementById('genre-chip-styles')) {
    const style = document.createElement('style');
    style.id = 'genre-chip-styles';
    style.textContent = `
      .genre-chips-scroll {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding: 0 16px;
        scrollbar-width: none;
      }
      .genre-chips-scroll::-webkit-scrollbar { display: none; }
      .genre-chip {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 12px;
        background: var(--bg-card);
        border: 1px solid var(--border-card);
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
        backdrop-filter: blur(10px);
      }
      .genre-chip:hover, .genre-chip:active {
        transform: translateY(-2px) scale(1.02);
        border-color: var(--accent);
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      }
      .genre-chip .chip-icon {
        font-size: 16px;
        filter: drop-shadow(0 0 4px rgba(255,255,255,0.2));
      }
    `;
    document.head.appendChild(style);
  }

  POPULAR_GENRES.forEach(genre => {
    const chip = document.createElement('button');
    chip.className = 'genre-chip card-tap';
    chip.style.borderLeft = `3px solid ${genre.color}`;
    chip.textContent = genre.name;
    chip.onclick = () => goToCategory(genre.filter, genre.name);
    chipsContainer.appendChild(chip);
  });
}

// ===== HEADER / BOTTOM NAV SCROLL =====
function initScrollBehavior() {
  const header = document.getElementById('app-header');
  const bottomNav = document.getElementById('bottom-nav');
  if (!header || !bottomNav) return;

  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const diff = currentY - lastScrollY;

        if (header) {
          if (currentY > 50) header.classList.add('scrolled');
          else header.classList.remove('scrolled');
        }

        if (diff > 8 && currentY > 100) {
          header.classList.add('hidden');
          bottomNav.classList.add('hidden');
        } else if (diff < -5 || currentY < 100) {
          header.classList.remove('hidden');
          bottomNav.classList.remove('hidden');
        }

        lastScrollY = currentY;
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });
}

// ===== CARD OBSERVER =====
function initCardObserver() {
  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px 20px 0px' });
}

// ===== ENDLESS SCROLL =====
function initEndlessScroll() {
  const loader = document.getElementById('endless-loader');
  if (!loader) return;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoadingSections) {
      loadNextSection();
    }
  }, { rootMargin: '300px 0px' });

  observer.observe(loader);
}

// ===== HERO - 10 SLIDES =====
async function loadHero() {
  const container = document.getElementById('hero-container');
  const dotsEl = document.getElementById('hero-dots');
  if (!container) return;

  try {
    const anime = await fetchTrending();
    heroSlides = anime.slice(0, 10);

    container.innerHTML = '';
    dotsEl.innerHTML = '';

    heroSlides.forEach((item, idx) => {
      const slide = document.createElement('div');
      slide.className = `hero-slide ${idx === 0 ? 'active' : ''}`;
      slide.innerHTML = `
        <img src="${getBackdropUrl(item.backdrop, 'w1280')}" alt="${item.title}" loading="${idx === 0 ? 'eager' : 'lazy'}" decoding="async">
      `;
      container.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = `hero-dot ${idx === 0 ? 'active' : ''}`;
      dot.onclick = () => {
        stopHeroAutoRotate();
        setHeroSlide(idx);
        startHeroAutoRotate();
      };
      dotsEl.appendChild(dot);
    });

    updateHeroInfo(0);
  } catch (e) {
    console.error('Hero load failed:', e);
    const titleEl = document.getElementById('hero-title');
    const descEl = document.getElementById('hero-desc');
    const genreEl = document.getElementById('hero-genre');
    if (titleEl) titleEl.textContent = 'Unable to Load';
    if (descEl) descEl.textContent = 'Please check your connection and try again.';
    if (genreEl) genreEl.textContent = 'Error';
  }
}

function updateHeroInfo(idx) {
  const item = heroSlides[idx];
  if (!item) return;
  const titleEl = document.getElementById('hero-title');
  const descEl = document.getElementById('hero-desc');
  const genreEl = document.getElementById('hero-genre');

  if (titleEl) titleEl.textContent = item.title;
  if (descEl) descEl.textContent = item.overview || 'No description available.';
  if (genreEl) {
    if (item.hindi_dubbed) {
      genreEl.innerHTML = `${item.genre} <span style="margin-left:6px;padding:2px 6px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:9px;">HINDI DUB</span>`;
    } else {
      genreEl.textContent = item.genre;
    }
  }
}

function setHeroSlide(idx) {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');

  slides.forEach((s, i) => s.classList.toggle('active', i === idx));
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  currentHero = idx;
  updateHeroInfo(idx);
}

function nextHeroSlide() {
  if (heroSlides.length === 0) return;
  setHeroSlide((currentHero + 1) % heroSlides.length);
}

function prevHeroSlide() {
  if (heroSlides.length === 0) return;
  setHeroSlide((currentHero - 1 + heroSlides.length) % heroSlides.length);
}

function startHeroAutoRotate() {
  stopHeroAutoRotate();
  heroInterval = setInterval(nextHeroSlide, HERO_AUTO_ROTATE_INTERVAL);
}

function stopHeroAutoRotate() {
  clearInterval(heroInterval);
}

function resetHeroAutoRotate() {
  stopHeroAutoRotate();
  startHeroAutoRotate();
}

function initHeroSwipe() {
  const heroSection = document.getElementById('hero-section');
  if (!heroSection) return;

  heroSection.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopHeroAutoRotate();
  }, { passive: true });

  heroSection.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 50) diff > 0 ? nextHeroSlide() : prevHeroSlide();
    resetHeroAutoRotate();
  }, { passive: true });

  let isDragging = false, mouseStartX = 0;
  heroSection.addEventListener('mousedown', (e) => {
    isDragging = true;
    mouseStartX = e.screenX;
    stopHeroAutoRotate();
    heroSection.style.cursor = 'grabbing';
  });
  heroSection.addEventListener('mouseup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    heroSection.style.cursor = '';
    const diff = mouseStartX - e.screenX;
    if (Math.abs(diff) > 50) diff > 0 ? nextHeroSlide() : prevHeroSlide();
    resetHeroAutoRotate();
  });
  heroSection.addEventListener('mouseleave', () => {
    if (isDragging) { isDragging = false; heroSection.style.cursor = ''; resetHeroAutoRotate(); }
  });
}

// ===== WATCH CURRENT HERO =====
function watchCurrentHero() {
  const item = heroSlides[currentHero];
  if (!item) return;
  addToContinueWatching({ id: item.id, title: item.title, poster: item.poster, episode: 1, progress: 0 });
  window.location.href = `./player.html?id=${item.id}`;
}

// ===== INITIAL SECTIONS =====
async function loadInitialSections() {
  const container = document.getElementById('sections-container');
  if (!container) return;

  for (let i = 0; i < 3 && i < SECTION_DEFINITIONS.length; i++) {
    const def = SECTION_DEFINITIONS[i];
    loadedSectionTypes.add(def.id);
    const sectionEl = createSectionSkeleton(def);
    container.appendChild(sectionEl);
    await loadSectionData(def, sectionEl);
  }

  for (let i = 3; i < SECTION_DEFINITIONS.length; i++) {
    sectionQueue.push(SECTION_DEFINITIONS[i]);
  }
}

// ===== LOAD NEXT SECTION (ENDLESS) =====
async function loadNextSection() {
  if (isLoadingSections || sectionQueue.length === 0) return;
  isLoadingSections = true;

  const loader = document.getElementById('endless-loader');
  loader?.classList.add('visible');

  const batchSize = 2;
  const toLoad = sectionQueue.splice(0, batchSize);

  for (const def of toLoad) {
    loadedSectionTypes.add(def.id);
    const container = document.getElementById('sections-container');
    const sectionEl = createSectionSkeleton(def);
    container.appendChild(sectionEl);
    await loadSectionData(def, sectionEl);
  }

  if (sectionQueue.length === 0) {
    loader?.classList.remove('visible');
    loader.style.display = 'none';
  } else {
    loader?.classList.remove('visible');
  }

  isLoadingSections = false;
}

// ===== CREATE SECTION SKELETON =====
function createSectionSkeleton(def) {
  const section = document.createElement('section');
  section.className = 'section-row';
  section.id = `section-${def.id}`;

  const subtitleHtml = def.subtitle ? `<span class="section-subtitle">${def.subtitle}</span>` : '';
  const badgeHtml = def.badge ? `<span class="badge-hindi" style="margin-left:6px;font-size:9px;padding:2px 6px;">${def.badge}</span>` : '';

  section.innerHTML = `
    <div class="section-header">
      <div class="section-title-wrap">
        <h3 class="section-title">${def.title}</h3>
        ${badgeHtml}
        ${subtitleHtml}
      </div>
      <button class="see-all-btn" onclick="goToCategory('${def.filter}', '${def.title}')">
        See all
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>
    </div>
    <div class="cards-scroll" id="container-${def.id}">
      ${createSkeletonCards(4)}
    </div>
  `;
  return section;
}

function createSkeletonCards(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="anime-card card-entrance">
        <div class="skeleton w-full mb-2" style="aspect-ratio: 3/4;"></div>
        <div class="skeleton-text w-20 h-2.5 mb-1"></div>
        <div class="skeleton-text w-12 h-2"></div>
      </div>
    `;
  }
  return html;
}

// ===== RETRY SECTION =====
async function retrySection(sectionId) {
  const def = SECTION_DEFINITIONS.find(d => d.id === sectionId);
  if (!def) return;
  const container = document.getElementById(`container-${sectionId}`);
  if (!container) return;
  container.innerHTML = createSkeletonCards(4);
  const sectionEl = document.getElementById(`section-${sectionId}`);
  await loadSectionData(def, sectionEl);
}

// ===== LOAD SECTION DATA =====
async function loadSectionData(def, sectionEl) {
  const container = document.getElementById(`container-${def.id}`);
  if (!container) return;

  try {
    let anime = [];
    switch (def.filter) {
      case 'hindi': anime = await fetchHindiDubbed(); break;
      case 'new': anime = await fetchNewEpisodes(); break;
      case 'top': anime = await fetchTopRated(); break;
      case 'movies': anime = await AnimeAPI.fetchAnimeMovies(); break;
      case 'action': anime = await AnimeAPI.fetchByGenre('Action'); break;
      case 'adventure': anime = await AnimeAPI.fetchByGenre('Adventure'); break;
      case 'fantasy': anime = await AnimeAPI.fetchByGenre('Fantasy'); break;
      case 'slice_of_life': anime = await AnimeAPI.fetchByGenre('Slice of Life'); break;
      case 'comedy': anime = await AnimeAPI.fetchByGenre('Comedy'); break;
      case 'dark_fantasy': anime = await AnimeAPI.fetchByGenre('Horror'); break;
      case 'sports': anime = await AnimeAPI.fetchByGenre('Sports'); break;
      case 'mystery': anime = await AnimeAPI.fetchByGenre('Mystery'); break;
      case 'romance': anime = await AnimeAPI.fetchByGenre('Romance'); break;
      case 'isekai': anime = await AnimeAPI.fetchByGenre('Isekai'); break;
      case 'hentai_jikan': anime = await AnimeAPI.fetchHentai(); break;
      default: anime = await fetchTrending();
    }

    if (!Array.isArray(anime)) anime = [];

    if (anime.length === 0) {
      container.innerHTML = `<div style="padding:24px 16px;text-align:center;color:rgba(255,255,255,0.35);font-size:12px;font-weight:500;">No anime found</div>`;
      return;
    }

    // Shuffle for variety except curated lists
    if (!['hindi', 'new', 'top', 'hentai_jikan'].includes(def.filter)) {
      anime = anime.sort(() => Math.random() - 0.5);
    }

    renderCards(container, anime.slice(0, 12), def.id === 'hindi', def.id === 'hindi');
  } catch (e) {
    console.error(`Section ${def.id} failed:`, e);
    container.innerHTML = `
      <div style="padding:24px 16px;text-align:center;">
        <div style="color:rgba(255,255,255,0.35);font-size:12px;font-weight:500;margin-bottom:10px;">Failed to load content</div>
        <button onclick="retrySection('${def.id}')" style="padding:8px 18px;background:var(--accent);color:black;border:none;border-radius:var(--radius-md);font-size:12px;font-weight:700;cursor:pointer;transition:opacity 0.2s;">Retry</button>
      </div>
    `;
  }
}

// ===== RENDER CARDS =====
function renderCards(container, animeList, showHindiBadge = false, isHindiSection = false) {
  container.innerHTML = '';
  if (!animeList || animeList.length === 0) {
    container.innerHTML = `<div style="padding:24px 16px;text-align:center;color:rgba(255,255,255,0.35);font-size:12px;font-weight:500;">No anime found</div>`;
    return;
  }
  animeList.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'anime-card card-entrance';
    card.style.transitionDelay = `${idx * 0.04}s`;

    card.onclick = () => {
      addToContinueWatching({ id: item.id, title: item.title, poster: item.poster, episode: 1, progress: 0 });
      window.location.href = `./player.html?id=${item.id}`;
    };

    const hindiBadge = (showHindiBadge && item.hindi_dubbed) ? '<span class="hindi-badge">HINDI</span>' : '';
    const glowStyle = (isHindiSection && item.hindi_dubbed) ? 'style="box-shadow: 0 0 15px rgba(255,102,0,0.15); border: 1px solid rgba(255,102,0,0.2);"' : '';

    card.innerHTML = `
      <div class="poster" ${glowStyle}>
        <img src="${getImageUrl(item.poster)}" alt="${item.title}" loading="lazy" decoding="async">
        ${hindiBadge}
        <div class="rating-badge">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${item.rating}
        </div>
      </div>
      <div class="title">${item.title}</div>
      <div class="meta">${item.year} · ${item.genre}</div>
    `;
    container.appendChild(card);
    cardObserver.observe(card);
  });
}

// ===== NAVIGATE TO CATEGORY =====
function goToCategory(filter, title) {
  const specialTypes = ['movies', 'cartoons', 'hindi', 'new', 'top'];
  const genreTypes = ['action','adventure','fantasy','slice_of_life','comedy','dark_fantasy','sports','mystery','romance','isekai','shounen','seinen','mecha','psychological','supernatural','magic','horror','harem','hentai','ecchi','yaoi','yuri'];

  if (specialTypes.includes(filter)) {
    window.location.href = `./category-view.html?type=${filter}&title=${encodeURIComponent(title)}`;
  } else if (genreTypes.includes(filter)) {
    window.location.href = `./category-view.html?type=genre&genre=${filter}&title=${encodeURIComponent(title)}`;
  } else {
    window.location.href = `./category-view.html?type=${filter}&title=${encodeURIComponent(title)}`;
  }
}

// ===== CLEANUP =====
function cleanupHome() {
  stopHeroAutoRotate();
  if (cardObserver) cardObserver.disconnect();
}
window.addEventListener('beforeunload', cleanupHome);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('hero-container')) {
    initHome();
  }
});
