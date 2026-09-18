/*
 * SCIENCE content.
 *
 * Facts are curated per concept so the marked-correct option is correct by
 * construction and the wrong options are always false for the concept asked about.
 */

module.exports = {
  "SOLID, LIQUID, GAS": {
    hints: [
      "Identify the state or the change of state being described.",
      "Check how the particles behave and what happens to the shape and volume.",
      "Decide whether the description is about movement of particles or a change of state."
    ],
    flaws: [
      "assume the particles stop moving once the sample looks still",
      "treat a change of shape as a change of state",
      "measure the container instead of the sample",
      "ignore the temperature while comparing two samples",
      "describe a gas as having a fixed volume"
    ],
    constraints: [
      "keeping the sample sealed",
      "keeping the temperature steady",
      "recording every measurement accurately",
      "keeping the sample clean"
    ],
    concepts: [
      {
        t: "SOLID STATE",
        d: "the state of matter in which particles hold fixed positions, so shape and volume stay the same",
        f: "Solid state keeps a definite shape and a definite volume because its particles stay in fixed positions.",
        p: "identify the sample by its fixed shape and fixed volume",
        s: "A block keeps its shape and its volume when it is moved from a table to a shelf.",
        n: "A metal rod keeps its shape while its particles vibrate faster and the rod becomes very slightly longer.",
        q: "fixed shape and fixed volume"
      },
      {
        t: "LIQUID STATE",
        d: "the state of matter with a fixed volume that takes the shape of its container",
        f: "Liquid state keeps a definite volume but takes the shape of whatever holds it.",
        p: "identify the sample by its fixed volume and changing shape",
        s: "A juice poured from a bottle takes the shape of the glass but still fills exactly one litre.",
        n: "A sealed syringe filled with water takes the shape of the barrel but can hardly be compressed further.",
        q: "fixed volume, container shape"
      },
      {
        t: "GAS STATE",
        d: "the state of matter with no fixed shape or volume that spreads through the whole container",
        f: "Gas state spreads to fill the whole container because the particles move freely and far apart.",
        p: "identify the sample by how it fills the whole container",
        s: "A little air released in a closed room spreads until it reaches every corner of the space.",
        n: "A sealed syringe holding air is easy to push in because the particles can move closer together.",
        q: "fills the whole container"
      },
      {
        t: "MELTING",
        d: "the change from a solid to a liquid when heat is absorbed",
        f: "Melting changes a solid into a liquid once enough heat has been absorbed.",
        p: "add heat and watch the sample change from solid to liquid at a steady temperature",
        s: "An ice cube in a warm glass turns into water while the thermometer still reads zero degrees.",
        n: "A sample keeps absorbing heat without warming up until the last crystal has disappeared.",
        q: "solid turns to liquid"
      },
      {
        t: "EVAPORATION",
        d: "the change from a liquid to a vapour at the surface, even below the boiling point",
        f: "Evaporation changes a liquid into vapour at the surface even when the liquid is below its boiling point.",
        p: "leave the liquid open to the air and watch the level fall without boiling",
        s: "A puddle on the pavement disappears on a warm afternoon long before the water could boil.",
        n: "Wet laundry dries faster on a warm, windy day even though the cloth stays well below boiling point.",
        q: "surface liquid turns to vapour"
      }
    ]
  },

  "TRANSLATIONAL MOTIONS / ROTATIONAL MOTIONS": {
    hints: [
      "Decide whether the whole object moves, turns, or does both at once.",
      "Check whether the object turns about a fixed axis or travels along a path.",
      "Look at what happens to the direction of the motion, not only to its speed."
    ],
    flaws: [
      "assume a turning object has no speed anywhere",
      "measure only the centre of a spinning object and ignore the outer edge",
      "treat a turn about an axis as straight-line travel",
      "ignore the direction of the force while analysing a circular path",
      "compare objects without stating which point of each one is measured"
    ],
    constraints: [
      "keeping the axis fixed",
      "measuring from the same reference point",
      "keeping the speed constant",
      "recording the direction of motion"
    ],
    concepts: [
      {
        t: "TRANSLATION",
        d: "motion in which every point of an object moves the same distance in the same direction",
        f: "Translation moves every point of an object by the same distance in the same direction.",
        p: "compare the path of two points and confirm they stay parallel",
        s: "A crate slides across a level floor without turning, and every corner moves the same distance.",
        n: "A lift carries a loaded trolley upward, and each point of the trolley traces an identical vertical path.",
        q: "whole body slides without turning"
      },
      {
        t: "ROTATION",
        d: "motion in which an object turns about an axis so that its points follow circular paths",
        f: "Rotation turns an object about an axis so that its points follow circular paths.",
        p: "check that the axis stays fixed while the object turns",
        s: "A ceiling fan spins in place while each blade tip traces a circle around the hub.",
        n: "A flywheel keeps turning about a fixed shaft while points near the rim move much faster than points near the centre.",
        q: "turning about a fixed axis"
      },
      {
        t: "ROLLING MOTION",
        d: "motion that combines a turn about a moving axis with travel of the whole object along a surface",
        f: "Rolling motion combines rotation about a moving axis with travel of the whole body along the surface.",
        p: "check that the contact point does not slide while the body turns and travels",
        s: "A bike wheel turns about its hub while the whole bicycle moves forward along the road.",
        n: "A barrel is pushed down a ramp so that it turns and travels at the same time, with the rim gripping the surface.",
        q: "turns and travels together"
      },
      {
        t: "CENTRIPETAL FORCE",
        d: "the inward force that keeps an object moving along a circular path",
        f: "Centripetal force always points toward the centre of the circular path it maintains.",
        p: "check that the force points toward the centre of the turn",
        s: "A stone tied to a string moves in a circle because the string pulls it toward the hand.",
        n: "A car rounds a curved highway exit and the sideways friction from the tyres points toward the centre of the curve.",
        q: "inward force on a circular path"
      },
      {
        t: "TORQUE",
        d: "the turning effect produced by a force applied at a distance from the axis",
        f: "Torque measures the turning effect of a force applied away from the axis.",
        p: "increase the distance from the axis to increase the turning effect",
        s: "A long wrench loosens a tight bolt more easily than a short one with the same effort.",
        n: "A heavy door is easier to open when the handle is pushed at the outer edge instead of near the hinges.",
        q: "turning effect of a force"
      }
    ]
  },

  "PASCAL'S PRINCIPLES": {
    hints: [
      "Identify the fluid rule or the machine part being described.",
      "Check how pressure is transmitted and how the piston areas compare.",
      "Decide whether the item is about pressure, area ratio or the machine itself."
    ],
    flaws: [
      "assume pressure is lost as it travels through the fluid",
      "compare piston areas without measuring them",
      "treat a larger area as producing a smaller push for the same pressure",
      "work on a press while the fluid system is still open",
      "guess the output push without checking the pressure rating"
    ],
    constraints: [
      "keeping the fluid confined",
      "keeping the system sealed",
      "using the correct piston areas",
      "staying inside the pressure rating"
    ],
    concepts: [
      {
        t: "PRESSURE",
        d: "the amount of push acting on each unit of area",
        f: "Pressure is the force acting on each unit of area, so the same force over a smaller area gives more pressure.",
        p: "divide the applied force by the area that receives it",
        s: "A drawing pin enters the board easily because the same push acts on a very small tip.",
        n: "A technician checks a specification that lists newtons per square centimetre to confirm the force a cylinder applies.",
        q: "force spread over an area"
      },
      {
        t: "PASCAL'S PRINCIPLE",
        d: "the rule that pressure applied to a confined fluid is transmitted unchanged to every part of the fluid",
        f: "Pascal's principle states that pressure applied to a confined fluid is transmitted equally to every part of it.",
        p: "trace the applied pressure from the input piston to the output piston",
        s: "Squeezing one end of a sealed water-filled bottle pushes water out of the other end with the same pressure.",
        n: "A hydraulic lift is designed so that the pressure added at the small cylinder appears undiminished at the large cylinder.",
        q: "pressure spreads through confined fluid"
      },
      {
        t: "HYDRAULIC PRESS",
        d: "a machine that uses fluid pressure to multiply push between two pistons of different sizes",
        f: "Hydraulic press multiplies force because the same pressure acts on a much larger output piston.",
        p: "verify that both pistons feel the same pressure before comparing the pushes",
        s: "A workshop machine lifts a car using a small hand pump connected to a wide lifting piston.",
        n: "A factory machine shapes steel plates with a large output ram driven by a small pump cylinder on the same fluid line.",
        q: "fluid pressure machine"
      },
      {
        t: "AREA RATIO",
        d: "the comparison between the surface sizes of the two pistons that sets the gain in push",
        f: "Area ratio sets how much the output force grows compared with the input force.",
        p: "measure both piston areas before calculating the gain",
        s: "A press with a small input piston and a wide output piston multiplies the operator's effort many times.",
        n: "A maintenance crew recalculates the gain after replacing the output piston with a slightly narrower one.",
        q: "comparison of piston sizes"
      },
      {
        t: "INCOMPRESSIBILITY OF LIQUIDS",
        d: "the property that a confined liquid keeps almost the same volume under pressure",
        f: "Incompressibility of liquids is the reason pressure added at one point appears at every other point.",
        p: "check that no air is trapped before relying on the fluid to pass the pressure",
        s: "A sealed syringe full of water can barely be pushed in, while the same syringe full of air moves easily.",
        n: "A brake technician bleeds the line because trapped air, unlike the fluid, would compress and waste the pedal travel.",
        q: "liquid keeps its volume"
      },
      {
        t: "HYDRAULIC BRAKE",
        d: "a braking system that passes pedal push through fluid to the wheel cylinders",
        f: "Hydraulic brake passes pedal force through fluid so that every wheel cylinder receives the same pressure.",
        p: "check for leaks and air in the line before testing the pedal",
        s: "Pressing the brake pedal of a car slows all four wheels together because fluid carries the pressure to each wheel.",
        n: "A service manual explains that soft, spongy pedal travel usually means air has entered the fluid line.",
        q: "brakes driven by fluid"
      },
      {
        t: "FORCE MULTIPLICATION",
        d: "the increase in output push that comes from sending pressure through a larger piston area",
        f: "Force multiplication happens when the same pressure acts on a larger output area.",
        p: "compare the output push with the input push and account for the area",
        s: "A small effort on the pump handle lifts a heavy load because the wide piston receives more total push.",
        n: "A trainee records a small push on the handle and a much larger push from the wide piston, then checks the areas.",
        q: "bigger area gives bigger push"
      }
    ]
  },

  "ARCHIMEDE'S PRINCIPLES": {
    hints: [
      "Identify the upward push, the fluid displaced, or the objects floating state.",
      "Compare the weight of the object with the weight of the fluid it pushes aside.",
      "Decide whether the case is about floating, sinking or apparent weight."
    ],
    flaws: [
      "assume the upward push depends on the depth of the water alone",
      "weigh the object in air and ignore the loss of reading in fluid",
      "treat a floating object as having no weight",
      "measure the mass of the object instead of the volume it pushes aside",
      "ignore the density of the fluid when comparing two containers"
    ],
    constraints: [
      "keeping the object fully supported",
      "using the same fluid in both trials",
      "reading the scale at eye level",
      "recording the displaced volume"
    ],
    concepts: [
      {
        t: "BUOYANT FORCE",
        d: "the upward push that a fluid exerts on an object placed in it",
        f: "Buoyant force is the upward push that a fluid exerts on any object placed in it.",
        p: "compare the upward push with the objects weight before predicting what it will do",
        s: "A swimmer feels lighter in the water because the water pushes the body upward.",
        n: "A diver notices that the upward push stays equal when the depth doubles, but the pressure on the suit keeps rising.",
        q: "upward push from fluid"
      },
      {
        t: "ARCHIMEDES' PRINCIPLE",
        d: "the rule that the upward push on a body equals the weight of the fluid it pushes aside",
        f: "Archimedes' principle links the upward push on a body to the weight of the fluid it displaces.",
        p: "weigh the displaced fluid and compare it with the measured upward push",
        s: "A block in a full basin spills water equal in weight to the upward push it feels.",
        n: "A student compares two identical blocks in water and in brine and finds the upward push is larger where the fluid is denser.",
        q: "upward push equals displaced fluid weight"
      },
      {
        t: "DISPLACED FLUID",
        d: "the fluid pushed aside by the volume of an object placed in it",
        f: "Displaced fluid is the amount of liquid pushed aside by the volume of the object placed in it.",
        p: "collect and measure the overflow to find the volume pushed aside",
        s: "A stone lowered into a full glass makes water spill over the rim.",
        n: "A lab assistant reads the rise of the water line in a graduated cylinder to measure the volume of an irregular sample.",
        q: "fluid pushed aside by volume"
      },
      {
        t: "FLOATING EQUILIBRIUM",
        d: "the condition in which the upward push equals the objects weight so it stays partly submerged",
        f: "Floating equilibrium holds when the upward push equals the weight of the object.",
        p: "compare the upward push with the objects weight before adding or removing load",
        s: "A wooden boat settles lower in the water as cargo is added, until the forces balance again.",
        n: "A ship takes on ballast water so that the upward push and the total weight stay in balance during a storm.",
        q: "upward push balances weight"
      },
      {
        t: "APPARENT WEIGHT",
        d: "the scale reading for an object held in a fluid, which is smaller than its weight in air",
        f: "Apparent weight is smaller in a fluid because the upward push supports part of the object.",
        p: "record the scale reading in air first, then the reading with the object in the fluid",
        s: "A stone hanging from a spring scale reads less when it is lowered into water.",
        n: "A technician measures the drop in scale reading to find the buoyant push on a metal sample suspended in oil.",
        q: "lighter reading in fluid"
      }
    ]
  },

  HISTORY: {
    hints: [
      "Match the described work to the scientist who actually did it.",
      "Use the period and the field of study as clues.",
      "Check which contribution belongs to the named scientist."
    ],
    flaws: [
      "credit a discovery to whoever is most famous today",
      "assume every old measurement used modern units",
      "repeat a story without checking the primary records",
      "ignore the date when comparing two accounts",
      "treat a later invention as the original one"
    ],
    constraints: [
      "keeping the dates accurate",
      "citing the original account",
      "separating legend from evidence",
      "checking the units used at the time"
    ],
    concepts: [
      {
        t: "BLAISE PASCAL",
        d: "the French mathematician who built an early mechanical calculator and studied pressure in fluids",
        f: "Blaise Pascal built an early mechanical calculator and studied pressure in fluids.",
        p: "credit the calculator and the pressure work to the same researcher",
        s: "A writer of the 1600s builds a machine that adds numbers with turning wheels, and later shows that a fluid transmits pressure in every direction.",
        n: "A researcher repeats barometer readings taken in the 1640s at different heights to study how pressure changes with altitude.",
        q: "calculator and fluid pressure work"
      },
      {
        t: "ARCHIMEDES",
        d: "the Greek scholar who explained why objects float or sink and who designed heavy lifting machines",
        f: "Archimedes explained buoyancy and designed heavy lifting machines used to defend his city.",
        p: "connect the floating rule with the ancient engineering designs",
        s: "A scholar is said to have run through the streets after noticing the water rise as he stepped into a bath.",
        n: "Historians study how a heavy ship was moved ashore with a system of compound pulleys attributed to an ancient mathematician.",
        q: "buoyancy rule and lifting machines"
      },
      {
        t: "ISAAC NEWTON",
        d: "the English scientist who described the three laws of motion and universal gravitation",
        f: "Isaac Newton described the laws of motion and universal gravitation.",
        p: "link the falling-apple account with the laws of motion",
        s: "A scientist explains that an apple falls to the ground because the same attraction governs the orbit of the Moon.",
        n: "A modern physics class derives why a body keeps moving in a straight line unless a net force acts on it.",
        q: "laws of motion and gravity"
      },
      {
        t: "GALILEO GALILEI",
        d: "the Italian scientist who improved the telescope and measured how bodies fall",
        f: "Galileo Galilei improved the telescope and measured how bodies fall.",
        p: "match the telescope observations with the study of falling bodies",
        s: "A scientist aims a new instrument at the moons of Jupiter and later rolls balls down inclined planes to time their fall.",
        n: "A historian compares records of two balls of different mass released together and the claim that they reach the ground at the same time.",
        q: "telescope and falling bodies"
      },
      {
        t: "MARIE CURIE",
        d: "the physicist who studied radioactivity and won Nobel Prizes in two sciences",
        f: "Marie Curie studied radioactivity and received Nobel Prizes in physics and chemistry.",
        p: "connect the radiation research with the safety notes written in the same laboratory",
        s: "A researcher separates a glowing element from tonnes of ore and measures the rays that it gives off.",
        n: "A laboratory follows radiation safety notes written by the first person to win two science Nobel Prizes.",
        q: "radioactivity research"
      }
    ]
  }
};
