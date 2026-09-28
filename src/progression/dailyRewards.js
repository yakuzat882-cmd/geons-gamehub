/*
 * Daily rewards: a seven-day login-streak cycle. Pure date/logic helpers so
 * the whole cycle is unit-testable against explicit dates. The script layer
 * owns storage, the payout and the panel.
 */
(function (global) {
  "use strict";

  const CYCLE = Object.freeze([
    Object.freeze({ day: 1, coins: 25, items: Object.freeze({}) }),
    Object.freeze({ day: 2, coins: 40, items: Object.freeze({}) }),
    Object.freeze({ day: 3, coins: 60, items: Object.freeze({ timeBoost: 1 }) }),
    Object.freeze({ day: 4, coins: 75, items: Object.freeze({}) }),
    Object.freeze({ day: 5, coins: 90, items: Object.freeze({ fiftyFifty: 1 }) }),
    Object.freeze({ day: 6, coins: 110, items: Object.freeze({}) }),
    Object.freeze({ day: 7, coins: 150, items: Object.freeze({ secondChance: 1, lifeToken: 1 }) })
  ]);
  const CYCLE_DAYS = CYCLE.length;

  function sanitizeState(raw) {
    const view = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const lastClaim = /^\d{4}-\d{2}-\d{2}$/.test(String(view.lastClaim || "")) ? String(view.lastClaim) : null;
    const clamp = value => Math.max(0, Math.min(36500, Math.floor(Number(value) || 0)));
    const streak = clamp(view.streak);
    return {
      lastClaim,
      streak,
      longest: Math.max(streak, clamp(view.longest))
    };
  }

  /* Yesterday of a YYYY-MM-DD string in UTC, so streaks never care about DST. */
  function yesterdayOf(dateStr) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
    if (!match) return null;
    const stamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isFinite(stamp)) return null;
    return new Date(stamp - 86400000).toISOString().slice(0, 10);
  }

  function dayOfCycle(streak) {
    return ((Math.max(1, Math.floor(Number(streak) || 1)) - 1) % CYCLE_DAYS) + 1;
  }

  function rewardForDay(day) {
    return CYCLE[dayOfCycle(day) - 1];
  }

  /*
   * What today's claim would look like without touching storage:
   * - claimed today → today is settled
   * - last claim was exactly yesterday → the streak continues
   * - anything else (new player or a missed day) → a fresh day one
   */
  function preview(state, today) {
    const view = sanitizeState(state);
    if (view.lastClaim === today) {
      const day = dayOfCycle(view.streak || 1);
      return {
        claimed: true,
        day,
        reward: rewardForDay(day),
        streak: view.streak || 1,
        longest: view.longest
      };
    }
    const streak = view.lastClaim === yesterdayOf(today) ? view.streak + 1 : 1;
    const day = dayOfCycle(streak);
    return {
      claimed: false,
      day,
      reward: rewardForDay(day),
      streak,
      longest: Math.max(view.longest, streak)
    };
  }

  /* Returns { state, day, reward } or null when today is already claimed. */
  function claim(state, today) {
    const next = preview(state, today);
    if (next.claimed) return null;
    return {
      state: { lastClaim: today, streak: next.streak, longest: next.longest },
      day: next.day,
      reward: next.reward
    };
  }

  /*
   * Cells of the weekly strip: how many days of the CURRENT cycle are done.
   * Claimed today → `day`; awaiting today's claim → `day - 1` (zero when the
   * cycle restarts at day one).
   */
  function completedDays(state, today) {
    const next = preview(state, today);
    return next.claimed ? next.day : next.day - 1;
  }

  global.GeonDailyRewards = {
    CYCLE,
    CYCLE_DAYS,
    sanitizeState,
    yesterdayOf,
    dayOfCycle,
    rewardForDay,
    preview,
    claim,
    completedDays
  };
})(window);
