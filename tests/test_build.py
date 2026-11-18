"""Tests for the bank parser, answer matching and answer files.

Run:  python3 -m unittest discover -s tests -v
The bank-dependent tests need ``scripts/extract.sh`` to have been run (build/text/).
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import banks  # noqa: E402
import build_decks as bd  # noqa: E402
import chapters as ch  # noqa: E402
import media_topics  # noqa: E402

TEXT = ROOT / "build" / "text"
HAVE_TEXT = (TEXT / "ai_theory_bank.txt").exists() and (TEXT / "media_theory_bank.txt").exists()
needs_text = unittest.skipUnless(HAVE_TEXT, "run scripts/extract.sh first")


class SplitSequentialTest(unittest.TestCase):
    def test_splits_in_order_and_ignores_numbers_inside_text(self):
        text = "1 . 价格是 3 . 5 元吗？（ ） 2 . 第二题（ ） 3 . 第三题（ ）"
        got = banks.split_sequential(text)
        self.assertEqual([n for n, _ in got], [1, 2, 3])
        self.assertIn("3 . 5", got[0][1])  # "3 . " inside question 1 must not split early

    def test_drops_spaces_left_by_pdf_line_wrapping(self):
        self.assertEqual(banks.collapse("投放\n策略"), "投放策略")
        self.assertEqual(banks.collapse("A/B\n测试"), "A/B 测试")  # latin/CJK boundary keeps its space


class ParseMcTest(unittest.TestCase):
    def test_parses_four_options(self):
        cards = banks.parse_mc("1. 题干（ ） （A）甲 （B）乙 （C）丙 （D）丁 2. 下一题（ ） （A）1 （B）2 （C）3 （D）4")
        self.assertEqual(len(cards), 2)
        self.assertEqual(cards[0]["opts"], {"A": "甲", "B": "乙", "C": "丙", "D": "丁"})

    def test_rejects_question_without_four_options(self):
        with self.assertRaises(ValueError):
            banks.parse_mc("1. 题干（ ） （A）甲 （B）乙")


class OfficialAnswerMappingTest(unittest.TestCase):
    def test_official_option_text_maps_to_shuffled_bank_letter(self):
        # The mock paper lists the options in another order than the bank does.
        mock = {"tf": [], "mc": [{"n": 1, "q": "题干", "opts": {"A": "甲", "B": "乙", "C": "丙", "D": "丁"}, "a": "B"}]}
        bank = [{"n": 77, "q": "题干", "opts": {"A": "丁", "B": "丙", "C": "乙", "D": "甲"}}]
        cards = bd.make_cards("x", "mc", bank, bd.official_index(mock)["mc"], {}, lambda c: "basic")
        self.assertEqual((cards[0]["a"], cards[0]["src"]), ("C", "official"))  # "乙" is option C in the bank

    def test_official_answer_wins_over_my_answer(self):
        mock = {"tf": [{"n": 1, "q": "某陈述", "a": "T"}], "mc": []}
        bank = [{"n": 5, "q": "某陈述"}]
        cards = bd.make_cards("x", "tf", bank, bd.official_index(mock)["tf"], {5: ("F", "")}, lambda c: "basic")
        self.assertEqual((cards[0]["a"], cards[0]["src"]), ("T", "official"))

    def test_my_answer_used_when_no_official_one(self):
        bank = [{"n": 9, "q": "陈述"}]
        cards = bd.make_cards("x", "tf", bank, {}, {9: ("F", "? 不确定")}, lambda c: "basic")
        self.assertEqual((cards[0]["a"], cards[0]["src"], cards[0]["note"]), ("F", "ai", "? 不确定"))


@needs_text
class BankFilesTest(unittest.TestCase):
    def test_ai_bank_and_mock_counts(self):
        tf, mc = banks.parse_ai_bank(banks.read(TEXT / "ai_theory_bank.txt"))
        self.assertEqual((len(tf), len(mc)), (250, 500))
        mock = banks.parse_ai_mock(banks.read(TEXT / "ai_theory_mock.txt"))
        self.assertEqual(mock["counts"], (50, 50, 150, 150))

    def test_media_bank_and_mock_counts(self):
        tf, mc = banks.parse_media_bank(banks.read(TEXT / "media_theory_bank.txt"))
        self.assertEqual((len(tf), len(mc)), (471, 855))
        mock = banks.parse_media_mock(banks.read(TEXT / "media_theory_mock.txt"))
        self.assertEqual(mock["counts"], (60, 60, 140, 140))

    def test_nearly_all_official_answers_attach_to_the_bank(self):
        ai = bd.build_ai()
        self.assertEqual(sum(c["src"] == "official" for c in ai), 200)
        media = bd.build_media()
        self.assertGreaterEqual(sum(c["src"] == "official" for c in media), 195)  # 3 mock stems are broken by page breaks


@needs_text
class AnswerFileTest(unittest.TestCase):
    def test_every_ai_question_has_an_answer(self):
        missing = [c["id"] for c in bd.build_ai() if c["src"] == "none"]
        self.assertEqual(missing, [])

    def test_answer_files_only_reference_existing_questions_with_valid_letters(self):
        ai_tf, ai_mc = banks.parse_ai_bank(banks.read(TEXT / "ai_theory_bank.txt"))
        md_tf, md_mc = banks.parse_media_bank(banks.read(TEXT / "media_theory_bank.txt"))
        cases = [("ai-tf.txt", {c["n"] for c in ai_tf}, "TF"), ("ai-mc.txt", {c["n"] for c in ai_mc}, "ABCD"),
                 ("media-tf.txt", {c["n"] for c in md_tf}, "TF"), ("media-mc.txt", {c["n"] for c in md_mc}, "ABCD")]
        for name, valid_ids, letters in cases:
            for n, (letter, _) in bd.load_answer_file(bd.ANSWERS / name).items():  # also rejects duplicates
                self.assertIn(n, valid_ids, f"{name}: question {n} does not exist")
                self.assertIn(letter, letters, f"{name}: bad answer {letter!r} for {n}")

    def test_ai_chapters_cover_every_question_with_known_keys(self):
        for c in bd.build_ai():
            self.assertIn(c["ch"], ch.AI_CHAPTERS)


class MediaTopicTest(unittest.TestCase):
    def test_keyword_routing(self):
        self.assertEqual(media_topics.media_chapter("广告创意素材库的建设与投放预算"), "placement")
        self.assertEqual(media_topics.media_chapter("账号的完播率和互动率如何优化"), "review")
        self.assertEqual(media_topics.media_chapter("漏斗分析与留存分析"), "analysis")
        self.assertEqual(media_topics.media_chapter("完全无关的一句话"), "basic")

    def test_every_chapter_key_is_declared(self):
        self.assertEqual(set(media_topics.KEYWORDS), set(ch.MEDIA_CHAPTERS))


if __name__ == "__main__":
    unittest.main()
