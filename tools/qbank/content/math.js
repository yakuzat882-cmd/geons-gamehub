/*
 * MATH question content.
 *
 * Every answer is computed from the generated values, so a marked-correct option is
 * arithmetically correct by construction. Wrong options are realistic miscalculations
 * (wrong operation, place-value slip, missing step) with a similar magnitude, so the
 * answer cannot be spotted by length.
 */

const { makeRng, shuffle, ensurePeriod } = require("../engine");

function formatNumber(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function numberChoices(correctValue, wrongValues, rng) {
  const correct = formatNumber(correctValue);
  const seen = new Set([String(correctValue)]);
  const wrongs = [];
  for (const value of shuffle(wrongValues, rng)) {
    const rounded = Math.round(value);
    if (!Number.isFinite(rounded) || rounded <= 0) continue;
    if (seen.has(String(rounded))) continue;
    seen.add(String(rounded));
    wrongs.push(formatNumber(rounded));
    if (wrongs.length === 3) break;
  }
  return { correct, wrongs };
}

function arithmeticItem({ frame, tier, question, correctValue, wrongValues, exp, hint, rng }) {
  const { correct, wrongs } = numberChoices(correctValue, wrongValues, rng);
  if (wrongs.length < 3) return null;
  return {
    frame,
    tier,
    text: [question],
    answer: correct,
    wrongPools: [() => wrongs],
    exp,
    hint
  };
}

function intBetween(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/* ---------- category generators ---------- */

function multiplicationCandidates(mode, rng) {
  const items = [];
  const scale = mode === "new" ? 1.35 : 1;

  for (let i = 0; i < 20; i += 1) {
    const a = intBetween(rng, 2, Math.round(9 * scale));
    const b = intBetween(rng, 3, Math.round(12 * scale));
    items.push(arithmeticItem({
      frame: "math-multiply-basic",
      tier: 0,
      question: i % 2 === 0 ? `What is ${formatNumber(a)} × ${formatNumber(b)}?` : `Multiply ${formatNumber(a)} by ${formatNumber(b)}. What is the product?`,
      correctValue: a * b,
      wrongValues: [a * b + a, a * b + b, a * b + 10, a * b - b, a * b + 1, (a + b) * b],
      exp: `${formatNumber(a)} × ${formatNumber(b)} = ${formatNumber(a * b)}. Multiply the two factors directly.`,
      hint: "Multiply the number of groups by the number in each group.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const crates = intBetween(rng, 12, mode === "new" ? 48 : 32);
    const perCrate = intBetween(rng, 12, mode === "new" ? 32 : 24);
    items.push(arithmeticItem({
      frame: "math-multiply-word",
      tier: 1,
      question: i % 2 === 0
        ? `A crate holds ${perCrate} bags of rice. How many bags are in ${crates} crates?`
        : `Each shelf holds ${perCrate} folders and a cabinet has ${crates} shelves. How many folders does the cabinet hold?`,
      correctValue: crates * perCrate,
      wrongValues: [crates * perCrate + perCrate, crates * perCrate - crates, crates + perCrate, crates * perCrate + 10 * crates, crates * (perCrate + 1)],
      exp: `${formatNumber(crates)} × ${formatNumber(perCrate)} = ${formatNumber(crates * perCrate)}. Multiply the number of containers by the content of one container.`,
      hint: "Equal groups here mean multiplication, not addition.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const a = intBetween(rng, mode === "new" ? 112 : 104, mode === "new" ? 749 : 649);
    const b = intBetween(rng, mode === "new" ? 7 : 4, 9);
    items.push(arithmeticItem({
      frame: "math-multiply-two-step",
      tier: 2,
      question: i % 2 === 0
        ? `A printer finishes ${a} pages every hour. How many pages does it finish in ${b} hours?`
        : `A delivery van covers ${a} kilometres each day. How far does it travel in ${b} days?`,
      correctValue: a * b,
      wrongValues: [a * b + a, a * b - b, a * b + b * 10, a * (b + 1), a * b + Math.round(a / 2)],
      exp: `${formatNumber(a)} × ${formatNumber(b)} = ${formatNumber(a * b)}. The rate repeats ${b} times.`,
      hint: "Multiply the per-hour (or per-day) amount by the number of periods.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const groups = intBetween(rng, mode === "new" ? 14 : 9, mode === "new" ? 36 : 24);
    const perGroup = intBetween(rng, mode === "new" ? 25 : 15, mode === "new" ? 64 : 45);
    const cycles = intBetween(rng, 2, mode === "new" ? 6 : 4);
    const total = groups * perGroup * cycles;
    items.push(arithmeticItem({
      frame: "math-multiply-multi-step",
      tier: 3,
      question: `${formatNumber(groups)} machines each fill ${formatNumber(perGroup)} bottles per hour and run for ${formatNumber(cycles)} hours. How many bottles do they fill in total?`,
      correctValue: total,
      wrongValues: [groups * perGroup + cycles, total - perGroup, total + groups, groups * perGroup * (cycles + 1), total - cycles],
      exp: `${formatNumber(groups)} × ${formatNumber(perGroup)} × ${formatNumber(cycles)} = ${formatNumber(total)}. Combine the three factors before reading the total.`,
      hint: "Multiply all three quantities: machines, bottles per hour, and hours.",
      rng
    }));
  }

  return items;
}

function divisionCandidates(mode, rng) {
  const items = [];

  for (let i = 0; i < 20; i += 1) {
    const divisor = intBetween(rng, mode === "new" ? 4 : 2, 12);
    const quotient = intBetween(rng, mode === "new" ? 8 : 3, mode === "new" ? 24 : 12);
    const dividend = divisor * quotient;
    items.push(arithmeticItem({
      frame: "math-divide-basic",
      tier: 0,
      question: i % 2 === 0 ? `What is ${formatNumber(dividend)} ÷ ${formatNumber(divisor)}?` : `Divide ${formatNumber(dividend)} by ${formatNumber(divisor)}. What is the quotient?`,
      correctValue: quotient,
      wrongValues: [quotient + 1, quotient - 1, quotient + divisor, quotient * 2, quotient + 3, quotient - 2],
      exp: `${formatNumber(dividend)} ÷ ${formatNumber(divisor)} = ${formatNumber(quotient)}. Split ${formatNumber(dividend)} into ${formatNumber(divisor)} equal parts.`,
      hint: "Ask which number multiplied by the divisor gives the dividend.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const perFolder = intBetween(rng, mode === "new" ? 12 : 6, mode === "new" ? 34 : 18);
    const folders = intBetween(rng, mode === "new" ? 14 : 8, mode === "new" ? 42 : 26);
    const total = perFolder * folders;
    items.push(arithmeticItem({
      frame: "math-divide-word",
      tier: 1,
      question: `${formatNumber(total)} files are shared equally among ${formatNumber(folders)} folders. How many files go into each folder?`,
      correctValue: perFolder,
      wrongValues: [perFolder + 1, perFolder - 1, perFolder + folders, perFolder * 2, perFolder + 12],
      exp: `${formatNumber(total)} ÷ ${formatNumber(folders)} = ${formatNumber(perFolder)}. Equal sharing means dividing the total by the number of groups.`,
      hint: "Divide the total by the number of groups to find one share.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const divisor = intBetween(rng, mode === "new" ? 13 : 6, mode === "new" ? 42 : 18);
    const quotient = intBetween(rng, mode === "new" ? 21 : 12, mode === "new" ? 68 : 39);
    const dividend = divisor * quotient;
    items.push(arithmeticItem({
      frame: "math-divide-missing-factor",
      tier: 2,
      question: `${formatNumber(dividend)} ÷ ${formatNumber(divisor)} = ? Complete the division sentence.`,
      correctValue: quotient,
      wrongValues: [quotient + 1, quotient - 1, quotient + 10, quotient + divisor, quotient * 2, quotient - 5],
      exp: `${formatNumber(divisor)} × ${formatNumber(quotient)} = ${formatNumber(dividend)}, so the missing value is ${formatNumber(quotient)}.`,
      hint: "Undo the division by multiplying the divisor with each option.",
      rng
    }));
  }

  for (let i = 0; i < 24; i += 1) {
    const perCarton = intBetween(rng, mode === "new" ? 14 : 8, mode === "new" ? 36 : 20);
    const cartons = intBetween(rng, mode === "new" ? 24 : 12, mode === "new" ? 84 : 46);
    const total = perCarton * cartons;
    items.push(arithmeticItem({
      frame: "math-divide-capacity",
      tier: 3,
      question: `A warehouse has ${formatNumber(total)} units to ship. Each carton takes ${perCarton} units. How many cartons are filled completely?`,
      correctValue: cartons,
      wrongValues: [cartons + 1, cartons - 1, cartons + perCarton, cartons * 2, cartons + 6, total - perCarton > 0 ? cartons + 11 : cartons - 4],
      exp: `${formatNumber(total)} ÷ ${perCarton} = ${cartons}. The number of cartons is the total divided by the units per carton.`,
      hint: "Count how many full groups of the same size fit into the total.",
      rng
    }));
  }

  return items;
}

function additionCandidates(mode, rng) {
  const items = [];

  for (let i = 0; i < 20; i += 1) {
    const a = intBetween(rng, 12, mode === "new" ? 280 : 180);
    const b = intBetween(rng, 14, mode === "new" ? 320 : 190);
    const sum = a + b;
    items.push(arithmeticItem({
      frame: "math-addition-basic",
      tier: 0,
      question: i % 2 === 0 ? `What is ${formatNumber(a)} + ${formatNumber(b)}?` : `Find the sum of ${formatNumber(a)} and ${formatNumber(b)}.`,
      correctValue: sum,
      wrongValues: [sum + 10, sum - 10, sum + 1, sum - 1, sum + a, sum - b],
      exp: `${formatNumber(a)} + ${formatNumber(b)} = ${formatNumber(sum)}. Add the two quantities directly.`,
      hint: "Add the ones digits first, then carry to the tens.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const values = [intBetween(rng, 120, 640), intBetween(rng, 110, 720), intBetween(rng, 105, 580)];
    const sum = values.reduce((total, value) => total + value, 0);
    items.push(arithmeticItem({
      frame: "math-addition-three-addends",
      tier: 1,
      question: i % 2 === 0
        ? `A store receives ${formatNumber(values[0])} boxes on Monday, ${formatNumber(values[1])} on Tuesday and ${formatNumber(values[2])} on Wednesday. How many boxes arrive in the three days?`
        : `What is the total of ${formatNumber(values[0])} + ${formatNumber(values[1])} + ${formatNumber(values[2])}?`,
      correctValue: sum,
      wrongValues: [sum + 100, sum - 100, sum + 10, sum - values[2], sum + values[1], sum - 1],
      exp: `${values.map(formatNumber).join(" + ")} = ${formatNumber(sum)}. Add every listed quantity.`,
      hint: "Add all three quantities before comparing with the options.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const values = [
      intBetween(rng, 1024, 4890),
      intBetween(rng, 1105, 5230),
      intBetween(rng, 1012, 3980),
      intBetween(rng, 1008, 4410)
    ];
    const sum = values.reduce((total, value) => total + value, 0);
    items.push(arithmeticItem({
      frame: "math-addition-four-addends",
      tier: 2,
      question: `Find the total: ${values.map(formatNumber).join(" + ")}.`,
      correctValue: sum,
      wrongValues: [sum + 100, sum - 100, sum + 1000, sum - values[3], sum + 10, sum - 10],
      exp: `${values.map(formatNumber).join(" + ")} = ${formatNumber(sum)}. Add the four quantities in any order.`,
      hint: "Group the thousands first, then add the remaining digits.",
      rng
    }));
  }

  for (let i = 0; i < 24; i += 1) {
    const morning = intBetween(rng, 1150, 4820);
    const noon = intBetween(rng, 1080, 3960);
    const shipped = intBetween(rng, 900, 2950);
    const remaining = morning + noon - shipped;
    items.push(arithmeticItem({
      frame: "math-addition-multi-step",
      tier: 3,
      question: `A depot receives ${formatNumber(morning)} cartons in the morning and ${formatNumber(noon)} cartons at noon, then ships out ${formatNumber(shipped)} cartons. How many cartons remain?`,
      correctValue: remaining,
      wrongValues: [morning + noon, morning + noon + shipped, remaining + shipped, remaining - 100, remaining + 100, shipped - remaining > 0 ? shipped - remaining : remaining + 10],
      exp: `${formatNumber(morning)} + ${formatNumber(noon)} = ${formatNumber(morning + noon)}; ${formatNumber(morning + noon)} − ${formatNumber(shipped)} = ${formatNumber(remaining)}.`,
      hint: "Add what arrived first, then subtract what left the depot.",
      rng
    }));
  }

  return items;
}

function subtractionCandidates(mode, rng) {
  const items = [];

  for (let i = 0; i < 20; i += 1) {
    const a = intBetween(rng, 45, mode === "new" ? 480 : 260);
    const b = intBetween(rng, 12, Math.max(14, a - 12));
    items.push(arithmeticItem({
      frame: "math-subtract-basic",
      tier: 0,
      question: i % 2 === 0 ? `What is ${formatNumber(a)} − ${formatNumber(b)}?` : `Subtract ${formatNumber(b)} from ${formatNumber(a)}. What is the difference?`,
      correctValue: a - b,
      wrongValues: [a - b + 10, a - b - 10, a - b + 1, a - b - 1, a + b, b - a > 0 ? b - a : a - b + b],
      exp: `${formatNumber(a)} − ${formatNumber(b)} = ${formatNumber(a - b)}. Take ${formatNumber(b)} away from ${formatNumber(a)}.`,
      hint: "Subtract the smaller number from the larger one.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const produced = intBetween(rng, mode === "new" ? 2400 : 1200, mode === "new" ? 8600 : 4800);
    const sold = intBetween(rng, 800, produced - 120);
    items.push(arithmeticItem({
      frame: "math-subtract-word",
      tier: 1,
      question: `A workshop produced ${formatNumber(produced)} units and delivered ${formatNumber(sold)} units. How many units are still in the workshop?`,
      correctValue: produced - sold,
      wrongValues: [produced + sold, produced - sold + 100, produced - sold - 100, produced - sold + 10, sold - 100],
      exp: `${formatNumber(produced)} − ${formatNumber(sold)} = ${formatNumber(produced - sold)}. Subtract what left from what was produced.`,
      hint: "The units still stored are the produced units minus the delivered units.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const a = intBetween(rng, 3100, 9200) * 5;
    const b = intBetween(rng, 1200, 4200);
    items.push(arithmeticItem({
      frame: "math-subtract-borrow",
      tier: 2,
      question: `Compute ${formatNumber(a)} − ${formatNumber(b)}.`,
      correctValue: a - b,
      wrongValues: [a - b + 100, a - b - 100, a - b + 1000, a - b - 10, a - b + 10],
      exp: `${formatNumber(a)} − ${formatNumber(b)} = ${formatNumber(a - b)}. Borrow across the zero digits.`,
      hint: "Line up the place values before subtracting.",
      rng
    }));
  }

  for (let i = 0; i < 24; i += 1) {
    const first = intBetween(rng, 3200, 8600);
    const second = intBetween(rng, 1200, 4600);
    const transfer = intBetween(rng, 300, 1100);
    const gap = first - second - transfer;
    items.push(arithmeticItem({
      frame: "math-subtract-compare",
      tier: 3,
      question: `Branch A collected ${formatNumber(first)} entries and Branch B collected ${formatNumber(second)}. Branch B then receives ${formatNumber(transfer)} more entries. How many more entries does Branch A have now?`,
      correctValue: gap,
      wrongValues: [first - second, first - second + transfer, gap + transfer, gap - transfer > 0 ? gap - transfer : gap + 100, first + second - transfer],
      exp: `${formatNumber(second)} + ${formatNumber(transfer)} = ${formatNumber(second + transfer)}; ${formatNumber(first)} − ${formatNumber(second + transfer)} = ${formatNumber(gap)}.`,
      hint: "Update Branch B first, then compare the two totals.",
      rng
    }));
  }

  return items;
}

function problemSolvingCandidates(mode, rng) {
  const items = [];

  for (let i = 0; i < 20; i += 1) {
    const price = intBetween(rng, mode === "new" ? 145 : 85, mode === "new" ? 460 : 220);
    const quantity = intBetween(rng, 6, mode === "new" ? 48 : 24);
    items.push(arithmeticItem({
      frame: "math-problem-rate",
      tier: 0,
      question: `A school supplies store sells a notebook for ₱${formatNumber(price)}. How much do ${formatNumber(quantity)} notebooks cost?`,
      correctValue: price * quantity,
      wrongValues: [price * quantity + price, price * quantity - quantity, price + quantity, price * quantity + 100, price * (quantity + 1)],
      exp: `${formatNumber(price)} × ${formatNumber(quantity)} = ${formatNumber(price * quantity)}. Multiply the unit price by the number of items.`,
      hint: "Equal prices for several items mean multiplication.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    const price = intBetween(rng, 120, mode === "new" ? 480 : 260);
    const quantity = intBetween(rng, 8, mode === "new" ? 40 : 22);
    const payment = price * quantity + intBetween(rng, 1, 9) * 100;
    const change = payment - price * quantity;
    items.push(arithmeticItem({
      frame: "math-problem-change",
      tier: 1,
      question: `A customer buys ${formatNumber(quantity)} items at ₱${formatNumber(price)} each and pays with ₱${formatNumber(payment)}. How much change should the customer receive?`,
      correctValue: change,
      wrongValues: [change + 100, change - 100, price * quantity, payment - price, change + price],
      exp: `${formatNumber(price)} × ${formatNumber(quantity)} = ${formatNumber(price * quantity)}; ${formatNumber(payment)} − ${formatNumber(price * quantity)} = ${formatNumber(change)}.`,
      hint: "Find the total cost first, then subtract it from the payment.",
      rng
    }));
  }

  for (let i = 0; i < 20; i += 1) {
    /* Multiples of 20 keep every discount and total a whole peso amount. */
    const original = 20 * intBetween(rng, 20, mode === "new" ? 120 : 60);
    const discount = [10, 15, 20, 25][i % 4];
    const discounted = (original * (100 - discount)) / 100;
    const units = intBetween(rng, 3, mode === "new" ? 12 : 8);
    items.push(arithmeticItem({
      frame: "math-problem-discount",
      tier: 2,
      question: `A tool set costs ₱${formatNumber(original)} before a ${discount}% discount. A buyer orders ${units} sets at the discounted price. What is the total amount paid?`,
      correctValue: discounted * units,
      wrongValues: [original * units, discounted * units + original, (original - discount) * units, discounted * (units + 1), discounted * units - discount],
      exp: `₱${formatNumber(original)} × ${100 - discount}% = ₱${formatNumber(discounted)}; ₱${formatNumber(discounted)} × ${units} = ₱${formatNumber(discounted * units)}.`,
      hint: "Apply the discount to one set first, then multiply by the number of sets.",
      rng
    }));
  }

  for (let i = 0; i < 32; i += 1) {
    const rate = intBetween(rng, mode === "new" ? 12 : 6, mode === "new" ? 42 : 24);
    const minutes = intBetween(rng, 15, 45);
    const inspectors = intBetween(rng, 2, mode === "new" ? 9 : 5);
    const rejectedPerInspector = intBetween(rng, 3, mode === "new" ? 18 : 11);
    const processed = rate * minutes * inspectors;
    const accepted = processed - rejectedPerInspector * inspectors;
    items.push(arithmeticItem({
      frame: "math-problem-multi-constraint",
      tier: 3,
      question: `${formatNumber(inspectors)} inspectors each check ${formatNumber(rate)} items per minute for ${formatNumber(minutes)} minutes. Each inspector then sets aside ${formatNumber(rejectedPerInspector)} items as defective. How many items are accepted in total?`,
      correctValue: accepted,
      wrongValues: [processed, accepted + rejectedPerInspector * inspectors, accepted - rejectedPerInspector, rate * minutes, processed + inspectors, accepted + inspectors],
      exp: `Items checked: ${formatNumber(inspectors)} × ${formatNumber(rate)} × ${formatNumber(minutes)} = ${formatNumber(processed)}. Defective: ${formatNumber(inspectors)} × ${formatNumber(rejectedPerInspector)} = ${formatNumber(rejectedPerInspector * inspectors)}. Accepted: ${formatNumber(processed)} − ${formatNumber(rejectedPerInspector * inspectors)} = ${formatNumber(accepted)}.`,
      hint: "Compute everything that was checked, then remove everything that was rejected.",
      rng
    }));
  }

  return items.filter(Boolean);
}

const GENERATORS = {
  MULTIPLICATION: multiplicationCandidates,
  DIVISION: divisionCandidates,
  ADDITION: additionCandidates,
  SUBTRACTION: subtractionCandidates,
  "PROBLEM SOLVING": problemSolvingCandidates
};

function buildMathCandidates(mode) {
  const output = {};
  Object.entries(GENERATORS).forEach(([category, generator]) => {
    const rng = makeRng(`math-${mode}-${category}`);
    output[category] = generator(mode, rng).filter(Boolean).map(item => ({
      ...item,
      exp: ensurePeriod(item.exp),
      hint: ensurePeriod(item.hint)
    }));
  });
  return output;
}

module.exports = { buildMathCandidates, formatNumber };
