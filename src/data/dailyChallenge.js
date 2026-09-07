/* Deterministic daily challenge helpers. */
(function (global) {
  "use strict";
  function hash(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  global.GeonDaily = {
    hash,
    idsFor(dateKey, questioner, ids, count = 10) {
      const pool = [...ids].map(String);
      const seed = `${dateKey}|${questioner}|${pool.length}`;
      let state = hash(seed);
      const out = [];
      const available = pool.slice();
      while (available.length && out.length < count) {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        const index = state % available.length;
        out.push(available.splice(index, 1)[0]);
      }
      return out;
    }
  };
})(window);
