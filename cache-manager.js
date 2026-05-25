// cache-manager.js — IndexedDB cache with TTL + memory layer

const DB_NAME = 'AnimeCacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'api_cache';

const CacheManager = {
  db: null,
  memory: new Map(),

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
    });
  },

  async get(key) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry) return resolve(null);
        const ageMin = (Date.now() - entry.timestamp) / 60000;
        if (ageMin > entry.ttl) {
          this.delete(key);
          return resolve(null);
        }
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  },

  async set(key, data, ttlMinutes = 60) {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now(), ttl: ttlMinutes });
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  },

  async delete(key) {
    if (!this.db) return;
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  },

  async clear() {
    if (!this.db) return;
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  }
};

CacheManager.init().catch(() => console.warn('CacheManager init failed'));
window.CacheManager = CacheManager;

