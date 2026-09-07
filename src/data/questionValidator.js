/* Development/runtime question-bank validation. */
(function (global) {
  "use strict";
  global.GeonQuestionValidator = {
    normalize(bank) {
      const normalized = {};
      const subjects = ["MATH", "SCIENCE", "PSYCHOLOGY", "TECH 1", "TECH 2"];
      subjects.forEach(subject => {
        normalized[subject] = {};
        ["SUBJECT 1", "SUBJECT 2"].forEach(type => {
          const rows = Array.isArray(bank?.[subject]?.[type]) ? bank[subject][type] : [];
          normalized[subject][type] = rows.map(q => ({
            ...q,
            subject: subject,
            quizType: q.quizType || q.quizPath || type,
            quizPath: q.quizPath || q.quizType || type,
            level: Number(q.level),
            id: String(q.id),
            question: String(q.question || ""),
            choices: Array.isArray(q.choices) ? q.choices.map(String) : [],
            answer: String(q.answer || ""),
            explanation: q.explanation == null ? "" : String(q.explanation),
            hint: q.hint == null ? "" : String(q.hint),
            tags: Array.isArray(q.tags) ? q.tags.map(String) : []
          }));
        });
      });
      return normalized;
    },
    validate(bank, expectedMode = "") {
      return global.GeonGameCore?.validateQuestionBank(bank, expectedMode) || { valid: false, total: 0, errors: ["Validator unavailable"], missingLevels: [] };
    }
  };
})(window);
