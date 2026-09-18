const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const subjects = ["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"];
const quizTypes = ["SUBJECT 1", "SUBJECT 2"];
const expected = {
  "MATH": {"MULTIPLICATION":15,"DIVISION":15,"ADDITION":15,"SUBTRACTION":15,"PROBLEM SOLVING":20},
  "PSYCHOLOGY": {"MIND MANIPULATIONS":20,"SELF RESILIENCE":20,"CONVINCE OTHERS":20,"HOW TO BECOME UNSTOPPABLE":20},
  "SCIENCE": {"SOLID, LIQUID, GAS":15,"TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS":15,"PASCAL'S PRINCIPLES":20,"ARCHIMEDE'S PRINCIPLES":15,"HISTORY":15},
  "TECH 1": {"SYSTEM UNIT AND ITS COMPONENTS":30,"OHS GUIDELINES AND DMA PROCEDURES":20,"ASSEMBLE AND DISASSEMBLE SYSTEM UNIT":30},
  "TECH 2": {"BIOS, CMOS, UEFI":30,"NETWORKING":20,"WINDOWS INSTALLATION":20,"SAFETY PROCEDURES":10}
};

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
}

function rows(bank) {
  return subjects.flatMap(subject => quizTypes.flatMap(type => bank[subject][type]));
}

test("previous and new questioner banks are complete and isolated", () => {
  const previous = load("questions.json");
  const newer = load("questions.new.json");
  assert.equal(rows(previous).length, 800);
  assert.equal(rows(newer).length, 800);

  for (const [mode, bank] of [["previous", previous], ["new", newer]]) {
    const ids = new Set();
    const questions = new Set();
    for (const subject of subjects) {
      for (const type of quizTypes) {
        const group = bank[subject][type];
        assert.equal(group.length, 80);
        assert.deepEqual(new Set(group.map(q => q.level)), new Set(Array.from({length:80}, (_,i)=>i+1)));
        const counts = Object.fromEntries(Object.keys(expected[subject]).map(k => [k, 0]));
        for (const q of group) {
          assert.equal(q.subject, subject);
          assert.equal(q.quizType, type);
          assert.equal(q.id.startsWith(mode.toUpperCase() + "-"), true);
          assert.equal(q.answer in Object.fromEntries(q.choices.map(x => [x,true])), true);
          assert.equal(new Set(q.choices).size, 4);
          assert.equal(ids.has(q.id), false);
          ids.add(q.id);
          assert.equal(questions.has(q.question), false);
          questions.add(q.question);
          counts[q.category] = (counts[q.category] || 0) + 1;
          const expectedDifficulty = q.level <= 20 ? "NORMAL" : q.level <= 40 ? "HARD" : q.level <= 60 ? "INSANE" : "IMPOSSIBLE";
          assert.equal(q.difficulty, expectedDifficulty);
        }
        assert.deepEqual(counts, expected[subject]);
      }
    }
  }

  const previousIds = new Set(rows(previous).map(q => q.id));
  const newIds = new Set(rows(newer).map(q => q.id));
  assert.equal([...previousIds].some(id => newIds.has(id)), false);

  const previousSignatures = new Set(rows(previous).map(q => JSON.stringify([q.question.toLowerCase(), [...q.choices].sort(), q.answer, q.category, q.subject, q.level])));
  assert.equal(rows(newer).some(q => previousSignatures.has(JSON.stringify([q.question.toLowerCase(), [...q.choices].sort(), q.answer, q.category, q.subject, q.level]))), false);
});

test("embedded fallbacks expose the same isolated datasets", () => {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "questions.embedded.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "questions.new.embedded.js"), "utf8"), context);
  assert.equal(Object.keys(context.window.questionBank).length, 5);
  assert.equal(Object.keys(context.window.newQuestionBank).length, 5);
  assert.equal(rows(context.window.questionBank).length, 800);
  assert.equal(rows(context.window.newQuestionBank).length, 800);
});

/* ------------------------------------------------------------------ */
/* Questioner content-quality gates (questioner upgrade)               */
/* ------------------------------------------------------------------ */

const normalizeText = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const allQuestions = (bank) => subjects.flatMap(s => quizTypes.flatMap(t => bank[s][t].map(q => ({ ...q, _subject: s, _set: t }))));

test("question texts are unique within a mode (normalized)", () => {
  for (const name of ["questions.json", "questions.new.json"]) {
    const bank = load(name);
    const seen = new Set();
    for (const q of allQuestions(bank)) {
      const key = normalizeText(q.question);
      assert.equal(seen.has(key), false, `${q.id}: duplicate question text in ${name}`);
      seen.add(key);
    }
  }
});

test("no question text or option set is shared between PREVIOUS and NEW", () => {
  const previous = new Set(allQuestions(load("questions.json")).map(q => normalizeText(q.question)));
  const newer = allQuestions(load("questions.new.json"));
  for (const q of newer) {
    assert.equal(previous.has(normalizeText(q.question)), false, `${q.id}: text shared across questioners`);
  }
});

test("answer option sets never repeat inside a mode", () => {
  for (const name of ["questions.json", "questions.new.json"]) {
    const seen = new Set();
    for (const q of allQuestions(load(name))) {
      const key = q.choices.map(normalizeText).sort().join("|");
      assert.equal(seen.has(key), false, `${q.id}: duplicate answer-option set`);
      seen.add(key);
    }
  }
});

test("every question has exactly 4 unique choices with the answer among them", () => {
  for (const name of ["questions.json", "questions.new.json"]) {
    for (const q of allQuestions(load(name))) {
      assert.equal(q.choices.length, 4, q.id);
      assert.equal(new Set(q.choices).size, 4, q.id);
      assert.equal(q.choices.includes(q.answer), true, q.id);
      assert.ok(q.explanation && q.hint, `${q.id}: missing explanation or hint`);
    }
  }
});

test("answer positions are balanced in both banks (no A/B/C/D pattern)", () => {
  for (const name of ["questions.json", "questions.new.json"]) {
    const pos = [0, 0, 0, 0];
    const qs = allQuestions(load(name));
    for (const q of qs) pos[q.choices.indexOf(q.answer)] += 1;
    for (const p of pos) {
      const share = p / qs.length;
      assert.ok(share >= 0.18 && share <= 0.32, `${name}: position share ${(share * 100).toFixed(1)}% out of range`);
    }
  }
});

test("answer length is not a clue (correct answer not systematically longest/shortest)", () => {
  for (const name of ["questions.json", "questions.new.json"]) {
    const qs = allQuestions(load(name));
    let longest = 0, shortest = 0;
    for (const q of qs) {
      const lens = q.choices.map(c => c.length);
      const mx = Math.max(...lens), mn = Math.min(...lens);
      if (q.answer.length === mx && lens.filter(l => l === mx).length === 1) longest += 1;
      if (q.answer.length === mn && lens.filter(l => l === mn).length === 1) shortest += 1;
    }
    assert.ok(longest / qs.length <= 0.45, `${name}: correct answer longest too often (${((longest / qs.length) * 100).toFixed(1)}%)`);
    assert.ok(shortest / qs.length <= 0.45, `${name}: correct answer shortest too often (${((shortest / qs.length) * 100).toFixed(1)}%)`);
  }
});

test("no legacy broken-template or placeholder text remains", () => {
  const banned = [
    /where someone is/i,
    /notices \d+ examples/i,
    /^Case \d+:/i,
    /\bOne person is\b/i,
    /\bLorem ipsum\b/i,
    /\bdummy\b/i
  ];
  for (const name of ["questions.json", "questions.new.json"]) {
    for (const q of allQuestions(load(name))) {
      const scan = [q.question, ...q.choices, q.explanation, q.hint].join("\n");
      for (const re of banned) {
        assert.equal(re.test(scan), false, `${q.id}: banned pattern ${re}`);
      }
      assert.equal(/\ba ([aeiou][a-z-]+)/i.test(scan) && !/\ba (u|one)/i.test(scan), false, `${q.id}: suspicious article`);
    }
  }
});

test("no stock filler distractors remain", () => {
  const fillers = [
    "rely on popularity instead of relevant evidence",
    "change the goal whenever the first attempt becomes difficult",
    "use a vague response and avoid measuring the outcome",
    "skip the constraint analysis and act immediately",
    "avoid documenting the reasoning or result",
    "treat every setback as proof that the plan cannot work",
    "ignore feedback that conflicts with the preferred conclusion",
    "accept the first explanation without checking it",
    "use a single tactic regardless of the context",
    "make the decision solely from an unverified assumption"
  ];
  const set = new Set(fillers);
  for (const name of ["questions.json", "questions.new.json"]) {
    for (const q of allQuestions(load(name))) {
      for (const c of q.choices) {
        assert.equal(set.has(String(c).toLowerCase()), false, `${q.id}: stock filler distractor`);
      }
    }
  }
});

test("question ids follow the mode-subject-set-level format", () => {
  const re = /^(PREVIOUS|NEW)-(MATH|SCIENCE|PSYCHOLOGY|TECH_1|TECH_2)-SUBJECT_[12]-L\d{2}-\d{2}$/;
  for (const name of ["questions.json", "questions.new.json"]) {
    for (const q of allQuestions(load(name))) {
      assert.match(q.id, re, `${q.id}: id format`);
    }
  }
});
