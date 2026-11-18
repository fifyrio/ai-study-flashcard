"""Tests for the code-quiz source parser and the authored questions.

Run:  python3 -m unittest discover -s tests -v
Tests that read the downloaded practice repo are skipped when external/ is absent.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import build_quiz  # noqa: E402
import quiz_parse as qp  # noqa: E402

SRC = ROOT / "quiz-src"
HAVE_EXTERNAL = build_quiz.EXT.is_dir()

MINIMAL = """@id T-1
@level L4
@no 1.1
@title t
@total 3
@rubric
M1|1|a|official
M2|2|b|derived
@cell
x = ⟦1 + 1||2⟧
print(⟦x⟧)
"""


class ParseCellTest(unittest.TestCase):
    def test_blanks_are_numbered_from_the_given_start_and_alts_split(self):
        tpl, blanks = qp.parse_cell("a = ⟦f(1)||g(1)||h(1)⟧\nb = ⟦2⟧", 5)
        self.assertEqual(tpl, "a = ⟦5⟧\nb = ⟦6⟧")
        self.assertEqual(blanks[0], {"answer": "f(1)", "alts": ["g(1)", "h(1)"]})

    def test_fill_cell_round_trips_to_the_original_code(self):
        tpl, blanks = qp.parse_cell("a = ⟦f(1)⟧\nprint(⟦a⟧)", 0)
        self.assertEqual(qp.fill_cell(tpl, blanks), "a = f(1)\nprint(a)")

    def test_empty_blank_is_rejected(self):
        with self.assertRaises(qp.QuizError):
            qp.parse_cell("a = ⟦  ⟧", 0)

    def test_unbalanced_marker_is_rejected(self):
        with self.assertRaises(qp.QuizError):
            qp.parse_cell("a = ⟦1 + 1", 0)


class ParseQuestionTest(unittest.TestCase):
    def test_minimal_question_parses_and_validates(self):
        q = qp.parse_question(MINIMAL)
        qp.validate(q)
        self.assertEqual((q["id"], len(q["cells"]), len(q["blanks"])), ("T-1", 1, 2))
        self.assertEqual([r["points"] for r in q["rubric"]], [1, 2])

    def test_missing_directive_is_rejected(self):
        with self.assertRaises(qp.QuizError):
            qp.parse_question("@id X\n@cell\nx = 1\n")

    def test_filled_code_must_be_valid_python(self):
        q = qp.parse_question(MINIMAL.replace("⟦1 + 1||2⟧", "⟦1 +||2⟧"))
        with self.assertRaises(qp.QuizError):
            qp.validate(q)

    def test_rubric_must_add_up_to_total(self):
        q = qp.parse_question(MINIMAL.replace("@total 3", "@total 4"))
        with self.assertRaises(qp.QuizError):
            qp.validate(q)

    def test_dash_points_skip_the_total_check(self):
        q = qp.parse_question(MINIMAL.replace("M1|1|a", "M1|-|a").replace("@total 3", "@total 9"))
        qp.validate(q)  # does not raise
        self.assertIsNone(q["rubric"][0]["points"])

    def test_pyodide_package_line_splits_into_builtin_and_pip(self):
        q = qp.parse_question(MINIMAL.replace("@total 3", "@total 3\n@py pandas, numpy | seaborn"))
        self.assertEqual(q["py"], {"pkgs": ["pandas", "numpy"], "pip": ["seaborn"]})


class AuthoredQuestionsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.paths = sorted(SRC.glob("*.txt"))
        cls.questions = []
        for path in cls.paths:
            if path.name.startswith("l3-") and not HAVE_EXTERNAL:
                continue
            cls.questions.append(qp.read_question_file(path))  # parse + validate

    def test_there_are_questions_for_both_levels(self):
        levels = {q["level"] for q in self.questions}
        self.assertIn("L4", levels)
        if HAVE_EXTERNAL:
            self.assertIn("L3", levels)

    def test_ids_are_unique_and_every_question_has_blanks(self):
        ids = [q["id"] for q in self.questions]
        self.assertEqual(len(ids), len(set(ids)))
        for q in self.questions:
            self.assertGreater(len(q["blanks"]), 0, q["id"])

    def test_every_blank_has_a_non_empty_answer_and_no_duplicate_alternatives(self):
        for q in self.questions:
            for i, b in enumerate(q["blanks"]):
                self.assertTrue(b["answer"].strip(), f"{q['id']} blank {i}")
                everything = [b["answer"], *b["alts"]]
                self.assertEqual(len(everything), len(set(everything)), f"{q['id']} blank {i}")

    def test_every_cell_template_references_only_its_own_blanks(self):
        for q in self.questions:
            for cell in q["cells"]:
                used = [int(n) for n in __import__("re").findall(r"⟦(\d+)⟧", cell["tpl"])]
                self.assertEqual(used, list(range(cell["first"], cell["first"] + cell["count"])), q["id"])

    def test_runnable_questions_ship_their_data_files(self):
        for q in self.questions:
            if q["runnable"] and q["level"] == "L4":
                self.assertTrue(q["file_refs"] or not q["py"]["pkgs"], q["id"])


@unittest.skipUnless(HAVE_EXTERNAL, "external practice repo not downloaded")
class BuildTest(unittest.TestCase):
    def test_build_produces_materials_for_every_question(self):
        quiz, files = build_quiz.build()
        self.assertEqual(len(quiz["questions"]), len(list(SRC.glob("*.txt"))))
        for q in quiz["questions"]:
            self.assertEqual(set(files[q["id"]]), {f["name"] for f in q["files"]})
            for f in q["files"]:
                if f["kind"] == "CSV":
                    self.assertEqual(f["rows"], len([ln for ln in files[q["id"]][f["name"]].splitlines() if ln.strip()]) - 1)

    def test_groups_follow_level_order(self):
        quiz, _ = build_quiz.build()
        self.assertEqual([g["id"] for g in quiz["groups"]], ["L3", "L4"])


if __name__ == "__main__":
    unittest.main()
