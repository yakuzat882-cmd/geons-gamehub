/*
 * Geon's GameHub — Questioner bank build engine (shared helpers + frame engine).
 *
 * The engine is deterministic: the same seed always produces the same banks, so
 * the shipped JSON/embedded data can be re-generated and re-verified at any time.
 *
 * Frame design rules (from the questioner upgrade prompt):
 *  - the marked correct option is produced by the content, never chosen at random;
 *  - distractors are plausible, on-topic and provably wrong for the question asked;
 *  - no answer-position pattern, no "longest option is the answer" pattern;
 *  - question text never repeats inside a mode and never repeats across modes.
 */

const SUBJECTS = Object.freeze(["MATH", "PSYCHOLOGY", "SCIENCE", "TECH 1", "TECH 2"]);
const QUIZ_TYPES = Object.freeze(["SUBJECT 1", "SUBJECT 2"]);
const TIER_LABELS = Object.freeze(["NORMAL", "HARD", "INSANE", "IMPOSSIBLE"]);

/*
 * Per quiz set, per subject: how many questions each category contributes and how
 * they are spread over the four difficulty bands (20 levels each).
 * Sum per category equals the required category count, and each band column sums
 * to exactly 20 questions for every subject/set.
 */
const CATEGORY_TIERS = Object.freeze({
  MATH: {
    MULTIPLICATION: [4, 4, 4, 3],
    DIVISION: [4, 4, 4, 3],
    ADDITION: [4, 4, 4, 3],
    SUBTRACTION: [4, 4, 4, 3],
    "PROBLEM SOLVING": [4, 4, 4, 8]
  },
  PSYCHOLOGY: {
    "MIND MANIPULATIONS": [5, 5, 5, 5],
    "SELF RESILIENCE": [5, 5, 5, 5],
    "CONVINCE OTHERS": [5, 5, 5, 5],
    "HOW TO BECOME UNSTOPPABLE": [5, 5, 5, 5]
  },
  SCIENCE: {
    "SOLID, LIQUID, GAS": [4, 4, 4, 3],
    "TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS": [4, 4, 4, 3],
    "PASCAL'S PRINCIPLES": [4, 4, 4, 8],
    "ARCHIMEDE'S PRINCIPLES": [4, 4, 4, 3],
    HISTORY: [4, 4, 4, 3]
  },
  "TECH 1": {
    "SYSTEM UNIT AND ITS COMPONENTS": [7, 8, 8, 7],
    "OHS GUIDELINES AND DMA PROCEDURES": [5, 5, 5, 5],
    "ASSEMBLE AND DISASSEMBLE SYSTEM UNIT": [8, 7, 7, 8]
  },
  "TECH 2": {
    "BIOS, CMOS, UEFI": [7, 8, 8, 7],
    NETWORKING: [5, 5, 5, 5],
    "WINDOWS INSTALLATION": [5, 5, 5, 5],
    "SAFETY PROCEDURES": [3, 2, 2, 3]
  }
});

const BANKS = Object.freeze([
  { mode: "previous", globalName: "questionBank", tag: "previous", idPrefix: "PREVIOUS" },
  { mode: "new", globalName: "newQuestionBank", tag: "new", idPrefix: "NEW" }
]);

/* ---------- deterministic randomness ---------- */

function hashString(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let state = hashString(seed) || 1;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ---------- text helpers ---------- */

function sentenceCase(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ensurePeriod(text) {
  const value = String(text || "").trim();
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function stripPeriod(text) {
  return String(text || "").trim().replace(/[.!?]+$/, "");
}

function lower(text) {
  return String(text || "").trim().toLowerCase();
}

function firstWord(term) {
  return lower(term).replace(/[^a-z0-9]+/g, " ").trim().split(" ")[0] || "";
}

const ACRONYMS = new Set([
  "BIOS", "CMOS", "UEFI", "RAM", "CPU", "GPU", "PSU", "SSD", "HDD", "USB", "PCI", "PCIe",
  "SATA", "NVME", "ESD", "OHS", "DMA", "IP", "MAC", "DNS", "DHCP", "NTFS", "GPT", "MBR",
  "POST", "OS", "UPS", "LED", "LCD", "HDMI", "VGA"
]);

function applyAcronyms(text) {
  return String(text).replace(/\b[A-Za-z][A-Za-z0-9\/\-]*\b/g, word => {
    const plain = word.replace(/\//g, "");
    return ACRONYMS.has(word.toUpperCase()) || ACRONYMS.has(plain.toUpperCase())
      ? word.toUpperCase()
      : word;
  });
}

function titleTermRaw(term) {
  return String(term)
    .trim()
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-z0-9'])/g, (match, lead, letter) => `${lead}${letter.toUpperCase()}`)
    .replace(/\bOf\b/g, "of")
    .replace(/\bThe\b/g, "the")
    .replace(/\bAnd\b/g, "and")
    .replace(/\bIn\b/g, "in")
    .replace(/\bTo\b/g, "to")
    .replace(/\bI\/o\b/g, "I/O");
}

function titleTerm(term) {
  return applyAcronyms(titleTermRaw(term));
}

function normalizeQuestionText(text) {
  return lower(text).replace(/\s+/g, " ").replace(/[“”"']/g, "'").trim();
}

function choiceSignature(choices) {
  return choices.map(choice => lower(choice)).sort().join(" || ");
}

/*
 * Picks three wrong options for a question.
 *
 * `pools` is an array of decision functions, tried in order:
 *   each entry returns an array of candidate wrong answers (or the next pool is used).
 * Selection prefers a mix that does not make the correct answer the obvious odd one
 * out by length, so the "longest answer" / "shortest answer" clue does not appear.
 */
function pickWrongs(correct, poolBuilder, rng, options = {}) {
  const count = options.count || 3;
  const avoidLongest = options.avoidLongest !== false;
  let best = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pool = poolBuilder(attempt).filter(
      entry => entry && lower(entry) !== lower(correct)
    );
    const candidate = [];
    const seen = new Set([lower(correct)]);
    for (const entry of shuffle(pool, rng)) {
      const key = lower(entry);
      if (seen.has(key)) continue;
      seen.add(key);
      candidate.push(entry);
      if (candidate.length === count) break;
    }
    if (candidate.length < count) continue;

    const lengths = [correct, ...candidate].map(entry => String(entry).length);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    const answerLength = String(correct).length;
    const uniqueLongest = answerLength === max && lengths.filter(length => length === max).length === 1;
    const uniqueShortest = answerLength === min && lengths.filter(length => length === min).length === 1;
    let score = 0;
    if (!uniqueLongest) score += 3;
    if (!uniqueShortest) score += 2;
    if (!avoidLongest || !uniqueLongest) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
    if (score >= 5) break;
  }

  return best || [];
}

/* ---------- concept content checks ---------- */

function validateConcept(concept, category, requiredFields) {
  const errors = [];
  const required = requiredFields || ["t", "d", "f", "p", "s", "n", "q"];
  required.forEach(field => {
    if (!concept[field] || !String(concept[field]).trim()) {
      errors.push(`${category}: concept "${concept.t || "?"}" is missing field "${field}"`);
    }
  });
  if (errors.length) return errors;

  const key = firstWord(concept.t);
  const contains = (text, word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(String(text || ""));
  const keyWord = firstWord(concept.t.replace(/[^A-Za-z0-9' ]/g, " "));
  if (keyWord && contains(concept.d, keyWord)) {
    errors.push(`${category}/${concept.t}: definition must not name the concept`);
  }
  if (keyWord && !contains(concept.f, keyWord)) {
    errors.push(`${category}/${concept.t}: the true statement must name the concept`);
  }
  ["s", "n", "q"].forEach(field => {
    if (!concept[field]) return;
    if (keyWord && contains(concept[field], keyWord)) {
      errors.push(`${category}/${concept.t}: field "${field}" must not name the concept`);
    }
  });
  if (keyWord && contains(concept.p, keyWord)) {
    errors.push(`${category}/${concept.t}: the practice must not name the concept`);
  }
  return errors;
}

/*
 * Frames.
 *
 * Every frame returns candidate questions for one concept in one bank. The correct
 * answer is always built from the curated content, and the wrong options always come
 * from content that is false for the question being asked (a statement about another
 * concept, another concept's practice, or a curated poor practice).
 */
function conceptCandidates(concept, context, bank) {
  const { category, terms, definitions, facts, practices, flaws, constraints, hints } = context;
  const term = titleTerm(concept.t);
  const definition = ensurePeriod(concept.d);
  const fact = ensurePeriod(concept.f);
  const practice = ensurePeriod(concept.p);
  const basicScenario = ensurePeriod(concept.s);
  const advancedScenario = ensurePeriod(concept.n);
  const label = stripPeriod(concept.q);
  const hint = hints[hashString(concept.t) % hints.length];

  const otherTerms = () => terms.filter(entry => entry !== term);
  const otherDefinitions = () => definitions.filter(entry => lower(entry) !== lower(definition));
  const otherFacts = () => facts.filter(entry => lower(entry) !== lower(fact));
  const otherPractices = () => practices.filter(entry => lower(entry) !== lower(practice));
  const otherLabels = () => context.labels.filter(entry => entry !== label);
  const flawPool = () => flaws;
  const weakens = flaws[hashString(concept.t) % flaws.length];

  const candidates = [];
  const add = entry => candidates.push({ ...entry, concept: concept.t, category });

  if (bank === "previous") {
    add({
      frame: "prev-term-from-definition",
      tier: 0,
      text: [
        `Which term matches this description? ${sentenceCase(concept.d)}.`,
        `Which term is being described here? ${sentenceCase(concept.d)}.`
      ],
      answer: term,
      wrongPools: [() => otherTerms(), () => terms],
      exp: `${sentenceCase(concept.d)}. That is the defining idea of ${term}.`,
      hint: "Compare every option with the exact idea in the description."
    });
    add({
      frame: "prev-definition-from-term",
      tier: 0,
      text: [
        `Which phrase best explains ${term}?`,
        `What does ${term} mean?`
      ],
      answer: definition,
      wrongPools: [() => otherDefinitions(), () => definitions],
      exp: `${term} means ${stripPeriod(concept.d)}.`,
      hint: "Rule out the phrases that belong to a different concept."
    });
    add({
      frame: "prev-practice-from-term",
      tier: 1,
      text: [
        `Which practice best demonstrates ${term}?`,
        `A trainer is presenting ${term}. Which example should the trainer use?`
      ],
      answer: practice,
      wrongPools: [() => [...flawPool(), ...otherPractices()], () => flawPool()],
      exp: `${sentenceCase(concept.p)}. That is the practice that keeps ${term} working as intended.`,
      hint: "Reject the options that work against the idea being taught."
    });
    add({
      frame: "prev-term-from-scenario",
      tier: 1,
      text: [
        `${basicScenario} Which concept does this illustrate?`,
        `${basicScenario} Which concept best fits what happened?`
      ],
      answer: term,
      wrongPools: [() => otherTerms(), () => terms],
      exp: `${basicScenario} That is ${term}: ${stripPeriod(concept.d)}.`,
      hint: hint
    });
    add({
      frame: "prev-statement-check",
      tier: 2,
      text: [
        `Which of these statements correctly describes ${term}?`,
        `Which statement gives the right description of ${term}?`
      ],
      answer: fact,
      wrongPools: [() => otherFacts(), () => facts],
      exp: `${fact}`,
      hint: "Only one option describes this concept; the others describe different ones."
    });
    add({
      frame: "prev-term-from-advanced-case",
      tier: 2,
      text: [
        `${advancedScenario} Which concept is being applied?`,
        `${advancedScenario} Which concept best explains this case?`
      ],
      answer: term,
      wrongPools: [() => otherTerms(), () => terms],
      exp: `${advancedScenario} That is ${term}: ${stripPeriod(concept.d)}.`,
      hint: hint
    });
    add({
      frame: "prev-composite-case",
      tier: 3,
      text: [
        `${basicScenario} A study group must explain this case using ${term} while ${constraints[0]}. Which step is the best fit?`,
        `${basicScenario} The group has to apply ${term} on the record while ${constraints[1] || constraints[0]}. Which action should come first?`
      ],
      answer: practice,
      wrongPools: [() => flawPool(), () => [...flawPool(), ...otherPractices()]],
      exp: `${sentenceCase(concept.p)}. That is the practice ${term} calls for: ${stripPeriod(concept.d)}.`,
      hint: `The best option applies ${term} without breaking the stated condition.`
    });
    add({
      frame: "prev-plan-requirement",
      tier: 3,
      text: [
        `A checklist claims to cover ${term}. Which point must it include?`,
        `A study guide is being written about ${term}. Which point should it include?`
      ],
      answer: practice,
      wrongPools: [() => otherPractices(), () => [...otherPractices(), ...flawPool()]],
      exp: `${sentenceCase(concept.p)}. A complete ${term} checklist cannot leave that step out.`,
      hint: `Only one listed point comes straight from ${term}.`
    });
  } else {
    add({
      frame: "new-definition-variant",
      tier: 0,
      text: [
        `A specialist describes ${term} in a training session. Which phrase matches that idea?`,
        `Which phrase describes ${term} in practice?`
      ],
      answer: definition,
      wrongPools: [() => otherDefinitions(), () => definitions],
      exp: `${term} means ${stripPeriod(concept.d)}.`,
      hint: "Only one phrase matches the concept exactly."
    });
    add({
      frame: "new-what-weakens",
      tier: 0,
      text: [
        `A team is reviewing ${term}. Which of these actions would be a mistake?`,
        `Which listed action would be a mistake while working with ${term}?`
      ],
      answer: weakens,
      wrongPools: [() => otherPractices(), () => practices],
      exp: `${ensurePeriod(sentenceCase(weakens))} That works against ${term}.`,
      hint: "Find the option that works against the concept instead of supporting it."
    });
    add({
      frame: "new-term-from-scenario",
      tier: 1,
      text: [
        `${advancedScenario} Which concept does this case demonstrate?`,
        `${advancedScenario} Which concept best accounts for this outcome?`
      ],
      answer: term,
      wrongPools: [() => otherTerms(), () => terms],
      exp: `${advancedScenario} That is ${term}: ${stripPeriod(concept.d)}.`,
      hint: hint
    });
    add({
      frame: "new-label-match",
      tier: 1,
      text: [
        `Which description belongs with ${term}?`,
        `Which short description matches ${term}?`
      ],
      answer: label,
      wrongPools: [() => context.labels.filter(entry => entry !== label), () => context.labels],
      exp: `${term}: ${label}. That description belongs to this concept only.`,
      hint: "The other descriptions belong to different concepts from the same category."
    });
    add({
      frame: "new-action-in-case",
      tier: 2,
      text: [
        `${advancedScenario} Which action best applies ${term} here?`,
        `${advancedScenario} Which step shows ${term} being used correctly?`
      ],
      answer: practice,
      wrongPools: [() => flawPool(), () => [...flawPool(), ...otherPractices()]],
      exp: `${sentenceCase(concept.p)}. That is how ${term} is applied in this case.`,
      hint: "Choose the action that keeps the concept's defining idea intact."
    });
    add({
      frame: "new-statement-check",
      tier: 2,
      text: [
        `Which of these statements describes ${term} correctly?`,
        `Which statement matches ${term} as it is actually used?`
      ],
      answer: fact,
      wrongPools: [() => otherFacts(), () => facts],
      exp: `${fact}`,
      hint: "The other options describe different concepts, so they cannot be true here."
    });
    add({
      frame: "new-composite-case",
      tier: 3,
      text: [
        `${advancedScenario} The team must apply ${term} while ${constraints[2] || constraints[0]}. Which response is best?`,
        `${advancedScenario} A reviewer wants the option that follows ${term} while ${constraints[3] || constraints[0]}. Which choice should the reviewer accept?`
      ],
      answer: practice,
      wrongPools: [() => flawPool(), () => [...flawPool(), ...otherPractices()]],
      exp: `${sentenceCase(concept.p)}. It keeps ${term} intact while handling the extra requirement.`,
      hint: hint
    });
    add({
      frame: "new-plan-requirement",
      tier: 3,
      text: [
        `A summary claims to cover ${term}. Which point must it include to be accurate?`,
        `A briefing is labelled as covering ${term}. Which point does it still need?`
      ],
      answer: practice,
      wrongPools: [() => otherPractices(), () => [...otherPractices(), ...flawPool()]],
      exp: `${sentenceCase(concept.p)}. Without that step the plan does not follow ${term}.`,
      hint: "The needed step must come from the concept named in the question."
    });
  }

  return candidates;
}

function makeContext(category, content, extras = []) {
  /*
   * The option pools mix the real concepts with the distractor-only entries from
   * content/extras.js. Extras are always wrong for the question being asked, which
   * keeps the wrong options on-topic without ever marking them correct.
   */
  const pool = content.concepts.concat(extras);
  const terms = pool.map(concept => titleTerm(concept.t));
  const definitions = pool.map(concept => ensurePeriod(concept.d));
  const facts = pool.map(concept => ensurePeriod(concept.f));
  const practices = pool.map(concept => ensurePeriod(concept.p));
  const labels = pool.map(concept => stripPeriod(concept.q));
  const labelPartners = {};
  content.concepts.forEach(concept => {
    labelPartners[stripPeriod(concept.q)] = titleTerm(concept.t);
  });
  const hints = content.hints && content.hints.length
    ? content.hints
    : ["Compare each option with the concept named in the question."];
  return {
    category,
    terms,
    definitions,
    facts,
    practices,
    labels,
    flaws: content.flaws.map(ensurePeriod),
    constraints: content.constraints,
    hints,
    labelPartners
  };
}

module.exports = {
  SUBJECTS,
  QUIZ_TYPES,
  TIER_LABELS,
  CATEGORY_TIERS,
  BANKS,
  hashString,
  makeRng,
  shuffle,
  sentenceCase,
  ensurePeriod,
  stripPeriod,
  lower,
  firstWord,
  titleTerm,
  normalizeQuestionText,
  choiceSignature,
  pickWrongs,
  validateConcept,
  conceptCandidates,
  makeContext
};
