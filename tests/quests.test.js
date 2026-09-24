/*
 * Quest board and weak-spot training tests.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function loadModule(relativePath) {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), "utf8"), context);
  return context.window;
}

const quests = loadModule("src/progression/quests.js").GeonQuests;
const weak = loadModule("src/progression/weakSpot.js").GeonWeakSpot;
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

/* ----------------------------------------------------------------- quest board */

test("daily and weekly boards are deterministic per questioner and cycle", () => {
  const day = "2026-09-18";
  const first = quests.questsForDay(day, "previous");
  const second = quests.questsForDay(day, "previous");
  const other = quests.questsForDay(day, "new");
  assert.equal(first.length, quests.QUEST_COUNT);
  assert.deepEqual(first.map(q => q.id), second.map(q => q.id), "same day, same board");
  assert.notDeepEqual(first.map(q => q.id), other.map(q => q.id), "questioners do not share a board");
  assert.equal(new Set(first.map(q => q.id)).size, quests.QUEST_COUNT, "no quest appears twice");
  for (const quest of first.concat(quests.questsForWeek(quests.isoWeekKey(day), "previous"))) {
    assert.ok(quest.label.length > 0 && quest.target > 0, `well-formed quest ${quest.id}`);
  }
});

test("empty and cross-day caches never bleed between cycles", () => {
  assert.equal(quests.pickDeterministic([], 3, "seed").length, 0);
  const a = quests.questsForDay("2026-09-17", "previous").map(q => q.id).join("|");
  const b = quests.questsForDay("2026-09-18", "previous").map(q => q.id).join("|");
  assert.notEqual(a, b, "the board changes with the date");
});

test("iso week keys wrap correctly at year boundaries", () => {
  assert.equal(quests.isoWeekKey("2026-01-01"), "2026-W01", "New Year's Day 2026 is a Thursday, so ISO week one");
  assert.equal(quests.isoWeekKey("2026-09-14"), "2026-W38");
  assert.equal(quests.isoWeekKey("garbage"), "");
});

test("counters clamp garbage and progress only completes at the target", () => {
  const counters = quests.sanitizeCounters({ answered: 29.9, perfect: -3, streak: "x" });
  assert.equal(counters.answered, 29);
  assert.equal(counters.perfect, 0);
  const definition = { id: "x", field: "answered", target: 30 };
  assert.equal(quests.progressOf(definition, counters).done, false);
  counters.answered = 30;
  const done = quests.progressOf(definition, counters);
  assert.equal(done.done, true);
  assert.equal(done.ratio, 1);
  assert.equal(quests.progressOf(null, counters).target, 1);
});

test("claimable lists only finished, unclaimed quests", () => {
  const defs = [
    { id: "a", field: "answered", target: 2 },
    { id: "b", field: "perfect", target: 1 },
    { id: "c", field: "streak", target: 5 }
  ];
  const boards = { answered: 10, perfect: 1, streak: 5 };
  assert.equal(quests.claimable(defs, boards, []).map(q => q.id).join(","), "a,b,c");
  assert.equal(quests.claimable(defs, boards, ["b"]).map(q => q.id).join(","), "a,c");
  assert.equal(quests.claimable(defs, {}, []).length, 0);
  assert.equal(quests.sanitizeClaimIds(["b", "b", "", 42]).join(","), "b,42", "claims dedupe and drop junk");
});

/* ----------------------------------------------------------------- weak spots */

test("category stats only count real categories and keep correct ≤ total", () => {
  const stats = weak.sanitizeCategoryStats({
    "MATH|ADDITION": { total: 8, correct: 5 },
    "MATH|ADDITION|BROKEN": { total: 9, correct: 9 },
    "MATH": { total: 3, correct: 3 },
    "PSY|BIAS": { total: "bad", correct: 1 },
    "SCI|GAS": { total: 5, correct: 7 }
  });
  assert.equal(Object.keys(stats).length, 2);
  assert.equal(stats["SCI|GAS"].correct, 5, "correct is clamped to total");
});

test("a category becomes weak only after enough attempts under the threshold", () => {
  let stats = {};
  for (let trial = 0; trial < 6; trial += 1) stats = weak.record(stats, "SCIENCE", "GAS LAWS", trial % 3 === 0);
  const spot = weak.weakSpotOf(stats);
  assert.ok(spot, "2/6 accuracy must be flagged");
  assert.equal(spot.category, "GAS LAWS");
  assert.equal(spot.total, 6);
  for (let trial = 0; trial < 20; trial += 1) stats = weak.record(stats, "SCIENCE", "GAS LAWS", true);
  assert.equal(weak.weakSpotOf(stats), null, "recovering past 70% clears the weak spot");
  assert.equal(weak.weakSpotOf({ "MATH|ADD": { total: 3, correct: 0 } }), null, "too few attempts to judge");
});

test("the weakest of several categories wins deterministically", () => {
  let stats = {};
  stats = weak.record(stats, "MATH", "SUMS", true);
  for (let trial = 0; trial < 5; trial += 1) stats = weak.record(stats, "MATH", "SUMS", true);
  for (let trial = 0; trial < 8; trial += 1) stats = weak.record(stats, "TECH 1", "SAFETY", false);
  stats = weak.record(stats, "TECH 1", "SAFETY", true);
  for (let trial = 0; trial < 10; trial += 1) stats = weak.record(stats, "PSYCHOLOGY", "FRAMING", trial < 4);
  const spot = weak.weakSpotOf(stats);
  assert.equal(spot.category, "SAFETY", "1/9 is weaker than 4/10");
  const ranked = weak.rankedCategories(stats);
  assert.equal(ranked[0].category, "SAFETY");
  assert.ok(ranked.every((row, i, arr) => i === 0 || arr[i - 1].accuracy <= row.accuracy), "sorted weakest first");
});

/* ------------------------------------------------------------------- wiring */

test("quest counters roll over with the date and stay per questioner", () => {
  assert.match(script, /const QUEST_COUNTERS_KEY = "proudGeonQuizQuestCountersV1"/);
  assert.match(script, /function questStorageKey\(base\)[\s\S]{0,120}:new/);
  assert.match(script, /byScope\.day && byScope\.day\.date === today/, "a new day starts a fresh counter set");
  assert.match(script, /helpers\.isoWeekKey\(today\)/, "weekly counters key off the ISO week");
});

test("every gameplay event feeds the board", () => {
  const hooks = [
    /registerCorrectStreakAnswer\(\);\s*raiseQuestCounter\("streak", quizState\.streak\)/,
    /if \(speedBonus\) bumpQuestCounter\("fast", 1\)/,
    /function finishArcadeRun[\s\S]{0,900}raiseQuestCounter\(mode === "survival" \? "survivalBest" : "blitzBest"/,
    /if \(result\.retired\) bumpQuestCounter\("retired", 1\)/,
    /saveDailyChallengeState\(state\);\s*bumpQuestCounter\("dailyDone", 1\)/,
    /grantBossChest\(levelCompleted\);\s*bumpQuestCounter\("bossBeaten", 1\)/,
    /saveStarRatings\(ratings\);\s*bumpQuestCounter\("stars", stars\)/,
    /itemInventory\[id\] = safeNonNegativeInt\(itemInventory\[id\], 0, 999\) \+ 1;\s*bumpQuestCounter\("spent", item\.price\)/,
    /addPerfectLevel\(\);\s*bumpQuestCounter\("perfect", 1\)/
  ];
  for (const pattern of hooks) assert.match(script, pattern, pattern);
  assert.ok((script.match(/bumpQuestCounter\("answered", 1\)/g) || []).length >= 3, "answered is bumped on correct, wrong and declined paths");
});

test("claiming pays coins and items exactly once", () => {
  assert.match(script, /function claimQuest\(id\)/);
  assert.match(script, /const coins = safeNonNegativeInt\(definition\.reward\?\.coins, 0\);/);
  assert.match(script, /gameData\.coins = safeNonNegativeInt\(gameData\.coins, 0\) \+ coins;/);
  /* saveGlobalGameData copies quizState.coins back over gameData.coins, so the
     live wallet must be raised too, or the next save silently erases the payout. */
  assert.match(script, /quizState\.coins = safeNonNegativeInt\(quizState\.coins, 0\) \+ coins;/,
    "claims must keep quizState.coins in step — the save system copies quizState back over gameData");
  assert.match(script, /itemInventory\[itemId\] = safeNonNegativeInt\(itemInventory\[itemId\], 0\) \+ count;/);
  assert.match(script, /sanitizeClaimIds\(\[\.\.\.board\.claims\.day\.ids, id\]\)/, "the claim is saved before the payout feedback");
  assert.match(script, /const definition = fromDay \|\| fromWeek;\s*if \(!definition\) return false;/, "no definition, no payout");
});

test("weak-spot training drills the weakest category as free practice", () => {
  assert.match(script, /function recordCategoryAnswerStat\(/);
  assert.ok((script.match(/recordCategoryAnswerStat\(quizState\.subject/g) || []).length === 3, "recorded on correct, wrong and declined paths");
  assert.match(script, /if \(!helpers \|\| isPracticeMode\(\)\) return;/, "practice sessions do not affect the stats");
  assert.match(script, /startMistakeVaultDrill\(shuffleArray\(\[\.\.\.pool\]\)\.slice\(0, 10\), "TRAIN"\)/);
  assert.match(script, /customQuestions = null, drillLabel = "PRACTICE"/);
  assert.match(script, /\$\{quizState\.drillLabel \|\| "PRACTICE"\} \$\{level\}/);
});

test("the quest board interface exists and stays themeable", () => {
  for (const id of ["questBoardCard", "questBoardPanel", "questBoardDaily", "questBoardWeekly", "weakSpotStatus", "weakSpotTrainButton"]) {
    assert.ok(html.includes(`id="${id}"`), `missing element: ${id}`);
  }
  assert.match(html, /<script src="src\/progression\/quests\.js"><\/script>/);
  assert.match(html, /<script src="src\/progression\/weakSpot\.js"><\/script>/);
  for (const selector of [".quest-board-card", ".quest-board-panel", ".quest-row", ".quest-bar", ".quest-claim", ".quest-training"]) {
    assert.ok(css.includes(selector), `missing style: ${selector}`);
  }
  const section = css.slice(css.indexOf("QUEST BOARD + WEAK-SPOT TRAINING"));
  assert.ok(!/#[0-9a-f]{3,6}/i.test(section.replace(/rgba?\([^)]*\)/g, "")), "quest styles must use theme tokens");
});
