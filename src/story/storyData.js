/* ProudGeonQuiz Story Quiz — isolated content only. */
(function (global) {
  "use strict";

  const STORY_DATA = Object.freeze([
    Object.freeze({
  "id": "story_001",
  "title": "The Lost Compass",
  "category": "Adventure",
  "difficulty": "Beginner",
  "estimatedReadTime": 2,
  "story": "Alex loved exploring the hills near the village, but one afternoon a sudden rainstorm forced Alex to take shelter beneath an old tree.\n\nWhile waiting for the rain to pass, Alex noticed a small wooden box hidden among the roots. Inside was an old compass with a faded star marked on its face.\n\nThe compass pointed toward a narrow trail leading into the forest. Alex remembered that the village elders often spoke about a quiet spring beyond the trees, so Alex decided to follow the trail carefully.\n\nAt the end of the trail, Alex found a small clearing and a stone marker. The faded star on the compass matched a star carved into the stone, revealing that the compass had led Alex to the old spring.\n\nAlex returned to the village before sunset and placed the compass safely back in the wooden box, ready for another explorer to discover.",
  "questions": [
    {
      "id": "story_001_q1",
      "type": "detail",
      "question": "What did Alex find inside the wooden box?",
      "choices": [
        "An old compass",
        "A golden key",
        "A lantern",
        "A letter"
      ],
      "correctAnswer": 0,
      "explanation": "The story says the wooden box contained an old compass."
    },
    {
      "id": "story_001_q2",
      "type": "setting",
      "question": "Where did the compass point?",
      "choices": [
        "Toward the village",
        "Toward a narrow forest trail",
        "Toward the river",
        "Toward the mountain road"
      ],
      "correctAnswer": 1,
      "explanation": "The compass pointed toward a narrow trail leading into the forest."
    },
    {
      "id": "story_001_q3",
      "type": "sequence",
      "question": "What happened before Alex followed the trail?",
      "choices": [
        "Alex returned home",
        "Alex found a stone marker",
        "Alex waited for the rain to pass",
        "Alex met a village elder"
      ],
      "correctAnswer": 2,
      "explanation": "Alex first waited for the rain to pass before following the trail."
    },
    {
      "id": "story_001_q4",
      "type": "inference",
      "question": "Why did the faded star matter at the clearing?",
      "choices": [
        "It showed the way back to the village",
        "It matched the star carved on the stone",
        "It warned Alex about the rain",
        "It marked a place to build a house"
      ],
      "correctAnswer": 1,
      "explanation": "The compass star matched the star carved into the stone, confirming the destination."
    },
    {
      "id": "story_001_q5",
      "type": "detail",
      "question": "What did Alex do with the compass at the end?",
      "choices": [
        "Sold it",
        "Gave it to the village elder",
        "Left it beside the spring",
        "Placed it back in the wooden box"
      ],
      "correctAnswer": 3,
      "explanation": "Alex returned the compass to the wooden box for another explorer to find."
    }
  ]
}),
    Object.freeze({
  "id": "story_002",
  "title": "The Hidden Valley",
  "category": "Mystery",
  "difficulty": "Intermediate",
  "estimatedReadTime": 3,
  "story": "Maya found an old map inside a wooden box in her grandmother's attic. The map showed a trail leading from the village to a waterfall.\n\nThe next morning Maya packed water, a small notebook, and a pencil before leaving early. She wanted to record anything unusual she discovered along the trail.\n\nAt the edge of the forest, Maya met her friend Leo. He offered to help, and together they followed the map until they reached a narrow path behind the waterfall.\n\nBeyond the waterfall was a quiet valley surrounded by tall cliffs. Near a flat stone, Maya noticed a row of small carvings that looked like symbols from the map.\n\nMaya copied the symbols into her notebook instead of moving the stone. She and Leo returned to the village with the map, their notes, and a plan to ask the elders about the mysterious valley.",
  "questions": [
    {
      "id": "story_002_q1",
      "type": "detail",
      "question": "What did Maya find in the attic?",
      "choices": [
        "A silver compass",
        "An old map",
        "A locked diary",
        "A wooden flute"
      ],
      "correctAnswer": 1,
      "explanation": "Maya found an old map inside a wooden box in the attic."
    },
    {
      "id": "story_002_q2",
      "type": "detail",
      "question": "Which items did Maya pack before leaving?",
      "choices": [
        "Water, a notebook, and a pencil",
        "A lantern, rope, and food",
        "A compass, blanket, and camera",
        "Flowers, a key, and a letter"
      ],
      "correctAnswer": 0,
      "explanation": "The story specifically says Maya packed water, a small notebook, and a pencil."
    },
    {
      "id": "story_002_q3",
      "type": "sequence",
      "question": "Who did Maya meet at the edge of the forest?",
      "choices": [
        "Her grandmother",
        "A village elder",
        "Her friend Leo",
        "A park guide"
      ],
      "correctAnswer": 2,
      "explanation": "Maya met her friend Leo at the edge of the forest."
    },
    {
      "id": "story_002_q4",
      "type": "setting",
      "question": "Where was the hidden valley?",
      "choices": [
        "Behind the waterfall",
        "Under the village",
        "Beyond the mountain road",
        "Inside the wooden box"
      ],
      "correctAnswer": 0,
      "explanation": "The valley was reached through a narrow path behind the waterfall."
    },
    {
      "id": "story_002_q5",
      "type": "reasonable inference",
      "question": "Why did Maya copy the symbols instead of moving the stone?",
      "choices": [
        "She wanted to preserve the clues and ask the elders about them",
        "She was too tired to touch the stone",
        "Leo told her to leave immediately",
        "The map said the stone was dangerous"
      ],
      "correctAnswer": 0,
      "explanation": "Maya recorded the symbols and planned to ask the elders, preserving the clue rather than moving the stone."
    }
  ]
}),
    Object.freeze({
  "id": "story_003",
  "title": "The Lighthouse Signal",
  "category": "Adventure",
  "difficulty": "Intermediate",
  "estimatedReadTime": 3,
  "story": "Nina volunteered to help at the coastal lighthouse while the keeper repaired a damaged radio. Before sunset, the keeper showed her a signal chart and explained that three short flashes meant a small boat needed attention.\n\nLater that evening, Nina saw three short flashes from a lantern near the eastern rocks. She checked the chart, then used the lighthouse lamp to repeat the signal while the keeper prepared the rescue boat.\n\nThe rescue boat found two fishermen whose engine had stopped. They were brought safely to shore before the weather worsened. The keeper thanked Nina for following the signal chart instead of guessing what the flashes meant.",
  "questions": [
    {
      "id": "story_003_q1",
      "type": "detail",
      "question": "Why was Nina helping at the lighthouse?",
      "choices": [
        "The keeper was repairing a radio",
        "The lighthouse had lost its map",
        "A boat needed new sails",
        "Nina was training to become a fisherman"
      ],
      "correctAnswer": 0,
      "explanation": "The story states that Nina helped while the keeper repaired a damaged radio."
    },
    {
      "id": "story_003_q2",
      "type": "detail",
      "question": "What did three short flashes mean on the signal chart?",
      "choices": [
        "A storm had ended",
        "A small boat needed attention",
        "The lighthouse needed fuel",
        "The keeper wanted visitors"
      ],
      "correctAnswer": 1,
      "explanation": "The keeper explained that three short flashes indicated that a small boat needed attention."
    },
    {
      "id": "story_003_q3",
      "type": "detail",
      "question": "What did Nina do after seeing the three flashes?",
      "choices": [
        "She ignored them",
        "She left the lighthouse",
        "She repeated the signal with the lighthouse lamp",
        "She changed the signal chart"
      ],
      "correctAnswer": 2,
      "explanation": "Nina checked the chart and repeated the signal with the lighthouse lamp."
    },
    {
      "id": "story_003_q4",
      "type": "detail",
      "question": "Who was rescued?",
      "choices": [
        "Two fishermen",
        "A lighthouse crew",
        "A group of hikers",
        "A harbor inspector"
      ],
      "correctAnswer": 0,
      "explanation": "The rescue boat found two fishermen whose engine had stopped."
    },
    {
      "id": "story_003_q5",
      "type": "detail",
      "question": "What lesson does the ending emphasize?",
      "choices": [
        "Guessing is faster than checking",
        "Following verified instructions can guide a safe response",
        "Signals are never useful at sea",
        "Radio repairs should be avoided"
      ],
      "correctAnswer": 1,
      "explanation": "Nina used the signal chart before acting, which helped her respond appropriately."
    }
  ]
}),
    Object.freeze({
  "id": "story_004",
  "title": "The Library Window",
  "category": "Mystery",
  "difficulty": "Intermediate",
  "estimatedReadTime": 3,
  "story": "Eli noticed that a narrow library window was open even though the librarian always closed it before leaving. On the sill sat a dry leaf and a blue thread.\n\nInstead of accusing anyone, Eli compared the clues with the library's reading-room log. The log showed that a gardener had visited the courtyard that afternoon to trim vines beside the window.\n\nEli told the librarian what he had found. Together they checked the courtyard and discovered that a vine had caught the window latch, pulling it open when the wind moved the leaves. The blue thread came from the gardener's work gloves.",
  "questions": [
    {
      "id": "story_004_q1",
      "type": "detail",
      "question": "What unusual thing did Eli notice?",
      "choices": [
        "A locked book",
        "An open library window",
        "A missing reading log",
        "A broken desk"
      ],
      "correctAnswer": 1,
      "explanation": "Eli noticed that a narrow library window was open."
    },
    {
      "id": "story_004_q2",
      "type": "detail",
      "question": "Which clues were on the window sill?",
      "choices": [
        "A key and a note",
        "A coin and a pencil",
        "A dry leaf and a blue thread",
        "A flower and a ribbon"
      ],
      "correctAnswer": 2,
      "explanation": "The story identifies a dry leaf and a blue thread on the sill."
    },
    {
      "id": "story_004_q3",
      "type": "detail",
      "question": "What did Eli check before making an accusation?",
      "choices": [
        "The reading-room log",
        "The librarian drawer",
        "The town newspaper",
        "The roof tiles"
      ],
      "correctAnswer": 0,
      "explanation": "Eli compared the clues with the library reading-room log."
    },
    {
      "id": "story_004_q4",
      "type": "detail",
      "question": "What actually pulled the window open?",
      "choices": [
        "A broken lock",
        "A vine caught on the latch",
        "A bird pushed it",
        "A visitor opened it"
      ],
      "correctAnswer": 1,
      "explanation": "A vine had caught the window latch and pulled it open when the wind moved the leaves."
    },
    {
      "id": "story_004_q5",
      "type": "detail",
      "question": "Where did the blue thread come from?",
      "choices": [
        "A library curtain",
        "A book cover",
        "The gardener’s work gloves",
        "Eli’s backpack"
      ],
      "correctAnswer": 2,
      "explanation": "The blue thread matched the gardener’s work gloves."
    }
  ]
}),
    Object.freeze({
  "id": "story_005",
  "title": "The Rain Garden Plan",
  "category": "Problem Solving",
  "difficulty": "Advanced",
  "estimatedReadTime": 3,
  "story": "A neighborhood club wanted to reduce puddles beside its community hall. Mara proposed a rain garden, but the club had only a small planting area and needed to protect the hall entrance.\n\nMara measured the area, marked the entrance path, and chose a shallow section away from the doorway. She selected plants that tolerate wet soil and placed stones along the edge to slow runoff.\n\nAfter the next heavy rain, water collected in the planted area instead of spreading across the entrance. The club kept Mara’s measurements and plan so they could improve the garden during the next season.",
  "questions": [
    {
      "id": "story_005_q1",
      "type": "detail",
      "question": "What problem was the club trying to reduce?",
      "choices": [
        "Puddles beside the community hall",
        "Broken windows in the hall",
        "Lack of library books",
        "Noise from traffic"
      ],
      "correctAnswer": 0,
      "explanation": "The club wanted to reduce puddles beside the community hall."
    },
    {
      "id": "story_005_q2",
      "type": "detail",
      "question": "Why did Mara mark the entrance path before planting?",
      "choices": [
        "To keep the garden away from the doorway",
        "To make the path longer",
        "To remove all stones",
        "To measure the roof"
      ],
      "correctAnswer": 0,
      "explanation": "She needed to protect the hall entrance, so the planting area was placed away from the doorway."
    },
    {
      "id": "story_005_q3",
      "type": "detail",
      "question": "What type of plants did Mara choose?",
      "choices": [
        "Plants that require dry soil",
        "Plants that tolerate wet soil",
        "Plants that grow only indoors",
        "Plants that cannot survive rain"
      ],
      "correctAnswer": 1,
      "explanation": "The story says Mara selected plants that tolerate wet soil."
    },
    {
      "id": "story_005_q4",
      "type": "detail",
      "question": "What did the stones along the edge help do?",
      "choices": [
        "Speed up runoff",
        "Stop all rainfall",
        "Slow runoff",
        "Heat the soil"
      ],
      "correctAnswer": 2,
      "explanation": "The stones were placed along the edge to slow runoff."
    },
    {
      "id": "story_005_q5",
      "type": "detail",
      "question": "What happened after the next heavy rain?",
      "choices": [
        "Water spread across the entrance",
        "The planted area collected the water",
        "The plants were removed",
        "The hall was closed permanently"
      ],
      "correctAnswer": 1,
      "explanation": "Water collected in the planted area instead of spreading across the entrance."
    }
  ]
}),
    Object.freeze({
  "id": "story_006",
  "title": "The Clockmaker’s Note",
  "category": "Historical Mystery",
  "difficulty": "Advanced",
  "estimatedReadTime": 3,
  "story": "Jon found a handwritten note inside an old clock at his grandfather’s workshop. The note listed three times: 9:15, 12:30, and 4:45, followed by the words “watch the shadow.”\n\nJon placed the clock near the workshop window and observed the shadow cast by its hands at each listed time. He recorded the direction of the shadow instead of changing the clock.\n\nThe three observations pointed him toward a loose floorboard beneath the workbench. Under it he found an old photograph of the workshop and a note explaining that his grandfather had hidden it there as a memory for the family.",
  "questions": [
    {
      "id": "story_006_q1",
      "type": "detail",
      "question": "Where did Jon find the handwritten note?",
      "choices": [
        "Inside an old clock",
        "Under the workshop door",
        "Inside a toolbox",
        "Behind a photograph"
      ],
      "correctAnswer": 0,
      "explanation": "Jon found the handwritten note inside an old clock."
    },
    {
      "id": "story_006_q2",
      "type": "detail",
      "question": "Which times were written on the note?",
      "choices": [
        "8:00, 10:30, and 2:15",
        "9:15, 12:30, and 4:45",
        "9:45, 1:30, and 5:15",
        "7:15, 11:30, and 3:45"
      ],
      "correctAnswer": 1,
      "explanation": "The note listed 9:15, 12:30, and 4:45."
    },
    {
      "id": "story_006_q3",
      "type": "detail",
      "question": "What did Jon observe at the listed times?",
      "choices": [
        "The sound of the clock",
        "The color of the walls",
        "The direction of the shadow",
        "The temperature outside"
      ],
      "correctAnswer": 2,
      "explanation": "Jon observed and recorded the direction of the shadow cast by the clock hands."
    },
    {
      "id": "story_006_q4",
      "type": "detail",
      "question": "What did the observations lead Jon toward?",
      "choices": [
        "A locked cabinet",
        "A loose floorboard",
        "A window latch",
        "A hidden attic stair"
      ],
      "correctAnswer": 1,
      "explanation": "The observations pointed Jon toward a loose floorboard beneath the workbench."
    },
    {
      "id": "story_006_q5",
      "type": "detail",
      "question": "Why had the photograph been hidden?",
      "choices": [
        "It was evidence of a crime",
        "It was meant as a family memory",
        "It was needed to repair the clock",
        "It belonged to the workshop owner’s neighbor"
      ],
      "correctAnswer": 1,
      "explanation": "The final note explained that the photograph was hidden as a memory for the family."
    }
  ]
}),
    Object.freeze({
  "id": "story_007",
  "title": "The Bridge of Paper",
  "category": "Creative Thinking",
  "difficulty": "Advanced",
  "estimatedReadTime": 3,
  "story": "For a school design challenge, Bea received twenty sheets of paper and a small amount of tape. Her team needed to build a bridge that could span two desks without using extra materials.\n\nInstead of laying the paper flat, Bea folded several sheets into narrow beams and made triangular supports from the remaining sheets. The team tested the bridge with a stack of books, found one weak joint, and reinforced it with a small strip of tape.\n\nThe final bridge held the required load. Bea wrote down the failed test and the change they made so the team could reproduce the successful design.",
  "questions": [
    {
      "id": "story_007_q1",
      "type": "detail",
      "question": "What materials did Bea’s team receive?",
      "choices": [
        "Twenty sheets of paper and a small amount of tape",
        "Ten sheets of cardboard and glue",
        "Wooden beams and nails",
        "Plastic strips and wire"
      ],
      "correctAnswer": 0,
      "explanation": "The team received twenty sheets of paper and a small amount of tape."
    },
    {
      "id": "story_007_q2",
      "type": "detail",
      "question": "How did Bea strengthen the paper sheets?",
      "choices": [
        "By soaking them in water",
        "By folding them into narrow beams",
        "By cutting them into circles",
        "By leaving them completely flat"
      ],
      "correctAnswer": 1,
      "explanation": "Bea folded several sheets into narrow beams."
    },
    {
      "id": "story_007_q3",
      "type": "detail",
      "question": "What shape did the team use for supports?",
      "choices": [
        "Squares",
        "Circles",
        "Triangles",
        "Spirals"
      ],
      "correctAnswer": 2,
      "explanation": "The story says the remaining sheets were made into triangular supports."
    },
    {
      "id": "story_007_q4",
      "type": "detail",
      "question": "What did testing reveal?",
      "choices": [
        "The bridge was too short",
        "One joint was weak",
        "The desks were too close",
        "The paper was the wrong color"
      ],
      "correctAnswer": 1,
      "explanation": "Testing with books revealed one weak joint."
    },
    {
      "id": "story_007_q5",
      "type": "detail",
      "question": "Why did Bea record the failed test and the change?",
      "choices": [
        "To document how to reproduce the successful design",
        "To hide the weakness from the team",
        "To avoid testing again",
        "To replace the bridge with wood"
      ],
      "correctAnswer": 0,
      "explanation": "Recording the failed test and the fix gave the team a reproducible design process."
    }
  ]
}),
    Object.freeze({
  "id": "story_008",
  "title": "The Orchard Map",
  "category": "Exploration",
  "difficulty": "Advanced",
  "estimatedReadTime": 3,
  "story": "Rico helped his aunt restore an old orchard map. Several tree symbols were faded, but a set of numbers remained beside a stone wall. The numbers increased from west to east.\n\nRico walked the orchard from west to east and counted the trees at each marked section. One section contained fewer trees than the map suggested, so he checked the ground instead of assuming the map was wrong.\n\nHe found several young trees hidden behind tall grass. After updating the map, Rico compared it with his aunt’s planting records and confirmed that the missing symbols represented the young trees.",
  "questions": [
    {
      "id": "story_008_q1",
      "type": "detail",
      "question": "What part of the orchard map was faded?",
      "choices": [
        "Several tree symbols",
        "The stone wall",
        "The planting records",
        "The west road"
      ],
      "correctAnswer": 0,
      "explanation": "Several tree symbols on the old orchard map were faded."
    },
    {
      "id": "story_008_q2",
      "type": "detail",
      "question": "In which direction did the numbers increase?",
      "choices": [
        "East to west",
        "North to south",
        "West to east",
        "South to north"
      ],
      "correctAnswer": 2,
      "explanation": "The numbers beside the wall increased from west to east."
    },
    {
      "id": "story_008_q3",
      "type": "detail",
      "question": "What did Rico do when one section had fewer visible trees than expected?",
      "choices": [
        "He immediately discarded the map",
        "He checked the ground",
        "He moved the stone wall",
        "He stopped counting"
      ],
      "correctAnswer": 1,
      "explanation": "Rico checked the ground instead of assuming the map was wrong."
    },
    {
      "id": "story_008_q4",
      "type": "detail",
      "question": "Where were the missing trees?",
      "choices": [
        "Behind tall grass",
        "Inside the barn",
        "Beyond the village",
        "Under the stone wall"
      ],
      "correctAnswer": 0,
      "explanation": "Rico found young trees hidden behind tall grass."
    },
    {
      "id": "story_008_q5",
      "type": "detail",
      "question": "What confirmed Rico’s interpretation of the faded symbols?",
      "choices": [
        "A weather report",
        "His aunt’s planting records",
        "A new road sign",
        "A different orchard map"
      ],
      "correctAnswer": 1,
      "explanation": "Rico compared the updated map with his aunt’s planting records and confirmed the symbols represented young trees."
    }
  ]
}),
    Object.freeze({
  "id": "story_009",
  "title": "The Signal Lantern",
  "category": "Teamwork",
  "difficulty": "Advanced",
  "estimatedReadTime": 3,
  "story": "During a mountain camp, Sam noticed that the trail team had lost contact with a second group after sunset. The camp guide kept a lantern code in a waterproof card: one long light meant “stay,” while two short lights meant “return to camp.”\n\nSam climbed only to the marked lookout point and waited for a signal. He saw two short lights from below, then repeated the return signal toward the camp. The guide gathered the team and checked the trail map before sending two adults to meet the second group.\n\nEveryone returned safely. The guide later praised Sam for staying within the marked area and using the code exactly as it was written.",
  "questions": [
    {
      "id": "story_009_q1",
      "type": "detail",
      "question": "What problem occurred after sunset?",
      "choices": [
        "The second group lost contact",
        "The camp lost its food",
        "The lantern broke",
        "The trail map was destroyed"
      ],
      "correctAnswer": 0,
      "explanation": "The trail team lost contact with a second group after sunset."
    },
    {
      "id": "story_009_q2",
      "type": "detail",
      "question": "What did one long lantern light mean?",
      "choices": [
        "Return to camp",
        "Stay",
        "Change the route",
        "Need food"
      ],
      "correctAnswer": 1,
      "explanation": "The waterproof card defined one long light as “stay.”"
    },
    {
      "id": "story_009_q3",
      "type": "detail",
      "question": "What did Sam do after seeing two short lights?",
      "choices": [
        "He left the marked area",
        "He ignored the signal",
        "He repeated the return signal",
        "He extinguished every lantern"
      ],
      "correctAnswer": 2,
      "explanation": "Sam repeated the return signal toward the camp."
    },
    {
      "id": "story_009_q4",
      "type": "detail",
      "question": "What did the guide check before sending adults?",
      "choices": [
        "The trail map",
        "A weather app",
        "A food list",
        "The camp schedule"
      ],
      "correctAnswer": 0,
      "explanation": "The guide checked the trail map before sending two adults to meet the group."
    },
    {
      "id": "story_009_q5",
      "type": "detail",
      "question": "Why did the guide praise Sam?",
      "choices": [
        "He guessed a new code",
        "He stayed within the marked area and followed the written code",
        "He traveled alone into the dark",
        "He ignored the second group"
      ],
      "correctAnswer": 1,
      "explanation": "Sam stayed in the marked area and used the lantern code exactly as written."
    }
  ]
}),
    Object.freeze({
  "id": "story_010",
  "title": "The Museum Key",
  "category": "Historical Mystery",
  "difficulty": "Advanced",
  "estimatedReadTime": 3,
  "story": "Lena was helping catalog objects in a small local museum when she found a brass key inside a drawer labeled “Workshop.” The key had a tiny number, 17, stamped on its handle.\n\nInstead of trying every lock, Lena checked the museum inventory. Object 17 was an old wooden cabinet from the same workshop. The curator allowed Lena to test the key, and it opened the cabinet.\n\nInside were repair records, a photograph, and a list of tools. Lena returned the key to its labeled drawer and added a note to the inventory so future volunteers would know where the key belonged.",
  "questions": [
    {
      "id": "story_010_q1",
      "type": "detail",
      "question": "Where did Lena find the brass key?",
      "choices": [
        "Inside a drawer labeled Workshop",
        "Under a museum display",
        "Inside the old cabinet",
        "Behind a photograph"
      ],
      "correctAnswer": 0,
      "explanation": "The brass key was found inside a drawer labeled “Workshop.”"
    },
    {
      "id": "story_010_q2",
      "type": "detail",
      "question": "What number was stamped on the key?",
      "choices": [
        "7",
        "12",
        "17",
        "27"
      ],
      "correctAnswer": 2,
      "explanation": "The key had the number 17 stamped on its handle."
    },
    {
      "id": "story_010_q3",
      "type": "detail",
      "question": "How did Lena identify the likely lock instead of trying every lock?",
      "choices": [
        "She checked the museum inventory",
        "She guessed from the key color",
        "She asked a visitor",
        "She moved the exhibits"
      ],
      "correctAnswer": 0,
      "explanation": "The inventory linked object 17 to an old wooden cabinet from the workshop."
    },
    {
      "id": "story_010_q4",
      "type": "detail",
      "question": "What was inside the cabinet?",
      "choices": [
        "Repair records, a photograph, and a tool list",
        "Coins, maps, and food",
        "A second key and a radio",
        "Only empty boxes"
      ],
      "correctAnswer": 0,
      "explanation": "The cabinet contained repair records, a photograph, and a list of tools."
    },
    {
      "id": "story_010_q5",
      "type": "detail",
      "question": "What did Lena do with the key afterward?",
      "choices": [
        "She kept it at home",
        "She returned it to its labeled drawer and updated the inventory",
        "She gave it to a visitor",
        "She threw it away"
      ],
      "correctAnswer": 1,
      "explanation": "Lena returned the key to its labeled drawer and documented its location in the inventory."
    }
  ]
})
  ]);

  global.ProudGeonStoryData = STORY_DATA;
})(window);
