// ========================================
// DREAM GAME DATA
// ========================================

const GAME_SAVE_VERSION = 2;

const DEFAULT_GAME_DATA = Object.freeze({
    saveVersion: GAME_SAVE_VERSION,
    currentLevel: 0,
    highestLevel: 0,
    currentScore: 0,
    highestScore: 0,
    coins: 0,
    points: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    correctAnswers: 0,
    totalQuestions: 0
});

function safeNonNegativeInt(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(max, Math.floor(n)));
}

function sanitizeGameData(raw) {
    const source = raw && typeof raw === "object" ? raw : {};

    return {
        ...source,
        saveVersion: GAME_SAVE_VERSION,
        currentLevel: safeNonNegativeInt(source.currentLevel, 0, 80),
        highestLevel: safeNonNegativeInt(source.highestLevel, 0, 80),
        currentScore: safeNonNegativeInt(source.currentScore, 0),
        highestScore: safeNonNegativeInt(source.highestScore, 0),
        coins: safeNonNegativeInt(source.coins, 0),
        points: safeNonNegativeInt(source.points, 0),
        gamesPlayed: safeNonNegativeInt(source.gamesPlayed, 0),
        wins: safeNonNegativeInt(source.wins, 0),
        losses: safeNonNegativeInt(source.losses, 0),
        correctAnswers: safeNonNegativeInt(source.correctAnswers, 0),
        totalQuestions: safeNonNegativeInt(source.totalQuestions, 0)
    };
}

function readStoredJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
        console.warn(`Invalid saved data for ${key}; using safe defaults.`, error);
        return fallback;
    }
}

function writeStoredJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`Could not save ${key}.`, error);
        return false;
    }
}

function isSafeRecord(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function mergeSaveRecords(base, override) {
    const output = isSafeRecord(base) ? { ...base } : {};
    if (!isSafeRecord(override)) return output;
    Object.entries(override).forEach(([key, value]) => {
        if (isSafeRecord(value) && isSafeRecord(output[key])) {
            const valueKeys = Object.keys(value);
            if (valueKeys.length === 0 && Object.keys(output[key]).length > 0) return;
            output[key] = mergeSaveRecords(output[key], value);
        } else {
            output[key] = value;
        }
    });
    return output;
}

function readLegacyText(key, fallback = "") {
    try {
        const value = localStorage.getItem(key);
        return value == null ? fallback : String(value);
    } catch (error) {
        return fallback;
    }
}

function readLegacyIdArray(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (!Array.isArray(parsed)) return [];
        return [...new Set(parsed
            .filter(id => typeof id === "string" || typeof id === "number")
            .map(String)
            .filter(Boolean))].slice(0, 80);
    } catch (error) {
        return [];
    }
}

function collectLegacyProgressState() {
    const subjects = ["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"];
    const quizTypes = ["SUBJECT 1", "SUBJECT 2"];
    const byQuestioner = { previous: {}, new: {} };
    const usedByQuestioner = { previous: {}, new: {} };

    ["previous", "new"].forEach(questioner => {
        subjects.forEach(subject => {
            byQuestioner[questioner][subject] = {};
            quizTypes.forEach(quizType => {
                const prefix = questioner === "new" ? "proudGeonQuizProgress:new:" : "proudGeonQuizProgress:";
                const progressKey = `${prefix}${subject}:${quizType}`;
                const value = Number(readLegacyText(progressKey, "0"));
                byQuestioner[questioner][subject][quizType] = Number.isFinite(value)
                    ? Math.max(0, Math.min(80, Math.floor(value)))
                    : 0;

                const usedKeyPrefix = questioner === "new" ? "proudGeonQuizUsedQuestions:new:" : "proudGeonQuizUsedQuestions:";
                usedByQuestioner[questioner][`${subject}:${quizType}`] = readLegacyIdArray(`${usedKeyPrefix}${subject}:${quizType}`);
            });
        });
    });

    return {
        quizProgressByQuestioner: byQuestioner,
        quizProgress: byQuestioner.previous,
        usedQuestionIdsByQuestioner: usedByQuestioner,
        usedQuestionIds: usedByQuestioner.previous
    };
}

function hydrateLegacyKeysFromSnapshot(snapshot) {
    const safe = window.GeonGameCore ? window.GeonGameCore.sanitizeSave(snapshot) : snapshot;
    if (!isSafeRecord(safe)) return;

    const player = isSafeRecord(safe.player) ? safe.player : {};
    if (player.profileId) {
        try { localStorage.setItem("proudGeonQuizProfileV1", String(player.profileId).slice(0, 64)); } catch (error) {}
    }
    if (player.codeName) {
        try { localStorage.setItem("playerCodeName", String(player.codeName).slice(0, 24)); } catch (error) {}
    }

    if (isSafeRecord(safe.settings)) writeStoredJSON("proudGeonQuizSettings", safe.settings);
    if (isSafeRecord(safe.inventory)) writeStoredJSON("proudGeonQuizItemInventoryV1", safe.inventory);
    if (isSafeRecord(safe.achievements)) writeStoredJSON("proudGeonQuizSpecialAchievementsV1", safe.achievements);
    if (isSafeRecord(safe.bestStreak)) writeStoredJSON("proudGeonQuizBestStreakV1", safe.bestStreak);
    if (isSafeRecord(safe.subjectStats)) {
        ["previous", "new"].forEach(questioner => {
            if (isSafeRecord(safe.subjectStats[questioner])) {
                writeStoredJSON(`proudGeonQuizSubjectStatsV1:${questioner}`, safe.subjectStats[questioner]);
            }
        });
    }
    if (isSafeRecord(safe.dailyChallenges)) {
        Object.entries(safe.dailyChallenges).forEach(([key, state]) => {
            if (key.startsWith("proudGeonDailyChallenge:") && isSafeRecord(state)) writeStoredJSON(key, state);
        });
    }

    const progressGroups = isSafeRecord(safe.quizProgressByQuestioner)
        ? safe.quizProgressByQuestioner
        : { previous: safe.quizProgress };
    const usedGroups = isSafeRecord(safe.usedQuestionIdsByQuestioner)
        ? safe.usedQuestionIdsByQuestioner
        : { previous: safe.usedQuestionIds };
    ["previous", "new"].forEach(questioner => {
        const progress = isSafeRecord(progressGroups[questioner]) ? progressGroups[questioner] : {};
        const used = isSafeRecord(usedGroups[questioner]) ? usedGroups[questioner] : {};
        Object.entries(progress).forEach(([subject, paths]) => {
            if (!isSafeRecord(paths)) return;
            Object.entries(paths).forEach(([quizType, level]) => {
                const prefix = questioner === "new" ? "proudGeonQuizProgress:new:" : "proudGeonQuizProgress:";
                writeStoredJSON(`${prefix}${subject}:${quizType}`, Math.max(0, Math.min(80, Math.floor(Number(level) || 0))));
            });
        });
        Object.entries(used).forEach(([group, ids]) => {
            const [subject, quizType] = String(group).split(":");
            if (!subject || !quizType || !Array.isArray(ids)) return;
            const prefix = questioner === "new" ? "proudGeonQuizUsedQuestions:new:" : "proudGeonQuizUsedQuestions:";
            writeStoredJSON(`${prefix}${subject}:${quizType}`, ids);
        });
    });

    const titleGroups = isSafeRecord(safe.titlesByQuestioner)
        ? safe.titlesByQuestioner
        : { previous: safe.titles };
    if (isSafeRecord(titleGroups.previous)) writeStoredJSON("proudGeonQuizTitleProgressV2", titleGroups.previous);
    if (isSafeRecord(titleGroups.new)) writeStoredJSON("proudGeonQuizTitleProgressV2:new", titleGroups.new);
}

function runSaveMigration() {
    const existing = readStoredJSON("dreamGameData", {});
    const root = readStoredJSON("proudGeonQuizSaveV2", null);
    const legacyProgress = collectLegacyProgressState();
    const legacySettings = readStoredJSON("proudGeonQuizSettings", {});
    const legacyInventory = readStoredJSON("proudGeonQuizItemInventoryV1", {});
    const legacyTitles = readStoredJSON("proudGeonQuizTitleProgressV2", {});
    const legacyNewTitles = readStoredJSON("proudGeonQuizTitleProgressV2:new", {});
    const legacyAchievements = readStoredJSON("proudGeonQuizSpecialAchievementsV1", {});
    const legacy = {
        player: {
            profileId: readLegacyText("proudGeonQuizProfileV1", "explorer"),
            codeName: readLegacyText("playerCodeName", "CODE NAME")
        },
        economy: { coins: existing.coins, points: existing.points },
        statistics: {
            gamesPlayed: existing.gamesPlayed,
            wins: existing.wins,
            losses: existing.losses,
            correctAnswers: existing.correctAnswers,
            totalQuestions: existing.totalQuestions
        },
        settings: legacySettings,
        inventory: legacyInventory,
        achievements: legacyAchievements,
        titles: legacyTitles,
        titlesByQuestioner: { previous: legacyTitles, new: legacyNewTitles },
        ...legacyProgress
    };

    const merged = root ? mergeSaveRecords(legacy, root) : legacy;
    const migrated = window.GeonGameCore
        ? window.GeonGameCore.sanitizeSave(merged)
        : merged;

    if (!root) window.GeonStorage?.backup("pre-v2-migration");
    writeStoredJSON("proudGeonQuizSaveV2", migrated);
    hydrateLegacyKeysFromSnapshot(migrated);
    return migrated || { schemaVersion: 2 };
}

const migratedSave = runSaveMigration();

/* =====================================
   SETTINGS DATA
===================================== */

const migratedSettings = migratedSave?.settings && typeof migratedSave.settings === "object" && !Array.isArray(migratedSave.settings)
    ? migratedSave.settings
    : {};
let settingsData = {
    music: true,
    sound: true,
    theme: "original",
    aiReader: true,
    questioner: "previous",
    ...migratedSettings,
    ...readStoredJSON("proudGeonQuizSettings", {})
};

if (typeof settingsData.music !== "boolean") settingsData.music = true;
if (typeof settingsData.sound !== "boolean") settingsData.sound = true;
if (typeof settingsData.aiReader !== "boolean") settingsData.aiReader = true;
if (!["previous", "new"].includes(settingsData.questioner)) settingsData.questioner = "previous";
if (!["original", "light", "dark"].includes(settingsData.theme)) {
    settingsData.theme = "original";
}

const legacyGameData = readStoredJSON("dreamGameData", {});
const snapshotGameData = {
    ...legacyGameData,
    ...(migratedSave?.economy || {}),
    ...(migratedSave?.statistics || {})
};

let gameData = sanitizeGameData({
    ...DEFAULT_GAME_DATA,
    ...snapshotGameData
});

// Normalize older/corrupted saves once at startup without removing valid fields.
writeStoredJSON("dreamGameData", gameData);

// A fresh/default build must not report Level 80 before the player has played.
if (
    Number(gameData.currentLevel) === 0 &&
    Number(gameData.highestScore) === 0 &&
    Number(gameData.gamesPlayed || 0) === 0 &&
    Number(gameData.totalQuestions || 0) === 0 &&
    Number(gameData.highestLevel) === 80
) {
    gameData.highestLevel = 0;
    writeStoredJSON("dreamGameData", gameData);
}



// ========================================
// UPDATE DISPLAY
// ========================================

function fitHomeNumber(element) {
    if (!element) return;

    const maxSize = Number(element.dataset.maxFontSize || 20);
    const minSize = Number(element.dataset.minFontSize || 9);

    element.style.fontSize = maxSize + "px";

    while (element.scrollWidth > element.clientWidth && parseFloat(element.style.fontSize) > minSize) {
        element.style.fontSize = (parseFloat(element.style.fontSize) - 0.5) + "px";
    }
}

function fitHomeNumbers() {
    [
        "currentScore",
        "highestScore",
        "coins",
        "points"
    ].forEach(id => fitHomeNumber(document.getElementById(id)));
}

let lastGameDataSnapshot = "";
function updateDisplay() {
    const values = {
        currentLevel: gameData.currentLevel,
        highestLevel: gameData.highestLevel,
        currentScore: gameData.currentScore,
        highestScore: gameData.highestScore,
        coins: gameData.coins,
        points: gameData.points
    };
    Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    fitHomeNumbers();
    gameData = sanitizeGameData(gameData);
    const snapshot = JSON.stringify(gameData);
    if (snapshot !== lastGameDataSnapshot) {
        writeStoredJSON("dreamGameData", gameData);
        lastGameDataSnapshot = snapshot;
    }
    updateContinueJourneyCard();
}



// ========================================
// COMING SOON
// ========================================

function comingSoon(feature) {

    const popup =
        document.getElementById(
            "comingSoonPopup"
        );


    const title =
        document.getElementById(
            "comingTitle"
        );


    const text =
        document.getElementById(
            "comingText"
        );


    title.textContent =
        feature + " - COMING SOON";


    text.textContent =
        "The " +
        feature +
        " feature is currently under development. Stay tuned, brouw!";


    popup.classList.add(
        "show"
    );
}



// ========================================
// CLOSE COMING SOON
// ========================================

function closeComingSoon() {

    document
        .getElementById(
            "comingSoonPopup"
        )
        .classList.remove(
            "show"
        );
}


// ========================================
// TITLES SYSTEM
// 5 SUBJECTS × 2 QUIZZES × 80 LEVELS
// UNLOCK: EVERY 5TH COMPLETED LEVEL
// ========================================

const titleData = {
    "MATH": {
        "SUBJECT 1": [
            "Number Seeker",
            "Equation Explorer",
            "Pattern Finder",
            "Logic Solver",
            "Formula Apprentice",
            "Calculation Master",
            "Mathematical Strategist",
            "Algebra Challenger",
            "Geometry Navigator",
            "Problem-Solving Ace",
            "Numerical Architect",
            "Logic Commander",
            "Formula Expert",
            "Mathematics Virtuoso",
            "Master of Numbers",
            "Ultimate Math Champion"
        ],
        "SUBJECT 2": [
            "Numerical Scout",
            "Equation Tactician",
            "Pattern Master",
            "Logic Pathfinder",
            "Formula Strategist",
            "Calculation Expert",
            "Algebra Specialist",
            "Geometry Solver",
            "Number Architect",
            "Problem-Solving Master",
            "Mathematical Analyst",
            "Logic Strategist",
            "Formula Virtuoso",
            "Advanced Mathematician",
            "Master of Equations",
            "Ultimate Math Legend"
        ]
    },
    "SCIENCE": {
        "SUBJECT 1": [
            "Curious Observer",
            "Science Explorer",
            "Lab Apprentice",
            "Discovery Seeker",
            "Nature Investigator",
            "Scientific Thinker",
            "Experiment Master",
            "Research Challenger",
            "Knowledge Scientist",
            "Discovery Expert",
            "Scientific Strategist",
            "Laboratory Commander",
            "Master Investigator",
            "Science Virtuoso",
            "Grand Scientist",
            "Ultimate Science Champion"
        ],
        "SUBJECT 2": [
            "Science Scout",
            "Lab Explorer",
            "Evidence Seeker",
            "Nature Analyst",
            "Experiment Apprentice",
            "Research Thinker",
            "Discovery Specialist",
            "Scientific Challenger",
            "Laboratory Analyst",
            "Research Expert",
            "Science Strategist",
            "Discovery Commander",
            "Scientific Virtuoso",
            "Advanced Researcher",
            "Master of Discovery",
            "Ultimate Science Legend"
        ]
    },
    "PSYCHOLOGY": {
        "SUBJECT 1": [
            "Mind Explorer",
            "Thought Seeker",
            "Behavior Observer",
            "Mind Apprentice",
            "Human Insight Seeker",
            "Behavior Analyst",
            "Psychology Challenger",
            "Mind Strategist",
            "Thought Investigator",
            "Human Behavior Expert",
            "Psychological Analyst",
            "Mind Commander",
            "Insight Master",
            "Psychology Virtuoso",
            "Master of the Mind",
            "Ultimate Psychology Champion"
        ],
        "SUBJECT 2": [
            "Mind Scout",
            "Thought Explorer",
            "Behavior Seeker",
            "Insight Apprentice",
            "Human Nature Observer",
            "Cognitive Analyst",
            "Psychology Strategist",
            "Mind Investigator",
            "Behavior Expert",
            "Thought Analyst",
            "Psychology Specialist",
            "Insight Commander",
            "Mind Virtuoso",
            "Advanced Psychologist",
            "Master of Insight",
            "Ultimate Mind Legend"
        ]
    },
    "TECH 1": {
        "SUBJECT 1": [
            "Tech Beginner",
            "Digital Explorer",
            "Code Seeker",
            "Tech Apprentice",
            "System Explorer",
            "Digital Thinker",
            "Technology Solver",
            "Tech Challenger",
            "System Strategist",
            "Digital Expert",
            "Technology Architect",
            "Tech Commander",
            "Innovation Master",
            "Technology Virtuoso",
            "Digital Master",
            "Ultimate Tech Champion"
        ],
        "SUBJECT 2": [
            "Tech Scout",
            "Digital Pathfinder",
            "Code Explorer",
            "System Apprentice",
            "Technology Seeker",
            "Digital Analyst",
            "Code Strategist",
            "Tech Specialist",
            "System Solver",
            "Digital Expert",
            "Technology Strategist",
            "Innovation Commander",
            "Technical Virtuoso",
            "Advanced Technologist",
            "Digital Architect",
            "Ultimate Tech Legend"
        ]
    },
    "TECH 2": {
        "SUBJECT 1": [
            "Circuit Seeker",
            "Cyber Explorer",
            "Logic Builder",
            "Tech Apprentice",
            "System Thinker",
            "Digital Strategist",
            "Technical Solver",
            "Cyber Challenger",
            "System Architect",
            "Technology Expert",
            "Innovation Engineer",
            "Cyber Commander",
            "Technical Master",
            "Digital Virtuoso",
            "Technology Master",
            "Ultimate Tech Champion"
        ],
        "SUBJECT 2": [
            "Circuit Scout",
            "Cyber Pathfinder",
            "Logic Explorer",
            "System Builder",
            "Digital Thinker",
            "Cyber Analyst",
            "Technical Strategist",
            "Circuit Challenger",
            "System Specialist",
            "Technology Solver",
            "Innovation Strategist",
            "Cyber Expert",
            "Technical Virtuoso",
            "Digital Architect",
            "Technology Legend",
            "Ultimate Tech Legend"
        ]
    }
};

const titleSubjects = [
    "MATH",
    "SCIENCE",
    "PSYCHOLOGY",
    "TECH 1",
    "TECH 2"
];

const titleQuizTypes = [
    "SUBJECT 1",
    "SUBJECT 2"
];

const titleMilestones = [
    5, 10, 15, 20, 25, 30, 35, 40,
    45, 50, 55, 60, 65, 70, 75, 80
];

const TITLE_PROGRESS_KEY = "proudGeonQuizTitleProgressV2";

function titleProgressStorageKey() {
    return getActiveQuestioner() === "new"
        ? `${TITLE_PROGRESS_KEY}:new`
        : TITLE_PROGRESS_KEY;
}

function loadTitleProgress() {
    let saved = {};

    try {
        const stored = localStorage.getItem(titleProgressStorageKey());
        saved = stored ? JSON.parse(stored) : (migratedSave?.titles || {});
        if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
    } catch (error) {
        saved = migratedSave?.titles && typeof migratedSave.titles === "object" ? migratedSave.titles : {};
    }

    const progress = {};

    titleSubjects.forEach(subject => {
        progress[subject] = {};

        titleQuizTypes.forEach(quizType => {
            const value =
                saved?.[subject]?.[quizType] ?? 0;

            progress[subject][quizType] =
                Math.max(
                    0,
                    Math.min(80, Math.floor(Number(value) || 0))
                );
        });
    });

    return progress;
}

function saveTitleProgress(progress) {
    try {
        localStorage.setItem(
            titleProgressStorageKey(),
            JSON.stringify(progress)
        );
        if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    } catch (error) {
        console.warn("Could not save title progress safely.", error);
    }
}

function getUnlockedTitleCount(completedLevels) {
    return titleMilestones.filter(
        milestone => completedLevels >= milestone
    ).length;
}

function recordQuizLevelCompleted(subject, quizType, completedLevel) {
    if (!titleSubjects.includes(subject)) return;
    if (!titleQuizTypes.includes(quizType)) return;

    const level = Math.max(
        0,
        Math.min(80, Math.floor(Number(completedLevel) || 0))
    );

    const progress = loadTitleProgress();

    progress[subject][quizType] = Math.max(
        progress[subject][quizType],
        level
    );

    saveTitleProgress(progress);

    const subjectStats = getSubjectStats();
    subjectStats[subject].highestLevel = Math.max(
        subjectStats[subject].highestLevel,
        level
    );
    saveSubjectStats(subjectStats);
    renderTitlesPanel();
}

function openTitlesPanel() {
    const panel = document.getElementById("titlesPanel");
    if (!panel) return;

    window.titlesPanelView = "subjects";

    renderTitlesSubjects();

    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function closeTitlesPanel() {
    const panel = document.getElementById("titlesPanel");
    if (!panel) return;

    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
}

function titlesGoBack() {
    if (window.titlesPanelView === "titles") {
        const subject = window.titlesSelectedSubject;

        if (subject) {
            window.titlesPanelView = "quizzes";
            renderTitlesQuizSelection(subject);
        } else {
            window.titlesPanelView = "subjects";
            renderTitlesSubjects();
        }
        return;
    }

    if (window.titlesPanelView === "quizzes") {
        window.titlesPanelView = "subjects";
        renderTitlesSubjects();
        return;
    }

    closeTitlesPanel();
}

function selectTitlesSubject(subject) {
    window.titlesSelectedSubject = subject;
    window.titlesPanelView = "quizzes";
    renderTitlesQuizSelection(subject);
}

function selectTitlesQuiz(subject, quizType) {
    window.titlesSelectedSubject = subject;
    window.titlesSelectedQuiz = quizType;
    window.titlesPanelView = "titles";

    renderTitlesPanel();
}

function renderTitlesSubjects() {
    const title = document.getElementById("titlesPanelTitle");
    const container = document.getElementById("titlesContent");
    const back = document.getElementById("titlesBackButton");

    if (!title || !container || !back) return;

    title.textContent = "SELECT SUBJECT";
    back.textContent = "← BACK TO HOME";

    container.innerHTML = titleSubjects.map(subject => `
        <button
            type="button"
            class="titles-subject-button"
            onclick='selectTitlesSubject(${JSON.stringify(subject)})' >
            <span class="titles-subject-icon">
                ${subject === "MATH" ? "🧮" :
                   subject === "SCIENCE" ? "🔬" :
                   subject === "PSYCHOLOGY" ? "🧠" :
                   subject === "TECH 1" ? "⚙️" : "💻"}
            </span>

            <span>${subject}</span>

            <b>›</b>
        </button>
    `).join("");
}

function renderTitlesQuizSelection(subject) {
    const title = document.getElementById("titlesPanelTitle");
    const container = document.getElementById("titlesContent");
    const back = document.getElementById("titlesBackButton");

    if (!title || !container || !back) return;

    const progress = loadTitleProgress();

    title.textContent = subject;
    back.textContent = "← BACK TO SUBJECTS";

    container.innerHTML = titleQuizTypes.map(quizType => {
        const completed = progress[subject][quizType];
        const unlocked = getUnlockedTitleCount(completed);

        return `
            <button
                type="button"
                class="titles-quiz-button"
                onclick='selectTitlesQuiz(
                    ${JSON.stringify(subject)},
                    ${JSON.stringify(quizType)}
                )' >

                <span>
                    ${quizType === "SUBJECT 1" ? "📘" : "📕"}
                    ${quizType}
                </span>

                <small>
                    ${completed} / 80 LEVELS
                    • ${unlocked} / 16 TITLES
                </small>

                <b>›</b>
            </button>
        `;
    }).join("");
}

function renderTitlesPanel() {
    const title = document.getElementById("titlesPanelTitle");
    const container = document.getElementById("titlesContent");
    const back = document.getElementById("titlesBackButton");

    if (!title || !container || !back) return;

    const subject = window.titlesSelectedSubject;
    const quizType = window.titlesSelectedQuiz;

    if (!subject || !quizType || !titleData?.[subject]?.[quizType]) {
        renderTitlesSubjects();
        return;
    }

    const progress = loadTitleProgress();
    const completed = progress[subject][quizType];
    const titles = titleData[subject][quizType];

    title.textContent = `${subject} — ${quizType}`;
    back.textContent = "← BACK TO QUIZ SELECTION";

    container.innerHTML = `
        <div class="titles-progress">
            QUESTIONS / LEVELS COMPLETED:
            <strong>${completed} / 80</strong>
        </div>

        <div class="titles-list">
            ${titles.map((titleName, index) => {
                const milestone = titleMilestones[index];
                const unlocked = completed >= milestone;

                return `
                    <div class="title-card ${unlocked ? "unlocked" : "locked"}">
                        <div class="title-card-number">${index + 1}</div>

                        <div class="title-card-main">
                            <strong>
                                ${unlocked ? "🏅 " + titleName : "🔒 LOCKED"}
                            </strong>

                            <small>
                                ${unlocked
                                    ? "UNLOCKED AT LEVEL " + milestone
                                    : "UNLOCK AT LEVEL " + milestone}
                            </small>
                        </div>

                        <div class="title-card-state">
                            ${unlocked ? "✓" : "🔒"}
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}


// ========================================
// INTRO FLOW — STEP 1 → 2 → 3 → HOME
// ========================================

let introStep = 1;
let selectedSubject = "";
let selectedQuizType = "";
let levelSelectionSelectedLevel = 0;

function showIntroStep(step) {
    // Leaving the current intro screen must cancel its speech immediately.
    // Music continuity is handled by the caller for the destination screen.
    aiReaderStop(false);
    aiReaderLastScreenKey = "";
    aiReaderLastQuizKey = "";

    introStep = step;
    document.querySelectorAll(".intro-step").forEach(screen => {
        screen.classList.toggle("active", Number(screen.dataset.step) === step);
    });

    aiReaderRefresh();
}

function introContinue() {
    if (settingsData.music) startMottoMusic();
    showIntroStep(2);
}

function introNext() {
    if (settingsData.music) startMottoMusic();
    showIntroStep(3);
}

function stopMottoMusic() {
    if (window.audioManager) { audioManager.stopMusic("motto"); return; }
    const music = document.getElementById("mottoMusic");
    if (music) { music.pause(); music.currentTime = 0; }
}

function stopHomeMusic() {
    if (window.audioManager) { audioManager.stopMusic("home"); return; }
    const music = document.getElementById("homeMusic");
    if (music) { music.pause(); music.currentTime = 0; }
}

function stopGameMusic() {
    if (window.audioManager) { audioManager.stopMusic("game"); return; }
    const music = document.getElementById("gameMusic");
    if (music) { music.pause(); music.currentTime = 0; }
}

function stopVictoryMusic() {
    if (window.audioManager) { audioManager.stopMusic("victory"); return; }
    const music = document.getElementById("victoryMusic");
    if (music) { music.pause(); music.currentTime = 0; }
}

function startMottoMusic() {
    startIntroSharedMusic();
}

function startHomeMusic() {
    if (!settingsData.music) { stopHomeMusic(); return; }
    if (window.audioManager) {
        audioManager.setMusicEnabled(true);
        audioManager.playMusic("home");
        return;
    }
    stopMottoMusic(); stopGameMusic(); stopVictoryMusic();
    const music = document.getElementById("homeMusic");
    if (music) { music.volume = .45; music.play().catch(() => {}); }
}

function startIntroSharedMusic() {
    if (!settingsData.music) { stopMottoMusic(); return; }
    if (window.audioManager) {
        audioManager.setMusicEnabled(true);
        audioManager.playMusic("motto");
        return;
    }
    stopHomeMusic(); stopGameMusic(); stopVictoryMusic();
    const music = document.getElementById("mottoMusic");
    if (music) { music.volume = .45; music.play().catch(() => {}); }
}

function startGameMusic() {
    if (!settingsData.music) { stopGameMusic(); return; }
    if (window.audioManager) {
        audioManager.setMusicEnabled(true);
        audioManager.playMusic("game");
        return;
    }
    stopMottoMusic(); stopHomeMusic(); stopVictoryMusic();
    const music = document.getElementById("gameMusic");
    if (music) { music.volume = .45; music.play().catch(() => {}); }
}

function startVictoryMusic() {
    if (!settingsData.music) { stopVictoryMusic(); return; }
    if (window.audioManager) {
        audioManager.setMusicEnabled(true);
        audioManager.playMusic("victory");
        return;
    }
    stopMottoMusic(); stopHomeMusic(); stopGameMusic();
    const music = document.getElementById("victoryMusic");
    if (music) { music.volume = .55; music.play().catch(() => {}); }
}

function proceedToHome() {
    aiReaderStop();
    aiReaderLastScreenKey = "";
    aiReaderLastQuizKey = "";
    stopMottoMusic();

    const intro = document.getElementById("introFlow");

    if (intro) {
        // Remove focus BEFORE hiding the intro
        if (document.activeElement) {
            document.activeElement.blur();
        }

        intro.classList.add("hidden");
        intro.setAttribute("aria-hidden", "true");
    }

    document.body.classList.remove("intro-active");
    updateHomeSubjectUnlocks();
    startHomeMusic();
    aiReaderRefresh();
}


/* ========================================
   GAME FEEL — LIGHTWEIGHT NAVIGATION GUARD
   Prevents rapid duplicate navigation only.
   It never changes the destination or game state.
======================================== */
let gameFeelNavigationLock = false;

function gameFeelTryNavigation(action) {
    if (gameFeelNavigationLock) return false;
    gameFeelNavigationLock = true;
    try {
        action();
    } finally {
        window.setTimeout(() => {
            gameFeelNavigationLock = false;
        }, 260);
    }
    return true;
}

function openSubjectSelection(subject) {
    if (!isValidSubject(subject)) {
        return;
    }

    selectedSubject = subject;

    const panel = document.getElementById("subjectSelection");
    const title = document.getElementById("subjectSelectionTitle");
    const aTitle = document.getElementById("quizATitle");
    const bTitle = document.getElementById("quizBTitle");

    if (!panel || !title || !aTitle || !bTitle) return;

    title.textContent = subject + " SUBJECT SELECTION";
    aTitle.textContent = subject + " Subject 1 / Quiz A";
    bTitle.textContent = subject + " Subject 2 / Quiz B";

    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
    startHomeMusic();
    aiReaderRefresh();
}

function closeSubjectSelection() {
    const panel = document.getElementById("subjectSelection");
    if (!panel) return;

    if (panel.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
    updateHomeSubjectUnlocks();
    startHomeMusic();
    aiReaderRefresh();
}

/* ========================================
   PHASE 3 — SELECT A LEVEL
   Access-only layer. Uses the existing
   subject, quiz type, question bank,
   progress and quiz engine.
======================================== */
function openLevelSelection(boxOrQuizType) {
    const quizType = boxOrQuizType === "A"
        ? "SUBJECT 1"
        : boxOrQuizType === "B"
            ? "SUBJECT 2"
            : isValidQuizType(boxOrQuizType)
                ? boxOrQuizType
                : "";

    if (!isValidSubject(selectedSubject) || !isValidQuizType(quizType)) {
        alert("The selected subject or quiz is not available.");
        return;
    }

    selectedQuizType = quizType;
    levelSelectionSelectedLevel = 0;

    const panel = document.getElementById("levelSelection");
    const title = document.getElementById("levelSelectionTitle");
    const description = document.getElementById("levelSelectionDescription");
    if (!panel) return;

    if (title) title.textContent = "SELECT A LEVEL";
    if (description) description.textContent = `${selectedSubject} • ${quizType} • LEVELS 01–80`;

    renderLevelSelection();

    const subjectPanel = document.getElementById("subjectSelection");
    if (subjectPanel) {
        if (subjectPanel.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        subjectPanel.classList.remove("show");
        subjectPanel.setAttribute("aria-hidden", "true");
    }

    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
    startHomeMusic();
    aiReaderRefresh();
}

function renderLevelSelection() {
    const grid = document.getElementById("levelSelectionGrid");
    if (!grid) return;

    grid.innerHTML = Array.from({ length: 80 }, (_, index) => {
        const level = index + 1;
        const padded = String(level).padStart(2, "0");
        const selected = level === levelSelectionSelectedLevel ? " selected" : "";
        return `<button type="button" class="level-selection-button${selected}" data-level="${level}" aria-label="Level ${padded}">${padded}</button>`;
    }).join("");

    grid.querySelectorAll(".level-selection-button").forEach(button => {
        button.addEventListener("click", () => {
            const level = Number(button.dataset.level);
            selectQuizLevel(level);
        });
    });
}

function selectQuizLevel(level) {
    const safeLevel = Number(level);
    if (!Number.isInteger(safeLevel) || safeLevel < 1 || safeLevel > 80) {
        return;
    }

    if (!isValidSubject(selectedSubject) || !isValidQuizType(selectedQuizType)) {
        return;
    }

    if (!gameFeelTryNavigation(() => {
        levelSelectionSelectedLevel = safeLevel;
        startQuizAtSelectedLevel(selectedQuizType === "SUBJECT 1" ? "A" : "B", safeLevel);
    })) return;
}

function closeLevelSelection() {
    const panel = document.getElementById("levelSelection");
    if (!panel) return;

    if (panel.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");

    if (isValidSubject(selectedSubject)) {
        const subjectPanel = document.getElementById("subjectSelection");
        if (subjectPanel) {
            const title = document.getElementById("subjectSelectionTitle");
            const aTitle = document.getElementById("quizATitle");
            const bTitle = document.getElementById("quizBTitle");
            if (title) title.textContent = selectedSubject + " SUBJECT SELECTION";
            if (aTitle) aTitle.textContent = selectedSubject + " Subject 1 / Quiz A";
            if (bTitle) bTitle.textContent = selectedSubject + " Subject 2 / Quiz B";
            subjectPanel.classList.add("show");
            subjectPanel.setAttribute("aria-hidden", "false");
        }
    }

    startHomeMusic();
    aiReaderRefresh();
}

// ========================================
// QUIZ GAME ENGINE
// 80 LEVELS PER QUIZ / 5-LEVEL ACHIEVEMENTS
// ========================================

let questionBank = {};
let previousQuestionBank = {};
let newQuestionBank = {};

function getActiveQuestioner() {
    return settingsData?.questioner === "new" ? "new" : "previous";
}

function getActiveQuestionBank() {
    return getActiveQuestioner() === "new" ? newQuestionBank : previousQuestionBank;
}

/* ========================================
   SHOP / ITEM INVENTORY SYSTEM
   Uses the existing Coins + localStorage architecture.
======================================== */
const ITEM_INVENTORY_KEY = "proudGeonQuizItemInventoryV1";
const BEST_STREAK_KEY = "proudGeonQuizBestStreakV1";
const MAX_QUIZ_LIVES = 8;
const STREAK_MILESTONES = Object.freeze({
    3: { label: "HOT START", score: 25, coins: 0, points: 0 },
    5: { label: "ON FIRE", score: 50, coins: 5, points: 0 },
    10: { label: "UNSTOPPABLE", score: 100, coins: 10, points: 10 },
    15: { label: "QUIZ MASTER", score: 150, coins: 15, points: 15 },
    20: { label: "LEGENDARY STREAK", score: 250, coins: 25, points: 25 }
});

/* ========================================
   PHASE 2 — SPECIAL ACHIEVEMENTS
   ADD-ONLY extension of the existing achievement/title architecture.
======================================== */
const SPECIAL_ACHIEVEMENTS_KEY = "proudGeonQuizSpecialAchievementsV1";
const SPECIAL_POINTS_MILESTONE = 1000;
const SPECIAL_COINS_MILESTONE = 100;
const SPEED_QUIZZER_SECONDS = 5;

const SPECIAL_ACHIEVEMENT_DEFS = Object.freeze({
    special_streak_master: { icon: "🔥", title: "STREAK MASTER", description: "Get 10 consecutive correct answers." },
    special_perfect_level: { icon: "🎯", title: "PERFECT LEVEL", description: "Complete a level without a wrong answer." },
    special_survivor: { icon: "❤️", title: "SURVIVOR", description: "Complete a level without reaching zero lives." },
    special_speed_quizzer: { icon: "⚡", title: "SPEED QUIZZER", description: "Answer correctly within 5 seconds." },
    special_subject_math: { icon: "📚", title: "MATH COMPLETED", description: "Reach Level 80 in MATH." },
    special_subject_psychology: { icon: "📚", title: "PSYCHOLOGY COMPLETED", description: "Reach Level 80 in PSYCHOLOGY." },
    special_subject_science: { icon: "📚", title: "SCIENCE COMPLETED", description: "Reach Level 80 in SCIENCE." },
    special_subject_tech1: { icon: "📚", title: "TECH 1 COMPLETED", description: "Reach Level 80 in TECH 1." },
    special_subject_tech2: { icon: "📚", title: "TECH 2 COMPLETED", description: "Reach Level 80 in TECH 2." },
    special_grand_master: { icon: "🏆", title: "GRAND MASTER", description: "Reach Level 80 in all 5 subjects." },
    special_point_collector: { icon: "💎", title: "POINT COLLECTOR", description: "Reach 1,000 Points." },
    special_coin_collector: { icon: "🪙", title: "COIN COLLECTOR", description: "Reach 100 Coins." }
});

function loadSpecialAchievements() {
    const saved = readStoredJSON(SPECIAL_ACHIEVEMENTS_KEY, {});
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
}
function saveSpecialAchievements(state) {
    writeStoredJSON(SPECIAL_ACHIEVEMENTS_KEY, state);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
}
function unlockSpecialAchievement(id) {
    const def = SPECIAL_ACHIEVEMENT_DEFS[id];
    if (!def) return false;
    const state = loadSpecialAchievements();
    if (state[id]?.unlocked) return false;
    state[id] = { unlocked: true, date: new Date().toISOString() };
    saveSpecialAchievements(state);
    showStreakFeedback(`🎖️ ACHIEVEMENT UNLOCKED!\n${def.icon} ${def.title}`, 2200);
    return true;
}
function getProgressForQuestioner(subject, quizType, questioner) {
    if (!titleSubjects.includes(subject) || !titleQuizTypes.includes(quizType)) return 0;
    const prefix = questioner === "new" ? "proudGeonQuizProgress:new:" : "proudGeonQuizProgress:";
    try { return safeNonNegativeInt(localStorage.getItem(`${prefix}${subject}:${quizType}`), 0, 80); }
    catch (error) { return 0; }
}
function getOverallSubjectHighestCompletedLevel(subject) {
    return Math.max(...["previous", "new"].map(q => Math.max(
        getProgressForQuestioner(subject, "SUBJECT 1", q),
        getProgressForQuestioner(subject, "SUBJECT 2", q)
    )));
}
function checkSpecialAchievementsForSubject(subject) {
    if (!titleSubjects.includes(subject)) return;
    const id = `special_subject_${subject.toLowerCase().replace(/\s+/g, "")}`;
    if (getOverallSubjectHighestCompletedLevel(subject) >= 80) unlockSpecialAchievement(id);
    if (titleSubjects.every(item => getOverallSubjectHighestCompletedLevel(item) >= 80)) unlockSpecialAchievement("special_grand_master");
}
function checkSpecialAchievementsForBalance() {
    if (Number(gameData.points || 0) >= SPECIAL_POINTS_MILESTONE) unlockSpecialAchievement("special_point_collector");
    if (Number(gameData.coins || 0) >= SPECIAL_COINS_MILESTONE) unlockSpecialAchievement("special_coin_collector");
}
function renderSpecialAchievements() {
    const container = document.getElementById("specialAchievementsContent");
    if (!container) return;
    const state = loadSpecialAchievements();
    container.innerHTML = Object.entries(SPECIAL_ACHIEVEMENT_DEFS).map(([id, def]) => {
        const unlocked = Boolean(state[id]?.unlocked);
        return `<div class="special-achievement-card ${unlocked ? "unlocked" : "locked"}">
            <span class="special-achievement-icon">${unlocked ? def.icon : "🔒"}</span>
            <div class="special-achievement-main"><strong>${unlocked ? def.title : "LOCKED"}</strong><small>${def.description}</small></div>
            <b>${unlocked ? "UNLOCKED" : "LOCKED"}</b>
        </div>`;
    }).join("");
}
function checkSpecialAchievementOnCorrect() {
    if (quizState.streak >= 10) unlockSpecialAchievement("special_streak_master");
    const elapsed = quizState.questionStartedAt ? (Date.now() - quizState.questionStartedAt) / 1000 : Infinity;
    if (!quizState.levelHadWrongAnswer && elapsed <= SPEED_QUIZZER_SECONDS) unlockSpecialAchievement("special_speed_quizzer");
}
function checkSpecialAchievementOnLevelComplete() {
    if (!isDailyChallengeActive() && quizState.levelHadWrongAnswer === false) unlockSpecialAchievement("special_perfect_level");
    if (quizState.lives > 0) unlockSpecialAchievement("special_survivor");
    if (!isDailyChallengeActive() && quizState.index + 1 >= 80) checkSpecialAchievementsForSubject(quizState.subject);
}


const SHOP_ITEMS = Object.freeze({
    lifeToken: {
        id: "lifeToken",
        icon: "❤️",
        name: "LIFE TOKEN",
        price: 100,
        description: "Adds +1 Life when used."
    },
    timeBoost: {
        id: "timeBoost",
        icon: "⏱️",
        name: "TIME BOOST",
        price: 75,
        description: "Adds +10 seconds to the current question timer."
    },
    hint: {
        id: "hint",
        icon: "💡",
        name: "HINT",
        price: 100,
        description: "Provides a helpful clue for the current question."
    },
    fiftyFifty: {
        id: "fiftyFifty",
        icon: "✂️",
        name: "50/50",
        price: 150,
        description: "Removes two incorrect answer choices."
    },
    secondChance: {
        id: "secondChance",
        icon: "🔄",
        name: "SECOND CHANCE",
        price: 200,
        description: "Allows one retry after an incorrect answer."
    }
});

function defaultItemInventory() {
    return {
        lifeToken: 0,
        timeBoost: 0,
        hint: 0,
        fiftyFifty: 0,
        secondChance: 0
    };
}

function sanitizeItemInventory(value) {
    const fallback = defaultItemInventory();
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

    Object.keys(fallback).forEach(id => {
        fallback[id] = safeNonNegativeInt(value[id], 0, 999);
    });
    return fallback;
}

let itemInventory = sanitizeItemInventory(
    readStoredJSON(ITEM_INVENTORY_KEY, defaultItemInventory())
);

function saveItemInventory() {
    itemInventory = sanitizeItemInventory(itemInventory);
    writeStoredJSON(ITEM_INVENTORY_KEY, itemInventory);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
}

function hasItem(id) {
    return Boolean(SHOP_ITEMS[id] && itemInventory[id] > 0);
}

function updateItemSystemBalances() {
    const coinBalance = safeNonNegativeInt(gameData.coins, 0);
    const shopCoins = document.getElementById("shopCoinBalance");
    const inventoryCoins = document.getElementById("inventoryCoinBalance");
    if (shopCoins) shopCoins.textContent = coinBalance;
    if (inventoryCoins) inventoryCoins.textContent = coinBalance;
}

function openShopPanel() {
    closeInventoryPanel();
    const panel = document.getElementById("shopPanel");
    if (!panel) return;
    renderShopItems();
    updateItemSystemBalances();
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function closeShopPanel() {
    const panel = document.getElementById("shopPanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
    updateDisplay();
}

function openInventoryPanel() {
    closeShopPanel();
    const panel = document.getElementById("inventoryPanel");
    if (!panel) return;
    renderInventoryItems();
    updateItemSystemBalances();
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function closeInventoryPanel() {
    const panel = document.getElementById("inventoryPanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
    updateDisplay();
}

function renderShopItems() {
    const container = document.getElementById("shopItems");
    if (!container) return;

    container.innerHTML = Object.values(SHOP_ITEMS).map(item => `
        <div class="shop-item-card">
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-main">
                <strong>${item.name}</strong>
                <p>${item.description}</p>
                <small>OWNED: ${itemInventory[item.id]}</small>
            </div>
            <div class="shop-item-buy">
                <b>🪙 ${item.price}</b>
                <button type="button" data-buy-item="${item.id}">BUY</button>
            </div>
        </div>
    `).join("");

    container.querySelectorAll("[data-buy-item]").forEach(button => {
        button.addEventListener("click", () => buyItem(button.dataset.buyItem), { once: true });
    });
}

function buyItem(id) {
    const item = SHOP_ITEMS[id];
    if (!item) return;

    const coinBalance = safeNonNegativeInt(gameData.coins, 0);
    if (coinBalance < item.price) {
        showItemFeedback("Not Enough Coins");
        renderShopItems();
        return;
    }

    gameData.coins = coinBalance - item.price;
    itemInventory[id] = safeNonNegativeInt(itemInventory[id], 0, 999) + 1;

    saveItemInventory();
    updateDisplay();
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    renderShopItems();
    renderInventoryItems();
    updateQuizDisplay();
    updateItemSystemBalances();
    showItemFeedback(`${item.name} purchased!`);
}

function renderInventoryItems() {
    const container = document.getElementById("inventoryItems");
    if (!container) return;

    const owned = Object.values(SHOP_ITEMS).filter(item => itemInventory[item.id] > 0);

    if (!owned.length) {
        container.innerHTML = `<div class="inventory-empty">You don't have any items yet.<br>Visit the Shop to purchase items.</div>`;
        return;
    }

    container.innerHTML = owned.map(item => {
        const usable = canUseItem(item.id);
        return `
            <div class="inventory-item-card">
                <div class="inventory-item-icon">${item.icon}</div>
                <div class="inventory-item-main">
                    <strong>${item.name}</strong>
                    <p>${item.description}</p>
                    <small>QUANTITY: ${itemInventory[item.id]}</small>
                </div>
                <button type="button"
                    data-use-inventory="${item.id}"
                    ${usable ? "" : "disabled"}>${usable ? "USE" : "USE"}</button>
            </div>
        `;
    }).join("");

    container.querySelectorAll("[data-use-inventory]").forEach(button => {
        button.addEventListener("click", () => useItem(button.dataset.useInventory), { once: true });
    });
}

function isQuizActive() {
    const screen = document.getElementById("quizScreen");
    return Boolean(screen?.classList.contains("show") &&
        quizState.questions?.[quizState.index] &&
        (!quizState.selected || quizState.itemState?.awaitingSecondChance));
}

function canUseItem(id) {
    if (!hasItem(id)) return false;
    if (!isQuizActive()) return false;

    if (id === "timeBoost") return Boolean(quizState.timerId && quizState.timer > 0);
    if (id === "hint") return true;
    if (id === "fiftyFifty") {
        return !quizState.itemState.fiftyFiftyUsed &&
            document.querySelectorAll(".quiz-answer:not(:disabled)").length >= 3;
    }
    if (id === "secondChance") return Boolean(
        quizState.itemState.awaitingSecondChance &&
        !quizState.itemState.secondChanceUsed
    );
    if (id === "lifeToken") return quizState.lives < MAX_QUIZ_LIVES;
    return false;
}

function consumeItem(id) {
    if (!hasItem(id)) return false;
    itemInventory[id] -= 1;
    saveItemInventory();
    renderInventoryItems();
    renderQuizItemBar();
    return true;
}

function showItemFeedback(message) {
    let el = document.getElementById("itemFeedback");
    if (!el) {
        el = document.createElement("div");
        el.id = "itemFeedback";
        el.className = "item-feedback";
        document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(showItemFeedback.timer);
    showItemFeedback.timer = setTimeout(() => el.classList.remove("show"), 1400);
}

function showAnswerFeedback(type, message) {
    let el = document.getElementById("answerFeedback");
    if (!el) {
        el = document.createElement("div");
        el.id = "answerFeedback";
        el.className = "answer-feedback";
        const answers = document.getElementById("quizAnswers");
        if (answers) answers.insertAdjacentElement("afterend", el);
        else document.body.appendChild(el);
    }

    el.className = `answer-feedback ${type}`;
    el.textContent = message;
    el.classList.add("show");

    clearTimeout(showAnswerFeedback.timer);
    showAnswerFeedback.timer = window.setTimeout(() => {
        el.classList.remove("show");
    }, 520);
}

function getAllTimeBestStreak() {
    const stored = readStoredJSON(BEST_STREAK_KEY, { bestStreak: 0 });
    return safeNonNegativeInt(stored?.bestStreak, 0, 100000);
}

function saveAllTimeBestStreak(value) {
    const best = safeNonNegativeInt(value, 0, 100000);
    const current = getAllTimeBestStreak();
    if (best <= current) return current;
    writeStoredJSON(BEST_STREAK_KEY, { bestStreak: best });
    return best;
}

function updateStreakDisplay(animate = false) {
    const el = document.getElementById("quizStreak");
    const wrapper = document.querySelector(".quiz-streak");
    if (!el || !wrapper) return;

    const streak = safeNonNegativeInt(quizState?.streak, 0, 100000);
    el.textContent = streak;
    wrapper.setAttribute("aria-label", `Current streak: ${streak}`);
    wrapper.dataset.streak = String(streak);
    wrapper.classList.toggle("streak-hot", streak >= 3);
    wrapper.classList.toggle("streak-fire", streak >= 5);
    wrapper.classList.toggle("streak-unstoppable", streak >= 10);
    wrapper.classList.toggle("streak-master", streak >= 15);
    wrapper.classList.toggle("streak-legendary", streak >= 20);

    updateComboDisplay();

    if (animate) {
        wrapper.classList.remove("streak-pulse");
        void wrapper.offsetWidth;
        wrapper.classList.add("streak-pulse");
        window.setTimeout(() => wrapper.classList.remove("streak-pulse"), 420);
    }
}

function getStreakComboMultiplier(streak) {
    if (streak >= 20) return 3.0;
    if (streak >= 15) return 2.5;
    if (streak >= 10) return 2.0;
    if (streak >= 5) return 1.5;
    if (streak >= 3) return 1.2;
    return 1;
}
function updateComboDisplay() {
    const el = document.querySelector(".quiz-streak");
    if (!el) return;
    const streak = safeNonNegativeInt(quizState?.streak, 0, 100000);
    const multiplier = getStreakComboMultiplier(streak);
    el.classList.toggle("combo-active", multiplier > 1);
    el.dataset.multiplier = String(multiplier);
    el.setAttribute("aria-label", multiplier > 1 ? `Current streak: ${streak}, combo x${multiplier}` : `Current streak: ${streak}`);
}
function applyComboScoreBonus(baseScore, streak) {
    const multiplier = getStreakComboMultiplier(streak);
    const bonus = multiplier > 1 ? Math.floor(Number(baseScore || 0) * (multiplier - 1)) : 0;
    return { score: Number(baseScore || 0) + Math.max(0, bonus), multiplier };
}

function resetStreakMilestones() {
    quizState.streakMilestonesRewarded = [];
}

function breakQuizStreak() {
    const previous = safeNonNegativeInt(quizState?.streak, 0, 100000);
    if (previous > 0) {
        showStreakFeedback(`🔥 STREAK BROKEN\nYou reached ${previous}!`, 1500, "broken");
    }
    quizState.streak = 0;
    resetStreakMilestones();
    updateStreakDisplay(true);
}

function awardStreakMilestone(streak) {
    const milestone = STREAK_MILESTONES[streak];
    if (!milestone || quizState.streakMilestonesRewarded.includes(streak)) return false;

    quizState.streakMilestonesRewarded.push(streak);
    quizState.score += milestone.score;
    quizState.coins += milestone.coins;
    quizState.points += milestone.points;

    const rewardLines = [
        `🔥 ${streak} STREAK!`,
        milestone.label,
        `+${milestone.score} SCORE`
    ];
    if (milestone.coins) rewardLines.push(`+${milestone.coins} COINS`);
    if (milestone.points) rewardLines.push(`+${milestone.points} POINTS`);
    quizState.levelScoreEarned = safeNonNegativeInt(quizState.levelScoreEarned, 0) + milestone.score;
    quizState.levelCoinsEarned = safeNonNegativeInt(quizState.levelCoinsEarned, 0) + milestone.coins;
    quizState.levelPointsEarned = safeNonNegativeInt(quizState.levelPointsEarned, 0) + milestone.points;
    showStreakFeedback(rewardLines.join("\n"), 1900, `milestone-${streak}`);
    return true;
}

function registerCorrectStreakAnswer() {
    quizState.streak = safeNonNegativeInt(quizState.streak, 0, 100000) + 1;
    quizState.bestStreak = Math.max(
        safeNonNegativeInt(quizState.bestStreak, 0, 100000),
        quizState.streak
    );
    saveAllTimeBestStreak(quizState.bestStreak);
    updateStreakDisplay(true);
    return awardStreakMilestone(quizState.streak);
}

function showStreakFeedback(message, duration = 1500, feedbackTier = "") {
    let el = document.getElementById("streakFeedback");
    if (!el) {
        el = document.createElement("div");
        el.id = "streakFeedback";
        el.className = "streak-feedback";
        document.body.appendChild(el);
    }
    el.dataset.tier = String(feedbackTier || "");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(showStreakFeedback.timer);
    showStreakFeedback.timer = window.setTimeout(() => {
        el.classList.remove("show");
        el.dataset.tier = "";
    }, duration);
}

function getHintForQuestion(question) {
    if (question && typeof question.hint === "string" && question.hint.trim()) {
        return question.hint.trim();
    }

    const subject = String(quizState.subject || "").toUpperCase();
    if (subject === "MATH") {
        return "Break the problem into the operations shown and apply the standard order of operations.";
    }
    if (subject === "SCIENCE") {
        return "Recall the core scientific principle or process described by the question.";
    }
    if (subject === "PSYCHOLOGY") {
        return "Focus on the psychological concept or definition being described.";
    }
    return "Focus on the key term, function, or principle the question is testing.";
}

function useItem(id) {
    if (!canUseItem(id)) {
        if (id === "lifeToken" && isQuizActive() && quizState.lives >= MAX_QUIZ_LIVES) {
            showItemFeedback("Lives already full.");
        } else {
            showItemFeedback("Item cannot be used now.");
        }
        return false;
    }

    let success = false;
    let successFeedback = `${SHOP_ITEMS[id].name} used.`;

    if (id === "lifeToken") {
        if (quizState.lives < MAX_QUIZ_LIVES) {
            quizState.lives += 1;
            success = true;
            successFeedback = "❤️ LIFE TOKEN USED\n+1 LIFE";
        }
    } else if (id === "timeBoost") {
        if (quizState.timerId && quizState.timer > 0) {
            quizState.timer += 10;
            updateQuizTimer();
            success = true;
            successFeedback = "⏱️ TIME BOOST USED\n+10 SECONDS";
        }
    } else if (id === "hint") {
        const question = quizState.questions[quizState.index];
        success = true;
        successFeedback = `💡 HINT\n${getHintForQuestion(question)}`;
    } else if (id === "fiftyFifty") {
        const buttons = [...document.querySelectorAll(".quiz-answer:not(:disabled)")];
        const wrong = shuffleArray(
            buttons.filter(button => button.dataset.answer !== quizState.currentCorrect)
        ).slice(0, 2);

        if (wrong.length === 2) {
            wrong.forEach(button => {
                button.disabled = true;
                button.classList.add("eliminated");
                button.setAttribute("aria-disabled", "true");
            });
            quizState.itemState.fiftyFiftyUsed = true;
            success = true;
            successFeedback = "✂️ 50/50 USED\n2 WRONG ANSWERS REMOVED";
        }
    } else if (id === "secondChance") {
        if (quizState.itemState.awaitingSecondChance &&
            !quizState.itemState.secondChanceUsed) {
            quizState.itemState.secondChanceUsed = true;
            quizState.itemState.awaitingSecondChance = false;

            const buttons = [...document.querySelectorAll(".quiz-answer")];
            buttons.forEach(b => {
                b.disabled = false;
                b.classList.remove("selected", "correct", "wrong", "eliminated");
                b.removeAttribute("aria-disabled");
            });

            const qBox = document.getElementById("quizQuestionBox");
            if (qBox) qBox.classList.remove("correct", "wrong");

            quizState.selected = false;
            startQuizTimer();
            success = true;
            successFeedback = "🔄 SECOND CHANCE\nRETRY AVAILABLE";
        }
    }

    if (!success) {
        showItemFeedback("Item cannot be used now.");
        return false;
    }

    consumeItem(id);
    updateQuizDisplay();
    saveGlobalGameData();
    showItemFeedback(successFeedback);
    return true;
}

function renderQuizItemBar() {
    const bar = document.getElementById("quizItemBar");
    if (!bar) return;

    /*
     * The Quiz Screen always owns exactly five item positions.
     * Quantities come directly from the existing shared inventory.
     * A zero/unusable item stays visible and disabled so the row never
     * reflows or changes shape during a quiz.
     */
    const inQuiz = Boolean(
        !isReviewerActive() &&
        document.getElementById("quizScreen")?.classList.contains("show") &&
        quizState.questions?.[quizState.index]
    );

    if (!inQuiz) {
        bar.innerHTML = "";
        return;
    }

    const shortNames = {
        lifeToken: "LIFE",
        timeBoost: "TIME",
        hint: "HINT",
        fiftyFifty: "50/50",
        secondChance: "2ND"
    };

    bar.innerHTML = Object.values(SHOP_ITEMS).map(item => {
        const quantity = safeNonNegativeInt(itemInventory[item.id], 0, 999);
        const canUse = canUseItem(item.id);
        const canExplainLifeFull = item.id === "lifeToken" &&
            quantity > 0 &&
            quizState.lives >= MAX_QUIZ_LIVES &&
            isQuizActive();

        return `
            <button type="button"
                class="quiz-item-button${quantity <= 0 ? " is-empty" : ""}${!canUse ? " is-unusable" : ""}"
                data-quiz-item="${item.id}"
                title="${item.name}: ${item.description}"
                aria-label="${item.name}, quantity ${quantity}"
                ${canUse || canExplainLifeFull ? "" : "disabled"}>
                <span>${item.icon}</span>
                <small>${shortNames[item.id]}</small>
                <b>×${quantity}</b>
            </button>
        `;
    }).join("");

    bar.querySelectorAll("[data-quiz-item]").forEach(button => {
        button.addEventListener("click", () => useItem(button.dataset.quizItem));
    });
}

function resetPerQuestionItemState() {
    quizState.itemState = {
        fiftyFiftyUsed: false,
        secondChanceUsed: false,
        hintUsed: false,
        awaitingSecondChance: false
    };
}

let quizState = {
    subject: "",
    quizType: "",
    questions: [],
    index: 0,
    score: 0,
    coins: 0,
    points: 0,
    lives: 8,
    selected: false,
    currentCorrect: "",
    timer: 30,
    timerId: null,
    startedAt: 0,
    bestCompleted: 0,
    streak: 0,
    bestStreak: 0,
    streakMilestonesRewarded: [],
    levelCorrectAnswers: 0,
    levelScoreEarned: 0,
    levelCoinsEarned: 0,
    levelPointsEarned: 0,
    victoryShown: false,
    levelHadWrongAnswer: false,
    questionStartedAt: 0,
    usedQuestionIds: [],
    itemState: {
        fiftyFiftyUsed: false,
        secondChanceUsed: false,
        hintUsed: false,
        awaitingSecondChance: false
    }
};

/* ========================================
   DAILY CHALLENGE — ISOLATED REPLAY STATE
======================================== */
/* =====================================
   PHASE 3 — REVIEWER MODE
   ADD-ONLY review layer. Uses the existing question banks and quiz UI,
   but never writes normal progression, rewards, statistics, or used IDs.
===================================== */
const REVIEWER_SESSION_SIZE = 10;

function isReviewerActive() {
    return quizState?.mode === "reviewer";
}

function getQuestionBankForQuestioner(questioner) {
    return questioner === "new" ? newQuestionBank : previousQuestionBank;
}

function getReviewSubjectPool(subject, questioner) {
    if (!isValidSubject(subject)) return [];
    const bank = getQuestionBankForQuestioner(questioner);
    if (!bank || !bank[subject]) return [];
    const pool = [];
    QUIZ_TYPES.forEach(quizType => {
        const questions = Array.isArray(bank[subject][quizType]) ? bank[subject][quizType] : [];
        questions.forEach(question => {
            if (question?.id != null && Array.isArray(question.choices) && question.choices.length >= 2) {
                pool.push({
                    ...question,
                    choices: [...question.choices],
                    subject,
                    quizType
                });
            }
        });
    });
    return pool;
}

function getExplicitUsedQuestionIds(subject, quizType, questioner) {
    if (!isValidSubject(subject) || !isValidQuizType(quizType)) return [];
    const prefix = questioner === "new" ? "proudGeonQuizUsedQuestions:new:" : "proudGeonQuizUsedQuestions:";
    try {
        const saved = JSON.parse(localStorage.getItem(`${prefix}${subject}:${quizType}`) || "[]");
        return Array.isArray(saved) ? saved.map(String) : [];
    } catch (error) {
        return [];
    }
}

function getReviewerEncounteredIds(subject, questioner) {
    return [...new Set(QUIZ_TYPES.flatMap(quizType =>
        getExplicitUsedQuestionIds(subject, quizType, questioner)
    ))];
}

function getReviewerPool() {
    const subject = document.getElementById("reviewerSubjectSelect")?.value || SUBJECT_KEYS[0];
    const questioner = document.getElementById("reviewerQuestionerSelect")?.value === "new" ? "new" : "previous";
    const filter = document.getElementById("reviewerFilterSelect")?.value === "completed" ? "completed" : "all";
    const pool = getReviewSubjectPool(subject, questioner);
    if (filter !== "completed") return pool;
    const encountered = new Set(getReviewerEncounteredIds(subject, questioner));
    return pool.filter(question => encountered.has(String(question.id)));
}

function renderReviewerSubjects() {
    const select = document.getElementById("reviewerSubjectSelect");
    if (!select) return;
    const current = select.value;
    select.innerHTML = SUBJECT_KEYS.map(subject => `<option value="${subject}">${subject}</option>`).join("");
    if (SUBJECT_KEYS.includes(current)) select.value = current;
}

function updateReviewerModePanel() {
    renderReviewerSubjects();
    const pool = getReviewerPool();
    const available = document.getElementById("reviewerAvailableCount");
    const session = document.getElementById("reviewerSessionCount");
    const message = document.getElementById("reviewerModeMessage");
    const start = document.getElementById("reviewerModeStartButton");
    const filter = document.getElementById("reviewerFilterSelect")?.value === "completed";
    const questioner = document.getElementById("reviewerQuestionerSelect")?.value === "new" ? "NEW" : "PREVIOUS";

    const count = Math.min(REVIEWER_SESSION_SIZE, pool.length);
    if (available) available.textContent = String(pool.length);
    if (session) session.textContent = String(count);
    if (message) {
        message.textContent = pool.length
            ? `${questioner} • ${filter ? "ENCOUNTERED QUESTIONS" : "ALL QUESTIONS"} • ${count} will be reviewed in this session.`
            : (filter ? "No encountered questions are available for this subject/questioner." : "No questions are available for this subject/questioner.");
    }
    if (start) start.disabled = pool.length === 0;
}

function openReviewerModePanel() {
    if (document.getElementById("reviewerResultPanel")?.classList.contains("show")) return;
    closeProfilePanel?.();
    closePointsConversionPanel?.();
    closeDailyChallengePanel?.();
    renderReviewerSubjects();
    updateReviewerModePanel();
    const panel = document.getElementById("reviewerModePanel");
    if (panel) {
        panel.classList.add("show");
        panel.setAttribute("aria-hidden", "false");
    }
}

function closeReviewerModePanel() {
    const panel = document.getElementById("reviewerModePanel");
    if (panel) {
        panel.classList.remove("show");
        panel.setAttribute("aria-hidden", "true");
    }
    updateReviewerModePanel();
}

function startReviewerMode() {
    const subject = document.getElementById("reviewerSubjectSelect")?.value || "";
    const questioner = document.getElementById("reviewerQuestionerSelect")?.value === "new" ? "new" : "previous";
    const filter = document.getElementById("reviewerFilterSelect")?.value === "completed" ? "completed" : "all";
    let pool = getReviewSubjectPool(subject, questioner);

    if (filter === "completed") {
        const encountered = new Set(getReviewerEncounteredIds(subject, questioner));
        pool = pool.filter(question => encountered.has(String(question.id)));
    }
    if (!pool.length) {
        updateReviewerModePanel();
        return;
    }

    const questions = shuffleArray(pool).slice(0, REVIEWER_SESSION_SIZE);
    quizState = {
        subject,
        quizType: "REVIEWER",
        questions,
        index: 0,
        score: 0,
        coins: Number(gameData.coins || 0),
        points: Number(gameData.points || 0),
        lives: MAX_QUIZ_LIVES,
        selected: false,
        currentCorrect: "",
        timer: 0,
        timerId: null,
        startedAt: Date.now(),
        bestCompleted: 0,
        streak: 0,
        bestStreak: 0,
        streakMilestonesRewarded: [],
        levelCorrectAnswers: 0,
        levelScoreEarned: 0,
        levelCoinsEarned: 0,
        levelPointsEarned: 0,
        victoryShown: false,
        levelHadWrongAnswer: false,
        questionStartedAt: 0,
        usedQuestionIds: [],
        itemState: { fiftyFiftyUsed:false, secondChanceUsed:false, hintUsed:false, awaitingSecondChance:false },
        mode: "reviewer",
        reviewerQuestioner: questioner,
        reviewerFilter: filter,
        reviewerSubject: subject
    };

    closeReviewerModePanel();
    const quizScreen = document.getElementById("quizScreen");
    if (quizScreen) {
        quizScreen.classList.add("show");
        quizScreen.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("quiz-active", "reviewer-active");
    aiReaderStop();
    stopHomeMusic();
    stopMottoMusic();
    stopVictoryMusic();
    stopQuizTimer();
    renderCurrentQuizQuestion();
}

function completeReviewerMode() {
    if (!isReviewerActive()) return;
    stopQuizTimer();
    const reviewed = Math.min(REVIEWER_SESSION_SIZE, Math.max(0, Number(quizState.index) || 0));
    const subject = quizState.reviewerSubject || quizState.subject || "";
    const panel = document.getElementById("reviewerResultPanel");
    const title = document.getElementById("reviewerResultTitle");
    const text = document.getElementById("reviewerResultText");
    const subjectEl = document.getElementById("reviewerResultSubject");
    if (title) title.textContent = "REVIEW COMPLETE";
    if (text) text.textContent = `${reviewed} QUESTIONS REVIEWED`;
    if (subjectEl) subjectEl.textContent = `${subject} • ${quizState.reviewerQuestioner === "new" ? "NEW" : "PREVIOUS"}`;
    aiReaderStop();
    closeQuizVisualOnly();
    document.body.classList.remove("reviewer-active");
    if (panel) {
        panel.classList.add("show");
        panel.setAttribute("aria-hidden", "false");
    }
}

function closeReviewerResult() {
    const panel = document.getElementById("reviewerResultPanel");
    if (panel) {
        if (panel.contains(document.activeElement)) document.activeElement.blur();
        panel.classList.remove("show");
        panel.setAttribute("aria-hidden", "true");
    }
    quizState.mode = "normal";
    quizState.reviewerQuestioner = "";
    quizState.reviewerFilter = "";
    quizState.reviewerSubject = "";
    document.body.classList.remove("reviewer-active");
    updateHomeSubjectUnlocks();
    startHomeMusic();
}

function exitReviewerModeToPanel() {
    stopQuizTimer();
    aiReaderStop();
    closeQuizVisualOnly();
    document.body.classList.remove("reviewer-active");
    quizState.mode = "normal";
    quizState.reviewerQuestioner = "";
    quizState.reviewerFilter = "";
    quizState.reviewerSubject = "";
    openReviewerModePanel();
}

const DAILY_CHALLENGE_SIZE = 10;
const DAILY_BONUS_POINTS = 100;
const DAILY_BONUS_COINS = 5;
const DAILY_CHALLENGE_STORAGE_PREFIX = "proudGeonDailyChallenge:";

function getDailyChallengeDate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function dailyChallengeStorageKey(date = getDailyChallengeDate(), questioner = getActiveQuestioner()) {
    return `${DAILY_CHALLENGE_STORAGE_PREFIX}${questioner}:${date}`;
}

function hashDailySeed(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function getAllActiveQuestionPool() {
    const bank = getActiveQuestionBank();
    const pool = [];
    SUBJECT_KEYS.forEach(subject => {
        QUIZ_TYPES.forEach(quizType => {
            const questions = Array.isArray(bank?.[subject]?.[quizType]) ? bank[subject][quizType] : [];
            questions.forEach(question => {
                if (question?.id != null && Array.isArray(question.choices) && question.choices.length >= 2) {
                    pool.push({ ...question, choices: [...question.choices], subject, quizType });
                }
            });
        });
    });
    return pool;
}

function generateDailyQuestionIds(date = getDailyChallengeDate(), questioner = getActiveQuestioner()) {
    const pool = getAllActiveQuestionPool();
    if (pool.length < DAILY_CHALLENGE_SIZE) return [];
    const seed = `${date}|${questioner}`;
    const ranked = pool.map(question => ({
        question,
        rank: hashDailySeed(`${seed}|${String(question.id)}`)
    })).sort((a, b) => a.rank - b.rank);
    return [...new Set(ranked.map(item => String(item.question.id)))].slice(0, DAILY_CHALLENGE_SIZE);
}

function getDailyChallengeState(date = getDailyChallengeDate(), questioner = getActiveQuestioner()) {
    const key = dailyChallengeStorageKey(date, questioner);
    const saved = readStoredJSON(key, {});
    const ids = Array.isArray(saved?.questionIds) ? saved.questionIds.map(String) : [];
    const validIds = new Set(getAllActiveQuestionPool().map(q => String(q.id)));
    const questionIds = ids.length === DAILY_CHALLENGE_SIZE && ids.every(id => validIds.has(id))
        ? [...new Set(ids)].slice(0, DAILY_CHALLENGE_SIZE)
        : generateDailyQuestionIds(date, questioner);
    const state = {
        date,
        questioner,
        questionIds,
        completed: Boolean(saved?.completed),
        rewardClaimed: Boolean(saved?.rewardClaimed),
        attempts: safeNonNegativeInt(saved?.attempts, 0),
        updatedAt: Number(saved?.updatedAt) || 0
    };
    if (questionIds.length === DAILY_CHALLENGE_SIZE && (
        !Array.isArray(saved?.questionIds) || saved.questionIds.join("|") !== questionIds.join("|")
    )) saveDailyChallengeState(state);
    return state;
}

function saveDailyChallengeState(state) {
    if (!state || !state.date || !state.questioner) return false;
    return writeStoredJSON(dailyChallengeStorageKey(state.date, state.questioner), {
        date: state.date,
        questioner: state.questioner,
        questionIds: Array.isArray(state.questionIds) ? [...new Set(state.questionIds.map(String))].slice(0, DAILY_CHALLENGE_SIZE) : [],
        completed: Boolean(state.completed),
        rewardClaimed: Boolean(state.rewardClaimed),
        attempts: safeNonNegativeInt(state.attempts, 0),
        updatedAt: Date.now()
    });
}

function getDailyChallengeQuestions(state) {
    const wanted = new Set((state?.questionIds || []).map(String));
    const pool = getAllActiveQuestionPool();
    return (state?.questionIds || []).map(id => pool.find(q => String(q.id) === String(id))).filter(Boolean)
        .filter(q => wanted.has(String(q.id)));
}

function updateDailyChallengePanel() {
    const date = getDailyChallengeDate();
    const questioner = getActiveQuestioner();
    const state = getDailyChallengeState(date, questioner);
    const dateEl = document.getElementById("dailyChallengeDate");
    const progressEl = document.getElementById("dailyChallengeProgress");
    const fill = document.getElementById("dailyChallengePanelFill");
    const message = document.getElementById("dailyChallengeMessage");
    const start = document.getElementById("dailyChallengeStartButton");
    const homeStatus = document.getElementById("dailyChallengeHomeStatus");
    const completed = state.completed && state.rewardClaimed;
    if (dateEl) dateEl.textContent = `DATE: ${date}`;
    if (progressEl) progressEl.textContent = completed ? "10 / 10" : "0 / 10";
    if (fill) fill.style.width = completed ? "100%" : "0%";
    if (message) message.textContent = completed
        ? "COMPLETED — today's reward has already been claimed."
        : `QUESTIONER: ${questioner === "new" ? "NEW" : "PREVIOUS"} • Complete all 10 questions to claim the daily bonus.`;
    if (start) {
        start.disabled = completed || state.questionIds.length !== DAILY_CHALLENGE_SIZE;
        start.textContent = completed ? "✓ COMPLETED TODAY" : "🏆 START CHALLENGE";
    }
    if (homeStatus) homeStatus.textContent = completed ? "✓ COMPLETED TODAY" : "10 QUESTIONS • DAILY REPLAY";
}

function openDailyChallengePanel() {
    if (document.getElementById("dailyChallengeResultPanel")?.classList.contains("show")) return;
    closeProfilePanel?.();
    closePointsConversionPanel?.();
    updateDailyChallengePanel();
    const panel = document.getElementById("dailyChallengePanel");
    if (panel) { panel.classList.add("show"); panel.setAttribute("aria-hidden", "false"); }
}

function closeDailyChallengePanel() {
    const panel = document.getElementById("dailyChallengePanel");
    if (panel) { panel.classList.remove("show"); panel.setAttribute("aria-hidden", "true"); }
    updateDailyChallengePanel();
}

function closeDailyChallengeResult() {
    const panel = document.getElementById("dailyChallengeResultPanel");
    if (panel) { panel.classList.remove("show"); panel.setAttribute("aria-hidden", "true"); }
    updateDailyChallengePanel();
    updateHomeSubjectUnlocks();
    startHomeMusic();
}

function showDailyChallengeResult(success) {
    stopQuizTimer();
    stopGameMusic();
    aiReaderStop();
    closeQuizVisualOnly();
    const title = document.getElementById("dailyChallengeResultTitle");
    const text = document.getElementById("dailyChallengeResultText");
    const points = document.getElementById("dailyChallengeRewardPoints");
    const coins = document.getElementById("dailyChallengeRewardCoins");
    if (title) title.textContent = success ? "DAILY CHALLENGE COMPLETE!" : "DAILY CHALLENGE ENDED";
    if (text) {
        const completedCount = success
            ? 10
            : Math.min(10, Math.max(0, Number(quizState.index) || 0) + (quizState.selected ? 1 : 0));
        text.textContent = `${completedCount} / 10`;
    }
    if (points) points.textContent = success ? `+${DAILY_BONUS_POINTS} POINTS` : "+0 POINTS";
    if (coins) coins.textContent = success ? `+${DAILY_BONUS_COINS} COINS` : "+0 COINS";
    const panel = document.getElementById("dailyChallengeResultPanel");
    if (panel) { panel.classList.add("show"); panel.setAttribute("aria-hidden", "false"); }
}

function startDailyChallenge() {
    const date = getDailyChallengeDate();
    const questioner = getActiveQuestioner();
    const state = getDailyChallengeState(date, questioner);
    if (state.completed && state.rewardClaimed) return;
    const questions = getDailyChallengeQuestions(state);
    if (questions.length !== DAILY_CHALLENGE_SIZE) {
        alert("Today's Daily Challenge is not available yet. Please try again after the question bank finishes loading.");
        return;
    }
    state.attempts += 1;
    saveDailyChallengeState(state);
    quizState = {
        subject: "",
        quizType: "DAILY CHALLENGE",
        questions,
        index: 0,
        score: 0,
        coins: Number(gameData.coins || 0),
        points: Number(gameData.points || 0),
        lives: 8,
        selected: false,
        currentCorrect: "",
        timer: 30,
        timerId: null,
        startedAt: Date.now(),
        bestCompleted: 0,
        streak: 0,
        bestStreak: 0,
        streakMilestonesRewarded: [],
        levelHadWrongAnswer: false,
        questionStartedAt: 0,
        usedQuestionIds: [],
        mode: "daily",
        dailyDate: date,
        dailyQuestioner: questioner,
        itemState: { fiftyFiftyUsed:false, secondChanceUsed:false, hintUsed:false, awaitingSecondChance:false }
    };
    closeDailyChallengePanel();
    const quizScreen = document.getElementById("quizScreen");
    if (quizScreen) { quizScreen.classList.add("show"); quizScreen.setAttribute("aria-hidden","false"); }
    document.body.classList.add("quiz-active");
    aiReaderStop();
    stopHomeMusic(); stopMottoMusic(); stopVictoryMusic(); startGameMusic();
    renderCurrentQuizQuestion();
}

function isDailyChallengeActive() {
    return quizState?.mode === "daily";
}

function completeDailyChallenge() {
    if (!isDailyChallengeActive()) return;
    stopQuizTimer();
    const state = getDailyChallengeState(quizState.dailyDate, quizState.dailyQuestioner);
    if (!state.rewardClaimed) {
        state.completed = true;
        state.rewardClaimed = true;
        saveDailyChallengeState(state);
        quizState.points = safeNonNegativeInt(Number(quizState.points || 0) + DAILY_BONUS_POINTS, 0);
        quizState.coins = safeNonNegativeInt(Number(quizState.coins || 0) + DAILY_BONUS_COINS, 0);
        saveGlobalGameData();
    }
    showDailyChallengeResult(true);
}

function failDailyChallenge() {
    if (!isDailyChallengeActive()) return;
    stopQuizTimer();
    saveGlobalGameData();
    showDailyChallengeResult(false);
}

function resetQuizModeAfterExit() {
    if (isDailyChallengeActive()) {
        stopQuizTimer();
        quizState.mode = "normal";
        quizState.dailyDate = "";
        quizState.dailyQuestioner = "";
    }
}

function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

const SUBJECT_KEYS = Object.freeze([
    "TECH 1",
    "TECH 2",
    "MATH",
    "SCIENCE",
    "PSYCHOLOGY"
]);

const QUIZ_TYPES = Object.freeze(["SUBJECT 1", "SUBJECT 2"]);

function isValidSubject(subject) {
    return SUBJECT_KEYS.includes(subject);
}

function isValidQuizType(quizType) {
    return QUIZ_TYPES.includes(quizType);
}

/*
 * Each subject has its own isolated pool.  No subject falls back to
 * another subject's questions.
 */
function getSubjectQuestionPool(subject, quizType) {
    if (!isValidSubject(subject) || !isValidQuizType(quizType)) return [];

    const pool = getActiveQuestionBank()?.[subject]?.[quizType];
    return Array.isArray(pool) ? pool.map(question => ({
        ...question,
        choices: Array.isArray(question.choices) ? [...question.choices] : []
    })) : [];
}

/*
 * Keep the four difficulty bands in their own lanes, then randomize
 * question order inside each lane. This gives a new order on every
 * quiz start without allowing an easy question to appear in an
 * impossible-level band.
 */
function buildSessionQuestions(source, completedCount = 0, usedIds = [], exactLevelAlignment = false) {
    const safeCompleted = Math.max(0, Math.min(79, Number(completedCount) || 0));

    if (exactLevelAlignment) {
        const byLevel = new Map();
        source.forEach(question => {
            const level = Number(question?.level);
            if (Number.isInteger(level) && level >= 1 && level <= 80 && !byLevel.has(level)) {
                byLevel.set(level, question);
            }
        });

        const exactSession = [];
        for (let level = 1; level <= 80; level++) {
            const question = byLevel.get(level);
            if (question) {
                exactSession.push({
                    ...question,
                    choices: Array.isArray(question.choices) ? [...question.choices] : []
                });
            }
        }

        return exactSession;
    }

    const used = new Set((usedIds || []).map(String));
    const bands = [
        source.filter(q => Number(q.level) >= 1 && Number(q.level) <= 20),
        source.filter(q => Number(q.level) >= 21 && Number(q.level) <= 40),
        source.filter(q => Number(q.level) >= 41 && Number(q.level) <= 60),
        source.filter(q => Number(q.level) >= 61 && Number(q.level) <= 80)
    ];

    /*
     * Always return a full 80-question session with the array index aligned
     * to the player's level. Older versions could return only the remaining
     * questions when saved progress had no matching used IDs; that made
     * index 20 point at the wrong difficulty band. This version keeps the
     * completed slots in the session and randomizes safely inside each band.
     */
    const session = [];

    bands.forEach((band, bandIndex) => {
        const bandStart = bandIndex * 20;
        const completedInBand = Math.max(
            0,
            Math.min(20, safeCompleted - bandStart)
        );

        const usedInBand = shuffleArray(
            band.filter(q => used.has(String(q.id)))
        );

        const unusedInBand = shuffleArray(
            band.filter(q => !used.has(String(q.id)))
        );

        const completedSlots = [
            ...usedInBand.slice(0, completedInBand),
            ...unusedInBand.slice(0, Math.max(0, completedInBand - usedInBand.length))
        ];

        const futureQuestions = unusedInBand.slice(
            Math.max(0, completedInBand - usedInBand.length)
        );

        session.push(
            ...completedSlots,
            ...futureQuestions
        );
    });

    return session.slice(0, 80);
}

function getDifficultyReward(level) {
    const band = window.GeonScoring?.rewardBand?.(level);
    return band
        ? { score: band.score, coins: band.coins, points: band.points }
        : { score: 50, coins: 5, points: 10 };
}

function calculateAnswerReward(level, correct, streak) {
    return window.GeonScoring?.calculateAnswerReward?.({ level, correct, streak }) ||
        getDifficultyReward(level);
}

async function loadQuestionBank() {
    previousQuestionBank =
        window.questionBank && Object.keys(window.questionBank).length
            ? window.questionBank
            : {};

    newQuestionBank =
        window.newQuestionBank && Object.keys(window.newQuestionBank).length
            ? window.newQuestionBank
            : {};

    try {
        if (!Object.keys(previousQuestionBank).length) {
            const response = await fetch("questions.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            previousQuestionBank = await response.json();
        }
    } catch (error) {
        console.warn("Previous question bank could not be loaded:", error);
    }

    try {
        if (!Object.keys(newQuestionBank).length) {
            const response = await fetch("questions.new.json", { cache: "no-store" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            newQuestionBank = await response.json();
        }
    } catch (error) {
        console.warn("New question bank could not be loaded:", error);
    }

    if (window.GeonQuestionValidator) {
        previousQuestionBank = window.GeonQuestionValidator.normalize(previousQuestionBank);
        newQuestionBank = window.GeonQuestionValidator.normalize(newQuestionBank);
        const reports = [
            ["PREVIOUS", previousQuestionBank],
            ["NEW", newQuestionBank]
        ].map(([name, bank]) => [
            name,
            window.GeonQuestionValidator.validate(bank, name === "NEW" ? "new" : "previous")
        ]);
        const previousIds = new Set(
            previousQuestionBank && typeof previousQuestionBank === "object"
                ? Object.values(previousQuestionBank).flatMap(subject =>
                    Object.values(subject || {}).flatMap(rows =>
                        Array.isArray(rows) ? rows.map(q => String(q?.id || "")) : []
                    )
                )
                : []
        );
        const crossModeCollisions = new Set(
            newQuestionBank && typeof newQuestionBank === "object"
                ? Object.values(newQuestionBank).flatMap(subject =>
                    Object.values(subject || {}).flatMap(rows =>
                        Array.isArray(rows) ? rows.map(q => String(q?.id || "")) : []
                    )
                ).filter(id => previousIds.has(id))
                : []
        );
        if (crossModeCollisions.size) {
            console.error("[Question Validator] Previous/New ID collision detected.", [...crossModeCollisions].slice(0, 10));
        }
        reports.forEach(([name, report]) => {
            if (!report.valid) console.error(`[Question Validator] ${name} dataset has ${report.errors.length} issue(s).`, report);
        });
        window.ProudGeonQuizQuestionValidation = {
            reports,
            crossModeCollisions: [...crossModeCollisions]
        };
    }

    questionBank = getActiveQuestionBank();
    if (!Object.keys(questionBank || {}).length) {
        const message = document.getElementById("dataLoadError");
        if (message) message.classList.add("show");
        console.error("No valid question bank is available.");
    }
}

function quizProgressKey(subject, quizType) {
    return getActiveQuestioner() === "new"
        ? `proudGeonQuizProgress:new:${subject}:${quizType}`
        : `proudGeonQuizProgress:${subject}:${quizType}`;
}

function getQuizProgress(subject, quizType) {
    try {
        const raw = Number(localStorage.getItem(quizProgressKey(subject, quizType)) || 0);
        return Number.isFinite(raw) ? Math.max(0, Math.min(80, Math.floor(raw))) : 0;
    } catch (error) {
        console.warn("Could not read quiz progress safely.", error);
        return 0;
    }
}

function setQuizProgress(subject, quizType, level) {
    const safeLevel = safeNonNegativeInt(level, 0, 80);
    try {
        localStorage.setItem(quizProgressKey(subject, quizType), String(safeLevel));
    } catch (error) {
        console.warn("Could not save quiz progress safely.", error);
    }
}

function quizUsedQuestionsKey(subject, quizType) {
    return getActiveQuestioner() === "new"
        ? `proudGeonQuizUsedQuestions:new:${subject}:${quizType}`
        : `proudGeonQuizUsedQuestions:${subject}:${quizType}`;
}

function getUsedQuestionIds(subject, quizType) {
    try {
        const saved = JSON.parse(localStorage.getItem(quizUsedQuestionsKey(subject, quizType) || "[]"));
        return Array.isArray(saved) ? saved.map(String) : [];
    } catch (error) {
        return [];
    }
}

function saveUsedQuestionIds(subject, quizType, ids) {
    const unique = [...new Set((ids || []).map(String))].slice(0, 80);
    try {
        localStorage.setItem(quizUsedQuestionsKey(subject, quizType), JSON.stringify(unique));
    } catch (error) {
        console.warn("Could not save used question IDs safely.", error);
    }
}

function clearUsedQuestionIds(subject, quizType) {
    localStorage.removeItem(quizUsedQuestionsKey(subject, quizType));
}

const SUBJECT_STATS_KEY = "proudGeonQuizSubjectStatsV1";

function subjectStatsStorageKey() {
    return `${SUBJECT_STATS_KEY}:${getActiveQuestioner()}`;
}

function createEmptySubjectStats() {
    const stats = {};
    titleSubjects.forEach(subject => {
        stats[subject] = {
            total: 0,
            correct: 0,
            incorrect: 0,
            highestLevel: 0
        };
    });
    return stats;
}

function getSubjectStats() {
    const saved = readStoredJSON(subjectStatsStorageKey(), {});
    const stats = createEmptySubjectStats();

    titleSubjects.forEach(subject => {
        const source = saved?.[subject] || {};
        stats[subject] = {
            total: safeNonNegativeInt(source.total, 0),
            correct: safeNonNegativeInt(source.correct, 0),
            incorrect: safeNonNegativeInt(source.incorrect, 0),
            highestLevel: safeNonNegativeInt(source.highestLevel, 0, 80)
        };
        stats[subject].incorrect = Math.max(
            stats[subject].incorrect,
            stats[subject].total - stats[subject].correct
        );
    });

    return stats;
}

function saveSubjectStats(stats) {
    writeStoredJSON(subjectStatsStorageKey(), stats);
}

function recordSubjectAnswerStat(subject, correct) {
    if (!titleSubjects.includes(subject)) return;

    const stats = getSubjectStats();
    const row = stats[subject];
    row.total += 1;
    if (correct) row.correct += 1;
    else row.incorrect += 1;
    saveSubjectStats(stats);
}

function getSubjectStatAccuracy(row) {
    return row?.total > 0
        ? Math.round((row.correct / row.total) * 100)
        : 0;
}

function getSubjectHighestCompletedLevel(subject) {
    if (!titleSubjects.includes(subject)) return 0;

    return Math.max(
        getQuizProgress(subject, "SUBJECT 1"),
        getQuizProgress(subject, "SUBJECT 2")
    );
}

function getSubjectMasteryTier(level) {
    const safeLevel = Math.max(0, Math.min(80, Math.floor(Number(level) || 0)));
    const labels = [
        "BEGINNER",
        "LEARNER",
        "SKILLED",
        "ADVANCED",
        "EXPERT",
        "MASTER",
        "ELITE",
        "CHAMPION",
        "GRAND MASTER"
    ];
    const tier = safeLevel >= 80 ? 8 : Math.floor(safeLevel / 10);
    return { tier, label: labels[tier] };
}

function getContinueTarget() {
    let best = { subject: "MATH", quizType: "SUBJECT 1", level: 1, completed: 0 };
    titleSubjects.forEach(subject => {
        ["SUBJECT 1", "SUBJECT 2"].forEach(quizType => {
            const completed = getSubjectHighestCompletedLevel(subject);
            const saved = getQuizProgress(subject, quizType);
            const level = Math.max(1, Math.min(80, Number(saved || 0) + 1));
            if (completed > best.completed || (completed === best.completed && level < best.level)) {
                best = { subject, quizType, level, completed };
            }
        });
    });
    return best;
}

function updateContinueJourneyCard() {
    const title = document.getElementById("continueJourneyTitle");
    const meta = document.getElementById("continueJourneyMeta");
    const progress = document.getElementById("continueJourneyProgress");
    const fill = document.getElementById("continueJourneyFill");
    const track = document.querySelector(".continue-progress");
    const button = document.getElementById("continueJourneyButton");
    if (!title || !meta || !progress || !fill || !button) return;
    const target = getContinueTarget();
    const next = Math.min(80, target.level);
    title.textContent = `${target.subject} • ${target.quizType}`;
    meta.textContent = `Next level: ${String(next).padStart(2, "0")} • Best completed: ${target.completed}/80`;
    const pct = Math.round((target.completed / 80) * 100);
    fill.style.width = `${pct}%`;
    progress.textContent = `${target.completed} / 80`;
    if (track) {
        track.setAttribute("aria-valuenow", String(target.completed));
        track.setAttribute("aria-valuetext", `Level ${target.completed} of 80`);
    }
    button.dataset.subject = target.subject;
    button.dataset.quizType = target.quizType;
    button.dataset.level = String(next);
}

function continueJourney() {
    const button = document.getElementById("continueJourneyButton");
    if (!button) return;
    const subject = button.dataset.subject || "MATH";
    const quizType = button.dataset.quizType === "SUBJECT 2" ? "SUBJECT 2" : "SUBJECT 1";
    const level = Number(button.dataset.level || 1);
    selectedSubject = subject;
    selectedQuizType = quizType;
    startQuizAtSelectedLevel(quizType === "SUBJECT 1" ? "A" : "B", level);
}

function updateHomeSubjectUnlocks() {
    const questionerIndicator = document.getElementById("homeQuestionerIndicator");
    if (questionerIndicator) {
        questionerIndicator.textContent = getActiveQuestioner() === "new" ? "QUESTIONER: NEW" : "QUESTIONER: PREVIOUS";
    }

    document.querySelectorAll(".subject-progress-row[data-subject]").forEach(row => {
        const subject = row.dataset.subject || "";
        if (!titleSubjects.includes(subject)) return;

        const highestCompleted = Math.max(0, Math.min(80, getSubjectHighestCompletedLevel(subject)));
        const percent = (highestCompleted / 80) * 100;
        const tier = highestCompleted >= 80 ? 8 : Math.floor(highestCompleted / 10);
        const levelEl = row.querySelector(".subject-progress-level");
        const masteryEl = row.querySelector(".subject-mastery-label");
        const fill = row.querySelector(".subject-progress-fill");
        const track = row.querySelector(".subject-progress-track");
        const mastery = getSubjectMasteryTier(highestCompleted);

        row.classList.remove(...Array.from({ length: 9 }, (_, i) => `progress-tier-${i}`));
        row.classList.add(`progress-tier-${mastery.tier}`);

        if (levelEl) levelEl.textContent = `LEVEL ${highestCompleted}/80`;
        if (masteryEl) {
            masteryEl.textContent = mastery.label;
            masteryEl.setAttribute("aria-label", `${subject} mastery: ${mastery.label}`);
        }
        if (fill) fill.style.width = `${percent}%`;
        if (track) {
            track.setAttribute("aria-valuenow", String(highestCompleted));
            track.setAttribute("aria-valuetext", `Level ${highestCompleted} of 80, ${mastery.label}`);
        }
    });
    updateContinueJourneyCard();
}

function saveGlobalGameData() {
    if (!isDailyChallengeActive()) {
        gameData.currentScore = safeNonNegativeInt(quizState.score, 0);
        gameData.currentLevel = quizState.index;
        gameData.highestScore = Math.max(
            safeNonNegativeInt(gameData.highestScore, 0),
            safeNonNegativeInt(quizState.score, 0)
        );
        gameData.highestLevel = Math.max(
            safeNonNegativeInt(gameData.highestLevel, 0, 80),
            safeNonNegativeInt(quizState.index, 0, 80)
        );
    }
    gameData.coins = safeNonNegativeInt(quizState.coins, 0);
    gameData.points = safeNonNegativeInt(quizState.points, 0);
    gameData.gamesPlayed = safeNonNegativeInt(gameData.gamesPlayed, 0);
    gameData.wins = safeNonNegativeInt(gameData.wins, 0);
    gameData.losses = safeNonNegativeInt(gameData.losses, 0);
    gameData.correctAnswers = safeNonNegativeInt(gameData.correctAnswers, 0);
    gameData.totalQuestions = safeNonNegativeInt(gameData.totalQuestions, 0);
    gameData = sanitizeGameData(gameData);
    updateDisplay();
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    checkSpecialAchievementsForBalance();
}

function stopQuizTimer() {
    if (quizState.timerId) {
        clearInterval(quizState.timerId);
        quizState.timerId = null;
    }
}

function startQuizTimer() {
    stopQuizTimer();
    quizState.timer = 30;
    updateQuizTimer();
    quizState.timerId = setInterval(() => {
        quizState.timer--;
        updateQuizTimer();
        if (quizState.timer <= 0) {
            stopQuizTimer();
            handleQuizAnswer(null, true);
        }
    }, 1000);
}

function updateQuizTimer() {
    const el = document.getElementById("quizTimer");
    if (el) el.textContent = Math.max(0, quizState.timer);
}

function prepareQuestion(question) {
    aiReaderStop();

    if (isDailyChallengeActive() && question?.subject) {
        quizState.subject = question.subject;
    }

    const choices = shuffleArray(question.choices);
    quizState.currentCorrect = question.answer;
    quizState.selected = false;
    quizState.levelHadWrongAnswer = false;
    quizState.questionStartedAt = Date.now();
    resetPerQuestionItemState();

    const qText = document.getElementById("quizQuestionText");
    const qBox = document.getElementById("quizQuestionBox");
    const buttons = [...document.querySelectorAll(".quiz-answer")];
    const next = document.getElementById("quizNextButton");

    if (qText) qText.textContent = question.question;
    if (qBox) qBox.classList.remove("correct", "wrong");
    const explanation = document.getElementById("quizExplanation");
    if (explanation) {
        explanation.classList.remove("show");
        explanation.textContent = "";
    }

    buttons.forEach((button, i) => {
        button.disabled = false;
        button.classList.remove("selected", "correct", "wrong");
        button.textContent = `${String.fromCharCode(65 + i)}. ${choices[i]}`;
        button.dataset.answer = choices[i];
        button.onclick = () => handleQuizAnswer(choices[i], false, button);
    });

    if (next) {
        next.disabled = true;
        next.textContent = "NEXT →";
        next.onclick = nextQuizStep;
    }

    if (isReviewerActive()) {
        stopQuizTimer();
        const timerEl = document.getElementById("quizTimer");
        if (timerEl) timerEl.textContent = "—";
        renderQuizItemBar();
    } else {
        startQuizTimer();
        renderQuizItemBar();
    }
    aiReaderRefresh();
}

function updateQuizDisplay() {
    const level = quizState.index + 1;
    const levelEl = document.getElementById("quizLevel");
    const qNumEl = document.getElementById("quizQuestionNumber");
    const coins = document.getElementById("quizCoins");
    const score = document.getElementById("quizScore");
    const points = document.getElementById("quizPoints");
    const lives = document.getElementById("quizLives");

    if (levelEl) levelEl.textContent = level;
    if (qNumEl) qNumEl.textContent = level;
    const totalEl = document.getElementById("quizQuestionTotal");
    if (totalEl) totalEl.textContent = isReviewerActive() ? quizState.questions.length : (isDailyChallengeActive() ? DAILY_CHALLENGE_SIZE : 80);
    if (levelEl) levelEl.textContent = isReviewerActive() ? "REVIEW" : (isDailyChallengeActive() ? `DAILY ${level}` : level);
    if (coins) coins.textContent = quizState.coins;
    if (score) score.textContent = quizState.score;
    if (points) points.textContent = quizState.points;
    if (lives) lives.textContent = quizState.lives;
    updateStreakDisplay(false);
    renderQuizItemBar();
}

function playGame(subject) {
    openSubjectSelection(subject);
}

window.playGame = playGame;
function startSelectedQuiz(box) {
    openLevelSelection(box);
}

window.startSelectedQuiz = startSelectedQuiz;

function startQuizAtSelectedLevel(box, selectedLevel) {
    const subject = selectedSubject;
    const quizType = box === "A" ? "SUBJECT 1" : "SUBJECT 2";
    const safeSelectedLevel = Number(selectedLevel);

    if (!isValidSubject(subject) || !isValidQuizType(quizType)) {
        alert("The selected subject or quiz is not available.");
        return;
    }

    if (!Number.isInteger(safeSelectedLevel) || safeSelectedLevel < 1 || safeSelectedLevel > 80) {
        alert("Please select a level from 01 to 80.");
        return;
    }

    const source = getSubjectQuestionPool(subject, quizType);

    if (source.length < 80) {
        alert("The question bank for this quiz is not available.");
        return;
    }

    const saved = getQuizProgress(subject, quizType);
    const usedQuestionIds = getUsedQuestionIds(subject, quizType)
        .filter(id => source.some(q => String(q.id) === String(id)));

    selectedQuizType = quizType;
    selectedSubject = subject;
    levelSelectionSelectedLevel = safeSelectedLevel;

    quizState = {
        subject,
        quizType,
        questions: buildSessionQuestions(source, saved, usedQuestionIds, true),
        index: safeSelectedLevel - 1,
        score: 0,
        coins: Number(gameData.coins || 0),
        points: Number(gameData.points || 0),
        lives: 8,
        selected: false,
        currentCorrect: "",
        timer: 30,
        timerId: null,
        startedAt: Date.now(),
        bestCompleted: saved,
        streak: 0,
        bestStreak: 0,
        streakMilestonesRewarded: [],
        levelHadWrongAnswer: false,
        questionStartedAt: 0,
        usedQuestionIds,
        itemState: {
            fiftyFiftyUsed: false,
            secondChanceUsed: false,
            hintUsed: false
        }
    };

    const levelPanel = document.getElementById("levelSelection");
    const quizScreen = document.getElementById("quizScreen");
    if (levelPanel) {
        if (levelPanel.contains(document.activeElement)) {
            document.activeElement.blur();
        }
        levelPanel.classList.remove("show");
        levelPanel.setAttribute("aria-hidden", "true");
    }
    if (quizScreen) {
        quizScreen.classList.add("show");
        quizScreen.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("quiz-active");

    aiReaderStop();
    stopHomeMusic();
    stopMottoMusic();
    stopVictoryMusic();
    startGameMusic();

    gameData.gamesPlayed = Number(gameData.gamesPlayed || 0) + 1;
    saveGlobalGameData();
    renderCurrentQuizQuestion();
}

function renderCurrentQuizQuestion() {
    if (!quizState.questions.length) return;
    if (isReviewerActive() && quizState.index >= quizState.questions.length) {
        completeReviewerMode();
        return;
    }
    if (isDailyChallengeActive() && quizState.index >= DAILY_CHALLENGE_SIZE) {
        completeDailyChallenge();
        return;
    }
    if (!isReviewerActive() && !isDailyChallengeActive() && quizState.index >= 80) {
        showVictoryScreen();
        return;
    }
    updateQuizDisplay();
    prepareQuestion(quizState.questions[quizState.index]);
}

function handleQuizAnswer(value, timedOut = false, button = null) {
    if (quizState.selected) return;

    const retryAttempt = Boolean(
        quizState.itemState.secondChanceUsed &&
        !quizState.itemState.awaitingSecondChance
    );
    const correct = !timedOut && value === quizState.currentCorrect;
    const canOfferSecondChance = !retryAttempt &&
        !timedOut &&
        hasItem("secondChance") &&
        !quizState.itemState.secondChanceUsed;

    quizState.selected = true;
    stopQuizTimer();

    const buttons = [...document.querySelectorAll(".quiz-answer")];
    buttons.forEach(b => b.disabled = true);

    const qBox = document.getElementById("quizQuestionBox");
    if (button) button.classList.add(correct ? "correct" : "wrong");
    if (qBox) qBox.classList.add(correct ? "correct" : "wrong");
    showAnswerFeedback(
        correct ? "correct" : "wrong",
        timedOut ? "⏱ TIME'S UP" : (correct ? "✓ CORRECT" : "✕ WRONG")
    );

    if (isReviewerActive()) {
        const currentQuestion = quizState.questions[quizState.index];
        if (button) button.classList.add(correct ? "correct" : "wrong");
        const explanation = currentQuestion?.explanation;
        let explanationEl = document.getElementById("reviewerExplanation");
        if (!explanationEl) {
            explanationEl = document.createElement("div");
            explanationEl.id = "reviewerExplanation";
            explanationEl.className = "reviewer-explanation";
            const qBox = document.getElementById("quizQuestionBox");
            qBox?.insertAdjacentElement("afterend", explanationEl);
        }
        explanationEl.replaceChildren();
        const heading = document.createElement("strong");
        heading.textContent = correct ? "✓ CORRECT" : "✗ INCORRECT";
        explanationEl.appendChild(heading);
        if (!correct) {
            const answerEl = document.createElement("span");
            answerEl.textContent = `Correct answer: ${String(quizState.currentCorrect || "Unavailable")}`;
            explanationEl.appendChild(answerEl);
        }
        if (explanation) {
            const detailEl = document.createElement("span");
            detailEl.textContent = String(explanation);
            explanationEl.appendChild(detailEl);
        }
        explanationEl.classList.add("show");
        const next = document.getElementById("quizNextButton");
        if (next) {
            next.disabled = false;
            next.textContent = quizState.index >= quizState.questions.length - 1 ? "VIEW RESULT" : "NEXT →";
        }
        aiReaderStop();
        if (aiReaderIsEnabled()) aiReaderSpeak(correct ? "Excellent." : "Incorrect.");
        return;
    }

    if (correct) {
        /*
         * A question protected by Second Chance is counted exactly once:
         * the initial wrong attempt is not finalized until the retry.
         */
        gameData.totalQuestions = Number(gameData.totalQuestions || 0) + 1;
        gameData.correctAnswers = Number(gameData.correctAnswers || 0) + 1;
        quizState.levelCorrectAnswers = safeNonNegativeInt(quizState.levelCorrectAnswers, 0) + 1;
        recordSubjectAnswerStat(quizState.subject, true);

        const reward = getDifficultyReward(quizState.index + 1);
        const nextStreak = safeNonNegativeInt(quizState.streak, 0, 100000) + 1;
        const comboReward = applyComboScoreBonus(reward.score, nextStreak);
        quizState.score += comboReward.score;
        quizState.coins += reward.coins;
        quizState.points += reward.points;
        quizState.levelScoreEarned = safeNonNegativeInt(quizState.levelScoreEarned, 0) + comboReward.score;
        quizState.levelCoinsEarned = safeNonNegativeInt(quizState.levelCoinsEarned, 0) + reward.coins;
        quizState.levelPointsEarned = safeNonNegativeInt(quizState.levelPointsEarned, 0) + reward.points;
        registerCorrectStreakAnswer();
        checkSpecialAchievementOnCorrect();
        playAudioElement("correctSound");

        quizState.itemState.awaitingSecondChance = false;
    } else {
        quizState.levelHadWrongAnswer = true;
        playAudioElement("wrongSound");
        buttons.forEach(b => {
            if (b.dataset.answer === quizState.currentCorrect) b.classList.add("correct");
        });

        if (canOfferSecondChance) {
            /*
             * Keep the existing Lives value untouched while the player
             * decides whether to spend the Second Chance item.
             */
            quizState.itemState.awaitingSecondChance = true;
            showItemFeedback("🔄 Second Chance available.");
        } else {
            gameData.totalQuestions = Number(gameData.totalQuestions || 0) + 1;
            recordSubjectAnswerStat(quizState.subject, false);
            quizState.itemState.awaitingSecondChance = false;
            breakQuizStreak();
            quizState.lives -= 1;
        }
    }

    aiReaderStop();

    if (aiReaderIsEnabled()) {
        if (timedOut) {
            aiReaderSpeak("Time's up.");
        } else if (correct) {
            aiReaderSpeak("Excellent.");
        } else {
            aiReaderSpeak("Incorrect.");
        }
    }

    const currentQuestion = quizState.questions[quizState.index];
    let normalExplanation = document.getElementById("quizExplanation");
    if (!normalExplanation) {
        normalExplanation = document.createElement("div");
        normalExplanation.id = "quizExplanation";
        normalExplanation.className = "quiz-explanation";
        const answerContainer = document.getElementById("quizAnswers");
        answerContainer?.insertAdjacentElement("afterend", normalExplanation);
    }
    if (currentQuestion?.explanation) {
        normalExplanation.replaceChildren();
        const heading = document.createElement("strong");
        const detail = document.createElement("span");
        heading.textContent = correct ? "EXPLANATION" : "CORRECT ANSWER";
        detail.textContent = String(correct ? currentQuestion.explanation : `${quizState.currentCorrect} — ${currentQuestion.explanation}`);
        normalExplanation.append(heading, detail);
        normalExplanation.classList.add("show");
    }

    if (currentQuestion?.id) {
        quizState.usedQuestionIds = [
            ...new Set([...(quizState.usedQuestionIds || []), String(currentQuestion.id)])
        ];
        if (!isDailyChallengeActive()) {
            saveUsedQuestionIds(quizState.subject, quizState.quizType, quizState.usedQuestionIds);
        }
    }

    const next = document.getElementById("quizNextButton");
    if (next) next.disabled = false;

    if (quizState.lives <= 0) {
        if (next) next.textContent = isDailyChallengeActive() ? "VIEW RESULT" : "VIEW GAME OVER";
    } else if (next) {
        next.textContent = isDailyChallengeActive()
            ? (quizState.index >= DAILY_CHALLENGE_SIZE - 1 ? "VIEW RESULT" : "NEXT →")
            : (quizState.index >= 79 ? "VIEW VICTORY" : "NEXT →");
    }

    saveGlobalGameData();
    renderQuizItemBar();
}

function nextQuizStep() {
    if (!quizState.selected) return;

    if (isReviewerActive()) {
        const explanationEl = document.getElementById("reviewerExplanation");
        if (explanationEl) {
            explanationEl.classList.remove("show");
            explanationEl.innerHTML = "";
        }
        quizState.index += 1;
        quizState.selected = false;
        renderCurrentQuizQuestion();
        return;
    }

    if (quizState.itemState.awaitingSecondChance) {
        /*
         * The player declined to spend Second Chance. Finalize this
         * question now, exactly once, using the normal wrong-answer Life rule.
         */
        quizState.itemState.awaitingSecondChance = false;
        gameData.totalQuestions = Number(gameData.totalQuestions || 0) + 1;
        recordSubjectAnswerStat(quizState.subject, false);
        breakQuizStreak();
        quizState.lives -= 1;
        if (quizState.lives <= 0) {
            saveGlobalGameData();
            showGameOverScreen();
            return;
        }
    }

    const levelCompleted = quizState.index + 1;
    checkSpecialAchievementOnLevelComplete();

    if (isDailyChallengeActive()) {
        if (quizState.lives <= 0) {
            failDailyChallenge();
            return;
        }
        if (levelCompleted >= DAILY_CHALLENGE_SIZE) {
            quizState.index = DAILY_CHALLENGE_SIZE;
            completeDailyChallenge();
            return;
        }
        quizState.index++;
        renderCurrentQuizQuestion();
        return;
    }

    setQuizProgress(quizState.subject, quizState.quizType, Math.max(getQuizProgress(quizState.subject, quizState.quizType), levelCompleted));
    recordQuizLevelCompleted(quizState.subject, quizState.quizType, levelCompleted);

    if (quizState.lives <= 0) {
        showGameOverScreen();
        return;
    }

    if (levelCompleted >= 80) {
        quizState.index = 80;
        clearUsedQuestionIds(quizState.subject, quizState.quizType);
        quizState.usedQuestionIds = [];
        showVictoryScreen();
        return;
    }

    quizState.index++;

    if (levelCompleted % 5 === 0) {
        showAchievementScreen(levelCompleted);
    } else {
        renderCurrentQuizQuestion();
    }
}

function showAchievementScreen(level) {
    aiReaderStop();
    aiReaderLastScreenKey = "";
    aiReaderLastQuizKey = "";
    stopQuizTimer();
    stopGameMusic();

    const count = getUnlockedTitleCount(level);
    const titles = titleData?.[quizState.subject]?.[quizState.quizType] || [];
    const titleName = titles[count - 1] || "Milestone Achieved";

    const title = document.getElementById("achievementTitle");
    const levelText = document.getElementById("achievementLevelText");
    const score = document.getElementById("achievementScore");
    const coins = document.getElementById("achievementCoins");
    const points = document.getElementById("achievementPoints");
    const lives = document.getElementById("achievementLives");
    const titleNameEl = document.getElementById("achievementTitleName");

    if (title) title.textContent = `ACHIEVEMENT ${count}`;
    if (levelText) levelText.textContent = `LEVEL ${level} COMPLETE`;
    if (score) score.textContent = quizState.score;
    if (coins) coins.textContent = quizState.coins;
    if (points) points.textContent = quizState.points;
    if (lives) lives.textContent = quizState.lives;
    if (titleNameEl) titleNameEl.textContent = titleName;

    const overlay = document.getElementById("achievementScreen");
    if (overlay) {
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
    }
    aiReaderRefresh();
}

function continueAfterAchievement() {
    const overlay = document.getElementById("achievementScreen");
    if (overlay) {
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
    }
    startGameMusic();
    renderCurrentQuizQuestion();
    aiReaderRefresh();
}

function showGameOverScreen() {
    if (isDailyChallengeActive()) {
        failDailyChallenge();
        return;
    }
    aiReaderStop();
    aiReaderLastScreenKey = "";
    aiReaderLastQuizKey = "";
    stopQuizTimer();
    stopGameMusic();

    // Game Over always sends this quiz back to Level 1.
    quizState.index = 0;
    setQuizProgress(quizState.subject, quizState.quizType, 0);
    clearUsedQuestionIds(quizState.subject, quizState.quizType);
    quizState.usedQuestionIds = [];
    quizState.streak = 0;
    resetStreakMilestones();
    updateStreakDisplay(false);

    gameData.losses = Number(gameData.losses || 0) + 1;
    saveGlobalGameData();

    const s=document.getElementById("gameOverScore");
    const c=document.getElementById("gameOverCoins");
    const p=document.getElementById("gameOverPoints");
    if(s)s.textContent=quizState.score;
    if(c)c.textContent=quizState.coins;
    if(p)p.textContent=quizState.points;

    const overlay=document.getElementById("gameOverScreen");
    if(overlay){ overlay.classList.add("show"); overlay.setAttribute("aria-hidden","false"); }
    aiReaderRefresh();
}


/* ========================================
   PHASE — GAME FEEL PART 4/6
   Reward presentation + micro-animation only.
   Uses existing reward values and existing save logic.
======================================== */
function refreshGameFeelRewardPresentation() {
    const ids = ["victoryScoreEarned", "victoryCoins", "victoryPoints"];
    ids.forEach((id, index) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("game-feel-reward-pop");
        void el.offsetWidth;
        el.classList.add("game-feel-reward-pop");
        el.style.animationDelay = `${index * 70}ms`;
    });

    const card = document.querySelector("#victoryScreen .victory-reward-card");
    if (card) {
        card.classList.remove("game-feel-reward-card-in");
        void card.offsetWidth;
        card.classList.add("game-feel-reward-card-in");
    }
}

function refreshGameFeelVictoryPresentation() {
    const overlay = document.getElementById("victoryScreen");
    if (!overlay) return;
    overlay.classList.remove("game-feel-victory-refresh");
    void overlay.offsetWidth;
    overlay.classList.add("game-feel-victory-refresh");
    refreshGameFeelRewardPresentation();
}

function showVictoryScreen() {
    if (isDailyChallengeActive()) {
        completeDailyChallenge();
        return;
    }

    // Prevent accidental re-entry from processing the same completion twice.
    if (quizState.victoryShown) return;
    quizState.victoryShown = true;

    aiReaderStop();
    aiReaderLastScreenKey = "";
    aiReaderLastQuizKey = "";
    stopQuizTimer();
    stopGameMusic();
    stopHomeMusic();

    const finalStreak = safeNonNegativeInt(quizState.streak, 0, 100000);
    const levelCorrectAnswers = safeNonNegativeInt(quizState.levelCorrectAnswers, 0, 80);
    const levelScoreEarned = safeNonNegativeInt(quizState.levelScoreEarned, 0);
    const levelCoinsEarned = safeNonNegativeInt(quizState.levelCoinsEarned, 0);
    const levelPointsEarned = safeNonNegativeInt(quizState.levelPointsEarned, 0);

    // Keep the existing completion/reward/progression architecture unchanged.
    quizState.streak = 0;
    resetStreakMilestones();
    updateStreakDisplay(false);
    startVictoryMusic();

    gameData.wins = Number(gameData.wins || 0) + 1;
    gameData.highestScore = Math.max(Number(gameData.highestScore || 0), quizState.score);
    gameData.highestLevel = 80;
    saveGlobalGameData();
    setQuizProgress(quizState.subject, quizState.quizType, 80);
    recordQuizLevelCompleted(quizState.subject, quizState.quizType, 80);
    checkSpecialAchievementsForSubject(quizState.subject);

    const titles = titleData?.[quizState.subject]?.[quizState.quizType] || [];
    const overall = titles[titles.length - 1] || "Ultimate Champion";
    const subjectProgress = getSubjectHighestCompletedLevel(quizState.subject);
    const mastery = getSubjectMasteryTier(subjectProgress);

    const fields = {
        victoryLevel: 80,
        victoryScore: quizState.score,
        victoryCorrect: levelCorrectAnswers,
        victoryPoints: `+${levelPointsEarned}`,
        victoryCoins: `+${levelCoinsEarned}`,
        victoryScoreEarned: `+${levelScoreEarned}`,
        victoryStreak: finalStreak,
        victoryProgress: `${getQuizProgress(quizState.subject, quizState.quizType)} / 80`,
        victorySubjectProgress: `${subjectProgress} / 80`,
        victoryMastery: mastery.label,
        victoryTitle: overall
    };

    Object.entries(fields).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    });

    // Presentation only: all values above come from the existing quiz/completion state.
    refreshGameFeelVictoryPresentation();

    const overlay = document.getElementById("victoryScreen");
    if (overlay) {
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
    }
    aiReaderRefresh();
}

function restartCurrentQuiz() {
    setQuizProgress(quizState.subject, quizState.quizType, 0);
    clearUsedQuestionIds(quizState.subject, quizState.quizType);
    quizState.index = 0;
    closeResultOverlays();
    const answerFeedback = document.getElementById("answerFeedback");
    if (answerFeedback) answerFeedback.classList.remove("show");
    startQuizAtSelectedLevel(
        quizState.quizType === "SUBJECT 1" ? "A" : "B",
        1
    );
}

function closeResultOverlays() {
    ["gameOverScreen", "victoryScreen", "achievementScreen"].forEach(id => {
        const el = document.getElementById(id);

        if (el) {
            if (el.contains(document.activeElement)) {
                document.activeElement.blur();
            }

            el.classList.remove("show");
            el.setAttribute("aria-hidden", "true");
        }
    });

    stopVictoryMusic();
}

function goToSubjectFromResult() {
    closeResultOverlays();
    closeQuizVisualOnly();
    openSubjectSelection(quizState.subject);
}

function goHomeFromResult() {
    closeResultOverlays();
    closeQuizVisualOnly();
    updateHomeSubjectUnlocks();
    startHomeMusic();
}

function closeQuizVisualOnly() {
    aiReaderStop();
    aiReaderLastScreenKey = "";
    aiReaderLastQuizKey = "";
    stopQuizTimer();
    stopGameMusic();
    const quiz=document.getElementById("quizScreen");
    if(quiz){quiz.classList.remove("show");quiz.setAttribute("aria-hidden","true");}
    document.body.classList.remove("quiz-active");
    document.body.classList.remove("reviewer-active");
    const reviewerExplanation = document.getElementById("reviewerExplanation");
    if (reviewerExplanation) {
        reviewerExplanation.classList.remove("show");
        reviewerExplanation.replaceChildren();
    }
    renderQuizItemBar();
}


function closeQuizScreen() {
    if (!document.getElementById("quizScreen")?.classList.contains("show")) return;
    if (isReviewerActive()) {
        exitReviewerModeToPanel();
        return;
    }
    const confirm=document.getElementById("quizBackConfirm");
    if(confirm){confirm.classList.add("show");confirm.setAttribute("aria-hidden","false");}
}

function closeQuizBackConfirm() {
    const confirm=document.getElementById("quizBackConfirm");
    if(confirm){confirm.classList.remove("show");confirm.setAttribute("aria-hidden","true");}
}

function confirmQuizBack(destination) {
    closeQuizBackConfirm();
    const leavingDaily = isDailyChallengeActive();
    const leavingReviewer = isReviewerActive();
    if (leavingReviewer) {
        exitReviewerModeToPanel();
        return;
    }
    stopQuizTimer();
    stopGameMusic();
    closeQuizVisualOnly();
    if (leavingDaily) resetQuizModeAfterExit();
    if (destination === "level" && !leavingDaily) {
        selectedSubject = quizState.subject;
        selectedQuizType = quizState.quizType;
        levelSelectionSelectedLevel = quizState.index + 1;

        // Reveal the destination before hiding the Quiz Screen.
        // This prevents the Home Screen underneath from ever becoming
        // visible during the destination panel's fade-in.
        const levelPanel = document.getElementById("levelSelection");
        if (levelPanel) {
            const previousTransition = levelPanel.style.transition;
            levelPanel.style.transition = "none";
            openLevelSelection(selectedQuizType);
            levelSelectionSelectedLevel = quizState.index + 1;
            renderLevelSelection();
            requestAnimationFrame(() => {
                levelPanel.style.transition = previousTransition;
            });
        } else {
            openLevelSelection(selectedQuizType);
            levelSelectionSelectedLevel = quizState.index + 1;
            renderLevelSelection();
        }
    } else if(destination === "subject" && !leavingDaily) {
        // Reveal the destination before hiding the Quiz Screen so the
        // Home Screen cannot flash through the Subject Selection fade-in.
        const subjectPanel = document.getElementById("subjectSelection");
        if (subjectPanel) {
            const previousTransition = subjectPanel.style.transition;
            subjectPanel.style.transition = "none";
            openSubjectSelection(quizState.subject);
            requestAnimationFrame(() => {
                subjectPanel.style.transition = previousTransition;
            });
        } else {
            openSubjectSelection(quizState.subject);
        }
    } else {
        updateHomeSubjectUnlocks();
        updateDailyChallengePanel();
        startHomeMusic();
    }
}


// ========================================
// CLOSE POPUP OUTSIDE
// ========================================

document
    .getElementById(
        "comingSoonPopup"
    )
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target === this
            ) {

                closeComingSoon();

            }

        }
    );


// ========================================
// PROFILE SELECTION
// ========================================
const PROFILE_STORAGE_KEY = "proudGeonQuizProfileV1";
const PROFILE_OPTIONS = Object.freeze([
    { id: "explorer", icon: "🥷", name: "NINJA", description: "Quick and focused." },
    { id: "scholar", icon: "💂", name: "GUARD", description: "Steady and disciplined." },
    { id: "strategist", icon: "🫅", name: "ROYAL", description: "Confident and composed." },
    { id: "challenger", icon: "🧑‍✈️", name: "PILOT", description: "Ready for every level." },
    { id: "scientist", icon: "🧑‍🔬", name: "SCIENTIST", description: "Curious and analytical." },
    { id: "doctor", icon: "🧑‍⚕️", name: "DOCTOR", description: "Careful and precise." },
    { id: "mechanic", icon: "🧑‍🔧", name: "MECHANIC", description: "Practical and problem-solving." },
    { id: "worker", icon: "🧑‍🏭", name: "WORKER", description: "Consistent and determined." },
    { id: "farmer", icon: "🧑‍🌾", name: "FARMER", description: "Patient and persistent." },
    { id: "teacher", icon: "🧑‍🏫", name: "TEACHER", description: "Ready to learn and share." },
    { id: "student", icon: "🧑‍🎓", name: "STUDENT", description: "Always learning." },
    { id: "business", icon: "🧑‍💼", name: "BUSINESS", description: "Focused on smart choices." },
    { id: "judge", icon: "🧑‍⚖️", name: "JUDGE", description: "Fair and thoughtful." },
    { id: "developer", icon: "🧑‍💻", name: "DEVELOPER", description: "Logical and creative." },
    { id: "singer", icon: "🧑‍🎤", name: "SINGER", description: "Bold and expressive." },
    { id: "artist", icon: "🧑‍🎨", name: "ARTIST", description: "Creative and original." },
    { id: "chef", icon: "🧑‍🍳", name: "CHEF", description: "Skilled and resourceful." },
    { id: "turban", icon: "👳", name: "TRADITIONAL", description: "Calm and confident." }
]);

let selectedProfileId = localStorage.getItem(PROFILE_STORAGE_KEY) || migratedSave?.player?.profileId || "explorer";
if (!PROFILE_OPTIONS.some(profile => profile.id === selectedProfileId)) selectedProfileId = "explorer";
let pendingProfileId = selectedProfileId;

function getSelectedProfile() {
    return PROFILE_OPTIONS.find(profile => profile.id === selectedProfileId) || PROFILE_OPTIONS[0];
}

function renderProfileChoices() {
    const container = document.getElementById("profileChoices");
    if (!container) return;
    container.innerHTML = PROFILE_OPTIONS.map(profile => `
        <button type="button"
                class="profile-choice ${pendingProfileId === profile.id ? "selected" : ""}"
                aria-label="${profile.name}"
                aria-pressed="${pendingProfileId === profile.id}"
                onclick="selectProfile('${profile.id}')">
            <span class="profile-choice-icon">${profile.icon}</span>
            <span class="profile-choice-mark">${pendingProfileId === profile.id ? "✓" : ""}</span>
        </button>
    `).join("");
}

function selectProfile(profileId) {
    if (!PROFILE_OPTIONS.some(profile => profile.id === profileId)) return;
    pendingProfileId = profileId;
    renderProfileChoices();
}

function applyProfileDisplay() {
    const profile = getSelectedProfile();
    const label = document.getElementById("profileCurrentName");
    const avatar = document.getElementById("profileAvatar");
    if (label) label.textContent = profile.name;
    if (avatar) {
        avatar.dataset.profile = profile.id;
        avatar.setAttribute("aria-label", `Profile: ${profile.name}`);
        avatar.innerHTML = `<span class="profile-avatar-emoji" aria-hidden="true">${profile.icon}</span>`;
    }
}

function openProfilePanel() {
    const panel = document.getElementById("profilePanel");
    if (!panel) return;
    closePointsConversionPanel();
    pendingProfileId = selectedProfileId;
    renderProfileChoices();
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function saveProfile() {
    if (!PROFILE_OPTIONS.some(profile => profile.id === pendingProfileId)) return;
    selectedProfileId = pendingProfileId;
    localStorage.setItem(PROFILE_STORAGE_KEY, selectedProfileId);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    applyProfileDisplay();
    closeProfilePanel();
}

function closeProfilePanel() {
    const panel = document.getElementById("profilePanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
}

// ========================================
// POINTS → COINS CONVERSION
// ========================================
const POINTS_PER_COIN = 100;

let conversionBusy = false;

function updateConversionPreview() {
    const input = document.getElementById("pointsConversionAmount");
    const result = document.getElementById("conversionCoinsResult");
    if (!input || !result) return;

    const raw = String(input.value ?? "").trim();
    const requested = Number(raw);
    const validNumber = raw !== "" && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) && Number(raw) >= POINTS_PER_COIN;
    const available = safeNonNegativeInt(gameData.points, 0);
    const requestedInt = validNumber ? Number(raw) : 0;
    const capped = validNumber ? Math.min(requestedInt, available) : 0;
    const convertible = capped - (capped % POINTS_PER_COIN);
    const remainder = capped - convertible;
    const invalid = !validNumber || requestedInt > available || convertible < POINTS_PER_COIN;

    input.classList.toggle("conversion-invalid", invalid);

    const confirm = document.querySelector(".conversion-confirm");
    if (confirm) confirm.disabled = invalid;

    if (!validNumber) {
        result.textContent = raw === "" ? "ENTER 100 OR MORE" : "ENTER A VALID WHOLE NUMBER";
        return;
    }

    if (requestedInt > available) {
        result.textContent = `MAX ${available} POINTS`;
        return;
    }

    if (convertible < POINTS_PER_COIN) {
        result.textContent = "MINIMUM 100 POINTS";
        return;
    }

    result.textContent = `${convertible / POINTS_PER_COIN} COINS${remainder ? ` · ${remainder} POINTS REMAIN` : ""}`;
}

function openPointsConversionPanel() {
    const panel = document.getElementById("pointsConversionPanel");
    const input = document.getElementById("pointsConversionAmount");
    if (!panel || !input) return;
    closeProfilePanel();
    conversionBusy = false;
    input.max = String(gameData.points);
    input.value = "0";
    input.classList.remove("conversion-invalid");
    updateConversionPreview();
    updateConversionBalances();
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function updateConversionBalances() {
    const points = document.getElementById("conversionPointsBalance");
    const coins = document.getElementById("conversionCoinsBalance");
    if (points) points.textContent = gameData.points;
    if (coins) coins.textContent = gameData.coins;
}

function confirmPointsConversion() {
    if (conversionBusy) return;

    const input = document.getElementById("pointsConversionAmount");
    if (!input) return;

    const raw = String(input.value ?? "").trim();
    const requested = Number(raw);
    const available = safeNonNegativeInt(gameData.points, 0);

    if (raw === "" || !/^\d+$/.test(raw) || !Number.isSafeInteger(requested) || requested < POINTS_PER_COIN || requested > available) {
        updateConversionPreview();
        return;
    }

    const pointsToConvert = requested - (requested % POINTS_PER_COIN);
    if (pointsToConvert < POINTS_PER_COIN || pointsToConvert > available) {
        updateConversionPreview();
        return;
    }

    conversionBusy = true;
    gameData.points = safeNonNegativeInt(available - pointsToConvert, 0);
    gameData.coins = safeNonNegativeInt(gameData.coins + (pointsToConvert / POINTS_PER_COIN), 0);
    gameData = sanitizeGameData(gameData);
    writeStoredJSON("dreamGameData", gameData);

    updateDisplay();
    checkSpecialAchievementsForBalance();
    updateConversionBalances();
    input.max = String(gameData.points);
    input.value = "0";
    updateConversionPreview();
    closePointsConversionPanel();
}

function closePointsConversionPanel() {
    const panel = document.getElementById("pointsConversionPanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
}

applyProfileDisplay();

// ========================================
// PLAYER CODE NAME
// ========================================

function openCodePanel() {

    const panel =
        document.getElementById(
            "codePanel"
        );

    const input =
        document.getElementById(
            "codeInput"
        );

    if (!panel || !input) return;

    const savedCode =
        localStorage.getItem(
            "playerCodeName"
        ) || migratedSave?.player?.codeName || "";


    if (savedCode) {

        input.value = savedCode;

    } else {

        input.value = "";

    }


    panel.classList.add(
        "show"
    );
    panel.setAttribute("aria-hidden", "false");


    setTimeout(() => {

        input.focus();

    }, 250);

}



// ========================================
// CLOSE CODE PANEL
// ========================================

function closeCodePanel() {
    const panel = document.getElementById("codePanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
}



// ========================================
// LIMIT TO 6 CHARACTERS
// ========================================

function limitCodeName(input) {

    input.value =
        input.value
            .replace(
                /[^a-zA-Z0-9]/g,
                ""
            )
            .toUpperCase()
            .substring(0, 6);

}



// ========================================
// SAVE CODE NAME
// ========================================

function saveCodeName() {

    const input =
        document.getElementById(
            "codeInput"
        );


    let code =
        input.value
            .trim()
            .toUpperCase()
            .substring(0, 6);


    if (code.length === 0) {

        alert(
            "Please enter your code name."
        );

        input.focus();

        return;

    }


    localStorage.setItem(
        "playerCodeName",
        code
    );
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();


    updateCodeNameDisplay();


    closeCodePanel();

}



// ========================================
// DISPLAY SAVED CODE NAME
// ========================================

function updateCodeNameDisplay() {

    const display =
        document.getElementById(
            "playerCodeDisplay"
        );


    const savedCode =
        localStorage.getItem(
            "playerCodeName"
        ) || migratedSave?.player?.codeName || "";


    if (savedCode) {

        display.textContent =
            savedCode;

    } else {

        display.textContent =
            "CODE NAME";

    }

}



// ========================================
// LOAD CODE NAME
// ========================================

function loadCodeName() {

    updateCodeNameDisplay();

}

updateDisplay();
loadCodeName();


/* =====================================
   LEADERBOARDS — READ EXISTING LOCAL STATS
===================================== */

function leaderboardPlayerName() {
    return readLegacyText("playerCodeName", "PLAYER").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 24) || "PLAYER";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function leaderboardNum(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function leaderboardPercent(correct, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, (correct / total) * 100));
}

function leaderboardStats() {
    const data = readStoredJSON("dreamGameData", {});
    const name = leaderboardPlayerName();

    // Correct/attempt counts are additive tracking only; scoring remains untouched.
    const correct = leaderboardNum(data.correctAnswers);
    const attempts = leaderboardNum(data.totalQuestions);
    const accuracy = attempts
        ? leaderboardPercent(correct, attempts)
        : (leaderboardNum(data.highestScore) > 0
            ? Math.min(100, leaderboardNum(data.highestScore) / Math.max(1, leaderboardNum(data.gamesPlayed) * 80) * 100)
            : 0);

    let titlesUnlocked = 0;
    let subjectRows = [];
    try {
        const progress = loadTitleProgress();
        titleSubjects.forEach(subject => {
            const a = leaderboardNum(progress?.[subject]?.["SUBJECT 1"]);
            const b = leaderboardNum(progress?.[subject]?.["SUBJECT 2"]);
            const unlocked = titleMilestones.filter(m => a >= m).length +
                titleMilestones.filter(m => b >= m).length;
            titlesUnlocked += unlocked;
            subjectRows.push({
                subject,
                level: Math.max(a, b),
                titles: unlocked
            });
        });
    } catch (error) {
        console.warn("Leaderboard error:", error);
    }

    const achievements = leaderboardNum(data.achievementsUnlocked || titlesUnlocked);
    const totalCorrect = correct || Math.floor(leaderboardNum(data.highestScore) / 100);
    return {
        name,
        overall: leaderboardNum(data.points),
        quizMaster: totalCorrect,
        accuracy,
        coins: leaderboardNum(data.coins),
        achievements,
        titles: titlesUnlocked,
        level: leaderboardNum(data.highestLevel),
        survival: leaderboardNum(data.highestLevel),
        subjectRows
    };
}

function leaderboardRows(title, icon, rows) {
    return `<section class="leaderboard-card">
        <h3>${icon} ${title}</h3>
        ${rows.map((row, i) => {
            const medals = ["🥇", "🥈", "🥉"];
            return `<div class="leaderboard-row">
                <span>${medals[i] || (i + 1) + "."}</span>
                    <strong>${escapeHtml(row.name)}</strong>
                    <b>${escapeHtml(row.value)}</b>
            </div>`;
        }).join("")}
    </section>`;
}

function openLeaderboardsPanel() {
    aiReaderStop();
    const panel = document.getElementById("leaderboardsPanel");
    const content = document.getElementById("leaderboardsContent");
    if (!panel || !content) return;

    const s = leaderboardStats();
    const playerRows = value => [{name: s.name, value}];

    let html = `<p class="leaderboard-local-note" role="note">Leaderboards are device-local summaries, not online rankings.</p>`;
    html += leaderboardRows("OVERALL CHAMPION", "👑", playerRows(s.overall + " pts"));
    html += leaderboardRows("QUIZ MASTER", "🧠", playerRows(s.quizMaster + " correct"));
    html += leaderboardRows("ACCURACY", "🎯", playerRows(s.accuracy.toFixed(1) + "%"));
    html += leaderboardRows("COIN COLLECTOR", "💰", playerRows(s.coins + " coins"));
    html += leaderboardRows("ACHIEVEMENT HUNTER", "🏅", playerRows(s.achievements + " unlocked"));

    const subjectRows = s.subjectRows.length
        ? s.subjectRows.map(x => `<div class="leaderboard-row"><span>🏆</span><strong>${x.subject}</strong><b>${x.level}</b></div>`).join("")
        : `<div class="leaderboard-empty">No subject progress yet.</div>`;
    html += `<section class="leaderboard-card"><h3>📚 SUBJECT MASTERS</h3>${subjectRows}</section>`;

    html += leaderboardRows("TITLE COLLECTOR", "🏅", playerRows(s.titles + " unlocked"));
    html += leaderboardRows("LEVEL CHAMPION", "📈", playerRows("LEVEL " + s.level));
    html += leaderboardRows("SURVIVAL MASTER", "❤️", playerRows("LEVEL " + s.survival));

    content.innerHTML = html;
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function closeLeaderboardsPanel() {
    const panel = document.getElementById("leaderboardsPanel");
    if (panel) {
        panel.classList.remove("show");
        panel.setAttribute("aria-hidden", "true");
    }
}

/* =====================================
   MAIN MENU + MENU PAGES
===================================== */

function openMenu() {
    const panel = document.getElementById("menuPanel");
    if (!panel) return;
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
    aiReaderRefresh();
}

function closeMenu() {
    const panel = document.getElementById("menuPanel");
    if (!panel) return;
    panel.classList.remove("show");
    panel.setAttribute("aria-hidden", "true");
    aiReaderRefresh();
}

function openMenuPage(page) {

    switch (page) {

        case "settings":
            openSettings();
            break;

        case "about":
            openInfo("about");
            break;

        case "howToPlay":
            openInfo("howToPlay");
            break;

        case "achievements":
            openInfo("achievements");
            break;

        case "statistics":
            openInfo("statistics");
            break;

        case "privacy":
            openInfo("privacy");
            break;

        case "home":
            closeMenu();
            break;
    }
}

/* =====================================
   SETTINGS PANEL
===================================== */

function openSettings() {

    const menu = document.getElementById("menuPanel");
    const panel = document.getElementById("settingsPanel");

    if (!panel) return;

    if (menu) {
        menu.classList.remove("show");
    }

    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
    aiReaderStop();
}


function closeSettings() {

    const panel = document.getElementById("settingsPanel");
    const menu = document.getElementById("menuPanel");

    if (panel) {
        panel.classList.remove("show");
        panel.setAttribute("aria-hidden", "true");
    }

    if (menu) {
        menu.classList.add("show");
        menu.setAttribute("aria-hidden", "false");
    }
    aiReaderRefresh();
}

/* =====================================
   MENU INFORMATION PAGES
===================================== */

const menuPages = {
    about: {
        title: "ℹ️ ABOUT GAME",
        html: `
            <div class="info-section">
                <h3>🎮 What is ProudGeonQuiz?</h3>
                <p><strong>ProudGeonQuiz</strong> is a knowledge and challenge quiz game built around progressive levels, multiple subjects, achievements, statistics, and a simple neon-style interface.</p>
            </div>
            <div class="info-section">
                <h3>🎯 Main Goal</h3>
                <p>The goal is to answer questions correctly, improve critical thinking and problem-solving skills, earn rewards, complete level milestones, and build your overall quiz progress.</p>
            </div>
            <div class="info-section">
                <h3>📚 Subjects</h3>
                <ul>
                    <li>Math</li>
                    <li>Science</li>
                    <li>Psychology</li>
                    <li>Tech 1</li>
                    <li>Tech 2</li>
                </ul>
                <p>Each subject contains Subject 1 and Subject 2 quiz paths, with progress saved separately.</p>
            </div>
            <div class="info-section">
                <h3>📈 80-Level Progression</h3>
                <p>Each quiz path contains 80 levels. Progress is organized into milestone levels, and the numbered milestones on the Home screen become green after the corresponding level has been completed.</p>
            </div>
            <div class="info-section">
                <h3>🏆 Achievements</h3>
                <p>Every 5 completed levels creates a title milestone. Your best completed milestone is stored so achievements and unlocked Home-screen milestones remain available when you return to the Home screen.</p>
            </div>
            <div class="info-section">
                <h3>💾 Saved Progress</h3>
                <p>Game progress, scores, answers, settings, and achievement progress are stored locally in the browser on this device.</p>
            </div>
            <div class="info-section">
                <h3>📚 Questioner System</h3>
                <p>The game currently supports two separate question banks: the original Previous Questioner and the newer New Questioner. Both use the same quiz structure, and the active questioner can be changed from Settings without replacing the other bank.</p>
            </div>
            <div class="info-section">
                <h3>🛍️ Shop &amp; Items</h3>
                <p>The game includes a local coin-based shop and item inventory with Life Token, Time Boost, Hint, 50/50, and Second Chance items. These systems work with the existing coin balance and saved local data.</p>
            </div>
            <div class="info-section">
                <h3>🔥 Streak Rewards</h3>
                <p>Correct-answer streaks can trigger milestone rewards, including score, coins, and points. The game also keeps an all-time best streak in local data.</p>
            </div>
            <div class="info-section">
                <h3>🏅 Titles &amp; Leaderboards</h3>
                <p>Progress can unlock titles across the five subjects and two quiz paths, while the Leaderboards panel summarizes local performance such as score, accuracy, coins, achievements, titles, and subject progress.</p>
            </div>
            <div class="info-section">
                <h3>👨‍💻 Creator</h3>
                <p>Jun Jun Marollano</p>
            </div>
            <div class="info-section">
                <h3>🛠️ Development</h3>
                <ul>
                    <li>Game concept &amp; design</li>
                    <li>UI/Home screen</li>
                    <li>Gameplay mechanics</li>
                    <li>JavaScript functions</li>
                    <li>CSS design</li>
                    <li>Sound/music</li>
                    <li>Testing &amp; bug fixing</li>
                </ul>
            </div>
            <div class="info-section copyright">
                <h3>©️ Copyright Notice</h3>
                <p>© 2026 ProudGeonQuiz. All Rights Reserved.</p>
            </div>
        `
    },

    howToPlay: {
        title: "📖 HOW TO PLAY",
        html: `
            <div class="info-section">
                <h3>1️⃣ Choose a Subject</h3>
                <p>From the Home screen, select Math, Science, Psychology, Tech 1, or Tech 2. The selected subject opens its two available quiz paths.</p>
            </div>
            <div class="info-section">
                <h3>2️⃣ Choose Subject 1 or Subject 2</h3>
                <p>Each subject has two separate question paths. Their progress is tracked separately, while the highest completed level for the subject is used for the Home-screen milestone display.</p>
            </div>
            <div class="info-section">
                <h3>3️⃣ Read the Question Carefully</h3>
                <p>Each question has a limited answer time. Choose the answer you believe is correct before the timer reaches zero.</p>
            </div>
            <div class="info-section">
                <h3>4️⃣ Lives &amp; Answers</h3>
                <p>A quiz starts with 8 lives. A correct answer gives rewards. A wrong answer or a timeout costs one life. If all lives are lost, the current quiz run ends.</p>
            </div>
            <div class="info-section">
                <h3>5️⃣ Difficulty &amp; Rewards</h3>
                <ul>
                    <li>Levels 1–20: Normal reward range</li>
                    <li>Levels 21–40: Hard reward range</li>
                    <li>Levels 41–60: Insane reward range</li>
                    <li>Levels 61–80: Final high-reward range</li>
                </ul>
                <p>Higher levels provide higher rewards for correct answers.</p>
            </div>
            <div class="info-section">
                <h3>6️⃣ Level Milestones</h3>
                <p>After a level is completed, its progress is saved. Home-screen milestones unlock at 20, 30, 40, 50, and 60, while the final 80 milestone is completed at the end of the quiz path. Once a milestone has been earned, it stays unlocked.</p>
            </div>
            <div class="info-section">
                <h3>7️⃣ Achievements</h3>
                <p>Every 5 completed levels can unlock a title achievement. Continue playing to collect more titles across subjects and quiz paths.</p>
            </div>
            <div class="info-section">
                <h3>📚 Choose Your Questioner</h3>
                <p>Open Settings and choose PREVIOUS QUESTIONER or NEW QUESTIONER. The selection is saved and can be changed again later. Each questioner keeps its own quiz progress and used-question tracking.</p>
            </div>
            <div class="info-section">
                <h3>🛍️ Use Items Wisely</h3>
                <p>The Shop lets you spend coins on gameplay items. Purchased items are kept in the local inventory, and the Inventory panel lets you use eligible items during gameplay.</p>
            </div>
            <div class="info-section">
                <h3>🔥 Build a Streak</h3>
                <p>Consecutive correct answers can unlock streak milestones and extra rewards. A wrong answer or timeout can interrupt the current streak.</p>
            </div>
            <div class="info-section">
                <h3>💎 Points &amp; Coins</h3>
                <p>Correct answers and milestone rewards can provide both Points and Coins. Points can also be converted into Coins from the Points button on the Home screen.</p>
            </div>
            <div class="info-section">
                <h3>💡 Tips</h3>
                <ul>
                    <li>Read the complete question before answering.</li>
                    <li>Use elimination when several choices look similar.</li>
                    <li>Watch the timer, but do not guess too quickly.</li>
                    <li>Return to the Home screen to see your newly unlocked green milestones.</li>
                </ul>
            </div>
        `
    },

    achievements: {
        title: "🏆 ACHIEVEMENTS",
        html: `
            <div class="achievement-card"><span>🥉</span><div><strong>First Milestone</strong><small>Complete Level 5 in a quiz path.</small></div></div>
            <div class="achievement-card"><span>🥈</span><div><strong>Rising Scholar</strong><small>Complete Level 10 and keep building your progress.</small></div></div>
            <div class="achievement-card"><span>🥇</span><div><strong>Quiz Challenger</strong><small>Reach the higher milestone levels and challenge harder questions.</small></div></div>
            <div class="achievement-card"><span>🏅</span><div><strong>Title Collector</strong><small>Every 5 completed levels can unlock another title in that quiz path.</small></div></div>
            <div class="achievement-card"><span>📚</span><div><strong>Subject Explorer</strong><small>Build progress across different subjects and their two quiz paths.</small></div></div>
            <div class="achievement-card"><span>⚡</span><div><strong>Level Master</strong><small>Complete the final Level 80 milestone in a quiz path.</small></div></div>
            <div class="info-section">
                <h3>🔥 Streak Milestones</h3>
                <p>Gameplay streak milestones include Hot Start, On Fire, Unstoppable, Quiz Master, and Legendary Streak. These milestones can award additional score, Coins, and Points.</p>
            </div>
            <div class="info-section">
                <h3>📚 Questioner Progress</h3>
                <p>Previous and New Questioner progress are tracked separately, so changing questioners does not intentionally merge their level or used-question records.</p>
            </div>
            <div class="info-section completion">
                <h3>📈 Achievement Progress</h3>
                <p id="achievementCompletion">0%</p>
                <p><strong id="achievementTitles">0 / 160 titles unlocked</strong></p>
                <p id="achievementSubjects">0 / 5 subjects have milestone progress</p>
            </div>
            <div class="info-section special-achievements-section">
                <h3>🎖️ SPECIAL ACHIEVEMENTS</h3>
                <div id="specialAchievementsContent" class="special-achievements-list"></div>
            </div>
        `
    },

    statistics: {
        title: "📊 STATISTICS",
        html: `
            <div class="stat-detail"><span>🎮 Games Played</span><strong id="menuGamesPlayed">0</strong></div>
            <div class="stat-detail"><span>❓ Questions Answered</span><strong id="menuTotalQuestions">0</strong></div>
            <div class="stat-detail"><span>✅ Correct Answers</span><strong id="menuCorrectAnswers">0</strong></div>
            <div class="stat-detail"><span>❌ Incorrect Answers</span><strong id="menuIncorrectAnswers">0</strong></div>
            <div class="stat-detail"><span>🎯 Accuracy</span><strong id="menuAccuracy">0%</strong></div>
            <div class="stat-detail"><span>🏆 High Score</span><strong id="menuHighScore">0</strong></div>
            <div class="stat-detail"><span>🔥 Best Streak</span><strong id="menuBestStreak">0</strong></div>
            <div class="stat-detail"><span>📈 Highest Level</span><strong id="menuHighestLevel">0</strong></div>
            <div class="stat-detail"><span>💰 Coins</span><strong id="menuCoins">0</strong></div>
            <div class="stat-detail"><span>💎 Points</span><strong id="menuPoints">0</strong></div>
            <div class="stat-detail"><span>🏅 Titles Unlocked</span><strong id="menuTitlesUnlocked">0 / 160</strong></div>
            <div class="stat-detail"><span>⏱️ Best Time</span><strong id="menuBestTime">--:--</strong></div>
            <div class="info-section subject-statistics-section">
                <h3>📚 Subject Statistics</h3>
                <p class="statistics-questioner">QUESTIONER: <strong id="menuStatisticsQuestioner">PREVIOUS</strong></p>
                <div id="subjectStatisticsGrid" class="subject-statistics-grid"></div>
            </div>
            <div class="info-section">
                <h3>📌 What the numbers mean</h3>
                <p>Accuracy is calculated from correct answers divided by total answered questions. Scores, coins, points, wins, losses, and progress are read from the game's saved local data.</p>
            </div>
            <div class="info-section">
                <h3>📚 Questioner Tracking</h3>
                <p>Previous and New Questioner use separate progress and used-question records. This lets the two banks remain independent while the Home statistics continue to show the game's overall saved totals.</p>
            </div>
            <div class="info-section">
                <h3>🛍️ Item Inventory</h3>
                <p>Coins spent in the Shop and the quantities of purchased gameplay items are saved locally. Inventory values are kept separately from the main score and question totals.</p>
            </div>
        `
    },

    privacy: {
        title: "🔒 PRIVACY / DATA",
        html: `
            <div class="info-section">
                <h3>💾 Local-Only Storage</h3>
                <p>ProudGeonQuiz uses the browser's local storage on this device for saved game information. The current version does not require an online account for these local values.</p>
            </div>
            <div class="info-section">
                <h3>📦 Data That May Be Saved</h3>
                <ul>
                    <li>Game progress and completed levels</li>
                    <li>Scores, coins, points, wins, losses, and answer statistics</li>
                    <li>Achievement/title progress</li>
                    <li>Player code name</li>
                    <li>Music, sound, theme, AI Reader, and questioner settings</li>
                    <li>Item inventory and best-streak data</li>
                    <li>Separate quiz progress and used-question tracking for each questioner</li>
                    <li>Selected local profile</li>
                </ul>
            </div>
            <div class="info-section">
                <h3>🔐 Where It Is Stored</h3>
                <p>Saved values are stored in this browser's local storage. They are tied to the browser/device environment rather than an online ProudGeonQuiz account.</p>
            </div>
            <div class="info-section">
                <h3>🚫 No Online Profile Required</h3>
                <p>The game can use its local saved data without asking you to create an online profile for the features covered by this version.</p>
            </div>
            <div class="info-section">
                <h3>🔄 Settings Reset</h3>
                <p>RESET SETTINGS restores music, sound, theme, and AI Reader preferences. It does not serve as a general game-progress reset.</p>
            </div>
            <div class="info-section">
                <h3>🧹 Clearing Browser Data</h3>
                <p>Clearing this site's/browser local storage can remove locally saved game data. If you clear browser storage, previously saved local progress may no longer be available.</p>
            </div>
            <div class="info-section">
                <h3>🛡️ Your Control</h3>
                <p>You control the local browser data through the browser/device settings. The game itself does not provide a cloud backup of this local storage.</p>
            </div>
        `
    }
};
function openInfo(page) {

    const data = menuPages[page];

    if (!data) return;

    const menu = document.getElementById("menuPanel");
    const panel = document.getElementById("infoPanel");
    const title = document.getElementById("infoTitle");
    const content = document.getElementById("infoContent");

    if (menu) {
        menu.classList.remove("show");
        menu.setAttribute("aria-hidden", "true");
    }

    if (title) title.textContent = data.title;
    if (content) content.innerHTML = data.html;

    if (page === "statistics") {
        updateMenuStatistics();
    }

    if (page === "achievements") {
        updateAchievementCompletion();
        renderSpecialAchievements();
    }

    if (!panel) return;
    panel.classList.add("show");
    panel.setAttribute("aria-hidden", "false");
}

function closeInfo() {

    const panel = document.getElementById("infoPanel");
    const menu = document.getElementById("menuPanel");

    if (panel) {
        panel.classList.remove("show");
        panel.setAttribute("aria-hidden", "true");
    }

    if (menu) {
        menu.classList.add("show");
        menu.setAttribute("aria-hidden", "false");
    }
}

function getTitleProgressSummary() {
    const progress = loadTitleProgress();
    let titlesUnlocked = 0;
    let subjectsWithProgress = 0;

    titleSubjects.forEach(subject => {
        let subjectProgress = 0;

        titleQuizTypes.forEach(quizType => {
            const level = Number(progress?.[subject]?.[quizType] || 0);
            subjectProgress = Math.max(subjectProgress, level);
            titlesUnlocked += getUnlockedTitleCount(level);
        });

        if (subjectProgress > 0) {
            subjectsWithProgress++;
        }
    });

    return {
        titlesUnlocked,
        subjectsWithProgress,
        totalTitles: titleSubjects.length * titleQuizTypes.length * titleMilestones.length
    };
}

function updateMenuStatistics() {
    const data = readStoredJSON("dreamGameData", {});
    const totalQuestions = Number(data.totalQuestions || 0);
    const correctAnswers = Number(data.correctAnswers || 0);
    const incorrectAnswers = Math.max(0, totalQuestions - correctAnswers);
    const accuracy = totalQuestions > 0
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;
    const titleSummary = getTitleProgressSummary();

    const values = {
        menuGamesPlayed: data.gamesPlayed || 0,
        menuTotalQuestions: totalQuestions,
        menuCorrectAnswers: correctAnswers,
        menuIncorrectAnswers: incorrectAnswers,
        menuAccuracy: accuracy + "%",
        menuHighScore: data.highestScore || 0,
        menuBestStreak: getAllTimeBestStreak(),
        menuHighestLevel: data.highestLevel || 0,
        menuCoins: data.coins || 0,
        menuPoints: data.points || 0,
        menuTitlesUnlocked: `${titleSummary.titlesUnlocked} / ${titleSummary.totalTitles}`,
        menuBestTime: data.bestTime || "--:--"
    };

    Object.entries(values).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });

    const questionerEl = document.getElementById("menuStatisticsQuestioner");
    if (questionerEl) questionerEl.textContent = getActiveQuestioner() === "new" ? "NEW" : "PREVIOUS";

    const grid = document.getElementById("subjectStatisticsGrid");
    if (grid) {
        const subjectStats = getSubjectStats();
        grid.innerHTML = titleSubjects.map(subject => {
            const row = subjectStats[subject];
            return `
                <div class="subject-stat-card">
                    <strong>${subject}</strong>
                    <span>Answered <b>${row.total}</b></span>
                    <span>Correct <b>${row.correct}</b></span>
                    <span>Incorrect <b>${row.incorrect}</b></span>
                    <span>Accuracy <b>${getSubjectStatAccuracy(row)}%</b></span>
                    <span>Highest Level <b>${row.highestLevel}/80</b></span>
                </div>`;
        }).join("");
    }
}

function updateAchievementCompletion() {
    const titleSummary = getTitleProgressSummary();
    const completion = titleSummary.totalTitles > 0
        ? Math.round((titleSummary.titlesUnlocked / titleSummary.totalTitles) * 100)
        : 0;

    const el = document.getElementById("achievementCompletion");
    const titlesEl = document.getElementById("achievementTitles");
    const subjectsEl = document.getElementById("achievementSubjects");

    if (el) el.textContent = completion + "%";
    if (titlesEl) titlesEl.textContent = `${titleSummary.titlesUnlocked} / ${titleSummary.totalTitles} titles unlocked`;
    if (subjectsEl) subjectsEl.textContent = `${titleSummary.subjectsWithProgress} / ${titleSubjects.length} subjects have milestone progress`;
}


/* =====================================
   AI READER — MOBILE-SAFE ACCESSIBILITY FEATURE
   Native Web Speech API.
   Supports Motto, Welcome, Quiz, Story and Mission.
===================================== */

let aiReaderSpeaking = false;
let aiReaderInitialized = false;
let aiReaderLastScreenKey = "";
let aiReaderLastQuizKey = "";
let aiReaderObserver = null;
let aiReaderSpeechToken = 0;
let aiReaderReadTimer = null;
let aiReaderVoice = null;
let aiReaderUserActivated = false;
let aiReaderAudioUnlocked = false;
let aiReaderAudio = null;
let aiReaderAudioUrl = "";
const AI_READER_TTS_ENDPOINT = "https://geon-ai-reader.yakuzat882.workers.dev";

function aiReaderSupported() {
    try {
        return (
            "speechSynthesis" in window &&
            typeof window.speechSynthesis.speak === "function" &&
            typeof window.speechSynthesis.cancel === "function" &&
            typeof window.SpeechSynthesisUtterance === "function"
        );
    } catch (error) {
        console.warn("AI Reader support check failed:", error);
        return false;
    }
}

function aiReaderLoadVoice() {
    if (!aiReaderSupported()) return null;

    try {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || !voices.length) return null;

        const preferred = voices.find(v =>
            /^en(-|_)/i.test(v.lang || "") &&
            /google|microsoft|samantha|daniel|alex|enhanced/i.test(v.name || "")
        );

        aiReaderVoice =
            preferred ||
            voices.find(v => /^en(-|_)/i.test(v.lang || "")) ||
            voices.find(v => /^fil(-|_)/i.test(v.lang || "")) ||
            voices[0] ||
            null;

        return aiReaderVoice;
    } catch (error) {
        console.warn("AI Reader voice detection failed:", error);
        return null;
    }
}

function aiReaderIsEnabled() {
    return Boolean(settingsData.aiReader);
}

function aiReaderActiveIntroStep() {
    const intro = document.getElementById("introFlow");
    if (!intro || !aiReaderVisible(intro)) return null;

    const active = intro.querySelector(".intro-step.active");
    if (!active || !aiReaderVisible(active)) return null;

    const step = Number(active.dataset.step);
    return step === 2 || step === 3 ? active : null;
}

function aiReaderVisible(el) {
    if (!el) return false;

    try {
        const style = window.getComputedStyle(el);
        return !el.hidden &&
            el.getAttribute("aria-hidden") !== "true" &&
            !el.classList.contains("hidden") &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0";
    } catch (error) {
        return false;
    }
}

function aiReaderText(el) {
    if (!el) return "";

    try {
        const clone = el.cloneNode(true);
        clone.querySelectorAll(
            "[aria-hidden='true'], script, style, noscript, button"
        ).forEach(n => n.remove());

        return (clone.innerText || clone.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
    } catch (error) {
        console.warn("AI Reader text extraction failed:", error);
        return "";
    }
}

function aiReaderCurrentScreen() {
    try {
        const intro = aiReaderActiveIntroStep();

        if (intro) {
            const step = Number(intro.dataset.step);
            return {
                key: `intro-${step}`,
                el: intro,
                type: step === 2 ? "motto" : "welcome"
            };
        }

        const achievement = document.getElementById("achievementScreen");
        const victory = document.getElementById("victoryScreen");
        const gameOver = document.getElementById("gameOverScreen");

        if (
            (achievement && aiReaderVisible(achievement)) ||
            (victory && aiReaderVisible(victory)) ||
            (gameOver && aiReaderVisible(gameOver))
        ) {
            return null;
        }

        const missionPanel = document.getElementById("missionPanel");
        if (missionPanel && aiReaderVisible(missionPanel)) {
            return { key: "your-mission", el: missionPanel, type: "mission" };
        }

        const storyReader = document.getElementById("storyReaderPanel");
        if (storyReader && aiReaderVisible(storyReader)) {
            return { key: "story-reader", el: storyReader, type: "story-reader" };
        }

        const storyQuestion = document.getElementById("storyQuestionPanel");
        if (storyQuestion && aiReaderVisible(storyQuestion)) {
            return { key: "story-question", el: storyQuestion, type: "story-question" };
        }

        const quiz = document.getElementById("quizScreen");
        if (quiz && aiReaderVisible(quiz)) {
            return { key: "quiz", el: quiz, type: "quiz" };
        }
    } catch (error) {
        console.warn("AI Reader screen detection failed:", error);
    }

    return null;
}

function aiReaderStop() {
    ++aiReaderSpeechToken;

    if (aiReaderReadTimer) {
        clearTimeout(aiReaderReadTimer);
        aiReaderReadTimer = null;
    }

    try {
        if (aiReaderSupported()) {
            window.speechSynthesis.cancel();
        }
    } catch (error) {
        console.warn("AI Reader stop failed:", error);
    }

    try {
        if (aiReaderAudio) {
            try { aiReaderAudio.pause(); } catch (e) {}
            try { aiReaderAudio.currentTime = 0; } catch (e) {}
            try { aiReaderAudio.src = ""; } catch (e) {}
            try { aiReaderAudio.load(); } catch (e) {}
        }
    } catch (error) {
        console.warn("AI Reader remote audio stop failed:", error);
    }

    aiReaderSpeaking = false;
}

function aiReaderSpeakRemote(clean, token, fromUserGesture) {
    if (!aiReaderUserActivated) return false;
    if (!fromUserGesture && !aiReaderAudioUnlocked) return false;

    try {
        if (aiReaderAudio) {
            try { aiReaderAudio.pause(); } catch (e) {}
            try { aiReaderAudio.currentTime = 0; } catch (e) {}
            try { aiReaderAudio.src = ""; } catch (e) {}
            try { aiReaderAudio.load(); } catch (e) {}
        }
        if (aiReaderAudioUrl) {
            URL.revokeObjectURL(aiReaderAudioUrl);
            aiReaderAudioUrl = "";
        }
    } catch (e) {
        console.warn("AI Reader remote audio pre-cleanup failed:", e);
    }

    aiReaderSpeaking = true;

    fetch(AI_READER_TTS_ENDPOINT, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({text: clean})
    })
        .then(function(response) {
            if (!response.ok) throw new Error("TTS HTTP " + response.status);
            return response.blob();
        })
        .then(function(blob) {
            if (token !== aiReaderSpeechToken) return;

            const url = URL.createObjectURL(blob);
            aiReaderAudioUrl = url;
            if (!aiReaderAudio) aiReaderAudio = document.createElement("audio");
            aiReaderAudio.src = url;

            const cleanup = function() {
                if (aiReaderAudioUrl === url) {
                    URL.revokeObjectURL(url);
                    aiReaderAudioUrl = "";
                }
                if (token === aiReaderSpeechToken) aiReaderSpeaking = false;
            };

            aiReaderAudio.onended = cleanup;
            aiReaderAudio.onerror = cleanup;

            const playPromise = aiReaderAudio.play();
            if (playPromise && typeof playPromise.catch === "function") {
                playPromise.catch(function(error) {
                    cleanup();
                    console.warn("AI Reader remote audio play failed:", error);
                });
            }
        })
        .catch(function(error) {
            if (token === aiReaderSpeechToken) aiReaderSpeaking = false;
            console.warn("AI Reader remote TTS failed:", error);
        });

    return true;
}

function aiReaderSpeak(text, fromUserGesture = false) {
    try {
        if (!aiReaderIsEnabled()) return false;

        const clean = String(text || "")
            .replace(/\s+/g, " ")
            .trim();

        if (!clean) return false;

        if (fromUserGesture) {
            aiReaderUserActivated = true;
        }

        const screen = aiReaderCurrentScreen();
        if (!screen) return false;

        const synthesis = window.speechSynthesis;

        aiReaderStop();

        const token = ++aiReaderSpeechToken;

        if (!synthesis || typeof synthesis.speak !== "function") {
            return aiReaderSpeakRemote(clean, token, fromUserGesture);
        }
        const utterance = new SpeechSynthesisUtterance(clean);

        const voice = aiReaderVoice || aiReaderLoadVoice();

        if (voice) {
            utterance.voice = voice;
            if (voice.lang) utterance.lang = voice.lang;
        } else {
            utterance.lang = navigator.language || "en-US";
        }

        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = function () {
            if (token === aiReaderSpeechToken) {
                aiReaderSpeaking = true;
            }
        };

        utterance.onend = function () {
            if (token === aiReaderSpeechToken) {
                aiReaderSpeaking = false;
            }
        };

        utterance.onerror = function (error) {
            if (token === aiReaderSpeechToken) {
                aiReaderSpeaking = false;
            }
            console.warn("AI Reader speech error:", error);
        };

        synthesis.speak(utterance);

        return true;
    } catch (error) {
        aiReaderSpeaking = false;
        console.warn("AI Reader speak failed:", error);
        return false;
    }
}

function aiReaderReadVisibleScreenFromUserGesture() {
    try {
        if (!aiReaderIsEnabled()) return false;

        const screen = aiReaderCurrentScreen();
        if (!screen) return false;

        aiReaderLastScreenKey = "";
        aiReaderLastQuizKey = "";

        const text = aiReaderBuildCurrentScreenText(screen);
        if (!text) return false;

        return aiReaderSpeak(text, true);
    } catch (error) {
        console.warn("AI Reader manual read failed:", error);
        return false;
    }
}

window.aiReaderReadVisibleScreenFromUserGesture = aiReaderReadVisibleScreenFromUserGesture;

function aiReaderBuildCurrentScreenText(screen) {
    if (!screen) return "";

    if (screen.type === "mission") {
        const story = document.getElementById("missionStoryText");
        const question = document.getElementById("missionQuestionText");

        return [
            story ? aiReaderText(story) : "",
            question ? aiReaderText(question) : ""
        ].filter(Boolean).join(". ");
    }

    if (screen.type === "story-reader") {
        const storyText = document.getElementById("storyReaderText");
        return storyText ? aiReaderText(storyText) : "";
    }

    if (screen.type === "story-question") {
        const question = document.getElementById("storyQuestionText");
        const questionText = question ? aiReaderText(question) : "";

        const number = document.getElementById("storyQuestionNumber");
        const questionNumber = number
            ? String(number.textContent || "").trim()
            : "";

        return questionNumber
            ? `Question ${questionNumber}. ${questionText}`
            : questionText;
    }

    if (screen.type === "quiz") {
        const question = document.getElementById("quizQuestionText");
        const questionText = question
            ? (question.innerText || question.textContent || "")
                .replace(/\s+/g, " ")
                .trim()
            : "";

        if (!questionText) return "";

        return `Question ${quizState.index + 1}. ${questionText}`;
    }

    if (screen.type === "motto") {
        const title = screen.el.querySelector("h2");
        const motto = screen.el.querySelector(".motto-copy");
        const author = screen.el.querySelector(".motto-author");

        return [
            title ? aiReaderText(title) : "",
            motto ? aiReaderText(motto) : "",
            author ? aiReaderText(author) : ""
        ].filter(Boolean).join(". ");
    }

    if (screen.type === "welcome") {
        const title = screen.el.querySelector(".welcome-title");
        const content = screen.el.querySelector(".welcome-copy");

        return [
            title ? aiReaderText(title) : "",
            content ? aiReaderText(content) : ""
        ].filter(Boolean).join(". ");
    }

    return "";
}

function aiReaderReadCurrentScreen(force = false) {
    try {
        if (!aiReaderIsEnabled()) {
            aiReaderStop();
            return;
        }

        const screen = aiReaderCurrentScreen();

        if (!screen || !aiReaderVisible(screen.el)) {
            aiReaderStop();
            aiReaderLastScreenKey = "";
            aiReaderLastQuizKey = "";
            return;
        }

        const text = aiReaderBuildCurrentScreenText(screen);
        if (!text) return;

        let contentKey = screen.key + ":" + text;

        if (screen.type === "quiz") {
            contentKey += ":" +
                quizState.index + ":" +
                quizState.subject + ":" +
                quizState.quizType;
        }

        if (!force && contentKey === aiReaderLastQuizKey) return;

        aiReaderLastQuizKey = contentKey;
        aiReaderLastScreenKey = screen.key;

        aiReaderStop();

        /*
         * Automatic speech is allowed only after the browser has seen
         * a user interaction. This prevents mobile autoplay restrictions
         * from silently blocking the reader.
         */
        if (!aiReaderUserActivated) return;

        aiReaderReadTimer = setTimeout(() => {
            aiReaderReadTimer = null;

            const current = aiReaderCurrentScreen();
            if (!current || current.key !== screen.key) return;

            aiReaderSpeak(text);
        }, 120);
    } catch (error) {
        console.warn("AI Reader read failed:", error);
    }
}

function aiReaderStoryFeedback(text) {
    try {
        if (!aiReaderIsEnabled()) return;

        const screen = aiReaderCurrentScreen();
        if (!screen || screen.type !== "story-question") return;

        aiReaderSpeak(String(text || "").trim(), true);
    } catch (error) {
        console.warn("AI Reader feedback error:", error);
    }
}

function aiReaderRefresh(force = false) {
    try {
        if (!aiReaderIsEnabled()) {
            aiReaderStop();
            return;
        }

        const screen = aiReaderCurrentScreen();

        if (!screen) {
            aiReaderStop();
            aiReaderLastScreenKey = "";
            aiReaderLastQuizKey = "";
            return;
        }

        aiReaderReadCurrentScreen(force);
    } catch (error) {
        console.warn("AI Reader refresh failed:", error);
    }
}

function aiReaderInit() {
    try {
        if (aiReaderInitialized) return;

        aiReaderInitialized = true;

        if (aiReaderObserver) {
            aiReaderObserver.disconnect();
            aiReaderObserver = null;
        }

    try {
        if (aiReaderAudio) {
            aiReaderAudio.pause();
            aiReaderAudio.removeAttribute("src");
            aiReaderAudio.load();
            aiReaderAudio = null;
        }
        if (aiReaderAudioUrl) {
            URL.revokeObjectURL(aiReaderAudioUrl);
            aiReaderAudioUrl = "";
        }
    } catch (error) {
        console.warn("AI Reader remote audio stop failed:", error);
    }

        if (aiReaderSupported()) {
            aiReaderLoadVoice();

            if (typeof window.speechSynthesis.addEventListener === "function") {
                window.speechSynthesis.addEventListener(
                    "voiceschanged",
                    aiReaderLoadVoice
                );
            }
        }

        if (!aiReaderAudio) {
            aiReaderAudio = document.createElement("audio");
        }

        /*
         * Any real tap/click activates the reader for subsequent
         * automatic screen reading. The actual speech can still be
         * started manually through the reader control.
         */
        const activateReader = () => {
            aiReaderUserActivated = true;

            if (aiReaderIsEnabled()) {
                aiReaderRefresh();
            }
        };

        document.addEventListener("pointerdown", activateReader, {
            passive: true
        });

        document.addEventListener("keydown", activateReader, {
            passive: true
        });

        /*
         * Smallest safe mobile audio unlock: try to play a very quiet
         * existing sound on first real interaction so that subsequent
         * asynchronous remote TTS audio.play() is permitted.
         */
        const aiReaderUnlockAudio = () => {
            if (aiReaderAudioUnlocked) return;
            try {
                if (!aiReaderAudio) aiReaderAudio = document.createElement("audio");
                aiReaderAudio.src = "data:audio/wav;base64,UklGRsAIAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
                aiReaderAudio.volume = 0.001;
                const p = aiReaderAudio.play();
                if (p && typeof p.then === "function") {
                    p.then(function () { aiReaderAudioUnlocked = true; if (aiReaderIsEnabled && aiReaderIsEnabled()) aiReaderRefresh(); }).catch(function () {});
                } else {
                    aiReaderAudioUnlocked = true;
                }
            } catch (e) {
                // unlock may fail on some contexts; retry on next interaction
            }
        };
        document.addEventListener("pointerdown", aiReaderUnlockAudio, { passive: true });

        if (
            aiReaderSupported() &&
            typeof MutationObserver !== "undefined"
        ) {
            aiReaderObserver = new MutationObserver(function (mutations) {
                const relevant = mutations.some(m =>
                    m.type === "attributes" &&
                    (
                        m.attributeName === "class" ||
                        m.attributeName === "aria-hidden" ||
                        m.attributeName === "hidden"
                    )
                );

                if (relevant) aiReaderRefresh();
            });

            aiReaderObserver.observe(document.body, {
                subtree: true,
                attributes: true,
                attributeFilter: ["class", "aria-hidden", "hidden"]
            });
        }

        window.addEventListener("beforeunload", aiReaderStop, { once: true });
    } catch (error) {
        console.warn("AI Reader initialization failed:", error);
    }
}

/* =====================================
   MUSIC TOGGLE
===================================== */

function toggleMusic() {

    settingsData.music =
        !settingsData.music;
    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (window.audioManager) audioManager.setMusicEnabled(settingsData.music);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();

    updateSettingsDisplay();
    applyMusicSetting();

}



/* =====================================
   SOUND TOGGLE
===================================== */

function toggleSound() {

    settingsData.sound =
        !settingsData.sound;
    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (window.audioManager) audioManager.setSoundEnabled(settingsData.sound);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();

    updateSettingsDisplay();

}



/* =====================================
   UPDATE SETTINGS DISPLAY
===================================== */

function updateSettingsDisplay() {

    const musicToggle =
        document.getElementById(
            "musicToggle"
        );


    const soundToggle =
        document.getElementById(
            "soundToggle"
        );

    const aiReaderToggle =
        document.getElementById(
            "aiReaderToggle"
        );


        if (musicToggle) {
        musicToggle.textContent =
            settingsData.music
                ? "ON"
                : "OFF";
        musicToggle.setAttribute("aria-pressed", settingsData.music ? "true" : "false");
    }
    if (soundToggle) {
        soundToggle.textContent =
            settingsData.sound
                ? "ON"
                : "OFF";
        soundToggle.setAttribute("aria-pressed", settingsData.sound ? "true" : "false");
    }

    if (aiReaderToggle) {
        aiReaderToggle.textContent =
            settingsData.aiReader
                ? "ON"
                : "OFF";
        aiReaderToggle.setAttribute(
            "aria-pressed",
            settingsData.aiReader ? "true" : "false"
        );
    }

    const previousQuestioner = document.getElementById("previousQuestioner");
    const newQuestioner = document.getElementById("newQuestioner");
    if (previousQuestioner) previousQuestioner.classList.toggle("selected", settingsData.questioner === "previous");
    if (newQuestioner) newQuestioner.classList.toggle("selected", settingsData.questioner === "new");


    ["light", "dark", "original"].forEach(theme => {
        const button = document.getElementById(theme + "Mode");
        if (button) {
            const selected = settingsData.theme === theme;
            button.classList.toggle("selected", selected);
            button.setAttribute("aria-pressed", selected ? "true" : "false");
        }
    });
    updateThemePreviewState(settingsData.theme);

}



function toggleAIReader() {
    settingsData.aiReader = !settingsData.aiReader;

    if (!settingsData.aiReader) {
        aiReaderStop();
        aiReaderLastScreenKey = "";
        aiReaderLastQuizKey = "";
    } else {
        /*
         * The Settings button itself is a real user gesture.
         * Mark the reader as activated so mobile browsers are
         * allowed to start subsequent speech on supported screens.
         */
        aiReaderUserActivated = true;

        // Smallest safe unlock on the settings button gesture itself
        try {
            const unlockAudio = document.createElement("audio");
            unlockAudio.src = "data:audio/wav;base64,UklGRsAIAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
            unlockAudio.volume = 0.001;
            unlockAudio.play();
        } catch (e) {}

        aiReaderStop();
        aiReaderLastScreenKey = "";
        aiReaderLastQuizKey = "";

        /*
         * Settings is intentionally not a readable screen.
         * If a supported screen is already active, read it now.
         */
        const screen = aiReaderCurrentScreen();
        if (screen) {
            const text = aiReaderBuildCurrentScreenText(screen);
            if (text) aiReaderSpeak(text, true);
        }
    }

    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    updateSettingsDisplay();

    if (settingsData.aiReader) {
        aiReaderRefresh(true);
    }
}

/* =====================================
   QUESTIONER SELECTOR
===================================== */

function setQuestioner(questioner) {
    if (!["previous", "new"].includes(questioner)) return;
    settingsData.questioner = questioner;
    questionBank = getActiveQuestionBank();
    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    updateSettingsDisplay();
    updateHomeSubjectUnlocks();
    updateDailyChallengePanel();
    renderTitlesPanel();
}

/* =====================================
   SET THEME
===================================== */

function setTheme(theme) {
    if (!["original", "light", "dark"].includes(theme)) return;
    settingsData.theme = theme;
    applyTheme();
    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();
    updateSettingsDisplay();
    applyMusicSetting();
}



/* =====================================
   APPLY THEME
===================================== */

function applyTheme() {
    const allowed = ["original", "light", "dark"];
    const nextTheme = allowed.includes(settingsData?.theme) ? settingsData.theme : "original";
    document.body.classList.remove(
        "theme-light", "theme-dark", "theme-original",
        "light-mode", "dark-mode", "original-mode"
    );
    document.body.removeAttribute("data-theme");
    document.body.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme === "light" ? "light" : "dark";
    settingsData.theme = nextTheme;
    updateThemePreviewState(nextTheme);
}

function updateThemePreviewState(theme) {
    ["original", "light", "dark"].forEach(id => {
        const button = document.getElementById(id === "original" ? "originalMode" : `${id}Mode`);
        if (!button) return;
        const selected = settingsData.theme === id;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
        const label = button.querySelector(".theme-selected-label");
        if (label) label.textContent = selected ? "SELECTED" : "SELECT";
    });
}

/* =====================================
   LOAD SETTINGS
===================================== */

function loadSettings() {
    if (typeof settingsData.aiReader !== "boolean") {
        settingsData.aiReader = true;
        writeStoredJSON("proudGeonQuizSettings", settingsData);
    }
    if (window.audioManager) {
        audioManager.setSoundEnabled(settingsData.sound);
        audioManager.setMusicEnabled(settingsData.music);
    }

    applyTheme();
    updateSettingsDisplay();
    applyMusicSetting();
}


loadSettings();

/* =====================================
   AUDIO SETTINGS
===================================== */

function playAudioElement(id) {
    if (!settingsData.sound) return;
    if (window.audioManager) {
        audioManager.setSoundEnabled(true);
        audioManager.playSound(id);
        return;
    }
    const audio = document.getElementById(id);
    if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
}

function applyMusicSetting() {
    const motto = document.getElementById("mottoMusic");
    const home = document.getElementById("homeMusic");
    const game = document.getElementById("gameMusic");
    const victory = document.getElementById("victoryMusic");

    if (!settingsData.music) {
        if (window.audioManager) audioManager.setMusicEnabled(false);
        if (motto) motto.pause();
        if (home) home.pause();
        if (game) game.pause();
        if (victory) victory.pause();
        return;
    }
    if (window.audioManager) audioManager.setMusicEnabled(true);

    // Story Quiz uses the shared game track only on its reader/question screens.
    const storyReader = document.getElementById("storyReaderPanel");
    const storyQuestion = document.getElementById("storyQuestionPanel");
    if (
        (storyReader && aiReaderVisible(storyReader)) ||
        (storyQuestion && aiReaderVisible(storyQuestion))
    ) {
        startGameMusic();
        return;
    }
    if (document.body.classList.contains("story-quiz-active")) {
        if (window.audioManager) audioManager.stopAllMusic();
        return;
    }

    // Keep the existing screen-specific music behavior.
    const intro = document.getElementById("introFlow");
    if (intro && !intro.classList.contains("hidden")) {
        const active = intro.querySelector(".intro-step.active");
        const step = active ? Number(active.dataset.step) : 0;
        if (step === 2 || step === 3) startMottoMusic();
        return;
    }

    startHomeMusic();
}

function startGameAudio() {
    playAudioElement("clickSound");
}

document.addEventListener("click", function(event) {
    if (event.target.closest("button")) {
        if (event.target.id !== "musicToggle" && event.target.id !== "soundToggle") {
            playAudioElement("clickSound");
        }
    }
}, { passive: true });


/* =====================================
   SAVE SETTINGS
===================================== */

function saveSettings() {

    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (window.audioManager) {
        audioManager.setSoundEnabled(settingsData.sound);
        audioManager.setMusicEnabled(settingsData.music);
    }
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();

    applyTheme();

    updateSettingsDisplay();
    applyMusicSetting();

    closeSettings();

}

function exportSaveData() {
    const payload = window.GeonStorage?.exportAll?.() || { schemaVersion: 2, keys: {} };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `proudgeonquiz-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function importSaveData() {
    const input = document.getElementById("saveImportInput");
    if (!input) return;
    input.value = "";
    input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
            const payload = JSON.parse(await file.text());
            if (!window.GeonStorage?.validateImport?.(payload)) throw new Error("Invalid save package.");
            const result = window.GeonStorage.importAll(payload);
            if (!result.ok) throw new Error(result.error || "Import failed.");
            alert("Save data imported successfully. The game will reload.");
            location.reload();
        } catch (error) {
            alert(`Could not import save data: ${error.message}`);
        }
    };
    input.click();
}

function resetProgress() {
    const confirmed = window.confirm(
        "RESET ALL GAME PROGRESS?\n\nThis removes quiz progress, scores, coins, points, titles, achievements, inventory, statistics, and daily challenge data. Your settings, profile, code name, and backup will remain. This cannot be undone unless you have an exported backup."
    );
    if (!confirmed) return;
    const backupKey = window.GeonStorage?.backup?.("pre-reset");
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const preserve = key && (
            key.includes("Backup") ||
            key === "proudGeonQuizSettings" ||
            key === "proudGeonQuizProfileV1" ||
            key === "playerCodeName" ||
            key === "proudGeonQuizOfflineReady"
        );
        if (key && !preserve && (key === "dreamGameData" || key.startsWith("proudGeonQuiz"))) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
    if (!backupKey) console.warn("Progress reset completed without a backup because storage was unavailable.");
    location.reload();
}

/* =====================================
   RESET SETTINGS
===================================== */

function resetSettings() {

    settingsData = {
        music: true,
        sound: true,
        theme: "original",
        aiReader: true,
        questioner: "previous"
    };

    writeStoredJSON("proudGeonQuizSettings", settingsData);
    if (window.audioManager) {
        audioManager.setSoundEnabled(true);
        audioManager.setMusicEnabled(true);
    }
    if (typeof syncVersionedSaveSnapshot === "function") syncVersionedSaveSnapshot();

    applyTheme();
    updateSettingsDisplay();
    applyMusicSetting();
    updateHomeSubjectUnlocks();
    renderTitlesPanel();

}

/* =====================================
   SAFE ERROR HANDLING
   Non-critical runtime errors are logged without
   replacing the game's UI with a blank error page.
===================================== */

window.addEventListener("error", function (event) {
    console.warn("Proud Geon Quiz recovered from a runtime error.", event.error || event.message);
});

window.addEventListener("unhandledrejection", function (event) {
    console.warn("Proud Geon Quiz recovered from an async error.", event.reason);
});

/* =====================================
   STARTUP — SINGLE SCREEN + AUDIO STATE
===================================== */

document.body.classList.add("intro-active");
aiReaderInit();


window.addEventListener("resize", fitHomeNumbers);

document.addEventListener("DOMContentLoaded", function () {
    loadQuestionBank();
    const intro = document.getElementById("introFlow");
    const subjectPanel = document.getElementById("subjectSelection");

    if (intro) {
        intro.classList.remove("hidden");
        intro.setAttribute("aria-hidden", "false");
    }

    if (subjectPanel) {
        subjectPanel.classList.remove("show");
        subjectPanel.setAttribute("aria-hidden", "true");
    }

    stopMottoMusic();
    stopHomeMusic();
    updateHomeSubjectUnlocks();
    updateDailyChallengePanel();
    showIntroStep(1);
});

/* =====================================
   START AUDIO AFTER USER GESTURE
===================================== */
document.addEventListener("pointerdown", function once() {
    startGameAudio();
    document.removeEventListener("pointerdown", once);
}, { once: true });


/* AI Reader visibility safety — independent from game logic. */
document.addEventListener("visibilitychange", function () {
    if (document.hidden) aiReaderStop();
    else if (aiReaderIsEnabled()) aiReaderRefresh();
});

/* =====================================
   MAJOR UPDATE — AUDIO MANAGER ADAPTER
===================================== */
(function initAudioManagerAdapter() {
    if (!window.audioManager) return;
    audioManager.setMusicEnabled(Boolean(settingsData.music));
    audioManager.setSoundEnabled(Boolean(settingsData.sound));

    window.playAudioElement = function (id) {
        const map = {
            clickSound: "click",
            correctSound: "correct",
            wrongSound: "wrong"
        };
        return audioManager.playSound(map[id] || id);
    };

    window.stopMottoMusic = function () { audioManager.stopMusic("motto"); };
    window.stopHomeMusic = function () { audioManager.stopMusic("home"); };
    window.stopGameMusic = function () { audioManager.stopMusic("game"); };
    window.stopVictoryMusic = function () { audioManager.stopMusic("victory"); };
    window.startMottoMusic = function () { return audioManager.playMusic("motto"); };
    window.startIntroSharedMusic = function () { return audioManager.playMusic("motto"); };
    window.startHomeMusic = function () { return audioManager.playMusic("home"); };
    window.startGameMusic = function () { return audioManager.playMusic("game"); };
    window.startVictoryMusic = function () { return audioManager.playMusic("victory"); };
    window.startGameAudio = function () { return audioManager.playSound("click"); };

    window.applyMusicSetting = function () {
        audioManager.setMusicEnabled(Boolean(settingsData.music));
        if (!settingsData.music) {
            audioManager.stopAllMusic();
            return;
        }
        const storyReader = document.getElementById("storyReaderPanel");
        const storyQuestion = document.getElementById("storyQuestionPanel");
        if (
            (storyReader && aiReaderVisible(storyReader)) ||
            (storyQuestion && aiReaderVisible(storyQuestion))
        ) {
            audioManager.playMusic("game");
            return;
        }
        if (document.body.classList.contains("story-quiz-active")) {
            audioManager.stopAllMusic();
            return;
        }
        const intro = document.getElementById("introFlow");
        if (intro && !intro.classList.contains("hidden")) {
            const active = intro.querySelector(".intro-step.active");
            const step = active ? Number(active.dataset.step) : 0;
            if (step === 2 || step === 3) audioManager.playMusic("motto");
            else audioManager.stopAllMusic();
            return;
        }
        if (document.body.classList.contains("quiz-active")) audioManager.playMusic("game");
        else if (document.getElementById("victoryScreen")?.classList.contains("show")) audioManager.playMusic("victory");
        else audioManager.playMusic("home");
    };

    window.addEventListener("visibilitychange", () => {
        if (document.hidden) audioManager.stopAllMusic();
    });
})();

/* =====================================
   MAJOR UPDATE — OFFLINE/PWA STATUS
===================================== */
(function initOfflineStatus() {
    const status = document.getElementById("offlineStatus");
    if (!status) return;

    function render() {
        if (!navigator.onLine) {
            status.textContent = "OFFLINE • PLAYING FROM CACHED GAME DATA";
            status.dataset.state = "offline";
        } else if (localStorage.getItem("proudGeonQuizOfflineReady") === "1") {
            status.textContent = "ONLINE • READY FOR OFFLINE PLAY";
            status.dataset.state = "ready";
        } else {
            status.textContent = "ONLINE • CACHING GAME FOR OFFLINE PLAY…";
            status.dataset.state = "loading";
        }
    }
    render();
    window.addEventListener("online", render);
    window.addEventListener("offline", render);
    window.addEventListener("geon-offline-ready", render);

    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("./service-worker.js")
                .then(reg => {
                    if (reg.active) {
                        render();
                        reg.active.postMessage({ type: "PING" });
                    }
                    navigator.serviceWorker.addEventListener("message", event => {
                        if (event.data?.type === "OFFLINE_READY") {
                            localStorage.setItem("proudGeonQuizOfflineReady", "1");
                            render();
                        }
                    });
                })
                .catch(error => {
                    status.textContent = "ONLINE • OFFLINE CACHE UNAVAILABLE";
                    status.dataset.state = "warning";
                    console.warn("PWA service worker registration failed.", error);
                });
        });
    }
})();

/* Keep a v2 save snapshot synchronized without replacing legacy keys. */
function syncVersionedSaveSnapshot() {
    if (!window.GeonStorage) return;

    const snapshot = window.GeonStorage.get("proudGeonQuizSaveV2", {}) || {};
    const progressState = collectLegacyProgressState();
    const titleState = {
        previous: readStoredJSON("proudGeonQuizTitleProgressV2", {}),
        new: readStoredJSON("proudGeonQuizTitleProgressV2:new", {})
    };
    const date = getDailyChallengeDate();
    const questioner = getActiveQuestioner();
    const dailyKey = dailyChallengeStorageKey(date, questioner);

    snapshot.schemaVersion = GAME_SAVE_VERSION;
    snapshot.updatedAt = new Date().toISOString();
    snapshot.player = {
        profileId: readLegacyText("proudGeonQuizProfileV1", "explorer"),
        codeName: readLegacyText("playerCodeName", "CODE NAME")
    };
    snapshot.economy = {
        coins: safeNonNegativeInt(gameData.coins, 0, 1000000000),
        points: safeNonNegativeInt(gameData.points, 0, 1000000000)
    };
    snapshot.statistics = {
        gamesPlayed: safeNonNegativeInt(gameData.gamesPlayed, 0, 1000000000),
        wins: safeNonNegativeInt(gameData.wins, 0, 1000000000),
        losses: safeNonNegativeInt(gameData.losses, 0, 1000000000),
        correctAnswers: safeNonNegativeInt(gameData.correctAnswers, 0, 1000000000),
        totalQuestions: safeNonNegativeInt(gameData.totalQuestions, 0, 1000000000)
    };
    snapshot.settings = readStoredJSON("proudGeonQuizSettings", {});
    snapshot.inventory = readStoredJSON("proudGeonQuizItemInventoryV1", {});
    snapshot.titles = titleState.previous;
    snapshot.titlesByQuestioner = titleState;
    snapshot.achievements = readStoredJSON("proudGeonQuizSpecialAchievementsV1", {});
    snapshot.quizProgress = progressState.quizProgress;
    snapshot.quizProgressByQuestioner = progressState.quizProgressByQuestioner;
    snapshot.usedQuestionIds = progressState.usedQuestionIds;
    snapshot.usedQuestionIdsByQuestioner = progressState.usedQuestionIdsByQuestioner;
    snapshot.bestStreak = { bestStreak: getAllTimeBestStreak() };
    snapshot.subjectStats = {
        previous: readStoredJSON("proudGeonQuizSubjectStatsV1:previous", {}),
        new: readStoredJSON("proudGeonQuizSubjectStatsV1:new", {})
    };
    snapshot.dailyChallenges = {
        [dailyKey]: readStoredJSON(dailyKey, {})
    };
    window.GeonStorage.set("proudGeonQuizSaveV2", snapshot);
}

/* =====================================
   FINAL ACCESSIBILITY + RESPONSIVE GUARDS
===================================== */
(function installAccessibilityGuards() {
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            const dismissible = [
                "comingSoonPopup","infoPanel","settingsPanel","menuPanel",
                "profilePanel","pointsConversionPanel","shopPanel","inventoryPanel",
                "reviewerModePanel","dailyChallengePanel","titlesPanel","leaderboardsPanel"
            ];
            for (const id of dismissible) {
                const el = document.getElementById(id);
                if (el?.classList.contains("show")) {
                    const closeName = {
                        comingSoonPopup: "closeComingSoon", infoPanel: "closeInfo",
                        settingsPanel: "closeSettings", menuPanel: "closeMenu",
                        profilePanel: "closeProfilePanel", pointsConversionPanel: "closePointsConversionPanel",
                        shopPanel: "closeShopPanel", inventoryPanel: "closeInventoryPanel",
                        reviewerModePanel: "closeReviewerModePanel", dailyChallengePanel: "closeDailyChallengePanel",
                        titlesPanel: "closeTitlesPanel", leaderboardsPanel: "closeLeaderboardsPanel"
                    }[id];
                    if (closeName && typeof window[closeName] === "function") window[closeName]();
                    break;
                }
            }
        }
    });

    document.querySelectorAll("button").forEach(button => {
        if (!button.getAttribute("aria-label") && !button.textContent.trim()) {
            button.setAttribute("aria-label", "Game action");
        }
    });
})();

window.addEventListener("beforeunload", syncVersionedSaveSnapshot);
window.addEventListener("resize", (() => {
    let timer = 0;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fitHomeNumbers();
            updateContinueJourneyCard();
        }, 100);
    };
})());

document.addEventListener("DOMContentLoaded", () => {
    updateThemePreviewState(settingsData.theme);
    updateContinueJourneyCard();
    setTimeout(() => {
        try { syncVersionedSaveSnapshot(); } catch (error) { console.warn("Save snapshot sync skipped.", error); }
        try { applyMusicSetting(); } catch (error) { console.warn("Audio startup skipped.", error); }
    }, 0);
});
