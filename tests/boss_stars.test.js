/*
 * Boss level and star rating tests: the rating rules themselves and the wiring
 * that makes every tenth level a three-question chain with a chest.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "src/progression/starRatings.js"), "utf8"), context);
const stars = context.window.GeonStars;

const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
const banks = ["questions.json", "questions.new.json"].map(name =>
  JSON.parse(fs.readFileSync(path.join(root, name), "utf8")));

/* ----------------------------------------------------------------- star rules */

test("a finished level earns one star, a wrong answer keeps it there", () => {
  assert.equal(stars.starsFor({ completed: false }), 0);
  assert.equal(stars.starsFor({ completed: true, wrong: 1 }), 1);
  assert.equal(stars.starsFor({ completed: true, wrong: 3 }), 1, "every mistake holds the rating at one");
  assert.equal(stars.starsFor({ completed: true, wrong: -1 }), 0, "nonsense input never earns stars");
});

test("clean levels earn two stars; order of checks prevents wrong shortcuts", () => {
  assert.equal(stars.starsFor({ completed: true, wrong: 0, itemsUsed: 2, timeUsed: 1, timeLimit: 45 }), 2, "items cost the third star");
  assert.equal(stars.starsFor({ completed: true, wrong: 0, itemsUsed: 0, timeUsed: 40, timeLimit: 45 }), 2, "slow clean answers earn two");
  assert.equal(stars.starsFor({ completed: true, wrong: 0, itemsUsed: 0, timeUsed: 30, timeLimit: 45 }), 3, "fast clean answers earn three");
  assert.equal(stars.starsFor({ completed: true, wrong: 0, itemsUsed: 0 }), 3, "no timer information keeps the best rating");
});

test("a recorded rating can only improve", () => {
  let ratings = {};
  ratings = stars.record(ratings, "MATH", "SUBJECT 1", 5, 1);
  assert.equal(ratings[stars.keyFor("MATH", "SUBJECT 1", 5)], 1);
  ratings = stars.record(ratings, "MATH", "SUBJECT 1", 5, 3);
  assert.equal(ratings[stars.keyFor("MATH", "SUBJECT 1", 5)], 3);
  ratings = stars.record(ratings, "MATH", "SUBJECT 1", 5, 1);
  assert.equal(ratings[stars.keyFor("MATH", "SUBJECT 1", 5)], 3, "a replay never erases stars");
});

test("invalid keys and values are dropped from the saved map", () => {
  const clean = stars.sanitizeRatings({
    "MATH|SUBJECT 1|0": 2,
    "MATH|SUBJECT 1|81": 2,
    "MATH|SUBJECT 1|5": 4,
    "||5": 2,
    "MATH|SUBJECT 1|7|extra": 1,
    "MATH|SUBJECT 1|7": 0,
    "MATH|SUBJECT 1|3": 2
  });
  assert.deepEqual(Object.keys(clean), ["MATH|SUBJECT 1|3"]);
  assert.equal(stars.keyFor("MATH", "", 5), "");
  assert.equal(stars.keyFor("MATH", "SUBJECT 1", 99), "");
});

test("subject summaries cover both quiz sets up to 480 stars", () => {
  let ratings = {};
  for (let level = 1; level <= 80; level += 1) {
    ratings = stars.record(ratings, "SCIENCE", "SUBJECT 1", level, 3);
    ratings = stars.record(ratings, "SCIENCE", "SUBJECT 2", level, level % 2 === 0 ? 2 : 1);
  }
  const summary = stars.summaryFor(ratings, "SCIENCE", "SUBJECT 1");
  assert.equal(summary.earned, 240);
  const bothSets = ["SUBJECT 1", "SUBJECT 2"].reduce(
    (total, set) => total + stars.summaryFor(ratings, "SCIENCE", set).earned, 0);
  assert.equal(bothSets, 240 + 80 + 40, "both sets sum correctly");
});

/* ----------------------------------------------------------------- boss wiring */

test("boss plans exist only on every tenth campaign level and use the level band", () => {
  assert.match(script, /const BOSS_CHAIN_LENGTH = 3;/);
  assert.match(script, /const BOSS_CLOCK_SECONDS = 20;/);
  assert.match(script, /!Number\.isInteger\(level\) \|\| level < 10 \|\| level % 10 !== 0\) return null;/);
  assert.match(script, /String\(question\.difficulty \|\| ""\)\.toUpperCase\(\) === band/, "summons come from the level band");
  assert.match(script, /boss: buildBossPlan\(subject, quizType, safeSelectedLevel, source\)/);
  for (const name of ["questions.json", "questions.new.json"]) {
    const bank = banks[name === "questions.json" ? 0 : 1];
    for (const subject of Object.keys(bank)) {
      for (const set of ["SUBJECT 1", "SUBJECT 2"]) {
        for (const band of ["NORMAL", "HARD", "INSANE", "IMPOSSIBLE"]) {
          const size = bank[subject][set].filter(question => question.difficulty === band).length;
          assert.ok(size >= 3, `${name} ${subject}/${set}/${band} only has ${size} summons`);
        }
      }
    }
  }
});

test("the chain clock resets rounds instead of stealing progress", () => {
  assert.match(script, /function startBossTimer\(\)/);
  assert.match(script, /if \(quizState !== owner \|\| quizState\.timerId !== intervalId \|\| !quizState\.boss\)/, "boss clock stops when the chain ends");
  assert.match(script, /function failBossRound\(\)/);
  assert.match(script, /THE BOSS ESCAPED/);
  assert.match(script, /served: 0,[\s\S]{0,120}hadWrong: true/, "a timed-out chain restarts and cannot be perfect");
});

test("only a beaten chain records progress, stars and the chest", () => {
  assert.match(script, /function completeBossChain\(\)/);
  assert.match(script, /boss\.served < boss\.chain[\s\S]{0,80}renderCurrentQuizQuestion\(\)/);
  assert.match(script, /grantBossChest\(levelCompleted\)/);
  assert.match(script, /setQuizProgress\(quizState\.subject, quizState\.quizType, Math\.max\(getQuizProgress/);
  assert.match(script, /recordLevelStars\(levelCompleted, \{[\s\S]{0,200}hadWrong: boss\.hadWrong/);
  assert.match(script, /if \(!boss\.hadWrong && boss\.itemsUsed === 0\)/, "boss perfect needs a clean chain without items");
  assert.match(script, /showVictoryScreen\(\)/, "beating the level-80 boss ends in victory");
});

test("the chest pays from the band table and gifts a real item", () => {
  assert.match(script, /const BOSS_CHEST_COINS = Object\.freeze\(\{ NORMAL: 15, HARD: 25, INSANE: 40, IMPOSSIBLE: 60 \}\)/);
  assert.match(script, /itemInventory\[gift\] = safeNonNegativeInt\(itemInventory\[gift\], 0\) \+ 1;/);
  assert.match(script, /saveItemInventory\(\)/);
  assert.ok(Math.max(...Object.values(JSON.parse(`{"NORMAL":15,"HARD":25,"INSANE":40,"IMPOSSIBLE":60}`))) === 60);
});

test("normal levels get stars; practice, daily and arcade do not", () => {
  assert.match(script, /function recordLevelStars\(level, aggregate = null\)/);
  assert.match(script, /if \(!window\.GeonStars \|\| isPracticeMode\(\) \|\| isArcadeActive\(\) \|\| isDailyChallengeActive\(\)\) return 0;/);
  assert.match(script, /recordLevelStars\(levelCompleted\);/);
  assert.match(script, /getActiveQuestioner\(\) === "new" \? `\$\{base\}:new` : base;/, "stars are stored per questioner");
});

test("boss and stars appear on the level grid and stay themeable", () => {
  assert.match(script, /has-stars-\$\{savedStars\}/);
  assert.match(script, /const boss = level % 10 === 0;/);
  assert.match(script, /★ \$\{summary\.earned\}\/480/);
  assert.ok((html.match(/class="subject-stars"/g) || []).length === 5, "one stars counter per subject row");
  assert.match(html, /<script src="src\/progression\/starRatings\.js"><\/script>/);
  for (const selector of [".level-selection-button.is-boss", ".level-selection-button.has-stars-3::before", ".subject-stars"]) {
    assert.ok(css.includes(selector), `missing style: ${selector}`);
  }
});
