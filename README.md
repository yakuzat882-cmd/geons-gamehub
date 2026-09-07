# Geon's GameHub

A browser-based quiz/game hub designed for mobile and desktop use.

## GitHub Pages

This repository includes a GitHub Actions workflow for deploying the static site to GitHub Pages.

After pushing to the `main` branch:
1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** if it is not already selected.
4. Push a new commit (or run the workflow manually from **Actions**) to deploy.

## Local testing

For a static project, you can open `index.html` directly for basic testing. If service-worker/PWA behavior needs testing, use a local HTTP server instead.

## Project structure

- `index.html` — main app page
- `style.css` — styling
- `script.js` — app logic
- `src/` — supporting modules
- `tests/` — tests
- `manifest.webmanifest` — PWA metadata
- `service-worker.js` — offline/service-worker support

## Security

Do not commit secrets, API keys, access tokens, passwords, or private configuration files.


---

# Geon's GameHub / ProudGeonQuiz v4

## Project purpose

ProudGeonQuiz is a static, mobile-first browser learning game with five subjects, two quiz paths per subject, 80 levels per path, saved progression, rewards, streaks, Shop and Inventory items, titles, achievements, Reviewer Mode, Daily Challenge, profiles, local leaderboards, AI Reader, audio feedback, three selectable themes, and offline support.

## Architecture

The project intentionally remains framework-free so it can be deployed as a static site. `index.html` is the single-page DOM shell, `style.css` is the responsive tokenized stylesheet, and `script.js` is the compatibility controller that preserves the existing inline HTML handlers. Shared pure and runtime boundaries are under `src/`: `gameCore.js` handles sanitization and rewards, `state/storage.js` handles versioned storage and import/export, `data/questionValidator.js` validates question banks, `data/dailyChallenge.js` supports deterministic daily selection, `quiz/scoring.js` and `progression/streaks.js` expose shared helpers, `audio/audioManager.js` owns music and sound playback, and `accessibility/reader.js` exposes live announcements.

The archive keeps both `questions.json` and `questions.new.json`, both embedded fallback banks, all audio, icons, the manifest, the service worker, tests, documentation, and the active V5 upgrade prompt `GEON_GAMEHUB_—_V5_MAJOR_UPDATE_PROMPT.md` (with a legacy-compatible prompt filename retained for existing checks).

## Run locally

Serve the project from an HTTP origin. For example:

```bash
python3 -m http.server 4174
```

Then open `http://127.0.0.1:4174/`. Use HTTP(S), not only `file://`, when testing service workers, installability, or offline behavior.

## Test commands

Run the complete validation set:

```bash
npm test
npm run check
npm run static-check
npm run browser-smoke
```

`npm test` runs the pure core, structural regression, and storage import/export tests. The browser smoke test starts or uses a real HTTP origin, clears storage for a clean-start check, exercises intro-to-home and subject-to-quiz entry, tests major dialog semantics, and checks horizontal overflow at 320×568, 360×800, 375×667, 390×844, 412×915, 768×1024, 1024×768, 1280×800, and 1440×900 under ORIGINAL, LIGHT, and DARK.

## Gameplay contracts

The five subjects are `MATH`, `SCIENCE`, `PSYCHOLOGY`, `TECH 1`, and `TECH 2`. Each has `SUBJECT 1` and `SUBJECT 2`, with levels 1–80. Normal gameplay preserves the real timer, four answer choices, eight Lives, Score, Coins, Points, question randomization, explanations, item bar, answer locking, progression, Game Over, Victory, title milestones, achievements, and save behavior.

The five items are Life Token, Time Boost, Hint, 50/50, and Second Chance. Shop purchases validate the item ID and exact price, update shared inventory and balances, and persist. Item use validates quantity and quiz eligibility before changing the active question state.

A normal-quiz streak counts consecutive finalized correct answers. Wrong answers and timeouts reset it; item use does not. Streak milestone rewards at 3, 5, 10, 15, and 20 are additive and awarded once per streak. Reviewer Mode is non-progression and supports both questioners. Daily Challenge is deterministic by date and questioner, uses ten questions, and keeps completion and reward state separate from normal progression.

Leaderboards are **device-local summaries**. The product does not claim to provide online rankings or server-backed competition.

## Save data and migration

The canonical snapshot is `proudGeonQuizSaveV2` with schema version 2. Legacy keys such as `dreamGameData`, progress keys, used-question keys, settings, inventory, title progress, achievements, profile, code name, subject stats, best streak, and daily challenge state remain compatible. Startup merges partial snapshots with valid legacy state, sanitizes values, hydrates legacy keys from the canonical snapshot, and avoids replacing newer snapshot values with stale legacy values.

Numbers are finite, non-negative, bounded integers. Levels are clamped to 0–80, item quantities are bounded, arrays and unsupported records are rejected where appropriate, and invalid theme or questioner values recover to safe defaults. Export contains only ProudGeonQuiz-related keys. Import accepts schema 2 and ProudGeonQuiz-related keys only, creates a timestamped backup before replacement, removes stale related keys not present in the package, preserves backups and unrelated application keys, and reloads cleanly. Reset Game Progress creates a backup, clears progress/economy/achievement/inventory/daily data, preserves settings/profile/code name and prior backups, and remains separate from Reset Settings.

## Exactly three themes

The product supports exactly these selectable values:

1. ORIGINAL — Classic ProudGeonQuiz
2. LIGHT — Clean learning mode
3. DARK — Focused night mode

Theme state is persisted through settings and applied using `body[data-theme]`. New UI consumes centralized background, surface, text, border, accent, status, focus, shadow, and radius tokens. No fourth theme should be added without an explicit product decision and a complete theme QA update.

## PWA and audio

The versioned service worker caches the complete same-origin shell, including HTML, CSS, JavaScript, both question banks, embedded fallbacks, audio, manifest, icons, and favicon. It reports offline readiness only after all shell entries are present, caches valid JSON only, purges older cache versions, and falls back to cached `index.html` or a safe offline response when the network fails. The current release cache is `proudgeonquiz-v5-2026-08-27`. The offline status is placed after the complete game shell in normal document order so it remains visible without covering controls.

`AudioManager` is the single owner for screen music and sound effects. Music elements remain lazy-loaded, track changes stop previous music, missing files and autoplay rejection are non-fatal, and Settings changes synchronize immediately. AI Reader speech stops whenever its screen is left.

## Development rules

Keep public global functions used by the HTML compatibility layer until an equivalent tested replacement exists. Treat imported JSON, localStorage, question-bank text, and user code names as untrusted data. Prefer `textContent`; escape controlled interpolated values. Keep history and DOM updates bounded. Do not add a framework or network service without an approved architecture change.

The active detailed plan is `GEON_GAMEHUB_—_V5_MAJOR_UPDATE_PROMPT.md`. It contains the step-by-step V5 upgrade workflow, state contract example, test matrix, acceptance criteria, and final ZIP requirements. The final compatibility layer keeps Home sections on one bounded content width, keeps all five subject cards and PLAY buttons inside their parent, and scopes the readability repair to Light Mode while preserving Original and Dark visual identity.
