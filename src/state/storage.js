/* Versioned, non-destructive storage facade. */
(function (global) {
  "use strict";
  const PREFIX = "proudGeonQuiz";
  function safeParse(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      return fallback;
    } catch (error) {
      console.warn(`[Storage] Invalid JSON for ${key}; keeping fallback.`, error);
      return fallback;
    }
  }
  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (error) { console.warn(`[Storage] Could not save ${key}.`, error); return false; }
  }
  function exportAll() {
    const out = { schemaVersion: 2, exportedAt: new Date().toISOString(), keys: {} };
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key === "dreamGameData" || key.startsWith(PREFIX))) {
        out.keys[key] = safeParse(key, localStorage.getItem(key));
      }
    }
    return out;
  }
  function isAllowedKey(key) {
    return key === "dreamGameData" || (
      typeof key === "string" &&
      key.startsWith(PREFIX) &&
      key.length <= 240
    );
  }
  function validateImport(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
    if (payload.schemaVersion != null && Number(payload.schemaVersion) !== 2) return false;
    if (!payload.keys || typeof payload.keys !== "object" || Array.isArray(payload.keys)) return false;
    const entries = Object.entries(payload.keys);
    if (entries.length > 500) return false;
    return entries.every(([key, value]) => {
      if (!isAllowedKey(key)) return false;
      if (value === undefined || typeof value === "function" || typeof value === "symbol") return false;
      try {
        const serialized = JSON.stringify(value);
        return serialized !== undefined && serialized.length <= 2_000_000;
      } catch (error) { return false; }
    });
  }
  function importAll(payload) {
    if (!validateImport(payload)) return { ok: false, error: "Invalid save package." };
    try {
      backup("pre-import");
      const incoming = new Set(Object.keys(payload.keys));
      const remove = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const preserve = key && (key.includes("Backup") || key === "proudGeonQuizOfflineReady");
        if (key && isAllowedKey(key) && !preserve && !incoming.has(key)) remove.push(key);
      }
      remove.forEach(key => localStorage.removeItem(key));
      Object.entries(payload.keys).forEach(([key, value]) => set(key, value));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Save import failed." };
    }
  }
  function backup(label = "backup") {
    try {
      const key = `${PREFIX}Backup:${label}:${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(exportAll()));
      return key;
    } catch (error) { return null; }
  }
  global.GeonStorage = { get: safeParse, set, remove: key => localStorage.removeItem(key), has: key => localStorage.getItem(key) !== null, exportAll, importAll, validateImport, backup };
})(window);
