/*
 * Questioner web check.
 *
 * Loads the real index.html against a temporary local HTTP origin, then plays
 * through both questioner modes with the real game functions:
 *
 *   - both banks load and pass the shipped validator
 *   - all five subjects and both quiz sets resolve every difficulty band
 *   - switching questioners changes the active dataset and the visible indicator
 *   - answering a question through the engine updates score and per-mode progress
 *   - previous and new progress are stored under separate keys
 *   - the page produces no JavaScript console errors
 *   - the embedded fallbacks load the same banks from a plain file path (TrebEdit)
 *
 * The project ships without runtime dependencies, so this script skips itself
 * when jsdom is not installed:
 *
 *   npm install --no-save jsdom && node tools/web_check.js
 */

const fs = require("fs");
const http = require("http");
const path = require("path");

const root = path.join(__dirname, "..");

let JSDOM;
let VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require("jsdom"));
} catch (error) {
  console.log("SKIP: jsdom is not installed, run `npm install --no-save jsdom` first.");
  process.exit(0);
}

const results = [];
function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".mp3")) return "audio/mpeg";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".webmanifest")) return "application/manifest+json";
  return "application/octet-stream";
}

function serve(callback) {
  const server = http.createServer((request, response) => {
    const url = decodeURIComponent(request.url.split("?")[0]);
    const target = path.join(root, url === "/" ? "index.html" : url);
    if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mime(target) });
    fs.createReadStream(target).pipe(response);
  });
  server.listen(0, "127.0.0.1", () => callback(server, `http://127.0.0.1:${server.address().port}/`));
}

const BANDS = [
  { name: "NORMAL", levels: [1, 20] },
  { name: "HARD", levels: [21, 40] },
  { name: "INSANE", levels: [41, 60] },
  { name: "IMPOSSIBLE", levels: [61, 80] }
];

const SUBJECTS = ["MATH", "PSYCHOLOGY", "SCIENCE", "TECH 1", "TECH 2"];
const SETS = ["SUBJECT 1", "SUBJECT 2"];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* quizState is declared with `let`, so it is read through the page's own scope. */
function quizStateNow(window) {
  return window.eval("quizState");
}

function findQuestion(bank, text) {
  return SUBJECTS
    .flatMap(subject => SETS.flatMap(set => bank?.[subject]?.[set] || []))
    .find(entry => entry.question === text);
}

function findLevelWithModifier(window, subject, set, modifierId) {
  const questioner = window.getActiveQuestioner();
  for (let level = 1; level <= 80; level += 1) {
    const modifier = window.GeonLevelModifiers.getLevelModifier(subject, set, level, questioner);
    if (modifier.id === modifierId) return { level, modifier };
  }
  return null;
}

function answerThroughUi(window, bank, correct) {
  const text = document_getText(window, "quizQuestionText");
  const question = findQuestion(bank, text);
  const buttons = [...window.document.querySelectorAll(".quiz-answer")];
  const selected = correct
    ? buttons.find(button => button.dataset.answer === question?.answer)
    : buttons.find(button => button.dataset.answer !== question?.answer && !button.disabled);
  if (selected) selected.click();
  return { question, selected };
}

async function run(origin, server) {
  const problems = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => {
    if (!/Not implemented/i.test(error.message)) problems.push(`jsdomError: ${error.message}`);
  });
  virtualConsole.on("error", (...args) => problems.push(`console.error: ${args.map(String).join(" ")}`));

  const dom = await JSDOM.fromURL(origin + "index.html", {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole
  });
  const window = dom.window;
  await wait(1500);
  await window.loadQuestionBank();
  await wait(200);

  const count = bank => SUBJECTS.reduce((total, subject) => total + SETS.reduce((rows, set) => rows + bank[subject][set].length, 0), 0);

  check("both question banks load with 800 questions each",
    count(window.questionBank) === 800 && count(window.newQuestionBank) === 800,
    `previous ${count(window.questionBank)}, new ${count(window.newQuestionBank)}`);

  const validation = window.ProudGeonQuizQuestionValidation;
  check("shipped validator accepts both banks",
    Boolean(validation) && validation.reports.every(([, report]) => report.valid) && validation.crossModeCollisions.length === 0,
    validation ? validation.reports.map(([name, report]) => `${name}=${report.valid}`).join(", ") : "no report");

  const sample = { previous: window.questionBank, new: window.newQuestionBank };
  for (const mode of ["previous", "new"]) {
    window.setQuestioner(mode);
    await wait(120);
    const active = typeof window.getActiveQuestioner === "function" ? window.getActiveQuestioner() : "";
    const indicator = document_getText(window, "homeQuestionerIndicator");
    check(`questioner switch to ${mode} is applied`, active === mode, `active=${active}, indicator="${indicator}"`);
  }

  for (const mode of ["previous", "new"]) {
    window.setQuestioner(mode);
    let resolved = 0;
    let bandMismatch = 0;
    let idMismatch = 0;
    let broken = 0;
    for (const subject of SUBJECTS) {
      for (const set of SETS) {
        const pool = window.getSubjectQuestionPool(subject, set);
        const session = window.buildSessionQuestions(pool, 0, [], true);
        for (const band of BANDS) {
          for (const level of band.levels) {
            const question = session[level - 1];
            if (!question) { broken += 1; continue; }
            resolved += 1;
            if (question.difficulty !== band.name) bandMismatch += 1;
            if (!question.id.startsWith(mode.toUpperCase() + "-")) idMismatch += 1;
            if (!question.choices.includes(question.answer)) broken += 1;
          }
        }
      }
    }
    check(`${mode} questioner serves every subject, set and difficulty band`, resolved === SUBJECTS.length * SETS.length * 8 && bandMismatch === 0 && broken === 0 && idMismatch === 0,
      `resolved ${resolved}, band mismatches ${bandMismatch}, id mismatches ${idMismatch}, broken ${broken}`);
  }

  const played = {};
  for (const mode of ["previous", "new"]) {
    window.setQuestioner(mode);
    window.openSubjectSelection("MATH");
    window.openLevelSelection("SUBJECT 1");
    window.startQuizAtSelectedLevel("SUBJECT 1", 2);
    await wait(200);
    const text = document_getText(window, "quizQuestionText");
    const bank = sample[mode];
    const question = SUBJECTS.flatMap(subject => SETS.flatMap(set => bank[subject][set])).find(entry => entry.question === text);
    const buttons = [...window.document.querySelectorAll(".quiz-answer")];
    const before = Number(document_getText(window, "currentScore").replace(/[^0-9]/g, "") || 0);
    const target = buttons.find(button => button.dataset.answer === question?.answer);
    if (target) target.click();
    await wait(200);
    const after = Number(document_getText(window, "currentScore").replace(/[^0-9]/g, "") || 0);
    const questionBox = window.document.getElementById("quizQuestionBox");
    const answerLocked = Boolean(target) && ((questionBox && questionBox.classList.contains("correct")) || target.classList.contains("correct"));
    const next = window.document.getElementById("quizNextButton");
    if (next) next.click();
    await wait(250);
    const quizType = question ? (question.quizType || "SUBJECT 1") : "SUBJECT 1";
    played[mode] = {
      id: question ? question.id : "unknown",
      subject: question ? question.subject : "",
      quizType,
      correct: Boolean(target) && window.getQuizProgress(question?.subject || "MATH", quizType) >= 1,
      scored: after > before,
      locked: answerLocked
    };
  }
  check("answering through the real engine scores in both modes",
    played.previous.correct && played.new.correct && played.previous.locked && played.new.locked,
    `previous ${played.previous.id} (score ${played.previous.scored}), new ${played.new.id} (score ${played.new.scored})`);

  const keys = Object.keys(window.localStorage).filter(key => key.includes("proudGeonQuizProgress"));
  const previousKeys = keys.filter(key => !key.includes(":new:"));
  const newKeys = keys.filter(key => key.includes(":new:"));
  check("progress is stored per questioner", previousKeys.length > 0 && newKeys.length > 0,
    `${previousKeys.length} previous key(s), ${newKeys.length} new key(s)`);

  const reloaded = Object.entries(played).every(([, result]) => window.getQuizProgress(result.subject, result.quizType) >= 1);
  check("saved progress reloads with the bank", typeof window.getQuizProgress === "function" && reloaded,
    Object.entries(played).map(([mode, result]) => `${mode} ${result.subject}/${result.quizType} = ${window.getQuizProgress(result.subject, result.quizType)}`).join(", "));

  /* Every difficulty band is playable end to end in both questioner modes. */
  const bandPlayed = [];
  for (const mode of ["previous", "new"]) {
    window.setQuestioner(mode);
    for (const band of BANDS) {
      const level = band.levels[0];
      window.openSubjectSelection("SCIENCE");
      window.openLevelSelection("B");
      window.startQuizAtSelectedLevel("B", level);
      await wait(180);
      const text = document_getText(window, "quizQuestionText");
      const bank = sample[mode];
      const question = SUBJECTS.flatMap(subject => SETS.flatMap(set => bank[subject][set])).find(entry => entry.question === text);
      const target = [...window.document.querySelectorAll(".quiz-answer")].find(button => button.dataset.answer === question?.answer);
      if (target) target.click();
      await wait(180);
      const box = window.document.getElementById("quizQuestionBox");
      const next = window.document.getElementById("quizNextButton");
      const answered = Boolean(question) && Boolean(target) && Boolean(box && box.classList.contains("correct"));
      if (next) next.click();
      await wait(200);
      bandPlayed.push({ mode, band: band.name, level, answered, difficulty: question ? question.difficulty : "?" });
    }
  }
  const bandsClean = bandPlayed.every(entry => entry.answered && entry.difficulty === entry.band);
  check("every difficulty band is playable in both modes", bandsClean,
    bandPlayed.map(entry => `${entry.mode[0]}:${entry.band[0]}@L${entry.level}${entry.answered ? "" : "(failed)"}`).join(" "));

  /* Each of the five subjects is playable through the UI in both modes. */
  const subjectPlayed = [];
  for (const mode of ["previous", "new"]) {
    window.setQuestioner(mode);
    for (const subject of SUBJECTS) {
      window.openSubjectSelection(subject);
      window.openLevelSelection("A");
      window.startQuizAtSelectedLevel("A", 3);
      await wait(160);
      const text = document_getText(window, "quizQuestionText");
      const bank = sample[mode];
      const question = bank[subject]["SUBJECT 1"].find(entry => entry.question === text);
      const target = [...window.document.querySelectorAll(".quiz-answer")].find(button => button.dataset.answer === question?.answer);
      if (target) target.click();
      await wait(160);
      subjectPlayed.push({ mode, subject, answered: Boolean(question) && Boolean(target) });
      const next = window.document.getElementById("quizNextButton");
      if (next) next.click();
      await wait(160);
    }
  }
  check("all five subjects are playable in both modes",
    subjectPlayed.every(entry => entry.answered),
    subjectPlayed.filter(entry => entry.mode === "previous").map(entry => entry.subject).join(", "));

  /* ---------------------------------------------------------------- feel pack */
  const BAND_SECONDS = { NORMAL: 45, HARD: 35, INSANE: 30, IMPOSSIBLE: 20 };
  const timerProblems = [];
  const badgeProblems = [];
  const mysteryProblems = [];
  window.setQuestioner("previous");
  for (const modifierId of ["NONE", "DOUBLE_COINS", "TIME_RUSH", "MYSTERY"]) {
    const found = findLevelWithModifier(window, "SCIENCE", "SUBJECT 1", modifierId);
    if (!found) { badgeProblems.push(`${modifierId}: no level found`); continue; }
    window.openSubjectSelection("SCIENCE");
    window.openLevelSelection("A");
    window.startQuizAtSelectedLevel("A", found.level);
    await wait(180);
    const active = quizStateNow(window).modifier;
    const badge = window.document.getElementById("quizModifierBadge");
    if (!active || active.id !== modifierId) badgeProblems.push(`${modifierId}: state is ${active && active.id}`);
    if (modifierId === "NONE") {
      if (badge && !badge.hidden) badgeProblems.push("NONE: badge is still visible");
    } else if (!badge || badge.hidden || !badge.textContent.includes(active.label)) {
      badgeProblems.push(`${modifierId}: badge "${badge ? badge.textContent : "missing"}"`);
    }

    const question = quizStateNow(window).questions[quizStateNow(window).index];
    const base = BAND_SECONDS[question.difficulty] || 30;
    const expected = Math.max(12, base + (Number(active.timerDelta) || 0));
    if (!(quizStateNow(window).timer <= expected && quizStateNow(window).timer >= expected - 2)) {
      timerProblems.push(`${modifierId} L${found.level}: timer ${quizStateNow(window).timer} != ${expected}`);
    }

    if (modifierId === "MYSTERY") {
      const hidden = [...window.document.querySelectorAll(".quiz-answer.mystery")];
      const visible = [...window.document.querySelectorAll(".quiz-answer:not(:disabled)")];
      if (hidden.length !== 1) mysteryProblems.push(`hidden answers: ${hidden.length}`);
      if (visible.length !== 3) mysteryProblems.push(`visible answers: ${visible.length}`);
      if (hidden.length === 1 && hidden[0].dataset.answer === quizStateNow(window).currentCorrect) mysteryProblems.push("the correct answer was hidden");
    }
  }
  check("level twists match the deterministic table and shorten the clock", badgeProblems.length === 0 && timerProblems.length === 0,
    [...badgeProblems, ...timerProblems].join(" | ") || "NONE / DOUBLE_COINS / TIME_RUSH / MYSTERY verified");
  check("MYSTERY hides exactly one wrong answer", mysteryProblems.length === 0, mysteryProblems.join(" | ") || "one wrong answer hidden, correct answer kept");

  /* No hint on a NO HINT level. */
  const noHint = findLevelWithModifier(window, "MATH", "SUBJECT 1", "NO_HINT");
  window.eval("itemInventory.hint = 5");
  window.openSubjectSelection("MATH");
  window.openLevelSelection("A");
  window.startQuizAtSelectedLevel("A", noHint.level);
  await wait(180);
  const hintBlocked = window.canUseItem("hint") === false;
  const hintUsed = window.useItem("hint") === false;
  const feedback = document_getText(window, "quizItemFeedback") || document_getText(window, "itemFeedback");
  check("NO HINT blocks the hint item with a clear message", hintBlocked && hintUsed,
    `canUseItem=${!hintBlocked ? "allowed" : "blocked"}, feedback="${feedback.slice(0, 60)}"`);

  /* Combo meter: three correct answers in a row. */
  window.setQuestioner("previous");
  window.openSubjectSelection("MATH");
  window.openLevelSelection("A");
  window.startQuizAtSelectedLevel("A", 1);
  await wait(180);
  const coinBank = sample.previous;
  for (let step = 0; step < 3; step += 1) {
    answerThroughUi(window, coinBank, true);
    await wait(180);
    const next = window.document.getElementById("quizNextButton");
    if (next) next.click();
    await wait(200);
  }
  const meter = window.document.getElementById("quizComboMeter");
  const meterLabel = document_getText(window, "quizComboLabel");
  const meterShown = Boolean(meter && meter.classList.contains("show"));
  check("the combo meter appears and names the next multiplier",
    quizStateNow(window).streak >= 3 && meterShown && /×\d/.test(meterLabel),
    `streak ${quizStateNow(window).streak}, label "${meterLabel}", shown ${meterShown}`);

  /* Speed bonus and perfect level bonus pay out in coins. */
  const coinsBeforePerfect = Number(quizStateNow(window).coins || 0);
  window.openSubjectSelection("MATH");
  window.openLevelSelection("A");
  window.startQuizAtSelectedLevel("A", 5);
  await wait(180);
  const perfectLevel = quizStateNow(window).index + 1;
  const perfectAnswers = window.eval(`getPerfectLevelCount()`);
  answerThroughUi(window, coinBank, true);
  await wait(180);
  const nextPerfect = window.document.getElementById("quizNextButton");
  if (nextPerfect) nextPerfect.click();
  await wait(250);
  const perfectAfter = window.eval("getPerfectLevelCount()");
  check("a perfect level is counted and paid", perfectAfter > perfectAnswers,
    `perfect levels ${perfectAnswers} → ${perfectAfter}, coins ${coinsBeforePerfect} → ${quizStateNow(window)?.coins ?? "n/a"} at L${perfectLevel}`);

  /* Sudden death ends the run on the first finalized wrong answer. */
  const sudden = findLevelWithModifier(window, "TECH 2", "SUBJECT 2", "SUDDEN_DEATH");
  window.openSubjectSelection("TECH 2");
  window.openLevelSelection("B");
  window.startQuizAtSelectedLevel("B", sudden.level);
  await wait(180);
  window.eval("quizState.itemState.secondChanceUsed = true");
  answerThroughUi(window, sample.previous, false);
  await wait(200);
  const suddenLives = quizStateNow(window).lives;
  const suddenNext = window.document.getElementById("quizNextButton");
  if (suddenNext) suddenNext.click();
  await wait(300);
  const gameOverShown = Boolean(window.document.getElementById("gameOverScreen")?.classList.contains("show"));
  check("SUDDEN DEATH ends the run after one wrong answer", suddenLives === 0 && gameOverShown,
    `lives ${suddenLives}, game over screen ${gameOverShown}`);

  /* Mistake Vault: a wrong answer is stored, the drill plays it, and the drill is free. */
  window.document.getElementById("gameOverScreen")?.classList.remove("show");
  window.setQuestioner("previous");
  window.openSubjectSelection("PSYCHOLOGY");
  window.openLevelSelection("A");
  window.startQuizAtSelectedLevel("A", 12);
  await wait(180);
  const storedBefore = window.eval("loadMistakeVault().length");
  const wrongAnswer = answerThroughUi(window, sample.previous, false);
  await wait(220);
  const storedAfter = window.eval("loadMistakeVault().length");
  const vaultStatus = document_getText(window, "mistakeVaultHomeStatus");
  const vaultCardEnabled = window.document.getElementById("mistakeVaultCard")?.disabled === false;
  check("a wrong answer lands in the Mistake Vault and updates the home card",
    storedAfter === storedBefore + 1 && vaultCardEnabled && /TO CLEAR/.test(vaultStatus),
    `entries ${storedBefore} → ${storedAfter}, status "${vaultStatus}"`);

  window.eval("closeQuizVisualOnly(); document.body.classList.remove('quiz-active');");
  const coinsBeforeDrill = Number(window.eval("gameData.coins"));
  const pointsBeforeDrill = Number(window.eval("gameData.points"));
  const progressBeforeDrill = window.getQuizProgress("PSYCHOLOGY", "SUBJECT 1");
  window.startMistakeVaultDrill();
  await wait(220);
  const drillMode = quizStateNow(window).mode;
  const drillFirst = quizStateNow(window).questions[0]?.id;
  const drillClass = window.document.body.classList.contains("vault-active");
  answerThroughUi(window, sample.previous, true);
  await wait(220);
  const drillNext = window.document.getElementById("quizNextButton");
  if (drillNext) drillNext.click();
  await wait(300);
  const coinsAfterDrill = Number(window.eval("gameData.coins"));
  const pointsAfterDrill = Number(window.eval("gameData.points"));
  const progressAfterDrill = window.getQuizProgress("PSYCHOLOGY", "SUBJECT 1");
  const streakAfterDrill = window.eval(`loadMistakeVault().find(entry => entry.id === '${wrongAnswer.question?.id}')?.correctStreak ?? -1`);
  check("the Mistake Vault drill replays the stored question without touching progression",
    drillMode === "vault" && drillFirst === wrongAnswer.question?.id && drillClass &&
    coinsAfterDrill === coinsBeforeDrill && pointsAfterDrill === pointsBeforeDrill && progressAfterDrill === progressBeforeDrill,
    `mode ${drillMode}, question ${drillFirst}, coins ${coinsBeforeDrill}→${coinsAfterDrill}, points ${pointsBeforeDrill}→${pointsAfterDrill}, progress ${progressBeforeDrill}→${progressAfterDrill}`);
  check("a correct retry moves the stored mistake towards retirement", streakAfterDrill === 1,
    `correct streak after retry: ${streakAfterDrill}`);
  /* Leave through the real BACK button; a drill must close without a confirm dialog. */
  window.closeQuizScreen();
  await wait(200);
  const drillExited = window.document.body.classList.contains("vault-active") === false;
  const drillScreenClosed = window.document.getElementById("quizScreen")?.classList.contains("show") === false;
  check("leaving the drill returns to the home screen",
    drillExited && drillScreenClosed && quizStateNow(window).mode === "normal",
    `class removed ${drillExited}, screen closed ${drillScreenClosed}, mode ${quizStateNow(window).mode}`);

  check("no JavaScript console errors from the questioner", problems.length === 0,
    problems.slice(0, 3).join(" | ") || "clean");

  dom.window.close();
}

async function runFileFallback() {
  const problems = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => {
    if (!/Not implemented/i.test(error.message)) problems.push(`jsdomError: ${error.message}`);
  });
  virtualConsole.on("error", (...args) => problems.push(`console.error: ${args.map(String).join(" ")}`));

  const dom = await JSDOM.fromFile(path.join(root, "index.html"), {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    virtualConsole
  });
  await wait(1500);
  const window = dom.window;
  const total = bank => SUBJECTS.reduce((sum, subject) => sum + SETS.reduce((rows, set) => rows + (bank?.[subject]?.[set]?.length || 0), 0), 0);
  check("embedded banks load from a plain file path (TrebEdit / offline)", total(window.questionBank) === 800 && total(window.newQuestionBank) === 800,
    `previous ${total(window.questionBank)}, new ${total(window.newQuestionBank)}`);
  check("no files are requested by absolute URL", !/["'(]https?:\/\//.test(fs.readFileSync(path.join(root, "index.html"), "utf8")),
    "index.html uses relative paths only");
  dom.window.close();
}

function document_getText(window, id) {
  const element = window.document.getElementById(id);
  return element ? (element.textContent || "").trim() : "";
}

serve(async (server, origin) => {
  try {
    await run(origin, server);
  } catch (error) {
    check("web check completed over HTTP", false, error.message);
  }
  server.close();
  try {
    await runFileFallback();
  } catch (error) {
    check("web check completed from file path", false, error.message);
  }
  const failed = results.filter(result => !result.passed);
  console.log(`\n${results.length - failed.length}/${results.length} web checks passed.`);
  process.exit(failed.length ? 1 : 0);
});
