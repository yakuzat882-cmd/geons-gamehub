const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "src/story/storyData.js"), "utf8");
const storySource = fs.readFileSync(path.join(root, "src/story/storyQuiz.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const previous = JSON.parse(fs.readFileSync(path.join(root, "questions.json"), "utf8"));
const newer = JSON.parse(fs.readFileSync(path.join(root, "questions.new.json"), "utf8"));

test("Story Quiz has exactly 10 validated stories with unique five-question sets", () => {
  const context = { window: {}, Object, Array, String, Number, Boolean, Set, Math, JSON, Date, console };
  vm.createContext(context);
  vm.runInContext(dataSource, context);
  const stories = context.window.ProudGeonStoryData;
  assert.equal(stories.length, 10);
  const storyIds = new Set();
  const questionIds = new Set();
  const questionTexts = new Set();
  for (const story of stories) {
    assert.ok(story.id && !storyIds.has(story.id));
    storyIds.add(story.id);
    assert.ok(story.story.trim());
    assert.equal(story.questions.length, 5);
    for (const question of story.questions) {
      assert.ok(question.id && !questionIds.has(question.id));
      questionIds.add(question.id);
      assert.ok(question.question.trim() && !questionTexts.has(question.question));
      questionTexts.add(question.question);
      assert.equal(question.choices.length, 4);
      assert.equal(new Set(question.choices).size, 4);
      assert.ok(Number.isInteger(question.correctAnswer));
      assert.ok(question.correctAnswer >= 0 && question.correctAnswer < 4);
    }
  }
  assert.equal(questionIds.size, 50);
});

test("Story Quiz UI, rewards, and navigation contracts are present", () => {
  for (const id of ["storySelectionPanel","storyLibrary","storyReaderPanel","storyReaderText","storyQuestionPanel","storyQuestionAnswers","storyQuestionNext","storyResultsPanel","storyResultScore","storyResultRewards"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /onclick="openStoryQuiz\(\)"/);
  assert.match(html, /onclick="startStoryQuestions\(\)"/);
  assert.match(html, /onclick="retryStory\(\)"/);
});

test("Story Quiz progress and reward storage are isolated and versioned", () => {
  assert.match(storySource, /STORY_PROGRESS_KEY = "proudGeonQuizStoryProgressV1"/);
  assert.match(storySource, /STORY_REWARD_KEY = "proudGeonQuizStoryRewardsV1"/);
  assert.match(storySource, /completionPoints: 75/);
  assert.match(storySource, /completionCoins: 15/);
  assert.match(storySource, /perfectBonusPoints: 50/);
  assert.match(storySource, /perfectBonusCoins: 10/);
  assert.match(storySource, /allStoriesPoints: 200/);
  assert.match(storySource, /allStoriesCoins: 50/);
  assert.doesNotMatch(storySource, /quizState\s*=/);
});

test("Questioner banks contain no forbidden leading task/scenario labels", () => {
  const forbidden = /^(practice|practise) task:|^advance task:|^advanced core scenario:|^core scenario:/i;
  for (const bank of [previous, newer]) {
    for (const subject of Object.values(bank)) {
      for (const questions of Object.values(subject)) {
        for (const question of questions) assert.doesNotMatch(question.question, forbidden);
      }
    }
  }
});

test("Story Quiz assets are part of the offline shell", () => {
  assert.match(serviceWorker, /CACHE_VERSION\s*=\s*"proudgeonquiz-v5-2026-09-07-story10-mission"/);
  assert.match(serviceWorker, /"\.\/src\/story\/storyData\.js"/);
  assert.match(serviceWorker, /"\.\/src\/story\/storyQuiz\.js"/);
});

test("Story Quiz module loads without changing the normal game on initialization", () => {
  const listeners = {};
  const fakeWindow = { ProudGeonStoryData: [], addEventListener(type, fn) { listeners[type] = fn; } };
  const fakeDocument = { addEventListener() {}, getElementById() { return null; }, body: { classList: { contains() { return false; } } } };
  const context = { window: fakeWindow, document: fakeDocument, history: { pushState() {}, back() {} }, localStorage: { getItem() { return null; }, setItem() {} }, console, Object, Array, String, Number, Boolean, Set, Math, JSON, Date };
  vm.createContext(context);
  vm.runInContext(storySource, context);
  assert.equal(typeof context.window.openStoryQuiz, "function");
  assert.equal(typeof context.window.validateStoryQuizData, "function");
  assert.equal(context.window.validateStoryQuizData(), true);
});


test("Story Quiz uses isolated game music and answer sounds without duplicate music controls", () => {
  assert.match(html, /id="gameMusic"[^>]*src="game-music\.mp3"/);
  assert.match(storySource, /function startStoryQuizMusic\(\)/);
  assert.match(storySource, /startStoryQuizMusic\(\);/);
  assert.match(storySource, /stopStoryQuizMusic\(\);/);
  assert.match(storySource, /playAudioElement\(correct \? "correctSound" : "wrongSound"\)/);
  assert.doesNotMatch(html, /id="(?:stopAI|aiReaderStop|pauseAI|aiReaderPause)"/i);
});

test("Story Quiz AI Reader is restricted to story/question text and never answer choices", () => {
  const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
  assert.match(script, /type: "story-reader"/);
  assert.match(script, /type: "story-question"/);
  assert.match(script, /getElementById\("storyReaderText"\)/);
  assert.match(script, /getElementById\("storyQuestionText"\)/);
  assert.doesNotMatch(script, /storyQuestionAnswers.*aiReaderText|aiReaderText\(.*storyQuestionAnswers/);
});


test("Story Quiz reads every question and provides AI feedback labels", () => {
  assert.match(storySource, /currentQuestionIndex \+= 1;\s*renderStoryQuestion\(\);\s*if \(typeof global\.aiReaderRefresh === "function"\) global\.aiReaderRefresh\(true\);/);
  assert.match(storySource, /feedback\.textContent = correct \? "✓ EXCELLENT" : "✕ INCORRECT";/);
  assert.match(storySource, /global\.aiReaderStoryFeedback\(correct \? "Excellent\." : "Incorrect\."\);/);
});
