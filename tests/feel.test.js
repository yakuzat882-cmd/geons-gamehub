/*
 * Feel pack tests: level twist modifiers, the Mistake Vault rules, and the wiring
 * inside script.js that applies combo, speed bonus, adaptive timer and practice drills.
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

const modifiers = loadModule("src/quiz/levelModifiers.js").GeonLevelModifiers;
const vault = loadModule("src/quiz/mistakeVault.js").GeonMistakeVault;
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8");

const SUBJECTS = ["MATH", "PSYCHOLOGY", "SCIENCE", "TECH 1", "TECH 2"];
const SETS = ["SUBJECT 1", "SUBJECT 2"];

/* ------------------------------------------------------------------ modifiers */

test("a level twist is derived only from its own key and never changes", () => {
  for (const subject of SUBJECTS) {
    for (const set of SETS) {
      for (const questioner of ["previous", "new"]) {
        for (const level of [1, 7, 26, 55, 79, 80]) {
          const first = modifiers.getLevelModifier(subject, set, level, questioner);
          const second = modifiers.getLevelModifier(subject, set, level, questioner);
          assert.equal(first.id, second.id, `${subject}/${set}/${level}/${questioner} is not stable`);
          assert.ok(modifiers.MODIFIERS[first.id], `${first.id} is not a known modifier`);
        }
      }
    }
  }
});

test("modifier spread keeps most levels clean while twists stay visible", () => {
  const counts = {};
  let total = 0;
  for (const subject of SUBJECTS) {
    for (const set of SETS) {
      for (const questioner of ["previous", "new"]) {
        for (let level = 1; level <= 80; level += 1) {
          const id = modifiers.getLevelModifier(subject, set, level, questioner).id;
          counts[id] = (counts[id] || 0) + 1;
          total += 1;
        }
      }
    }
  }
  assert.equal(total, 1600);
  assert.ok(counts.NONE / total >= 0.35 && counts.NONE / total <= 0.5, `NONE share ${counts.NONE / total}`);
  for (const id of ["DOUBLE_COINS", "TIME_RUSH", "NO_HINT", "MYSTERY", "SUDDEN_DEATH"]) {
    assert.ok(counts[id] >= 40, `${id} appears only ${counts[id] || 0} times`);
  }
  assert.equal(modifiers.ROTATION.filter(id => id === "DOUBLE_COINS").length, 2, "DOUBLE COINS should be the most common twist");
});

test("a level without a valid key never receives a modifier", () => {
  assert.equal(modifiers.getLevelModifier("", "SUBJECT 1", 5, "previous").id, "NONE");
  assert.equal(modifiers.getLevelModifier("MATH", "", 5, "previous").id, "NONE");
  assert.equal(modifiers.getLevelModifier("MATH", "SUBJECT 1", 0, "previous").id, "NONE");
  assert.equal(modifiers.getLevelModifier("MATH", "SUBJECT 1", 81, "previous").id, "NONE");
});

test("time rush shortens the clock but never below the floor", () => {
  assert.equal(modifiers.applyTimerModifier(45, modifiers.MODIFIERS.TIME_RUSH), 30);
  assert.equal(modifiers.applyTimerModifier(20, modifiers.MODIFIERS.TIME_RUSH), 12);
  assert.equal(modifiers.applyTimerModifier(45, modifiers.MODIFIERS.NONE), 45);
  assert.equal(modifiers.applyTimerModifier(0, modifiers.MODIFIERS.NONE), modifiers.MIN_TIMER_SECONDS);
});

test("coin multiplier only ever doubles a payout", () => {
  assert.equal(modifiers.coinMultiplierFor(modifiers.MODIFIERS.DOUBLE_COINS), 2);
  assert.equal(modifiers.coinMultiplierFor(modifiers.MODIFIERS.NONE), 1);
  assert.equal(modifiers.coinMultiplierFor({ coinMultiplier: 0 }), 1);
  assert.equal(modifiers.coinMultiplierFor(null), 1);
});

/* ----------------------------------------------------------------- mistake vault */

test("the vault drops anything that is not a question reference", () => {
  const cleaned = vault.sanitizeVault([
    null,
    "text",
    {},
    { id: "" },
    { id: "A", subject: "MATH", quizType: "SUBJECT 1", category: "ADDITION", correctStreak: 5, addedAt: 10 },
    { id: "A", subject: "MATH" }
  ]);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].id, "A");
  assert.equal(cleaned[0].correctStreak, vault.REQUIRED_CORRECT, "streak is clamped");
});

test("a wrong answer enters the vault newest first and is capped", () => {
  let entries = [];
  for (let index = 0; index < vault.MAX_ENTRIES + 25; index += 1) {
    entries = vault.addMistake(entries, {
      id: `ID-${index}`,
      subject: "SCIENCE",
      quizType: "SUBJECT 2",
      category: "HISTORY"
    }, 1000 + index);
  }
  assert.equal(entries.length, vault.MAX_ENTRIES);
  assert.equal(entries[0].id, `ID-${vault.MAX_ENTRIES + 24}`);
  assert.equal(entries.every(entry => entry.correctStreak === 0), true);
});

test("re-answering a stored mistake wrong resets its progress", () => {
  const question = { id: "Q1", subject: "MATH", quizType: "SUBJECT 1", category: "DIVISION" };
  let entries = vault.addMistake([], question, 1);
  entries = vault.recordResult(entries, "Q1", true, 2).entries;
  assert.equal(entries[0].correctStreak, 1);
  entries = vault.recordResult(entries, "Q1", false, 3).entries;
  assert.equal(entries[0].correctStreak, 0, "a wrong retry must reset the streak");
});

test("two correct retries retire a question from the vault", () => {
  const question = { id: "Q2", subject: "TECH 1", quizType: "SUBJECT 1", category: "SAFETY PROCEDURES" };
  let entries = vault.addMistake([], question, 1);
  const first = vault.recordResult(entries, "Q2", true, 2);
  assert.equal(first.retired, false);
  const second = vault.recordResult(first.entries, "Q2", true, 3);
  assert.equal(second.retired, true);
  assert.equal(second.cleared, true);
  assert.equal(second.entries.length, 0);
});

test("the vault summary drives the home card and the drill size", () => {
  let entries = [];
  for (let index = 0; index < 14; index += 1) {
    entries = vault.addMistake(entries, {
      id: `M-${index}`,
      subject: index % 2 === 0 ? "MATH" : "TECH 2",
      quizType: "SUBJECT 1",
      category: "NETWORKING"
    }, index);
  }
  const summary = vault.summarize(entries);
  assert.equal(summary.total, 14);
  assert.equal(summary.subjects.MATH, 7);
  assert.equal(summary.subjects["TECH 2"], 7);
  assert.equal(summary.drillable, vault.DRILL_SIZE);
  assert.equal(vault.pickForDrill(entries, 3).length, 3);
  assert.equal(vault.summarize([]).total, 0);
});

/* ------------------------------------------------------------ script wiring */

test("the timer follows the difficulty band and the twist", () => {
  assert.match(script, /const QUESTION_TIME_BY_DIFFICULTY = Object\.freeze\(\{[\s\S]{0,120}NORMAL: 45[\s\S]{0,80}HARD: 35[\s\S]{0,80}INSANE: 30[\s\S]{0,80}IMPOSSIBLE: 20/);
  assert.match(script, /function currentQuestionTimeLimit\(\)/);
  assert.match(script, /owner\.timer = currentQuestionTimeLimit\(\)/);
  assert.match(script, /const owner = quizState;/, "the interval must be pinned to the session that created it");
  assert.match(script, /if \(quizState !== owner \|\| quizState\.timerId !== intervalId\)/, "stale intervals must stop themselves");
  assert.ok(!/quizState\.timer = 30;/.test(script), "the fixed 30 second timer must be replaced");
});

test("level twists are derived from the level and applied to the question", () => {
  assert.match(script, /modifier: levelModifierFor\(subject, quizType, safeSelectedLevel\)/);
  assert.match(script, /function levelModifierFor\(subject, quizType, level\)/);
  assert.match(script, /function applyChoiceModifier\(buttons\)/);
  assert.match(script, /applyChoiceModifier\(buttons\);/);
  assert.match(script, /function applySuddenDeathIfActive\(\)/);
  assert.match(script, /function renderQuizModifierBadge\(\)/);
  assert.match(script, /renderQuizModifierBadge\(\);/);
});

test("combo, speed and perfect-level rewards are wired into the real flow", () => {
  assert.match(script, /const SPEED_BONUS_SECONDS = 10/);
  assert.match(script, /const speedBonus = elapsedSeconds <= SPEED_BONUS_SECONDS/);
  assert.match(script, /const earnedCoins = Math\.max\(0, Math\.round\(\(reward\.coins \+ speedBonus\) \* coinMultiplier\)\)/);
  assert.match(script, /const PERFECT_LEVEL_COINS = 8/);
  assert.match(script, /if \(!quizState\.levelHadWrongAnswer && safeNonNegativeInt\(quizState\.levelItemsUsed, 0\) === 0\)/);
  assert.match(script, /quizState\.levelItemsUsed = 0;/, "the item counter resets on every fresh question");
  assert.match(script, /quizState\.levelItemsUsed = safeNonNegativeInt\(quizState\.levelItemsUsed, 0\) \+ 1;/);
  assert.match(script, /function updateComboMeter\(streak\)/);
  assert.match(script, /const COMBO_TIERS = Object\.freeze\(\[3, 5, 10, 15, 20\]\)/);
});

test("the mistake vault is stored per questioner and never touches progression", () => {
  assert.match(script, /const MISTAKE_VAULT_KEY = "proudGeonQuizMistakeVaultV1"/);
  assert.match(script, /function mistakeVaultStorageKey\(\)[\s\S]{0,160}:new/);
  assert.match(script, /recordMistakeInVault\(quizState\.questions\[quizState\.index\]\)/);
  assert.match(script, /isVaultDrillActive\(\)[\s\S]{0,400}recordVaultDrillResult\(currentQuestion\?\.id, correct\)/);
  assert.match(script, /if \(!isDailyChallengeActive\(\)\) \{\s*recordMistakeInVault/, "daily challenge answers must not enter the vault before they are final");
  assert.match(script, /function completeMistakeVaultDrill\(\)/);
  assert.match(script, /if \(isVaultDrillActive\(\)\) \{\s*completeMistakeVaultDrill\(\);\s*return;\s*\}/, "leaving the drill must exit cleanly");
});

test("new interface pieces exist and stay themeable", () => {
  assert.match(html, /id="quizModifierBadge"/);
  assert.match(html, /id="quizComboMeter"/);
  assert.match(html, /id="mistakeVaultCard"/);
  assert.match(html, /<script src="src\/quiz\/levelModifiers\.js"><\/script>/);
  assert.match(html, /<script src="src\/quiz\/mistakeVault\.js"><\/script>/);

  const indexOfModule = html.indexOf("src/quiz/levelModifiers.js");
  const indexOfScript = html.indexOf('<script src="script.js"></script>');
  assert.ok(indexOfModule > 0 && indexOfModule < indexOfScript, "modules must load before script.js");

  for (const selector of [".quiz-modifier", ".quiz-combo", ".mistake-vault-card", "body.vault-active", ".quiz-answer.mystery"]) {
    assert.ok(css.includes(selector), `missing style: ${selector}`);
  }
  const feelSection = css.slice(css.indexOf("FEEL PACK"));
  assert.ok(!/#[0-9a-f]{3,6}/i.test(feelSection.replace(/rgba?\([^)]*\)/g, "")), "new styles must use the theme tokens, not fixed colours");
  assert.match(feelSection, /prefers-reduced-motion: reduce/);
});
