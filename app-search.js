// Search Page Logic

let searchResults = [];

function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', debounce(async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
      renderSearchResults([]);
      return;
    }

    showToast('Searching...', 1000);
    try {
      searchResults = await searchAnime(query);
      renderSearchResults(searchResults);
    } catch (e) {
      console.error('Search error:', e);
    }
  }, 400));

  // Focus input on load
  setTimeout(() => input.focus(), 300);
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  const emptyState = document.getElementById('search-empty');

  if (!container) return;

  if (results.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = '';

  results.forEach(item => {
    const card = document.createElement('div');
    card.className = 'flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer card-tap hover:bg-white/10 transition-colors';
    card.onclick = () => {
      addToContinueWatching({
        id: item.id,
        title: item.title,
        poster: item.poster,
        episode: 1,
        progress: 0
      });
      window.location.href = `./player.html?id=${item.id}`;
    };
    card.innerHTML = `
      <img src="${getImageUrl(item.poster, 'w200')}" alt="${item.title}" class="w-20 h-28 object-cover rounded-lg flex-shrink-0 bg-white/5">
      <div class="flex flex-col justify-center min-w-0">
        <h4 class="font-semibold text-sm mb-1 line-clamp-1">${item.title}</h4>
        <div class="flex items-center gap-2 text-xs text-white/50 mb-2">
          <span>${item.year}</span>
          <span>•</span>
          <span class="text-accent">${item.rating}</span>
        </div>
        <p class="text-xs text-white/40 line-clamp-2">${item.overview || 'No description available.'}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

// Popular searches / recent searches
function getRecentSearches() {
  return Storage.get('recent_searches', []);
}

function addRecentSearch(query) {
  let recent = getRecentSearches();
  recent = recent.filter(q => q !== query);
  recent.unshift(query);
  if (recent.length > 8) recent = recent.slice(0, 8);
  Storage.set('recent_searches', recent);
}

function renderRecentSearches() {
  const container = document.getElementById('recent-searches');
  if (!container) return;

  const recent = getRecentSearches();
  if (recent.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = recent.map(q => `
    <button onclick="performSearch('${q}')" class="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 hover:bg-white/10 transition-colors">
      ${q}
    </button>
  `).join('');
}

function performSearch(query) {
  const input = document.getElementById('search-input');
  if (input) {
    input.value = query;
    input.dispatchEvent(new Event('input'));
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('search-input')) {
    initSearch();
    renderRecentSearches();
  }
});

// Init filters
SearchFilters.init({
  container: '.search-results',
  input: '#search-input',
  filterBar: '.search-filters'
});

// Set your data
SearchFilters.setData(animeArray);

// Listen for filtered results
document.addEventListener('searchFiltered', (e) => {
  const { results } = e.detail;
  renderAnimeCards(results); // tumhara existing render function
});
