// TMDB Integration — PROXY MODE v4 (FINAL)
// All anime-specific genres supported: Shounen, Isekai, Mecha, etc.

const TMDB_IMG = 'https://image.tmdb.org/t/p';

const HINDI_DUBBED_IDS = [
  1429, 65930, 95479, 37854, 46260, 13916, 65931, 120089,
  131041, 209867, 12971, 30984, 46298, 46261, 31911, 45790,
  60572, 60574, 63926, 65294, 67075, 67032, 72517, 83097,
  85937, 94664, 103786, 114695, 125474, 127562
];

const FALLBACK_ANIME = [
  { id: 1429, title: "Attack on Titan", original_name: "Shingeki no Kyojin", genre: "Action", rating: 9.1, poster: "/mKZ0oP2h5Y5.jpg", backdrop: "/aotBackdrop.jpg", overview: "Humanity fights for survival against man-eating giants.", year: 2013, language: "ja", hindi_dubbed: true },
  { id: 65930, title: "Demon Slayer", original_name: "Kimetsu no Yaiba", genre: "Action", rating: 8.8, poster: "/demonSlayer.jpg", backdrop: "/dsBackdrop.jpg", overview: "A boy becomes a demon slayer to save his sister.", year: 2019, language: "ja", hindi_dubbed: true },
  { id: 95479, title: "Jujutsu Kaisen", original_name: "Jujutsu Kaisen", genre: "Action", rating: 8.7, poster: "/jujutsu.jpg", backdrop: "/jjkBackdrop.jpg", overview: "A student joins a secret organization fighting curses.", year: 2020, language: "ja", hindi_dubbed: true },
  { id: 37854, title: "One Piece", original_name: "One Piece", genre: "Adventure", rating: 9.0, poster: "/onepiece.jpg", backdrop: "/opBackdrop.jpg", overview: "Pirates search for the ultimate treasure.", year: 1999, language: "ja", hindi_dubbed: true },
  { id: 46260, title: "Naruto", original_name: "Naruto", genre: "Action", rating: 8.4, poster: "/naruto.jpg", backdrop: "/narutoBackdrop.jpg", overview: "A young ninja seeks recognition and dreams of becoming Hokage.", year: 2002, language: "ja", hindi_dubbed: true },
  { id: 13916, title: "Death Note", original_name: "Death Note", genre: "Thriller", rating: 9.0, poster: "/deathnote.jpg", backdrop: "/dnBackdrop.jpg", overview: "A high schooler discovers a notebook that kills anyone whose name is written in it.", year: 2006, language: "ja", hindi_dubbed: true },
  { id: 65931, title: "My Hero Academia", original_name: "Boku no Hero Academia", genre: "Action", rating: 8.3, poster: "/mha.jpg", backdrop: "/mhaBackdrop.jpg", overview: "In a world of superpowers, one boy dreams of becoming a hero.", year: 2016, language: "ja", hindi_dubbed: true },
  { id: 120089, title: "Spy x Family", original_name: "Spy x Family", genre: "Comedy", rating: 8.5, poster: "/spyfamily.jpg", backdrop: "/sfBackdrop.jpg", overview: "A spy creates a fake family for a mission, not knowing they're an assassin and telepath.", year: 2022, language: "ja", hindi_dubbed: true },
  { id: 131041, title: "Chainsaw Man", original_name: "Chainsaw Man", genre: "Action", rating: 8.6, poster: "/chainsaw.jpg", backdrop: "/csmBackdrop.jpg", overview: "A poor young man merges with a devil to become a demon hunter.", year: 2022, language: "ja", hindi_dubbed: false },
  { id: 209867, title: "Solo Leveling", original_name: "Ore dake Level Up na Ken", genre: "Action", rating: 8.9, poster: "/sololeveling.jpg", backdrop: "/slBackdrop.jpg", overview: "The weakest hunter gains the ability to level up infinitely.", year: 2024, language: "ko", hindi_dubbed: true },
  { id: 12971, title: "Dragon Ball Z", original_name: "Dragon Ball Z", genre: "Action", rating: 8.7, poster: "/dbz.jpg", backdrop: "/dbzBackdrop.jpg", overview: "Goku protects Earth from powerful alien threats.", year: 1989, language: "ja", hindi_dubbed: true },
  { id: 30984, title: "Bleach", original_name: "Bleach", genre: "Action", rating: 8.2, poster: "/bleach.jpg", backdrop: "/bleachBackdrop.jpg", overview: "A teenager becomes a Soul Reaper to protect the living world.", year: 2004, language: "ja", hindi_dubbed: true },
  { id: 46298, title: "Hunter x Hunter", original_name: "Hunter x Hunter", genre: "Action", rating: 8.9, poster: "/hxh.jpg", backdrop: "/hxhBackdrop.jpg", overview: "A young boy searches for his father, a legendary Hunter.", year: 2011, language: "ja", hindi_dubbed: true },
  { id: 31911, title: "Fullmetal Alchemist: Brotherhood", original_name: "Hagane no Renkinjutsushi", genre: "Action", rating: 9.1, poster: "/fmab.jpg", backdrop: "/fmabBackdrop.jpg", overview: "Two brothers search for the Philosopher's Stone to restore their bodies.", year: 2009, language: "ja", hindi_dubbed: true },
  { id: 63926, title: "One Punch Man", original_name: "One Punch Man", genre: "Action", rating: 8.7, poster: "/opm.jpg", backdrop: "/opmBackdrop.jpg", overview: "A hero who can defeat anyone with a single punch seeks a worthy opponent.", year: 2015, language: "ja", hindi_dubbed: true },
  { id: 65294, title: "Black Clover", original_name: "Black Clover", genre: "Action", rating: 8.2, poster: "/bc.jpg", backdrop: "/bcBackdrop.jpg", overview: "Two orphans compete to become the Wizard King.", year: 2017, language: "ja", hindi_dubbed: true },
  { id: 72517, title: "Dr. Stone", original_name: "Dr. Stone", genre: "Sci-Fi", rating: 8.4, poster: "/ds.jpg", backdrop: "/dsBackdrop.jpg", overview: "A genius scientist rebuilds civilization after humanity is petrified.", year: 2019, language: "ja", hindi_dubbed: true },
  { id: 83097, title: "The Promised Neverland", original_name: "Yakusoku no Neverland", genre: "Thriller", rating: 8.5, poster: "/tpn.jpg", backdrop: "/tpnBackdrop.jpg", overview: "Orphans discover the dark truth about their orphanage.", year: 2019, language: "ja", hindi_dubbed: true },
  { id: 94664, title: "Blue Lock", original_name: "Blue Lock", genre: "Sports", rating: 8.3, poster: "/bl.jpg", backdrop: "/blBackdrop.jpg", overview: "300 strikers compete to become Japan's best forward.", year: 2022, language: "ja", hindi_dubbed: true },
  { id: 103786, title: "Mashle", original_name: "Mashle", genre: "Comedy", rating: 8.0, poster: "/mashle.jpg", backdrop: "/mashleBackdrop.jpg", overview: "A magicless boy uses muscles to become the strongest wizard.", year: 2023, language: "ja", hindi_dubbed: true },
];

function getImageUrl(path, size = 'w500') {
  if (!path) return `https://placehold.co/500x750/12121A/333333?text=Anime`;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

function getBackdropUrl(path, size = 'w1280') {
  if (!path) return `https://placehold.co/1280x720/0B0B0F/333333?text=Anime`;
  if (path.startsWith('http')) return path;
  return `${TMDB_IMG}/${size}${path}`;
}

// ===== PROXY FUNCTIONS =====
function fetchAnimeList(category = 'popular', page = 1) {
  switch(category) {
    case 'trending': return AnimeAPI.fetchTrending();
    case 'top_rated': return AnimeAPI.fetchTopRated();
    case 'new': return AnimeAPI.fetchNewEpisodes();
    case 'hindi': return AnimeAPI.fetchHindiDubbed();
    case 'movies': return AnimeAPI.fetchAnimeMovies(page);
    case 'cartoons': return AnimeAPI.fetchCartoons(page);
    // Anime-specific genres (tags)
    case 'shounen': return AnimeAPI.fetchByGenre('Shounen', page);
    case 'isekai': return AnimeAPI.fetchByGenre('Isekai', page);
    case 'seinen': return AnimeAPI.fetchByGenre('Seinen', page);
    case 'shoujo': return AnimeAPI.fetchByGenre('Shoujo', page);
    case 'harem': return AnimeAPI.fetchByGenre('Harem', page);
    case 'martial_arts': return AnimeAPI.fetchByGenre('Martial Arts', page);
    case 'vampire': return AnimeAPI.fetchByGenre('Vampires', page);
    case 'demons': return AnimeAPI.fetchByGenre('Demons', page);
    case 'game': return AnimeAPI.fetchByGenre('Video Game', page);
    case 'space': return AnimeAPI.fetchByGenre('Space', page);
    case 'military': return AnimeAPI.fetchByGenre('Military', page);
    case 'parody': return AnimeAPI.fetchByGenre('Parody', page);
    case 'samurai': return AnimeAPI.fetchByGenre('Samurai', page);
    case 'super_power': return AnimeAPI.fetchByGenre('Super Power', page);
    case 'school': return AnimeAPI.fetchByGenre('School', page);
    // Standard genres
    case 'action': return AnimeAPI.fetchByGenre('Action', page);
    case 'adventure': return AnimeAPI.fetchByGenre('Adventure', page);
    case 'comedy': return AnimeAPI.fetchByGenre('Comedy', page);
    case 'drama': return AnimeAPI.fetchByGenre('Drama', page);
    case 'fantasy': return AnimeAPI.fetchByGenre('Fantasy', page);
    case 'horror': return AnimeAPI.fetchByGenre('Horror', page);
    case 'magic': return AnimeAPI.fetchByGenre('Magic', page);
    case 'mecha': return AnimeAPI.fetchByGenre('Mecha', page);
    case 'mystery': return AnimeAPI.fetchByGenre('Mystery', page);
    case 'psychological': return AnimeAPI.fetchByGenre('Psychological', page);
    case 'romance': return AnimeAPI.fetchByGenre('Romance', page);
    case 'sci-fi': return AnimeAPI.fetchByGenre('Sci-Fi', page);
    case 'scifi': return AnimeAPI.fetchByGenre('Sci-Fi', page);
    case 'slice_of_life': return AnimeAPI.fetchByGenre('Slice of Life', page);
    case 'sports': return AnimeAPI.fetchByGenre('Sports', page);
    case 'supernatural': return AnimeAPI.fetchByGenre('Supernatural', page);
    case 'thriller': return AnimeAPI.fetchByGenre('Thriller', page);
    default: return AnimeAPI.fetchTrending();
  }
}

function fetchTrending() { return AnimeAPI.fetchTrending(); }
function fetchHindiDubbed() { return AnimeAPI.fetchHindiDubbed(); }
function fetchNewEpisodes() { return AnimeAPI.fetchNewEpisodes(); }
function fetchTopRated() { return AnimeAPI.fetchTopRated(); }
function fetchByGenre(genreName, page) { return AnimeAPI.fetchByGenre(genreName, page); }
function fetchAnimeDetails(id) { return AnimeAPI.fetchAnimeDetails(id); }
function searchAnime(query) { return AnimeAPI.searchAnime(query); }

// Storage helpers
function getContinueWatching() {
  const data = localStorage.getItem('thrilling_continue');
  return data ? JSON.parse(data) : [];
}

function addToContinueWatching(anime) {
  let list = getContinueWatching();
  list = list.filter(a => a.id !== anime.id);
  list.unshift({ ...anime, progress: anime.progress || 0, lastWatched: new Date().toISOString() });
  if (list.length > 20) list = list.slice(0, 20);
  localStorage.setItem('thrilling_continue', JSON.stringify(list));
}

function updateProgress(id, progress) {
  let list = getContinueWatching();
  const idx = list.findIndex(a => a.id === id);
  if (idx >= 0) {
    list[idx].progress = progress;
    localStorage.setItem('thrilling_continue', JSON.stringify(list));
  }
}
