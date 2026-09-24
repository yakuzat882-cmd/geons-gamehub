/*
 * Achievement Hall rules: rarity tiers and live progress for the special
 * achievement registry. Pure helpers. The script layer builds the snapshot
 * from the real counters and owns the panel.
 */
(function (global) {
  "use strict";

  const RARITY = Object.freeze({
    special_perfect_level: "COMMON",
    special_survivor: "COMMON",
    special_speed_quizzer: "COMMON",
    special_streak_master: "RARE",
    special_subject_math: "RARE",
    special_subject_psychology: "RARE",
    special_subject_science: "RARE",
    special_subject_tech1: "RARE",
    special_subject_tech2: "RARE",
    special_coin_collector: "RARE",
    special_point_collector: "EPIC",
    special_grand_master: "LEGENDARY"
  });

  const RARITY_ORDER = Object.freeze(["COMMON", "RARE", "EPIC", "LEGENDARY"]);

  function rarityFor(id) {
    return RARITY[id] || "COMMON";
  }

  /*
   * snapshot = {
   *   bestStreak, perfectLevels, points, coins,
   *   subjectLevels: { MATH: number, PSYCHOLOGY: number, ... },
   *   totalCompletedLevels
   * }
   * Progress comes back as a clamped { current, target, ratio } and means
   * "how close to first unlock"; an unlocked card ignores it.
   */
  function progressFor(id, snapshot) {
    const view = snapshot && typeof snapshot === "object" ? snapshot : {};
    const levels = view.subjectLevels && typeof view.subjectLevels === "object" ? view.subjectLevels : {};
    const subjects = ["MATH", "PSYCHOLOGY", "SCIENCE", "TECH 1", "TECH 2"];
    const clamp = (current, target) => {
      const goal = Math.max(1, Math.floor(Number(target) || 1));
      const value = Math.max(0, Math.min(Math.floor(Number(current) || 0), goal));
      return { current: value, target: goal, ratio: value / goal };
    };

    switch (id) {
      case "special_streak_master":
        return clamp(view.bestStreak, 10);
      case "special_perfect_level":
        return clamp(view.perfectLevels, 1);
      case "special_survivor":
        return clamp(view.totalCompletedLevels, 1);
      case "special_speed_quizzer":
        return clamp(0, 1);
      case "special_point_collector":
        return clamp(view.points, 1000);
      case "special_coin_collector":
        return clamp(view.coins, 100);
      case "special_grand_master":
        return clamp(subjects.reduce((sum, subject) => sum + Math.min(80, Number(levels[subject]) || 0), 0), 400);
      default: {
        const match = /^special_subject_(math|psychology|science|tech1|tech2)$/.exec(String(id));
        if (!match) return { current: 0, target: 1, ratio: 0 };
        const name = { math: "MATH", psychology: "PSYCHOLOGY", science: "SCIENCE", tech1: "TECH 1", tech2: "TECH 2" }[match[1]];
        return clamp(levels[name], 80);
      }
    }
  }

  function summarize(state, snapshot, definitionIds) {
    const ids = Array.isArray(definitionIds) ? definitionIds : [];
    const counts = { total: ids.length, unlocked: 0, byRarity: {} };
    RARITY_ORDER.forEach(tier => { counts.byRarity[tier] = { total: 0, unlocked: 0 }; });
    ids.forEach(id => {
      const tier = rarityFor(id);
      counts.byRarity[tier].total += 1;
      if (state?.[id]?.unlocked) {
        counts.unlocked += 1;
        counts.byRarity[tier].unlocked += 1;
      }
    });
    return counts;
  }

  global.GeonAchievements = {
    RARITY,
    RARITY_ORDER,
    rarityFor,
    progressFor,
    summarize
  };
})(window);
