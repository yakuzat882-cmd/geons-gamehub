/*
 * Level twist modifiers for the normal quiz.
 *
 * A level plays the same way every time it is opened: the modifier is derived from
 * the questioner, subject, quiz set and level number with a small deterministic hash.
 * Nothing here touches the question data or the save schema.
 */
(function (global) {
  "use strict";

  const MODIFIERS = Object.freeze({
    NONE: Object.freeze({
      id: "NONE",
      label: "",
      icon: "",
      description: "",
      coinMultiplier: 1,
      timerDelta: 0,
      blocksHint: false,
      hidesChoice: false,
      suddenDeath: false
    }),
    DOUBLE_COINS: Object.freeze({
      id: "DOUBLE_COINS",
      label: "DOUBLE COINS",
      icon: "🪙",
      description: "Every coin earned on this level is doubled.",
      coinMultiplier: 2,
      timerDelta: 0,
      blocksHint: false,
      hidesChoice: false,
      suddenDeath: false
    }),
    TIME_RUSH: Object.freeze({
      id: "TIME_RUSH",
      label: "TIME RUSH",
      icon: "⏱️",
      description: "The timer is shorter on this level.",
      coinMultiplier: 1,
      timerDelta: -15,
      blocksHint: false,
      hidesChoice: false,
      suddenDeath: false
    }),
    NO_HINT: Object.freeze({
      id: "NO_HINT",
      label: "NO HINT",
      icon: "🚫",
      description: "Hints are disabled on this level.",
      coinMultiplier: 1,
      timerDelta: 0,
      blocksHint: true,
      hidesChoice: false,
      suddenDeath: false
    }),
    MYSTERY: Object.freeze({
      id: "MYSTERY",
      label: "MYSTERY",
      icon: "❓",
      description: "One wrong answer is hidden until the question is locked.",
      coinMultiplier: 1,
      timerDelta: 0,
      blocksHint: false,
      hidesChoice: true,
      suddenDeath: false
    }),
    SUDDEN_DEATH: Object.freeze({
      id: "SUDDEN_DEATH",
      label: "SUDDEN DEATH",
      icon: "☠️",
      description: "One wrong answer ends the run.",
      coinMultiplier: 1,
      timerDelta: 0,
      blocksHint: false,
      hidesChoice: false,
      suddenDeath: true
    })
  });

  /* Roughly 60% of levels carry a twist; DOUBLE COINS shows up twice as often. */
  const ROTATION = Object.freeze([
    "NONE",
    "DOUBLE_COINS",
    "NONE",
    "TIME_RUSH",
    "NONE",
    "MYSTERY",
    "DOUBLE_COINS",
    "NONE",
    "NO_HINT",
    "SUDDEN_DEATH"
  ]);

  const MIN_TIMER_SECONDS = 12;

  function hashKey(key) {
    let hash = 2166136261;
    const text = String(key);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /* Only a real level number (1-80) can carry a twist; anything else is ignored. */
  function normalizeLevel(level) {
    const value = Math.floor(Number(level));
    if (!Number.isFinite(value) || value < 1 || value > 80) return 0;
    return value;
  }

  /*
   * A level with no valid key (reviewer, daily challenge, practice drills) gets no
   * modifier at all, so those modes keep their existing behaviour.
   */
  function getLevelModifier(subject, quizType, level, questioner) {
    const safeLevel = normalizeLevel(level);
    if (!subject || !quizType || safeLevel < 1) return MODIFIERS.NONE;
    const key = `${questioner || "previous"}|${subject}|${quizType}|${safeLevel}`;
    const chosen = ROTATION[hashKey(key) % ROTATION.length];
    return MODIFIERS[chosen] || MODIFIERS.NONE;
  }

  function applyTimerModifier(seconds, modifier) {
    const base = Math.floor(Number(seconds));
    const safeBase = Number.isFinite(base) && base > 0 ? base : MIN_TIMER_SECONDS;
    const delta = Math.floor(Number(modifier?.timerDelta) || 0);
    return Math.max(MIN_TIMER_SECONDS, safeBase + delta);
  }

  function coinMultiplierFor(modifier) {
    const value = Number(modifier?.coinMultiplier);
    return Number.isFinite(value) && value >= 1 ? value : 1;
  }

  function describeModifier(modifier) {
    const entry = modifier && modifier.id ? modifier : MODIFIERS.NONE;
    if (entry.id === "NONE") return "";
    return `${entry.icon} ${entry.label} — ${entry.description}`;
  }

  function hasTwist(modifier) {
    return Boolean(modifier && modifier.id && modifier.id !== "NONE");
  }

  global.GeonLevelModifiers = {
    MODIFIERS,
    ROTATION,
    MIN_TIMER_SECONDS,
    getLevelModifier,
    applyTimerModifier,
    coinMultiplierFor,
    describeModifier,
    hasTwist
  };
})(window);
