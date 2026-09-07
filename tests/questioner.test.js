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
