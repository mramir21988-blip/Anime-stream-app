// anime-api.js — Hybrid Anime API v5 (ENHANCED + IMPROVED)
// Fixes: Timeout/Abort, tags field, better dedup, self-contained

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const ANILIST_BASE = 'https://graphql.anilist.co';

// ===== FETCH WITH TIMEOUT =====
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ===== RATE LIMIT QUEUES =====
let jikanQueue = Promise.resolve();
let jikanLastCall = 0;
let anilistQueue = Promise.resolve();
let anilistLastCall = 0;

async function jikanFetch(endpoint) {
  const run = async () => {
    const now = Date.now();
    const wait = 350 - (now - jikanLastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    jikanLastCall = Date.now();
    const url = `${JIKAN_BASE}${endpoint}`;
    const res = await fetchWithTimeout(url, { referrerPolicy: 'no-referrer' }, 10000);
    if (!res.ok) throw new Error(`Jikan ${res.status}`);
    const json = await res.json();
    return json.data;
  };
  jikanQueue = jikanQueue.then(run, run);
  return jikanQueue;
}

async function anilistFetch(query, variables) {
  const run = async () => {
    const now = Date.now();
    const wait = 200 - (now - anilistLastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    anilistLastCall = Date.now();
    const res = await fetchWithTimeout(ANILIST_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables })
    }, 10000);
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const json = await res.json();
    return json.data;
  };
  anilistQueue = anilistQueue.then(run, run);
  return anilistQueue;
}

// ===== RETRY WITH EXPONENTIAL BACKOFF =====
async function retryFetch(fn, retries = 3, baseDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ===== ENHANCED IMAGE HELPERS =====
function extractJikanImages(item) {
  const jpg = item.images?.jpg || {};
  const webp = item.images?.webp || {};
  const trailer = item.trailer?.images || {};
  
  return {
    poster: jpg.large_image_url || webp.large_image_url || jpg.image_url || webp.image_url || null,
    backdrop: trailer.maximum_image_url || trailer.large_image_url || jpg.large_image_url || null,
    small: jpg.small_image_url || webp.small_image_url || null
  };
}

function extractAniListImages(media) {
  return {
    poster: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || null,
    backdrop: media.bannerImage || media.coverImage?.extraLarge || null,
    color: media.coverImage?.color || null
  };
}

function generatePlaceholder(title, type = 'poster') {
  const w = type === 'poster' ? 500 : 1280;
  const h = type === 'poster' ? 750 : 720;
  const text = encodeURIComponent(title || 'Anime');
  return `https://placehold.co/${w}x${h}/1a1a2e/666666?text=${text}`;
}

// ===== ENHANCED DATA MAPPERS =====
function mapJikanAnime(item, forcedGenre = null) {
  const imgs = extractJikanImages(item);
  const title = item.title_english || item.title || 'Unknown';
  const actualGenres = item.genres?.map(g => g.name) || [];
  
  return {
    id: item.mal_id,
    title,
    original_name: item.title_japanese || item.title,
    name: title,
    genre: forcedGenre || actualGenres[0] || item.demographics?.[0]?.name || 'Anime',
    genres: actualGenres,
    rating: item.score ? item.score.toFixed(1) : '8.0',
    poster: imgs.poster || generatePlaceholder(title, 'poster'),
    backdrop: imgs.backdrop || generatePlaceholder(title, 'backdrop'),
    overview: item.synopsis || 'No description available.',
    year: item.year || item.aired?.prop?.from?.year || '2024',
    language: 'ja',
    hindi_dubbed: false,
    popularity: item.popularity || 0,
    episodes: item.episodes || 0,
    status: item.status || 'Unknown',
    duration: item.duration || '24 min',
    studios: item.studios?.map(s => s.name).join(', ') || '',
    media_type: item.type === 'Movie' || item.type === 'movie' ? 'movie' : 'tv',
    poster_path: imgs.poster || '',
    backdrop_path: imgs.backdrop || '',
    vote_average: item.score || 8.0,
    first_air_date: `${item.year || 2024}-01-01`,
    genres_tmdb: item.genres?.map(g => ({ name: g.name })) || [{ name: 'Anime' }],
    number_of_episodes: item.episodes || 24,
    number_of_seasons: 1,
    credits: { cast: [] },
    videos: { results: [] },
    similar: { results: [] }
  };
}

function mapAniListMedia(media, forcedGenre = null) {
  const imgs = extractAniListImages(media);
  const title = media.title?.english || media.title?.romaji || 'Unknown';
  const genres = media.genres || [];
  
  return {
    id: media.idMal || media.id,
    title,
    original_name: media.title?.native || '',
    name: title,
    genre: forcedGenre || genres[0] || 'Anime',
    genres,
    rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : '8.0',
    poster: imgs.poster || generatePlaceholder(title, 'poster'),
    backdrop: imgs.backdrop || generatePlaceholder(title, 'backdrop'),
    overview: media.description?.replace(/<<[^>]+>/g, '') || 'No description available.',
    year: media.seasonYear || '2024',
    language: 'ja',
    hindi_dubbed: false,
    popularity: media.popularity || 0,
    episodes: media.episodes || 0,
    status: media.status || 'Unknown',
    duration: media.duration ? `${media.duration} min` : '24 min',
    studios: media.studios?.nodes?.map(s => s.name).join(', ') || '',
    media_type: media.format === 'MOVIE' ? 'movie' : 'tv',
    poster_path: imgs.poster || '',
    backdrop_path: imgs.backdrop || '',
    vote_average: media.averageScore ? media.averageScore / 10 : 8.0,
    first_air_date: `${media.seasonYear || 2024}-01-01`,
    genres_tmdb: genres.map(g => ({ name: g })),
    number_of_episodes: media.episodes || 24,
    number_of_seasons: 1,
    credits: { cast: [] },
    videos: { results: [] },
    similar: { results: [] }
  };
}

// Merge Jikan + AniList (prefer Jikan data, AniList images as fallback)
function mergeAnimeData(jikanItem, anilistItem) {
  if (!jikanItem) return anilistItem;
  if (!anilistItem) return jikanItem;
  
  const jikan = mapJikanAnime(jikanItem);
  const anilist = mapAniListMedia(anilistItem);
  
  return {
    ...jikan,
    poster: jikan.poster.includes('placehold') ? anilist.poster : jikan.poster,
    backdrop: jikan.backdrop.includes('placehold') ? anilist.backdrop : jikan.backdrop,
    poster_path: jikan.poster_path || anilist.poster_path,
    backdrop_path: jikan.backdrop_path || anilist.backdrop_path,
    overview: jikan.overview !== 'No description available.' ? jikan.overview : anilist.overview,
    genres: jikan.genres.length ? jikan.genres : anilist.genres,
    rating: parseFloat(jikan.rating) > 0 ? jikan.rating : anilist.rating
  };
}

// ===== GENRE/TAG CONFIG =====
const ANILIST_GENRES = ['Action','Adventure','Comedy','Drama','Fantasy','Horror','Magic','Mecha','Music','Mystery','Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller'];

const ANILIST_TAGS = {
  'shounen': 'Shounen', 'isekai': 'Isekai', 'seinen': 'Seinen', 'shoujo': 'Shoujo',
  'harem': 'Harem', 'reverse_harem': 'Reverse Harem', 'martial_arts': 'Martial Arts',
  'vampire': 'Vampires', 'demons': 'Demons', 'game': 'Video Game', 'space': 'Space',
  'military': 'Military', 'police': 'Police', 'parody': 'Parody', 'samurai': 'Samurai',
  'super_power': 'Super Power', 'school': 'School'
};

function isGenre(name) {
  return ANILIST_GENRES.some(g => g.toLowerCase() === name.toLowerCase());
}

function getTag(name) {
  return ANILIST_TAGS[name.toLowerCase()] || null;
}

// ===== CACHE =====
const pending = new Map();

async function fetchWithCache(cacheKey, ttlMinutes, fetchFn) {
  const mem = CacheManager.memory?.get(cacheKey);
  if (mem) return mem;
  const cached = await CacheManager.get(cacheKey);
  if (cached) { CacheManager.memory?.set(cacheKey, cached); return cached; }
  if (pending.has(cacheKey)) return pending.get(cacheKey);
  const promise = (async () => {
    try {
      const data = await fetchFn();
      await CacheManager.set(cacheKey, data, ttlMinutes);
      CacheManager.memory?.set(cacheKey, data);
      return data;
    } finally { pending.delete(cacheKey); }
  })();
  pending.set(cacheKey, promise);
  return promise;
}

// ===== STRICT GENRE/TAG FETCH (AniList) — FIXED & SELF-CONTAINED =====
async function fetchGenreStrict(genreName, page = 1, perPage = 50) {
  const cacheKey = `anilist:genre:${genreName.toLowerCase()}:p${page}:v5`;

  return fetchWithCache(cacheKey, 60, async () => {
    let query, variables;
    const target = genreName.toLowerCase();

    const mediaFields = `
      id idMal
      title { romaji english native }
      description
      coverImage { large extraLarge }
      bannerImage
      averageScore
      genres
      tags { name }
      seasonYear
      episodes
      status
      duration
      format
      studios { nodes { name } }
      popularity
    `;

    if (isGenre(genreName)) {
      query = `
        query($genre: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(type: ANIME, genre: $genre, sort: POPULARITY_DESC, isAdult: false) {
              ${mediaFields}
            }
          }
        }
      `;
      variables = { genre: genreName, page, perPage };
    } else if (getTag(genreName)) {
      query = `
        query($tag: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(type: ANIME, tag: $tag, sort: POPULARITY_DESC, isAdult: false) {
              ${mediaFields}
            }
          }
        }
      `;
      variables = { tag: getTag(genreName), page, perPage };
    } else {
      query = `
        query($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
              ${mediaFields}
            }
          }
        }
      `;
      variables = { search: genreName, page, perPage };
    }

    const data = await anilistFetch(query, variables);
    const results = data?.Page?.media || [];

    // Client-side strict filter (tags now available thanks to mediaFields)
    const filtered = results.filter(m => {
      const gMatch = m.genres?.some(g => g.toLowerCase() === target);
      const tMatch = m.tags?.some(t => t.name.toLowerCase() === target);
      return gMatch || tMatch;
    });

    return filtered.map(m => mapAniListMedia(m, genreName));
  }).catch(() => {
    const filtered = FALLBACK_ANIME.filter(a => 
      a.genre.toLowerCase() === genreName.toLowerCase()
    );
    return filtered.length ? filtered : FALLBACK_ANIME.slice(0, 15);
  });
}

// ===== ENHANCED ANIME DETAILS (Parallel Fetch) =====
async function fetchAnimeDetailsEnhanced(id) {
  return fetchWithCache(`anime:details:${id}:v5`, 120, async () => {
    const jikanPromise = retryFetch(() => jikanFetch(`/anime/${id}/full`)).catch(() => null);
    const anilistPromise = retryFetch(() => {
      const query = `query($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          id idMal
          title { romaji english native }
          description
          coverImage { large extraLarge medium }
          bannerImage
          averageScore
          genres
          seasonYear
          episodes
          status
          duration
          format
          studios { nodes { name } }
          popularity
        }
      }`;
      return anilistFetch(query, { idMal: parseInt(id) });
    }).catch(() => null);

    const [jikanData, anilistData] = await Promise.all([jikanPromise, anilistPromise]);
    
    if (jikanData && anilistData?.Media) {
      return mergeAnimeData(jikanData, anilistData.Media);
    }
    if (jikanData) return mapJikanAnime(jikanData);
    if (anilistData?.Media) return mapAniListMedia(anilistData.Media);
    
    throw new Error('Both APIs failed');
  }).catch(() => {
    const found = FALLBACK_ANIME.find(a => a.id == id);
    if (found) return {
      id: found.id, name: found.title, title: found.title,
      overview: found.overview, poster_path: found.poster, backdrop_path: found.backdrop,
      vote_average: found.rating, first_air_date: found.year + '-01-01',
      genres: [{ name: found.genre }], number_of_episodes: 24, number_of_seasons: 1,
      credits: { cast: [] }, videos: { results: [] }, similar: { results: [] }
    };
    return FALLBACK_ANIME[0];
  });
}

// ===== ENHANCED SEARCH (Dual API + Deduplicate) =====
async function searchAnimeEnhanced(query) {
  if (!query || query.length < 2) return [];
  
  const cacheKey = `search:${query.toLowerCase()}:v5`;
  
  return fetchWithCache(cacheKey, 15, async () => {
    const jikanPromise = retryFetch(() => jikanFetch(`/anime?q=${encodeURIComponent(query)}&limit=25&sfw=false`)).catch(() => []);
    const anilistPromise = retryFetch(() => {
      const q = `query($search: String, $perPage: Int) {
        Page(perPage: $perPage) {
          media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
            id idMal
            title { romaji english native }
            description
            coverImage { large extraLarge }
            bannerImage
            averageScore
            genres
            seasonYear
            episodes
            status
            duration
            format
            studios { nodes { name } }
            popularity
          }
        }
      }`;
      return anilistFetch(q, { search: query, perPage: 25 });
    }).catch(() => ({ Page: { media: [] } }));

    const [jikanRes, anilistRes] = await Promise.all([jikanPromise, anilistPromise]);
    
    const jikanItems = (jikanRes || []).map(item => mapJikanAnime(item));
    const anilistItems = (anilistRes?.Page?.media || []).map(m => mapAniListMedia(m));
    
    // Merge and deduplicate by idMal first, then normalized title
    const seenIds = new Set();
    const seenTitles = new Set();
    const merged = [];
    const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    [...jikanItems, ...anilistItems].forEach(item => {
      if (!item.title) return;
      const idKey = item.id ? String(item.id) : null;
      const titleKey = normalize(item.title);
      
      if (idKey && seenIds.has(idKey)) return;
      if (titleKey.length > 0 && seenTitles.has(titleKey)) return;
      
      if (idKey) seenIds.add(idKey);
      if (titleKey.length > 0) seenTitles.add(titleKey);
      merged.push(item);
    });
    
    return merged.slice(0, 25);
  }).catch(() => FALLBACK_ANIME.filter(a =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    (a.original_name && a.original_name.toLowerCase().includes(query.toLowerCase()))
  ));
}

// ===== HENTAI API — DOCCHI PRIMARY + JIKAN FALLBACK =====
// Docchi (api.docchi.pl) is a dedicated hentai aggregator — real NSFW content
// Jikan (genre 12) is the fallback if Docchi is unreachable

const DOCCHI_BASE = 'https://api.docchi.pl/v1';

async function fetchDocchiHentai(page = 1, limit = 25) {
  // Docchi endpoints: /series/hentai, /series/hentai?page=N
  const url = `${DOCCHI_BASE}/series/hentai${page > 1 ? '?page=' + page : ''}`;

  const res = await fetchWithTimeout(url, {
    headers: { 'Accept': 'application/json', 'Referer': '' },
    referrerPolicy: 'no-referrer'
  }, 12000);

  if (!res.ok) throw new Error(`Docchi HTTP ${res.status}`);
  const json = await res.json();

  // Docchi returns array of series objects
  const results = Array.isArray(json) ? json : (json.data || json.results || []);

  return results.slice(0, limit).map(item => {
    // Docchi field mapping (adjust based on actual response structure)
    const title = item.title || item.name || item.series_title || 'Unknown';
    const poster = item.poster || item.cover || item.image || item.thumbnail || item.poster_url || '';
    const backdrop = item.backdrop || item.banner || poster;
    const rating = item.score || item.rating || item.averageScore || item.rate || 'N/A';
    const year = item.year || item.seasonYear || item.release_year || (item.date ? new Date(item.date).getFullYear() : '');

    return {
      id: item.id || item.slug || item.mal_id || item.anilist_id || Math.random().toString(36).substr(2, 9),
      title: title,
      original_name: item.title_alt || item.japanese_title || title,
      name: title,
      genre: 'Hentai',
      genres: ['Hentai'],
      rating: typeof rating === 'number' ? rating.toFixed(1) : String(rating),
      poster: poster,
      backdrop: backdrop || poster,
      overview: item.description || item.synopsis || item.plot || 'No description available.',
      year: year,
      language: 'ja',
      hindi_dubbed: false,
      popularity: item.popularity || item.views || 0,
      episodes: item.episodes || item.episode_count || 0,
      status: item.status || 'Unknown',
      duration: item.duration || '24 min',
      studios: item.studio || item.producer || '',
      media_type: item.type || 'tv',
      poster_path: poster,
      backdrop_path: backdrop || poster,
      vote_average: typeof rating === 'number' ? rating : 0,
      first_air_date: year ? `${year}-01-01` : '2024-01-01',
      genres_tmdb: [{ name: 'Hentai' }],
      number_of_episodes: item.episodes || 1,
      number_of_seasons: 1,
      credits: { cast: [] },
      videos: { results: [] },
      similar: { results: [] }
    };
  }).filter(x => x.poster);
}

async function fetchHentai(page = 1, limit = 25) {
  const cacheKey = `hentai:docchi:p${page}:l${limit}:v5`;

  return fetchWithCache(cacheKey, 30, async () => {
    // Try Docchi first (real hentai aggregator)
    try {
      const docchiData = await fetchDocchiHentai(page, limit);
      if (docchiData && docchiData.length > 0) {
        return docchiData;
      }
    } catch (docchiErr) {
      console.warn('Docchi hentai failed, falling back to Jikan:', docchiErr.message);
    }

    // Fallback: Jikan genre 12
    const endpoint = `/anime?genres=12&sfw=false&limit=${limit}&page=${page}&order_by=score&sort=desc`;
    const data = await retryFetch(() => jikanFetch(endpoint));

    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid hentai response');
    }

    return data.map(item => {
      const mapped = mapJikanAnime(item);
      mapped.genre = 'Hentai';
      mapped.genres = ['Hentai'];
      mapped.hindi_dubbed = false;
      return mapped;
    }).filter(x => x.poster && !x.poster.includes('placehold'));
  }).catch(() => {
    // Last resort: fallback data
    if (typeof FALLBACK_ANIME !== 'undefined') {
      return FALLBACK_ANIME.filter(a => 
        a.genre.toLowerCase() === 'hentai' || 
        a.title.toLowerCase().includes('hentai')
      ).slice(0, limit);
    }
    return [];
  });
}

// ===== PUBLIC API =====
const AnimeAPI = {  async fetchHentai(page = 1, limit = 25) {
    return fetchHentai(page, limit);
  },


  async fetchTrending() {
    return fetchWithCache('jikan:trending:v5', 30, async () => {
      let data = await retryFetch(() => jikanFetch('/seasons/now?limit=25&sfw=false'));
      if (!data || data.length === 0) data = await retryFetch(() => jikanFetch('/top/anime?filter=airing&limit=25'));
      return (data || []).map(item => mapJikanAnime(item));
    }).catch(() => FALLBACK_ANIME.slice(0, 15));
  },

  async fetchNewEpisodes() {
    return fetchWithCache('jikan:new:v5', 60, async () => {
      const data = await retryFetch(() => jikanFetch('/seasons/now?limit=25&sfw=false'));
      return (data || []).map(item => mapJikanAnime(item));
    }).catch(() => FALLBACK_ANIME.filter(a => parseInt(a.year) >= 2020));
  },

  async fetchTopRated() {
    return fetchWithCache('jikan:top:v5', 120, async () => {
      const data = await retryFetch(() => jikanFetch('/top/anime?limit=25'));
      return (data || []).map(item => mapJikanAnime(item));
    }).catch(() => [...FALLBACK_ANIME].sort((a, b) => b.rating - a.rating));
  },

  async fetchHindiDubbed() {
    return FALLBACK_ANIME.filter(a => a.hindi_dubbed);
  },

  async searchAnime(query) {
    return searchAnimeEnhanced(query);
  },

  async fetchAnimeDetails(id) {
    return fetchAnimeDetailsEnhanced(id);
  },

  async fetchByGenre(genreName, page = 1) {
    return fetchGenreStrict(genreName, page, 50);
  },

  async fetchAnimeMovies(page = 1) {
    const cacheKey = `anilist:movies:p${page}:v5`;
    return fetchWithCache(cacheKey, 120, async () => {
      const query = `
        query($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            media(type: ANIME, format: MOVIE, sort: POPULARITY_DESC, isAdult: false) {
              id idMal
              title { romaji english native }
              description
              coverImage { large extraLarge }
              bannerImage
              averageScore
              genres
              seasonYear
              duration
              studios { nodes { name } }
              popularity
            }
          }
        }
      `;
      const data = await anilistFetch(query, { page, perPage: 25 });
      return (data?.Page?.media || []).map(m => mapAniListMedia(m, 'Movie'));
    }).catch(() => FALLBACK_ANIME.filter(a => a.media_type === 'movie' || a.title.toLowerCase().includes('movie')));
  },

  async fetchCartoons(page = 1) {
    const cacheKey = `anilist:cartoons:p${page}:v5`;
    return fetchWithCache(cacheKey, 120, async () => {
      const allResults = [];
      const seen = new Set();
      const keywords = ['doraemon', 'shinchan', 'shin-chan', 'ben 10', 'ben10', 'pokemon', 'digimon', 'beyblade', 'bakugan', 'yu-gi-oh', 'yugioh'];
      
      for (const kw of keywords.slice(0, 6)) {
        try {
          const query = `
            query($search: String, $perPage: Int) {
              Page(page: 1, perPage: $perPage) {
                media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
                  id idMal
                  title { romaji english native }
                  description
                  coverImage { large extraLarge }
                  bannerImage
                  averageScore
                  genres
                  seasonYear
                  episodes
                  status
                  duration
                  format
                  studios { nodes { name } }
                  popularity
                }
              }
            }
          `;
          const data = await anilistFetch(query, { search: kw, perPage: 10 });
          const results = data?.Page?.media || [];
          for (const m of results) {
            const title = (m.title?.english || m.title?.romaji || '').toLowerCase();
            const id = m.idMal || m.id;
            if (!seen.has(id) && keywords.some(k => title.includes(k.replace(/[-\s]/g, '')))) {
              seen.add(id);
              allResults.push(m);
            }
          }
        } catch (e) { /* skip */ }
      }
      return allResults.map(m => mapAniListMedia(m, 'Cartoon'));
    }).catch(() => [
      { id: 60572, title: "Pokemon", original_name: "Pocket Monsters", genre: "Cartoon", rating: 7.5, poster: "/pokemon.jpg", backdrop: "/pokemonBg.jpg", overview: "A young trainer and his Pikachu travel the world catching Pokemon.", year: 1997, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 501, title: "Doraemon", original_name: "Doraemon", genre: "Cartoon", rating: 8.0, poster: "/doraemon.jpg", backdrop: "/doraemonBg.jpg", overview: "A robotic cat from the future helps a boy with futuristic gadgets.", year: 1979, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 966, title: "Crayon Shin-chan", original_name: "Crayon Shin-chan", genre: "Cartoon", rating: 7.8, poster: "/shinchan.jpg", backdrop: "/shinchanBg.jpg", overview: "The misadventures of a cheeky 5-year-old boy.", year: 1992, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 345, title: "Beyblade", original_name: "Bakuten Shoot Beyblade", genre: "Cartoon", rating: 6.8, poster: "/beyblade.jpg", backdrop: "/beybladeBg.jpg", overview: "Kids battle with spinning tops that contain powerful spirits.", year: 2001, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 552, title: "Digimon Adventure", original_name: "Digimon Adventure", genre: "Cartoon", rating: 7.6, poster: "/digimon.jpg", backdrop: "/digimonBg.jpg", overview: "Kids partner with digital monsters to save both worlds.", year: 1999, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 1131, title: "Yu-Gi-Oh!", original_name: "Yu-Gi-Oh! Duel Monsters", genre: "Cartoon", rating: 7.2, poster: "/yugioh.jpg", backdrop: "/yugiohBg.jpg", overview: "A boy solves an ancient puzzle and hosts a spirit who loves games.", year: 2000, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 2781, title: "Bakugan Battle Brawlers", original_name: "Bakugan Battle Brawlers", genre: "Cartoon", rating: 6.5, poster: "/bakugan.jpg", backdrop: "/bakuganBg.jpg", overview: "Kids use cards and balls to summon monsters for battle.", year: 2007, language: "ja", hindi_dubbed: true, media_type: 'tv' },
      { id: 2006, title: "Ben 10", original_name: "Ben 10", genre: "Cartoon", rating: 7.0, poster: "/ben10.jpg", backdrop: "/ben10Bg.jpg", overview: "A boy finds a watch that lets him transform into alien heroes.", year: 2005, language: "en", hindi_dubbed: true, media_type: 'tv' },
    ]);
  }
};

window.AnimeAPI = AnimeAPI;

