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

function loadCore() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/gameCore.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/data/questionValidator.js"), "utf8"), context);
  return context.window;
}

const ARTIFACT_PATTERNS = [
  [/^Option \d+$/, "placeholder option"],
  [/notices \d+ examples where someone is /, "generated scaffolding"],
  [/One person is /, "generated scaffolding"],
  [/\ba (?:analyst|online|engineer|example|item|error)\b/, "article typo"],
  [/\bis (?:verifies|defines|delivers|contains|translates|confirms|checks|provides|moves|allows|stores|converts|controls|initializes|executes|connects|retains|requires|installs|maps|identifies|forwards|uses|equals|lets)\b/, "ungrammatical verb frame"],
  [/\b(?:an|An)(?:online|analyst|engineer|example|item|error)\b/, "collapsed article"]
];

test("banks contain no placeholder options or scaffolding artifacts", () => {
  for (const [mode, bank] of [["previous", load("questions.json")], ["new", load("questions.new.json")]]) {
    for (const question of rows(bank)) {
      const fields = [question.question, question.explanation, question.hint, ...question.choices];
      for (const field of fields) {
        for (const [pattern, label] of ARTIFACT_PATTERNS) {
          assert.equal(pattern.test(String(field)), false, `${mode}/${question.id}: ${label} in "${String(field).slice(0, 90)}"`);
        }
      }
      assert.equal(question.choices.some(choice => choice === question.answer) && new Set(question.choices).size === question.choices.length, true, `${question.id}: choices must stay unique and contain the answer`);
    }
  }
});

test("previous and new banks share no question text or answer signature", () => {
  const previous = rows(load("questions.json"));
  const newer = rows(load("questions.new.json"));
  const previousTexts = new Set(previous.map(q => q.question.trim().toLowerCase()));
  const previousSignatures = new Set(previous.map(q => JSON.stringify([q.question.trim().toLowerCase(), [...q.choices].sort(), q.answer])));
  const sharedText = newer.filter(q => previousTexts.has(q.question.trim().toLowerCase()));
  const sharedSignature = newer.filter(q => previousSignatures.has(JSON.stringify([q.question.trim().toLowerCase(), [...q.choices].sort(), q.answer])));
  assert.deepEqual(sharedText.map(q => q.id), []);
  assert.deepEqual(sharedSignature.map(q => q.id), []);
});

test("correct answer position stays balanced and is not predictable by length", () => {
  for (const [mode, bank] of [["previous", load("questions.json")], ["new", load("questions.new.json")]]) {
    const questions = rows(bank);
    const positions = [0, 0, 0, 0];
    let uniqueLongest = 0;
    let uniqueShortest = 0;
    let longestIsAnswer = 0;
    let shortestIsAnswer = 0;
    questions.forEach(question => {
      positions[question.choices.indexOf(question.answer)] += 1;
      const lengths = question.choices.map(choice => choice.length);
      const max = Math.max(...lengths);
      const min = Math.min(...lengths);
      if (lengths.filter(length => length === max).length === 1) {
        uniqueLongest += 1;
        if (question.answer.length === max) longestIsAnswer += 1;
      }
      if (lengths.filter(length => length === min).length === 1) {
        uniqueShortest += 1;
        if (question.answer.length === min) shortestIsAnswer += 1;
      }
    });
    positions.forEach((count, index) => {
      const share = count / questions.length;
      assert.ok(share >= 0.2 && share <= 0.3, `${mode}: position ${index} share ${(share * 100).toFixed(1)}% is patterned`);
    });
    assert.ok(longestIsAnswer / uniqueLongest <= 0.3, `${mode}: answer is the longest choice too often (${longestIsAnswer}/${uniqueLongest})`);
    assert.ok(shortestIsAnswer / uniqueShortest <= 0.45, `${mode}: answer is the shortest choice too often (${shortestIsAnswer}/${uniqueShortest})`);

    // no long run of the same position inside a subject/set
    let worstRun = 1;
    for (const subject of subjects) {
      for (const type of quizTypes) {
        const ordered = [...bank[subject][type]].sort((a, b) => a.level - b.level);
        let run = 1;
        for (let i = 1; i < ordered.length; i += 1) {
          run = ordered[i].choices.indexOf(ordered[i].answer) === ordered[i - 1].choices.indexOf(ordered[i - 1].answer) ? run + 1 : 1;
          worstRun = Math.max(worstRun, run);
        }
      }
    }
    assert.ok(worstRun <= 8, `${mode}: ${worstRun} consecutive questions share one answer position`);
  }
});

test("runtime dataset isolation validator accepts the shipped banks and rejects a mixed one", () => {
  const window = loadCore();
  const previous = load("questions.json");
  const newer = load("questions.new.json");

  const clean = window.GeonQuestionValidator.validateIsolation(previous, newer);
  assert.equal(clean.valid, true, clean.errors.slice(0, 3).join("; "));
  assert.equal(clean.duplicateIds.length, 0);
  assert.equal(clean.duplicateQuestions.length, 0);

  const mixed = JSON.parse(JSON.stringify(newer));
  mixed.MATH["SUBJECT 1"][0].question = previous.MATH["SUBJECT 1"][0].question;
  const leaked = window.GeonQuestionValidator.validateIsolation(previous, mixed);
  assert.equal(leaked.valid, false);
  assert.equal(leaked.duplicateQuestions.length, 1);

  const retagged = JSON.parse(JSON.stringify(newer));
  retagged.MATH["SUBJECT 1"][0].id = `PREVIOUS-${retagged.MATH["SUBJECT 1"][0].id}`;
  const wrongTag = window.GeonQuestionValidator.validateIsolation(previous, retagged);
  assert.equal(wrongTag.valid, false);
});

test("runtime bank validator flags placeholder options and missing categories", () => {
  const window = loadCore();
  const bank = load("questions.json");
  assert.equal(window.GeonQuestionValidator.validate(bank, "previous").valid, true);

  const damaged = JSON.parse(JSON.stringify(bank));
  damaged.MATH["SUBJECT 1"][0].choices[0] = "Option 1";
  const placeholderReport = window.GeonQuestionValidator.validate(damaged, "previous");
  assert.equal(placeholderReport.valid, false);
  assert.ok(placeholderReport.errors.some(error => error.includes("placeholder choice")));

  const uncategorized = JSON.parse(JSON.stringify(bank));
  delete uncategorized.MATH["SUBJECT 1"][0].category;
  assert.equal(window.GeonQuestionValidator.validate(uncategorized, "previous").valid, false);
});

test("embedded fallback banks mirror the JSON banks exactly", () => {
  const pairs = [
    ["questions.json", "questions.embedded.js", "questionBank"],
    ["questions.new.json", "questions.new.embedded.js", "newQuestionBank"]
  ];
  for (const [jsonFile, embeddedFile, variable] of pairs) {
    const payload = fs.readFileSync(path.join(root, jsonFile), "utf8");
    const embedded = fs.readFileSync(path.join(root, embeddedFile), "utf8");
    assert.equal(embedded, `window.${variable} = ${payload};\n`, `${embeddedFile} is out of sync with ${jsonFile}`);
  }
});

test("the question bank repair tool verifies the shipped data without changes", () => {
  const { execFileSync } = require("node:child_process");
  const output = execFileSync(process.execPath, [path.join(root, "tools/question-bank-repair.js"), "--check"], { encoding: "utf8" });
  assert.match(output, /Dataset isolation: OK/);
  const before = ["questions.json", "questions.new.json", "questions.embedded.js", "questions.new.embedded.js"]
    .map(file => fs.readFileSync(path.join(root, file), "utf8"));
  execFileSync(process.execPath, [path.join(root, "tools/question-bank-repair.js"), "--check"], { encoding: "utf8" });
  const after = ["questions.json", "questions.new.json", "questions.embedded.js", "questions.new.embedded.js"]
    .map(file => fs.readFileSync(path.join(root, file), "utf8"));
  assert.deepEqual(after, before);
});
