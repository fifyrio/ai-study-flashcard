"""Build flashcard decks from the parsed banks + official mock answers + my own answer files.

Usage:
    python3 scripts/build_decks.py            # write flashcards/data/*.js
    python3 scripts/build_decks.py --todo ai  # list questions that still have no answer
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import banks  # noqa: E402
import chapters as ch  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TEXT = ROOT / "build" / "text"
ANSWERS = ROOT / "answers"
OUT = ROOT / "flashcards" / "data"

ANSWER_LINE = re.compile(r"^\s*(\d+)\s+([A-DTF])\s*(?:\|\s*(.*))?$")


def mc_key(card: dict) -> str:
    """Stem plus the *set* of option texts: papers may shuffle option order (the media mock does)."""
    return banks.norm(card["q"]) + "|" + "|".join(sorted(banks.norm(v) for v in card["opts"].values()))


def tf_key(card: dict) -> str:
    return banks.norm(card["q"])


def official_index(mock: dict) -> dict[str, dict[str, str]]:
    """Map normalised question text -> official answer, for both question types."""
    return {
        "tf": {tf_key(c): c["a"] for c in mock["tf"]},
        # for MC store the *text* of the correct option, so a shuffled bank still maps correctly
        "mc": {mc_key(c): banks.norm(c["opts"][c["a"]]) for c in mock["mc"]},
    }


def load_answer_file(path: Path) -> dict[int, tuple[str, str]]:
    """Parse ``<n> <answer> [| note]`` lines; ``#`` starts a comment line."""
    found: dict[int, tuple[str, str]] = {}
    if not path.exists():
        return found
    for lineno, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        m = ANSWER_LINE.match(raw)
        if not m:
            raise ValueError(f"{path.name}:{lineno}: cannot parse {raw!r}")
        n = int(m.group(1))
        if n in found:
            raise ValueError(f"{path.name}:{lineno}: duplicate answer for {n}")
        found[n] = (m.group(2), (m.group(3) or "").strip())
    return found


def make_cards(exam: str, qtype: str, bank: list[dict], official: dict[str, str],
               mine: dict[int, tuple[str, str]], chapter_of) -> list[dict]:
    keyer = tf_key if qtype == "tf" else mc_key
    cards = []
    for c in bank:
        off = official.get(keyer(c))
        if off and qtype == "mc":  # translate the official option text back to this bank's letter
            off = next((k for k, v in c["opts"].items() if banks.norm(v) == off), None)
        ans, note = mine.get(c["n"], (None, ""))
        if off:
            answer, src = off, "official"
        elif ans:
            answer, src = ans, "ai"
        else:
            answer, src = None, "none"
        card = {"id": f"{exam}-{qtype}-{c['n']}", "exam": exam, "type": qtype, "n": c["n"],
                "ch": chapter_of(c), "q": c["q"], "a": answer, "src": src}
        if qtype == "mc":
            card["opts"] = c["opts"]
        if note:
            card["note"] = note
        cards.append(card)
    return cards


def build_ai() -> list[dict]:
    tf, mc = banks.parse_ai_bank(banks.read(TEXT / "ai_theory_bank.txt"))
    off = official_index(banks.parse_ai_mock(banks.read(TEXT / "ai_theory_mock.txt")))
    return (
        make_cards("ai", "tf", tf, off["tf"], load_answer_file(ANSWERS / "ai-tf.txt"),
                   lambda c: ch.chapter_for(c["n"], ch.AI_TF_STARTS))
        + make_cards("ai", "mc", mc, off["mc"], load_answer_file(ANSWERS / "ai-mc.txt"),
                     lambda c: ch.chapter_for(c["n"], ch.AI_MC_STARTS))
    )


def build_media() -> list[dict]:
    from media_topics import media_chapter  # local import: keeps AI build independent

    tf, mc = banks.parse_media_bank(banks.read(TEXT / "media_theory_bank.txt"))
    off = official_index(banks.parse_media_mock(banks.read(TEXT / "media_theory_mock.txt")))
    text_of = lambda c: c["q"] + " " + " ".join(c.get("opts", {}).values())  # noqa: E731
    return (
        make_cards("media", "tf", tf, off["tf"], load_answer_file(ANSWERS / "media-tf.txt"),
                   lambda c: media_chapter(text_of(c)))
        + make_cards("media", "mc", mc, off["mc"], load_answer_file(ANSWERS / "media-mc.txt"),
                     lambda c: media_chapter(text_of(c)))
    )


def write_deck(exam: str, cards: list[dict]) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    chapters = ch.AI_CHAPTERS if exam == "ai" else ch.MEDIA_CHAPTERS
    meta = {k: {"name": v.name, "weight": v.weight} for k, v in chapters.items()}
    answered = [c for c in cards if c["a"]]
    payload = "window.DECKS = window.DECKS || {};\nwindow.DECKS[%s] = %s;\n" % (
        json.dumps(exam),
        json.dumps({"chapters": meta, "cards": answered}, ensure_ascii=False, separators=(",", ":")),
    )
    path = OUT / f"{exam}.js"
    path.write_text(payload, encoding="utf-8")
    return path


def summarize(exam: str, cards: list[dict]) -> None:
    by: dict[tuple[str, str], list[int]] = {}
    for c in cards:
        row = by.setdefault((c["ch"], c["type"]), [0, 0, 0])
        row[0] += 1
        row[1] += c["src"] == "official"
        row[2] += c["src"] == "ai"
    print(f"[{exam}] total={len(cards)} official={sum(c['src']=='official' for c in cards)} "
          f"ai={sum(c['src']=='ai' for c in cards)} missing={sum(c['src']=='none' for c in cards)}")
    for (chap, qt), (n, o, a) in sorted(by.items()):
        print(f"   {chap:<10}{qt}  n={n:<4} official={o:<4} ai={a:<4} missing={n - o - a}")


def print_todo(cards: list[dict], chapter: str | None, qtype: str | None, limit: int | None) -> None:
    shown = 0
    for c in cards:
        if c["src"] != "none" or (chapter and c["ch"] != chapter) or (qtype and c["type"] != qtype):
            continue
        if c["type"] == "mc":
            opts = " ".join(f"{k}.{v}" for k, v in c["opts"].items())
            print(f"{c['n']}|{c['q']}|{opts}")
        else:
            print(f"{c['n']}|{c['q']}")
        shown += 1
        if limit and shown >= limit:
            break


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--todo", choices=["ai", "media"])
    p.add_argument("--chapter")
    p.add_argument("--type", choices=["tf", "mc"])
    p.add_argument("--limit", type=int)
    p.add_argument("--summary", action="store_true")
    args = p.parse_args()

    if args.todo:
        cards = build_ai() if args.todo == "ai" else build_media()
        print_todo(cards, args.chapter, args.type, args.limit)
        return
    for exam, builder in (("ai", build_ai), ("media", build_media)):
        try:
            cards = builder()
        except ModuleNotFoundError as e:  # media topics module not written yet
            print(f"[{exam}] skipped: {e}")
            continue
        summarize(exam, cards)
        if not args.summary:
            print("   wrote", write_deck(exam, cards).relative_to(ROOT))


if __name__ == "__main__":
    main()
