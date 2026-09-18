/*
 * TECH 2 content — firmware settings, networking, Windows installation and safety.
 */

module.exports = {
  "BIOS, CMOS, UEFI": {
    hints: [
      "Identify the firmware element or setting the description refers to.",
      "Decide whether the item stores settings, provides settings, or reports a fault.",
      "Check what survives a power cut and what does not."
    ],
    flaws: [
      "change setup values and leave no record of the originals",
      "remove the power while the firmware file is being written",
      "disable a protection because it takes an extra step",
      "flash a file downloaded for a different board revision",
      "assume the settings survived when the clock keeps resetting"
    ],
    constraints: [
      "keeping the machine on mains power",
      "recording the original values",
      "confirming the board revision first",
      "keeping the setup password with the owner"
    ],
    concepts: [
      {
        t: "BIOS FIRMWARE",
        d: "the firmware that starts the hardware and hands control to the operating system",
        f: "BIOS firmware runs the first hardware checks and then starts the boot device.",
        p: "open the setup screen during start-up to review the hardware settings",
        s: "A technician presses the setup key during start-up to check which drive the machine reads first.",
        n: "A machine reports no boot device because the firmware points to a drive that has been removed.",
        q: "start-up firmware"
      },
      {
        t: "CMOS BATTERY",
        d: "the small coin cell that keeps the clock and stored settings alive while the mains is off",
        f: "CMOS battery keeps the clock running and the stored settings intact while the machine is unplugged.",
        p: "check the cell voltage when the clock resets at every start-up",
        s: "Every time the computer is unplugged, the clock resets to an old date.",
        n: "A workshop computer loses its drive settings whenever the mains fails, and the small cell reads only two volts.",
        q: "keeps clock and settings alive"
      },
      {
        t: "CMOS SETTINGS",
        d: "the stored values such as date, boot order and hardware options held in a small memory area",
        f: "CMOS settings store the date, boot order and hardware options between sessions.",
        p: "record the original values before changing anything in the setup screen",
        s: "A technician sets the boot order and the date in the setup screen, and the values remain after a restart.",
        n: "After an experiment with the setup values fails, the team restores the documented defaults.",
        q: "stored setup values"
      },
      {
        t: "BEEP CODE",
        d: "the pattern of sounds a board uses to report a hardware fault before the display is ready",
        f: "Beep code reports faults such as missing memory before any image appears on screen.",
        p: "count the tones and look up the pattern in the board manual",
        s: "A machine makes one long tone repeatedly and never shows anything on the screen.",
        n: "A repeating tone pattern points to a graphics fault, which is confirmed when another card is fitted.",
        q: "sound pattern for hardware faults"
      },
      {
        t: "UEFI FIRMWARE",
        d: "the modern firmware with a graphical setup screen, large disk support and faster start-up",
        f: "UEFI firmware supports large disks, a graphical setup screen and a faster start-up than the older firmware.",
        p: "confirm which boot mode the system is using before installing a large drive",
        s: "A technician uses a graphical setup screen with mouse support instead of a blue text menu.",
        n: "A four-terabyte drive is not recognised until the newer boot mode is enabled on the board.",
        q: "modern graphical firmware"
      },
      {
        t: "SECURE BOOT",
        d: "a firmware check that only allows signed boot loaders to start",
        f: "Secure boot blocks unsigned boot loaders so that tampered software cannot start the system.",
        p: "check the signature of the boot loader before enabling the check",
        s: "A store-bought installer refuses to start until the firmware check is disabled in setup.",
        n: "A technician investigating an unexpected boot failure finds the loader signature invalid and re-signs the image instead of disabling protection.",
        q: "only signed boot loaders run"
      },
      {
        t: "BOOT ORDER",
        d: "the sequence of devices the firmware tries when starting the machine",
        f: "Boot order decides which device the firmware reads first when the system starts.",
        p: "set the intended device first and save the setting before restarting",
        s: "A technician sets the machine to read the installer first and the internal drive second.",
        n: "A fresh install still starts the old system because the network entry was left above the internal drive in the sequence.",
        q: "which device starts first"
      },
      {
        t: "FIRMWARE UPDATE",
        d: "replacing the built-in control program with a newer version from the maker",
        f: "Firmware update replaces the built-in control program with the maker's newer version.",
        p: "confirm the board revision matches the file and keep power connected during the update",
        s: "A technician downloads the newest control program for a board that will not recognise a new processor.",
        n: "A board stops working after a file for the wrong revision is applied, so the shop restores the original chip.",
        q: "newer built-in program installed"
      }
    ]
  },

  NETWORKING: {
    hints: [
      "Identify the addressing or routing element being described.",
      "Decide whether the item names a device, an address or a service.",
      "Check which part of the connection the description applies to."
    ],
    flaws: [
      "set two devices to the same address and expect both to work",
      "change the address without checking the mask",
      "unplug the cable and assume the cable is faultless",
      "test the name and the address together and stop there",
      "leave the service address blank and expect internet access"
    ],
    constraints: [
      "keeping the addresses unique on the network",
      "recording the settings before changing them",
      "testing one layer at a time",
      "keeping the connection stable during the test"
    ],
    concepts: [
      {
        t: "IP ADDRESS",
        d: "the logical address given to a device so that it can be found on a network",
        f: "IP address is the logical address that identifies a device on an IP network.",
        p: "check the address and the mask together before testing the connection",
        s: "A printer is given an address such as 192.168.1.50 so that other computers can reach it.",
        n: "Two machines are set to the same address, and both lose network access until one of them is changed.",
        q: "logical network address"
      },
      {
        t: "MAC ADDRESS",
        d: "the fixed hardware identifier burned into a network interface",
        f: "MAC address is fixed in the network interface and identifies it at the link layer.",
        p: "read the label or run the command that shows the interface hardware address",
        s: "A technician checks the hardware identifier printed on a network card to identify it in a filter list.",
        n: "A router blocks one device by its hardware identifier even though the machine keeps changing its other address.",
        q: "hardware identifier of an interface"
      },
      {
        t: "SUBNET MASK",
        d: "the value that separates the network part of an address from the host part",
        f: "Subnet mask tells a device which part of the address names the network.",
        p: "compare the mask with the address before deciding whether two devices share a network",
        s: "Two computers share the first three number groups of their address and reach each other without a router.",
        n: "A machine with the wrong mask cannot reach a printer that sits in the same building but on a different network segment.",
        q: "splits network and host parts"
      },
      {
        t: "DEFAULT GATEWAY",
        d: "the address of the device that forwards traffic to other networks",
        f: "Default gateway is used whenever a destination lies outside the local network.",
        p: "confirm the gateway address matches the router before testing internet access",
        s: "A computer sends traffic for the internet to the router address instead of searching for the destination locally.",
        n: "Local file sharing works but the internet fails because the gateway entry is empty.",
        q: "exit to other networks"
      },
      {
        t: "DNS",
        d: "the service that translates names into network addresses",
        f: "DNS translates a name such as a website into the address the network uses.",
        p: "test name resolution and the address separately to find which one fails",
        s: "A browser reaches a site when the address is typed directly but not when the name is used.",
        n: "A site works from one provider and fails from another because the name record was not updated everywhere.",
        q: "names turned into addresses"
      },
      {
        t: "DHCP",
        d: "the service that hands out network addresses automatically",
        f: "DHCP hands out addresses so that devices do not need to be configured by hand.",
        p: "check whether the device can ask for an automatic address before setting one by hand",
        s: "A laptop joins an office network and receives every address it needs without any manual entry.",
        n: "New phones fail to join the wireless network because the address pool has no free entries left.",
        q: "automatic address assignment"
      },
      {
        t: "ROUTER",
        d: "the device that connects different networks and forwards traffic between them",
        f: "Router connects separate networks and forwards traffic between them.",
        p: "check the route table and the interfaces before blaming the connection",
        s: "A home device lets computers on the local network reach the internet through the provider link.",
        n: "A branch office separates its guest wireless from the business network by placing the traffic on different ports and networks.",
        q: "forwards traffic between networks"
      }
    ]
  },

  "WINDOWS INSTALLATION": {
    hints: [
      "Identify the installation step or the system component being described.",
      "Decide whether the item prepares the media, the drive or the running system.",
      "Check the order that keeps existing files safe."
    ],
    flaws: [
      "wipe the target drive before confirming which disk it is",
      "install drivers from an unknown website",
      "skip the updates and connect the machine to the network",
      "reinstall everything before trying the repair tools",
      "use installation files from an unverified image"
    ],
    constraints: [
      "keeping the existing data safe",
      "staying inside the maintenance window",
      "recording the licence details",
      "checking each step before moving on"
    ],
    concepts: [
      {
        t: "INSTALLATION MEDIA",
        d: "the prepared USB stick or disc that carries the setup files",
        f: "Installation media must be created from a trusted image and set as the first boot device.",
        p: "verify the image and test the media before wiping the target drive",
        s: "A technician prepares a USB stick so that the machine can start the setup program.",
        n: "Setup fails halfway because the stick was written from a corrupted image that failed its checksum test.",
        q: "prepared USB or disc"
      },
      {
        t: "PARTITIONING",
        d: "dividing a drive into sections before the operating system is placed on one of them",
        f: "Partitioning decides how the drive space is divided before the system files are written.",
        p: "back up the data and confirm the target drive before deleting any section",
        s: "A technician sets aside a system section and a data section on the same physical drive.",
        n: "A machine will not start after the wrong disk was cleared because the drive numbers were not checked first.",
        q: "dividing the drive"
      },
      {
        t: "NTFS",
        d: "the file system that supports permissions, very large files and recovery logging on Windows drives",
        f: "NTFS supports file permissions, very large files and recovery logging.",
        p: "check the file system before copying very large files onto a drive",
        s: "A drive that allows permissions and holds files larger than four gigabytes is chosen for the setup program.",
        n: "A large backup fails on a freshly formatted external drive until the drive is reformatted with the correct file system.",
        q: "file system with permissions"
      },
      {
        t: "PRODUCT KEY ACTIVATION",
        d: "the licence step that confirms the installed copy of Windows is genuine",
        f: "Product key activation confirms that the installed copy of Windows is properly licensed.",
        p: "record the licence key before starting a clean install",
        s: "The setup asks for a 25-character code that proves the copy is licensed.",
        n: "The desktop shows a watermark because the digital licence was tied to the replaced board and the key had to be entered again.",
        q: "licence confirmation"
      },
      {
        t: "DEVICE DRIVERS",
        d: "the small programs that let Windows talk to each piece of hardware",
        f: "Device drivers let the system use the features of each piece of hardware.",
        p: "install the maker's driver for the exact model and check the hardware list afterwards",
        s: "A printer works only after the manufacturer's own software is installed for that model.",
        n: "A laptop has no sound until the correct audio driver is installed from the maker's support page.",
        q: "software that talks to hardware"
      },
      {
        t: "WINDOWS UPDATE",
        d: "the service that downloads fixes, drivers and security patches for the system",
        f: "Windows Update delivers security fixes and driver packages after installation.",
        p: "let the updates finish and restart before installing other software",
        s: "A technician connects the network so that the new installation can receive its security patches.",
        n: "A team schedules updates outside working hours because an automatic restart once interrupted a shift handover.",
        q: "system fixes downloaded"
      },
      {
        t: "RECOVERY ENVIRONMENT",
        d: "the repair tools that start when the normal system cannot boot",
        f: "Recovery environment provides repair tools such as start-up repair and system restore.",
        p: "try the repair options before choosing to reinstall everything",
        s: "A machine that fails to start offers repair options instead of the usual desktop.",
        n: "A corrupted boot record is repaired from the built-in repair options without losing the installed programs and files.",
        q: "repair tools when boot fails"
      }
    ]
  },

  "SAFETY PROCEDURES": {
    hints: [
      "Identify the safety procedure that matches the situation.",
      "Decide whether the risk comes from static, from a battery, from lifting or from fire.",
      "Choose the step that removes the danger before the work continues."
    ],
    flaws: [
      "keep working and warn people afterwards",
      "carry the load alone to save time",
      "store damaged cells with the ordinary rubbish",
      "put water on equipment that is still connected",
      "skip the grounding step when the job looks quick"
    ],
    constraints: [
      "keeping everyone clear of the hazard",
      "reporting the incident afterwards",
      "recording what was damaged",
      "keeping the equipment switched off"
    ],
    concepts: [
      {
        t: "ESD WRIST STRAP",
        d: "the band that grounds the technician through a resistor while boards are handled",
        f: "ESD wrist strap keeps the technician at the same charge as the grounded workbench.",
        p: "clip the strap to bare metal on the chassis before handling any board",
        s: "A technician fastens a band around the wrist and clips its lead to the bare metal of the case.",
        n: "A repair shop records fewer dead memory modules after every bench is fitted with grounded straps and mats.",
        q: "grounding band for boards"
      },
      {
        t: "LITHIUM BATTERY HANDLING",
        d: "the rules for storing, charging and disposing of high-energy cells",
        f: "Lithium battery handling rules cover charging limits, physical damage and proper disposal.",
        p: "use the maker's charger and take damaged cells to a collection point",
        s: "A swollen phone battery is placed in a fireproof container and taken to a collection point.",
        n: "A workshop forbids charging damaged cells indoors after a punctured pack released hot gas.",
        q: "safe charging and disposal of cells"
      },
      {
        t: "SAFE LIFTING",
        d: "moving heavy equipment with the legs, keeping the back straight and the load close",
        f: "Safe lifting uses the legs, keeps the back straight and holds the load close to the body.",
        p: "test the weight and get help before lifting a rack or a monitor",
        s: "A technician bends the knees before lifting a heavy unit and asks a colleague for help.",
        n: "A team uses a trolley for a heavy server instead of carrying it up a flight of stairs.",
        q: "legs bent, load close"
      },
      {
        t: "ELECTRICAL FIRE RESPONSE",
        d: "the steps for cutting the supply and extinguishing a fire that involves live equipment",
        f: "Electrical fire response starts by cutting the supply and using a carbon dioxide extinguisher.",
        p: "cut the supply before fighting the fire and evacuate if it spreads",
        s: "A technician switches off the supply at the breaker before using a carbon dioxide extinguisher on a smoking unit.",
        n: "A team lets the suppression system handle a fire inside a closed rack instead of opening the door and feeding it air.",
        q: "cut supply, then fight the fire"
      }
    ]
  }
};
