#!/usr/bin/env python3
"""Targeted question-bank repair for GEON GAMEHUB V5 (acceptance criteria).

Fixes ONLY the concrete defects found by tests/full_questioner_audit.js:

  1. "Option 1" / "Option 2" placeholder answer choices  -> real, plausible,
     thematically-related distractors. The correct answer string is never moved.
  2. Three NEW-bank questions whose question text is byte-identical to a
     PREVIOUS-bank question  -> fully rewritten new scenario/values so the two
     banks share no identical question text.

Nothing else (ids, levels, difficulty, categories, subject/set structure,
answer positions, counts) is modified. The correct answer remains exactly
where it was; the quiz engine shuffles choices at runtime anyway.
"""
import json
import re
import sys

ROOT = "."

PLACEHOLDER_CHOICE = re.compile(r"^option\s*\d*$", re.IGNORECASE)

# id -> ordered replacement strings for each placeholder choice encountered.
PLACEHOLDER_REPLACEMENTS = {
    "questions.json": {
        "PREVIOUS-MATH-SUBJECT_1-L25-04": ["190"],
        "PREVIOUS-MATH-SUBJECT_1-L27-05": ["294"],
        "PREVIOUS-MATH-SUBJECT_1-L31-06": ["254"],
        "PREVIOUS-MATH-SUBJECT_1-L36-07": ["228"],
        "PREVIOUS-MATH-SUBJECT_1-L38-08": ["174"],
        "PREVIOUS-MATH-SUBJECT_1-L40-09": ["90"],
        "PREVIOUS-MATH-SUBJECT_1-L55-13": ["230"],
        "PREVIOUS-MATH-SUBJECT_2-L04-02": ["15"],
        "PREVIOUS-MATH-SUBJECT_2-L07-04": ["20"],
        "PREVIOUS-MATH-SUBJECT_2-L11-05": ["24"],
        "PREVIOUS-MATH-SUBJECT_2-L20-06": ["14"],
        "PREVIOUS-MATH-SUBJECT_2-L25-07": ["136"],
        "PREVIOUS-MATH-SUBJECT_2-L29-08": ["108"],
        "PREVIOUS-MATH-SUBJECT_2-L35-09": ["116"],
        "PREVIOUS-MATH-SUBJECT_2-L49-12": ["336"],
        "PREVIOUS-MATH-SUBJECT_2-L51-14": ["238"],
        "PREVIOUS-MATH-SUBJECT_2-L54-16": ["420"],
        "PREVIOUS-SCIENCE-SUBJECT_1-L09-02": ["Blaise Pascal"],
        "PREVIOUS-SCIENCE-SUBJECT_1-L16-02": ["specific gravity"],
        "PREVIOUS-SCIENCE-SUBJECT_1-L19-04": ["Archimedes"],
        "PREVIOUS-SCIENCE-SUBJECT_2-L03-02": ["Isaac Newton"],
        "PREVIOUS-TECH_2-SUBJECT_1-L28-09": ["driver", "Windows Update"],
        "PREVIOUS-TECH_2-SUBJECT_1-L35-12": ["activation"],
        "PREVIOUS-TECH_2-SUBJECT_2-L20-04": ["partition"],
        "PREVIOUS-TECH_2-SUBJECT_2-L24-05": ["installation media"],
        "PREVIOUS-TECH_2-SUBJECT_2-L26-06": ["Windows Update"],
    },
    "questions.new.json": {
        "NEW-MATH-SUBJECT_1-L12-04": ["9"],
        "NEW-MATH-SUBJECT_1-L21-06": ["288"],
        "NEW-MATH-SUBJECT_1-L25-07": ["82"],
        "NEW-MATH-SUBJECT_1-L28-08": ["202"],
        "NEW-MATH-SUBJECT_1-L36-09": ["314"],
        "NEW-MATH-SUBJECT_1-L38-10": ["176"],
        "NEW-MATH-SUBJECT_1-L40-11": ["134"],
        "NEW-MATH-SUBJECT_1-L45-12": ["137"],
        "NEW-MATH-SUBJECT_2-L15-04": ["9"],
        "NEW-MATH-SUBJECT_2-L20-06": ["11"],
        "NEW-MATH-SUBJECT_2-L28-07": ["174"],
        "NEW-MATH-SUBJECT_2-L30-08": ["132"],
        "NEW-MATH-SUBJECT_2-L31-09": ["186"],
        "NEW-MATH-SUBJECT_2-L35-10": ["154"],
        "NEW-MATH-SUBJECT_2-L45-11": ["228"],
        "NEW-SCIENCE-SUBJECT_1-L06-02": ["specific gravity"],
        "NEW-SCIENCE-SUBJECT_1-L25-03": ["weight of displaced fluid"],
        "NEW-SCIENCE-SUBJECT_2-L11-01": ["centripetal force"],
        "NEW-TECH_1-SUBJECT_1-L15-07": ["SATA port"],
        "NEW-TECH_1-SUBJECT_1-L17-08": ["case fan"],
        "NEW-TECH_2-SUBJECT_1-L04-02": ["DNS server"],
        "NEW-TECH_2-SUBJECT_1-L09-03": ["CIDR"],
        "NEW-TECH_2-SUBJECT_1-L13-02": ["grounding mat"],
        "NEW-TECH_2-SUBJECT_1-L18-05": ["DHCP", "subnet mask"],
        "NEW-TECH_2-SUBJECT_1-L21-06": ["default gateway"],
        "NEW-TECH_2-SUBJECT_1-L24-11": ["legacy BIOS boot"],
        "NEW-TECH_2-SUBJECT_1-L32-04": ["documentation review"],
        "NEW-TECH_2-SUBJECT_2-L14-07": ["TPM"],
        "NEW-TECH_2-SUBJECT_2-L16-02": ["DHCP"],
        "NEW-TECH_2-SUBJECT_2-L19-03": ["ARP"],
        "NEW-TECH_2-SUBJECT_2-L31-06": ["default gateway", "IPv6"],
        "NEW-TECH_2-SUBJECT_2-L39-04": ["workspace control"],
        "NEW-TECH_2-SUBJECT_2-L40-08": ["DNS server"],
    },
}

# Full rewrite specs for NEW questions whose text duplicated a PREVIOUS question.
THE_REWRITES = {
    "NEW-MATH-SUBJECT_1-L08-02": {
        "question": "Start with 52 and subtract 17. What is the result?",
        "choices": ["35", "33", "25", "45"],
        "answer": "35",
        "explanation": "Subtract each listed amount from 52; the result is 35.",
        "hint": "Start with the first number and subtract each following amount.",
    },
    "NEW-MATH-SUBJECT_1-L09-03": {
        "question": "A gardener plants 6 seedlings per row for 4 rows, then plants 2 more. How many seedlings are planted in total?",
        "choices": ["26", "22", "24", "28"],
        "answer": "26",
        "explanation": "Compute 6 × 4 = 24, then add the 2 extra seedlings; the total is 26.",
        "hint": "Break the scenario into multiplication and addition steps.",
    },
    "NEW-MATH-SUBJECT_2-L19-05": {
        "question": "A student reads 7 pages per day for 4 days, then reads 3 more. How many pages are read in total?",
        "choices": ["31", "28", "25", "34"],
        "answer": "31",
        "explanation": "Compute 7 × 4 = 28, then add the 3 extra pages; the total is 31.",
        "hint": "Break the scenario into multiplication and addition steps.",
    },
}


def find_question(bank, qid):
    for subject, sets in bank.items():
        for qtype, rows in sets.items():
            for i, q in enumerate(rows):
                if q.get("id") == qid:
                    return subject, qtype, rows, i, q
    raise KeyError(qid)


def apply_patch(filename, placeholder_map, rewrites):
    path = f"{ROOT}/{filename}"
    with open(path, "r", encoding="utf-8") as fh:
        bank = json.load(fh)

    changed_placeholders = 0
    for qid, replacements in placeholder_map.items():
        subject, qtype, rows, i, question = find_question(bank, qid)
        choices = list(question["choices"])
        rep = list(replacements)
        for j, choice in enumerate(choices):
            if PLACEHOLDER_CHOICE.match(str(choice).strip()):
                if not rep:
                    raise AssertionError(f"{qid}: ran out of replacement values")
                new_value = rep.pop(0)
                assert new_value not in choices, f"{qid}: replacement collides with existing choice {new_value}"
                choices[j] = new_value
                changed_placeholders += 1
        if rep:
            raise AssertionError(f"{qid}: {len(rep)} replacement value(s) left unused")
        assert len(choices) == 4, f"{qid}: choices must stay 4 -> {choices}"
        assert len(set(choices)) == 4, f"{qid}: choices not unique -> {choices}"
        assert question["answer"] in choices, f"{qid}: answer missing from choices"
        question["choices"] = choices

    changed_rewrites = 0
    for qid, spec in rewrites.items():
        subject, qtype, rows, i, question = find_question(bank, qid)
        assert len(spec["choices"]) == 4 and len(set(spec["choices"])) == 4
        assert spec["answer"] in spec["choices"]
        question["question"] = spec["question"]
        question["choices"] = spec["choices"]
        question["answer"] = spec["answer"]
        question["explanation"] = spec["explanation"]
        question["hint"] = spec["hint"]
        changed_rewrites += 1

    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(json.dumps(bank, ensure_ascii=False, separators=(",", ":")))

    return changed_placeholders, changed_rewrites


def main():
    totals = {"placeholders": 0, "rewrites": 0}
    for filename in ("questions.json", "questions.new.json"):
        placeholders, rewrites = apply_patch(
            filename,
            PLACEHOLDER_REPLACEMENTS[filename],
            THE_REWRITES if filename == "questions.new.json" else {},
        )
        totals["placeholders"] += placeholders
        totals["rewrites"] += rewrites
        print(f"{filename}: replaced {placeholders} placeholder choice(s), rewrote {rewrites} question(s)")

    # safety: ensure the rewrite ids only exist in the NEW bank
    print("done:", totals)


if __name__ == "__main__":
    main()
