/*
 * PSYCHOLOGY content.
 *
 * Concepts are curated, not generated: every definition, true statement and correct
 * practice is written for one concept only. The frame engine can therefore build
 * questions whose marked-correct option is guaranteed to be the right one, while the
 * wrong options come from other concepts or from curated poor practices.
 */

module.exports = {
  "MIND MANIPULATIONS": {
    hints: [
      "Name the influence technique that is doing the work in the situation.",
      "Match the situation to the concept whose defining idea fits it exactly.",
      "Check what actually changed the other person's decision before choosing."
    ],
    flaws: [
      "rush the decision by hiding the details of the offer",
      "repeat the claim louder instead of answering the question",
      "copy the other side's numbers without checking them",
      "promise whatever is needed to close the deal today",
      "keep the pressure on after the person asks for time",
      "treat one example as proof about the whole market"
    ],
    constraints: [
      "keeping the offer honest",
      "respecting the other person's right to refuse",
      "staying inside the stated budget",
      "keeping the discussion on the actual facts"
    ],
    concepts: [
      {
        t: "FRAMING",
        d: "presenting the same facts in different ways so that one version feels more attractive",
        f: "Framing changes how a choice feels even when the underlying facts stay the same.",
        p: "restate the same facts in wording that matches how the audience sees the issue",
        s: "A menu labels the same dish as 90% lean on one page and 10% fat on another, and diners rate the first one higher.",
        n: "A supplier quotes the same delivery cost as a fixed fee in one proposal and as a small per-unit charge in another, and the buyer prefers the second version.",
        q: "same facts, different wording"
      },
      {
        t: "ANCHORING",
        d: "letting the first number mentioned pull later estimates toward it",
        f: "Anchoring makes later estimates drift toward the first number a person hears.",
        p: "set a realistic reference value before any figure is discussed",
        s: "A negotiator opens with a very high price, and every later offer from the other side stays close to it.",
        n: "A project estimate opens with the vendor's premium tier price, and the team's final budget lands close to that figure instead of near the real cost of the work.",
        q: "first figure sets the range"
      },
      {
        t: "SCARCITY APPEAL",
        d: "making an option feel valuable by stressing that it is limited or running out",
        f: "Scarcity appeal raises interest by emphasising limited availability rather than the quality of the offer.",
        p: "verify whether the stated limit is real before treating the offer as urgent",
        s: "A shop advertises that only three units are left, and buyers reserve stock they had earlier ignored.",
        n: "A ticketing page shows a countdown and a shrinking stock bar, and visitors buy seats they had earlier set aside as unnecessary.",
        q: "limited stock pressure"
      },
      {
        t: "SOCIAL PROOF",
        d: "treating the behaviour of other people as evidence for what is correct",
        f: "Social proof works because people copy what they believe most other people are doing.",
        p: "check independent evidence instead of relying on how many people did the same thing",
        s: "A trainee follows a shortcut because everyone in the group uses it, even though the manual says otherwise.",
        n: "A product page shows thousands of recent orders but publishes no specifications, and the buyer orders it anyway.",
        q: "following the crowd"
      },
      {
        t: "RECIPROCITY",
        d: "feeling obliged to return a favour after receiving something first",
        f: "Reciprocity creates a sense of obligation after someone gives a gift or a concession first.",
        p: "judge the actual request separately from the favour that came before it",
        s: "A salesperson hands out free samples, and customers then feel pressure to buy something in return.",
        n: "A consultant performs a free audit, and the manager later approves a larger contract without comparing other suppliers.",
        q: "a favour creates obligation"
      },
      {
        t: "FOOT-IN-THE-DOOR",
        d: "starting with a small request so that a larger request is more likely to be accepted later",
        f: "Foot-in-the-door relies on an initial small agreement before a bigger request is made.",
        p: "decide on each request on its own merits, even after agreeing to a small one",
        s: "A volunteer answers a short survey and is then asked to commit to a full weekend event.",
        n: "A user accepts a minor permission during setup and is later asked to hand over full account access.",
        q: "small request, then big"
      },
      {
        t: "DOOR-IN-THE-FACE",
        d: "opening with an extreme request so that a smaller request looks like a concession",
        f: "Door-in-the-face pairs an unreasonable opening request with a smaller follow-up that then feels acceptable.",
        p: "judge the follow-up request as if it had been the first one offered",
        s: "A vendor asks for a five-year contract and then presents a one-year deal as a compromise.",
        n: "A department lead proposes an impossible deadline and then asks the team to accept weekend overtime instead.",
        q: "extreme request first"
      },
      {
        t: "GUILT APPEAL",
        d: "using blame or shame to push someone toward a decision",
        f: "Guilt appeal pushes a decision by making a person feel responsible for a bad outcome.",
        p: "separate genuine responsibility from pressure created to force a quick answer",
        s: "A message claims that families will suffer unless the reader donates immediately.",
        n: "A memo warns that colleagues will be blamed unless everyone agrees to an unpaid extra shift.",
        q: "shame used as pressure"
      }
    ]
  },

  "SELF RESILIENCE": {
    hints: [
      "Look for the response that reduces the problem over time.",
      "Identify the coping behaviour, not the feeling that came with it.",
      "Judge the options by what they do to future performance."
    ],
    flaws: [
      "ignore the problem and hope it disappears",
      "blame yourself for everything that went wrong",
      "work longer hours instead of fixing the bottleneck",
      "keep the stress private and refuse all offers of help",
      "treat one bad result as proof that nothing will work",
      "skip sleep and breaks to catch up"
    ],
    constraints: [
      "keeping the workload realistic",
      "staying inside the deadline",
      "keeping the team informed",
      "asking for help early enough"
    ],
    concepts: [
      {
        t: "COGNITIVE REAPPRAISAL",
        d: "changing how a stressful event is interpreted without denying what happened",
        f: "Cognitive reappraisal changes the interpretation of an event while the facts stay the same.",
        p: "name the facts first, then look for a more useful reading of them",
        s: "A student who failed a test treats it as information about what to study next instead of proof of being incapable.",
        n: "After a rejected proposal the team rewrites its notes as a list of what the client valued and what to change next time.",
        q: "facts kept, meaning shifted"
      },
      {
        t: "ADAPTIVE COPING",
        d: "responding to a problem with actions that reduce it over time",
        f: "Adaptive coping uses practical steps or healthy support instead of avoiding the problem.",
        p: "break the problem into one step that can be taken today",
        s: "Faced with missed deadlines, a worker lists the causes and asks for a revised schedule.",
        n: "When a shift is understaffed, the team lead reassigns tasks and reports the gap instead of hoping for overtime.",
        q: "practical response to stress"
      },
      {
        t: "GROWTH MINDSET",
        d: "treating ability as something that develops with effort and feedback",
        f: "Growth mindset treats skill as something that improves through effort and feedback.",
        p: "ask what practice would raise the next result instead of judging the person",
        s: "A learner who solves only half of the exercises looks for the pattern behind the mistakes.",
        n: "A technician whose repair failed reviews the diagnosis and books practice time on the same fault type.",
        q: "skill improves with effort"
      },
      {
        t: "SELF-EFFICACY",
        d: "believing that your own actions can change the outcome of a specific task",
        f: "Self-efficacy is the belief that your own actions can influence the result of a task.",
        p: "recall a similar task that was handled well before starting",
        s: "A new employee volunteers for a difficult task because a similar task went well last month.",
        n: "A presenter who has handled small briefings agrees to lead a larger one and prepares using the earlier notes.",
        q: "confidence from past success"
      },
      {
        t: "EMOTION REGULATION",
        d: "managing the strength and expression of feelings so that decisions stay steady",
        f: "Emotion regulation manages how strong a feeling becomes before it drives a decision.",
        p: "pause, name the feeling, and choose the response deliberately",
        s: "A worker who receives harsh feedback takes a short break before replying to the message.",
        n: "During a tense review, a supervisor writes the objections down and answers them one by one instead of reacting.",
        q: "feelings managed before acting"
      },
      {
        t: "SOCIAL SUPPORT",
        d: "reaching out to people who can listen, advise, or share the load",
        f: "Social support works by drawing on people who can listen, advise or share the workload.",
        p: "ask a specific person for a specific kind of help",
        s: "A trainee asks a senior colleague to check the plan before submitting it.",
        n: "A team facing two weeks of backlog agrees who will ask the other department for staffing help.",
        q: "help from other people"
      },
      {
        t: "SELF-COMPASSION",
        d: "speaking to yourself with the fairness you would show a colleague in the same situation",
        f: "Self-compassion means treating your own mistake with the fairness you would offer a colleague.",
        p: "acknowledge the mistake, then state the next useful action",
        s: "After a presentation that went badly, a student writes down what to improve instead of repeating insults about themselves.",
        n: "A developer whose release broke the build documents the cause, fixes it and stops blaming their own ability.",
        q: "fairness toward yourself"
      },
      {
        t: "REST AND RECOVERY",
        d: "planning sleep, breaks and time away so that performance can be sustained",
        f: "Rest and recovery protect performance by planning sleep, breaks and time away from the task.",
        p: "schedule the break before the work starts, not after the collapse",
        s: "A reviewer works in scheduled blocks with short pauses instead of one long unbroken session.",
        n: "Before a two-week release push, the team lead books shorter shifts and rotates the on-call duty.",
        q: "planned breaks and sleep"
      }
    ]
  },

  "CONVINCE OTHERS": {
    hints: [
      "Decide which persuasion behaviour the situation actually shows.",
      "Prefer the option that keeps the audience able to check the claim.",
      "Match the action to the concept named in the question."
    ],
    flaws: [
      "repeat the claim louder instead of answering the objection",
      "hide the weak points until the decision has been made",
      "quote numbers without saying where they came from",
      "push the person to decide before they have the facts",
      "use jargon the audience cannot check",
      "agree with everything just to keep the room comfortable"
    ],
    constraints: [
      "keeping every claim accurate",
      "respecting the audience's time",
      "answering the main objection",
      "leaving the decision to the audience"
    ],
    concepts: [
      {
        t: "EVIDENCE-BASED ARGUMENT",
        d: "supporting a claim with data or records that other people can check",
        f: "Evidence-based argument supports a claim with data or records that others can verify.",
        p: "state the claim and show the source that supports it",
        s: "A technician proposes a replacement part and attaches the test results that show the old one failing.",
        n: "A team defends a budget request with three months of usage data instead of personal impressions.",
        q: "claim backed by proof"
      },
      {
        t: "ACTIVE LISTENING",
        d: "hearing the other side fully, then repeating it back before answering",
        f: "Active listening repeats the other person's point back before any reply is given.",
        p: "summarise the objection in your own words and check that the summary is right",
        s: "A seller asks about the customer's problem and restates it before describing the product.",
        n: "During a dispute, a mediator restates each side's position until both agree the summary is fair.",
        q: "listen, then summarise"
      },
      {
        t: "SHARED VALUES",
        d: "connecting a proposal to something the other person already cares about",
        f: "Shared values create relevance by linking a proposal to what the listener already cares about.",
        p: "name the value at stake and show honestly how the proposal serves it",
        s: "A trainer links a new checklist to the crew's wish to go home safely.",
        n: "A team presents a records system as protection for patient privacy, which the clinic already treats as a priority.",
        q: "appeal to existing priorities"
      },
      {
        t: "COUNTERARGUMENT HANDLING",
        d: "raising the strongest objection yourself and answering it with facts",
        f: "Counterargument handling states the strongest objection and answers it before it is used against the proposal.",
        p: "list the two strongest objections and address each with evidence",
        s: "A speaker explains why the cheaper option fails before the audience can raise it.",
        n: "A proposal includes a section on cost overruns and explains how the schedule absorbs them.",
        q: "objections answered early"
      },
      {
        t: "MESSAGE CLARITY",
        d: "cutting a statement down to one main point that the audience can repeat",
        f: "Message clarity keeps one main point that the audience can repeat afterwards.",
        p: "reduce the request to one sentence and repeat it at the end",
        s: "A briefing ends with a single sentence stating which approval is needed.",
        n: "A handover note states the one action the next shift must take before anything else.",
        q: "one clear point"
      },
      {
        t: "MEASURED CONCESSION",
        d: "giving up a small point on purpose to protect the part that matters most",
        f: "Measured concession trades a small point to protect the outcome that matters most.",
        p: "decide what can be given away before the discussion begins",
        s: "A negotiator accepts a shorter warranty to keep the delivery date that the client needs.",
        n: "A supplier agrees to cover shipping in exchange for a longer payment window that protects cash flow.",
        q: "small trade, main goal kept"
      },
      {
        t: "EVIDENCE-LED STORYTELLING",
        d: "using one real case to make the supporting numbers easier to remember",
        f: "Evidence-led storytelling uses a real case to make the supporting numbers memorable.",
        p: "pair each story with the figures that back it",
        s: "A safety officer describes one near-miss accident before presenting the incident statistics.",
        n: "A project lead opens with a customer's failed handover and then shows the test data that predicted it.",
        q: "story plus figures"
      },
      {
        t: "RESPECT FOR AUTONOMY",
        d: "leaving the other person free to refuse after hearing the facts",
        f: "Respect for autonomy means the other person can still refuse after hearing the facts.",
        p: "present the options, the trade-offs and the right to decline",
        s: "A recruiter explains the role honestly and accepts a candidate's decision not to continue.",
        n: "A clinician sets out both treatments and books a follow-up instead of insisting on a choice today.",
        q: "free to say no"
      }
    ]
  },

  "HOW TO BECOME UNSTOPPABLE": {
    hints: [
      "Look for the method that produces repeatable improvement.",
      "Judge each option by what it does over many repetitions.",
      "Prefer the disciplined method over short bursts of effort."
    ],
    flaws: [
      "start five new routines at once and drop them all next week",
      "wait for motivation instead of scheduling the work",
      "judge progress only by how you feel today",
      "keep the plan secret so nobody can check it",
      "switch the target whenever the first attempt gets hard",
      "train the easy parts and skip the weak one"
    ],
    constraints: [
      "keeping the workload sustainable",
      "tracking the results honestly",
      "keeping the rest of the schedule intact",
      "finishing inside the available time"
    ],
    concepts: [
      {
        t: "DELIBERATE PRACTICE",
        d: "training one weak skill at a time with feedback on each attempt",
        f: "Deliberate practice trains one weak skill at a time with feedback on every attempt.",
        p: "pick the weakest sub-skill and repeat it until the result improves",
        s: "A player spends a whole session on the weakest part of the routine instead of repeating easy drills.",
        n: "A coder who loses time on debugging writes small failing tests daily until the pattern is recognised quickly.",
        q: "weak skill drilled with feedback"
      },
      {
        t: "FEEDBACK LOOP",
        d: "checking results quickly and using them to change the next attempt",
        f: "Feedback loop uses the result of one attempt to change how the next attempt is made.",
        p: "measure the result, compare it with the goal and adjust one variable",
        s: "A cook tastes the dish at each stage and adjusts the seasoning before serving.",
        n: "A service team reviews weekly complaint data, changes one script each week and then measures again.",
        q: "results change the next try"
      },
      {
        t: "HABIT STACKING",
        d: "attaching a new routine to something you already do every day",
        f: "Habit stacking attaches a new routine to an existing daily action.",
        p: "place the new action immediately after an established one",
        s: "A student reviews the notes right after opening the evening meal, which already happens daily.",
        n: "A technician adds a two-minute tool check to the handover that already ends every shift.",
        q: "new routine on an old one"
      },
      {
        t: "SPECIFIC GOALS",
        d: "writing a target with a number and a deadline instead of a wish",
        f: "Specific goals state a number and a deadline instead of a general wish.",
        p: "write the target as a measurable result with a date",
        s: "A learner replaces 'study more' with 'finish forty items by Friday'.",
        n: "A team replaces 'improve service' with 'cut response time below four hours by the end of the quarter'.",
        q: "number plus deadline"
      },
      {
        t: "DEEP FOCUS BLOCKS",
        d: "protecting a fixed stretch of time for one task without interruptions",
        f: "Deep focus blocks protect one stretch of time for a single task without interruptions.",
        p: "silence notifications and work on one task until the block ends",
        s: "A writer works for fifty minutes with the phone left in another room.",
        n: "A support team schedules a no-meeting window so billing errors can be cleared in one pass.",
        q: "uninterrupted work stretch"
      },
      {
        t: "ACCOUNTABILITY PARTNER",
        d: "telling another person what you will finish and when they will check",
        f: "Accountability partner works when someone else knows what will be finished and when it will be checked.",
        p: "report the outcome to that person at the agreed time",
        s: "Two trainees send each other their progress every Friday.",
        n: "A supervisor pairs two team leads who review each other's milestones before every release.",
        q: "someone checks the deadline"
      },
      {
        t: "PROGRESS TRACKING",
        d: "recording results over time so that improvement can be seen and compared",
        f: "Progress tracking records results over time so that improvement can be seen and compared.",
        p: "write the number down after every session and review the trend weekly",
        s: "A runner logs the distance and time of each session in a small notebook.",
        n: "A crew keeps a shared chart of weekly repairs and rework so that trends appear before failures do.",
        q: "results recorded over time"
      },
      {
        t: "IDENTITY-BASED HABITS",
        d: "acting from the kind of person you intend to be rather than from a single goal",
        f: "Identity-based habits start from the kind of person you intend to be, not from a single goal.",
        p: "describe the behaviour as part of who you are, then repeat it",
        s: "A learner who wants to be reliable arrives early every day instead of promising one big result.",
        n: "A new supervisor answers every message the same day because that is the kind of lead the team needs.",
        q: "act like the person you intend to be"
      }
    ]
  }
};
