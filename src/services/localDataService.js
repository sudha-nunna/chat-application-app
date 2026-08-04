/**
 * Web-Native Async Data Persistence & Local Cache Service
 * Powered by IndexedDB with automatic localStorage fallbacks and ETag caching.
 */
const DB_NAME = "agentic_web_db";
const STORE_NAME = "kv_store";
const DB_VERSION = 1;

let idb = null;

const getIDB = () => {
    return new Promise((resolve) => {
        if (idb) return resolve(idb);
        if (typeof window === "undefined" || !window.indexedDB) {
            return resolve(null);
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => {
            idb = e.target.result;
            resolve(idb);
        };
        request.onerror = (e) => {
            console.warn("[localDataService] IndexedDB failed, falling back to localStorage", e.target?.error);
            resolve(null);
        };
    });
};

export const localDataService = {
    /**
     * Asynchronously retrieves data by key from IndexedDB or localStorage
     */
    async getData(key) {
        try {
            const db = await getIDB();
            if (db) {
                return new Promise((resolve) => {
                    const tx = db.transaction(STORE_NAME, "readonly");
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
                    request.onerror = () => resolve(null);
                });
            }
            const fallback = localStorage.getItem(`agentic_cache_${key}`);
            return fallback ? JSON.parse(fallback) : null;
        } catch (e) {
            console.warn(`[localDataService] Failed to read key: ${key}`, e);
            try {
                const fallback = localStorage.getItem(`agentic_cache_${key}`);
                return fallback ? JSON.parse(fallback) : null;
            } catch (err) {
                return null;
            }
        }
    },

    /**
     * Asynchronously saves data by key into IndexedDB with localStorage fallback
     */
    async saveData(key, data) {
        try {
            const db = await getIDB();
            if (db) {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, "readwrite");
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.put(data, key);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
                return;
            }
            localStorage.setItem(`agentic_cache_${key}`, JSON.stringify(data));
        } catch (e) {
            console.warn(`[localDataService] Failed to save key: ${key}`, e);
            try {
                localStorage.setItem(`agentic_cache_${key}`, JSON.stringify(data));
            } catch (err) { }
        }
    },

    /**
     * ETag Retrieval for HTTP caching
     */
    async getEtag(url) {
        try {
            const etagKey = `etag_${url}`;
            return await this.getData(etagKey);
        } catch (e) {
            return null;
        }
    },

    /**
     * ETag Persistence for HTTP caching
     */
    async saveEtag(url, etag, data) {
        try {
            const etagKey = `etag_${url}`;
            const payload = {
                etag,
                data,
                timestamp: Date.now()
            };
            await this.saveData(etagKey, payload);
        } catch (e) {
            console.warn(`[localDataService] Failed to save ETag for ${url}`, e);
        }
    },

    /**
     * Get cached item if it has not expired
     */
    async getCache(key, maxAgeMs = 5 * 60 * 1000) {
        const entry = await this.getData(key);
        if (!entry || !entry.timestamp) return null;
        if (Date.now() - entry.timestamp > maxAgeMs) {
            this.clearData(key).catch(() => { });
            return null;
        }
        return entry.data;
    },

    /**
     * Set cached item with timestamp
     */
    async setCache(key, data) {
        const payload = {
            data,
            timestamp: Date.now()
        };
        await this.saveData(key, payload);
    },

    /**
     * Removes a single item by key from IndexedDB and localStorage
     */
    async clearData(key) {
        try {
            const db = await getIDB();
            if (db) {
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                store.delete(key);
            }
            localStorage.removeItem(`agentic_cache_${key}`);
            localStorage.removeItem(`agentic_etag_${key}`);
            localStorage.removeItem(`etag_${key}`);
        } catch (e) {
            console.warn(`[localDataService] Failed to clear key: ${key}`, e);
        }
    },

    /**
     * Safely wipes all persisted cache & IndexedDB database during logout
     */
    async clearAllData() {
        try {
            if (idb) {
                idb.close();
                idb = null;
            }

            if (typeof window !== "undefined" && window.indexedDB) {
                await new Promise((resolve) => {
                    const req = window.indexedDB.deleteDatabase(DB_NAME);
                    req.onsuccess = () => resolve(true);
                    req.onerror = () => resolve(false);
                    req.onblocked = () => resolve(false);
                });
            }

            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (
                    key.startsWith("agentic_cache_") ||
                    key.startsWith("agentic_etag_") ||
                    key.startsWith("etag_")
                ) {
                    localStorage.removeItem(key);
                }
            }
        } catch (e) {
            console.warn("[localDataService] Error clearing all data", e);
        }
    }
};

export default localDataService;
