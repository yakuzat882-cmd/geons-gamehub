# Questioner Upgrade Report

Both prompt files were implemented against the existing Geon's GameHub engine:

- `GEON_GAMEHUB_MAJOR_UPDATE_PROMPT.md` (V5 major update)
- `Pasted_content_prompt.text` (questioner upgrade specification)

No unrelated system was replaced or removed. The profile, three-theme CSS, Shop, Items, Coins,
Points, Titles, Leaderboard, Audio, Story Quiz, AI Reader, Daily Challenge and the save format are
untouched; the questioner work connects to the systems that already existed (question selector,
load-time validator, per-mode progress keys, save/load snapshot).

## Delivery

- Branch: `arena/01a0b277-geons-gamehub`
- Implementation commit: `7295333` — *Rebuild both questioner banks and validate them before quiz start*
- Report commit: the commit that adds this file
- Archive: `GEON-SGAMEHUB-UPDATED.zip` (complete project, ready for TrebEdit or a local server)

## What was wrong before

The shipped data was audited before any change:

| Bank | Template explanations | Awkward / ungrammatical stems | False or unsafe marked answers |
| --- | --- | --- | --- |
| `questions.json` (PREVIOUS) | 640 of 800 | 425 | 15 |
| `questions.new.json` (NEW) | 640 of 800 | 450 | False marked answers found on spot-checks (e.g. `concerned only with genetics` for Pascal's experiments, `particles move only toward the source` for diffusion) |

Documented examples in the previous bank: `smaller area always creates larger force` and
`buoyant force must be zero` were marked correct for Pascal / Archimedes items and `force the module
backward into the slot` was marked correct for RAM installation (15 such answers matched unsafe
patterns in that bank). Hundreds of stems used the same "In a online discussion, a analyst notices
3 examples where someone is …" construction, and explanations repeated `The defining feature is …`
for 80% of every bank.

## What changed

| File | Change |
| --- | --- |
| `questions.json` | Regenerated PREVIOUS bank: 800 questions, unique ids, texts, option sets and answer positions. |
| `questions.new.json` | Regenerated NEW bank with its own frames, scenarios and correct answers — the more advanced dataset. |
| `questions.embedded.js` / `questions.new.embedded.js` | Embedded fallbacks rebuilt from the same data (`window.questionBank` / `window.newQuestionBank`) for file/TrebEdit use. |
| `script.js` | Added `validateQuestionerPool()` / `showQuestionerError()`: the exact pool is checked (80 questions, subject/set match, four distinct choices, answer membership, level range and uniqueness, ids, category, explanation) before a quiz starts, and failures stop the quiz with a safe message without touching saved progress. |
| `tools/qbank/**` | New generator and verifier: spec, RNG, frame engine, per-subject content, math generators, distractor-only entries, verification gates, build entry point. |
| `tools/web_check.js` | New jsdom check that plays both questioners through the real UI (skips itself when jsdom is absent). |
| `tests/question_quality.test.js` | New data-quality tests: level resolution, band difficulty, duplication, answer-position balance, length clues, arithmetic recomputation, filler text, NEW-is-more-advanced, embedded parity, pre-quiz guard. |
| `tests/story_quiz.test.js` | Cache-version expectation kept in step with the new offline cache version. |
| `service-worker.js` | `CACHE_VERSION` → `proudgeonquiz-v7-2026-09-18-questioner-banks-v5` so the new banks replace cached copies offline. |
| `package.json` | Added `questioner-build` and `web-check` scripts. |
| `README.md` | Documented the banks, the build command and the current cache version. |

## Data contract (both banks)

- 5 subjects × 2 quiz sets × 80 levels = 800 questions per bank.
- Difficulty bands: NORMAL 1–20, HARD 21–40, INSANE 41–60, IMPOSSIBLE 61–80.
- Per-set category distribution kept exactly: MATH 15/15/15/15/20, PSYCHOLOGY 20 × 4,
  SCIENCE 15/15/20/15/15, TECH 1 30/20/30, TECH 2 30/20/20/10.
- Each bank: 800 unique ids, 800 unique question texts, 800 unique option sets, 0 duplicates,
  answer positions exactly 200 / 200 / 200 / 200, and no cross-mode sharing.

## Final verification (20 steps)

`npm test` = 47/47, `npm run check` = OK, `npm run static-check` = passed,
`npm run web-check` = 14/14.

| # | Check | Result |
| --- | --- | --- |
| 1 | Test PREVIOUS questioner | Passed — switch applied, plus full playthroughs at L1/21/41/61 and all five subjects in a real DOM. |
| 2 | Test NEW questioner | Passed — same coverage with the new bank. |
| 3 | Test all 5 subjects | Passed — MATH, PSYCHOLOGY, SCIENCE, TECH 1, TECH 2 play through the UI in both modes. |
| 4 | Level 1–20 NORMAL | Passed — label, answer and playthrough verified. |
| 5 | Level 21–40 HARD | Passed. |
| 6 | Level 41–60 INSANE | Passed. |
| 7 | Level 61–80 IMPOSSIBLE | Passed. |
| 8 | Verify question counts | Passed — 800 per bank, 80 per subject/set (`tests/questioner.test.js`, `tests/question_quality.test.js`). |
| 9 | Verify category counts | Passed — per-set distribution compared against the required map. |
| 10 | Verify no duplicates | Passed — ids, question texts and option sets unique inside a bank and across banks. |
| 11 | Random answer position | Passed — 200/200/200/200 per bank; each level uses at least three positions. |
| 12 | Answer not predictable by length | Passed — unique-longest 10.8% (previous) / 7.4% (new), unique-shortest 3.4% / 7.9%, neither clue 73.4% / 72.4%. |
| 13 | Previous and new datasets isolated | Passed — 0 shared ids, texts or option sets; in-game validator reports 0 cross-mode collisions. |
| 14 | Progress isolated | Passed — per-questioner progress keys confirmed in the browser check. |
| 15 | Quiz load/save still works | Passed — progress saved and reloaded for both modes; existing storage tests still green. |
| 16 | No JavaScript console errors | Passed — 0 console errors while loading and playing both modes. |
| 17 | TrebEdit / localhost compatibility | Passed — embedded banks load from a plain file path (800 each), no absolute URLs, service-worker shell intact. |
| 18 | Phone screen compatibility | Partially verified — viewport meta, 41 responsive media queries down to 280px and the shipped playwright viewport matrix are intact; the sandbox cannot download a Chromium build, so run `npm run browser-smoke` on a machine with the browser to complete this step. |
| 19 | Honest reporting | This report; the only gap is step 18 as described. |
| 20 | Complete updated ZIP | `GEON-SGAMEHUB-UPDATED.zip` produced after the checks above. |

## Remaining notes

- `python3 tests/browser_smoke.py` needs Playwright plus `/usr/bin/chromium`; the sandbox has no
  browser binary and the download is blocked, so the jsdom check (`npm run web-check`) is the
  substitute evidence committed with the project.
- Regenerating the banks is deterministic: `npm run questioner-build` reproduces byte-identical
  files and re-runs every structural gate before writing.
