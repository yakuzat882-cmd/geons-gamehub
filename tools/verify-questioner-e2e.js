#!/usr/bin/env node
/*
 * Headless-DOM end-to-end verification of the Geon's GameHub questioner
 * upgrade. Loads the real index.html + script.js + data files inside jsdom,
 * then drives the actual quiz flow:
 *
 *   1. Both question banks load; runtime validation reports are clean.
 *   2. Previous/New datasets are isolated (no shared ids or question text).
 *   3. All 5 subjects start for BOTH questioners, at a level in every
 *      difficulty band (NORMAL/HARD/INSANE/IMPOSSIBLE), via the real
 *      level-selection entry point.
 *   4. Questions render with 4 clickable answers; answering advances the
 *      engine; progress saves per questioner mode.
 *   5. Progress and used-question ids stay isolated between questioners.
 *   6. No console errors or uncaught exceptions at any step.
 *
 * Usage: node tools/verify-questioner-e2e.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");

const consoleErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (...args) => consoleErrors.push(args.map(String).join(" ")));
virtualConsole.on("jsdomError", (err) => {
  const text = String((err && err.message) || err);
  if (/not implemented/i.test(text)) return;
  consoleErrors.push(text);
});

const rawHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
/* Inline every same-origin script so jsdom executes them as classic
   scripts — top-level let/const become true page globals, exactly like a
   real browser. */
const scriptSrcs = [...rawHtml.matchAll(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => m[1]);
const html = rawHtml.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const code = fs.readFileSync(path.join(ROOT, src), "utf8");
  return `<script>\n${code}\n</script>`;
});

const dom = new JSDOM(html, {
  url: "http://localhost:8080/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;

/* --- minimal browser stubs the app expects --------------------------- */
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = function () {};
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = function () {};
if (!window.AudioContext) {
  window.AudioContext = function () {
    return {
      currentTime: 0, destination: {},
      createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; },
      createGain() { return { connect() {}, gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; },
      resume() { return Promise.resolve(); }
    };
  };
}
window.webkitAudioContext = window.AudioContext;

/* Load-error tracking for the inline scripts happens through the
   virtualConsole's jsdomError channel. */

const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push(["PASS", name]);
  } catch (err) {
    results.push(["FAIL", `${name} :: ${err.message}`]);
  }
};
const assert = (cond, msg) => { if (!cond) throw new Error(msg || "assertion failed"); };
const evalIn = (code) => window.eval(code);

const settle = (ms) => new Promise(r => setTimeout(r, ms));
const storageKeys = () => {
  const keys = [];
  for (let i = 0; i < window.localStorage.length; i += 1) keys.push(window.localStorage.key(i));
  return keys;
};

(async () => {
  await settle(300);

  /* ---- 1. banks loaded + runtime validation clean -------------------- */
  check("both question banks are present in memory", () => {
    assert(evalIn("window.questionBank && Object.keys(window.questionBank).length") === 5, "window.questionBank missing subjects");
    assert(evalIn("window.newQuestionBank && Object.keys(window.newQuestionBank).length") === 5, "window.newQuestionBank missing subjects");
  });

  check("runtime validation reports are valid and isolated", () => {
    const report = evalIn("window.ProudGeonQuizQuestionValidation");
    assert(report, "validation report missing");
    assert(report.crossModeCollisions.length === 0, "id collisions across modes");
    assert(report.crossModeTextCollisions.length === 0, "text collisions across modes");
    for (const [, rep] of report.reports) {
      assert(rep.valid === true, `validator: ${rep.errors.slice(0, 3).join("; ")}`);
      assert(rep.total === 800, "validator total");
    }
  });

  /* ---- 2. drive the real quiz flow ----------------------------------- */
  async function startAndVerify(subject, quizType, level) {
    evalIn(`selectedSubject = ${JSON.stringify(subject)};`);
    const box = quizType === "SUBJECT 1" ? "A" : "B";
    evalIn(`startQuizAtSelectedLevel(${JSON.stringify(box)}, ${level});`);
    await settle(30);
    const state = evalIn("quizState");
    assert(state && state.questions.length === 80, `session should hold 80 questions for ${subject}/${quizType}`);
    assert(state.subject === subject, "session subject");
    assert(state.index === level - 1, "session must start at the selected level");
    const q = state.questions[state.index];
    assert(q.level === level, "exact level alignment");
    assert(q.choices.length === 4, "question renders with 4 choices");
    assert(window.document.querySelectorAll(".quiz-answer").length === 4, "four answer buttons rendered");
    assert(window.document.getElementById("quizQuestionText").textContent.trim().length > 0, "question text rendered");
    /* answer correctly through the real handler */
    evalIn(`handleQuizAnswer(${JSON.stringify(q.answer)}, false, null);`);
    await settle(30);
    const after = evalIn("({ selected: quizState.selected, score: quizState.score, lives: quizState.lives })");
    assert(after.selected === true, "engine registered the answer selection");
    /* every question must belong to the active questioner's bank */
    const prefix = evalIn("getActiveQuestioner()") === "new" ? "NEW-" : "PREVIOUS-";
    assert(q.id.startsWith(prefix), `${q.id} must belong to ${prefix} bank`);
    /* advance via the real next button handler */
    evalIn("nextQuizStep();");
    await settle(30);
    const state2 = evalIn("quizState");
    assert(state2.index === level, "NEXT advances the index");
    return q;
  }

  const bands = [3, 27, 47, 70];
  let played = 0;
  const idsByQuestioner = { previous: new Set(), new: new Set() };
  for (const questioner of ["previous", "new"]) {
    check(`questioner selector accepts ${questioner}`, () => {
      evalIn(`settingsData.questioner = ${JSON.stringify(questioner)};`);
      assert(evalIn("getActiveQuestioner()") === questioner);
    });
    for (const subject of ["TECH 1", "TECH 2", "MATH", "SCIENCE", "PSYCHOLOGY"]) {
      for (const level of bands) {
        const q = await startAndVerify(subject, "SUBJECT 1", level);
        played += 1;
        idsByQuestioner[questioner].add(q.id);
      }
    }
  }
  check(`played band-aligned questions: 5 subjects x 4 bands x 2 questioners (${played})`, () => {
    assert(played === 40, "expected 40 quiz starts");
    for (const [qer, ids] of Object.entries(idsByQuestioner)) {
      for (const id of ids) {
        assert(id.startsWith(qer === "new" ? "NEW-" : "PREVIOUS-") === true, `${id} leaked into ${qer} flow`);
      }
    }
  });

  /* ---- 2b. wrong-answer path reacts through the real engine ----------- */
  check("a wrong answer keeps the flow alive and marks the choice", () => {
    evalIn('settingsData.questioner = "previous";');
    evalIn('selectedSubject = "MATH";');
    evalIn('startQuizAtSelectedLevel("A", 11);');
    const wrong = evalIn('(function(){const q=quizState.questions[quizState.index];return q.choices.find(c=>c!==q.answer);})()');
    evalIn(`handleQuizAnswer(${JSON.stringify(wrong)}, false, null);`);
    const lives = evalIn("quizState.lives");
    assert(lives === 7, `lives should drop from 8 to 7 after a wrong answer, got ${lives}`);
    evalIn("nextQuizStep();");
  });

  /* ---- 3. progress isolation ------------------------------------------ */
  check("progress and used-question storage keys are isolated per questioner", () => {
    const keys = storageKeys().filter(k => k.startsWith("proudGeonQuiz"));
    const progress = keys.filter(k => k.startsWith("proudGeonQuizProgress"));
    assert(progress.some(k => k.includes(":new:")), "NEW questioner progress keys present");
    assert(progress.some(k => !k.includes(":new:") && k !== "proudGeonQuizProgress"), "PREVIOUS questioner progress keys present");
    const used = keys.filter(k => k.startsWith("proudGeonQuizUsedQuestions"));
    assert(used.some(k => k.includes(":new:")) && used.some(k => !k.includes(":new:")), "used-id lists per questioner");
  });

  check("each questioner's bank only serves its own ids", () => {
    for (const questioner of ["previous", "new"]) {
      evalIn(`settingsData.questioner = ${JSON.stringify(questioner)};`);
      const prefix = questioner === "new" ? "NEW-" : "PREVIOUS-";
      const leaked = evalIn(`(function(){const bank=getActiveQuestionBank();const bad=[];for(const s of Object.keys(bank)){for(const t of Object.keys(bank[s])){for(const q of bank[s][t]){if(!q.id.startsWith("${prefix}"))bad.push(q.id);}}}return bad;})()`);
      assert(leaked.length === 0, `leaked ids in ${questioner}: ${leaked.slice(0, 3)}`);
    }
  });

  /* ---- 4. reviewer pools ---------------------------------------------- */
  check("reviewer pools build for both questioners", () => {
    for (const questioner of ["previous", "new"]) {
      const pool = evalIn(`getReviewSubjectPool("MATH", ${JSON.stringify(questioner)})`);
      assert(pool.length === 160, `MATH reviewer pool for ${questioner}`);
    }
  });

  /* ---- 5. daily challenge --------------------------------------------- */
  check("daily challenge builds 10 questions per questioner", () => {
    for (const questioner of ["previous", "new"]) {
      evalIn(`settingsData.questioner = ${JSON.stringify(questioner)};`);
      const state = evalIn("getDailyChallengeState(getDailyChallengeDate(), getActiveQuestioner())");
      assert(state.questionIds.length === 10, `daily challenge plans 10 ids for ${questioner}`);
      const qs = evalIn("getDailyChallengeQuestions(getDailyChallengeState(getDailyChallengeDate(), getActiveQuestioner()))");
      assert(qs.length === 10, `daily challenge resolves 10 questions for ${questioner}`);
      const prefix = questioner === "new" ? "NEW-" : "PREVIOUS-";
      for (const q of qs) assert(q.id.startsWith(prefix), `${q.id} leaked into ${questioner} daily challenge`);
    }
  });

  /* ---- console error gate --------------------------------------------- */
  check("no console errors during the whole flow", () => {
    const relevant = consoleErrors.filter(e => !/Not implemented|Could not load/i.test(e));
    assert(relevant.length === 0, `console errors: ${relevant.slice(0, 5).join(" || ")}`);
  });

  let failed = 0;
  for (const [status, name] of results) {
    console.log(`${status === "PASS" ? "  \u2714" : "  \u2718"} ${name}`);
    if (status === "FAIL") failed += 1;
  }
  console.log(failed === 0 ? `\nE2E VERIFICATION PASSED (${results.length} checks)` : `\nE2E VERIFICATION FAILED (${failed}/${results.length})`);
  process.exit(failed ? 1 : 0);
})().catch(err => {
  console.error("E2E crashed:", err);
  process.exit(1);
});
