/**
 * THRILLING ANIME - Category System v2 (AnimeAPI Compatible)
 * Uses AnimeAPI (Jikan + AniList) instead of raw TMDB
 */

const CategorySystem = (() => {
  'use strict';

  const CONFIG = {
    VIRTUAL_ROOT_MARGIN: '120px',
    PREFETCH_DISTANCE: 200,
    CACHE_TTL: 1000 * 60 * 10,
    DEBOUNCE_MS: 250,
    PULL_THRESHOLD: 80,
    SWIPE_THRESHOLD: 60,
    RETRY_BASE_MS: 1000,
    MAX_RETRIES: 3,
    BATCH_SIZE: 12
  };

  let state = {
    currentType: 'trending',
    currentGenre: '',
    currentSort: 'popularity',
    currentPage: 1,
    isLoading: false,
    hasMore: true,
    allItems: [],
    renderedCount: 0,
    searchQuery: '',
    retryCount: 0,
    cacheKey: null
  };

  const Cache = {
    get(key) {
      try {
        const raw = localStorage.getItem('cat_cache_' + key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CONFIG.CACHE_TTL) {
          localStorage.removeItem('cat_cache_' + key);
          return null;
        }
        return data;
      } catch (e) { return null; }
    },
    set(key, data) {
      try {
        localStorage.setItem('cat_cache_' + key, JSON.stringify({ data, ts: Date.now() }));
      } catch (e) {
        Cache.clearOld();
        try {
          localStorage.setItem('cat_cache_' + key, JSON.stringify({ data, ts: Date.now() }));
        } catch (e2) {}
      }
    },
    clearOld() {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cat_cache_'));
      if (keys.length > 50) {
        keys.sort();
        keys.slice(0, 20).forEach(k => localStorage.removeItem(k));
      }
    },
    invalidate(type, genre) {
      const prefix = 'cat_cache_' + type + '_' + (genre || 'all') + '_';
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(prefix)) localStorage.removeItem(k);
      });
    }
  };

  const VirtualGrid = {
    observer: null,
    gridEl: null,
    init(gridSelector) {
      this.gridEl = document.querySelector(gridSelector);
      if (!this.gridEl) return;
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const card = entry.target;
          if (entry.isIntersecting) {
            card.classList.add('visible');
            const img = card.querySelector('img[data-src]');
            if (img) ImageLoader.load(img, img.dataset.src);
          }
        });
      }, { root: null, rootMargin: CONFIG.VIRTUAL_ROOT_MARGIN, threshold: 0.01 });
    },
    observe(card) { if (this.observer && card) this.observer.observe(card); },
    disconnect() { if (this.observer) this.observer.disconnect(); }
  };

  const ImageLoader = {
    load(img, src) {
      if (!img || !src) return;
      if (img.src === src) { img.classList.add('loaded'); return; }
      const temp = new Image();
      temp.decoding = 'async';
      temp.onload = () => {
        img.src = src;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
      };
      temp.onerror = () => {
        img.style.filter = 'none';
        img.style.opacity = '0.4';
      };
      temp.src = src;
    }
  };

  const PullToRefresh = {
    init(containerSelector, onRefresh) {
      const container = document.querySelector(containerSelector);
      const hint = document.getElementById('pull-hint');
      const hintText = document.getElementById('pull-text');
      if (!container) return;
      let startY = 0, pulling = false, atTop = false;

      container.addEventListener('touchstart', (e) => {
        atTop = window.scrollY <= 5;
        if (!atTop) return;
        startY = e.touches[0].clientY;
        pulling = true;
      }, { passive: true });

      container.addEventListener('touchmove', (e) => {
        if (!pulling || !atTop) return;
        const diff = e.touches[0].clientY - startY;
        if (diff > 0 && diff < 200) {
          if (diff > 10) e.preventDefault();
          container.style.transform = 'translateY(' + (diff * 0.35) + 'px)';
          if (hint) {
            hint.classList.add('visible');
            hint.style.opacity = Math.min(diff / 60, 1);
          }
        }
      }, { passive: false });

      container.addEventListener('touchend', () => {
        if (!pulling) return;
        const ev = window.event;
        const diff = (ev && ev.changedTouches) ? ev.changedTouches[0].clientY - startY : 0;
        container.style.transition = 'transform 0.3s ease';
        container.style.transform = 'translateY(0)';
        setTimeout(() => { container.style.transition = ''; }, 300);

        if (diff > CONFIG.PULL_THRESHOLD && atTop) {
          if (hint) { hint.classList.add('spinning'); if(hintText) hintText.textContent = 'Refreshing...'; }
          Promise.resolve(onRefresh()).then(() => {
            if (hint) { hint.classList.remove('spinning', 'visible'); if(hintText) hintText.textContent = 'Pull down to refresh'; }
          }).catch(() => {
            if (hint) { hint.classList.remove('spinning', 'visible'); if(hintText) hintText.textContent = 'Pull down to refresh'; }
          });
        } else {
          if (hint) hint.classList.remove('visible');
        }
        pulling = false;
      });
    }
  };

  const InfiniteScroll = {
    observer: null,
    triggerEl: null,
    init(triggerSelector, onTrigger) {
      this.triggerEl = document.querySelector(triggerSelector);
      if (!this.triggerEl) return;
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !state.isLoading && state.hasMore) onTrigger();
        });
      }, { root: null, rootMargin: CONFIG.PREFETCH_DISTANCE + 'px 0px', threshold: 0 });
      this.observer.observe(this.triggerEl);
    },
    destroy() { if (this.observer) this.observer.disconnect(); },
    setLoading(loading) {
      state.isLoading = loading;
      const loader = document.getElementById('infinite-loader');
      if (loader) loader.classList.toggle('visible', loading);
    }
  };

  const UrlState = {
    read() {
      const p = new URLSearchParams(window.location.search);
      return {
        type: p.get('type') || 'trending',
        title: p.get('title') || 'Category',
        genre: p.get('genre') || '',
        sort: p.get('sort') || 'popularity',
        search: p.get('search') || '',
        page: parseInt(p.get('page')) || 1
      };
    },
    write(updates) {
      const p = new URLSearchParams(window.location.search);
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) p.set(k, v);
        else p.delete(k);
      });
      window.history.replaceState({}, '', window.location.pathname + '?' + p.toString());
    },
    syncToUI() {
      const { sort } = this.read();
      document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.sort === sort);
      });
    }
  };

  const TouchGestures = {
    init(onSwipeBack) {
      let startX = 0, startY = 0, tracking = false;
      document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = startX < 40;
      }, { passive: true });
      document.addEventListener('touchend', (e) => {
        if (!tracking) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (dx > CONFIG.SWIPE_THRESHOLD && Math.abs(dy) < 80) onSwipeBack();
        tracking = false;
      }, { passive: true });
    }
  };

  const Search = {
    timer: null,
    init(inputSelector, clearSelector, onSearch) {
      const input = document.querySelector(inputSelector);
      const clearBtn = document.querySelector(clearSelector);
      if (!input) return;
      input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (clearBtn) clearBtn.classList.toggle('visible', query.length > 0);
        clearTimeout(this.timer);
        this.timer = setTimeout(() => onSearch(query), CONFIG.DEBOUNCE_MS);
      });
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          input.value = '';
          clearBtn.classList.remove('visible');
          onSearch('');
          input.blur();
        });
      }
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { input.value = ''; if (clearBtn) clearBtn.click(); }
      });
    }
  };

  const ContinueWatching = {
    KEY: 'thrilling_continue',
    get() {
      try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
      catch (e) { return []; }
    },
    add(item) {
      const list = this.get();
      const idx = list.findIndex(i => i.id === item.id);
      const entry = Object.assign({}, item, { lastWatched: Date.now() });
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
      localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 20)));
    },
    remove(id) {
      const list = this.get().filter(i => i.id !== id);
      localStorage.setItem(this.KEY, JSON.stringify(list));
    }
  };

  const BackToTop = {
    init() {
      const btn = document.getElementById('back-to-top');
      if (!btn) return;
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            btn.classList.toggle('visible', window.scrollY > 500);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
      btn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }
  };

  const KeyboardNav = {
    init() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const backBtn = document.getElementById('back-btn');
          if (backBtn) backBtn.click();
        }
      });
    }
  };

  const StickyHeader = {
    init(headerSelector) {
      const header = document.querySelector(headerSelector);
      if (!header) return;
      let lastScroll = 0, ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const current = window.scrollY;
            if (current > lastScroll && current > 80) header.classList.add('hidden');
            else header.classList.remove('hidden');
            lastScroll = current;
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    }
  };

  const Toast = {
    show(msg, duration) {
      duration = duration || 2500;
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }
  };

  const GridBuilder = {
    buildCard(item, index) {
      const card = document.createElement('div');
      card.className = 'grid-card';
      card.style.transitionDelay = Math.min(index * 25, 400) + 'ms';

      const posterUrl = item.poster || item.poster_path || '';
      const title = item.title || item.name || 'Unknown';
      const rating = item.rating || (item.vote_average ? item.vote_average.toFixed(1) : '0.0');
      const year = item.year || (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A');
      const genre = item.genre || (item.genres && item.genres[0]) || 'Anime';
      const episodes = item.episodes || item.number_of_episodes || null;
      const hasHindi = item.hindi_dubbed || false;

      card.innerHTML = '<div class="poster">' +
        '<img data-src="' + posterUrl + '" alt="' + title + '" decoding="async">' +
        (hasHindi ? '<span class="hindi-badge-grid">DUB</span>' : '') +
        '<div class="rating-badge">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">' +
            '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
          '</svg>' + rating +
        '</div>' +
        '<div class="genre-badge-grid">' + genre + '</div>' +
      '</div>' +
      '<div class="title">' + title + '</div>' +
      '<div class="meta">' +
        '<span>' + year + '</span>' +
        (episodes ? '<span>• ' + episodes + ' eps</span>' : '') +
      '</div>';

      card.addEventListener('click', () => {
        ContinueWatching.add({ id: item.id, title: title, poster: posterUrl, episode: 1, progress: 0 });
        window.location.href = './player.html?id=' + item.id;
      });

      return card;
    },
    renderBatch(items, container, startIndex) {
      startIndex = startIndex || 0;
      const fragment = document.createDocumentFragment();
      items.forEach((item, idx) => {
        const card = this.buildCard(item, startIndex + idx);
        fragment.appendChild(card);
        VirtualGrid.observe(card);
      });
      container.appendChild(fragment);
    }
  };

  const API = {
    sortMap(sort) {
      const map = { popularity: 'POPULARITY_DESC', newest: 'START_DATE_DESC', rating: 'SCORE_DESC', az: 'TITLE_ENGLISH' };
      return map[sort] || 'POPULARITY_DESC';
    },

    async fetchCategory(type, genre, sort, page, searchQuery) {
      searchQuery = searchQuery || '';
      const cacheKey = type + '_' + genre + '_' + sort + '_' + page + '_' + searchQuery;
      const cached = Cache.get(cacheKey);
      if (cached && page === 1) return cached;

      try {
        let items = [];
        let hasMore = false;

        // PRIMARY: Use AnimeAPI (Jikan + AniList)
        if (typeof AnimeAPI !== 'undefined') {
          if (type === 'genre' && genre) {
            const results = await AnimeAPI.fetchByGenre(genre, page);
            items = results || [];
            hasMore = items.length >= 25;
          } else if (type === 'trending') {
            items = await AnimeAPI.fetchTrending();
            hasMore = false;
          } else if (type === 'top_rated') {
            items = await AnimeAPI.fetchTopRated();
            hasMore = false;
          } else if (type === 'new' || type === 'newest') {
            items = await AnimeAPI.fetchNewEpisodes();
            hasMore = false;
          } else if (type === 'hindi') {
            items = await AnimeAPI.fetchHindiDubbed();
            hasMore = false;
          } else {
            items = await AnimeAPI.fetchTrending();
            hasMore = false;
          }
        }
        // FALLBACK 1: fetchAnimeList proxy from tmdb.js
        else if (typeof fetchAnimeList === 'function') {
          const categoryMap = { 'trending': 'trending', 'top_rated': 'top_rated', 'new': 'new', 'newest': 'new', 'hindi': 'hindi' };
          const cat = categoryMap[type] || type;
          items = await fetchAnimeList(cat, page);
          hasMore = items && items.length >= 20;
        }
        // FALLBACK 2: FALLBACK_ANIME from tmdb.js
        else if (typeof FALLBACK_ANIME !== 'undefined') {
          items = FALLBACK_ANIME;
          hasMore = false;
        }

        // Client-side search filter
        if (searchQuery && items.length) {
          const q = searchQuery.toLowerCase();
          items = items.filter(r => {
            const t = (r.title || r.name || '').toLowerCase();
            const g = (r.genre || '').toLowerCase();
            return t.includes(q) || g.includes(q);
          });
        }

        // Client-side sort
        if (sort && items.length > 1) {
          switch(sort) {
            case 'rating':
              items.sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
              break;
            case 'newest':
              items.sort((a, b) => parseInt(b.year || 0) - parseInt(a.year || 0));
              break;
            case 'az':
              items.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
              break;
          }
        }

        const output = { items: items, hasMore: hasMore };
        if (page === 1) Cache.set(cacheKey, output);
        return output;

      } catch (e) {
        console.error('[CategorySystem] API fetch failed:', e);
        const fallback = (typeof FALLBACK_ANIME !== 'undefined') ? FALLBACK_ANIME : [];
        return { items: fallback, hasMore: false };
      }
    }
  };

  const CategoryView = {
    async init() {
      const url = UrlState.read();
      state.currentType = url.type;
      state.currentGenre = url.genre;
      state.currentSort = url.sort;
      state.currentPage = url.page;
      state.searchQuery = url.search;
      state.cacheKey = url.type + '_' + (url.genre || 'all');

      const titleEl = document.getElementById('category-title');
      if (titleEl) titleEl.textContent = decodeURIComponent(url.title || 'Category');

      const filterBar = document.getElementById('filter-bar');
      if (filterBar) filterBar.style.display = '';

      VirtualGrid.init('#anime-grid');
      InfiniteScroll.init('#infinite-loader', () => this.loadMore());
      PullToRefresh.init('body', () => this.refresh());
      TouchGestures.init(() => history.back());
      BackToTop.init();
      KeyboardNav.init();
      StickyHeader.init('#category-header');
      Search.init('#category-search', '#clear-search', (q) => this.onSearch(q));
      UrlState.syncToUI();

      await this.load();
    },

    async load() {
      const grid = document.getElementById('anime-grid');
      const skeleton = document.getElementById('skeleton-grid');
      const empty = document.getElementById('empty-state');
      const resultsCount = document.getElementById('results-count');

      if (state.currentPage === 1) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        if (skeleton) skeleton.style.display = 'grid';
        if (empty) empty.style.display = 'none';
        if (resultsCount) resultsCount.style.display = 'none';
      }

      try {
        InfiniteScroll.setLoading(true);
        const { items, hasMore } = await API.fetchCategory(
          state.currentType,
          state.currentGenre,
          state.currentSort,
          state.currentPage,
          state.searchQuery
        );

        state.hasMore = hasMore;
        state.retryCount = 0;
        if (skeleton) skeleton.style.display = 'none';

        if (items.length === 0 && state.currentPage === 1) {
          if (empty) {
            empty.style.display = 'flex';
            const msg = document.getElementById('empty-msg');
            if (msg) msg.textContent = state.searchQuery
              ? 'No results for "' + state.searchQuery + '". Try a different search.'
              : 'Try checking your connection or come back later.';
          }
          grid.style.display = 'none';
          if (resultsCount) resultsCount.style.display = 'none';
          return;
        }

        if (empty) empty.style.display = 'none';
        grid.style.display = 'grid';

        GridBuilder.renderBatch(items, grid, state.renderedCount);
        state.renderedCount += items.length;
        state.allItems.push(...items);

        if (resultsCount) {
          resultsCount.style.display = '';
          resultsCount.textContent = state.renderedCount + ' anime found';
        }

      } catch (e) {
        if (state.currentPage === 1) {
          if (skeleton) skeleton.style.display = 'none';
          if (empty) empty.style.display = 'flex';
        }
        Toast.show('Failed to load. Pull down to retry.');
      } finally {
        InfiniteScroll.setLoading(false);
      }
    },

    async loadMore() {
      if (state.isLoading || !state.hasMore) return;
      state.currentPage++;
      UrlState.write({ page: state.currentPage });
      await this.load();
    },

    async refresh() {
      state.currentPage = 1;
      state.renderedCount = 0;
      state.allItems = [];
      state.hasMore = true;
      state.retryCount = 0;
      Cache.invalidate(state.currentType, state.currentGenre);
      UrlState.write({ page: 1 });
      await this.load();
      Toast.show('Refreshed!');
    },

    setSort(sort) {
      if (state.currentSort === sort) return;
      state.currentSort = sort;
      state.currentPage = 1;
      state.renderedCount = 0;
      state.allItems = [];
      state.hasMore = true;
      UrlState.write({ sort: sort, page: 1 });
      UrlState.syncToUI();
      this.load();
    },

    onSearch(query) {
      state.searchQuery = query;
      state.currentPage = 1;
      state.renderedCount = 0;
      state.allItems = [];
      state.hasMore = true;
      UrlState.write({ search: query, page: 1 });
      this.load();
    },

    retry() {
      if (state.retryCount < CONFIG.MAX_RETRIES) {
        state.retryCount++;
        const delay = CONFIG.RETRY_BASE_MS * Math.pow(2, state.retryCount - 1);
        Toast.show('Retrying in ' + (delay/1000) + 's...');
        setTimeout(() => this.load(), delay);
      } else {
        Toast.show('Max retries reached. Check connection.');
      }
    }
  };

  const CategoriesPage = {
    init() {
      this.initPrefetch();
      StickyHeader.init('.app-header');
    },
    initPrefetch() {
      document.querySelectorAll('.genre-card-v2').forEach(card => {
        const doPrefetch = () => {
          const genre = card.querySelector('.genre-title')?.textContent;
          if (genre) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = './category-view.html?type=genre&genre=' + encodeURIComponent(genre) + '&title=' + encodeURIComponent(genre);
            document.head.appendChild(link);
          }
          card.removeEventListener('mouseenter', doPrefetch);
          card.removeEventListener('touchstart', doPrefetch);
        };
        card.addEventListener('mouseenter', doPrefetch);
        card.addEventListener('touchstart', doPrefetch, { passive: true });
      });
    }
  };

  return {
    initCategoryView: () => CategoryView.init(),
    initCategoriesPage: () => CategoriesPage.init(),
    setSort: (sort) => CategoryView.setSort(sort),
    retryLoad: () => CategoryView.retry(),
    Toast: Toast,
    Cache: Cache,
    ContinueWatching: ContinueWatching,
    ImageLoader: ImageLoader
  };
})();

function setSort(sort) { CategorySystem.setSort(sort); }
function retryLoad() { CategorySystem.retryLoad(); }

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  if (path.includes('category-view')) {
    CategorySystem.initCategoryView();
  } else if (path.includes('categories')) {
    CategorySystem.initCategoriesPage();
  }
});
