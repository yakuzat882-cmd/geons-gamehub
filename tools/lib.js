/*
 * Shared deterministic helpers for the Geon GameHub question-bank builder.
 * Every generator here is seeded so rebuilds are reproducible byte-for-byte.
 */
"use strict";

/* mulberry32 — small, fast, well-distributed 32-bit PRNG. */
function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Fisher–Yates using the provided rng (does not mutate the input). */
function shuffled(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

/* Deterministic integer in [min, max] inclusive. */
function intBetween(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

/* Normalize question text for duplicate/isolation checks. */
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/* Normalize option text the same way (used for answer-set dedup). */
function normalizeOptions(choices) {
  return [...choices].map(normalizeText).sort().join("|");
}

function capitalize(text) {
  const trimmed = String(text || "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/* "a analyst" → "an analyst"; "a online" → "an online" … applied to role phrases. */
function withArticle(phrase) {
  const value = String(phrase || "");
  return /^[aeiou]/i.test(value) ? `an ${value}` : `a ${value}`;
}

module.exports = { makeRng, shuffled, pick, intBetween, normalizeText, normalizeOptions, capitalize, withArticle };
