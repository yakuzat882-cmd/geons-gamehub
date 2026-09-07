const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const prompt = fs.readFileSync(path.join(root, "GEON_GAMEHUB_MAJOR_UPDATE_PROMPT.md"), "utf8");

test("fresh-start migration has a safe canonical merge fallback", () => {
  assert.match(script, /const root = readStoredJSON\("proudGeonQuizSaveV2", null\)/);
  assert.match(script, /const merged = root \? mergeSaveRecords\(legacy, root\) : legacy/);
  assert.doesNotMatch(script, /return root \|\| migrated;/);
});

test("progress reset is reachable from Settings", () => {
  assert.match(html, /class="reset-progress-button" onclick="resetProgress\(\)"/);
  assert.match(script, /function resetProgress\(\)/);
});

test("the service worker has one activation path and verified readiness", () => {
  assert.equal((worker.match(/addEventListener\("activate"/g) || []).length, 1);
  assert.match(worker, /shellIsCached/);
  assert.match(worker, /cacheVersion: CACHE_VERSION/);
  const shellMatch = worker.match(/const SHELL = \[(.*?)\];/s);
  assert.ok(shellMatch, "service-worker shell list is present");
  for (const asset of [...shellMatch[1].matchAll(/"([^\"]+)"/g)].map(match => match[1])) {
    assert.ok(fs.existsSync(path.join(root, asset.replace(/^\.\//, ""))), `Missing shell asset: ${asset}`);
  }
});

test("the three-theme contract remains explicit", () => {
  assert.match(script, /const allowed = \["original", "light", "dark"\]/);
  for (const theme of ["original", "light", "dark"]) {
    assert.match(html, new RegExp(`id="${theme === "original" ? "originalMode" : `${theme}Mode`}"`));
  }
  assert.doesNotMatch(script, /setTheme\((?:'|")(?:blue|neon|cyber|sunset|paper)/i);
});

test("extended snapshot and legacy synchronization contracts exist", () => {
  assert.match(script, /quizProgressByQuestioner/);
  assert.match(script, /usedQuestionIdsByQuestioner/);
  assert.match(script, /titlesByQuestioner/);
  assert.match(script, /hydrateLegacyKeysFromSnapshot/);
  assert.match(script, /snapshot\.dailyChallenges/);
});

test("major dialogs expose accessible semantics", () => {
  for (const id of ["menuPanel", "settingsPanel", "infoPanel", "quizScreen", "codePanel"]) {
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]{0,260}role="dialog"`));
  }
  assert.match(html, /id="musicToggle"[\s\S]{0,180}aria-pressed/);
  assert.match(html, /id="soundToggle"[\s\S]{0,180}aria-pressed/);
});

test("dynamic display contracts avoid raw reviewer explanation and unsanitized code names", () => {
  assert.doesNotMatch(script, /reviewerExplanation\.innerHTML\s*=/);
  assert.match(script, /function escapeHtml\(/);
  assert.match(script, /escapeHtml\(row\.name\)/);
});

test("the completed prompt has been replaced with a next-version prompt", () => {
  assert.match(prompt, /V5 MAJOR UPDATE PROMPT/);
  assert.match(prompt, /## Step 1/);
  assert.match(prompt, /## Acceptance criteria/i);
  assert.match(prompt, /complete archive/i);
});

// The browser-facing smoke test is intentionally separate because it needs a
// real HTTP origin and a Chromium runtime.
console.log("Regression contract tests loaded.");

ensureNoUnusedPlaceholder();

function ensureNoUnusedPlaceholder() {
  assert.doesNotMatch(html, /onclick="comingSoon\(/);
}
