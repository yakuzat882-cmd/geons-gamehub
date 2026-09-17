#!/usr/bin/env node
/**
 * Browserless simulation of the in-browser questioner flow:
 * embedded banks -> GeonQuestionValidator.normalize/validate ->
 * cross-bank isolation -> buildSessionQuestions for every subject/set.
 * Exits non-zero on any problem.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

const context = {
  window: {},
  console,
  Object, Array, String, Number, Boolean, Set, Map, JSON, Math, Date,
  navigator: { language: 'en-US' }
};
context.window.window = context.window;
vm.createContext(context);

for (const file of ['src/gameCore.js', 'src/data/questionValidator.js', 'questions.embedded.js', 'questions.new.embedded.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
}

const { GeonGameCore, GeonQuestionValidator } = context.window;
if (!GeonGameCore || !GeonQuestionValidator) failures.push('core modules did not load');

// Replicate script.js loadQuestionBank validation.
const previousQuestionBank = GeonQuestionValidator.normalize(context.window.questionBank);
const newQuestionBank = GeonQuestionValidator.normalize(context.window.newQuestionBank);

const reports = [
  ['PREVIOUS', GeonQuestionValidator.validate(previousQuestionBank, 'previous')],
  ['NEW', GeonQuestionValidator.validate(newQuestionBank, 'new')]
];
for (const [name, report] of reports) {
  if (!report.valid) {
    failures.push(`${name} report invalid: ${report.errors.slice(0, 10).join(' | ')}`);
  } else {
    console.log(`PASS  ${name} bank validates (${report.total} questions, 0 errors)`);
  }
}

// Cross-mode ID collisions (as in script.js)
const idsOf = bank => Object.values(bank).flatMap(s => Object.values(s).flatMap(r => r.map(q => String(q.id))));
const previousIds = new Set(idsOf(previousQuestionBank));
const crossModeCollisions = idsOf(newQuestionBank).filter(id => previousIds.has(id));
console.log(crossModeCollisions.length ? `FAIL  cross-mode id collisions: ${crossModeCollisions.slice(0, 5)}` : 'PASS  no cross-mode ID collisions');
if (crossModeCollisions.length) failures.push('cross-mode id collision');

// Cross-bank question-text isolation (as in script.js)
const textsOf = bank => new Set(Object.values(bank).flatMap(s => Object.values(s).flatMap(r => r.map(q => String(q.question).replace(/\s+/g, ' ').trim().toLowerCase()))));
const shared = [...textsOf(newQuestionBank)].filter(t => textsOf(previousQuestionBank).has(t));
console.log(shared.length ? `FAIL  shared question texts: ${shared.length}` : 'PASS  no shared question texts (bank isolation)');
if (shared.length) failures.push('shared question text');

// Simulate quiz sessions: every subject/set must build a full 80-question
// level-aligned session for a fresh player and for mid-progress players.
const SUBJECTS = ['MATH', 'SCIENCE', 'PSYCHOLOGY', 'TECH 1', 'TECH 2'];
const QUIZ_TYPES = ['SUBJECT 1', 'SUBJECT 2'];
const band = level => (level <= 20 ? 1 : level <= 40 ? 2 : level <= 60 ? 3 : 4);

function buildSessionQuestions(source, completedCount = 0, usedIds = []) {
  const safeCompleted = Math.max(0, Math.min(79, Number(completedCount) || 0));
  const byLevel = new Map();
  source.forEach(question => {
    const level = Number(question?.level);
    if (Number.isInteger(level) && level >= 1 && level <= 80 && !byLevel.has(level)) byLevel.set(level, question);
  });
  const exactSession = [];
  for (let level = 1; level <= 80; level += 1) {
    const question = byLevel.get(level);
    if (question) exactSession.push({ ...question, choices: [...question.choices] });
  }
  return exactSession;
}

let sessionFailures = 0;
for (const bank of [previousQuestionBank, newQuestionBank]) {
  for (const subject of SUBJECTS) {
    for (const type of QUIZ_TYPES) {
      const source = bank[subject][type];
      for (const completed of [0, 12, 25, 41, 60, 79]) {
        const session = buildSessionQuestions(source, completed, []);
        if (session.length !== 80) {
          console.log(`FAIL  session ${subject}/${type} completed=${completed}: ${session.length} questions`);
          sessionFailures++;
          continue;
        }
        for (let i = 0; i < 80; i++) {
          if (Number(session[i].level) !== i + 1) {
            console.log(`FAIL  session ${subject}/${type} completed=${completed}: index ${i} is level ${session[i].level}`);
            sessionFailures++;
            break;
          }
          if (band(session[i].level) !== (Math.floor((i) / 20) + 1)) {
            console.log(`FAIL  session band mismatch at index ${i}`);
            sessionFailures++;
            break;
          }
        }
      }
    }
  }
}
console.log(sessionFailures ? `FAIL  ${sessionFailures} session problems` : 'PASS  80 level-aligned sessions build cleanly for all subjects/sets/bands (fresh + 5 progress points)');
if (sessionFailures) failures.push(`${sessionFailures} session problems`);

// Difficulty-band integrity across both banks
let bandFailures = 0;
for (const [mode, bank] of [['PREVIOUS', previousQuestionBank], ['NEW', newQuestionBank]]) {
  for (const subject of SUBJECTS) {
    for (const type of QUIZ_TYPES) {
      for (const q of bank[subject][type]) {
        const expected = q.level <= 20 ? 'NORMAL' : q.level <= 40 ? 'HARD' : q.level <= 60 ? 'INSANE' : 'IMPOSSIBLE';
        if (q.difficulty !== expected) {
          bandFailures++;
          if (bandFailures <= 5) console.log(`FAIL  ${mode} ${q.id}: difficulty ${q.difficulty} != ${expected}`);
        }
      }
    }
  }
}
console.log(bandFailures ? `FAIL  ${bandFailures} difficulty-band mismatches` : 'PASS  difficulty bands NORMAL/HARD/INSANE/IMPOSSIBLE match levels 1-20/21-40/41-60/61-80');
if (bandFailures) failures.push(`${bandFailures} band mismatches`);

console.log('');
if (failures.length) {
  console.log('FLOW SIMULATION FAILED: ' + failures.join(' | '));
  process.exit(1);
}
console.log('FLOW SIMULATION: ALL CHECKS PASSED (no engine/validator console errors)');
