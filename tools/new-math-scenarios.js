/*
 * NEW-questioner-only MATH scenario families.
 *
 * Why this exists: the NEW bank reused the PREVIOUS bank's sentence templates for MATH
 * (only the numbers changed), which the questioner prompt forbids ("DAPAT BAGONG
 * QUESTIONS, BAGONG SCENARIOS, BAGONG VALUES, BAGONG DISTRACTORS"). These families give
 * the NEW bank its own wording and its own problem structures while keeping:
 *   - the same id / subject / quiz set / level / difficulty / category,
 *   - the same correct-answer position (so answer-position balance is untouched),
 *   - integer answers that are computed, never guessed,
 *   - distractors that each follow a believable wrong step.
 *
 * Difficulty stays a reasoning ladder, not bigger numbers:
 *   NORMAL = 1 step, HARD = 2 steps, INSANE = 3 steps, IMPOSSIBLE = 4 steps + packing.
 *
 * Everything is derived from the question id, so output is deterministic and idempotent.
 */
"use strict";

function hashId(id) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6d2b79f5;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function difficultyBand(level) {
  if (level <= 20) return "NORMAL";
  if (level <= 40) return "HARD";
  if (level <= 60) return "INSANE";
  return "IMPOSSIBLE";
}

/* Deterministic helpers ------------------------------------------------ */

function pick(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function divisorsOf(value, min, max) {
  const found = [];
  for (let d = min; d <= max; d += 1) if (value % d === 0) found.push(d);
  return found;
}

function uniquePositive(candidates, answer, count) {
  const out = [];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (!Number.isFinite(value) || value <= 0 || value === answer) continue;
    if (out.includes(value)) continue;
    out.push(value);
    if (out.length === count) break;
  }
  return out;
}

function partialSums(terms, answer, count) {
  const candidates = [];
  for (let skip = 0; skip < terms.length; skip += 1) {
    candidates.push(terms.reduce((sum, value, index) => (index === skip ? sum : sum + value), 0));
  }
  return uniquePositive(candidates, answer, count);
}

/* Scenario families ---------------------------------------------------- */

const FAMILIES = {
  MULTIPLICATION: {
    NORMAL(random) {
      const perRow = pick(random, 2, 12);
      const rows = pick(random, 2, 12);
      const answer = perRow * rows;
      return {
        question: `A shelf holds ${perRow} boxes in each of ${rows} rows. How many boxes are on the shelf?`,
        answer,
        wrong: [perRow * (rows + 1), perRow * (rows - 1), perRow + rows, answer + perRow],
        explanation: `Each row holds ${perRow} boxes, so ${perRow} × ${rows} = ${answer} boxes.`,
        hint: "Multiply the boxes in one row by the number of rows."
      };
    },
    HARD(random) {
      const perLayer = pick(random, 3, 12);
      const layers = pick(random, 2, 9);
      const crates = pick(random, 2, 9);
      const answer = perLayer * layers * crates;
      return {
        question: `A crate holds ${perLayer} bottles in each of ${layers} layers, and ${crates} identical crates are shipped. How many bottles are shipped in total?`,
        answer,
        wrong: [perLayer * layers, perLayer * layers * (crates + 1), (perLayer + layers) * crates, answer + perLayer],
        explanation: `One crate holds ${perLayer} × ${layers} = ${perLayer * layers} bottles, and ${crates} crates give ${perLayer * layers} × ${crates} = ${answer} bottles.`,
        hint: "Find the bottles in one crate first, then multiply by the number of crates."
      };
    },
    INSANE(random) {
      const trucks = pick(random, 2, 6);
      const pallets = pick(random, 2, 6);
      const cartons = pick(random, 2, 6);
      const units = pick(random, 2, 5);
      const answer = trucks * pallets * cartons * units;
      return {
        question: `Each of ${trucks} trucks carries ${pallets} pallets, every pallet holds ${cartons} cartons, and every carton holds ${units} units. How many units are carried in total?`,
        answer,
        wrong: [trucks * pallets * cartons, trucks * pallets * cartons * (units + 1), (trucks + pallets) * cartons * units, answer + cartons],
        explanation: `One truck carries ${pallets} × ${cartons} × ${units} = ${pallets * cartons * units} units, so ${trucks} trucks carry ${pallets * cartons * units} × ${trucks} = ${answer} units.`,
        hint: "Work outward: cartons per pallet, then pallets per truck, then trucks."
      };
    },
    IMPOSSIBLE(random) {
      const lines = pick(random, 2, 5);
      const stations = pick(random, 2, 5);
      const perHour = pick(random, 2, 6);
      const packSize = pick(random, 2, 6);
      let hours = pick(random, 2, 6);
      for (let attempt = 0; attempt < 12 && (lines * stations * perHour * hours) % packSize !== 0; attempt += 1) {
        hours = pick(random, 2, 12);
      }
      const produced = lines * stations * perHour * hours;
      const answer = Math.floor(produced / packSize);
      return {
        question: `A factory runs ${lines} lines. Each line has ${stations} stations, each station assembles ${perHour} parts per hour, and the shift lasts ${hours} hours. Finished parts are packed ${packSize} to a carton. How many full cartons are produced in one shift?`,
        answer,
        wrong: [produced, lines * stations * perHour, answer + packSize, Math.max(1, Math.floor(produced / (packSize * 2)))],
        explanation: `${lines} × ${stations} × ${perHour} × ${hours} = ${produced} parts, and ${produced} ÷ ${packSize} = ${answer} full cartons.`,
        hint: "Multiply the four production factors, then divide by the carton size."
      };
    }
  },

  DIVISION: {
    NORMAL(random) {
      const albums = pick(random, 2, 9);
      const answer = pick(random, 2, 12);
      const stickers = albums * answer;
      return {
        question: `A teacher shares ${stickers} stickers equally among ${albums} albums. How many stickers does each album receive?`,
        answer,
        wrong: [answer + 1, Math.max(1, answer - 1), albums, Math.max(1, stickers - albums)],
        explanation: `Equal sharing means ${stickers} ÷ ${albums} = ${answer} stickers per album.`,
        hint: "Divide the total stickers by the number of albums."
      };
    },
    HARD(random) {
      const piles = pick(random, 2, 9);
      const shelves = pick(random, 2, 9);
      const answer = pick(random, 2, 9);
      const boxes = piles * shelves * answer;
      return {
        question: `A warehouse stacks ${boxes} boxes into ${piles} equal piles, then splits each pile equally across ${shelves} shelves. How many boxes rest on each shelf?`,
        answer,
        wrong: [answer * shelves, answer * piles, answer + 1, piles * shelves],
        explanation: `${boxes} ÷ ${piles} = ${boxes / piles} boxes per pile, and ${boxes / piles} ÷ ${shelves} = ${answer} boxes per shelf.`,
        hint: "Divide twice: first by piles, then by shelves."
      };
    },
    INSANE(random) {
      const tanks = pick(random, 2, 6);
      const trips = pick(random, 2, 6);
      const answer = pick(random, 2, 9);
      const litres = tanks * trips * answer;
      return {
        question: `${litres} litres of fuel fill ${tanks} identical tanks equally, and each tank's fuel is used for ${trips} equal trips. How many litres does one trip use?`,
        answer,
        wrong: [answer * tanks, answer * trips, litres / tanks, answer + 1],
        explanation: `Each tank holds ${litres} ÷ ${tanks} = ${litres / tanks} litres, and one trip uses ${litres / tanks} ÷ ${trips} = ${answer} litres.`,
        hint: "Split the fuel among the tanks, then split a tank among its trips."
      };
    },
    IMPOSSIBLE(random) {
      const servers = pick(random, 2, 5);
      const disks = pick(random, 2, 5);
      const folders = pick(random, 2, 4);
      const answer = pick(random, 2, 8);
      const files = servers * disks * folders * answer;
      return {
        question: `A data centre stores ${files} files across ${servers} servers. Each server spreads its files equally over ${disks} disks, and each disk keeps them in ${folders} equal folders. How many files are in one folder?`,
        answer,
        wrong: [answer * folders, answer * disks, servers * disks * folders, answer + 1],
        explanation: `${files} ÷ ${servers} ÷ ${disks} ÷ ${folders} = ${answer} files per folder.`,
        hint: "Divide by the servers, then the disks, then the folders."
      };
    }
  },

  ADDITION: {
    NORMAL(random) {
      const terms = [pick(random, 3, 40), pick(random, 3, 40), pick(random, 3, 40)];
      const answer = terms.reduce((a, b) => a + b, 0);
      return {
        question: `A market seller weighs a ${terms[0]} kg sack, a ${terms[1]} kg sack and a ${terms[2]} kg sack. What is the combined weight in kilograms?`,
        answer,
        wrong: partialSums(terms, answer, 3),
        explanation: `${terms[0]} + ${terms[1]} + ${terms[2]} = ${answer} kg in total.`,
        hint: "Add the three sack weights together."
      };
    },
    HARD(random) {
      const terms = [pick(random, 5, 60), pick(random, 5, 60), pick(random, 5, 60), pick(random, 5, 60)];
      const answer = terms.reduce((a, b) => a + b, 0);
      return {
        question: `A truck is loaded with ${terms[0]} kg, then ${terms[1]} kg, then ${terms[2]} kg and finally ${terms[3]} kg. What is the total load in kilograms?`,
        answer,
        wrong: partialSums(terms, answer, 3),
        explanation: `${terms[0]} + ${terms[1]} + ${terms[2]} + ${terms[3]} = ${answer} kg.`,
        hint: "Add all four loads; none of them is repeated."
      };
    },
    INSANE(random) {
      const terms = [pick(random, 6, 90), pick(random, 6, 90), pick(random, 6, 90), pick(random, 6, 90), pick(random, 6, 90)];
      const answer = terms.reduce((a, b) => a + b, 0);
      return {
        question: `Over five training days a cyclist rides ${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]} and ${terms[4]} kilometres. What is the total distance ridden?`,
        answer,
        wrong: partialSums(terms, answer, 3),
        explanation: `${terms[0]} + ${terms[1]} + ${terms[2]} + ${terms[3]} + ${terms[4]} = ${answer} km.`,
        hint: "Sum the five daily distances."
      };
    },
    IMPOSSIBLE(random) {
      const terms = [pick(random, 8, 140), pick(random, 8, 140), pick(random, 8, 140), pick(random, 8, 140), pick(random, 8, 140), pick(random, 8, 140)];
      const answer = terms.reduce((a, b) => a + b, 0);
      return {
        question: `A reservoir records inflows of ${terms[0]}, ${terms[1]}, ${terms[2]}, ${terms[3]}, ${terms[4]} and ${terms[5]} megalitres across six weeks. What is the total inflow?`,
        answer,
        wrong: partialSums(terms, answer, 3),
        explanation: `${terms.join(" + ")} = ${answer} megalitres of total inflow.`,
        hint: "Group the six values into pairs, add each pair, then add the results."
      };
    }
  },

  SUBTRACTION: {
    NORMAL(random) {
      const start = pick(random, 20, 90);
      const drained = pick(random, 3, Math.max(4, start - 3));
      const answer = start - drained;
      return {
        question: `A water tank holds ${start} litres. After ${drained} litres are drained for cleaning, how many litres remain?`,
        answer,
        wrong: [start, drained, start + drained],
        explanation: `${start} − ${drained} = ${answer} litres remain.`,
        hint: "Subtract the drained litres from the starting amount."
      };
    },
    HARD(random) {
      const start = pick(random, 60, 300);
      const first = pick(random, 5, Math.floor(start / 3));
      const second = pick(random, 5, Math.floor(start / 3));
      const answer = start - first - second;
      return {
        question: `A wallet holds ${start} pesos. After spending ${first} pesos and then ${second} pesos, how many pesos are left?`,
        answer,
        wrong: [start - first, start - second, start - first + second],
        explanation: `${start} − ${first} = ${start - first}, then ${start - first} − ${second} = ${answer} pesos.`,
        hint: "Subtract one amount at a time."
      };
    },
    INSANE(random) {
      const start = pick(random, 200, 900);
      const first = pick(random, 10, Math.floor(start / 4));
      const second = pick(random, 10, Math.floor(start / 4));
      const third = pick(random, 10, Math.floor(start / 4));
      const answer = start - first - second - third;
      return {
        question: `A silo stores ${start} sacks of rice. It ships ${first} sacks, then ${second} sacks, then ${third} sacks. How many sacks remain?`,
        answer,
        wrong: [start - first - second, start - first, start - third],
        explanation: `${start} − ${first} − ${second} − ${third} = ${answer} sacks remain.`,
        hint: "Subtract each shipment in order."
      };
    },
    IMPOSSIBLE(random) {
      const start = pick(random, 500, 2000);
      const quarter = Math.floor(start / 5);
      const usage = pick(random, 20, quarter);
      const leakage = pick(random, 20, quarter);
      const cleaning = pick(random, 20, quarter);
      const evaporation = pick(random, 20, quarter);
      const answer = start - usage - leakage - cleaning - evaporation;
      return {
        question: `A reservoir holds ${start} units of water. It loses ${usage} units to usage, ${leakage} to leakage, ${cleaning} to cleaning and ${evaporation} to evaporation. How many units remain?`,
        answer,
        wrong: [start - usage - leakage - cleaning, start - usage - leakage, start - evaporation],
        explanation: `Total loss is ${usage + leakage + cleaning + evaporation} units, so ${start} − ${usage + leakage + cleaning + evaporation} = ${answer} units remain.`,
        hint: "Add the four losses first, then subtract that total once."
      };
    }
  },

  "PROBLEM SOLVING": {
    NORMAL(random) {
      const perDay = pick(random, 2, 9);
      const days = pick(random, 2, 9);
      const overtime = pick(random, 1, 9);
      const answer = perDay * days + overtime;
      return {
        question: `A nurse works ${perDay} hours each day for ${days} days, then adds ${overtime} hours of overtime. How many hours are worked in total?`,
        answer,
        wrong: [perDay * days, perDay * (days + overtime), answer + perDay],
        explanation: `${perDay} × ${days} = ${perDay * days} scheduled hours, plus ${overtime} overtime hours gives ${answer} hours.`,
        hint: "Multiply the daily hours by the days, then add the overtime."
      };
    },
    HARD(random) {
      const perMinute = pick(random, 4, 15);
      const minutes = pick(random, 3, 12);
      const produced = perMinute * minutes;
      const discarded = pick(random, 1, Math.max(2, Math.floor(produced * 0.4)));
      const answer = produced - discarded;
      return {
        question: `A printer produces ${perMinute} copies per minute for ${minutes} minutes, then ${discarded} copies are discarded as misprints. How many usable copies remain?`,
        answer,
        wrong: [produced, produced + discarded, (perMinute - 1) * minutes],
        explanation: `${perMinute} × ${minutes} = ${produced} copies, and ${produced} − ${discarded} = ${answer} usable copies.`,
        hint: "Find the printed total, then remove the misprints."
      };
    },
    INSANE(random) {
      const vans = pick(random, 2, 6);
      const perTrip = pick(random, 3, 9);
      const trips = pick(random, 2, 6);
      const moved = vans * perTrip * trips;
      const returned = pick(random, 1, Math.max(2, Math.floor(moved * 0.4)));
      const answer = moved - returned;
      return {
        question: `A fleet of ${vans} vans each delivers ${perTrip} parcels per trip for ${trips} trips, and ${returned} parcels are returned undelivered. How many parcels are delivered?`,
        answer,
        wrong: [moved, moved + returned, vans * perTrip * (trips - 1)],
        explanation: `${vans} × ${perTrip} × ${trips} = ${moved} parcels moved, minus ${returned} returns gives ${answer} delivered.`,
        hint: "Multiply vans, parcels per trip and trips, then subtract the returns."
      };
    },
    IMPOSSIBLE(random) {
      const lines = pick(random, 2, 4);
      const perHour = pick(random, 3, 9);
      const hours = pick(random, 2, 6);
      const produced = lines * perHour * hours;
      const packSize = pick(random, 2, 6);
      let failed = pick(random, 1, Math.min(40, Math.max(2, produced - packSize)));
      for (let attempt = 0; attempt < 20 && (produced - failed) % packSize !== 0; attempt += 1) {
        failed = pick(random, 1, Math.min(40, Math.max(2, produced - packSize)));
      }
      const answer = (produced - failed) % packSize === 0
        ? (produced - failed) / packSize
        : Math.floor((produced - failed) / packSize);
      return {
        question: `A plant runs ${lines} lines, each producing ${perHour} units per hour for ${hours} hours. After ${failed} units fail inspection, the survivors are packed ${packSize} to a carton. How many full cartons are packed?`,
        answer,
        wrong: [produced - failed, produced, answer + packSize, Math.max(1, Math.floor(produced / packSize))],
        explanation: `${lines} × ${perHour} × ${hours} = ${produced} units; ${produced} − ${failed} = ${produced - failed} pass inspection, and ${produced - failed} ÷ ${packSize} = ${answer} full cartons.`,
        hint: "Multiply the production factors, subtract the failures, then divide by the carton size."
      };
    }
  }
};

/* Assembly ------------------------------------------------------------- */

function buildNewMathQuestion({ id, category, level, answerIndex, isUnique = () => true }) {
  const band = difficultyBand(level);
  const family = FAMILIES[category] && FAMILIES[category][band];
  if (!family) throw new Error(`No NEW MATH family for ${category}/${band} (${id})`);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const random = makeRandom(hashId(id) + attempt * 7919);
    const built = family(random);
    const answer = Number(built.answer);
    if (!Number.isInteger(answer) || answer <= 0) continue;
    const distractors = uniquePositive(built.wrong, answer, 3);
    if (distractors.length !== 3) continue;

    const choices = new Array(4);
    choices[answerIndex] = String(answer);
    let cursor = 0;
    for (let index = 0; index < 4; index += 1) {
      if (index === answerIndex) continue;
      choices[index] = String(distractors[cursor]);
      cursor += 1;
    }
    if (new Set(choices).size !== 4) continue;
    if (!isUnique({ question: built.question, choices })) continue;

    return {
      question: built.question,
      choices,
      answer: String(answer),
      explanation: built.explanation,
      hint: built.hint
    };
  }
  throw new Error(`Could not build a valid NEW MATH question for ${id}`);
}

module.exports = { buildNewMathQuestion, difficultyBand, FAMILIES };
