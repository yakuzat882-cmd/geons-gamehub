#!/usr/bin/env node
/*
 * Geon's GameHub — question bank builder.
 *
 * Rebuilds questions.json / questions.new.json (and the embedded .js mirrors)
 * from the authored concept libraries in tools/content, keeping:
 *   - the exact 5 subjects x 2 sets x 80 levels structure,
 *   - the exact per-subject category distributions,
 *   - the existing question IDs (so save/progress stays compatible),
 *   - full PREVIOUS/NEW dataset isolation.
 *
 * MATH keeps its existing valid items except:
 *   - the three NEW items whose text duplicated PREVIOUS items, and
 *   - the NEW IMPOSSIBLE band (levels 61-80), which is regenerated with
 *     multi-step reasoning problems instead of bare big-number arithmetic.
 *
 * Deterministic: same inputs -> byte-identical outputs.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { makeRng, shuffled, intBetween, normalizeText } = require("./lib");

const psychology = require("./content/psychology");
const science = require("./content/science");
const tech1 = require("./content/tech1");
const tech2 = require("./content/tech2");

const ROOT = path.join(__dirname, "..");

const SUBJECTS = ["MATH", "PSYCHOLOGY", "SCIENCE", "TECH 1", "TECH 2"];
const SETS = ["SUBJECT 1", "SUBJECT 2"];
const MODES = ["previous", "new"];
const POOL_KEY = { previous: "foundational", new: "advanced" };
const LIBS = { PSYCHOLOGY: psychology, SCIENCE: science, "TECH 1": tech1, "TECH 2": tech2 };
const SUBJECT_KEY = { MATH: "MATH", PSYCHOLOGY: "PSYCHOLOGY", SCIENCE: "SCIENCE", "TECH 1": "TECH_1", "TECH 2": "TECH_2" };

/* Per-set category totals required by the prompt. */
const SET_TOTALS = {
  MATH: { "MULTIPLICATION": 15, "DIVISION": 15, "ADDITION": 15, "SUBTRACTION": 15, "PROBLEM SOLVING": 20 },
  PSYCHOLOGY: { "MIND MANIPULATIONS": 20, "SELF RESILIENCE": 20, "CONVINCE OTHERS": 20, "HOW TO BECOME UNSTOPPABLE": 20 },
  SCIENCE: {
    "SOLID, LIQUID, GAS": 15,
    "TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS": 15,
    "PASCAL'S PRINCIPLES": 20,
    "ARCHIMEDE'S PRINCIPLES": 15,
    HISTORY: 15
  },
  "TECH 1": {
    "SYSTEM UNIT AND ITS COMPONENTS": 30,
    "OHS GUIDELINES AND DMA PROCEDURES": 20,
    "ASSEMBLE AND DISASSEMBLE SYSTEM UNIT": 30
  },
  "TECH 2": {
    "BIOS, CMOS, UEFI": 30,
    NETWORKING: 20,
    "WINDOWS INSTALLATION": 20,
    "SAFETY PROCEDURES": 10
  }
};

const BAND_NAMES = ["NORMAL", "HARD", "INSANE", "IMPOSSIBLE"];
function bandOf(level) {
  return level <= 20 ? 0 : level <= 40 ? 1 : level <= 60 ? 2 : 3;
}

/* ------------------------------------------------------------------ */
/* Facet stems                                                         */
/* ------------------------------------------------------------------ */

const NORMAL_STEMS = [
  t => `Which statement best describes ${t}?`,
  t => `Which option correctly describes ${t}?`,
  t => `What does ${t} refer to?`
];

const HARD_STEM = {
  PSYCHOLOGY: "Which concept is being applied?",
  SCIENCE: "Which concept does this describe?",
  "TECH 1": "Which practice or component is this?",
  "TECH 2": "Which practice or component is this?"
};
const HISTORY_HARD_STEM = "Which milestone is being described?";

const IMPOSSIBLE_STEM = {
  PSYCHOLOGY: "Which response is most appropriate?",
  SCIENCE: "Which analysis is most appropriate?",
  "TECH 1": "Which action is most appropriate?",
  "TECH 2": "Which action is most appropriate?"
};
const HISTORY_IMPOSSIBLE_STEM = "Which judgment is most accurate?";

/* ------------------------------------------------------------------ */
/* Category map construction (per mode/subject/set)                    */
/* ------------------------------------------------------------------ */

/*
 * Builds a level -> category map for one set. For every category the
 * per-band quota is spread so that ACROSS BOTH SETS no band needs more
 * distinct concepts than the pool provides. Levels within a band are
 * shuffled, so categories stay mixed per level.
 */
function buildSetMaps(subject, seedBase) {
  const pools = LIBS[subject];
  const capacity = {};
  for (const cat of Object.keys(SET_TOTALS[subject])) {
    capacity[cat] = pools.foundational[cat].length;
  }

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rng = makeRng(seedBase + attempt * 7919);
    const maps = { "SUBJECT 1": new Array(80), "SUBJECT 2": new Array(80) };
    let ok = true;

    for (const set of SETS) {
      for (let band = 0; band < 4 && ok; band += 1) {
        const bag = [];
        for (const [cat, total] of Object.entries(SET_TOTALS[subject])) {
          const base = Math.floor(total / 4);
          let extra = total - base * 4;
          const quota = base;
          let count = quota;
          /* Deterministically spread the remainder across bands. */
          const spread = (band + attempt + set.length) % 4;
          const pattern = [];
          for (let i = 0; i < 4; i += 1) pattern.push(i < extra ? 1 : 0);
          /* rotate pattern by spread */
          const rotated = pattern.slice(spread).concat(pattern.slice(0, spread));
          count = quota + rotated[band];
          if (count < 0) { ok = false; break; }
          for (let i = 0; i < count; i += 1) bag.push(cat);
        }
        if (!ok) break;
        const placed = shuffled(bag, rng);
        if (placed.length !== 20) { ok = false; break; }
        for (let i = 0; i < 20; i += 1) {
          maps[set][band * 20 + i] = placed[i];
        }
      }
      if (!ok) break;
    }

    if (!ok) continue;

    /* Verify cross-set per-band demand never exceeds the concept pool. */
    for (const [cat, cap] of Object.entries(capacity)) {
      for (let band = 0; band < 4; band += 1) {
        let cross = 0;
        for (const set of SETS) {
          cross += maps[set].filter((c, idx) => bandOf(idx + 1) === band && c === cat).length;
        }
        if (cross > cap) { ok = false; break; }
      }
      if (!ok) break;
    }

    if (ok) return maps;
  }
  throw new Error(`Could not balance category map for ${subject}`);
}

/* ------------------------------------------------------------------ */
/* Concept slot assignment                                             */
/* ------------------------------------------------------------------ */

function buildConceptAssignments(subject, mode, setMaps, seedBase) {
  const pools = LIBS[subject][POOL_KEY[mode]];
  const usage = {}; /* usage[cat][band] = next index into the shuffled concept order */

  const result = {}; /* result[set][levelIdx] = { concept, band } */
  for (const set of SETS) result[set] = new Array(80);

  const rng = makeRng(seedBase);
  const orders = {};
  for (const cat of Object.keys(pools)) {
    orders[cat] = {};
    for (let band = 0; band < 4; band += 1) {
      orders[cat][band] = shuffled(pools[cat], rng);
      usage[cat] = usage[cat] || {};
      usage[cat][band] = 0;
    }
  }

  for (const set of SETS) {
    for (let idx = 0; idx < 80; idx += 1) {
      const cat = setMaps[set][idx];
      const band = bandOf(idx + 1);
      const order = orders[cat][band];
      const next = usage[cat][band];
      if (next >= order.length) {
        throw new Error(`Concept pool exhausted: ${mode}/${subject}/${cat} band ${band}`);
      }
      usage[cat][band] += 1;
      result[set][idx] = { concept: order[next], band };
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Question assembly from a concept + facet                            */
/* ------------------------------------------------------------------ */

function pickSiblings(correctText, pool, key, rng, count) {
  const candidates = pool
    .map(entry => entry[key])
    .filter(text => text !== correctText);
  /* Prefer distractors whose length is close to the correct answer so
     length never gives the answer away. */
  const target = correctText.length;
  const ranked = shuffled(candidates, rng)
    .map(text => ({ text, d: Math.abs(text.length - target) }))
    .sort((a, b) => a.d - b.d);
  const window = ranked.slice(0, Math.max(count + 2, Math.ceil(ranked.length / 2)));
  const chosen = shuffled(window, rng).slice(0, count).map(x => x.text);
  return chosen;
}

function facetQuestion(subject, category, concept, band, rng, variant) {
  const term = concept.term;
  let question, correct, distractors, explanation, hint;

  if (band === 0) {
    const stem = NORMAL_STEMS[(variant + Math.floor(rng() * 3)) % NORMAL_STEMS.length](term);
    question = stem;
    correct = concept.def;
    distractors = pickSiblings(correct, LIBS[subject][POOL_KEY. ___MODE___][category] /* replaced below */, "def", rng, 3);
    explanation = `${term.charAt(0).toUpperCase() + term.slice(1)} — ${concept.def}.`;
    hint = `Recall what ${term} means.`;
  } else if (band === 1) {
    const stem = category === "HISTORY" ? HISTORY_HARD_STEM : HARD_STEM[subject];
    question = `${concept.cue} ${stem}`;
    correct = term;
    distractors = []; /* filled by caller with sibling terms */
    explanation = `The scenario matches ${term}: ${concept.def}.`;
    hint = `Match the situation to the concept it demonstrates.`;
  } else if (band === 2) {
    question = `Which statement about ${term} is accurate?`;
    correct = concept.def;
    distractors = [...concept.misconceptions];
    explanation = `Only this statement matches ${term} — ${concept.def}. The other statements contradict it.`;
    hint = `Check each statement against what ${term} actually means.`;
  } else {
    const stem = category === "HISTORY" ? HISTORY_IMPOSSIBLE_STEM : IMPOSSIBLE_STEM[subject];
    question = `${concept.setup} ${stem}`;
    correct = concept.right;
    distractors = [...concept.wrongs];
    explanation = `This plan applies ${term} while satisfying both constraints; every other option breaks at least one.`;
    hint = `Eliminate any option that violates one of the stated constraints.`;
  }

  return { question, correct, distractors, explanation, hint };
}

module.exports = { SUBJECTS, SETS, MODES, POOL_KEY, LIBS, SET_TOTALS, SUBJECT_KEY, BAND_NAMES, bandOf, buildSetMaps, buildConceptAssignments };
