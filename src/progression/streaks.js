/* Streak helpers are intentionally pure; gameplay state remains in script.js. */
(function (global) {
  "use strict";
  const milestones = [3, 5, 10, 15, 20];
  global.GeonStreaks = {
    next(streak) { return Math.max(0, Number(streak) || 0) + 1; },
    reset() { return 0; },
    milestone(streak) { return milestones.includes(Number(streak)) ? global.GeonGameCore.milestoneReward(streak) : null; }
  };
})(window);
