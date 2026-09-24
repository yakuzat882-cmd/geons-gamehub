/*
 * Achievement Hall tests: the rarity/progress module in isolation, plus the
 * wiring that keeps the gallery honest against the live counters.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");

function loadModule(file) {
  const sandbox = {
    window: {},
    console,
    Math,
    Date,
    JSON,
    Object,
    Boolean,
    Number,
    String,
    Array,
    RegExp,
    Error
  };
  vm.createContext(sandbox);
  const code = fs.readFileSync(file, "utf8");
  new vm.Script(code, { filename: file }).runInContext(sandbox);
  return sandbox.window;
}

const hall = loadModule("src/progression/achievementGallery.js").GeonAchievements;
const script = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");

test("every registry member has a rarity and every rarity tier is ordered once", () => {
  for (const id of Object.keys(hall.RARITY)) {
    assert.ok(hall.RARITY_ORDER.includes(hall.rarityFor(id)), `${id} has a known tier`);
  }
  assert.equal(new Set(hall.RARITY_ORDER).size, hall.RARITY_ORDER.length);
  assert.equal(hall.rarityFor("never_heard_of"), "COMMON", "unknown ids degrade to COMMON");
});

test("progress clamps to its target and follows the live counters", () => {
  const snapshot = {
    bestStreak: 14,
    perfectLevels: 3,
    points: 250,
    coins: 40,
    subjectLevels: { MATH: 120, PSYCHOLOGY: 40 },
    totalCompletedLevels: 160
  };
  const streak = hall.progressFor("special_streak_master", snapshot);
  assert.equal([streak.current, streak.target, streak.ratio].join("/"), "10/10/1", "streak clamps at the unlock");
  const points = hall.progressFor("special_point_collector", snapshot);
  assert.equal([points.current, points.target, points.ratio].join("/"), "250/1000/0.25");
  const math = hall.progressFor("special_subject_math", snapshot);
  assert.equal(math.current, 80, "past completion still cites the 80-level finish line");
  const tech1 = hall.progressFor("special_subject_tech1", snapshot);
  assert.equal(tech1.current, 0);
  assert.equal(tech1.target, 80);
  const grand = hall.progressFor("special_grand_master", snapshot);
  assert.equal(grand.target, 400, "grand master needs 80 levels in all five subjects");
  assert.equal(grand.current, 120, "subject levels cap at 80 each");
  const junk = hall.progressFor("special_survivor", { totalCompletedLevels: "garbage" });
  assert.equal(junk.current, 0, "junk snapshots never fake progress");
});

test("summary counts unlocked achievements per rarity tier", () => {
  const state = {
    special_perfect_level: { unlocked: true },
    special_streak_master: { unlocked: true, date: "2026-09-18T01:00:00.000Z" }
  };
  const ids = Object.keys(hall.RARITY);
  const counts0 = hall.summarize({}, {}, ids);
  assert.equal(counts0.total, ids.length);
  assert.equal(counts0.unlocked, 0);
  const counts = hall.summarize(state, {}, ids);
  assert.equal(counts.unlocked, 2);
  assert.equal(counts.byRarity.COMMON.unlocked, 1);
  assert.equal(counts.byRarity.RARE.unlocked, 1);
  const sum = hall.RARITY_ORDER.reduce((s, t) => s + counts.byRarity[t].total, 0);
  assert.equal(sum, ids.length, "tiers partition the hall exactly");
  const none = hall.summarize(null, null, "not an array");
  assert.equal(none.total, 0);
});

test("the hall renders every registry entry through the real counters", () => {
  assert.match(script, /function achievementSnapshot\(\)/);
  for (const field of ["bestStreak", "perfectLevels", "points", "coins"]) {
    assert.ok(script.includes(field + ":"), `snapshot exposes "${field}"`);
  }
  assert.ok(/subjectLevels,|subjectLevels:/.test(script), "snapshot exposes subjectLevels");
  assert.ok(/totalCompletedLevels[,:\s]/.test(script), "snapshot exposes totalCompletedLevels");
  assert.match(script, /helpers\.progressFor\(id, snapshot\)/);
  assert.match(script, /const pct = Math\.round\(progress\.ratio \* 100\);/);
  assert.ok(script.includes("aria-valuenow=\"${pct}\""), "the bar announces its progress");
  assert.ok(script.includes("UNLOCKED ${date ? `ON ${date}` : \"✓\"}"), "unlocked cards name their date");
  assert.match(script, /helpers\.summarize\(loadSpecialAchievements\(\)/, "summary reads the stored state");
  assert.match(script, /renderQuestHome\(\);\s*renderAchievementHall\(\);/, "the hall refreshes with the home cards");
});

test("the hall interface exists, is precached, and stays themeable", () => {
  for (const id of ["achievementHallCard", "achievementHallPanel", "achievementHallGrid", "achievementHallHomeStatus"]) {
    assert.ok(html.includes(`id="${id}"`), `index.html defines #${id}`);
  }
  assert.ok(html.includes('src="src/progression/achievementGallery.js"'), "module is loaded");
  assert.ok(sw.includes('"./src/progression/achievementGallery.js"'), "module is precached offline");
  assert.ok(script.includes("function openAchievementHall()") && script.includes("function closeAchievementHall()"));
  const css = fs.readFileSync("style.css", "utf8");
  const section = css.slice(css.indexOf("ACHIEVEMENT HALL (rarity cards"));
  assert.ok(section.includes(".hall-card[data-rarity=\"LEGENDARY\"] .hall-rarity"), "rarity tiers are styled");
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(section), "hall css uses theme tokens, no hardcoded colors");
});
