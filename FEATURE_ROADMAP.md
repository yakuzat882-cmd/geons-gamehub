# Geon's GameHub — Fun & Feature Roadmap

A ranked list of upgrades that would make the game more fun, based on what is **already** in the
project (so nothing here duplicates existing work) and on what the prompts protect (profile, three
themes, shop/items/coins/points/titles/leaderboard/audio, mobile-first, framework-free).

How to read each entry:

- **Effort** — S = under a day, M = a few days, L = a week or more of careful work with tests.
- **Plugs into** — the real functions/data already in the repo, so the change stays connected
  instead of becoming a separate system.
- 🔒 — touches a protected system (profile, leaderboard, shop/economy, themes, storage schema).
  These need your explicit go-ahead before I touch them.

---

## 0. What the game already has (baseline, so we build on it)

| Area | Already in the project |
| --- | --- |
| Modes | Normal quiz (5 subjects → set A/B → levels 1–80), Reviewer Mode, Daily Challenge (10 questions, per date + questioner), Story Quiz, Start Your Mission (5 missions) |
| Questioners | PREVIOUS / NEW banks, 800 questions each, isolated progress keys (`proudGeonQuizProgress:new:…`) |
| Core loop | 30 s timer (`startQuizTimer`), 8 lives (`MAX_QUIZ_LIVES`), 4 choices, hint + explanation after answering |
| Scoring | `calculateAnswerReward({level, correct, streak})` with hidden streak multipliers 1.2x→3x, `milestoneReward` (HOT START → LEGENDARY) |
| Economy | Coins, Points, conversion panel, Shop, Inventory (Life Token, Hint, 50/50, Time Boost, Second Chance) |
| Meta | Titles (milestones every 5 levels), 27 profile characters, 8 device-local leaderboard boards, subject stats, streaks |
| Settings | Music, Sound, AI Reader, ORIGINAL/LIGHT/DARK, save/reset |
| Platform | PWA offline cache, installable, AI Reader TTS via the existing Cloudflare worker, 47 tests + 14 browser checks |

**Gaps this roadmap fills:** no mode variety per level, no mistake review, no survival/blitz/tournament
modes, no daily quests or login streak, no cosmetics beyond titles, no per-level stars, no online play,
no accessibility options beyond what ships today, and ~2.5 MB of bank data loads on every start.

---

## 1. Quick wins — highest fun per hour

### 1.1 Visible Combo / FEVER meter — **S**
The 1.2x→3x streak multipliers already exist and are invisible. Add a combo bar in the quiz header,
"FEVER" state at 10+, escalating screen pulse (motion-safe), and reuse `milestoneReward` names as
toasts.
*Why fun:* makes the existing reward system *felt*; players chase the multiplier they currently can't see.
*Plugs into:* `calculateAnswerReward` (src/gameCore.js:265), `registerCorrectStreakAnswer`, `showAnswerFeedback`.

### 1.2 Speed + perfect-level bonus — **S**
Correct under 10 s → +coins; a level finished with no wrong answers and no items → "PERFECT LEVEL" chest.
*Why fun:* rewards skill, not just patience; gives short sessions a goal.
*Plugs into:* `quizState.questionStartedAt` (already set in `prepareQuestion`), `quizState.levelHadWrongAnswer`, `nextQuizStep`.

### 1.3 Level twist modifiers — **M** ⭐ biggest variety win
Each level gets one modifier shown as a badge: `DOUBLE COINS`, `TIME RUSH 15s`, `NO HINT`,
`MYSTERY` (one choice hidden), `SUDDEN DEATH` (one wrong = level over), `SILENT` (explanation only at
the end), `RECALL` (timer hidden).
*Why fun:* an 80-level grind stops feeling identical; every replay of a level can differ.
*Plugs into:* `startQuizAtSelectedLevel`, `startQuizTimer` (timer override), `prepareQuestion`, `useQuizItem` (block hint), `handleQuizAnswer` (sudden death).

### 1.4 Mistake Vault + "Review Mistakes" — **M** ⭐ best learning feature
Every wrong answer is stored per mode; a 10-question drill replays them with Leitner boxes (two correct
in a row retires a question). Add a "Mistake Vault: 12 to clear" card on home.
*Why fun:* turns failure into progress; the reason quiz players come back is feeling themselves improve.
*Plugs into:* existing per-mode progress/used-question keys, `buildSessionQuestions`, `getUsedQuestionIds`, the wrong-answer branch of `handleQuizAnswer`.

### 1.5 Weak-spot training — **S**
`recordSubjectAnswerStat` already tracks right/wrong per subject. Extend to per category, then offer
"Train my weakest category" (accuracy under 70%) as a one-tap quiz built from that category only.
*Plugs into:* `recordSubjectAnswerStat`, `getSubjectQuestionPool`.

### 1.6 "Why the others are wrong" explanations — **S** (generator work)
The bank generator already knows which concept every distractor came from, so each explanation can add
one rivalry line, e.g. *"Foot-in-the-Door is a small first ask — not an extreme first ask."*
*Why fun/knowledge:* doubles the teaching value of every wrong click.
*Plugs into:* `tools/qbank/engine.js` wrong-pool logic → rerun `npm run questioner-build`.

### 1.7 Haptics + sound packs — **S**
`navigator.vibrate` on correct/wrong/milestone (mobile), plus 2–3 optional SFX packs in Settings.
*Plugs into:* `AudioManager` (single owner already), `playSound` call sites, `settingsData`.

### 1.8 Adaptive timer per difficulty band — **S**
Replace the fixed 30 s with band-based time: NORMAL 45 s → HARD 35 s → INSANE 30 s → IMPOSSIBLE 20 s.
*Why fun:* makes IMPOSSIBLE genuinely tense without changing content.
*Plugs into:* `startQuizTimer` (one constant), `difficulty` field already on every question.

### 1.9 Offline/install achievement + "installed" badge — **S**
Reward installing the PWA and finishing a level offline; uses the existing offline status element.
*Plugs into:* `service-worker.js` messages, `proudGeonQuizSpecialAchievementsV1`.

---

## 2. New modes that add replay value

### 2.1 Survival / Gauntlet (endless) — **M** ⭐
One life, endless random questions, difficulty climbs every 5 levels, score = levels survived, own
top-10 board. Perfect run of 20+ gives a chest.
*Plugs into:* `getSubjectQuestionPool` + `buildSessionQuestions` (already shuffle), `MAX_QUIZ_LIVES`, `leaderboardStats`.

### 2.2 Timed Blitz — **M**
60 seconds, answer as many as possible, +2 s per correct, −3 s per wrong; high score board.
*Plugs into:* `startQuizTimer` variant, scoring helpers, leaderboard panel pattern.

### 2.3 Boss levels every 10th level — **M**
Levels 10/20/…/80 become a 3-question chain with one shared 20 s timer and a chest reward with items.
*Why fun:* gives the 1–80 run landmarks and a difficulty spike to remember.
*Plugs into:* `startQuizAtSelectedLevel`, `quizState.index` stepping, `openInventoryPanel` reward flow.

### 2.4 Ghost duels (race your own best) — **M**
Record per-question timing of your best run of a level; replay it as a "ghost" score that updates live
next to yours. No server needed.
*Plugs into:* per-mode storage keys, `quizState.score`, existing timer.

### 2.5 Arena / tournament ladder — **L**
8 rounds against escalating ghosts with an entry fee in coins and a prize pool; bracket screen reusing
the existing panel style.
*Why fun:* the coin sink with the most drama; makes Coins meaningful again.
*Plugs into:* Shop economy helpers, `leaderboardPlayerName`, new panel in the existing modal system.

### 2.6 Story Mode season 2 + Mission packs — **M–L** (content-heavy)
Extend `src/story/storyData.js` with one arc per subject and grow missions from 5 to 25 (5 per subject,
escalating), with star ratings per mission.
*Plugs into:* `src/story/storyQuiz.js`, `src/mission/mission.js` (already isolated and tested).

---

## 3. Retention & meta progression

### 3.1 Daily login streak + heart regeneration — **M** 🔒(economy)
Hearts (lives) refill every N minutes up to 8; 7-day calendar with a day-7 chest.
*Why fun:* gentle "come back later" loop. Keep it kind — no punishing waits, no paywalls.
*Plugs into:* `MAX_QUIZ_LIVES`, storage snapshot, Home "Continue Journey" card.

### 3.2 Daily + weekly quest board — **M** ⭐
Three daily and three weekly objectives, auto-tracked: *answer 30 questions*, *3 perfect levels*,
*clear 5 survival levels*, *spend 150 coins*, *finish a Daily Challenge*. Rewards: coins, items, keys.
*Plugs into:* the same counters already incremented in `handleQuizAnswer` / `nextQuizStep`, shop items as rewards.

### 3.3 Per-level star ratings (1–3 ★) — **M**
Stars from accuracy, time used and items used; shown on the existing level-selection grid and the
subject progress rows.
*Why fun:* completionist pull; turns "level 47 locked" into "level 47 needs 3 stars".
*Plugs into:* `openLevelSelection` grid, `getSubjectHighestCompletedLevel`, per-mode progress storage.

### 3.4 Achievements gallery with progress + rarity — **M**
The 27 profiles and special achievements become a collection grid with locked/unlocked states, progress
bars, unlock dates and rarity tiers (COMMON/RARE/EPIC/LEGENDARY).
*Plugs into:* `proudGeonQuizSpecialAchievementsV1`, `achievementScreen`, existing panel CSS.

### 3.5 Mystery Crate with pity timer — **S–M** 🔒(economy)
200 coins per crate, guaranteed item every 5th pull, duplicates convert to coins.
*Why fun:* the cheapest dopamine loop in the game; a proper coin sink.
*Plugs into:* `src/economy/shop.js`, inventory helpers.

### 3.6 Item crafting/upgrades — **M** 🔒(economy)
Merge 3 Hints → 1 Second Chance; Hint+ reveals part of the explanation; 50/50+ removes three choices.
*Plugs into:* `useQuizItem`, `resetPerQuestionItemState`, inventory sanitisation.

### 3.7 Local season ladder — **L**
30-tier free reward track fed by XP from every mode, resets monthly, grants coins/items/cosmetics.
*Plugs into:* per-mode progress, titles panel patterns. (Keep the existing titles untouched.)

### 3.8 Cosmetics: avatar frames, name colours, answer-button skins — **M–L** 🔒(profile)
Coin/trophy sinks with no gameplay effect.
*Note:* the profile panel is on the protected list, so this only happens with your explicit OK.

---

## 4. Social & online (needs an architecture decision)

The repo already ships a Cloudflare worker (`cloudflare-worker/worker.js`, POST-only, origin-locked to
`https://yakuzat882-cmd.github.io`), so a small backend precedent exists — but the project rules say no
network service without approval. These are listed in the order I'd approve them:

### 4.1 Async friend challenge by link — **M, no backend** ⭐ best social-per-effort
Generate a link containing subject, set, level, questioner and a seed; both players get the identical
shuffle; end screen shows both scores side by side.
*Plugs into:* `shuffleArray`/`buildSessionQuestions` (seed it), `history.pushState`, share sheet.

### 4.2 Share result card — **S–M, no backend**
Canvas image of the run: subject, level, score, accuracy, best streak, questioner, equipped title.
*Plugs into:* end screens (`victoryScreen`, `gameOverScreen`), `leaderboardStats`.

### 4.3 Online weekly leaderboards — **M + infra** 🔒(leaderboard)
Extend the existing worker with KV/D1: submit a signed best score, fetch top 50 per subject/mode, weekly
reset. Keep the honest "device-local" note for offline users.
*Why fun:* real competition is the single biggest retention lever for quiz games.

### 4.4 Cloud save / restore — **M + infra** 🔒(storage)
Optional: push the exported snapshot under a code name, restore on another device. Explicit user action
only, never silent.

### 4.5 Room-code multiplayer (Kahoot-style) — **L + infra**
2–8 players, live scoreboard, Durable Objects/WebSockets, host-controlled pace. The biggest "party"
upgrade the game could get.

### 4.6 Study-group boards — **M–L + infra**
Code-based rooms for a class: weekly accuracy board, no accounts, teacher-friendly.

---

## 5. Content & question formats

### 5.1 New question types — **L** (engine work)
Matching pairs, step ordering, true/false rapid fire, numeric input, "which one is NOT".
*Why fun:* four-choice multiple choice is only one flavour; these break the rhythm. Requires care with
the validator contracts and the 47 existing tests, so it's a planned change, not a quick one.

### 5.2 Bank growth to 1000+ per bank — **M**
The generator scales (`tools/qbank`), so more variants per concept + new subcategories (e.g. TECH:
network commands, PSYCH: cognitive biases) is mostly content writing.

### 5.3 Learn / study cards — **M**
Concept → definition → example cards derived from the bank (the data already exists as `d`/`n`/`p`
fields), read aloud by the existing AI Reader; reachable from level select.

### 5.4 Diagram and image questions — **M–L**
Tap-to-identify hardware parts, lever/piston diagrams, circuit symbols. Uses the existing `icons/`
folder and inline SVG so themes stay intact.

---

## 6. Accessibility, performance, trust

| # | Feature | Effort | Notes |
| --- | --- | --- | --- |
| 6.1 | Timer options (30/45/60/off), text size, reduce motion, colour-blind-safe answer states | S–M | Must keep ORIGINAL/LIGHT/DARK intact |
| 6.2 | Keyboard play (1–4 to answer, Enter for next) + better screen-reader labels | S–M | `#globalLiveRegion` already exists |
| 6.3 | Lazy-load only the active questioner's bank | M | ~2.5 MB currently loads on every start; big win on cheap phones |
| 6.4 | Auto-backup rotation + "restore last backup" | S | `src/state/storage.js` already versions saves |
| 6.5 | Opt-in local error log with "copy report" | S | Privacy-safe substitute for crash reporting |

---

## 7. What I would *not* add

- Pay-to-win, energy paywalls, or anything that punishes a player for stopping.
- Fake online ranks or invented "players" on a device-local board.
- New themes (the project enforces exactly three) or a separate-looking UI.
- Frameworks, build steps, or a network dependency for core play.
- Anything that silently changes the save schema without a migration.

---

## 8. Recommended build order

| Sprint | Contents | Why first |
| --- | --- | --- |
| **1 — Feel (S/M)** | 1.1 Combo meter, 1.2 Speed/perfect bonus, 1.8 Adaptive timer, 1.3 Level modifiers, 1.4 Mistake Vault | Biggest fun change per hour; all reuse existing systems; no protected areas touched |
| **2 — Modes** | 2.1 Survival, 2.2 Blitz, 2.3 Boss levels, 3.3 Star ratings | New reasons to play after level 80 and during a short session |
| **3 — Retention** | 3.2 Quests, 3.4 Achievement gallery, 1.6 Explanation rivals, 1.5 Weak-spot training | Session-to-session pull without touching protected systems |
| **4 — Economy** | 3.5 Crates, 3.6 Crafting, 3.1 Hearts *(needs your OK)* | Coin sinks + returns loop |
| **5 — Social** | 4.1 Challenge links, 4.2 Share cards *(no backend)*; then 4.3/4.4 with your approval | Fun multiplier with the least risk |
| **6 — Depth** | 5.1 Question types, 5.3 Study cards, 6.3 Lazy loading | Bigger engineering bets once the fun layer is proven |

Every sprint keeps: `npm test` green, three themes working, per-mode progress isolated, mobile-first
layouts, and no changes to unrelated systems. Each delivery would follow the same report format you
already saw (files changed / what changed / tests / results / remaining issues / commits).

---

Tell me which bundle to build and I'll start with Sprint 1 — or pick individual items and I'll
implement them in that order.
