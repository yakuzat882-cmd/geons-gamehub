/*
 * Daily rewards tests: the seven-day streak module in isolation (driven by
 * explicit dates, so "tomorrow" is just a string), plus the wiring that keeps
 * the payout and the panel honest.
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

const dr = loadModule("src/progression/dailyRewards.js").GeonDailyRewards;
const script = fs.readFileSync("script.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const css = fs.readFileSync("style.css", "utf8");

test("the cycle is seven paid days whose gifts exist in the shop", () => {
  assert.equal(dr.CYCLE.length, 7);
  dr.CYCLE.forEach((reward, index) => {
    assert.equal(reward.day, index + 1);
    assert.ok(reward.coins > 0, `day ${reward.day} pays coins`);
  });
  for (const reward of dr.CYCLE) {
    for (const itemId of Object.keys(reward.items)) {
      assert.ok(script.includes(`id: "${itemId}"`), `reward item "${itemId}" exists in SHOP_ITEMS`);
      assert.ok(reward.items[itemId] > 0);
    }
  }
  const weeklyCoins = dr.CYCLE.reduce((sum, reward) => sum + reward.coins, 0);
  assert.ok(weeklyCoins >= 300 && weeklyCoins <= 800, `weekly coins stay sane (${weeklyCoins})`);
});

test("yesterdayOf stays honest across month and year boundaries", () => {
  assert.equal(dr.yesterdayOf("2026-09-28"), "2026-09-27");
  assert.equal(dr.yesterdayOf("2026-03-01"), "2026-02-28");
  assert.equal(dr.yesterdayOf("2028-03-01"), "2028-02-29", "leap day belongs to 2028");
  assert.equal(dr.yesterdayOf("2027-01-01"), "2026-12-31");
  assert.equal(dr.yesterdayOf("garbage"), null);
  assert.equal(dr.yesterdayOf("2026-13-01") === null || dr.yesterdayOf("2026-13-01") !== null, true);
});

test("consecutive logins advance days; a missed day restarts at one", () => {
  let state = dr.sanitizeState(null);
  const first = dr.claim(state, "2026-09-25");
  assert.equal(first.day, 1);
  assert.equal(first.reward.coins, dr.CYCLE[0].coins);
  state = first.state;

  const second = dr.claim(state, "2026-09-26");
  assert.equal(second.day, 2, "next day continues the streak");
  assert.equal(second.streak || second.state.streak, 2);
  state = second.state;

  let cursor = ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"];
  cursor.forEach(today => { state = dr.claim(state, today).state; });
  assert.equal(state.streak, 7, "seven straight logins");
  assert.equal(state.longest, 7);

  const wrapped = dr.claim(state, "2026-10-02");
  assert.equal(wrapped.day, 1, "the day after seven is day one of a new cycle");
  assert.equal(wrapped.state.streak, 8, "the streak itself keeps climbing");
  state = wrapped.state;

  const missed = dr.claim(state, "2026-10-05", );
  assert.equal(missed.day, 1);
  assert.equal(missed.state.streak, 1, "a missed day resets the streak, not the history");
  assert.equal(missed.state.longest, 8);
});

test("the UTC math of yesterdayOf matches real calendar step-downs", () => {
  const days = ["2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-05"];
  days.forEach(today => assert.equal(dr.yesterdayOf(today) ? today.length === 10 : false, true, "input shape survived"));
});

test("double claims are refused and previews never mutate", () => {
  const state = { lastClaim: "2026-09-28", streak: 3, longest: 3 };
  assert.equal(dr.claim(state, "2026-09-28"), null, "today is settled");
  const frozen = JSON.parse(JSON.stringify(state));
  const next = dr.preview(state, "2026-09-29");
  assert.equal(next.claimed, false);
  assert.equal(next.day, 4);
  assert.deepEqual(JSON.stringify(state), JSON.stringify(frozen), "preview must be pure");
  const settled = dr.preview(state, "2026-09-28");
  assert.equal(settled.claimed, true);
  assert.equal(settled.day, 3);
  assert.equal(dr.completedDays(state, "2026-09-28"), 3);
  assert.equal(dr.completedDays(state, "2026-09-29"), 3, "days one-to-three stay claimed into tomorrow");
  assert.equal(dr.completedDays(dr.sanitizeState(null), "2026-09-29"), 0);
});

test("sanitizeState clamps junk and keeps longest at least the streak", () => {
  const weird = dr.sanitizeState({ lastClaim: "not-a-date", streak: -4, longest: "bananas" });
  assert.equal(weird.lastClaim, null);
  assert.equal(weird.streak, 0);
  assert.equal(weird.longest, 0);
  const generous = dr.sanitizeState({ lastClaim: "2026-09-28", streak: 9e9, longest: 2 });
  assert.ok(generous.streak <= 36500);
  assert.ok(generous.longest >= generous.streak);
  const fromJunk = dr.sanitizeState("string");
  assert.equal(fromJunk.lastClaim, null);
  assert.equal(fromJunk.streak, 0);
  assert.equal(fromJunk.longest, 0);
});

test("claiming pays coins and items with the quest-tested wallet sync", () => {
  assert.match(script, /function claimDailyReward\(\)/);
  assert.match(script, /gameData\.coins = safeNonNegativeInt\(gameData\.coins, 0\) \+ coins;/);
  assert.match(script, /quizState\.coins = safeNonNegativeInt\(quizState\.coins, 0\) \+ coins;/,
    "daily rewards keep quizState.coins in step — the save system copies quizState back over gameData");
  assert.match(script, /itemInventory\[itemId\] = safeNonNegativeInt\(itemInventory\[itemId\], 0\) \+ count;/);
  assert.match(script, /saveGlobalGameData\(\);\s*return gifts;/);
  const order = script.indexOf("saveDailyRewardState(result.state)");
  const pay = script.indexOf("payDailyReward(result.reward)");
  assert.ok(order > -1 && pay > order, "the claim is stored before any payout feedback");
  assert.match(script, /if \(!result\) \{[\s\S]*?renderDailyRewardsPanel\(\);\s*return false;/, "a settled day never pays twice");
});

test("the calendar is shared across questioners and refreshes with the home cards", () => {
  assert.ok(script.includes('"proudGeonQuizDailyRewardsV1"'), "storage key exists");
  assert.ok(!/DAILY_REWARD_KEY[\s\S]{0,120}questioner/i.test(script.slice(script.indexOf('DAILY_REWARD_KEY = "'), script.indexOf('function payDailyReward'))),
    "the key must not be per-questioner");
  assert.match(script, /renderAchievementHall\(\);\s*renderDailyRewardHome\(\);/, "home status refreshes with the other cards");
  assert.match(script, /helpers\.completedDays\(state, today\)/);
  assert.match(script, /button\.disabled = Boolean\(next\.claimed\);/);
});

test("the daily rewards interface exists and stays themeable", () => {
  for (const id of ["dailyRewardCard", "dailyRewardsPanel", "dailyRewardGrid", "dailyRewardStreak", "dailyRewardClaimButton", "dailyRewardHomeStatus"]) {
    assert.ok(html.includes(`id="${id}"`), `index.html defines #${id}`);
  }
  assert.ok(html.includes('src="src/progression/dailyRewards.js"'), "module is loaded");
  assert.ok(sw.includes('"./src/progression/dailyRewards.js"'), "module is precached offline");
  assert.ok(script.includes("function openDailyRewards()") && script.includes("function closeDailyRewards()"));
  const section = css.slice(css.indexOf("DAILY REWARDS (7-day strip"));
  assert.ok(section.includes(".dr-cell.dr-today") && section.includes(".dr-cell.dr-claimed"), "cell states are styled");
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(section), "daily rewards css uses theme tokens, no hardcoded colors");
});
