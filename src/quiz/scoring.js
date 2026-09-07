/* Shared scoring API. */
(function (global) {
  "use strict";
  global.GeonScoring = {
    calculateAnswerReward: global.GeonGameCore.calculateAnswerReward,
    milestoneReward: global.GeonGameCore.milestoneReward,
    rewardBand: global.GeonGameCore.rewardBand
  };
})(window);
