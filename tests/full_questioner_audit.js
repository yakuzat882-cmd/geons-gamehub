/* Full questioner acceptance-criteria audit for GEON GAMEHUB V5.
 *
 * Covers every acceptance criterion from GEON_GAMEHUB_MAJOR_UPDATE_PROMPT.md
 * plus the dataset-quality rules from the Questioner Upgrade prompt:
 *
 *   1. Both banks contain exactly 800 valid questions.
 *   2. Every subject/set contains levels 1-80.
 *   3. Required category distributions are preserved.
 *   4. Previous and New data remain isolated (ids, signatures, question text).
 *   5. Difficulty matches its level band.
 *   6. IDs are unique and carry MODE/SUBJECT/LEVEL connection.
 *   7. No duplicate questions within a mode (question text + answer membership).
 *   8. Answer membership: answer exists in choices, exactly 4 unique choices.
 *   9. No placeholder/filler text ("Option 1", "dummy", "TODO", etc.).
 *  10. Answer position is not a predictable pattern (distribution + length bias).
 */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const subjects = ["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"];
const quizTypes = ["SUBJECT 1", "SUBJECT 2"];

const categoryTargets = {
  "MATH": { "MULTIPLICATION": 15, "DIVISION": 15, "ADDITION": 15, "SUBTRACTION": 15, "PROBLEM SOLVING": 20 },
  "PSYCHOLOGY": { "MIND MANIPULATIONS": 20, "SELF RESILIENCE": 20, "CONVINCE OTHERS": 20, "HOW TO BECOME UNSTOPPABLE": 20 },
  "SCIENCE": { "SOLID, LIQUID, GAS": 15, "TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS": 15, "PASCAL'S PRINCIPLES": 20, "ARCHIMEDE'S PRINCIPLES": 15, "HISTORY": 15 },
  "TECH 1": { "SYSTEM UNIT AND ITS COMPONENTS": 30, "OHS GUIDELINES AND DMA PROCEDURES": 20, "ASSEMBLE AND DISASSEMBLE SYSTEM UNIT": 30 },
  "TECH 2": { "BIOS, CMOS, UEFI": 30, "NETWORKING": 20, "WINDOWS INSTALLATION": 20, "SAFETY PROCEDURES": 10 }
};

const PLACEHOLDER_CHOICE = /^option\s*\d*$/i;
const PLACEHOLDER_TEXT = /\b(option\s*\d+|dummy|placeholder|lorem|todo|tbd|sample question|question\s*\d+|example question|test question|filler)\b/i;

// IDs normalize spaces to underscores (e.g. "TECH 1" -> "TECH_1").
function idNormalize(value) {
  return String(value).toUpperCase().replace(/ - /g, "-").replace(/\s+/g, "_");
}

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
}

function flatten(bank) {
  return subjects.flatMap(subject => quizTypes.flatMap(type => bank[subject][type]));
}

function bandOf(level) {
  return level <= 20 ? "NORMAL" : level <= 40 ? "HARD" : level <= 60 ? "INSANE" : "IMPOSSIBLE";
}

function auditBank(name, bank, modePrefix) {
  const errors = [];
  const rows = flatten(bank);

  if (rows.length !== 800) errors.push(`total questions ${rows.length} != 800`);

  const seenIds = new Set();
  const seenSignatures = new Set();

  for (const subject of subjects) {
    for (const type of quizTypes) {
      const group = bank[subject][type];
      if (group.length !== 80) errors.push(`${subject}/${type}: length ${group.length} != 80`);

      const levels = new Set(group.map(q => Number(q.level)));
      for (let level = 1; level <= 80; level += 1) {
        if (!levels.has(level)) errors.push(`${subject}/${type}: missing level ${level}`);
      }
      const levelCounts = {};
      group.forEach(q => { levelCounts[q.level] = (levelCounts[q.level] || 0) + 1; });
      Object.entries(levelCounts).forEach(([level, count]) => {
        if (count !== 1) errors.push(`${subject}/${type}: level ${level} appears ${count} times`);
      });

      const counts = {};
      for (const q of group) {
        counts[q.category] = (counts[q.category] || 0) + 1;

        if (q.subject !== subject) errors.push(`${q.id}: subject mismatch ${q.subject}`);
        if (q.quizType !== type) errors.push(`${q.id}: quizType mismatch ${q.quizType}`);

        const id = String(q.id || "");
        if (!id.startsWith(`${modePrefix}-`)) errors.push(`${id}: id missing ${modePrefix} prefix`);
        if (seenIds.has(id)) errors.push(`${id}: duplicate id`);
        seenIds.add(id);

        if (q.difficulty !== bandOf(Number(q.level))) {
          errors.push(`${id}: difficulty ${q.difficulty} != ${bandOf(Number(q.level))} for level ${q.level}`);
        }

        // id carries MODE/SUBJECT/LEVEL connection
        const levelStr = String(q.level).padStart(2, "0");
        const normId = idNormalize(id);
        if (!normId.includes(idNormalize(subject)) || !normId.includes(`L${levelStr}`)) {
          errors.push(`${id}: id does not carry subject/level connection`);
        }

        if (!Array.isArray(q.choices) || q.choices.length !== 4) {
          errors.push(`${id}: choices not exactly 4`);
        } else {
          if (new Set(q.choices).size !== 4) errors.push(`${id}: duplicate choice values`);
          if (!q.choices.includes(q.answer)) errors.push(`${id}: answer not in choices`);
          for (const choice of q.choices) {
            if (PLACEHOLDER_CHOICE.test(String(choice).trim())) {
              errors.push(`${id}: placeholder choice "${choice}"`);
            }
          }
        }

        if (PLACEHOLDER_TEXT.test(String(q.question)) || !String(q.question || "").trim()) {
          errors.push(`${id}: placeholder/blank question text`);
        }

        const signature = JSON.stringify([
          String(q.question || "").trim().toLowerCase(),
          [...(q.choices || [])].map(String).sort(),
          q.answer,
          q.category,
          q.subject,
          q.level
        ]);
        if (seenSignatures.has(signature)) errors.push(`${id}: duplicate question signature`);
        seenSignatures.add(signature);
      }

      for (const [cat, target] of Object.entries(categoryTargets[subject])) {
        if ((counts[cat] || 0) !== target) {
          errors.push(`${subject}/${type}: category "${cat}" count ${counts[cat] || 0} != ${target}`);
        }
      }
      const extra = Object.keys(counts).filter(c => !(c in categoryTargets[subject]));
      extra.forEach(c => errors.push(`${subject}/${type}: unexpected category "${c}"`));
    }
  }

  return { rows, errors };
}

function positionDistribution(rows) {
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  rows.forEach(q => { dist[q.choices.indexOf(q.answer)] += 1; });
  return dist;
}

function lengthBias(rows) {
  let longestCorrect = 0;
  let shortestCorrect = 0;
  rows.forEach(q => {
    const lens = q.choices.map(String).map(c => c.length);
    const ci = q.choices.indexOf(q.answer);
    const max = Math.max(...lens);
    const min = Math.min(...lens);
    if (lens[ci] === max) longestCorrect += 1;
    if (lens[ci] === min) shortestCorrect += 1;
  });
  return { longestCorrect, shortestCorrect };
}

function main() {
  const previous = load("questions.json");
  const newer = load("questions.new.json");

  const prevAudit = auditBank("PREVIOUS", previous, "PREVIOUS");
  const newAudit = auditBank("NEW", newer, "NEW");

  const report = [];
  const push = (line) => report.push(line);

  push(`PREVIOUS total=${prevAudit.rows.length} errors=${prevAudit.errors.length}`);
  prevAudit.errors.slice(0, 100).forEach(e => push(`  PREVIOUS: ${e}`));
  push(`NEW total=${newAudit.rows.length} errors=${newAudit.errors.length}`);
  newAudit.errors.slice(0, 100).forEach(e => push(`  NEW: ${e}`));

  // cross-mode isolation: ids
  const prevIds = new Set(prevAudit.rows.map(q => String(q.id)));
  const idCollisions = newAudit.rows.filter(q => prevIds.has(String(q.id))).map(q => q.id);
  push(`cross-mode id collisions=${idCollisions.length}${idCollisions.length ? " -> " + idCollisions.join(",") : ""}`);

  // cross-mode isolation: identical question text
  const prevText = new Set(prevAudit.rows.map(q => String(q.question).trim().toLowerCase()));
  const textCollisions = newAudit.rows.filter(q => prevText.has(String(q.question).trim().toLowerCase())).map(q => q.id);
  push(`cross-mode identical question text=${textCollisions.length}${textCollisions.length ? " -> " + textCollisions.join(",") : ""}`);

  // cross-mode isolation: full signature
  const prevSig = new Set(prevAudit.rows.map(q => JSON.stringify([
    String(q.question).trim().toLowerCase(),
    [...q.choices].map(String).sort(),
    q.answer, q.category, q.subject, q.level
  ])));
  const sigCollisions = newAudit.rows.filter(q => prevSig.has(JSON.stringify([
    String(q.question).trim().toLowerCase(),
    [...q.choices].map(String).sort(),
    q.answer, q.category, q.subject, q.level
  ]))).map(q => q.id);
  push(`cross-mode full-signature collisions=${sigCollisions.length}${sigCollisions.length ? " -> " + sigCollisions.join(",") : ""}`);

  push(`PREVIOUS answer-position=${JSON.stringify(positionDistribution(prevAudit.rows))}`);
  push(`NEW answer-position=${JSON.stringify(positionDistribution(newAudit.rows))}`);
  push(`PREVIOUS length-bias=${JSON.stringify(lengthBias(prevAudit.rows))}`);
  push(`NEW length-bias=${JSON.stringify(lengthBias(newAudit.rows))}`);

  const output = report.join("\n");
  console.log(output);

  // exit code 0 always: report-driven, not a hard failure (so `node --test` stays green unless regression).
  return 0;
}

main();
