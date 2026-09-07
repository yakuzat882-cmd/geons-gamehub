const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "src/mission/missionData.js"), "utf8");
const missionSource = fs.readFileSync(path.join(root, "src/mission/mission.js"), "utf8");
const scriptSource = fs.readFileSync(path.join(root, "script.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

test("Start Your Mission contains exactly five existing subjects", () => {
  const context = { window: {}, Object, Array, String, Number, Boolean, Set, Math, JSON, Date };
  vm.createContext(context);
  vm.runInContext(dataSource, context);
  const missions = context.window.ProudGeonMissionData;
  assert.equal(missions.length, 5);
  assert.equal(JSON.stringify(missions.map(m => m.subject)), JSON.stringify(["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"]));
  missions.forEach(mission => {
    assert.ok(mission.story.trim());
    assert.ok(mission.objective.trim());
    assert.ok(mission.question.trim());
    assert.equal(mission.choices.length, 4);
    assert.ok(mission.correctAnswer >= 0 && mission.correctAnswer < 4);
  });
});

test("Start Your Mission entry and screens are wired without an X navigation control", () => {
  assert.match(html, /class="mission-home-entry"[^>]*onclick="openStartYourMission\(\)"/);
  for (const id of ["missionPanel","missionStoryText","missionObjective","missionQuestionText","missionAnswers","missionNext","missionResultPanel","missionResultRewards"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(missionSource, /global\.openStartYourMission\s*=/);
  assert.match(missionSource, /global\.nextMission\s*=/);
  assert.match(missionSource, /global\.retryMissions\s*=/);
  assert.doesNotMatch(html, /mission[^>]*>[^<]*×/i);
});

test("Mission AI Reader is restricted to problem story and question", () => {
  assert.match(scriptSource, /type: "mission"/);
  assert.match(scriptSource, /getElementById\("missionStoryText"\)/);
  assert.match(scriptSource, /getElementById\("missionQuestionText"\)/);
  assert.doesNotMatch(scriptSource, /missionAnswers.*aiReaderText|aiReaderText\(.*missionAnswers/);
  assert.doesNotMatch(missionSource, /aiReaderStoryFeedback/);
});

test("Mission uses existing shared audio and has isolated reward idempotency", () => {
  assert.match(missionSource, /startGameMusic/);
  assert.match(missionSource, /playAudioElement\(correct \? "correctSound" : "wrongSound"\)/);
  assert.match(missionSource, /STORAGE_KEY = "proudGeonQuizMissionProgressV1"/);
  assert.match(missionSource, /REWARD_KEY = "proudGeonQuizMissionRewardsV1"/);
  assert.match(missionSource, /rewards\.claimed\[missionId\]/);
  assert.match(missionSource, /allClaimed/);
});

test("Mission assets are part of the offline shell", () => {
  assert.match(serviceWorker, /"\.\/src\/mission\/missionData\.js"/);
  assert.match(serviceWorker, /"\.\/src\/mission\/mission\.js"/);
});
