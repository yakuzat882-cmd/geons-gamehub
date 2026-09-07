/* ProudGeonQuiz shared pure game utilities. Classic-script compatible. */
(function (global) {
  "use strict";

  const SUBJECTS = ["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"];
  const QUIZ_TYPES = ["SUBJECT 1", "SUBJECT 2"];
  const QUESTION_CATEGORY_COUNTS = Object.freeze({
    "MATH": { "MULTIPLICATION": 15, "DIVISION": 15, "ADDITION": 15, "SUBTRACTION": 15, "PROBLEM SOLVING": 20 },
    "PSYCHOLOGY": { "MIND MANIPULATIONS": 20, "SELF RESILIENCE": 20, "CONVINCE OTHERS": 20, "HOW TO BECOME UNSTOPPABLE": 20 },
    "SCIENCE": { "SOLID, LIQUID, GAS": 15, "TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS": 15, "PASCAL'S PRINCIPLES": 20, "ARCHIMEDE'S PRINCIPLES": 15, "HISTORY": 15 },
    "TECH 1": { "SYSTEM UNIT AND ITS COMPONENTS": 30, "OHS GUIDELINES AND DMA PROCEDURES": 20, "ASSEMBLE AND DISASSEMBLE SYSTEM UNIT": 30 },
    "TECH 2": { "BIOS, CMOS, UEFI": 30, "NETWORKING": 20, "WINDOWS INSTALLATION": 20, "SAFETY PROCEDURES": 10 }
  });
  const REWARD_BANDS = [
    { maxLevel: 20, score: 50, coins: 5, points: 10 },
    { maxLevel: 40, score: 100, coins: 10, points: 20 },
    { maxLevel: 60, score: 175, coins: 15, points: 35 },
    { maxLevel: 80, score: 300, coins: 25, points: 60 }
  ];

  function safeInt(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(max, Math.floor(n)));
  }

  function plainRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function sanitizeNumericMap(value, max = 999, depth = 0) {
    const source = plainRecord(value);
    return Object.fromEntries(Object.entries(source).map(([key, item]) => [
      String(key).slice(0, 120),
      depth < 2 && item && typeof item === "object" && !Array.isArray(item)
        ? sanitizeNumericMap(item, max, depth + 1)
        : safeInt(item, 0, max)
    ]));
  }

  function sanitizeIdMap(value) {
    const source = plainRecord(value);
    const output = {};
    Object.entries(source).forEach(([key, ids]) => {
      if (!Array.isArray(ids)) return;
      output[String(key).slice(0, 120)] = [...new Set(ids
        .filter(id => typeof id === "string" || typeof id === "number")
        .map(String)
        .filter(Boolean))].slice(0, 80);
    });
    return output;
  }

  function sanitizeNestedIdMap(value) {
    const source = plainRecord(value);
    const output = {};
    Object.entries(source).forEach(([group, map]) => {
      if (!map || typeof map !== "object" || Array.isArray(map)) return;
      output[String(group).slice(0, 32)] = sanitizeIdMap(map);
    });
    return output;
  }

  function sanitizeSettings(value) {
    const source = plainRecord(value);
    const allowedThemes = ["original", "light", "dark"];
    const allowedQuestioners = ["previous", "new"];
    return {
      music: typeof source.music === "boolean" ? source.music : true,
      sound: typeof source.sound === "boolean" ? source.sound : true,
      aiReader: typeof source.aiReader === "boolean" ? source.aiReader : true,
      theme: allowedThemes.includes(source.theme) ? source.theme : "original",
      questioner: allowedQuestioners.includes(source.questioner) ? source.questioner : "previous"
    };
  }

  function sanitizeAchievements(value) {
    const source = plainRecord(value);
    const output = {};
    Object.entries(source).slice(0, 200).forEach(([key, record]) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return;
      output[String(key).slice(0, 120)] = {
        unlocked: Boolean(record.unlocked),
        date: typeof record.date === "string" ? record.date.slice(0, 64) : ""
      };
    });
    return output;
  }

  function sanitizeDailyChallenges(value) {
    const source = plainRecord(value);
    const output = {};
    Object.entries(source).slice(0, 32).forEach(([key, record]) => {
      if (!record || typeof record !== "object" || Array.isArray(record)) return;
      const ids = Array.isArray(record.questionIds)
        ? [...new Set(record.questionIds.filter(id => typeof id === "string" || typeof id === "number").map(String))].slice(0, 10)
        : [];
      output[String(key).slice(0, 240)] = {
        date: typeof record.date === "string" ? record.date.slice(0, 16) : "",
        questioner: record.questioner === "new" ? "new" : "previous",
        questionIds: ids,
        completed: Boolean(record.completed),
        rewardClaimed: Boolean(record.rewardClaimed),
        attempts: safeInt(record.attempts, 0, 1000000),
        updatedAt: safeInt(record.updatedAt, 0, Number.MAX_SAFE_INTEGER)
      };
    });
    return output;
  }

  function sanitizeSubjectStats(value) {
    const source = plainRecord(value);
    const output = {};
    Object.entries(source).slice(0, 4).forEach(([key, group]) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) return;
      output[String(key).slice(0, 32)] = sanitizeNumericMap(group, 1000000000);
    });
    return output;
  }

  function sanitizeSave(raw) {
    const source = plainRecord(raw);
    const player = plainRecord(source.player);
    const economy = plainRecord(source.economy);
    const statistics = plainRecord(source.statistics);
    const totalQuestions = safeInt(statistics.totalQuestions, 0, 1000000000);
    const correctAnswers = Math.min(
      totalQuestions,
      safeInt(statistics.correctAnswers, 0, 1000000000)
    );
    return {
      schemaVersion: 2,
      player: {
        profileId: typeof player.profileId === "string" ? player.profileId.slice(0, 64) : "explorer",
        codeName: typeof player.codeName === "string" ? player.codeName.slice(0, 24) : "CODE NAME"
      },
      economy: {
        coins: safeInt(economy.coins, 0, 1000000000),
        points: safeInt(economy.points, 0, 1000000000)
      },
      statistics: {
        gamesPlayed: safeInt(statistics.gamesPlayed, 0, 1000000000),
        wins: safeInt(statistics.wins, 0, 1000000000),
        losses: safeInt(statistics.losses, 0, 1000000000),
        correctAnswers,
        totalQuestions
      },
      quizProgress: sanitizeNumericMap(source.quizProgress, 80),
      quizProgressByQuestioner: sanitizeNumericMap(source.quizProgressByQuestioner, 80),
      usedQuestionIds: sanitizeIdMap(source.usedQuestionIds),
      usedQuestionIdsByQuestioner: sanitizeNestedIdMap(source.usedQuestionIdsByQuestioner),
      titles: sanitizeNumericMap(source.titles, 80),
      titlesByQuestioner: sanitizeNumericMap(source.titlesByQuestioner, 80),
      achievements: sanitizeAchievements(source.achievements),
      inventory: sanitizeNumericMap(source.inventory, 999),
      bestStreak: { bestStreak: safeInt(plainRecord(source.bestStreak).bestStreak, 0, 100000) },
      subjectStats: sanitizeSubjectStats(source.subjectStats),
      dailyChallenges: sanitizeDailyChallenges(source.dailyChallenges),
      settings: sanitizeSettings(source.settings)
    };
  }

  function validateQuestion(question) {
    const q = question && typeof question === "object" ? question : {};
    const errors = [];
    if (!q.id) errors.push("missing id");
    if (!SUBJECTS.includes(q.subject)) errors.push("invalid subject");
    const quizType = q.quizType || q.quizPath;
    if (!QUIZ_TYPES.includes(quizType)) errors.push("invalid quiz type");
    const level = Number(q.level);
    if (!Number.isInteger(level) || level < 1 || level > 80) errors.push("invalid level");
    if (typeof q.question !== "string" || !q.question.trim()) errors.push("empty question");
    if (!Array.isArray(q.choices) || q.choices.length < 2) errors.push("invalid choices");
    if (Array.isArray(q.choices) && !q.choices.includes(q.answer)) errors.push("answer not in choices");
    return { valid: errors.length === 0, errors };
  }

  function validateQuestionBank(bank, expectedMode = "") {
    const report = { valid: true, total: 0, errors: [], missingLevels: [], categoryCounts: {} };
    const seenIds = new Set();
    const seenSignatures = new Set();
    const normalizedMode = expectedMode === "new" || expectedMode === "previous" ? expectedMode : "";
    SUBJECTS.forEach(subject => {
      report.categoryCounts[subject] = {};
      QUIZ_TYPES.forEach(quizType => {
        const rows = bank?.[subject]?.[quizType] || [];
        const levels = new Set();
        const categoryCounts = {};
        if (!Array.isArray(rows)) {
          report.valid = false;
          report.errors.push(`${subject}/${quizType}: missing array`);
          return;
        }
        if (rows.length !== 80) {
          report.valid = false;
          report.errors.push(`${subject}/${quizType}: expected 80 questions, found ${rows.length}`);
        }
        rows.forEach((q, index) => {
          report.total += 1;
          const result = validateQuestion(q);
          if (!result.valid) {
            report.valid = false;
            report.errors.push(`${subject}/${quizType}[${index}]: ${result.errors.join(", ")}`);
          }
          if (q?.subject !== subject || q?.quizType !== quizType) {
            report.valid = false;
            report.errors.push(`${subject}/${quizType}[${index}]: subject/quiz type mismatch`);
          }
          const id = String(q?.id || "");
          if (id && seenIds.has(id)) {
            report.valid = false;
            report.errors.push(`${subject}/${quizType}[${index}]: duplicate id ${id}`);
          }
          if (id) {
            seenIds.add(id);
            if (normalizedMode && !id.startsWith(`${normalizedMode.toUpperCase()}-`)) {
              report.valid = false;
              report.errors.push(`${subject}/${quizType}[${index}]: id is not isolated to ${normalizedMode}`);
            }
          }
          const level = Number(q?.level);
          if (Number.isInteger(level)) levels.add(level);
          const category = String(q?.category || "");
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          const signature = JSON.stringify([
            String(q?.question || "").trim().toLowerCase(),
            Array.isArray(q?.choices) ? q.choices.map(String).sort() : [],
            String(q?.answer || ""),
            category, subject, level
          ]);
          if (seenSignatures.has(signature)) {
            report.valid = false;
            report.errors.push(`${subject}/${quizType}[${index}]: duplicate question signature`);
          }
          seenSignatures.add(signature);
        });
        report.categoryCounts[subject][quizType] = categoryCounts;
        const missing = [];
        for (let level = 1; level <= 80; level += 1) if (!levels.has(level)) missing.push(level);
        if (missing.length) {
          report.valid = false;
          report.missingLevels.push({ subject, quizType, levels: missing });
        }
        const expected = QUESTION_CATEGORY_COUNTS[subject];
        Object.entries(expected || {}).forEach(([category, count]) => {
          if (categoryCounts[category] !== count) {
            report.valid = false;
            report.errors.push(`${subject}/${quizType}: ${category} expected ${count}, found ${categoryCounts[category] || 0}`);
          }
        });
      });
    });
    if (report.total !== 800) {
      report.valid = false;
      report.errors.push(`Question bank total expected 800, found ${report.total}`);
    }
    return report;
  }

  function rewardBand(level) {
    const n = Math.max(1, Math.min(80, safeInt(level, 1, 80)));
    return REWARD_BANDS.find(b => n <= b.maxLevel) || REWARD_BANDS[3];
  }

  function calculateAnswerReward({ level = 1, correct = false, streak = 0 } = {}) {
    if (!correct) return { score: 0, coins: 0, points: 0, streakBonus: 0, achievementEvents: [] };
    const base = rewardBand(level);
    const s = safeInt(streak, 0, 100000);
    let multiplier = 1;
    if (s >= 20) multiplier = 3;
    else if (s >= 15) multiplier = 2.5;
    else if (s >= 10) multiplier = 2;
    else if (s >= 5) multiplier = 1.5;
    else if (s >= 3) multiplier = 1.2;
    const score = Math.round(base.score * multiplier);
    return {
      score,
      coins: base.coins,
      points: base.points,
      streakBonus: score - base.score,
      achievementEvents: []
    };
  }

  function milestoneReward(streak) {
    const rewards = {
      3: { score: 25, coins: 0, points: 0, name: "HOT START" },
      5: { score: 50, coins: 5, points: 0, name: "ON FIRE" },
      10: { score: 100, coins: 10, points: 10, name: "UNSTOPPABLE" },
      15: { score: 150, coins: 15, points: 15, name: "QUIZ MASTER" },
      20: { score: 250, coins: 25, points: 25, name: "LEGENDARY" }
    };
    return rewards[safeInt(streak, 0)] || null;
  }

  global.GeonGameCore = {
    SUBJECTS,
    QUIZ_TYPES,
    REWARD_BANDS,
    safeInt,
    sanitizeSave,
    validateQuestion,
    validateQuestionBank,
    rewardBand,
    calculateAnswerReward,
    milestoneReward
  };
})(window);
