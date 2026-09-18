/*
 * Questioner content verification.
 *
 * These tests run against the shipped questions.json / questions.new.json and use the
 * same verifier that guards tools/qbank/build.js, so a hand edit of the data cannot
 * pass unnoticed.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const { verifyBank, metrics, allRows } = require(path.join(root, "tools", "qbank", "verify"));
const { normalizeQuestionText, choiceSignature } = require(path.join(root, "tools", "qbank", "engine"));

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
}

function externalMap(bank) {
  const questions = new Map();
  const choiceSets = new Map();
  allRows(bank).forEach(({ question, subject, quizType }) => {
    questions.set(normalizeQuestionText(question.question), `${subject}/${quizType}/${question.id}`);
    choiceSets.set(choiceSignature(question.choices), `${subject}/${quizType}/${question.id}`);
  });
  return { questions, choiceSets };
}

const previous = load("questions.json");
const newer = load("questions.new.json");

test("both questioner banks pass the shared structural verifier", () => {
  const previousReport = verifyBank(previous, "previous", { global: null });
  const newReport = verifyBank(newer, "new", { global: null });
  assert.equal(previousReport.valid, true, previousReport.errors.slice(0, 10).join("\n"));
  assert.equal(newReport.valid, true, newReport.errors.slice(0, 10).join("\n"));
  assert.equal(previousReport.total, 800);
  assert.equal(newReport.total, 800);
});

test("previous and new datasets stay isolated from each other", () => {
  const report = verifyBank(newer, "new", { global: externalMap(previous) });
  assert.equal(report.valid, true, report.errors.slice(0, 10).join("\n"));
});

test("answer positions are balanced and never clustered inside a level", () => {
  for (const [name, bank] of [["previous", previous], ["new", newer]]) {
    const report = metrics(allRows(bank));
    report.positionShare.forEach((share, index) => {
      assert.ok(share >= 0.2 && share <= 0.3, `${name}: position ${index} share ${share}`);
    });
    Object.entries(report.perLevelPositions).forEach(([level, counts]) => {
      const total = counts.reduce((sum, value) => sum + value, 0);
      const distinct = counts.filter(value => value > 0).length;
      assert.ok(distinct >= 3, `${name}: level ${level} uses only ${distinct} positions`);
      assert.ok(Math.max(...counts) <= Math.ceil(total / 2), `${name}: level ${level} clustered (${counts.join("/")})`);
    });
  }
});

test("the correct answer cannot be spotted by its length", () => {
  for (const [name, bank] of [["previous", previous], ["new", newer]]) {
    const report = metrics(allRows(bank));
    assert.ok(report.uniqueLongestShare <= 0.35, `${name}: longest-answer share ${report.uniqueLongestShare}`);
    assert.ok(report.uniqueShortestShare <= 0.35, `${name}: shortest-answer share ${report.uniqueShortestShare}`);
    assert.ok(report.neitherClueShare >= 0.5, `${name}: neither-clue share ${report.neitherClueShare}`);
  }
});

test("higher difficulty bands carry harder questions", () => {
  for (const [name, bank] of [["previous", previous], ["new", newer]]) {
    const rows = allRows(bank).map(row => row.question);
    const band = level => (level <= 20 ? "NORMAL" : level <= 40 ? "HARD" : level <= 60 ? "INSANE" : "IMPOSSIBLE");
    const average = label => {
      const group = rows.filter(question => band(question.level) === label);
      return group.reduce((sum, question) => sum + question.question.length, 0) / group.length;
    };
    const normal = average("NORMAL");
    const impossible = average("IMPOSSIBLE");
    assert.ok(impossible > normal * 1.3, `${name}: impossible band length ${impossible} vs normal ${normal}`);
  }
});

test("arithmetic questions can be recomputed from their own text", () => {
  const num = value => Number(String(value).replace(/,/g, ""));
  const rules = [
    [/^What is ([\d,]+) ([×+−-]) ([\d,]+)\?$/, m => {
      const a = num(m[1]);
      const b = num(m[3]);
      return m[2] === "×" ? a * b : m[2] === "+" ? a + b : a - b;
    }],
    [/^What is ([\d,]+) ÷ ([\d,]+)\?$/, m => num(m[1]) / num(m[2])],
    [/^Find the sum of ([\d,]+) and ([\d,]+)\.$/, m => num(m[1]) + num(m[2])],
    [/^Subtract ([\d,]+) from ([\d,]+)\. What is the difference\?$/, m => num(m[2]) - num(m[1])],
    [/^Compute ([\d,]+) − ([\d,]+)\.$/, m => num(m[1]) - num(m[2])],
    [/^Multiply ([\d,]+) by ([\d,]+)\. What is the product\?$/, m => num(m[1]) * num(m[2])],
    [/^Divide ([\d,]+) by ([\d,]+)\. What is the quotient\?$/, m => num(m[1]) / num(m[2])],
    [/^([\d,]+) ÷ ([\d,]+) = \? Complete the division sentence\.$/, m => num(m[1]) / num(m[2])],
    [/^Find the total: ([\d, +]+)\.$/, m => m[1].split("+").map(part => num(part.trim())).reduce((sum, value) => sum + value, 0)]
  ];
  let checked = 0;
  for (const bank of [previous, newer]) {
    for (const question of allRows(bank).map(row => row.question)) {
      if (question.subject !== "MATH") continue;
      for (const [pattern, compute] of rules) {
        const match = question.question.match(pattern);
        if (!match) continue;
        checked += 1;
        assert.equal(Number(question.answer.replace(/,/g, "")), compute(match), question.question);
        break;
      }
    }
  }
  assert.ok(checked >= 80, `expected to re-check many arithmetic items, checked ${checked}`);
});

test("every question carries a hint, an explanation and mode tags", () => {
  for (const [mode, bank] of [["previous", previous], ["new", newer]]) {
    allRows(bank).forEach(({ question }) => {
      assert.ok(question.hint.trim().length >= 6, `${question.id}: hint too short`);
      assert.ok(question.explanation.trim().length >= 10, `${question.id}: explanation too short`);
      assert.ok(question.tags.includes(mode), `${question.id}: mode tag missing`);
      assert.ok(question.tags.includes(question.difficulty.toLowerCase()), `${question.id}: difficulty tag missing`);
      assert.ok(!/the defining feature is/i.test(question.explanation), `${question.id}: template explanation`);
    });
  }
});

test("embedded fallbacks carry exactly the same datasets as the JSON files", () => {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "questions.embedded.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "questions.new.embedded.js"), "utf8"), context);
  assert.equal(JSON.stringify(context.window.questionBank), JSON.stringify(previous));
  assert.equal(JSON.stringify(context.window.newQuestionBank), JSON.stringify(newer));
});

test("the quiz start guard validates the pool before play and keeps progress", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /function validateQuestionerPool\(/);
  assert.match(script, /const poolReport = validateQuestionerPool\(subject, quizType, source\)/);
  assert.match(script, /if \(!poolReport\.valid\) \{[\s\S]{0,200}progress is unchanged/);
  assert.match(script, /function showQuestionerError\(/);
});

test("every subject and set resolves exactly one question for each level", () => {
  for (const [mode, bank] of [["previous", previous], ["new", newer]]) {
    for (const subject of Object.keys(bank)) {
      for (const quizType of ["SUBJECT 1", "SUBJECT 2"]) {
        const rows = bank[subject][quizType];
        assert.equal(rows.length, 80, `${mode}/${subject}/${quizType}`);
        const byLevel = new Map(rows.map(question => [Number(question.level), question]));
        assert.equal(byLevel.size, 80, `${mode}/${subject}/${quizType}: levels are not unique`);
        for (let level = 1; level <= 80; level += 1) {
          const question = byLevel.get(level);
          assert.ok(question, `${mode}/${subject}/${quizType}: level ${level} has no question`);
          const expected = level <= 20 ? "NORMAL" : level <= 40 ? "HARD" : level <= 60 ? "INSANE" : "IMPOSSIBLE";
          assert.equal(question.difficulty, expected, `${mode}/${subject}/${quizType}/${level}`);
          assert.ok(question.choices.includes(question.answer), `${mode}/${subject}/${quizType}/${level}: answer missing`);
          assert.equal(new Set(question.choices).size, 4, `${mode}/${subject}/${quizType}/${level}: choices not distinct`);
        }
      }
    }
  }
});

test("no question bank text is filler, placeholder or dummy content", () => {
  const filler = /\b(lorem ipsum|placeholder|dummy|tbd|to be decided|sample question|example question|question \d+\b|test question|coming soon|n\/a)\b/i;
  for (const [mode, bank] of [["previous", previous], ["new", newer]]) {
    allRows(bank).forEach(({ question }) => {
      const fields = [question.question, question.answer, question.explanation, question.hint, ...question.choices];
      fields.forEach(value => assert.doesNotMatch(String(value), filler, `${mode}/${question.id}: filler text`));
      assert.ok(!/\s{2,}/.test(question.question), `${mode}/${question.id}: double spaces`);
      assert.ok(question.question.trim().length >= 12, `${mode}/${question.id}: question too short`);
    });
  }
});

test("the new questioner bank is the more advanced dataset", () => {
  const average = bank => allRows(bank).reduce((sum, row) => sum + row.question.question.length, 0) / allRows(bank).length;
  const advanced = bank => allRows(bank).filter(row => /\bwhile\b|\bmust\b|\bcase\b/i.test(row.question.question)).length;
  assert.ok(average(newer) > average(previous), "new bank questions should be longer on average");
  assert.ok(advanced(newer) >= advanced(previous), "new bank should lean on advanced scenario framing at least as much");
  assert.ok(advanced(newer) >= 200, "new bank should contain a large body of advanced scenario questions");
});
