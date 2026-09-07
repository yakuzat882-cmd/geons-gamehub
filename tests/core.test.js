const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "src/gameCore.js"), "utf8"), context);
const core = context.window.GeonGameCore;

test("numeric sanitization clamps invalid values", () => {
  assert.equal(core.safeInt(-5, 3), 0);
  assert.equal(core.safeInt("abc", 3), 3);
  assert.equal(core.safeInt(99.9, 0, 80), 80);
});

test("question banks contain exactly 80 levels per path", () => {
  for (const filename of ["questions.json", "questions.new.json"]) {
    const bank = JSON.parse(fs.readFileSync(path.join(root, filename), "utf8"));
    const report = core.validateQuestionBank(bank);
    assert.equal(report.valid, true, `${filename}: ${report.errors.join("; ")}`);
    assert.equal(report.total, 800);
  }
});

test("reward bands remain compatible", () => {
  assert.equal(JSON.stringify(core.rewardBand(1)), JSON.stringify({ maxLevel:20, score:50, coins:5, points:10 }));
  assert.equal(JSON.stringify(core.rewardBand(20)), JSON.stringify({ maxLevel:20, score:50, coins:5, points:10 }));
  assert.equal(JSON.stringify(core.rewardBand(21)), JSON.stringify({ maxLevel:40, score:100, coins:10, points:20 }));
  assert.equal(JSON.stringify(core.rewardBand(41)), JSON.stringify({ maxLevel:60, score:175, coins:15, points:35 }));
  assert.equal(JSON.stringify(core.rewardBand(61)), JSON.stringify({ maxLevel:80, score:300, coins:25, points:60 }));
});

test("streak milestone rewards are exact and one milestone is returned at a time", () => {
  assert.equal(core.milestoneReward(2), null);
  assert.equal(JSON.stringify(core.milestoneReward(3)), JSON.stringify({score:25,coins:0,points:0,name:"HOT START"}));
  assert.equal(JSON.stringify(core.milestoneReward(5)), JSON.stringify({score:50,coins:5,points:0,name:"ON FIRE"}));
  assert.equal(JSON.stringify(core.milestoneReward(10)), JSON.stringify({score:100,coins:10,points:10,name:"UNSTOPPABLE"}));
  assert.equal(JSON.stringify(core.milestoneReward(15)), JSON.stringify({score:150,coins:15,points:15,name:"QUIZ MASTER"}));
  assert.equal(JSON.stringify(core.milestoneReward(20)), JSON.stringify({score:250,coins:25,points:25,name:"LEGENDARY"}));
});

test("correct answer scoring applies only the score combo bonus", () => {
  assert.equal(core.calculateAnswerReward({level:1, correct:false, streak:20}).score, 0);
  assert.equal(core.calculateAnswerReward({level:1, correct:true, streak:0}).score, 50);
  assert.equal(core.calculateAnswerReward({level:1, correct:true, streak:5}).score, 75);
  assert.equal(core.calculateAnswerReward({level:61, correct:true, streak:20}).score, 900);
});

test("save sanitization creates schema version 2 without trusting arbitrary values", () => {
  const save = core.sanitizeSave({ economy: { coins: "-5", points: "42.8" }, player: { codeName: "X".repeat(100) } });
  assert.equal(save.schemaVersion, 2);
  assert.equal(save.economy.coins, 0);
  assert.equal(save.economy.points, 42);
  assert.equal(save.player.codeName.length, 24);
});

test("save sanitization preserves nested progress and rejects corrupt collections", () => {
  const save = core.sanitizeSave({
    quizProgress: { MATH: { "SUBJECT 1": 81, "SUBJECT 2": -2 } },
    titles: { MATH: { "SUBJECT 1": 5 } },
    usedQuestionIds: { "MATH:SUBJECT 1": ["q1", "q1", null, "q2"] },
    inventory: { hint: -4, lifeToken: 3 },
    settings: []
  });
  assert.equal(save.quizProgress.MATH["SUBJECT 1"], 80);
  assert.equal(save.quizProgress.MATH["SUBJECT 2"], 0);
  assert.equal(save.titles.MATH["SUBJECT 1"], 5);
  assert.equal(JSON.stringify(save.usedQuestionIds["MATH:SUBJECT 1"]), JSON.stringify(["q1", "q2"]));
  assert.equal(save.inventory.hint, 0);
  assert.equal(save.inventory.lifeToken, 3);
  assert.equal(save.settings.theme, "original");
  assert.equal(save.settings.questioner, "previous");
  assert.equal(save.settings.music, true);
});

test("save sanitization preserves bounded extended snapshot state", () => {
  const save = core.sanitizeSave({
    bestStreak: { bestStreak: 100001 },
    subjectStats: { previous: { MATH: { highestLevel: 81, correct: 4 } } },
    dailyChallenges: {
      "proudGeonDailyChallenge:previous:2026-08-27": {
        questionIds: ["a", "a", "b"], completed: 1, rewardClaimed: 0, attempts: -2
      }
    },
    settings: { theme: "neon-voyage", questioner: "invalid" }
  });
  assert.equal(save.bestStreak.bestStreak, 100000);
  assert.equal(save.subjectStats.previous.MATH.highestLevel, 81);
  assert.equal(JSON.stringify(save.dailyChallenges["proudGeonDailyChallenge:previous:2026-08-27"].questionIds), JSON.stringify(["a", "b"]));
  assert.equal(save.dailyChallenges["proudGeonDailyChallenge:previous:2026-08-27"].attempts, 0);
  assert.equal(save.settings.theme, "original");
  assert.equal(save.settings.questioner, "previous");
});
