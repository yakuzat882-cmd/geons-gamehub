/*
 * TECH 1 content — hardware fundamentals, OHS/DMA procedures and system unit work.
 */

module.exports = {
  "SYSTEM UNIT AND ITS COMPONENTS": {
    hints: [
      "Identify the exact component being described, not the whole unit.",
      "Check which socket, slot or connector the description mentions.",
      "Match the component with the job it does inside the case."
    ],
    flaws: [
      "swap parts between machines without noting where they came from",
      "force a part that does not fit because the key looks similar",
      "touch the contacts of a card while fitting it",
      "test the unit with the case open and tools resting on the board",
      "replace parts one by one without testing the actual fault"
    ],
    constraints: [
      "keeping the unit unplugged",
      "keeping the work area grounded",
      "recording every part that is removed",
      "keeping the replacement parts in their anti-static bags"
    ],
    concepts: [
      {
        t: "MOTHERBOARD",
        d: "the main circuit board that links the processor, memory, drives and expansion cards",
        f: "Motherboard carries the sockets, slots and headers that connect every other component.",
        p: "identify the board by its sockets, slots and front-panel headers",
        s: "A technician looks for the part that carries the processor socket and the memory slots together.",
        n: "A build will not start because a mounting screw was fitted where no standoff was placed under the main circuit board.",
        q: "main circuit board"
      },
      {
        t: "PROCESSOR",
        d: "the chip that carries out the instructions sent by running programs",
        f: "Processor socket type decides which chips a particular board can accept.",
        p: "match the socket type and cooling requirement before fitting the chip",
        s: "A technician replaces the part that performs the calculations and checks the socket number first.",
        n: "A workstation upgrade fails because the new chip uses a different socket key and will not fit the existing board.",
        q: "chip that runs instructions"
      },
      {
        t: "RAM MODULE",
        d: "the temporary storage that holds the programs and data currently in use",
        f: "RAM module keeps its contents only while the machine has power.",
        p: "seat the module until both end clips click, with the notch aligned",
        s: "A technician adds the part that forgets everything the moment the computer is switched off.",
        n: "A system reports less memory than expected because one module was fitted in the wrong slot pair for dual-channel operation.",
        q: "temporary working storage"
      },
      {
        t: "POWER SUPPLY UNIT",
        d: "the component that converts mains electricity into the voltages the internal parts need",
        f: "Power supply unit converts mains current into the lower voltages used inside the case.",
        p: "check the wattage rating and the mains switch before connecting the leads",
        s: "A technician inspects the part that turns wall current into twelve-volt and five-volt rails.",
        n: "Random restarts stop after a failing unit is replaced with one whose rating covers the peak draw of the graphics card.",
        q: "converts mains to internal voltages"
      },
      {
        t: "STORAGE DRIVE",
        d: "the device that keeps programs and files permanently, even after shutdown",
        f: "Storage drive keeps files after shutdown and may be magnetic or solid state.",
        p: "back up the data before removing or reformatting the device",
        s: "A technician installs the part that preserves the operating system and files while the machine is switched off.",
        n: "A failing mechanical disk that clicks during use is replaced by a solid-state drive and the files are restored from backup.",
        q: "keeps files after shutdown"
      },
      {
        t: "GRAPHICS CARD",
        d: "the expansion board that renders images and drives the display outputs",
        f: "Graphics card renders the images and provides the display ports of the system.",
        p: "confirm the slot type, power connectors and clearance before fitting the board",
        s: "A technician adds the board that gives a desktop extra display outputs for three monitors.",
        n: "A new board needs two eight-pin power leads and extra airflow, so the case and the unit are both upgraded.",
        q: "board that drives the display"
      },
      {
        t: "COOLING SYSTEM",
        d: "the fans, heatsink and thermal compound that carry heat away from hot parts",
        f: "Cooling system keeps the processor inside its safe temperature range while it works hard.",
        p: "apply fresh thermal compound and check that the fan turns freely",
        s: "A technician clears dust from the part that stops the processor from overheating.",
        n: "A machine slows down under load until the heatsink is reseated and the clogged fins are cleaned.",
        q: "keeps parts from overheating"
      },
      {
        t: "EXPANSION SLOT",
        d: "the connector on the board that accepts add-on cards",
        f: "Expansion slot lets extra cards be added to the system through the main board.",
        p: "match the card key and the slot generation before inserting the card",
        s: "A technician looks for the long connector used to add a network or capture board.",
        n: "A capture card runs at half speed because it was fitted to an older generation slot with fewer lanes.",
        q: "connector for add-on cards"
      }
    ]
  },

  "OHS GUIDELINES AND DMA PROCEDURES": {
    hints: [
      "Identify the safety rule or the documented procedure being described.",
      "Decide whether the item is about protection, inspection or record keeping.",
      "Prefer the option that removes the danger before the work starts."
    ],
    flaws: [
      "start the repair and look for the safety rules afterwards",
      "skip the written steps when the job looks familiar",
      "leave the floor wet and the leads across the walkway",
      "work alone on a live circuit without telling anyone",
      "keep working while a warning sign is still in place"
    ],
    constraints: [
      "keeping the workspace clear",
      "recording every step taken",
      "warning the people nearby",
      "keeping the protective gear in place"
    ],
    concepts: [
      {
        t: "ESD PRECAUTIONS",
        d: "the steps that stop static charge from damaging electronic parts",
        f: "ESD precautions stop static electricity from destroying sensitive components.",
        p: "wear a grounded wrist strap and work on a grounded mat",
        s: "A technician clips a wrist strap to the bare metal of the chassis before touching any board.",
        n: "A workshop adds humidity control and grounded mats after repeated failures on memory modules.",
        q: "static damage prevention"
      },
      {
        t: "PERSONAL PROTECTIVE EQUIPMENT",
        d: "the safety items worn to protect the body while working",
        f: "Personal protective equipment covers the eyes, hands and clothing as the task requires.",
        p: "select the protection that matches the hazard before starting work",
        s: "A technician puts on safety glasses before drilling a case panel.",
        n: "A supervisor checks gloves, goggles and closed shoes before the crew starts cutting metal for a rack.",
        q: "safety gear for the task"
      },
      {
        t: "HAZARD IDENTIFICATION",
        d: "the step of spotting what could cause injury before the work begins",
        f: "Hazard identification means finding the danger before the task starts.",
        p: "walk through the workspace and list the risks before starting",
        s: "A crew notes a frayed extension cord and a wet floor before beginning repairs.",
        n: "Before a rack installation, the team marks trip hazards, live circuits and sharp edges on a simple sketch of the room.",
        q: "spotting risks first"
      },
      {
        t: "WORKSPACE HOUSEKEEPING",
        d: "keeping the bench clean, tidy and free of clutter while working",
        f: "Workspace housekeeping keeps tools and small parts arranged so that nothing is lost or stepped on.",
        p: "clear the bench and return every tool to its place at the end of the task",
        s: "A technician sorts screws into a tray so that none of them roll onto the floor.",
        n: "A shop reduces lost tools by giving every item a marked place and checking the board at the end of each shift.",
        q: "clean and tidy bench"
      },
      {
        t: "ELECTRICAL SAFETY",
        d: "the practices that prevent shock and short circuits while working on equipment",
        f: "Electrical safety starts by unplugging the equipment before the case is opened.",
        p: "unplug the unit and release stored charge before touching the internals",
        s: "A technician pulls the plug from the wall socket before opening a system unit.",
        n: "A repair bench adds a residual current device and a lockout tag after a damaged mains lead was found.",
        q: "shock and short prevention"
      },
      {
        t: "FIRE SAFETY",
        d: "the rules for preventing, containing and escaping from a workplace blaze",
        f: "Fire safety means using the right extinguisher type and keeping escape routes clear.",
        p: "match the extinguisher class to the material that is burning",
        s: "A technician uses a carbon dioxide extinguisher on a small blaze in a live unit instead of water.",
        n: "A server room installs a clean-agent suppression system because water would ruin the equipment and conduct current.",
        q: "extinguisher choice and escape routes"
      },
      {
        t: "DOCUMENTED PROCEDURE",
        d: "a written step-by-step instruction followed during maintenance and assembly work",
        f: "Documented procedure records every step so that the same result can be repeated and checked.",
        p: "follow the written steps and record the outcome after each one",
        s: "A technician follows a printed checklist and signs off each completed step.",
        n: "A shop traces a repeat fault back to a step that had been skipped because no written record existed.",
        q: "written step-by-step method"
      }
    ]
  },

  "ASSEMBLE AND DISASSEMBLE SYSTEM UNIT": {
    hints: [
      "Identify the build or teardown step being described.",
      "Check the order of the steps before choosing an option.",
      "Decide which action keeps the parts and the technician safe."
    ],
    flaws: [
      "open the case while the mains lead is still connected",
      "rest the board on the carpet while fitting parts",
      "force a connector that does not line up",
      "leave screws inside the case after closing it",
      "start the machine before checking every connector"
    ],
    constraints: [
      "keeping the case open until the checks are done",
      "following the service manual order",
      "keeping every part in an anti-static bag",
      "recording each step in the build sheet"
    ],
    concepts: [
      {
        t: "POWER ISOLATION",
        d: "cutting the mains supply and releasing stored charge before the case is opened",
        f: "Power isolation means unplugging the unit and draining stored energy before any work starts.",
        p: "unplug the unit, press the start button to drain the capacitors and leave the lead out",
        s: "A technician removes the mains lead and presses the start button before opening the case.",
        n: "A bench adds a lockout tag so that nobody reconnects the mains while a unit is open.",
        q: "mains cut before opening"
      },
      {
        t: "CPU INSTALLATION",
        d: "fitting the chip into its socket with the alignment marks matched",
        f: "CPU installation requires matching the corner mark on the chip with the mark on the socket.",
        p: "lift the lever, align the marks, lower the chip and close the lever",
        s: "A technician matches the corner mark on the chip with the mark on the socket before lowering it into place.",
        n: "A board is returned as faulty after a chip was pressed in the wrong orientation and bent the socket pins.",
        q: "chip fitted to its socket"
      },
      {
        t: "THERMAL PASTE APPLICATION",
        d: "spreading a thin layer of compound between the chip and the heatsink",
        f: "Thermal paste application fills the tiny gaps between the chip and the heatsink so heat can pass.",
        p: "apply a small pea-sized amount and let the heatsink spread it",
        s: "A technician places a small dot of compound on the centre of the chip before fitting the cooler.",
        n: "Temperatures climb after a rebuild because the old compound was left in place and the new layer was far too thick.",
        q: "thin layer between chip and cooler"
      },
      {
        t: "RAM INSTALLATION",
        d: "seating the memory sticks in their slots so the clips lock",
        f: "RAM installation needs the notch aligned so that the module drops in without force.",
        p: "open the clips, match the notch and press both ends until they click",
        s: "A technician lines up the notch, then presses both ends of the memory stick until the clips snap shut.",
        n: "A dual-channel build reports less speed than expected because the two modules were fitted in the wrong slot pair.",
        q: "memory sticks locked in slots"
      },
      {
        t: "DRIVE MOUNTING",
        d: "fixing storage devices into the bays with the correct screws and cables",
        f: "Drive mounting uses the bay screws and the right data and power cables for the device.",
        p: "secure the device with the bay screws and connect the data cable before the power lead",
        s: "A technician slides a solid-state disk into the bay and secures it with four screws before attaching the cables.",
        n: "A newly fitted storage device is not detected until the data cable is reseated into the correct port.",
        q: "storage fixed into its bay"
      },
      {
        t: "FRONT PANEL CONNECTORS",
        d: "the small headers that link the case switches and lights to the board",
        f: "Front panel connectors link the start button, the reset button and the indicator lights to the board.",
        p: "check the board diagram for the pin layout before plugging in the headers",
        s: "A technician follows the board diagram to connect the start button and the indicator lights.",
        n: "A build powers on but the activity light stays dark because the header was placed on the wrong pins.",
        q: "case switches wired to the board"
      },
      {
        t: "CABLE ROUTING",
        d: "running the internal leads so that airflow stays clear and nothing is pinched",
        f: "Cable routing keeps the leads away from fans and sharp edges inside the case.",
        p: "route the leads behind the tray and tie them clear of the fans",
        s: "A technician ties the leads along the frame so that they never touch the fan blades.",
        n: "A build overheats because a bundle of leads was left across the intake path of the case.",
        q: "leads kept clear of fans"
      },
      {
        t: "POST CHECK",
        d: "the start-up check that confirms the main parts answer correctly",
        f: "POST test reports basic hardware faults before the operating system is loaded.",
        p: "listen for the beep pattern and read the screen message before changing any part",
        s: "A build beeps once and shows the memory count before starting the operating system.",
        n: "A system with a faulty module repeats a beep pattern and stops before boot, which points to memory rather than the drive.",
        q: "start-up hardware check"
      }
    ]
  }
};
