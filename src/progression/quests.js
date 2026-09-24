/*
 * Daily and weekly quest board rules.
 *
 * Pure helpers only. Quests are chosen deterministically from the date (or ISO
 * week) and the questioner, so the board is the same all day and resets on its
 * own without timers. The script layer owns storage and payouts.
 */
(function (global) {
  "use strict";

  const COUNTER_FIELDS = Object.freeze([
    "answered",
    "perfect",
    "fast",
    "streak",
    "survivalBest",
    "blitzBest",
    "retired",
    "dailyDone",
    "bossBeaten",
    "stars",
    "spent"
  ]);

  const DAILY_POOL = Object.freeze([
    Object.freeze({ id: "daily_answered", icon: "📝", label: "Answer 30 questions", field: "answered", target: 30, reward: Object.freeze({ coins: 40 }) }),
    Object.freeze({ id: "daily_perfect", icon: "🏅", label: "Earn 2 perfect levels", field: "perfect", target: 2, reward: Object.freeze({ coins: 30, items: Object.freeze({ hint: 1 }) }) }),
    Object.freeze({ id: "daily_fast", icon: "⚡", label: "Score 5 fast answers", field: "fast", target: 5, reward: Object.freeze({ coins: 25 }) }),
    Object.freeze({ id: "daily_streak", icon: "🔥", label: "Reach a streak of 10", field: "streak", target: 10, reward: Object.freeze({ coins: 30 }) }),
    Object.freeze({ id: "daily_survival", icon: "❤️", label: "Survive 8 questions in one run", field: "survivalBest", target: 8, reward: Object.freeze({ coins: 30 }) }),
    Object.freeze({ id: "daily_blitz", icon: "⚡", label: "Score 120 in one Blitz run", field: "blitzBest", target: 120, reward: Object.freeze({ coins: 35 }) }),
    Object.freeze({ id: "daily_retire", icon: "🧰", label: "Clear 2 vault mistakes", field: "retired", target: 2, reward: Object.freeze({ coins: 25, items: Object.freeze({ fiftyFifty: 1 }) }) }),
    Object.freeze({ id: "daily_daily", icon: "🏆", label: "Finish the Daily Challenge", field: "dailyDone", target: 1, reward: Object.freeze({ coins: 30 }) }),
    Object.freeze({ id: "daily_boss", icon: "👹", label: "Beat a boss chain", field: "bossBeaten", target: 1, reward: Object.freeze({ coins: 35 }) }),
    Object.freeze({ id: "daily_stars", icon: "⭐", label: "Earn 6 level stars", field: "stars", target: 6, reward: Object.freeze({ coins: 30 }) }),
    Object.freeze({ id: "daily_spent", icon: "🛒", label: "Spend 150 coins in the shop", field: "spent", target: 150, reward: Object.freeze({ coins: 20 }) })
  ]);

  const WEEKLY_POOL = Object.freeze([
    Object.freeze({ id: "weekly_answered", icon: "📚", label: "Answer 200 questions this week", field: "answered", target: 200, reward: Object.freeze({ coins: 150, items: Object.freeze({ hint: 1 }) }) }),
    Object.freeze({ id: "weekly_perfect", icon: "💯", label: "Earn 10 perfect levels this week", field: "perfect", target: 10, reward: Object.freeze({ coins: 120, items: Object.freeze({ secondChance: 1 }) }) }),
    Object.freeze({ id: "weekly_retire", icon: "🧰", label: "Clear 8 vault mistakes this week", field: "retired", target: 8, reward: Object.freeze({ coins: 90, items: Object.freeze({ fiftyFifty: 1 }) }) }),
    Object.freeze({ id: "weekly_daily", icon: "🗓️", label: "Finish 4 Daily Challenges this week", field: "dailyDone", target: 4, reward: Object.freeze({ coins: 100 }) }),
    Object.freeze({ id: "weekly_boss", icon: "⚔️", label: "Beat 4 boss chains this week", field: "bossBeaten", target: 4, reward: Object.freeze({ coins: 120, items: Object.freeze({ lifeToken: 1 }) }) }),
    Object.freeze({ id: "weekly_stars", icon: "🌟", label: "Earn 30 level stars this week", field: "stars", target: 30, reward: Object.freeze({ coins: 100 }) }),
    Object.freeze({ id: "weekly_survival", icon: "🏰", label: "Survive 20 questions in one run", field: "survivalBest", target: 20, reward: Object.freeze({ coins: 110, items: Object.freeze({ timeBoost: 1 }) }) }),
    Object.freeze({ id: "weekly_blitz", icon: "🚀", label: "Score 400 in one Blitz run", field: "blitzBest", target: 400, reward: Object.freeze({ coins: 130 }) }),
    Object.freeze({ id: "weekly_spent", icon: "🛍️", label: "Spend 400 coins in the shop this week", field: "spent", target: 400, reward: Object.freeze({ coins: 80 }) })
  ]);

  const QUEST_COUNT = 3;

  function hashKey(key) {
    let hash = 2166136261;
    const text = String(key);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  /* Deterministic distinct pick; the same seed always gives the same board. */
  function pickDeterministic(pool, count, seed) {
    if (!Array.isArray(pool) || pool.length === 0) return [];
    const total = pool.length;
    const amount = Math.max(1, Math.min(count, total));
    const start = hashKey(seed) % total;
    const stride = 1 + (hashKey(`${seed}|stride`) % Math.max(1, total - 1));
    const picked = [];
    const seen = new Set();
    let cursor = start;
    while (picked.length < amount && seen.size < total) {
      if (!seen.has(cursor)) {
        seen.add(cursor);
        picked.push(pool[cursor]);
      }
      cursor = (cursor + stride) % total;
    }
    return picked;
  }

  function isoWeekKey(dateStr) {
    const parts = String(dateStr).split("-").map(Number);
    if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return "";
    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (Number.isNaN(utcDate.getTime())) return "";
    const day = (utcDate.getUTCDay() + 6) % 7;
    utcDate.setUTCDate(utcDate.getUTCDate() - day + 3);
    const year = utcDate.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(year, 0, 4));
    const firstDay = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
    const week = 1 + Math.round((utcDate - firstThursday) / (7 * 24 * 3600 * 1000));
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  function questsForDay(dateStr, questioner) {
    return pickDeterministic(DAILY_POOL, QUEST_COUNT, `day|${dateStr}|${questioner || "previous"}`);
  }

  function questsForWeek(weekKey, questioner) {
    return pickDeterministic(WEEKLY_POOL, QUEST_COUNT, `week|${weekKey}|${questioner || "previous"}`);
  }

  function sanitizeCounters(raw) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const clean = {};
    COUNTER_FIELDS.forEach(field => {
      const value = Math.floor(Number(source[field]));
      clean[field] = Number.isFinite(value) && value > 0 ? Math.min(value, 100000) : 0;
    });
    return clean;
  }

  function progressOf(definition, counters) {
    if (!definition || !definition.field) return { current: 0, target: 1, done: false, ratio: 0 };
    const clean = sanitizeCounters(counters);
    const target = Math.max(1, Math.floor(Number(definition.target) || 1));
    const current = Math.min(100000, Math.max(0, clean[definition.field] || 0));
    return {
      current,
      target,
      done: current >= target,
      ratio: Math.min(1, current / target)
    };
  }

  function sanitizeClaimIds(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return [...new Set(list.map(id => String(id).slice(0, 40)).filter(id => id.length > 0))];
  }

  function claimable(definitions, counters, claimIds) {
    const claimed = new Set(sanitizeClaimIds(claimIds));
    return (Array.isArray(definitions) ? definitions : []).filter(
      definition => !claimed.has(definition.id) && progressOf(definition, counters).done
    );
  }

  global.GeonQuests = {
    COUNTER_FIELDS,
    DAILY_POOL,
    WEEKLY_POOL,
    QUEST_COUNT,
    hashKey,
    pickDeterministic,
    isoWeekKey,
    questsForDay,
    questsForWeek,
    sanitizeCounters,
    progressOf,
    sanitizeClaimIds,
    claimable
  };
})(window);
