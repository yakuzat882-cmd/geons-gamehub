#!/usr/bin/env node
/**
 * V5 Question Bank Validation
 * Validates questions.json (PREVIOUS) and questions.new.json (NEW) against the
 * GEON GAMEHUB V5 prompt requirements:
 *  - exactly 800 questions per bank (5 subjects x 2 sets x 80 questions)
 *  - every subject/set contains levels 1-80 (exactly one question per level)
 *  - difficulty band per level: 1-20 NORMAL, 21-40 HARD, 41-60 INSANE, 61-80 IMPOSSIBLE
 *  - category distributions per subject/set
 *  - unique IDs with mode/subject/set/level structure
 *  - no duplicate question text within a bank (any level/set/subject)
 *  - no shared question text between PREVIOUS and NEW banks
 *  - answer membership: choices = 4, answer is one of them, no duplicate choices
 *  - no placeholder/filler question text
 *  - answer-position distribution sanity (no single position dominating,
 *    correct answer not systematically the longest option)
 *
 * Exits non-zero when any check fails.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SUBJECTS = ['MATH', 'PSYCHOLOGY', 'SCIENCE', 'TECH 1', 'TECH 2'];
const SETS = ['SUBJECT 1', 'SUBJECT 2'];

const CATEGORY_EXPECTED = {
  MATH: {
    'MULTIPLICATION': 15,
    'DIVISION': 15,
    'ADDITION': 15,
    'SUBTRACTION': 15,
    'PROBLEM SOLVING': 20,
  },
  PSYCHOLOGY: {
    'MIND MANIPULATIONS': 20,
    'SELF RESILIENCE': 20,
    'CONVINCE OTHERS': 20,
    'HOW TO BECOME UNSTOPPABLE': 20,
  },
  SCIENCE: {
    'SOLID, LIQUID, GAS': 15,
    'TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS': 15,
    "PASCAL'S PRINCIPLES": 20,
    "ARCHIMEDE'S PRINCIPLES": 15,
    'HISTORY': 15,
  },
  'TECH 1': {
    'SYSTEM UNIT AND ITS COMPONENTS': 30,
    'OHS GUIDELINES AND DMA PROCEDURES': 20,
    'ASSEMBLE AND DISASSEMBLE SYSTEM UNIT': 30,
  },
  'TECH 2': {
    'BIOS, CMOS, UEFI': 30,
    'NETWORKING': 20,
    'WINDOWS INSTALLATION': 20,
    'SAFETY PROCEDURES': 10,
  },
};

function bandFor(level) {
  if (level >= 1 && level <= 20) return 'NORMAL';
  if (level >= 21 && level <= 40) return 'HARD';
  if (level >= 41 && level <= 60) return 'INSANE';
  return 'IMPOSSIBLE';
}

const PLACEHOLDER_RE = /^\s*(question\s*\d*|q\d*|test|placeholder|dummy|todo|fixme|lorem\s+ipsum|answer\s+\w+|option\s+[a-d])\b/i;
const PLACEHOLDER_CHOICE_RE = /^\s*(option\s*\d*|choice\s*\d*|correct answer|wrong answer|placeholder|filler|xxx|n\/?a)\b/i;

const errors = [];
const warnings = [];
function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

function normalizeQuestionText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function loadBank(file, mode) {
  const p = path.join(ROOT, file);
  const raw = fs.readFileSync(p, 'utf8');
  const bank = JSON.parse(raw);
  const seenIds = new Map();
  const seenTexts = new Map();
  const stats = { position: { 0: 0, 1: 0, 2: 0, 3: 0 }, longestCorrect: 0, questions: 0 };
  let total = 0;

  for (const subject of SUBJECTS) {
    if (!(subject in bank)) { err(`${mode}: missing subject ${subject}`); continue; }
    for (const set of SETS) {
      const arr = bank[subject] && bank[subject][set];
      if (!Array.isArray(arr)) { err(`${mode}: ${subject}/${set} is not an array`); continue; }
      if (arr.length !== 80) err(`${mode}: ${subject}/${set} has ${arr.length} questions, expected 80`);
      const levelSeen = new Map();
      const catCount = {};
      const seenChoiceSets = new Map();
      const positionCount = { 0: 0, 1: 0, 2: 0, 3: 0 };
      let longestCorrect = 0;
      let totalCorrectLen = 0;
      let totalAllLen = 0;

      arr.forEach((q, i) => {
        total++;
        const label = `${mode}: ${subject}/${set} item ${i}`;

        // ID checks
        if (typeof q.id !== 'string' || !q.id) { err(`${label}: missing id`); }
        else if (seenIds.has(q.id)) { err(`${label}: duplicate id ${q.id}`); }
        else seenIds.set(q.id, 1);

        // Subject / set / level fields
        if (q.subject !== subject) err(`${label}: subject field "${q.subject}" != ${subject}`);
        if (q.quizPath !== set) err(`${label}: quizPath "${q.quizPath}" != ${set}`);
        const lvl = q.level;
        if (!Number.isInteger(lvl) || lvl < 1 || lvl > 80) {
          err(`${label}: invalid level ${JSON.stringify(lvl)}`);
        } else {
          if (levelSeen.has(lvl)) err(`${label}: level ${lvl} appears more than once in ${subject}/${set}`);
          levelSeen.set(lvl, 1);
          if (q.difficulty !== bandFor(lvl)) {
            err(`${label}: level ${lvl} difficulty "${q.difficulty}" != expected ${bandFor(lvl)}`);
          }
          const idHasMode = q.id.startsWith(mode === 'PREVIOUS' ? 'PREVIOUS-' : 'NEW-');
          const idHasSubject = q.id.toUpperCase().includes(subject.replace(' ', '_').toUpperCase());
          const idHasSet = q.id.includes(set === 'SUBJECT 1' ? 'SUBJECT_1' : 'SUBJECT_2');
          const idHasLevel = q.id.includes(`L${String(lvl).padStart(2, '0')}`) || q.id.includes(`-L${lvl}`);
          if (!idHasMode) warn(`${label}: id ${q.id} lacks mode marker`);
          if (!idHasSubject) warn(`${label}: id ${q.id} lacks subject marker`);
          if (!idHasSet) warn(`${label}: id ${q.id} lacks set marker`);
          if (!idHasLevel) warn(`${label}: id ${q.id} lacks level marker`);
        }

        // Category
        const cat = String(q.category || '').trim().toUpperCase();
        if (!cat) { err(`${label}: missing category`); }
        else {
          catCount[cat] = (catCount[cat] || 0) + 1;
          if (!(cat in CATEGORY_EXPECTED[subject])) {
            err(`${label}: unknown category "${q.category}" for ${subject}`);
          }
        }

        // Question text
        const qt = q.question;
        if (typeof qt !== 'string' || qt.trim().length < 5) {
          err(`${label}: missing/short question text`);
        } else if (PLACEHOLDER_RE.test(qt)) {
          err(`${label}: placeholder-looking question: ${JSON.stringify(qt.slice(0, 60))}`);
        } else {
          const key = normalizeQuestionText(qt);
          if (seenTexts.has(key)) {
            err(`${label}: duplicate question text (first seen ${seenTexts.get(key)})`);
          } else {
            seenTexts.set(key, label);
          }
        }

        // Choices + answer
        if (!Array.isArray(q.choices) || q.choices.length !== 4) {
          err(`${label}: choices must be an array of 4 (got ${Array.isArray(q.choices) ? q.choices.length : 'n/a'})`);
        } else {
          const normChoices = q.choices.map((c) => String(c).trim());
          const distinct = new Set(normChoices.map((c) => normalizeQuestionText(c)));
          if (distinct.size !== 4) err(`${label}: duplicate choices`);
          if (q.choices.some((c) => typeof c !== 'string' || !c.trim())) {
            err(`${label}: empty/invalid choice`);
          }
          if (q.choices.some((c) => PLACEHOLDER_CHOICE_RE.test(String(c)))) {
            err(`${label}: placeholder choice ${JSON.stringify(q.choices.find((c) => PLACEHOLDER_CHOICE_RE.test(String(c))))}`);
          }
          const choiceSetKey = JSON.stringify(normChoices.slice().sort()) + '|' + String(q.answer || '').trim();
          if (seenChoiceSets.has(choiceSetKey)) {
            err(`${label}: repeated exact answer set (choices+answer) first seen ${seenChoiceSets.get(choiceSetKey)}`);
          } else {
            seenChoiceSets.set(choiceSetKey, label);
          }
          const correct = String(q.answer || '').trim();
          if (!q.choices.includes(q.answer)) {
            err(`${label}: answer ${JSON.stringify(q.answer)} not among choices`);
          } else {
            const pos = q.choices.indexOf(q.answer);
            positionCount[pos] = (positionCount[pos] || 0) + 1;
            stats.position[pos] = (stats.position[pos] || 0) + 1;
            stats.questions++;
            const lens = normChoices.map((c) => c.length);
            const max = Math.max(...lens);
            const min = Math.min(...lens);
            if (lens[pos] === max && max > min && normChoices.filter((c) => c.length === max).length === 1) {
              // correct is strictly the unique longest option — length becomes a guessing clue
              longestCorrect++;
              stats.longestCorrect++;
            }
            totalCorrectLen += lens[pos];
            totalAllLen += lens.reduce((a, b) => a + b, 0);
          }
        }

        if (q.explanation === undefined) err(`${label}: missing explanation`);
      });

      // Levels 1-80 all present
      for (let l = 1; l <= 80; l++) {
        if (!levelSeen.has(l)) err(`${mode}: ${subject}/${set} missing level ${l}`);
      }

      // Category distribution
      for (const [cat, expected] of Object.entries(CATEGORY_EXPECTED[subject])) {
        const got = catCount[cat] || 0;
        if (got !== expected) {
          err(`${mode}: ${subject}/${set} category ${cat} = ${got}, expected ${expected}`);
        }
      }
      for (const [cat, got] of Object.entries(catCount)) {
        if (!(cat in CATEGORY_EXPECTED[subject])) continue;
      }

      // Answer position distribution across the 80-question set
      const positions = Object.values(positionCount).filter((n) => n > 0);
      const maxPos = Math.max(0, ...positions);
      if (maxPos > 45) {
        err(`${mode}: ${subject}/${set} answer-position bias: one option holds ${maxPos}/80 correct answers`);
      }
      const uniqueLongestShare = arr.length ? Math.round((longestCorrect / arr.length) * 100) : 0;
      if (uniqueLongestShare > 35) {
        warn(`${mode}: ${subject}/${set} correct answer is the unique longest option in ${uniqueLongestShare}% of questions`);
      }
      void totalCorrectLen; void totalAllLen;
    }
  }

  if (total !== 800) err(`${mode}: total question count ${total} != 800`);
  const longestShare = stats.questions ? Math.round((stats.longestCorrect / stats.questions) * 100) : 0;
  console.log(
    `${mode}: static answer-position distribution A=${stats.position[0]} B=${stats.position[1]} C=${stats.position[2]} D=${stats.position[3]}; ` +
    `correct is unique-longest in ${longestShare}% of questions`
  );
  return { bank, seenTexts, total };
}

console.log('== V5 question bank validation ==\n');
const prev = loadBank('questions.json', 'PREVIOUS');
console.log(`PREVIOUS: ${prev.total} questions loaded.`);
const fresh = loadBank('questions.new.json', 'NEW');
console.log(`NEW: ${fresh.total} questions loaded.\n`);

// Bank-wide answer-position sanity (across all 800 questions per mode).
const positionTotals = { PREVIOUS: { 0: 0, 1: 0, 2: 0, 3: 0 }, NEW: { 0: 0, 1: 0, 2: 0, 3: 0 } };
for (const [mode, data] of [['PREVIOUS', prev], ['NEW', fresh]]) {
  for (const s of Object.keys(data.bank)) for (const st of Object.keys(data.bank[s])) {
    for (const q of data.bank[s][st]) {
      const pos = Array.isArray(q.choices) ? q.choices.indexOf(q.answer) : -1;
      if (pos >= 0) positionTotals[mode][pos]++;
    }
  }
  const maxPos = Math.max(...Object.values(positionTotals[mode]));
  if (maxPos > 400) err(`${mode}: bank-wide answer-position bias — one option holds ${maxPos}/800 correct answers`);
}

// Cross-bank isolation: no identical question text between banks.
const shared = [];
for (const [text, label] of prev.seenTexts) {
  if (fresh.seenTexts.has(text)) shared.push(text);
}
if (shared.length) {
  err(`ISOLATION: ${shared.length} question texts shared between PREVIOUS and NEW: ${shared.slice(0, 5).map((s) => `"${s.slice(0, 60)}"`).join(', ')}`);
} else {
  console.log('ISOLATION: no shared question text between PREVIOUS and NEW.');
}

// Cross-bank id collision
const allIds = new Map();
for (const q of Object.values(prev.bank).flatMap((s) => Object.values(s).flat())) {
  allIds.set(q.id, allIds.get(q.id) || []);
  allIds.get(q.id).push('PREVIOUS');
}
for (const q of Object.values(fresh.bank).flatMap((s) => Object.values(s).flat())) {
  if (!allIds.has(q.id)) allIds.set(q.id, []);
  allIds.get(q.id).push('NEW');
}
for (const [id, owners] of allIds) {
  if (new Set(owners).size > 1) err(`ISOLATION: id ${id} exists in both banks`);
}

// Embedded JS mirrors JSON
for (const [file, jsFile, mode] of [
  ['questions.json', 'questions.embedded.js', 'PREVIOUS'],
  ['questions.new.json', 'questions.new.embedded.js', 'NEW'],
]) {
  const js = fs.readFileSync(path.join(ROOT, jsFile), 'utf8');
  const start = js.indexOf('{');
  const end = js.lastIndexOf('}');
  try {
    const embedded = JSON.parse(js.slice(start, end + 1));
    if (JSON.stringify(embedded) !== JSON.stringify(JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')))) {
      err(`${mode}: ${jsFile} does not mirror ${file}`);
    } else {
      console.log(`${mode}: ${jsFile} mirrors ${file}.`);
    }
  } catch (e) {
    err(`${mode}: ${jsFile} is not valid JSON: ${e.message}`);
  }
}

console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
if (warnings.length) {
  console.log('\nWarnings:');
  warnings.slice(0, 40).forEach((w) => console.log('  - ' + w));
}
if (errors.length) {
  console.log('\nErrors:');
  errors.slice(0, 120).forEach((e) => console.log('  ! ' + e));
  if (errors.length > 120) console.log(`  ... and ${errors.length - 120} more`);
  process.exit(1);
}
console.log('ALL BANK VALIDATION CHECKS PASSED');
