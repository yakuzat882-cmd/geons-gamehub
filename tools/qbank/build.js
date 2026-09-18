#!/usr/bin/env node
/*
 * Builds questions.json / questions.new.json and their embedded fallbacks.
 *
 * Usage: node tools/qbank/build.js
 *
 * The build is deterministic, verifies both banks with tools/qbank/verify.js and
 * refuses to write files that do not satisfy the questioner requirements.
 */

const fs = require("fs");
const path = require("path");

const {
  SUBJECTS,
  QUIZ_TYPES,
  TIER_LABELS,
  CATEGORY_TIERS,
  makeRng,
  shuffle,
  normalizeQuestionText,
  choiceSignature,
  pickWrongs,
  validateConcept,
  conceptCandidates,
  makeContext
} = require("./engine");
const { buildMathCandidates } = require("./content/math");
const psychology = require("./content/psychology");
const science = require("./content/science");
const tech1 = require("./content/tech1");
const tech2 = require("./content/tech2");
const EXTRA_DISTRACTORS = require("./content/extras");
const { verifyBank } = require("./verify");

const ROOT = path.join(__dirname, "..", "..");
const CONCEPT_CONTENT = {
  PSYCHOLOGY: psychology,
  SCIENCE: science,
  "TECH 1": tech1,
  "TECH 2": tech2
};

const DISTRACTOR_FIELDS = ["t", "d", "f", "p", "q"];

function tiersNeeded(subject, category) {
  return CATEGORY_TIERS[subject][category].slice();
}

function buildConceptCandidates(bank, subject, category) {
  const content = CONCEPT_CONTENT[subject][category];
  const extras = (EXTRA_DISTRACTORS[subject] && EXTRA_DISTRACTORS[subject][category]) || [];
  const errors = [];
  content.concepts.forEach(concept => errors.push(...validateConcept(concept, `${subject}/${category}`)));
  extras.forEach(extra => errors.push(...validateConcept(extra, `${subject}/${category} (extra)`, DISTRACTOR_FIELDS)));
  extras.forEach(extra => {
    if (content.concepts.some(concept => concept.t.toLowerCase() === extra.t.toLowerCase())) {
      errors.push(`${subject}/${category}: distractor-only entry ${extra.t} duplicates a real concept`);
    }
  });
  const duplicateTerms = new Set();
  const seenTerms = new Set();
  content.concepts.forEach(concept => {
    const key = concept.t.toLowerCase();
    if (seenTerms.has(key)) duplicateTerms.add(concept.t);
    seenTerms.add(key);
  });
  if (duplicateTerms.size) errors.push(`${subject}/${category}: duplicate concepts ${[...duplicateTerms].join(", ")}`);
  if (errors.length) throw new Error(errors.join("\n"));

  const context = makeContext(category, content, extras);
  return content.concepts.flatMap(concept => conceptCandidates(concept, context, bank));
}

function materializeSlot(slot, rng, used) {
  const candidate = slot.candidate;
  const questionText = String(slot.variant).replace(/\s+/g, " ").trim();
  const questionKey = normalizeQuestionText(questionText);
  if (!questionKey || used.questions.has(questionKey)) return null;
  /*
   * MATH keeps the same arithmetic out of the bank twice: two items that use the
   * same numbers read as copies even when the wording differs.
   */
  const digits = (questionText.match(/\d[\d,]*/g) || []).map(value => value.replace(/,/g, ""));
  const numberKey = candidate.subject === "MATH" && digits.length >= 2
    ? `${candidate.subject}::${candidate.category}::${digits.slice().sort().join("|")}`
    : "";
  if (numberKey && used.numbers.has(numberKey)) return null;
  for (let draw = 0; draw < 12; draw += 1) {
    const wrongs = pickWrongs(
      String(candidate.answer),
      () => candidate.wrongPools.flatMap(pool => pool()),
      rng
    );
    if (wrongs.length < 3) return null;
    if (new Set([candidate.answer, ...wrongs].map(entry => String(entry).toLowerCase())).size !== 4) continue;
    const signature = choiceSignature([candidate.answer, ...wrongs]);
    if (used.choiceSets.has(signature)) continue;
    used.questions.set(questionKey, true);
    used.choiceSets.set(signature, true);
    if (numberKey) used.numbers.set(numberKey, true);
    return {
      question: questionText,
      answer: String(candidate.answer),
      wrongs: wrongs.map(String),
      explanation: String(candidate.exp || "").trim(),
      hint: String(candidate.hint || "").trim(),
      tier: candidate.tier,
      frame: candidate.frame,
      concept: candidate.concept || ""
    };
  }
  return null;
}

function selectTierItems({ candidates, need, rngSeed, used }) {
  const rng = makeRng(`${rngSeed}-draw`);
  const conceptKeys = [...new Set(candidates.map(candidate => candidate.concept || "item"))];
  const slots = {};
  conceptKeys.forEach(key => {
    const list = candidates
      .filter(candidate => (candidate.concept || "item") === key)
      .flatMap(candidate => candidate.text.map((variant, index) => ({ candidate, variant, index })));
    slots[key] = shuffle(list, makeRng(`${rngSeed}-${key}`));
  });
  const order = shuffle(conceptKeys, makeRng(`${rngSeed}-order`));
  const picked = [];
  const maxRounds = Math.max(...order.map(key => slots[key].length), 1);
  for (let round = 0; round < maxRounds && picked.length < need; round += 1) {
    for (const key of order) {
      if (picked.length >= need) break;
      const slot = slots[key][round];
      if (!slot) continue;
      const item = materializeSlot(slot, rng, used);
      if (item) picked.push(item);
    }
  }
  return picked;
}

function buildBank(bank, used) {
  const contentCache = {};
  const bankData = {};

  SUBJECTS.forEach(subject => {
    const subjectBlock = {};
    QUIZ_TYPES.forEach(quizType => { subjectBlock[quizType] = []; });
    /* bucket[quizType][tier] collects every category's questions for that band. */
    const bucket = {};
    QUIZ_TYPES.forEach(quizType => { bucket[quizType] = [[], [], [], []]; });

    Object.keys(CATEGORY_TIERS[subject]).forEach(category => {
      const needed = tiersNeeded(subject, category);
      const rawCandidates = subject === "MATH"
        ? (contentCache.math = contentCache.math || buildMathCandidates(bank))[category]
        : buildConceptCandidates(bank, subject, category);
      const bankCandidates = rawCandidates.map(candidate => ({ ...candidate, subject, category }));

      needed.forEach((perSetCount, tier) => {
        const tierCandidates = bankCandidates.filter(candidate => candidate.tier === tier);
        const need = perSetCount * 2;
        const picked = selectTierItems({
          candidates: tierCandidates,
          need,
          rngSeed: `${bank}-${subject}-${category}-t${tier}`,
          used
        }).map(item => ({ ...item, category }));
        if (picked.length < need) {
          throw new Error(`${bank}/${subject}/${category} tier ${tier}: needed ${need} questions, built ${picked.length}`);
        }
        const shuffled = shuffle(picked, makeRng(`${bank}-${subject}-${category}-t${tier}-split`));
        const half = picked.length / 2;
        bucket[QUIZ_TYPES[0]][tier].push(...shuffled.slice(0, half));
        bucket[QUIZ_TYPES[1]][tier].push(...shuffled.slice(half));
      });
    });

    QUIZ_TYPES.forEach(quizType => {
      for (let tier = 0; tier < 4; tier += 1) {
        const bandStart = tier * 20 + 1;
        const ordered = shuffle(bucket[quizType][tier], makeRng(`${bank}-${subject}-${quizType}-t${tier}-levels`));
        if (ordered.length !== 20) {
          throw new Error(`${bank}/${subject}/${quizType} tier ${tier}: expected 20 questions, found ${ordered.length}`);
        }
        ordered.forEach((item, index) => {
          subjectBlock[quizType].push({
            ...item,
            level: bandStart + index,
            difficulty: TIER_LABELS[tier]
          });
        });
      }
      subjectBlock[quizType].sort((a, b) => a.level - b.level);
    });

    bankData[subject] = subjectBlock;
  });

  /*
   * Answer position.
   *
   * Positions are balanced over the whole bank (200 of each) and arranged level by
   * level from rotating patterns of [three, three, two, two]. That keeps every level
   * mixed (four positions, never more than three of the same), never puts the answer
   * always in the same place, and still gives each position an equal share.
   */
  const everyItem = SUBJECTS.flatMap(subject => QUIZ_TYPES.flatMap(quizType => bankData[subject][quizType]));
  const patterns = [
    [0, 0, 0, 1, 1, 1, 2, 2, 3, 3],
    [1, 1, 1, 2, 2, 2, 3, 3, 0, 0],
    [2, 2, 2, 3, 3, 3, 0, 0, 1, 1],
    [3, 3, 3, 0, 0, 0, 1, 1, 2, 2]
  ];
  const levels = new Map();
  everyItem.forEach(item => {
    const bucket = levels.get(item.level) || [];
    bucket.push(item);
    levels.set(item.level, bucket);
  });
  [...levels.keys()].sort((a, b) => a - b).forEach(level => {
    const rows = levels.get(level);
    const pattern = shuffle(patterns[(level - 1) % patterns.length], makeRng(`${bank}-positions-${level}`));
    rows.forEach((item, index) => { item.position = pattern[index % pattern.length]; });
  });

  /* Assemble the final question records. */
  let counter = 0;
  SUBJECTS.forEach(subject => {
    QUIZ_TYPES.forEach(quizType => {
      bankData[subject][quizType] = bankData[subject][quizType].map(item => {
        counter += 1;
        const choices = item.wrongs.slice();
        choices.splice(item.position, 0, item.answer);
        const subjectKey = subject.replace(/\s+/g, "_");
        const setKey = quizType.replace(/\s+/g, "_");
        const levelTag = String(item.level).padStart(2, "0");
        return {
          id: `${bank === "new" ? "NEW" : "PREVIOUS"}-${subjectKey}-${setKey}-L${levelTag}-01`,
          subject,
          quizType,
          quizPath: quizType,
          level: item.level,
          difficulty: item.difficulty,
          category: item.category,
          question: item.question,
          choices,
          answer: item.answer,
          explanation: item.explanation,
          hint: item.hint,
          tags: [item.category, item.difficulty.toLowerCase(), bank]
        };
      });
    });
  });

  return { bankData, totalQuestions: everyItem.length };
}

function main() {
  const used = { questions: new Map(), choiceSets: new Map(), numbers: new Map() };
  const outputs = [];

  ["previous", "new"].forEach(bank => {
    const { bankData, totalQuestions } = buildBank(bank, used);
    const report = verifyBank(bankData, bank, { global: null });
    if (!report.valid) {
      throw new Error(`${bank} bank failed verification:\n${report.errors.slice(0, 25).join("\n")}`);
    }
    report.warnings.forEach(warning => console.warn(`[warn] ${bank}: ${warning}`));
    outputs.push({ bank, bankData, totalQuestions, report });
  });

  outputs.forEach(({ bank, bankData, totalQuestions, report }) => {
    const json = JSON.stringify(bankData);
    const fileName = bank === "new" ? "questions.new.json" : "questions.json";
    const embeddedName = bank === "new" ? "questions.new.embedded.js" : "questions.embedded.js";
    const globalName = bank === "new" ? "newQuestionBank" : "questionBank";
    fs.writeFileSync(path.join(ROOT, fileName), `${json}\n`, "utf8");
    fs.writeFileSync(path.join(ROOT, embeddedName), `window.${globalName} = ${json};\n`, "utf8");
    console.log(`\n${bank.toUpperCase()} questioner`);
    console.log(`  questions: ${totalQuestions}`);
    console.log(`  bytes: ${json.length}`);
    console.log(`  answer positions: ${report.metrics.positions.join(" / ")} (share ${report.metrics.positionShare.join(" / ")})`);
    console.log(`  answer is unique longest: ${(report.metrics.uniqueLongestShare * 100).toFixed(1)}%`);
    console.log(`  answer is unique shortest: ${(report.metrics.uniqueShortestShare * 100).toFixed(1)}%`);
    console.log(`  answer is neither longest nor shortest: ${(report.metrics.neitherClueShare * 100).toFixed(1)}%`);
  });

  /* Cross-mode isolation check after both banks exist. */
  const first = outputs[0];
  const second = outputs[1];
  const crossReport = verifyBank(second.bankData, "new", {
    global: (() => {
      const questions = new Map();
      const choiceSets = new Map();
      first.bankData && Object.entries(first.bankData).forEach(([subject, sets]) => {
        Object.entries(sets).forEach(([quizType, rows]) => {
          rows.forEach(row => {
            questions.set(normalizeQuestionText(row.question), `${subject}/${quizType}/${row.id}`);
            choiceSets.set(choiceSignature(row.choices), `${subject}/${quizType}/${row.id}`);
          });
        });
      });
      return { questions, choiceSets };
    })()
  });
  if (!crossReport.valid) {
    throw new Error(`cross-mode isolation failed:\n${crossReport.errors.slice(0, 25).join("\n")}`);
  }
  console.log("\nCross-mode isolation: previous and new datasets share no question text or answer set.");
  console.log("Questioner banks built and verified.");
}

if (require.main === module) main();

module.exports = { buildBank, materializeSlot, selectTierItems };
