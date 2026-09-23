/*
 * Arcade mode tests: the survival stage ladder, the scoreboard rules and the
 * wiring inside script.js that plays Survival Gauntlet and Timed Blitz.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "src/quiz/arcadeRanks.js"), "utf8"), context);
const arcade = context.window.GeonArcade;

const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

/* ---------------------------------------------------------------- stage ladder */

test("survival difficulty climbs one stage every five questions", () => {
  assert.deepEqual(
    [0, 1, 4, 5, 9, 10, 14, 15, 19, 20, 59, 60, 500].map(arcade.stageForQuestion),
    ["NORMAL", "NORMAL", "NORMAL", "HARD", "HARD", "INSANE", "INSANE", "IMPOSSIBLE", "IMPOSSIBLE", "IMPOSSIBLE", "IMPOSSIBLE", "IMPOSSIBLE", "IMPOSSIBLE"]
  );
  assert.equal(arcade.stageForQuestion(-3), "NORMAL", "negative input is clamped");
});

test("arcade base score rises with difficulty and respects the multiplier", () => {
  assert.equal(arcade.scoreForDifficulty("NORMAL", 1), 20);
  assert.equal(arcade.scoreForDifficulty("IMPOSSIBLE", 1), 70);
  assert.equal(arcade.scoreForDifficulty("IMPOSSIBLE", 2), 140);
  assert.equal(arcade.scoreForDifficulty("UNKNOWN", 1), 20, "unknown difficulty falls back to NORMAL");
  assert.equal(arcade.scoreForDifficulty("NORMAL", "not-a-number"), 20, "bad multipliers are ignored");
});

/* ------------------------------------------------------------------- scoreboard */

test("the board keeps the ten best runs sorted by score", () => {
  let board = [];
  for (let run = 1; run <= 15; run += 1) {
    board = arcade.recordScore(board, { score: run * 10, bestStreak: run, answered: run * 5 }, 2000 - run).board;
  }
  assert.equal(board.length, arcade.BOARD_SIZE);
  assert.equal(board[0].score, 150);
  assert.equal(board[board.length - 1].score, 60);
  const scores = board.map(entry => Number(entry.score));
  for (let position = 1; position < scores.length; position += 1) {
    assert.ok(scores[position - 1] >= scores[position], `score ${position} is out of order`);
  }
});

test("a run that missed the cut is reported with rank zero", () => {
  const full = [];
  for (let run = 1; run <= 10; run += 1) {
    full.push({ score: 100 - run, bestStreak: 3, answered: 10, playedAt: run });
  }
  const result = arcade.recordScore(full, { score: 1, bestStreak: 1, answered: 1 }, 100);
  assert.equal(result.rank, 0);
  assert.equal(result.isRecord, false);
  assert.equal(result.board.length, 10);
});

test("a new best score is flagged as a record and ranks first", () => {
  const board = [{ score: 40, bestStreak: 4, answered: 8, playedAt: 10 }, { score: 20, bestStreak: 2, answered: 4, playedAt: 9 }];
  const result = arcade.recordScore(board, { score: 90, bestStreak: 7, answered: 14 }, 50);
  assert.equal(result.rank, 1);
  assert.equal(result.isRecord, true);
  assert.equal(result.board[0].score, 90);
  result.board.forEach(entry => assert.equal(entry.playedAt, [50, 10, 9][result.board.indexOf(entry)]));
});

test("garbage on the board is dropped and zero-score runs never enter", () => {
  const cleaned = arcade.sanitizeBoard([null, {}, { score: "x" }, { score: -4 }, { score: 25, bestStreak: "5", answered: 5, playedAt: 2 }]);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].score, 25);
  const skipped = arcade.recordScore(cleaned, { score: 0, bestStreak: 0, answered: 0 }, 3);
  assert.equal(skipped.rank, 0);
  assert.equal(skipped.board.length, 1, "board unchanged by an empty run");
});

test("the home card summary reflects the best stored run", () => {
  const summary = arcade.summarizeBoard([
    { score: 1, bestStreak: 1, answered: 2, playedAt: 1 },
    { score: 80, bestStreak: 9, answered: 12, playedAt: 3 }
  ]);
  assert.equal(summary.best, 80);
  assert.equal(summary.bestStreak, 9);
  assert.equal(summary.played, 2);
  assert.equal(arcade.summarizeBoard("garbage").best, 0);
});

/* ------------------------------------------------------------------ script wiring */

test("arcade sessions are stored per mode and per questioner", () => {
  assert.match(script, /const ARCADE_KEY = "proudGeonQuizArcadeV1"/);
  assert.match(script, /function arcadeStorageKey\(mode\)[\s\S]{0,160}:\$\{mode\}:new/);
  assert.match(script, /mode === "survival" \? 1 : MAX_QUIZ_LIVES/, "survival starts with exactly one life");
  assert.match(script, /arcadeQuestioner: getActiveQuestioner\(\)/);
});

test("the survival stream is endless and stage-aware", () => {
  assert.match(script, /function extendArcadeStreamIfNeeded\(\)/);
  assert.match(script, /remaining >= 6/, "the stream only extends near the end");
  assert.match(script, /helpers\.stageForQuestion\(quizState\.questions\.length\)/, "survival extends at the current stage");
  assert.match(script, /if \(isArcadeActive\(\) && quizState\.index >= quizState\.questions\.length\)/, "rendering extends instead of ending");
  assert.match(script, /!isArcadeActive\(\) && !isReviewerActive\(\) && !isDailyChallengeActive\(\) && quizState\.index >= 80/, "arcade never lands on the campaign victory screen");
});

test("the blitz clock belongs to the run, and +2/-3 is applied per answer", () => {
  assert.match(script, /function startArcadeTimer\(\)/);
  assert.match(script, /if \(quizState !== owner \|\| quizState\.timerId !== intervalId\)/, "blitz clock has the same ownership guard");
  assert.match(script, /quizState\.timer \+ \(helpers\?\.BLITZ_CORRECT_BONUS \|\| 2\)/, "correct answers add time");
  assert.match(script, /quizState\.timer - \(helpers\?\.BLITZ_WRONG_PENALTY \|\| 3\)/, "wrong answers remove time");
  assert.match(script, /if \(!quizState\.timerId\) startArcadeTimer\(\);/, "the session clock starts once per run");
});

test("a finished run records the board, cleanup and shows the result panel", () => {
  assert.match(script, /function finishArcadeRun\(timeUp = false\)/);
  assert.match(script, /helpers\.recordScore\(loadArcadeBoard\(mode\), summary, Date\.now\(\)\)/);
  assert.match(script, /classList\.remove\("arcade-active", "survival-active", "blitz-active", "combo-fever", "quiz-active"\)/);
  assert.match(script, /document\.getElementById\("arcadeResultPanel"\)/);
  assert.match(script, /result\.isRecord[\s\S]{0,120}NEW RECORD!/, "a new record is announced");
  assert.match(script, /function closeArcadeResult\(\)[\s\S]{0,420}updateHomeSubjectUnlocks\(\)/);
});

test("wrong answers in an arcade run feed the Mistake Vault", () => {
  assert.match(script, /function handleArcadeAnswer\(correct, timedOut\)[\s\S]{0,1400}recordMistakeInVault\(question\)/);
});

test("the arcade interface exists and stays themeable", () => {
  for (const id of ["arcadeSurvivalCard", "arcadeBlitzCard", "arcadeResultPanel", "arcadeResultScore", "arcadeResultRank"]) {
    assert.ok(html.includes(`id="${id}"`), `missing element: ${id}`);
  }
  assert.match(html, /<script src="src\/quiz\/arcadeRanks\.js"><\/script>/);
  const indexOfModule = html.indexOf("src/quiz/arcadeRanks.js");
  assert.ok(indexOfModule > 0 && indexOfModule < html.indexOf('<script src="script.js"></script>'), "the helper must load before script.js");
  for (const selector of [".arcade-card", ".arcade-result-panel", ".arcade-result-box", "body.arcade-active"]) {
    assert.ok(css.includes(selector), `missing style: ${selector}`);
  }
  const arcadeSection = css.slice(css.indexOf("ARCADE MODES"));
  assert.ok(!/#[0-9a-f]{3,6}/i.test(arcadeSection.replace(/rgba?\([^)]*\)/g, "")), "arcade styles must use the theme tokens");
});
