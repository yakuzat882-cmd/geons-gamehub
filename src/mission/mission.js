/* Start Your Mission — isolated feature using existing game/audio/storage contracts. */
(function (global) {
  "use strict";

  const missions = Array.isArray(global.ProudGeonMissionData) ? global.ProudGeonMissionData : [];
  const STORAGE_KEY = "proudGeonQuizMissionProgressV1";
  const REWARD_KEY = "proudGeonQuizMissionRewardsV1";
  const MISSION_REWARD = Object.freeze({ points: 100, coins: 20, allPoints: 250, allCoins: 75 });

  let state = {
    missionIndex: 0,
    answered: false,
    score: 0,
    completed: false,
    historyActive: false,
    runRewards: { points: 0, coins: 0, allBonus: false }
  };

  function panel(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("show", Boolean(show));
    el.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function safeObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function loadProgress() {
    try {
      const raw = global.GeonStorage?.get
        ? global.GeonStorage.get(STORAGE_KEY, {})
        : JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const source = safeObject(raw);
      const completed = safeObject(source.completed);
      return {
        completed: Object.fromEntries(Object.entries(completed).map(([id, value]) => [String(id).slice(0, 80), Boolean(value)])),
        totalCompleted: Math.max(0, Math.min(5, Math.floor(Number(source.totalCompleted) || 0)))
      };
    } catch (error) {
      return { completed: {}, totalCompleted: 0 };
    }
  }

  function saveProgress(progress) {
    try {
      if (global.GeonStorage?.set) return Boolean(global.GeonStorage.set(STORAGE_KEY, progress));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadRewards() {
    try {
      const raw = global.GeonStorage?.get
        ? global.GeonStorage.get(REWARD_KEY, {})
        : JSON.parse(localStorage.getItem(REWARD_KEY) || "{}");
      const source = safeObject(raw);
      const claimed = safeObject(source.claimed);
      return {
        claimed: Object.fromEntries(Object.entries(claimed).map(([id, value]) => [String(id).slice(0, 80), Boolean(value)])),
        allClaimed: Boolean(source.allClaimed)
      };
    } catch (error) {
      return { claimed: {}, allClaimed: false };
    }
  }

  function saveRewards(rewards) {
    try {
      if (global.GeonStorage?.set) return Boolean(global.GeonStorage.set(REWARD_KEY, rewards));
      localStorage.setItem(REWARD_KEY, JSON.stringify(rewards));
      return true;
    } catch (error) {
      return false;
    }
  }

  function stopMissionAudio() {
    try { global.aiReaderStop?.(); } catch (error) {}
    try { global.stopGameMusic?.(); } catch (error) {}
  }

  function startMissionMusic() {
    try {
      if (global.settingsData?.music === false) return;
      if (typeof global.startGameMusic === "function") {
        global.startGameMusic();
        return;
      }
      const audio = document.getElementById("gameMusic");
      if (audio) audio.play().catch(() => {});
    } catch (error) {
      console.warn("Start Your Mission music error:", error);
    }
  }

  function hideOtherScreens() {
    [
      "shopPanel", "inventoryPanel", "menuPanel", "settingsPanel", "infoPanel",
      "leaderboardsPanel", "titlesPanel", "profilePanel", "conversionPanel",
      "reviewerModePanel", "dailyChallengePanel", "dailyChallengeResultPanel",
      "subjectSelection", "levelSelection", "quizScreen", "gameOverScreen",
      "victoryScreen", "achievementScreen", "storySelectionPanel", "storyReaderPanel",
      "storyQuestionPanel", "storyResultsPanel"
    ].forEach(id => panel(id, false));
  }

  function openHistoryEntry() {
    if (state.historyActive) return;
    try {
      history.pushState({ proudGeonMission: true }, "", "#your-mission");
      state.historyActive = true;
    } catch (error) {
      state.historyActive = false;
    }
  }

  function closeHistoryEntry() {
    if (!state.historyActive) return;
    try {
      if (history.state?.proudGeonMission) history.back();
      else state.historyActive = false;
    } catch (error) {
      state.historyActive = false;
    }
  }

  function openStartYourMission() {
    if (missions.length !== 5 || typeof global.validateMissionData === "function" && !global.validateMissionData()) {
      console.error("Start Your Mission data validation failed.");
      return;
    }
    state = { missionIndex: 0, answered: false, score: 0, completed: false, historyActive: false, runRewards: { points: 0, coins: 0, allBonus: false } };
    hideOtherScreens();
    document.body.classList.add("mission-active");
    panel("missionPanel", true);
    panel("missionResultPanel", false);
    openHistoryEntry();
    renderMission();
    startMissionMusic();
    global.aiReaderRefresh?.(true);
  }

  function currentMission() {
    return missions[state.missionIndex] || null;
  }

  function answerMission(choiceIndex) {
    const mission = currentMission();
    if (!mission || state.answered || state.completed) return;
    const index = Number(choiceIndex);
    if (!Number.isInteger(index) || index < 0 || index > 3) return;

    state.answered = true;
    const correct = index === Number(mission.correctAnswer);
    if (correct) state.score += 1;

    if (typeof global.playAudioElement === "function") {
      global.playAudioElement(correct ? "correctSound" : "wrongSound");
    }

    const buttons = [...document.querySelectorAll("#missionAnswers button")];
    buttons.forEach(button => {
      button.disabled = true;
      const buttonIndex = Number(button.dataset.missionAnswerIndex);
      if (buttonIndex === Number(mission.correctAnswer)) button.classList.add("correct");
      if (buttonIndex === index && !correct) button.classList.add("wrong");
    });

    const feedback = document.getElementById("missionAnswerFeedback");
    if (feedback) {
      feedback.textContent = correct ? "✓ MISSION OBJECTIVE CLEARED" : "✕ OBJECTIVE FAILED — REVIEW THE CORRECT CHOICE";
      feedback.dataset.state = correct ? "success" : "error";
      feedback.classList.add("show");
    }

    const explanation = document.getElementById("missionExplanation");
    if (explanation) {
      explanation.textContent = mission.explanation || "";
      explanation.classList.add("show");
    }

    const next = document.getElementById("missionNext");
    if (next) {
      next.disabled = false;
      next.textContent = state.missionIndex >= missions.length - 1 ? "COMPLETE MISSION" : "NEXT MISSION →";
    }

    try { global.aiReaderStop?.(); } catch (error) {}
  }

  function nextMission() {
    if (!state.answered || state.completed) return;
    const mission = currentMission();
    if (mission) {
      const reward = grantMissionReward(mission.id);
      state.runRewards.points += reward.points;
      state.runRewards.coins += reward.coins;
      state.runRewards.allBonus = state.runRewards.allBonus || reward.allBonus;
    }
    if (state.missionIndex >= missions.length - 1) {
      completeMissionRun();
      return;
    }
    state.missionIndex += 1;
    state.answered = false;
    renderMission();
    startMissionMusic();
    global.aiReaderRefresh?.(true);
  }

  function grantMissionReward(missionId) {
    const progress = loadProgress();
    const rewards = loadRewards();
    if (rewards.claimed[missionId]) return { points: 0, coins: 0, allBonus: false };

    rewards.claimed[missionId] = true;
    let points = MISSION_REWARD.points;
    let coins = MISSION_REWARD.coins;

    const completedCount = Object.values(rewards.claimed).filter(Boolean).length;
    let allBonus = false;
    if (completedCount >= missions.length && !rewards.allClaimed) {
      rewards.allClaimed = true;
      points += MISSION_REWARD.allPoints;
      coins += MISSION_REWARD.allCoins;
      allBonus = true;
    }

    saveRewards(rewards);
    progress.completed[missionId] = true;
    progress.totalCompleted = Math.min(5, Object.values(progress.completed).filter(Boolean).length);
    saveProgress(progress);

    if (global.gameData && typeof global.gameData === "object") {
      global.gameData.points = Math.max(0, Math.floor(Number(global.gameData.points) || 0) + points);
      global.gameData.coins = Math.max(0, Math.floor(Number(global.gameData.coins) || 0) + coins);
      if (typeof global.saveGlobalGameData === "function") global.saveGlobalGameData();
      if (typeof global.updateDisplay === "function") global.updateDisplay();
      if (typeof global.syncVersionedSaveSnapshot === "function") global.syncVersionedSaveSnapshot();
    }

    return { points, coins, allBonus };
  }

  function completeMissionRun() {
    if (state.completed) return;
    state.completed = true;
    stopMissionAudio();

    const total = missions.length;
    const result = { correct: state.score, total, accuracy: Math.round((state.score / total) * 100), rewards: state.runRewards };

    panel("missionPanel", false);
    panel("missionResultPanel", true);
    renderResult(result);
  }

  function renderMission() {
    const mission = currentMission();
    if (!mission) return;

    const subject = document.getElementById("missionSubject");
    const title = document.getElementById("missionTitle");
    const story = document.getElementById("missionStoryText");
    const objective = document.getElementById("missionObjective");
    const question = document.getElementById("missionQuestionText");
    const answers = document.getElementById("missionAnswers");
    const feedback = document.getElementById("missionAnswerFeedback");
    const explanation = document.getElementById("missionExplanation");
    const number = document.getElementById("missionNumber");
    const progress = document.getElementById("missionProgress");

    if (subject) subject.textContent = mission.subject;
    const difficulty = document.getElementById("missionDifficulty");
    if (difficulty) difficulty.textContent = mission.difficulty || "CORE";
    if (title) title.textContent = mission.title;
    if (story) story.textContent = mission.story;
    if (objective) objective.textContent = mission.objective;
    if (question) question.textContent = mission.question;
    if (number) number.textContent = String(state.missionIndex + 1);
    if (progress) progress.textContent = `${state.missionIndex + 1} / ${missions.length}`;

    if (answers) {
      answers.replaceChildren();
      mission.choices.forEach((choice, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "mission-answer";
        button.dataset.missionAnswerIndex = String(index);
        button.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
        button.addEventListener("click", () => answerMission(index));
        answers.appendChild(button);
      });
    }

    if (feedback) {
      feedback.textContent = "";
      feedback.className = "mission-answer-feedback";
      feedback.removeAttribute("data-state");
    }
    if (explanation) {
      explanation.textContent = "";
      explanation.className = "mission-explanation";
    }
    const next = document.getElementById("missionNext");
    if (next) {
      next.disabled = true;
      next.textContent = state.missionIndex >= missions.length - 1 ? "COMPLETE MISSION" : "NEXT MISSION →";
    }
  }

  function renderResult(result) {
    const progress = loadProgress();
    const reward = result.rewards;
    const resultScore = document.getElementById("missionResultScore");
    const accuracy = document.getElementById("missionResultAccuracy");
    const rewards = document.getElementById("missionResultRewards");
    const completed = document.getElementById("missionResultCompleted");
    const route = document.getElementById("missionResultRoute");

    if (resultScore) resultScore.textContent = `${result.correct} / ${result.total}`;
    if (accuracy) accuracy.textContent = `Accuracy: ${result.accuracy}%`;
    if (completed) completed.textContent = `MISSIONS COMPLETED: ${progress.totalCompleted} / ${missions.length}`;
    if (rewards) {
      rewards.textContent = reward.points || reward.coins
        ? `REWARDS: +${reward.points} POINTS • +${reward.coins} COINS${reward.allBonus ? " • ALL 5 MISSION BONUS!" : ""}`
        : "MISSION REWARDS ALREADY CLAIMED";
    }
    if (route) route.textContent = "YOUR MISSION RUN IS COMPLETE.";
  }

  function backToHome() {
    stopMissionAudio();
    panel("missionPanel", false);
    panel("missionResultPanel", false);
    document.body.classList.remove("mission-active");
    closeHistoryEntry();
    global.updateHomeSubjectUnlocks?.();
    global.startHomeMusic?.();
  }

  function retryMissions() {
    state.missionIndex = 0;
    state.answered = false;
    state.score = 0;
    state.completed = false;
    state.runRewards = { points: 0, coins: 0, allBonus: false };
    panel("missionResultPanel", false);
    panel("missionPanel", true);
    renderMission();
    startMissionMusic();
    global.aiReaderRefresh?.(true);
  }

  global.openStartYourMission = openStartYourMission;
  global.answerMission = answerMission;
  global.nextMission = nextMission;
  global.retryMissions = retryMissions;
  global.closeMissionToHome = backToHome;
  global.validateStartYourMission = () => missions.length === 5 && missions.every(Boolean);

  window.addEventListener("popstate", () => {
    if (!document.body.classList.contains("mission-active")) return;
    state.historyActive = false;
    backToHome();
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (!global.validateMissionData?.()) console.error("Start Your Mission data validation failed.");
  });
})(window);
