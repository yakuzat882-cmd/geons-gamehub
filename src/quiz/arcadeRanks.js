/*
 * Arcade data rules for Survival Gauntlet and Timed Blitz.
 *
 * Pure helpers only. The script layer owns storage keys, the question banks and
 * the quiz screen. Difficulty in a survival run climbs one stage every five
 * questions: NORMAL -> HARD -> INSANE -> IMPOSSIBLE.
 */
(function (global) {
  "use strict";

  const STAGES = Object.freeze(["NORMAL", "HARD", "INSANE", "IMPOSSIBLE"]);
  const QUESTIONS_PER_STAGE = 5;
  const BOARD_SIZE = 10;
  const BLITZ_SECONDS = 60;
  const BLITZ_CORRECT_BONUS = 2;
  const BLITZ_WRONG_PENALTY = 3;
  const BASE_SCORE = Object.freeze({
    NORMAL: 20,
    HARD: 30,
    INSANE: 45,
    IMPOSSIBLE: 70
  });

  function stageForQuestion(index) {
    const position = Math.max(0, Math.floor(Number(index) || 0));
    return STAGES[Math.min(STAGES.length - 1, Math.floor(position / QUESTIONS_PER_STAGE))];
  }

  function scoreForDifficulty(difficulty, multiplier) {
    const base = BASE_SCORE[String(difficulty || "").toUpperCase()] || BASE_SCORE.NORMAL;
    const factor = Number(multiplier);
    return Math.round(base * (Number.isFinite(factor) && factor > 1 ? factor : 1));
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const score = Math.floor(Number(raw.score));
    if (!Number.isFinite(score) || score < 1) return null;
    const streak = Math.floor(Number(raw.bestStreak));
    const answered = Math.floor(Number(raw.answered));
    const playedAt = Math.floor(Number(raw.playedAt));
    return {
      score: Math.min(score, 1000000),
      bestStreak: Number.isFinite(streak) && streak > 0 ? Math.min(streak, 100000) : 0,
      answered: Number.isFinite(answered) && answered > 0 ? Math.min(answered, 100000) : 0,
      playedAt: Number.isFinite(playedAt) && playedAt > 0 ? playedAt : 0
    };
  }

  function sanitizeBoard(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list
      .map(normalizeEntry)
      .filter(Boolean)
      .sort((a, b) => (b.score - a.score) || (b.bestStreak - a.bestStreak) || (b.playedAt - a.playedAt))
      .slice(0, BOARD_SIZE);
  }

  /* A new run enters the board sorted; the rank is 1-based and 0 when it missed. */
  function recordScore(board, entry, now) {
    const normalized = normalizeEntry({
      score: entry?.score,
      bestStreak: entry?.bestStreak,
      answered: entry?.answered,
      playedAt: now
    });
    if (!normalized) return { board: sanitizeBoard(board), rank: 0, isRecord: false };
    const next = [...sanitizeBoard(board), normalized].sort(
      (a, b) => (b.score - a.score) || (b.bestStreak - a.bestStreak) || (b.playedAt - a.playedAt)
    ).slice(0, BOARD_SIZE);
    const rank = next.indexOf(normalized) + 1;
    return { board: next, rank, isRecord: rank === 1 && next.length > 1 };
  }

  function summarizeBoard(board) {
    const clean = sanitizeBoard(board);
    return {
      played: clean.length,
      best: clean[0] ? clean[0].score : 0,
      bestStreak: clean.reduce((top, entry) => Math.max(top, entry.bestStreak), 0),
      recent: clean[0] ? clean[0].playedAt : 0
    };
  }

  global.GeonArcade = {
    STAGES,
    QUESTIONS_PER_STAGE,
    BOARD_SIZE,
    BLITZ_SECONDS,
    BLITZ_CORRECT_BONUS,
    BLITZ_WRONG_PENALTY,
    BASE_SCORE,
    stageForQuestion,
    scoreForDifficulty,
    sanitizeBoard,
    recordScore,
    summarizeBoard
  };
})(window);
