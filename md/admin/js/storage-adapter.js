// Unico modulo do painel admin que acessa window.localStorage, window.sessionStorage
// e indexedDB diretamente. Repositorios importam somente este modulo; views nunca
// devem importar storage-adapter.js diretamente (regra reforcada na auditoria do README).
//
// Todo metodo publico devolve Promise (mesmo os sincronos por baixo), para que a
// troca futura por chamadas fetch() a uma API real nao exija tocar em repositorios
// nem em views.

const MIN_LATENCY_MS = 120;
const MAX_LATENCY_MS = 260;

export function withLatency(factory, options) {
  const minMs = (options && options.minMs) || MIN_LATENCY_MS;
  const maxMs = (options && options.maxMs) || MAX_LATENCY_MS;
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, delay)).then(factory);
}

export const localStore = {
  read(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback === undefined ? null : fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? (fallback === undefined ? null : fallback) : parsed;
    } catch {
      return fallback === undefined ? null : fallback;
    }
  },
  write(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

export const sessionStore = {
  read(key, fallback) {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw === null) return fallback === undefined ? null : fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? (fallback === undefined ? null : fallback) : parsed;
    } catch {
      return fallback === undefined ? null : fallback;
    }
  },
  write(key, value) {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

const IDB_NAME = "md-admin-media";
const IDB_VERSION = 1;
const BLOB_STORE = "blobs";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB indisponivel neste navegador"));
      return;
    }
    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function runTransaction(mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(BLOB_STORE, mode);
        const store = tx.objectStore(BLOB_STORE);
        let settled = false;
        work(store, (value) => {
          settled = true;
          resolve(value);
        });
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Transacao do IndexedDB abortada"));
        if (!settled) {
          tx.oncomplete = () => resolve(undefined);
        }
      })
  );
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const idb = {
  async put(record) {
    return runTransaction("readwrite", (store, done) => {
      store.put(record);
      done(true);
    });
  },
  async get(id) {
    const db = await openDb();
    const tx = db.transaction(BLOB_STORE, "readonly");
    const result = await requestToPromise(tx.objectStore(BLOB_STORE).get(id));
    return result || null;
  },
  async delete(id) {
    return runTransaction("readwrite", (store, done) => {
      store.delete(id);
      done(true);
    });
  },
  async clear() {
    return runTransaction("readwrite", (store, done) => {
      store.clear();
      done(true);
    });
  },
};
