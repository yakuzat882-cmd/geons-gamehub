/*
 * Structural and quality verification for the questioner banks.
 *
 * Used by tools/qbank/build.js while the banks are generated and by the test suite,
 * so the shipped data is checked with exactly the same rules every time.
 */

const fs = require("fs");
const path = require("path");

const {
  SUBJECTS,
  QUIZ_TYPES,
  TIER_LABELS,
  CATEGORY_TIERS
} = require("./engine");

const FILLER_PATTERNS = [
  /\bquestion\s*\d+\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /\bsample question\b/i,
  /\bdummy\b/i,
  /\btbd\b/i,
  /\bTODO\b/,
  /\boption\s+[abcd]\b/i,
  /^\s*question\s*[:?]\s*$/i,
  /\bgeneric answer\b/i,
  /\bthe defining feature is\b/i,
  /\bcase\s+\d+\s*:/i
];

const BROKEN_STEMS = [
  /\bis\s+(?:a|an)?\s*(?:identifies|equals|route|pressure applied|disconnect power|larger output)\b/i,
  /\bis\s+(?:pascal|router|uefi|cmos|dma)\b/i,
  /\bsomeone is [a-z]+ (?:power|the)\b/i
];

function allRows(bank) {
  return SUBJECTS.flatMap(subject =>
    QUIZ_TYPES.flatMap(quizType => (bank?.[subject]?.[quizType] || []).map(question => ({ question, subject, quizType })))
  );
}

function metrics(rows) {
  const positions = [0, 0, 0, 0];
  let uniqueLongest = 0;
  let uniqueShortest = 0;
  let neitherClue = 0;
  const perLevelPositions = {};
  rows.forEach(({ question }) => {
    const choices = question.choices.map(entry => String(entry));
    const answerIndex = choices.indexOf(String(question.answer));
    if (answerIndex >= 0) positions[answerIndex] += 1;
    const lengths = choices.map(entry => entry.length);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    const answerLength = String(question.answer).length;
    const isUniqueLongest = answerLength === max && lengths.filter(value => value === max).length === 1;
    const isUniqueShortest = answerLength === min && lengths.filter(value => value === min).length === 1;
    if (isUniqueLongest) uniqueLongest += 1;
    if (isUniqueShortest) uniqueShortest += 1;
    if (!isUniqueLongest && !isUniqueShortest) neitherClue += 1;
    const level = Number(question.level);
    perLevelPositions[level] = perLevelPositions[level] || [0, 0, 0, 0];
    if (answerIndex >= 0) perLevelPositions[level][answerIndex] += 1;
  });
  const total = rows.length || 1;
  return {
    total: rows.length,
    positions,
    positionShare: positions.map(value => Number((value / total).toFixed(3))),
    uniqueLongest,
    uniqueLongestShare: Number((uniqueLongest / total).toFixed(3)),
    uniqueShortest,
    uniqueShortestShare: Number((uniqueShortest / total).toFixed(3)),
    neitherClueShare: Number((neitherClue / total).toFixed(3)),
    perLevelPositions
  };
}

function verifyBank(bank, mode, options = {}) {
  const errors = [];
  const warnings = [];
  const expectedMode = mode === "new" ? "NEW" : "PREVIOUS";
  const seenIds = new Set();
  const seenQuestions = new Map();
  const seenSignatures = new Map();
  const seenChoiceSets = new Map();
  const external = options.global ? options.global : null;

  let total = 0;
  if (!bank || typeof bank !== "object") {
    return { valid: false, errors: ["bank missing"], warnings, metrics: metrics([]) };
  }

  SUBJECTS.forEach(subject => {
    const subjectBlock = bank[subject];
    if (!subjectBlock || typeof subjectBlock !== "object") {
      errors.push(`${subject}: missing subject block`);
      return;
    }
    const subjectKeys = Object.keys(subjectBlock).sort();
    if (subjectKeys.join("|") !== QUIZ_TYPES.slice().sort().join("|")) {
      errors.push(`${subject}: expected quiz sets ${QUIZ_TYPES.join(", ")}, found ${subjectKeys.join(", ")}`);
    }
    QUIZ_TYPES.forEach(quizType => {
      const rows = subjectBlock[quizType];
      if (!Array.isArray(rows)) {
        errors.push(`${subject}/${quizType}: missing question array`);
        return;
      }
      if (rows.length !== 80) {
        errors.push(`${subject}/${quizType}: expected 80 questions, found ${rows.length}`);
      }
      const levels = new Set();
      const categoryCounts = {};
      rows.forEach((question, index) => {
        const where = `${subject}/${quizType}[${index}]`;
        total += 1;
        if (!question || typeof question !== "object") {
          errors.push(`${where}: not a question object`);
          return;
        }
        if (!question.id || typeof question.id !== "string") errors.push(`${where}: missing id`);
        if (seenIds.has(question.id)) errors.push(`${where}: duplicate id ${question.id}`);
        seenIds.add(question.id);
        if (question.id && !question.id.startsWith(`${expectedMode}-`)) {
          errors.push(`${where}: id is not isolated to ${mode}`);
        }
        if (question.subject !== subject) errors.push(`${where}: subject mismatch`);
        if (question.quizType !== quizType || question.quizPath !== quizType) {
          errors.push(`${where}: quiz set mismatch`);
        }
        const level = Number(question.level);
        if (!Number.isInteger(level) || level < 1 || level > 80) {
          errors.push(`${where}: invalid level ${question.level}`);
        } else {
          if (levels.has(level)) errors.push(`${where}: duplicate level ${level}`);
          levels.add(level);
          const expectedDifficulty = TIER_LABELS[Math.min(3, Math.floor((level - 1) / 20))];
          if (question.difficulty !== expectedDifficulty) {
            errors.push(`${where}: difficulty ${question.difficulty} does not match level ${level} (${expectedDifficulty})`);
          }
        }
        if (!Array.isArray(question.choices) || question.choices.length !== 4) {
          errors.push(`${where}: expected four choices`);
        } else {
          const choices = question.choices.map(entry => String(entry));
          if (choices.some(entry => !entry.trim())) errors.push(`${where}: empty choice`);
          if (new Set(choices.map(entry => entry.toLowerCase())).size !== 4) {
            errors.push(`${where}: duplicate choices`);
          }
          if (!choices.includes(String(question.answer))) {
            errors.push(`${where}: answer is not one of the choices`);
          }
          const signature = choices.map(entry => entry.toLowerCase()).sort().join(" || ");
          if (seenChoiceSets.has(signature)) {
            errors.push(`${where}: repeated answer set (also used by ${seenChoiceSets.get(signature)})`);
          } else {
            seenChoiceSets.set(signature, where);
          }
          if (external && external.choiceSets.has(signature)) {
            errors.push(`${where}: answer set repeated from the other questioner mode (${external.choiceSets.get(signature)})`);
          }
        }
        if (typeof question.question !== "string" || question.question.trim().length < 12) {
          errors.push(`${where}: question text is missing or too short`);
        } else {
          const key = question.question.toLowerCase().replace(/\s+/g, " ").trim();
          if (seenQuestions.has(key)) {
            errors.push(`${where}: duplicate question (also used by ${seenQuestions.get(key)})`);
          } else {
            seenQuestions.set(key, where);
          }
          if (external && external.questions.has(key)) {
            errors.push(`${where}: question repeated from the other questioner mode (${external.questions.get(key)})`);
          }
          FILLER_PATTERNS.forEach(pattern => {
            if (pattern.test(question.question)) errors.push(`${where}: filler or template text detected`);
          });
          BROKEN_STEMS.forEach(pattern => {
            if (pattern.test(question.question)) errors.push(`${where}: broken sentence pattern detected`);
          });
        }
        if (typeof question.explanation !== "string" || question.explanation.trim().length < 8) {
          errors.push(`${where}: explanation is missing`);
        }
        if (typeof question.hint !== "string" || question.hint.trim().length < 6) {
          errors.push(`${where}: hint is missing`);
        }
        if (question.answer === undefined || String(question.answer).trim() === "") {
          errors.push(`${where}: empty answer`);
        }
        const category = String(question.category || "");
        if (!CATEGORY_TIERS[subject] || !(category in CATEGORY_TIERS[subject])) {
          errors.push(`${where}: unknown category ${category}`);
        } else {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
        if (!Array.isArray(question.tags) || !question.tags.includes(mode)) {
          errors.push(`${where}: tags do not mark the ${mode} mode`);
        }
      });

      Object.entries(CATEGORY_TIERS[subject] || {}).forEach(([category, tiers]) => {
        const expected = tiers.reduce((sum, value) => sum + value, 0);
        const found = categoryCounts[category] || 0;
        if (found !== expected) {
          errors.push(`${subject}/${quizType}: ${category} expected ${expected} questions, found ${found}`);
        }
      });

      const missingLevels = [];
      for (let level = 1; level <= 80; level += 1) if (!levels.has(level)) missingLevels.push(level);
      if (missingLevels.length) {
        errors.push(`${subject}/${quizType}: missing levels ${missingLevels.slice(0, 8).join(", ")}${missingLevels.length > 8 ? "…" : ""}`);
      }
    });
  });

  if (total !== 800) errors.push(`bank total expected 800, found ${total}`);

  const report = metrics(allRows(bank));
  const perLevel = report.perLevelPositions;
  Object.entries(perLevel).forEach(([level, counts]) => {
    const maxShare = Math.max(...counts);
    const totalInLevel = counts.reduce((sum, value) => sum + value, 0);
    if (totalInLevel >= 8 && maxShare >= totalInLevel - 2) {
      errors.push(`level ${level}: answer positions are clustered (${counts.join("/")})`);
    }
    if (totalInLevel >= 8 && counts.filter(value => value > 0).length < 3) {
      errors.push(`level ${level}: fewer than three answer positions used (${counts.join("/")})`);
    }
  });
  if (report.uniqueLongestShare > 0.4) {
    errors.push(`correct answers are the longest option too often (${report.uniqueLongestShare})`);
  }
  if (report.uniqueShortestShare > 0.4) {
    errors.push(`correct answers are the shortest option too often (${report.uniqueShortestShare})`);
  }
  report.positionShare.forEach((share, index) => {
    if (share < 0.16 || share > 0.34) {
      warnings.push(`answer position ${index} holds ${(share * 100).toFixed(1)}% of the answers`);
    }
  });

  return { valid: errors.length === 0, errors, warnings, metrics: report, total };
}

function loadBank(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8"));
}

module.exports = { verifyBank, metrics, allRows, loadBank, FILLER_PATTERNS, BROKEN_STEMS };
