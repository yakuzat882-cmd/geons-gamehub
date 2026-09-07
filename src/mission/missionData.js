/* Start Your Mission — five subject-driven problem missions. */
(function (global) {
  "use strict";

  const missions = Object.freeze([
    Object.freeze({
      id: "mission_math",
      subject: "MATH",
      title: "The Supply Count",
      difficulty: "CORE",
      story: "Your team is preparing 6 supply crates for a field camp. Each crate must contain 8 water bottles. You have to calculate the total number of bottles before the team can leave.",
      objective: "Calculate the total water bottles needed for all 6 crates.",
      question: "How many water bottles are needed in total?",
      choices: ["14", "42", "48", "56"],
      correctAnswer: 2,
      explanation: "There are 6 crates with 8 bottles each, so 6 × 8 = 48 bottles."
    }),
    Object.freeze({
      id: "mission_science",
      subject: "SCIENCE",
      title: "The Cooling Test",
      difficulty: "CORE",
      story: "A science team leaves two identical cups of hot water on a table. One cup is covered while the other is left uncovered. After some time, the uncovered cup loses heat faster because it is exposed directly to the surrounding air.",
      objective: "Identify the setup that loses heat faster.",
      question: "Which cup should cool faster?",
      choices: ["The covered cup", "The uncovered cup", "Both always cool at exactly the same rate", "Neither cup loses heat"],
      correctAnswer: 1,
      explanation: "The uncovered cup is directly exposed to the surrounding air, so it should lose heat faster in this setup."
    }),
    Object.freeze({
      id: "mission_psychology",
      subject: "PSYCHOLOGY",
      title: "The Pressure Choice",
      difficulty: "CORE",
      story: "During a team discussion, a teammate becomes upset after receiving harsh criticism. Instead of arguing back, you pause, listen carefully, and ask what part of the feedback felt unfair. This gives the teammate space to explain the situation before the team decides what to do.",
      objective: "Choose the response that best supports calm problem solving.",
      question: "What is the most constructive first response?",
      choices: ["Interrupt and argue immediately", "Ignore the teammate", "Listen and ask a calm clarifying question", "Blame another teammate"],
      correctAnswer: 2,
      explanation: "Listening and asking a calm clarifying question helps reduce escalation and gathers useful information before a decision."
    }),
    Object.freeze({
      id: "mission_tech1",
      subject: "TECH 1",
      title: "The Safe System Check",
      difficulty: "CORE",
      story: "You are about to open a desktop system unit to inspect a loose component. Before touching the internal parts, you shut the computer down, disconnect the power source, and prepare a safe workspace. Your objective is to prevent electrical and component damage during the inspection.",
      objective: "Select the safest preparation before handling internal components.",
      question: "What should you do before touching the internal components?",
      choices: ["Keep the system powered on", "Disconnect the power source after shutdown", "Spray liquid inside the case", "Pull components out immediately"],
      correctAnswer: 1,
      explanation: "The system should be shut down and disconnected from its power source before handling internal components."
    }),
    Object.freeze({
      id: "mission_tech2",
      subject: "TECH 2",
      title: "The Network Link",
      difficulty: "CORE",
      story: "A workstation can use its browser normally, but it cannot reach other devices on the local network. The network cable is firmly connected, so you inspect the workstation's network configuration to find the local connection problem.",
      objective: "Identify the configuration area most directly related to local network communication.",
      question: "Which setting is most directly related to the workstation's local network address?",
      choices: ["IP address", "Screen brightness", "Keyboard layout", "Desktop wallpaper"],
      correctAnswer: 0,
      explanation: "The IP address identifies the workstation on an IP network and is directly relevant to local network communication."
    })
  ]);

  function validMission(item) {
    return item && item.id && item.subject && item.title &&
      typeof item.story === "string" && item.story.trim() &&
      typeof item.objective === "string" && item.objective.trim() &&
      typeof item.question === "string" && item.question.trim() &&
      Array.isArray(item.choices) && item.choices.length === 4 &&
      new Set(item.choices.map(String)).size === 4 &&
      Number.isInteger(Number(item.correctAnswer)) &&
      Number(item.correctAnswer) >= 0 && Number(item.correctAnswer) < 4;
  }

  global.ProudGeonMissionData = missions;
  global.validateMissionData = () => missions.length === 5 && missions.every(validMission);
})(window);
