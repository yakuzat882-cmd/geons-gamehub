/* ProudGeonQuiz Story Quiz — isolated mode. Does not mutate normal quizState. */
(function (global) {
  "use strict";

  const STORY_PROGRESS_KEY = "proudGeonQuizStoryProgressV1";
  const STORY_REWARD_KEY = "proudGeonQuizStoryRewardsV1";
  const STORY_REWARD = Object.freeze({ completionPoints: 75, completionCoins: 15, perfectBonusPoints: 50, perfectBonusCoins: 10, allStoriesPoints: 200, allStoriesCoins: 50 });
  const stories = Array.isArray(global.ProudGeonStoryData) ? global.ProudGeonStoryData : [];
  let storyState = createEmptyState();
  let storyHistoryActive = false;

  function createEmptyState() {
    return {
      selectedStoryId: "",
      currentQuestionIndex: 0,
      answers: [],
      score: 0,
      completed: false,
      result: null
    };
  }

  function safeProgress(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out = {};
    Object.entries(value).slice(0, 100).forEach(([id, record]) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return;
      out[String(id).slice(0, 120)] = {
        completed: Boolean(record.completed),
        bestScore: Math.max(0, Math.min(999, Math.floor(Number(record.bestScore) || 0))),
        attempts: Math.max(0, Math.min(1000000, Math.floor(Number(record.attempts) || 0))),
        rewardClaimed: Boolean(record.rewardClaimed)
      };
    });
    return out;
  }

  function loadProgress() {
    try {
      if (global.GeonStorage?.get) return safeProgress(global.GeonStorage.get(STORY_PROGRESS_KEY, {}));
      const raw = localStorage.getItem(STORY_PROGRESS_KEY);
      return safeProgress(raw ? JSON.parse(raw) : {});
    } catch (error) {
      return {};
    }
  }

  function saveProgress(progress) {
    try {
      if (global.GeonStorage?.set) return Boolean(global.GeonStorage.set(STORY_PROGRESS_KEY, safeProgress(progress)));
      localStorage.setItem(STORY_PROGRESS_KEY, JSON.stringify(safeProgress(progress)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadRewardState() {
    try {
      const fallback = { storyRewards: {}, allStoriesRewardClaimed: false };
      const value = global.GeonStorage?.get ? global.GeonStorage.get(STORY_REWARD_KEY, fallback) : JSON.parse(localStorage.getItem(STORY_REWARD_KEY) || JSON.stringify(fallback));
      return value && typeof value === "object" && !Array.isArray(value) ? {
        storyRewards: value.storyRewards && typeof value.storyRewards === "object" && !Array.isArray(value.storyRewards) ? value.storyRewards : {},
        allStoriesRewardClaimed: Boolean(value.allStoriesRewardClaimed)
      } : fallback;
    } catch (error) {
      return { storyRewards: {}, allStoriesRewardClaimed: false };
    }
  }

  function saveRewardState(state) {
    try {
      if (global.GeonStorage?.set) return Boolean(global.GeonStorage.set(STORY_REWARD_KEY, state));
      localStorage.setItem(STORY_REWARD_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function awardStoryRewards(story, correct, total, firstCompletion, progress) {
    if (typeof gameData !== "object" || !gameData) return { points: 0, coins: 0, allStoriesBonus: false };
    const rewardState = loadRewardState();
    let points = 0;
    let coins = 0;
    if (firstCompletion) {
      points += STORY_REWARD.completionPoints;
      coins += STORY_REWARD.completionCoins;
      if (correct === total) {
        points += STORY_REWARD.perfectBonusPoints;
        coins += STORY_REWARD.perfectBonusCoins;
      }
      rewardState.storyRewards[story.id] = { claimed: true, perfect: correct === total };
    }
    const completedCount = stories.filter(item => progress?.[item.id]?.completed || rewardState.storyRewards[item.id]?.claimed || (item.id === story.id && firstCompletion)).length;
    let allStoriesBonus = false;
    if (completedCount >= stories.length && !rewardState.allStoriesRewardClaimed) {
      points += STORY_REWARD.allStoriesPoints;
      coins += STORY_REWARD.allStoriesCoins;
      rewardState.allStoriesRewardClaimed = true;
      allStoriesBonus = true;
    }
    if (firstCompletion) saveRewardState(rewardState);
    gameData.points = Math.max(0, Math.floor(Number(gameData.points) || 0) + points);
    gameData.coins = Math.max(0, Math.floor(Number(gameData.coins) || 0) + coins);
    if (typeof global.updateDisplay === "function") global.updateDisplay();
    if (typeof global.syncVersionedSaveSnapshot === "function") global.syncVersionedSaveSnapshot();
    return { points, coins, allStoriesBonus };
  }

  function getStory(id) {
    return stories.find(story => story.id === id) || null;
  }

  function validateStory(story) {
    if (!story || typeof story !== "object") return false;
    if (!story.id || !story.title || typeof story.story !== "string" || !story.story.trim()) return false;
    if (!Array.isArray(story.questions) || story.questions.length < 1) return false;
    const ids = new Set();
    return story.questions.every(question => {
      if (!question || !question.id || ids.has(String(question.id))) return false;
      ids.add(String(question.id));
      if (typeof question.question !== "string" || !question.question.trim()) return false;
      if (!Array.isArray(question.choices) || question.choices.length !== 4) return false;
      if (new Set(question.choices.map(String)).size !== 4) return false;
      const answer = Number(question.correctAnswer);
      return Number.isInteger(answer) && answer >= 0 && answer < 4;
    });
  }

  function validateAllStories() {
    return stories.every(validateStory);
  }

  function currentStory() {
    return getStory(storyState.selectedStoryId);
  }

  function setPanel(id, show) {
    const panel = document.getElementById(id);
    if (!panel) return;
    panel.classList.toggle("show", show);
    panel.setAttribute("aria-hidden", show ? "false" : "true");
  }

  // Story Quiz owns the shared game-music track while its reader/question screens are active.
  // AudioManager guarantees that only one music instance can play at a time.
  function startStoryQuizMusic() {
    try {
      if (global.settingsData && global.settingsData.music === false) return;
      if (typeof global.startGameMusic === "function") {
        global.startGameMusic();
        return;
      }
      const music = document.getElementById("gameMusic");
      if (!music) return;
      ["mottoMusic", "homeMusic", "victoryMusic"].forEach(id => {
        const other = document.getElementById(id);
        if (other) other.pause();
      });
      music.currentTime = 0;
      music.loop = true;
      music.volume = 0.45;
      music.play().catch(() => {});
    } catch (error) {
      console.warn("Story Quiz music error:", error);
    }
  }

  function stopStoryQuizMusic() {
    try {
      if (typeof global.stopGameMusic === "function") {
        global.stopGameMusic();
        return;
      }
      const music = document.getElementById("gameMusic");
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
    } catch (error) {
      console.warn("Story Quiz music error:", error);
    }
  }

  function hideGamePanelsForStory() {
    ["shopPanel", "inventoryPanel", "menuPanel", "settingsPanel", "infoPanel",
      "leaderboardsPanel", "titlesPanel", "profilePanel", "conversionPanel",
      "reviewerModePanel", "dailyChallengePanel", "dailyChallengeResultPanel",
      "subjectSelection", "levelSelection", "quizScreen",
      "gameOverScreen", "victoryScreen", "achievementScreen"].forEach(id => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.classList.remove("show");
        panel.setAttribute("aria-hidden", "true");
      }
    });
  }

  function openHistoryEntry() {
    if (storyHistoryActive) return;
    try {
      history.pushState({ proudGeonStoryQuiz: true }, "", "#story-quiz");
      storyHistoryActive = true;
    } catch (error) {
      storyHistoryActive = false;
    }
  }

  function closeHistoryEntry() {
    if (!storyHistoryActive) return;
    try {
      if (history.state?.proudGeonStoryQuiz) history.back();
      else storyHistoryActive = false;
    } catch (error) {
      storyHistoryActive = false;
    }
  }

  function openStoryQuiz() {
    if (!validateAllStories()) {
      console.error("Story Quiz data validation failed.");
      return;
    }
    storyState = createEmptyState();
    hideGamePanelsForStory();
    setPanel("storySelectionPanel", true);
    document.body.classList.add("story-quiz-active");
    openHistoryEntry();
    renderStoryLibrary();
    if (typeof global.aiReaderStop === "function") global.aiReaderStop();
    stopStoryQuizMusic();
    if (typeof global.stopHomeMusic === "function") global.stopHomeMusic();
  }

  function closeStoryQuizToHome() {
    storyState = createEmptyState();
    setPanel("storySelectionPanel", false);
    setPanel("storyReaderPanel", false);
    setPanel("storyQuestionPanel", false);
    setPanel("storyResultsPanel", false);
    document.body.classList.remove("story-quiz-active");
    closeHistoryEntry();
    if (typeof global.aiReaderStop === "function") global.aiReaderStop();
    stopStoryQuizMusic();
    if (typeof global.updateHomeSubjectUnlocks === "function") global.updateHomeSubjectUnlocks();
    if (typeof global.startHomeMusic === "function") global.startHomeMusic();
  }

  function openStoryReader(id) {
    const story = getStory(id);
    if (!story) return;
    storyState = {
      ...createEmptyState(),
      selectedStoryId: story.id
    };
    setPanel("storySelectionPanel", false);
    setPanel("storyReaderPanel", true);
    renderStoryReader(story);
    startStoryQuizMusic();
    if (typeof global.aiReaderRefresh === "function") global.aiReaderRefresh(true);
  }

  function backToStoryLibrary() {
    if (typeof global.aiReaderStop === "function") global.aiReaderStop();
    stopStoryQuizMusic();
    setPanel("storyReaderPanel", false);
    setPanel("storyQuestionPanel", false);
    setPanel("storyResultsPanel", false);
    setPanel("storySelectionPanel", true);
    storyState = createEmptyState();
    renderStoryLibrary();
  }

  function startStoryQuestions() {
    const story = currentStory();
    if (!story) return;
    storyState.currentQuestionIndex = 0;
    storyState.answers = [];
    storyState.score = 0;
    storyState.completed = false;
    storyState.result = null;
    setPanel("storyReaderPanel", false);
    setPanel("storyQuestionPanel", true);
    renderStoryQuestion();
    startStoryQuizMusic();
    if (typeof global.aiReaderRefresh === "function") global.aiReaderRefresh(true);
  }

  function answerStoryQuestion(choiceIndex) {
    const story = currentStory();
    const question = story?.questions?.[storyState.currentQuestionIndex];
    if (!question || storyState.answers[storyState.currentQuestionIndex] !== undefined) return;

    const index = Number(choiceIndex);
    if (!Number.isInteger(index) || index < 0 || index > 3) return;

    const correct = index === Number(question.correctAnswer);
    storyState.answers[storyState.currentQuestionIndex] = correct;
    if (correct) storyState.score += 1;
    if (typeof global.playAudioElement === "function") {
      global.playAudioElement(correct ? "correctSound" : "wrongSound");
    }
    if (typeof global.aiReaderStoryFeedback === "function") {
      global.aiReaderStoryFeedback(correct ? "Excellent." : "Incorrect.");
    }

    const buttons = [...document.querySelectorAll("#storyQuestionAnswers button")];
    buttons.forEach(button => {
      button.disabled = true;
      const buttonIndex = Number(button.dataset.storyAnswerIndex);
      if (buttonIndex === Number(question.correctAnswer)) button.classList.add("correct");
      if (buttonIndex === index && !correct) button.classList.add("wrong");
    });

    const feedback = document.getElementById("storyAnswerFeedback");
    if (feedback) {
      feedback.textContent = correct ? "✓ EXCELLENT" : "✕ INCORRECT";
      feedback.dataset.state = correct ? "success" : "error";
      feedback.classList.add("show");
    }

    const next = document.getElementById("storyQuestionNext");
    if (next) {
      next.disabled = false;
      next.textContent = storyState.currentQuestionIndex >= story.questions.length - 1 ? "VIEW RESULT" : "NEXT →";
    }
  }

  function nextStoryQuestion() {
    const story = currentStory();
    if (!story || storyState.answers[storyState.currentQuestionIndex] === undefined) return;
    if (storyState.currentQuestionIndex >= story.questions.length - 1) {
      completeStory();
      return;
    }
    storyState.currentQuestionIndex += 1;
    renderStoryQuestion();
    if (typeof global.aiReaderRefresh === "function") global.aiReaderRefresh(true);
  }

  function completeStory() {
    const story = currentStory();
    if (!story) return;
    const total = story.questions.length;
    const correct = storyState.score;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;
    storyState.completed = true;
    storyState.result = { correct, total, accuracy };

    const progress = loadProgress();
    const previous = progress[story.id] || { completed: false, bestScore: 0, attempts: 0 };
    const firstCompletion = !previous.completed;
    progress[story.id] = {
      completed: true,
      bestScore: Math.max(previous.bestScore, correct),
      attempts: previous.attempts + 1,
      rewardClaimed: Boolean(previous.rewardClaimed || firstCompletion)
    };
    const rewards = awardStoryRewards(story, correct, total, firstCompletion, progress);
    saveProgress(progress);

    if (typeof global.aiReaderStop === "function") global.aiReaderStop();
    stopStoryQuizMusic();
    setPanel("storyQuestionPanel", false);
    setPanel("storyResultsPanel", true);
    renderStoryResults(story, storyState.result, progress[story.id], rewards);
  }

  function retryStory() {
    const story = currentStory();
    if (!story) return;
    storyState.currentQuestionIndex = 0;
    storyState.answers = [];
    storyState.score = 0;
    storyState.completed = false;
    storyState.result = null;
    setPanel("storyResultsPanel", false);
    setPanel("storyQuestionPanel", true);
    renderStoryQuestion();
    startStoryQuizMusic();
    if (typeof global.aiReaderRefresh === "function") global.aiReaderRefresh(true);
  }

  function renderStoryLibrary() {
    const container = document.getElementById("storyLibrary");
    if (!container) return;
    const progress = loadProgress();
    container.replaceChildren();

    stories.forEach(story => {
      const card = document.createElement("article");
      card.className = "story-card";

      const icon = document.createElement("div");
      icon.className = "story-card-icon";
      icon.textContent = story.category === "Mystery" ? "🌲" : "📘";

      const main = document.createElement("div");
      main.className = "story-card-main";

      const title = document.createElement("h3");
      title.textContent = story.title;

      const meta = document.createElement("p");
      meta.textContent = `${story.category} • ${story.difficulty} • ~${story.estimatedReadTime} min`;

      const state = progress[story.id];
      const status = document.createElement("small");
      status.textContent = state?.completed
        ? `COMPLETED • BEST ${state.bestScore}/${story.questions.length}`
        : `${story.questions.length} STORY QUESTIONS`;

      main.append(title, meta, status);

      const action = document.createElement("button");
      action.type = "button";
      action.className = "story-card-action";
      action.textContent = "READ STORY";
      action.setAttribute("aria-label", `Read story: ${story.title}`);
      action.addEventListener("click", () => openStoryReader(story.id));

      card.append(icon, main, action);
      container.appendChild(card);
    });
  }

  function renderStoryReader(story) {
    const title = document.getElementById("storyReaderTitle");
    const meta = document.getElementById("storyReaderMeta");
    const text = document.getElementById("storyReaderText");
    if (title) title.textContent = `📖 ${story.title.toUpperCase()}`;
    if (meta) meta.textContent = `${story.category} • ${story.difficulty} • ~${story.estimatedReadTime} min`;
    if (text) {
      text.replaceChildren();
      story.story.split(/\n\n+/).forEach(paragraph => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        text.appendChild(p);
      });
      text.scrollTop = 0;
    }
  }

  function renderStoryQuestion() {
    const story = currentStory();
    const question = story?.questions?.[storyState.currentQuestionIndex];
    if (!story || !question) return;

    const number = document.getElementById("storyQuestionNumber");
    const total = document.getElementById("storyQuestionTotal");
    const title = document.getElementById("storyQuestionTitle");
    const questionText = document.getElementById("storyQuestionText");
    const answers = document.getElementById("storyQuestionAnswers");
    const feedback = document.getElementById("storyAnswerFeedback");
    const next = document.getElementById("storyQuestionNext");

    if (number) number.textContent = String(storyState.currentQuestionIndex + 1);
    if (total) total.textContent = String(story.questions.length);
    if (title) title.textContent = story.title;
    if (questionText) questionText.textContent = question.question;
    if (answers) {
      answers.replaceChildren();
      question.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "story-answer";
        button.dataset.storyAnswerIndex = String(index);
        button.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
        button.addEventListener("click", () => answerStoryQuestion(index));
        answers.appendChild(button);
      });
    }
    if (feedback) {
      feedback.textContent = "";
      feedback.className = "story-answer-feedback";
      feedback.removeAttribute("data-state");
    }
    if (next) {
      next.disabled = true;
      next.textContent = storyState.currentQuestionIndex >= story.questions.length - 1 ? "VIEW RESULT" : "NEXT →";
    }
  }

  function renderStoryResults(story, result, progress, rewards = { points: 0, coins: 0, allStoriesBonus: false }) {
    const values = {
      storyResultTitle: story.title,
      storyResultScore: `${result.correct} / ${result.total}`,
      storyResultAccuracy: `Accuracy: ${result.accuracy}%`,
      storyResultCorrect: `Correct Answers: ${result.correct}`,
      storyResultWrong: `Wrong Answers: ${result.total - result.correct}`,
      storyResultBest: `Best Score: ${progress.bestScore} / ${result.total}`,
      storyResultRewards: rewards.points || rewards.coins || rewards.allStoriesBonus
        ? `REWARDS: +${rewards.points} POINTS • +${rewards.coins} COINS${rewards.allStoriesBonus ? " • ALL 10 STORIES BONUS!" : ""}`
        : (progress.rewardClaimed ? "REWARDS ALREADY CLAIMED FOR THIS STORY" : "NO NEW REWARD")
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  function backFromReader() {
    backToStoryLibrary();
  }

  function backFromQuestions() {
    backToStoryLibrary();
  }

  function backFromResults() {
    if (typeof global.aiReaderStop === "function") global.aiReaderStop();
    stopStoryQuizMusic();
    setPanel("storyResultsPanel", false);
    setPanel("storySelectionPanel", true);
    storyState = createEmptyState();
    renderStoryLibrary();
  }

  global.openStoryQuiz = openStoryQuiz;
  global.openStoryReader = openStoryReader;
  global.startStoryQuestions = startStoryQuestions;
  global.answerStoryQuestion = answerStoryQuestion;
  global.nextStoryQuestion = nextStoryQuestion;
  global.retryStory = retryStory;
  global.backFromStoryReader = backFromReader;
  global.backFromStoryQuestions = backFromQuestions;
  global.backFromStoryResults = backFromResults;
  global.closeStoryQuizToHome = closeStoryQuizToHome;
  global.validateStoryQuizData = validateAllStories;

  window.addEventListener("popstate", () => {
    if (!document.body.classList.contains("story-quiz-active")) return;
    storyHistoryActive = false;
    closeStoryQuizToHome();
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (!validateAllStories()) console.error("Story Quiz data validation failed.");
  });
})(window);
