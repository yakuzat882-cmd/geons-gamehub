GEON'S GAMEHUB — ARENA AI INSTRUCTIONS

ROLE

Act as a professional senior game developer, senior frontend developer, UI/UX designer, and senior instructor.

PROJECT

Repository: "yakuzat882-cmd/geons-gamehub"

Project: Geon's GameHub / ProudGeonQuiz

CORE RULES

1. Inspect the existing project before making any changes.
2. Understand the existing architecture, functions, UI, themes, audio, navigation, quiz logic, rewards, and related systems before editing.
3. Do not blindly rewrite the project.
4. Do not remove existing features unless the task explicitly requests removal.
5. Do not break existing HTML structure, JavaScript logic, CSS behavior, quiz systems, audio systems, navigation, rewards, PWA/offline functionality, or accessibility.
6. Reuse existing components, functions, styles, and systems whenever possible.
7. Keep the existing mobile-first design.
8. Keep the existing three themes compatible across all screens:
   - ORIGINAL
   - LIGHT
   - DARK
9. New features must visually and functionally belong to Geon's GameHub.
10. Do not create a separate-looking application inside the project.

WORKFLOW

Always follow this order:

1. INSPECT

Inspect the relevant files and existing implementation first.

2. PLAN

Explain what needs to change and identify the smallest safe implementation.

3. IMPLEMENT

Make only the necessary changes.

4. TEST

Run the appropriate available tests and validation checks.

5. REVIEW

Review the final diff for:

- accidental deletions
- broken functions
- duplicated code
- theme problems
- mobile layout problems
- audio problems
- navigation problems
- accessibility problems
- unrelated changes

6. REPORT

Return a concise report containing:

- Files changed
- What was changed
- Tests performed
- Test results
- Any remaining issue
- Commit hash, if committed

SAFETY RULE

Never modify unrelated files simply because they are available.

If the requested change can be completed by modifying one or two files, prefer that over a large rewrite.

If an existing function already performs the required job, improve or reuse it instead of creating a duplicate system.

If you discover a conflict with the requested task, stop and explain the conflict before making destructive changes.

IMPORTANT

The current task will be written below this section.

Follow the task requirements exactly, while also following all CORE RULES above.

CURRENT TASK

# TASK 001 — FINAL AI READER REPAIR

## OBJECTIVE

Repair and finalize the Geon's GameHub AI Reader so that it works reliably on modern mobile browsers, especially Android.

The existing project already contains an AI Reader implementation and a Cloudflare Worker TTS backend.

DO NOT rebuild the entire AI Reader from scratch unless inspection proves it is necessary.

## FIRST — INSPECT BEFORE EDITING

Inspect the current implementation and identify:

- script.js AI Reader system
- src/story/storyQuiz.js
- index.html AI Reader controls
- service-worker.js
- existing game audio system
- existing correct/wrong sounds
- Mission screen implementation
- Subject 1 quiz
- Subject 2 quiz
- Reviewer Mode
- Daily Challenge
- Story Quiz
- Story Reader
- Story Questions
- Cloudflare Worker integration
- existing settingsData.aiReader behavior

Inspect the current Cloudflare Worker endpoint and existing TTS implementation before changing anything.

Do not rely on previous assumptions. Use the actual current repository code as the source of truth.

## PRIMARY REQUIREMENT

The AI Reader must use the Cloudflare TTS backend as the PRIMARY speech system when native browser speech synthesis is unavailable.

Existing Cloudflare Worker endpoint:

https://geon-ai-reader.yakuzat882.workers.dev

Do not expose or create any secret API key in the GitHub Pages frontend.

## MOBILE AUDIO REQUIREMENT

The implementation must be designed for real Android mobile browsers.

Do NOT assume that setting a JavaScript boolean such as:

aiReaderUserActivated = true

is equivalent to a browser media user-activation permission.

Investigate the complete audio flow:

user interaction
→ TTS request
→ fetch response
→ audio/blob creation
→ audio.play()

Determine whether the browser can reliably play remotely generated audio after the original tap has ended.

If an audio unlock mechanism is required, implement the smallest safe solution.

Prefer a user-triggered audio initialization/unlock action if necessary.

After audio has been successfully unlocked, subsequent AI Reader speech should work automatically where the game currently expects automatic reading.

Do not interfere with existing game music or sound effects.

## AI READER CONTENT RULE

The AI Reader must read ONLY the intended learning content.

### Subject 1 / Subject 2

Read:
- the current question

Do NOT read:
- answer choices
- correct answer
- reward text
- score
- unrelated buttons
- navigation text
- other UI

### Story Quiz

Story Reader:
- read the story/problem text when the user explicitly starts reading

Story Questions:
- read the current question

After answering:
- existing correct/wrong AI feedback may play

Do NOT read:
- answer choices
- unrelated UI
- reward/result text
- navigation buttons

### Mission

Read ONLY:
- mission/problem story
- current question

Do NOT read:
- answer choices
- reward text
- score
- buttons
- unrelated UI

### Reviewer Mode

Read ONLY:
- the current question

Do NOT read:
- answer choices
- answers
- reward/result text
- unrelated UI

### Daily Challenge

Read ONLY:
- the current question

Do NOT read:
- answer choices
- answers
- reward/result text
- unrelated UI

## STORY READER CONTROL

Keep the Story Reader user-controlled.

A visible READ STORY control may be used to explicitly start reading the story.

Do not automatically read the story repeatedly when the same screen is re-rendered.

Prevent duplicate speech requests.

## VOICE / TTS

Use the existing Cloudflare TTS Worker as the remote TTS path.

Preserve the existing worker architecture unless inspection shows a specific problem.

Do not add another external TTS provider unless absolutely necessary.

Handle:

- loading
- playback
- stop
- errors
- cleanup
- stale audio requests
- repeated screen changes
- repeated question changes

Do not allow old audio to continue playing after the user changes screen or question.

## AUDIO CONFLICT RULE

AI Reader audio must never create unwanted overlap with:

- game music
- correct-answer sound
- wrong-answer sound
- other AI Reader audio

Respect the existing game audio architecture.

Do not remove existing game music or sound effects.

## SETTINGS

Keep the existing AI Reader setting.

The setting must correctly enable/disable AI Reader behavior.

When disabled:

- stop current AI Reader audio
- cancel pending TTS requests where possible
- prevent new AI Reader speech

When enabled:

- initialize the required audio system safely
- allow the appropriate screen/question reading behavior

Do not break Settings UI.

## THEMES

Do not break the existing three themes:

- ORIGINAL
- LIGHT
- DARK

Any new UI/control must work correctly in all three themes.

## ACCESSIBILITY

Preserve existing accessibility behavior.

AI Reader controls must have appropriate:

- button labels
- accessible names
- keyboard/touch usability
- visible state

Do not replace accessible text with icons only.

## SAFETY / SCOPE

Make the smallest safe changes necessary.

Do NOT:

- rewrite the whole project
- replace the quiz system
- replace the existing audio system
- remove existing game features
- remove existing correct/wrong sounds
- remove existing game music
- modify unrelated CSS
- modify unrelated quiz logic
- expose API keys
- add unnecessary dependencies

Reuse existing functions whenever possible.

## TESTING

After implementation:

1. Run:
   node --check script.js

2. Run:
   npm test

3. Run:
   npm run static-check

4. Run any other relevant existing validation available in the repository.

5. Inspect the final git diff.

6. Verify that only relevant files changed.

If real Android browser testing is unavailable, clearly state that limitation.

Do not claim mobile audio is fully verified unless it was actually tested in a real browser/device environment.

## FINAL REPORT

Return:

### 1. Root Cause
What actually caused the AI Reader problem?

### 2. Architecture
Explain the final speech/audio architecture.

### 3. Files Changed
List every changed file.

### 4. Behavior
Explain how AI Reader behaves in:

- Subject 1
- Subject 2
- Story Reader
- Story Questions
- Mission
- Reviewer Mode
- Daily Challenge

### 5. Audio Safety
Explain how overlapping AI Reader audio, game music, and answer sounds are prevented.

### 6. Testing
List every test performed and the exact result.

### 7. Mobile Verification
State exactly what was and was not verified on real mobile browsers.

### 8. Diff Review
Confirm that unrelated features were not changed.

### 9. Commit
Only commit after all available tests pass and the final diff has been reviewed.

## IMPORTANT FINAL RULE

Do not make code changes until you have first inspected the current repository and understood the existing implementation.

If the current implementation already satisfies part of this task, preserve it and modify only what is necessary.

## END TASK
