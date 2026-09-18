#!/usr/bin/env node
/*
 * Deterministic repair + verification for the Geon's GameHub PREVIOUS/NEW question banks.
 *
 * What it fixes (and why it is needed by the questioner prompts):
 *   1. Placeholder / dummy options ("Option 1", "Option 2") are replaced with plausible,
 *      category-correct distractors.
 *   2. Question stems that were machine-scaffolded into ungrammatical or filler-heavy
 *      sentences ("notices 3 examples where someone is ...", "One person is verifies ...")
 *      are rewritten into natural, unambiguous wording. Nothing else about the question
 *      changes: id, subject, quiz set, level, difficulty, category, answer and choice
 *      positions are preserved so existing progress stays valid.
 *   3. Article typos ("a analyst", "a online discussion") are corrected.
 *   4. Question texts that were duplicated between the PREVIOUS and NEW banks are
 *      rewritten on the NEW side with new scenarios/values/distractors.
 *
 * The script is idempotent: running it twice produces byte-identical output.
 * Usage:
 *   node tools/question-bank-repair.js            repair, write, verify
 *   node tools/question-bank-repair.js --check    verify only (no writes)
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const CHECK_ONLY = process.argv.includes("--check");
const SUBJECTS = ["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"];
const QUIZ_TYPES = ["SUBJECT 1", "SUBJECT 2"];

/* ------------------------------------------------------------------ data */

// Placeholder options that must never ship: id -> { index-or-value -> replacement }
// Replacements are real concepts from the same subject/category pool, or arithmetic
// distractors that follow a believable wrong step (added instead of subtracted,
// forgot the removal step, one group only, ...).
const DISTRACTOR_FIXES = {
  "PREVIOUS-MATH-SUBJECT_1-L25-04": { "Option 1": "229" },
  "PREVIOUS-MATH-SUBJECT_1-L27-05": { "Option 1": "339" },
  "PREVIOUS-MATH-SUBJECT_1-L31-06": { "Option 1": "305" },
  "PREVIOUS-MATH-SUBJECT_1-L36-07": { "Option 1": "285" },
  "PREVIOUS-MATH-SUBJECT_1-L38-08": { "Option 1": "198" },
  "PREVIOUS-MATH-SUBJECT_1-L40-09": { "Option 1": "120" },
  "PREVIOUS-MATH-SUBJECT_1-L55-13": { "Option 1": "290" },
  "PREVIOUS-MATH-SUBJECT_2-L04-02": { "Option 1": "3" },
  "PREVIOUS-MATH-SUBJECT_2-L07-04": { "Option 1": "20" },
  "PREVIOUS-MATH-SUBJECT_2-L11-05": { "Option 1": "24" },
  "PREVIOUS-MATH-SUBJECT_2-L20-06": { "Option 1": "24" },
  "PREVIOUS-MATH-SUBJECT_2-L25-07": { "Option 1": "175" },
  "PREVIOUS-MATH-SUBJECT_2-L29-08": { "Option 1": "153" },
  "PREVIOUS-MATH-SUBJECT_2-L35-09": { "Option 1": "167" },
  "PREVIOUS-MATH-SUBJECT_2-L49-12": { "Option 1": "420" },
  "PREVIOUS-MATH-SUBJECT_2-L51-14": { "Option 1": "306" },
  "PREVIOUS-MATH-SUBJECT_2-L54-16": { "Option 1": "546" },
  "PREVIOUS-SCIENCE-SUBJECT_1-L09-02": { "Option 1": "Galileo" },
  "PREVIOUS-SCIENCE-SUBJECT_1-L16-02": { "Option 1": "displaced volume" },
  "PREVIOUS-SCIENCE-SUBJECT_1-L19-04": { "Option 1": "Newton" },
  "PREVIOUS-SCIENCE-SUBJECT_2-L03-02": { "Option 1": "Pascal" },
  "PREVIOUS-TECH_2-SUBJECT_1-L28-09": { "Option 1": "device driver", "Option 2": "Windows Update" },
  "PREVIOUS-TECH_2-SUBJECT_1-L35-12": { "Option 1": "activation" },
  "PREVIOUS-TECH_2-SUBJECT_2-L20-04": { "Option 1": "device driver" },
  "PREVIOUS-TECH_2-SUBJECT_2-L24-05": { "Option 1": "activation" },
  "PREVIOUS-TECH_2-SUBJECT_2-L26-06": { "Option 1": "activation" },
  "NEW-MATH-SUBJECT_1-L12-04": { "Option 1": "15" },
  "NEW-MATH-SUBJECT_1-L21-06": { "Option 1": "324" },
  "NEW-MATH-SUBJECT_1-L25-07": { "Option 1": "124" },
  "NEW-MATH-SUBJECT_1-L28-08": { "Option 1": "250" },
  "NEW-MATH-SUBJECT_1-L36-09": { "Option 1": "368" },
  "NEW-MATH-SUBJECT_1-L38-10": { "Option 1": "197" },
  "NEW-MATH-SUBJECT_1-L40-11": { "Option 1": "161" },
  "NEW-MATH-SUBJECT_1-L45-12": { "Option 1": "245" },
  "NEW-MATH-SUBJECT_2-L15-04": { "Option 1": "16" },
  "NEW-MATH-SUBJECT_2-L19-05": { "Option 1": "20" },
  "NEW-MATH-SUBJECT_2-L20-06": { "Option 1": "35" },
  "NEW-MATH-SUBJECT_2-L28-07": { "Option 1": "198" },
  "NEW-MATH-SUBJECT_2-L30-08": { "Option 1": "162" },
  "NEW-MATH-SUBJECT_2-L31-09": { "Option 1": "222" },
  "NEW-MATH-SUBJECT_2-L35-10": { "Option 1": "196" },
  "NEW-MATH-SUBJECT_2-L45-11": { "Option 1": "336" },
  "NEW-SCIENCE-SUBJECT_1-L06-02": { "Option 1": "ship flotation" },
  "NEW-SCIENCE-SUBJECT_1-L25-03": { "Option 1": "fluid replacement" },
  "NEW-SCIENCE-SUBJECT_2-L11-01": { "Option 1": "moment of inertia" },
  "NEW-TECH_1-SUBJECT_1-L15-07": { "Option 1": "CPU cache" },
  "NEW-TECH_1-SUBJECT_1-L17-08": { "Option 1": "expansion slot" },
  "NEW-TECH_2-SUBJECT_1-L04-02": { "Option 1": "NAT" },
  "NEW-TECH_2-SUBJECT_1-L09-03": { "Option 1": "subnet mask" },
  // "liquid damage" sat next to the correct answer "liquid spill" and made the item ambiguous.
  "NEW-TECH_2-SUBJECT_1-L13-02": { "Option 1": "battery swelling", "liquid damage": "secure workspace" },
  "NEW-TECH_2-SUBJECT_1-L18-05": { "Option 1": "TCP", "Option 2": "subnet mask" },
  "NEW-TECH_2-SUBJECT_1-L21-06": { "Option 1": "DHCP" },
  "NEW-TECH_2-SUBJECT_1-L24-11": { "Option 1": "CMOS reset" },
  "NEW-TECH_2-SUBJECT_1-L32-04": { "Option 1": "battery swelling" },
  "NEW-TECH_2-SUBJECT_2-L14-07": { "Option 1": "CMOS reset" },
  "NEW-TECH_2-SUBJECT_2-L16-02": { "Option 1": "subnet mask" },
  "NEW-TECH_2-SUBJECT_2-L19-03": { "Option 1": "subnet mask" },
  "NEW-TECH_2-SUBJECT_2-L31-06": { "Option 1": "VLAN", "Option 2": "DHCP" },
  "NEW-TECH_2-SUBJECT_2-L39-04": { "Option 1": "battery swelling" },
  "NEW-TECH_2-SUBJECT_2-L40-08": { "Option 1": "NAT" }
};

// Questions whose text was reused verbatim by the other questioner mode. Only the NEW
// side is rewritten so the PREVIOUS bank (and its stored progress) is untouched.
const QUESTION_REWRITES = {
  "NEW-MATH-SUBJECT_1-L08-02": {
    question: "A van leaves the depot carrying 46 boxes. After 16 boxes are unloaded at the first stop, how many boxes are still on board?",
    choices: ["30", "62", "32", "16"],
    answer: "30",
    explanation: "Start from 46 boxes and remove the 16 that were unloaded: 46 − 16 = 30 boxes remain.",
    hint: "Subtract the unloaded boxes from the starting load."
  },
  "NEW-MATH-SUBJECT_1-L09-03": {
    question: "A baker makes 4 trays of bread each day for 5 days, then bakes 1 extra tray for a special order. How many trays are made in total?",
    choices: ["21", "20", "16", "25"],
    answer: "21",
    explanation: "Multiply the daily trays by the days (4 × 5 = 20) and add the extra tray: 20 + 1 = 21 trays.",
    hint: "Find the daily total first, then add the extra tray."
  },
  "NEW-MATH-SUBJECT_2-L19-05": {
    question: "A courier delivers 5 parcels per shift for 3 shifts, then delivers 3 extra parcels before the week ends. How many parcels are delivered in total?",
    choices: ["23", "18", "15", "20"],
    answer: "18",
    explanation: "Multiply parcels per shift by the shifts (5 × 3 = 15) and add the 3 extra parcels: 15 + 3 = 18 parcels.",
    hint: "Multiply first, then add the extra deliveries."
  }
};

/* ------------------------------------------------- stem rewrite machinery */

const STEM_A = /^In (.+?), (.+?) notices \d+ examples where someone is (.+)\. Which concept best identifies the pattern\?$/;
const STEM_B = /^(.+?) is analyzing (.+?)\. One person is (.+), while the group is unsure how to label it\. Which concept is the best match\?$/;

const LEAD_ADVERBS = new Set(["repeatedly", "accurately", "clearly", "generally", "automatically"]);
const THIRD_PERSON_VERBS = new Set([
  "provides", "identifies", "defines", "forwards", "uses", "stores", "executes", "connects",
  "converts", "retains", "initializes", "contains", "controls", "lets", "verifies", "delivers",
  "maps", "requires", "allows", "moves", "checks", "installs", "translates", "equals", "increases"
]);

function classifyDefinition(def) {
  const first = def.trim().split(/\s+/)[0].toLowerCase();
  if (LEAD_ADVERBS.has(first)) {
    const second = def.trim().split(/\s+/)[1] || "";
    if (second.endsWith("ing")) return "gerund";
    if (THIRD_PERSON_VERBS.has(second.toLowerCase())) return "verb";
    return "quote";
  }
  if (first.endsWith("ing")) return "gerund";
  if (THIRD_PERSON_VERBS.has(first)) return "verb";
  return "quote";
}

const STEM_A_TEMPLATES = {
  verb: [
    (c, r, d) => `In ${c}, ${r} notices several examples of something that ${d}. Which concept best identifies the pattern?`,
    (c, r, d) => `${cap(r)} is going over ${c} and finds repeated references to something that ${d}. Which concept is the best match?`,
    (c, r, d) => `During ${c}, ${r} keeps seeing the same description: something that ${d}. Which concept does it point to?`,
    (c, r, d) => `While preparing ${c}, ${r} collects several examples that describe something that ${d}. Which concept best fits?`
  ],
  gerund: [
    (c, r, d) => `In ${c}, ${r} notices several examples of someone ${d}. Which concept best identifies the pattern?`,
    (c, r, d) => `${cap(r)} is going over ${c} and finds repeated examples of someone ${d}. Which concept is the best match?`,
    (c, r, d) => `During ${c}, ${r} keeps seeing the same behavior: someone ${d}. Which concept does it point to?`,
    (c, r, d) => `While preparing ${c}, ${r} collects several examples of someone ${d}. Which concept best fits?`
  ],
  quote: [
    (c, r, d) => `In ${c}, ${r} notices several examples that point to one idea: "${d}". Which concept best identifies the pattern?`,
    (c, r, d) => `${cap(r)} is going over ${c} and finds this description repeated several times: "${d}". Which concept is the best match?`,
    (c, r, d) => `During ${c}, ${r} keeps seeing the same note: "${d}". Which concept does it point to?`,
    (c, r, d) => `While preparing ${c}, ${r} collects several examples described as "${d}". Which concept best fits?`
  ]
};

const STEM_B_TEMPLATES = {
  verb: [
    (c, r, d) => `${cap(r)} is analyzing ${c}. One note describes something that ${d}, but the group is unsure how to label it. Which concept is the best match?`,
    (c, r, d) => `In ${c}, ${r} reads a line about something that ${d}. The group cannot name it. Which concept is the best match?`,
    (c, r, d) => `${cap(r)} is sorting notes from ${c} and finds one that describes something that ${d}. Which concept should the group use?`,
    (c, r, d) => `While going through ${c}, ${r} finds a description of something that ${d} with no label attached. Which concept is the best match?`
  ],
  gerund: [
    (c, r, d) => `${cap(r)} is analyzing ${c}. One example shows someone ${d}, but the group is unsure how to label it. Which concept is the best match?`,
    (c, r, d) => `In ${c}, ${r} sees an example of someone ${d}. The group cannot name it. Which concept is the best match?`,
    (c, r, d) => `${cap(r)} is sorting observations from ${c} and finds one showing someone ${d}. Which concept should the group use?`,
    (c, r, d) => `While going through ${c}, ${r} finds an example of someone ${d} with no label attached. Which concept is the best match?`
  ],
  quote: [
    (c, r, d) => `${cap(r)} is analyzing ${c}. One line reads: "${d}". The group is unsure how to label it. Which concept is the best match?`,
    (c, r, d) => `In ${c}, ${r} reads a line that says: "${d}". The group cannot name it. Which concept is the best match?`,
    (c, r, d) => `${cap(r)} is sorting notes from ${c} and finds this one: "${d}". Which concept should the group use?`,
    (c, r, d) => `While going through ${c}, ${r} finds a note that reads: "${d}". Which concept is the best match?`
  ]
};

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Deterministic per-question variant so the wording varies but never changes between runs.
function hashId(id) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function fixArticles(text) {
  const fixed = String(text).replace(/\b([aA])\s+(?=[aeiouAEIOU])/g, (match, article) => `${article === "A" ? "An" : "an"} `);
  if (String(text).split(/\s+/).length !== fixed.split(/\s+/).length) {
    throw new Error(`Article fix changed the word count of: ${text}`);
  }
  return fixed;
}

function rewriteStem(question, id, usedTexts) {
  const a = question.match(STEM_A);
  const b = question.match(STEM_B);
  if (!a && !b) return null;
  const ctx = fixArticles(a ? a[1] : b[2]);
  const role = fixArticles(a ? a[2] : b[1]);
  const def = fixArticles(a ? a[3] : b[3]);
  const cls = classifyDefinition(def);
  const templates = (a ? STEM_A_TEMPLATES : STEM_B_TEMPLATES)[cls];
  const start = hashId(id) % templates.length;
  for (let offset = 0; offset < templates.length; offset += 1) {
    const candidate = templates[(start + offset) % templates.length](ctx, role, def);
    if (!usedTexts.has(candidate)) {
      usedTexts.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Could not build a unique stem for ${id}`);
}

/* ------------------------------------------------------------- validation */

function loadCore() {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "src/gameCore.js"), "utf8"), context);
  return context.window.GeonGameCore;
}

function rows(bank) {
  return SUBJECTS.flatMap(subject => QUIZ_TYPES.flatMap(type => (bank?.[subject]?.[type] || [])));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------- main */

function repairBank(bank, usedTexts, stats) {
  rows(bank).forEach(question => {
    const fixes = DISTRACTOR_FIXES[question.id];
    if (fixes) {
      question.choices = question.choices.map(choice => {
        if (!Object.prototype.hasOwnProperty.call(fixes, choice)) return choice;
        stats.distractors += 1;
        return fixes[choice];
      });
      if (new Set(question.choices).size !== question.choices.length) {
        throw new Error(`Distractor fix produced duplicate choices in ${question.id}: ${question.choices.join(" | ")}`);
      }
      if (!question.choices.includes(question.answer)) {
        throw new Error(`Distractor fix removed the answer from ${question.id}`);
      }
    }

    const rewrite = QUESTION_REWRITES[question.id];
    if (rewrite) {
      stats.rewrittenItems += 1;
      question.question = rewrite.question;
      question.choices = rewrite.choices;
      question.answer = rewrite.answer;
      question.explanation = rewrite.explanation;
      question.hint = rewrite.hint;
      if (!question.choices.includes(question.answer)) {
        throw new Error(`Rewrite broke the answer membership of ${question.id}`);
      }
    }

    const before = question.question;
    const stem = rewriteStem(before, question.id, usedTexts);
    if (stem) {
      question.question = stem;
      stats.stems += 1;
    }

    const beforeFix = `${question.question}|${question.explanation}|${question.hint}`;
    question.question = fixArticles(question.question);
    question.explanation = fixArticles(question.explanation);
    question.hint = fixArticles(question.hint);
    if (`${question.question}|${question.explanation}|${question.hint}` !== beforeFix) stats.articles += 1;

    if (/^Option \d+$/.test(question.choices.join(""))) {
      throw new Error(`Placeholder option survived in ${question.id}`);
    }
  });
  return bank;
}

function main() {
  const core = loadCore();
  const files = [
    { json: "questions.json", embedded: "questions.embedded.js", variable: "questionBank", mode: "previous" },
    { json: "questions.new.json", embedded: "questions.new.embedded.js", variable: "newQuestionBank", mode: "new" }
  ];

  // Shared "already used" pool so the two banks can never end up with identical stems.
  const usedTexts = new Set();
  files.forEach(file => {
    rows(JSON.parse(fs.readFileSync(path.join(ROOT, file.json), "utf8")))
      .forEach(question => usedTexts.add(question.question));
  });
  // Only the stems we are about to regenerate may be reused; everything else stays reserved.
  const banks = files.map(file => {
    const bank = JSON.parse(fs.readFileSync(path.join(ROOT, file.json), "utf8"));
    rows(bank).forEach(question => {
      if (STEM_A.test(question.question) || STEM_B.test(question.question) || QUESTION_REWRITES[question.id]) {
        usedTexts.delete(question.question);
      }
    });
    return { ...file, bank };
  });

  const stats = { distractors: 0, rewrittenItems: 0, stems: 0, articles: 0 };
  banks.forEach(entry => repairBank(entry.bank, usedTexts, stats));

  const report = { valid: true, problems: [] };
  banks.forEach(entry => {
    const result = core.validateQuestionBank(entry.bank, entry.mode);
    if (!result.valid) {
      report.valid = false;
      report.problems.push(`${entry.mode}: ${result.errors.slice(0, 5).join("; ")}`);
    }
    const seen = new Map();
    const duplicates = [];
    rows(entry.bank).forEach(question => {
      const text = normalizeText(question.question);
      if (seen.has(text)) duplicates.push(`${seen.get(text)} vs ${question.id}: "${text}"`);
      else seen.set(text, question.id);
    });
    if (duplicates.length) {
      report.valid = false;
      report.problems.push(`${entry.mode}: duplicate question text inside the bank -> ${duplicates.slice(0, 5).join(" ;; ")}`);
    }
    if (rows(entry.bank).some(question => question.choices.some(choice => /^Option \d+$/.test(choice)))) {
      report.valid = false;
      report.problems.push(`${entry.mode}: placeholder option still present`);
    }
    if (rows(entry.bank).some(question => /\b[aA]\s+(?:analyst|online|engineer|example|item|error)\b/.test(question.question))) {
      report.valid = false;
      report.problems.push(`${entry.mode}: article typo still present`);
    }
  });

  const isolation = core.validateDatasetIsolation
    ? core.validateDatasetIsolation(banks[0].bank, banks[1].bank)
    : { valid: false, errors: ["validateDatasetIsolation is unavailable"] };
  if (!isolation.valid) {
    report.valid = false;
    report.problems.push(`isolation: ${isolation.errors.slice(0, 5).join("; ")}`);
  }

  console.log("Repair summary:", JSON.stringify(stats));
  console.log("PREVIOUS bank:", JSON.stringify(summarize(banks[0].bank)));
  console.log("NEW bank:", JSON.stringify(summarize(banks[1].bank)));
  console.log("Dataset isolation:", isolation.valid ? "OK" : `FAILED ${JSON.stringify(isolation.errors.slice(0, 5))}`);

  if (!report.valid) {
    console.error("Validation FAILED:", report.problems.join(" | "));
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log("Check mode: files were not written.");
    return;
  }

  banks.forEach(entry => {
    const payload = JSON.stringify(entry.bank);
    fs.writeFileSync(path.join(ROOT, entry.json), payload);
    fs.writeFileSync(path.join(ROOT, entry.embedded), `window.${entry.variable} = ${payload};\n`);
    console.log(`Wrote ${entry.json} and ${entry.embedded}`);
  });
}

function summarize(bank) {
  const all = rows(bank);
  const positions = [0, 0, 0, 0];
  let longestIsAnswer = 0;
  let shortestIsAnswer = 0;
  all.forEach(question => {
    positions[question.choices.indexOf(question.answer)] += 1;
    const lengths = question.choices.map(choice => choice.length);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    if (lengths.filter(length => length === max).length === 1 && question.answer.length === max) longestIsAnswer += 1;
    if (lengths.filter(length => length === min).length === 1 && question.answer.length === min) shortestIsAnswer += 1;
  });
  const uniqueLongest = all.filter(question => {
    const lengths = question.choices.map(choice => choice.length);
    return lengths.filter(length => length === Math.max(...lengths)).length === 1;
  }).length;
  const uniqueShortest = all.filter(question => {
    const lengths = question.choices.map(choice => choice.length);
    return lengths.filter(length => length === Math.min(...lengths)).length === 1;
  }).length;
  return {
    total: all.length,
    answerPositions: positions,
    answerIsUniqueLongest: `${longestIsAnswer}/${uniqueLongest}`,
    answerIsUniqueShortest: `${shortestIsAnswer}/${uniqueShortest}`
  };
}

main();
