#!/usr/bin/env node
/*
 * Geon's GameHub — question bank builder (deterministic).
 *
 * Rebuilds questions.json / questions.new.json and the embedded mirrors
 * questions.embedded.js / questions.new.embedded.js from the authored
 * concept libraries in tools/content/, while preserving:
 *   - the exact 5 subjects x 2 sets x 80 levels structure,
 *   - the exact per-subject category distributions required by the spec,
 *   - the existing question IDs (save/progress compatibility),
 *   - full PREVIOUS/NEW dataset isolation (disjoint concept pools).
 *
 * MATH keeps its existing valid items except:
 *   - the three NEW items whose text duplicated PREVIOUS items, and
 *   - the NEW IMPOSSIBLE band (levels 61-80), regenerated with genuine
 *     multi-step reasoning instead of bare big-number arithmetic.
 *
 * Usage: node tools/build-question-banks.js
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

/* Per-set category totals required by the prompt. */
const SET_TOTALS = {
  PSYCHOLOGY: {
    "MIND MANIPULATIONS": 20,
    "SELF RESILIENCE": 20,
    "CONVINCE OTHERS": 20,
    "HOW TO BECOME UNSTOPPABLE": 20
  },
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
    "NETWORKING": 20,
    "WINDOWS INSTALLATION": 20,
    "SAFETY PROCEDURES": 10
  }
};

const BAND_NAMES = ["NORMAL", "HARD", "INSANE", "IMPOSSIBLE"];
const bandOf = level => (level <= 20 ? 0 : level <= 40 ? 1 : level <= 60 ? 2 : 3);

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
const IMPOSSIBLE_STEM = {
  PSYCHOLOGY: "Which response is most appropriate?",
  SCIENCE: "Which analysis is most appropriate?",
  "TECH 1": "Which action is most appropriate?",
  "TECH 2": "Which action is most appropriate?"
};
const HARD_STEM_HISTORY = "Which milestone is being described?";
const IMPOSSIBLE_STEM_HISTORY = "Which judgment is most accurate?";

/* ------------------------------------------------------------------ */
/* Category map construction (per subject, both sets of one mode)      */
/* ------------------------------------------------------------------ */

function buildSetMaps(subject, seedBase) {
  const pools = LIBS[subject][POOL_KEY.previous];
  const cats = Object.keys(SET_TOTALS[subject]);
  const capacity = {};
  const base = {};
  const tokens = {};
  for (const cat of cats) {
    capacity[cat] = pools[cat].length;
    base[cat] = Math.floor(SET_TOTALS[subject][cat] / 4);
    tokens[cat] = SET_TOTALS[subject][cat] - base[cat] * 4;
  }
  const baseSum = cats.reduce((a, c) => a + base[c], 0);
  const perBandExtras = 20 - baseSum; /* extras each band must absorb */
  if (perBandExtras < 0) throw new Error(`Base quotas exceed 20 for ${subject}`);

  /*
   * Allocate each category's extra quota tokens to bands so that every
   * band's total is exactly 20. Set 2 avoids overlapping a set-1 band for
   * categories whose concept pool allows only one cross-set extra.
   */
  function allocateExtras(setIdx, attempt, set1Extras) {
    const allowed = {};
    const remaining = {};
    for (const cat of cats) {
      remaining[cat] = tokens[cat];
      const coupled = capacity[cat] - 2 * base[cat] === 1 && tokens[cat] > 0;
      allowed[cat] = (setIdx === 1 && coupled)
        ? [0, 1, 2, 3].filter(b => !set1Extras[cat].has(b))
        : [0, 1, 2, 3];
    }
    const result = {};
    for (const cat of cats) result[cat] = new Set();
    const rng = makeRng(hashString(`extras|${subject}|${setIdx}|${attempt}`));
    for (let band = 0; band < 4; band += 1) {
      const candidates = cats.filter(c => remaining[c] > 0 && allowed[c].includes(band));
      if (candidates.length < perBandExtras) return null;
      const picks = shuffled(candidates, rng).slice(0, perBandExtras);
      for (const c of picks) {
        result[c].add(band);
        remaining[c] -= 1;
      }
    }
    return result;
  }

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const extras = { 0: allocateExtras(0, attempt, null), 1: null };
    if (!extras[0]) continue;
    extras[1] = allocateExtras(1, attempt, extras[0]);
    if (!extras[1]) continue;

    const rng = makeRng(seedBase + attempt * 7919);
    const maps = { "SUBJECT 1": new Array(80), "SUBJECT 2": new Array(80) };
    let ok = true;

    SETS.forEach((set, setIdx) => {
      for (let band = 0; band < 4 && ok; band += 1) {
        const bag = [];
        for (const cat of cats) {
          const quota = base[cat] + (extras[setIdx][cat].has(band) ? 1 : 0);
          for (let i = 0; i < quota; i += 1) bag.push(cat);
        }
        if (bag.length !== 20) { ok = false; break; }
        const placed = shuffled(bag, rng);
        for (let i = 0; i < 20; i += 1) maps[set][band * 20 + i] = placed[i];
      }
    });
    if (!ok) continue;

    /* Cross-set demand per (category, band) must not exceed the pool. */
    let balanced = true;
    for (const [cat, cap] of Object.entries(capacity)) {
      for (let band = 0; band < 4 && balanced; band += 1) {
        let cross = 0;
        for (const set of SETS) {
          for (let idx = 0; idx < 80; idx += 1) {
            if (bandOf(idx + 1) === band && maps[set][idx] === cat) cross += 1;
          }
        }
        if (cross > cap) balanced = false;
      }
      if (!balanced) break;
    }
    if (balanced) return maps;
  }
  throw new Error(`Could not balance category map for ${subject}`);
}

/* ------------------------------------------------------------------ */
/* Concept slot assignment                                             */
/* ------------------------------------------------------------------ */

function buildConceptAssignments(subject, mode, setMaps, seedBase) {
  const pools = LIBS[subject][POOL_KEY[mode]];
  const rng = makeRng(seedBase);
  const orders = {};
  for (const cat of Object.keys(pools)) {
    orders[cat] = {};
    for (let band = 0; band < 4; band += 1) {
      orders[cat][band] = shuffled(pools[cat], rng);
    }
  }

  const result = {};
  for (const set of SETS) result[set] = new Array(80);

  const used = {};
  for (const cat of Object.keys(pools)) {
    used[cat] = {};
    for (let band = 0; band < 4; band += 1) used[cat][band] = {};
  }

  for (const set of SETS) {
    for (let idx = 0; idx < 80; idx += 1) {
      const cat = setMaps[set][idx];
      const band = bandOf(idx + 1);
      const order = orders[cat][band];
      /* Find the next concept of this category not yet used at this band. */
      let assigned = null;
      for (const concept of order) {
        if (!used[cat][band][concept.term]) {
          used[cat][band][concept.term] = true;
          assigned = concept;
          break;
        }
      }
      if (!assigned) {
        throw new Error(`Concept pool exhausted: ${mode}/${subject}/${cat} band ${BAND_NAMES[band]}`);
      }
      result[set][idx] = { concept: assigned, band, category: cat };
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Question assembly                                                   */
/* ------------------------------------------------------------------ */

/*
 * Candidate sibling combinations, ranked so option lengths stay close to
 * the answer's length (length must never hint at the answer), then rotated
 * by the question's seed. The caller registers the combo it uses, so no
 * two questions in a bank end up with the same option set.
 */
function rankedCandidates(pool, key, answerText) {
  const target = answerText.length;
  return pool
    .map(c => c[key])
    .filter(text => text !== answerText)
    .map(text => ({ text, d: Math.abs(text.length - target) }))
    .sort((a, b) => a.d - b.d)
    .map(x => x.text);
}

function pickUniqueCombo(pool, key, answerText, seedKey, usedSet) {
  const ranked = rankedCandidates(pool, key, answerText);
  if (ranked.length < 3) throw new Error(`Pool too small for ${seedKey}`);
  const start = hashString(seedKey) % ranked.length;
  for (let k = 0; k < ranked.length; k += 1) {
    const off = (start + k) % ranked.length;
    const rot = ranked.slice(off).concat(ranked.slice(0, off));
    const combo = rot.slice(0, 3);
    const setKey = [answerText, ...combo].map(normalizeText).sort().join("|");
    if (!usedSet.has(setKey)) {
      usedSet.add(setKey);
      return combo;
    }
  }
  throw new Error(`No unique sibling combo for ${seedKey}`);
}

/* Short clause tails that keep a wrong plan plausible — and comparable in
   length to the correct plan — without ever making it correct. */
const WRONG_TAILS = {
  PSYCHOLOGY: [
    ", turning a fixable issue into a recurring fight",
    " while insisting it is the only sensible move",
    ", and let resentment quietly do the rest",
    " while treating every warning as an insult",
    ", trading one small problem for a bigger one",
    " while ignoring what the other person actually said",
    ", then blame the outcome on everyone else"
  ],
  SCIENCE: [
    ", skipping the depth factor entirely",
    " while trusting the first rough estimate",
    ", ignoring the stated constraint about area",
    " even though the setup contradicts it",
    ", assuming the fluid behaves like a solid",
    " while never checking the units involved",
    ", then record the result without verifying it"
  ],
  "TECH 1": [
    ", skipping the verification step entirely",
    " while trusting memory over the service manual",
    ", leaving the fault unrecorded for the next tech",
    " even though the first requirement stays unmet",
    ", then power on without a final check",
    " while treating the safety step as optional",
    ", assuming the symptom will clear on its own"
  ],
  "TECH 2": [
    ", skipping the backup the procedure requires",
    " while assuming the default settings are enough",
    ", leaving the old configuration half-applied",
    " even though the firmware warning says otherwise",
    ", then document nothing for the next technician",
    " while treating the compatibility check as optional",
    ", assuming the failure will not repeat"
  ]
};

function facetQuestion(subject, category, concept, band, rng, pool, seedKey, registry) {
  const term = concept.term;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  if (band === 0) {
    const stem = NORMAL_STEMS[Math.floor(rng() * NORMAL_STEMS.length)](term);
    return {
      question: stem,
      correct: concept.def,
      distractors: pickUniqueCombo(pool, "def", concept.def, `${seedKey}|b0`, registry.defs),
      explanation: `${cap(term)} — ${concept.def}.`,
      hint: `Recall what ${term} means.`
    };
  }
  if (band === 1) {
    const stem = category === "HISTORY" ? HARD_STEM_HISTORY : HARD_STEM[subject];
    return {
      question: `${concept.cue} ${stem}`,
      correct: term,
      distractors: pickUniqueCombo(pool, "term", term, `${seedKey}|b1`, registry.terms),
      explanation: `The scenario matches ${term}: ${concept.def}.`,
      hint: `Match the situation to the concept it demonstrates.`
    };
  }
  if (band === 2) {
    /* Reverse definition: the statement is the concept's definition; the
       test-taker must know the sibling terms well enough to eliminate each.
       Terms are naturally similar in length, so length never gives the
       answer away, and exactly one term is correct. */
    const stem = Math.floor(rng() * 2) === 0
      ? "Which term does this statement describe?"
      : "Which concept matches this statement?";
    return {
      question: `${concept.def.charAt(0).toUpperCase() + concept.def.slice(1)} — ${stem}`,
      correct: term,
      distractors: pickUniqueCombo(pool, "term", term, `${seedKey}|b2`, registry.terms),
      explanation: `The statement is the definition of ${term}: ${concept.def}.`,
      hint: `Match the statement to the one term it truly defines.`
    };
  }
  const stem = category === "HISTORY" ? IMPOSSIBLE_STEM_HISTORY : IMPOSSIBLE_STEM[subject];
  /* Augment shorter wrong plans with a natural clause so option length
     never signals the correct plan. */
  const tails = shuffled(WRONG_TAILS[subject], rng);
  const target = concept.right.length - 10;
  const wrongs = concept.wrongs.map((w, i) =>
    w.length < target ? w + tails[i % tails.length] : w
  );
  return {
    question: `${concept.setup} ${stem}`,
    correct: concept.right,
    distractors: wrongs,
    explanation: `This response applies ${term} while satisfying the constraints; each other option breaks at least one.`,
    hint: `Eliminate any option that violates a stated constraint.`
  };
}

/* ------------------------------------------------------------------ */
/* MATH generators                                                     */
/* ------------------------------------------------------------------ */

function fmt(n) {
  return String(n);
}

function distinctChoices(correct, candidates, rng) {
  const set = [correct];
  for (const c of shuffled(candidates, rng)) {
    if (set.length >= 4) break;
    if (c !== correct && !set.includes(c) && Number.isFinite(c)) set.push(c);
  }
  let bump = 1;
  while (set.length < 4) {
    const alt = correct + bump * (rng() < 0.5 ? -1 : 1) * Math.max(1, Math.round(Math.abs(correct) * 0.05 + 1));
    if (alt !== correct && !set.includes(alt)) set.push(alt);
    bump += 1;
  }
  return set.map(x => fmt(x));
}

/* Multi-step IMPOSSIBLE-band generators, keyed by MATH category. */
const HARD4_MATH = {
  "MULTIPLICATION": {
    gen(rng) {
      const a = intBetween(3, 9, rng), b = intBetween(12, 28, rng), c = intBetween(3, 8, rng);
      const templates = [
        [`A server hub runs ${a} racks, each rack holds ${b} drives, and each drive is mirrored ${c} times across the cluster. How many drive slots are used in total?`, a * b * c, [a * b, b * c, a * b * c + a]],
        [`A fabric warehouse stacks ${a} shelves per aisle, ${b} rolls per shelf, across ${c} identical aisles. How many rolls are stored in total?`, a * b * c, [a * b, b * c, a * b * c - b]],
        [`A call center schedules ${a} teams, each handling ${b} calls per hour, for ${c} consecutive hours. How many calls is that in total?`, a * b * c, [a * b, b * c, a * b * c + c]]
      ];
      const [q, ans, wrong] = templates[intBetween(0, templates.length - 1, rng)];
      return { question: q, answer: ans, wrong };
    }
  },
  "DIVISION": {
    gen(rng) {
      const k = intBetween(4, 12, rng), boxes = intBetween(6, 14, rng);
      const n = k * boxes * 3;
      const templates = [
        [`A depot holds ${n} cans. They are packed ${k} per box, and every 3 boxes form one pallet. How many pallets are made?`, boxes, [n / k, boxes * 2, boxes - 1]],
        [`A print run produces ${n} posters. They are bundled ${k} per pack, and packs are cartoned in threes. How many cartons are filled?`, boxes, [n / k, boxes + 2, boxes + 1]],
        [`A factory packs ${n} bulbs, ${k} per case, then loads 3 cases per crate. How many crates are loaded?`, boxes, [n / k / 3 + 1, boxes + 3, n / k]]
      ];
      const [q, ans, wrong] = templates[intBetween(0, templates.length - 1, rng)];
      return { question: q, answer: ans, wrong };
    }
  },
  "ADDITION": {
    gen(rng) {
      const a = intBetween(120, 480, rng), more = intBetween(60, 200, rng), less = intBetween(30, 90, rng);
      const b = a + more, c = b - less;
      const total = a + b + c;
      return {
        question: `Tank A holds ${a} liters, tank B holds ${more} liters more than tank A, and tank C holds ${less} liters less than tank B. What is the three tanks' combined capacity in liters?`,
        answer: total,
        wrong: [a + b, a + more, total - a]
      };
    }
  },
  "SUBTRACTION": {
    gen(rng) {
      const total = intBetween(400, 900, rng), first = intBetween(120, 260, rng), diff = intBetween(40, 110, rng);
      const second = first - diff;
      const remain = total - first - second;
      return {
        question: `A roll of cable is ${total} meters long. A first cut takes ${first} meters, and a second cut takes ${diff} meters less than the first cut. How many meters of cable remain?`,
        answer: remain,
        wrong: [total - first, total - first - diff, remain + diff]
      };
    }
  },
  "PROBLEM SOLVING": {
    gen(rng) {
      const per = intBetween(14, 30, rng), batches = intBetween(6, 12, rng), reject = intBetween(25, 90, rng);
      const made = per * batches;
      const good = made - reject;
      const perBox = intBetween(10, 20, rng);
      const boxes = Math.floor(good / perBox);
      return {
        question: `A bakery bakes ${batches} batches of ${per} loaves each, and ${reject} loaves are rejected. The good loaves are boxed ${perBox} per box. How many full boxes are packed?`,
        answer: boxes,
        wrong: [Math.floor(made / perBox), boxes + 1, Math.floor(reject / perBox)]
      };
    }
  }
};

/* Ordinary single/few-step generators for the three repaired NEW slots. */
const PLAIN_MATH = {
  "SUBTRACTION": {
    gen(rng) {
      const a = intBetween(31, 79, rng), b = intBetween(9, a - 12, rng);
      return {
        question: `Take ${b} away from ${a}. What number is left?`,
        answer: a - b,
        wrong: [a + b, a, b]
      };
    }
  },
  "PROBLEM SOLVING": {
    gen(rng) {
      const per = intBetween(3, 9, rng), days = intBetween(3, 9, rng), extra = intBetween(2, 7, rng);
      const ans = per * days + extra;
      return {
        question: `A reviewer checks ${per} essays each day for ${days} days, then checks ${extra} more the next morning. How many essays has the reviewer checked in all?`,
        answer: ans,
        wrong: [per * days, per + days + extra, ans + days]
      };
    }
  }
};

/* ------------------------------------------------------------------ */
/* Build pipeline                                                      */
/* ------------------------------------------------------------------ */

function buildAll(BASE_SEED) {
  /* MATH items are carried over from a frozen baseline snapshot so the
     build is byte-for-byte reproducible; every non-MATH slot is rebuilt
     from the content libraries each run. */
  const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "baseline.json"), "utf8"));
  const previous = baseline.previous;
  const fresh = baseline.new;

  const keptDupSlots = new Set([
    "NEW-MATH-SUBJECT_1-L08-02",
    "NEW-MATH-SUBJECT_1-L09-03",
    "NEW-MATH-SUBJECT_2-L19-05"
  ]);

  /* Collect all kept MATH question texts to avoid collisions. */
  const keptMathTexts = new Set();
  for (const bank of [previous, fresh]) {
    for (const set of SETS) {
      for (const q of bank.MATH[set]) {
        if (keptDupSlots.has(q.id) || (bank === fresh && q.level >= 61)) continue;
        keptMathTexts.add(normalizeText(q.question));
      }
    }
  }

  const out = { previous: cloneBank(previous), new: cloneBank(fresh) };

  /* --- non-MATH subjects: full content rebuild in every slot --------- */
  let slotSeed = BASE_SEED;
  for (const subject of Object.keys(SET_TOTALS)) {
    const maps = buildSetMaps(subject, BASE_SEED + subject.length * 131);
    for (const mode of MODES) {
      const assignments = buildConceptAssignments(subject, mode, maps, (slotSeed += 977) % 1000000);
      const registries = {};
      for (const cat of Object.keys(SET_TOTALS[subject])) {
        registries[cat] = { defs: new Set(), terms: new Set() };
      }
      for (const set of SETS) {
        for (let idx = 0; idx < 80; idx += 1) {
          const slot = assignments[set][idx];
          const level = idx + 1;
          const existing = out[mode][subject][set][idx];
          if (existing.level !== level) {
            throw new Error(`Level misalignment at ${mode}/${subject}/${set}[${idx}]`);
          }
          const rng = makeRng(hashString(`${BASE_SEED}|${mode}|${subject}|${set}|${level}|${slot.concept.term}`));
          const facet = facetQuestion(subject, slot.category, slot.concept, slot.band, rng, LIBS[subject][POOL_KEY[mode]][slot.category], `${BASE_SEED}|${mode}|${subject}|${set}|${level}|${slot.concept.term}`, registries[slot.category]);
          applyFacet(existing, slot, facet, mode);
        }
      }
    }
  }

  /* --- MATH: regenerate NEW band 4 + the three duplicate slots ------- */
  const usedMathSets = new Set();
  for (const set of SETS) {
    for (const q of out.new.MATH[set]) {
      usedMathSets.add(q.choices.map(normalizeText).sort().join("|"));
    }
  }
  for (const set of SETS) {
    for (let idx = 0; idx < 80; idx += 1) {
      const q = out.new.MATH[set][idx];
      const regenerate = q.level >= 61 || keptDupSlots.has(q.id);
      if (!regenerate) continue;
      const category = q.category;
      const genSet = q.level >= 61 ? HARD4_MATH : PLAIN_MATH;
      const gen = genSet[category];
      if (!gen) throw new Error(`No MATH generator for ${category} level ${q.level}`);
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const rng = makeRng(hashString(`${BASE_SEED}|mathnew|${set}|${q.level}|${attempt}`));
        const item = gen.gen(rng);
        const key = normalizeText(item.question);
        if (keptMathTexts.has(key)) continue;
        const choices = distinctChoices(item.answer, item.wrong, rng);
        const setKey = choices.map(normalizeText).sort().join("|");
        if (usedMathSets.has(setKey)) continue;
        keptMathTexts.add(key);
        usedMathSets.add(setKey);
        q.question = item.question;
        q.choices = choices;
        q.answer = fmt(item.answer);
        q.explanation = mathExplanation(q, item);
        q.hint = mathHint(q.category);
        q.tags = [category, q.difficulty.toLowerCase(), "new"];
        if (!q.choices.includes(q.answer)) throw new Error(`MATH answer mismatch at ${q.id}`);
        break;
      }
    }
  }

  /* --- choice-order assignment with per-bank balance optimization ---- */
  const banks = { previous: out.previous, new: out.new };
  const allQuestions = [];
  for (const mode of MODES) {
    for (const subject of SUBJECTS) {
      for (const set of SETS) {
        allQuestions.push(...banks[mode][subject][set]);
      }
    }
  }

  let accepted = false;
  let positionSeed = BASE_SEED;
  for (let attempt = 0; attempt < 120 && !accepted; attempt += 1) {
    positionSeed += 1;
    const rng = makeRng(positionSeed);
    for (const q of allQuestions) {
      const correctText = q.answer;
      const others = q.choices.filter(c => c !== correctText);
      const order = shuffled([correctText, ...others], rng);
      q.choices = order;
    }
    accepted = MODES.every(mode => {
      const qs = collect(banks[mode]);
      const pos = [0, 0, 0, 0];
      let longest = 0, shortest = 0;
      for (const q of qs) {
        pos[q.choices.indexOf(q.answer)] += 1;
        const lens = q.choices.map(c => c.length);
        const maxLen = Math.max(...lens), minLen = Math.min(...lens);
        const isLongest = q.answer.length === maxLen && lens.filter(l => l === maxLen).length === 1;
        const isShortest = q.answer.length === minLen && lens.filter(l => l === minLen).length === 1;
        if (isLongest) longest += 1;
        if (isShortest) shortest += 1;
      }
      const n = qs.length;
      const balanced = pos.every(p => p / n >= 0.18 && p / n <= 0.32);
      const lengthOk = longest / n <= 0.42 && shortest / n <= 0.42;
      if (!balanced || !lengthOk) {
        console.log(`  balance attempt ${attempt}: pos=${pos.map(p => (p / n * 100).toFixed(1) + "%").join("/")} longest=${(longest / n * 100).toFixed(1)}% shortest=${(shortest / n * 100).toFixed(1)}%`);
      }
      return balanced && lengthOk;
    });
  }
  if (!accepted) throw new Error("Could not reach answer-position/length balance");
  console.log(`Choice order accepted at seed ${positionSeed}.`);

  /* --- final validation (throws on any failure) ----------------------- */
  validate(banks);
  return banks;
}

function main() {
  for (let round = 0; round < 8; round += 1) {
    const BASE_SEED = 20260918 + round * 101;
    try {
      const banks = buildAll(BASE_SEED);
      for (const [mode, file] of [["previous", "questions.json"], ["new", "questions.new.json"]]) {
        fs.writeFileSync(path.join(ROOT, file), JSON.stringify(banks[mode]));
      }
      fs.writeFileSync(
        path.join(ROOT, "questions.embedded.js"),
        `window.questionBank = ${JSON.stringify(banks.previous)};\n`
      );
      fs.writeFileSync(
        path.join(ROOT, "questions.new.embedded.js"),
        `window.newQuestionBank = ${JSON.stringify(banks.new)};\n`
      );
      console.log("Wrote questions.json, questions.new.json, questions.embedded.js, questions.new.embedded.js");
      return;
    } catch (error) {
      console.log(`Seed round ${round} failed: ${error.message}`);
    }
  }
  throw new Error("All seed rounds failed");
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function cloneBank(bank) {
  const copy = {};
  for (const [subject, sets] of Object.entries(bank)) {
    copy[subject] = {};
    for (const [set, rows] of Object.entries(sets)) {
      copy[subject][set] = rows.map(q => ({ ...q, choices: [...q.choices], tags: [...(q.tags || [])] }));
    }
  }
  return copy;
}

function collect(bank) {
  const rows = [];
  for (const subject of SUBJECTS) {
    for (const set of SETS) rows.push(...bank[subject][set]);
  }
  return rows;
}

function applyFacet(slot, assignment, facet, mode) {
  const { concept, band, category } = assignment;
  slot.category = category;
  slot.question = facet.question;
  slot.choices = [facet.correct, ...facet.distractors];
  slot.answer = facet.correct;
  slot.explanation = facet.explanation;
  slot.hint = facet.hint;
  slot.tags = [category, BAND_NAMES[band].toLowerCase(), mode];
  if (new Set(slot.choices).size !== 4) {
    throw new Error(`Non-unique choices at ${slot.id}`);
  }
}

function mathExplanation(q, item) {
  const cat = q.category;
  if (cat === "MULTIPLICATION") return `Multiply all the stated factors in order; the total is ${item.answer}.`;
  if (cat === "DIVISION") return `Divide in two stages: first by the per-unit grouping, then by the packing of groups; the result is ${item.answer}.`;
  if (cat === "ADDITION") return `Derive each tank from the first, then add all three capacities: the sum is ${item.answer}.`;
  if (cat === "SUBTRACTION") return `Work out each cut from the stated relationship, subtract both from the roll, and ${item.answer} meters remain.`;
  return `Compute the production total, remove the rejected items, then divide into boxes: ${item.answer} full boxes.`;
}

function mathHint(category) {
  if (category === "MULTIPLICATION") return "Chain the multiplications step by step.";
  if (category === "DIVISION") return "Divide in stages — do not skip the second packing level.";
  if (category === "ADDITION") return "Find each tank's size first, then add the three.";
  if (category === "SUBTRACTION") return "Express the second cut in terms of the first.";
  return "Combine multiplication, subtraction, and division in order.";
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Validation (mirrors the prompt's error-prevention checklist)         */
/* ------------------------------------------------------------------ */

/* "U"-words and "one-" that legitimately take "a", not "an". */
const YOO_WORDS = /^(usb|unit|user|uefi|usable|ups|use|used|useful|usual|utility|union|uniform|universal|uninterruptible|u-tube|u\b|one-)/i;
const BAD_ARTICLE = /\ba ([aeiou][a-z-]+)/gi;
function findBadArticle(text) {
  let m;
  BAD_ARTICLE.lastIndex = 0;
  while ((m = BAD_ARTICLE.exec(text))) {
    if (!YOO_WORDS.test(m[1]) && !/^one/i.test(m[1])) return m[0];
  }
  return null;
}

const BANNED_PATTERNS = [
  [/where someone is/i, "old broken template"],
  [/notices \d+ examples/i, "old broken template"],
  [/^Case \d+:/i, "old case template"],
  [/\bOne person is\b/i, "old broken template"],
  [/\bLorem ipsum\b/i, "placeholder text"],
  [/\bplaceholder\b/i, "placeholder text"],
  [/\bdummy\b/i, "placeholder text"],
  [/\bTODO\b/, "placeholder text"],
  [/Question \d+ style/i, "filler text"]
];

const GENERIC_FILLERS = new Set([
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
]);

function validate(banks) {
  const errors = [];
  const textByMode = { previous: new Set(), new: new Set() };
  const idByMode = { previous: new Set(), new: new Set() };
  const setByMode = { previous: new Set(), new: new Set() };

  for (const mode of MODES) {
    const bank = banks[mode];
    let total = 0;
    const pos = [0, 0, 0, 0];
    for (const subject of SUBJECTS) {
      for (const set of SETS) {
        const rows = bank[subject][set];
        if (!Array.isArray(rows) || rows.length !== 80) {
          errors.push(`${mode}/${subject}/${set}: expected 80 rows`);
          continue;
        }
        const levels = new Set(rows.map(q => q.level));
        for (let l = 1; l <= 80; l += 1) {
          if (!levels.has(l)) errors.push(`${mode}/${subject}/${set}: missing level ${l}`);
        }
        const catCounts = {};
        for (const q of rows) {
          total += 1;
          if (q.subject !== subject || q.quizType !== set || q.quizPath !== set) {
            errors.push(`${q.id}: subject/set mismatch`);
          }
          if (!q.id.startsWith(mode.toUpperCase() + "-")) {
            errors.push(`${q.id}: id not isolated to ${mode}`);
          }
          if (idByMode[mode].has(q.id)) errors.push(`${q.id}: duplicate id in ${mode}`);
          idByMode[mode].add(q.id);
          if (!Array.isArray(q.choices) || q.choices.length !== 4 || new Set(q.choices).size !== 4) {
            errors.push(`${q.id}: choices must be 4 unique options`);
          }
          if (!q.choices.includes(q.answer)) errors.push(`${q.id}: answer not in choices`);
          const expected = BAND_NAMES[bandOf(q.level)];
          if (q.difficulty !== expected) errors.push(`${q.id}: difficulty ${q.difficulty} != ${expected}`);
          const t = normalizeText(q.question);
          if (textByMode[mode].has(t)) errors.push(`${q.id}: duplicate question text in ${mode}`);
          textByMode[mode].add(t);
          const optSet = q.choices.map(normalizeText).sort().join("|");
          if (setByMode[mode].has(optSet)) errors.push(`${q.id}: duplicate answer-option set in ${mode}`);
          setByMode[mode].add(optSet);
          catCounts[q.category] = (catCounts[q.category] || 0) + 1;
          pos[q.choices.indexOf(q.answer)] += 1;
          if (!q.explanation || !q.hint) errors.push(`${q.id}: missing explanation or hint`);
          const scan = [q.question, ...q.choices, q.explanation, q.hint].join("\n");
          for (const [re, label] of BANNED_PATTERNS) {
            if (re.test(scan)) errors.push(`${q.id}: banned pattern (${label})`);
          }
          const badArticle = findBadArticle(scan);
          if (badArticle) errors.push(`${q.id}: bad article "${badArticle}"`);
          for (const c of q.choices) {
            if (GENERIC_FILLERS.has(String(c).toLowerCase())) {
              errors.push(`${q.id}: generic filler distractor`);
            }
          }
        }
        if (SET_TOTALS[subject]) {
          for (const [cat, want] of Object.entries(SET_TOTALS[subject])) {
            if ((catCounts[cat] || 0) !== want) {
              errors.push(`${mode}/${subject}/${set}: ${cat} expected ${want}, found ${catCounts[cat] || 0}`);
            }
          }
        }
        if (subject === "MATH") {
          for (const [cat, want] of Object.entries({ "MULTIPLICATION": 15, "DIVISION": 15, "ADDITION": 15, "SUBTRACTION": 15, "PROBLEM SOLVING": 20 })) {
            if ((catCounts[cat] || 0) !== want) {
              errors.push(`${mode}/MATH/${set}: ${cat} expected ${want}, found ${catCounts[cat] || 0}`);
            }
          }
        }
      }
    }
    if (total !== 800) errors.push(`${mode}: total ${total} != 800`);
    const share = pos.map(p => (p / total) * 100);
    console.log(`${mode}: answer-position split ${pos.join("/")} (${share.map(s => s.toFixed(1) + "%").join(", ")})`);
  }

  /* Cross-mode isolation: no shared normalized question text, no shared ids. */
  for (const t of textByMode.previous) {
    if (textByMode.new.has(t)) errors.push(`Cross-mode duplicate question text: "${t.slice(0, 70)}..."`);
  }
  for (const id of idByMode.previous) {
    if (idByMode.new.has(id)) errors.push(`Cross-mode id collision: ${id}`);
  }

  if (errors.length) {
    const summary = errors.slice(0, 12).map(e => "    - " + e).join("\n");
    throw new Error(`VALIDATION FAILED with ${errors.length} error(s):\n${summary}`);
  }
  console.log("VALIDATION PASSED: 800 + 800 isolated, valid questions.");
}

main();
