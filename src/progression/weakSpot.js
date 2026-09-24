/*
 * Weak-spot training rules.
 *
 * Pure helpers over per-category answer statistics. A category becomes a
 * training target only after enough attempts, and only while its accuracy stays
 * below the threshold. The script layer owns storage and the drill itself.
 */
(function (global) {
  "use strict";

  const STATS_KEY = "proudGeonQuizCategoryStatsV1";
  const MIN_ATTEMPTS = 6;
  const THRESHOLD = 0.7;

  function sanitizeCategoryStats(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const clean = {};
    for (const [key, row] of Object.entries(source)) {
      const parts = String(key).split("|");
      if (parts.length !== 2 || !parts[0] || !parts[1]) continue;
      if (!row || typeof row !== "object") continue;
      const total = Math.floor(Number(row.total));
      const correct = Math.floor(Number(row.correct));
      if (!Number.isFinite(total) || total <= 0) continue;
      if (!Number.isFinite(correct) || correct < 0) continue;
      clean[`${parts[0]}|${parts[1]}`] = {
        total: Math.min(total, 100000),
        correct: Math.min(correct, Math.min(total, 100000))
      };
    }
    return clean;
  }

  function record(stats, subject, category, correct) {
    const clean = sanitizeCategoryStats(stats);
    if (!subject || !category) return clean;
    const key = `${subject}|${category}`;
    const row = clean[key] || { total: 0, correct: 0 };
    row.total += 1;
    if (correct) row.correct += 1;
    clean[key] = row;
    return clean;
  }

  /* The weakest known category, or null when everything is at least on track. */
  function weakSpotOf(stats) {
    const clean = sanitizeCategoryStats(stats);
    let weakest = null;
    for (const [key, row] of Object.entries(clean)) {
      if (row.total < MIN_ATTEMPTS) continue;
      const accuracy = row.correct / row.total;
      if (accuracy >= THRESHOLD) continue;
      if (!weakest || accuracy < weakest.accuracy || (accuracy === weakest.accuracy && row.total > weakest.total)) {
        const [subject, category] = key.split("|");
        weakest = { subject, category, total: row.total, correct: row.correct, accuracy };
      }
    }
    return weakest;
  }

  /* Ranked view for the panel: weakest first, unknowns last. */
  function rankedCategories(stats) {
    const clean = sanitizeCategoryStats(stats);
    return Object.entries(clean)
      .map(([key, row]) => {
        const [subject, category] = key.split("|");
        return { subject, category, total: row.total, correct: row.correct, accuracy: row.correct / row.total };
      })
      .sort((a, b) => (a.accuracy - b.accuracy) || (b.total - a.total));
  }

  global.GeonWeakSpot = {
    STATS_KEY,
    MIN_ATTEMPTS,
    THRESHOLD,
    sanitizeCategoryStats,
    record,
    weakSpotOf,
    rankedCategories
  };
})(window);
