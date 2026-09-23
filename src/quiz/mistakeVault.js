/*
 * Mistake Vault data rules.
 *
 * Pure helpers only: entries in, entries out. The script layer owns localStorage,
 * the question banks and the quiz screen. A question leaves the vault after it is
 * answered correctly twice in a row (a small Leitner box).
 */
(function (global) {
  "use strict";

  const MAX_ENTRIES = 150;
  const REQUIRED_CORRECT = 2;
  const DRILL_SIZE = 10;

  function safeText(value, maxLength) {
    return String(value ?? "").trim().slice(0, maxLength);
  }

  function normalizeEntry(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const id = safeText(raw.id, 90);
    if (!id) return null;
    const correctStreak = Math.floor(Number(raw.correctStreak));
    const addedAt = Math.floor(Number(raw.addedAt));
    return {
      id,
      subject: safeText(raw.subject, 30),
      quizType: safeText(raw.quizType, 30),
      category: safeText(raw.category, 60),
      correctStreak: Number.isFinite(correctStreak) ? Math.min(REQUIRED_CORRECT, Math.max(0, correctStreak)) : 0,
      addedAt: Number.isFinite(addedAt) && addedAt > 0 ? addedAt : 0
    };
  }

  function sanitizeVault(raw) {
    const list = Array.isArray(raw) ? raw : [];
    const seen = new Set();
    const entries = [];
    for (const item of list) {
      const entry = normalizeEntry(item);
      if (!entry || seen.has(entry.id)) continue;
      seen.add(entry.id);
      entries.push(entry);
      if (entries.length >= MAX_ENTRIES) break;
    }
    return entries;
  }

  /* A wrong answer (re)enters the vault with its progress reset. */
  function addMistake(entries, question, now) {
    const entry = normalizeEntry({
      id: question?.id,
      subject: question?.subject,
      quizType: question?.quizType || question?.quizPath,
      category: question?.category,
      correctStreak: 0,
      addedAt: now
    });
    if (!entry) return sanitizeVault(entries);
    const rest = sanitizeVault(entries).filter(item => item.id !== entry.id);
    return [entry, ...rest].slice(0, MAX_ENTRIES);
  }

  function recordResult(entries, questionId, correct, now) {
    const id = safeText(questionId, 90);
    const list = sanitizeVault(entries);
    if (!id) return { entries: list, retired: false, cleared: false };
    const index = list.findIndex(item => item.id === id);
    if (index < 0) return { entries: list, retired: false, cleared: false };

    const entry = list[index];
    if (!correct) {
      const updated = { ...entry, correctStreak: 0, addedAt: now || entry.addedAt };
      return { entries: [updated, ...list.filter((_, position) => position !== index)], retired: false, cleared: false };
    }

    const streak = Math.min(REQUIRED_CORRECT, entry.correctStreak + 1);
    if (streak >= REQUIRED_CORRECT) {
      const remaining = list.filter((_, position) => position !== index);
      return { entries: remaining, retired: true, cleared: remaining.length === 0 };
    }
    const updated = { ...entry, correctStreak: streak };
    return { entries: [updated, ...list.filter((_, position) => position !== index)], retired: false, cleared: false };
  }

  function summarize(entries) {
    const list = sanitizeVault(entries);
    const subjects = {};
    list.forEach(entry => {
      if (!entry.subject) return;
      subjects[entry.subject] = (subjects[entry.subject] || 0) + 1;
    });
    return {
      total: list.length,
      subjects,
      retryReady: list.length,
      drillable: Math.min(DRILL_SIZE, list.length)
    };
  }

  function pickForDrill(entries, limit) {
    const size = Math.max(1, Math.min(DRILL_SIZE, Math.floor(Number(limit)) || DRILL_SIZE));
    return sanitizeVault(entries).slice(0, size);
  }

  global.GeonMistakeVault = {
    MAX_ENTRIES,
    REQUIRED_CORRECT,
    DRILL_SIZE,
    sanitizeVault,
    addMistake,
    recordResult,
    summarize,
    pickForDrill
  };
})(window);
