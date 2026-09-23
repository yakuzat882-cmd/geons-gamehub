/*
 * Per-level star ratings.
 *
 * Pure helpers only. Completing a level always earns one star; a clean level
 * (no wrong answer) earns the second; a quick clean level without items earns
 * the third. Ratings are stored per questioner.
 */
(function (global) {
  "use strict";

  const MAX_STARS = 3;
  const FAST_SHARE = 0.7;
  const RATINGS_KEY = "proudGeonQuizStarRatingsV1";

  /*
   * starsFor({ completed, wrong, itemsUsed, timeUsed, timeLimit })
   * timeUsed and timeLimit are both in seconds. Anything without a real timer
   * gets no speed penalty as long as the level was clean and item-free.
   */
  function starsFor(input) {
    if (!input || input.completed !== true) return 0;
    const wrong = Math.floor(Number(input.wrong));
    if (!Number.isFinite(wrong) || wrong < 0) return 0;
    if (wrong > 0) return 1;

    const itemsUsed = Math.floor(Number(input.itemsUsed));
    if (Number.isFinite(itemsUsed) && itemsUsed > 0) return 2;

    const limit = Number(input.timeLimit);
    const used = Number(input.timeUsed);
    if (Number.isFinite(limit) && limit > 0 && Number.isFinite(used) && used > 0) {
      return used <= limit * FAST_SHARE ? 3 : 2;
    }
    return 3;
  }

  function keyFor(subject, quizType, level) {
    const safeLevel = Math.floor(Number(level));
    if (!subject || !quizType || !Number.isFinite(safeLevel) || safeLevel < 1 || safeLevel > 80) return "";
    return `${subject}|${quizType}|${safeLevel}`;
  }

  function sanitizeRatings(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const clean = {};
    for (const [key, value] of Object.entries(source)) {
      const parts = String(key).split("|");
      if (parts.length !== 3) continue;
      const level = Math.floor(Number(parts[2]));
      if (!parts[0] || !parts[1] || !Number.isFinite(level) || level < 1 || level > 80) continue;
      const stars = Math.floor(Number(value));
      if (!Number.isFinite(stars) || stars < 1 || stars > MAX_STARS) continue;
      clean[`${parts[0]}|${parts[1]}|${level}`] = stars;
    }
    return clean;
  }

  /* A saved rating only improves; replaying a level never lowers it. */
  function record(ratings, subject, quizType, level, stars) {
    const clean = sanitizeRatings(ratings);
    const key = keyFor(subject, quizType, level);
    const value = Math.floor(Number(stars));
    if (!key || !Number.isFinite(value) || value < 1) return clean;
    const current = Math.floor(Number(clean[key]) || 0);
    clean[key] = Math.max(current, Math.min(MAX_STARS, value));
    return clean;
  }

  function summaryFor(ratings, subject, quizType) {
    const clean = sanitizeRatings(ratings);
    let earned = 0;
    let completed = 0;
    Object.keys(clean).forEach(key => {
      const [rowSubject, rowType] = key.split("|");
      if (rowSubject !== subject || rowType !== quizType) return;
      completed += 1;
      earned += clean[key];
    });
    return { completed, earned, possible: completed * MAX_STARS };
  }

  global.GeonStars = {
    MAX_STARS,
    FAST_SHARE,
    RATINGS_KEY,
    starsFor,
    keyFor,
    sanitizeRatings,
    record,
    summaryFor
  };
})(window);
