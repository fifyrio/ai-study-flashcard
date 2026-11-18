"""Parse the exam question banks (plain text from scripts/extract.sh) into plain dicts.

Both banks number their questions 1..N inside a section, so questions are split
*sequentially*: after question n comes the next ``n+1.`` marker. That avoids false
splits on numbers that appear inside a stem or an option.

Every function is pure and returns new objects; nothing here mutates its inputs.
"""
from __future__ import annotations

import re
from pathlib import Path

OPTION_RE = re.compile(r"[（(]([A-D])[）)]\s*(.*?)(?=\s*[（(][A-D][）)]|\s*$)")
_DROP_FOR_NORM = re.compile(r"[\s　（）()。，、；：:;,.!?！？“”\"'‘’—\-·]")
_BLANK_TAIL = re.compile(r"[（(]\s*[）)]\s*$")


def norm(text: str) -> str:
    """Normalise text so the same question matches across bank and mock paper."""
    return _DROP_FOR_NORM.sub("", text)


_CJK_GAP = re.compile(r"(?<=[一-鿿，。、；：！？）”])\s+(?=[一-鿿，。、；：！？（“])")


def collapse(text: str) -> str:
    """Collapse whitespace; drop the spaces PDF line-wrapping leaves between CJK characters."""
    flat = re.sub(r"\s+", " ", text.replace("\f", " ")).strip()
    return _CJK_GAP.sub("", flat)


def split_sequential(text: str, start: int = 1) -> list[tuple[int, str]]:
    """Split ``text`` into (number, body) pairs by looking for ``n .`` markers in order."""
    s = collapse(text)
    marks: list[tuple[int, int, int]] = []  # (n, marker_start, body_start)
    cursor, n = 0, start
    while True:
        m = re.compile(rf"(?:^|\s){n}\s?\.\s").search(s, cursor)
        if not m:
            break
        marks.append((n, m.start(), m.end()))
        cursor, n = m.end(), n + 1
    out = []
    for i, (num, _, body_start) in enumerate(marks):
        body_end = marks[i + 1][1] if i + 1 < len(marks) else len(s)
        out.append((num, s[body_start:body_end].strip()))
    return out


def _clean_tf_stem(body: str) -> str:
    body = re.sub(r"[（(]\s*[）)]\s*$", "", body).strip()  # trailing answer blank (media)
    body = re.sub(r"[（(]\s*[）)]\s*$", "", body).strip()  # leading blank of next AI question
    return body


def parse_tf(section: str) -> list[dict]:
    """True/false questions. ``section`` holds only the T/F part of a paper."""
    # AI papers prefix every item with "(    )" which would stick to the previous body.
    cleaned = re.sub(r"\(\s*\)\s*(?=\d+\.)", "", section)
    return [{"n": n, "q": _clean_tf_stem(body)} for n, body in split_sequential(cleaned)]


def parse_mc(section: str) -> list[dict]:
    """Single-choice questions with exactly four options A-D."""
    cards = []
    for n, body in split_sequential(section):
        first = re.search(r"[（(]A[）)]", body)
        if not first:
            raise ValueError(f"MC {n}: no option A found: {body[:60]!r}")
        stem = body[: first.start()].strip()
        opts = {k: v.strip() for k, v in OPTION_RE.findall(body[first.start():])}
        if sorted(opts) != ["A", "B", "C", "D"]:
            raise ValueError(f"MC {n}: options parsed as {sorted(opts)}: {body[:80]!r}")
        cards.append({"n": n, "q": stem, "opts": opts})
    return cards


def _between(text: str, start_marker: str, end_marker: str | None) -> str:
    head = text.split(start_marker, 1)[1]
    return head.split(end_marker, 1)[0] if end_marker else head


def parse_ai_bank(text: str) -> tuple[list[dict], list[dict]]:
    tf = parse_tf(_between(text, "判断题（", "二、单选题"))
    mc = parse_mc(_between(text, "二、单选题", None))
    return tf, mc


def parse_media_bank(text: str) -> tuple[list[dict], list[dict]]:
    tf = parse_tf(_between(text, "判断题", "二、单项选择题"))
    mc = parse_mc(_between(text, "二、单项选择题", None))
    return tf, mc


def parse_ai_mock(text: str) -> dict:
    """Return questions plus the official answer key of the AI trainer mock paper."""
    # Section headings ("•\t单选题（..." / "人工智能训练师（四级）理论知识试卷答案") would otherwise
    # stick to the last question of the previous section and break text matching.
    tf_q = parse_tf(_between(text, "判断题（", "单选题（").rstrip().rstrip("•").rstrip())
    mc_q = parse_mc(_between(text, "单选题（", "人工智能训练师（四级）理论知识试卷答案"))
    tf_key = re.findall(r"\(([×√])\)", _between(text, "判断题参考答案", "单选题参考答案"))
    mc_key = re.sub(r"[^A-D]", "", text.split("单选题参考答案", 1)[1])
    return {
        "tf": [dict(q, a="T" if k == "√" else "F") for q, k in zip(tf_q, tf_key)],
        "mc": [dict(q, a=k) for q, k in zip(mc_q, mc_key)],
        "counts": (len(tf_q), len(tf_key), len(mc_q), len(mc_key)),
    }


def parse_media_mock(text: str) -> dict:
    body, answers = text.split("理论知识试卷答案", 1)
    tf_section = re.sub(r"得\s*分\s*评分人.*$", "", _between(body, "判断题", "单项选择题"), flags=re.S)
    tf_q = parse_tf(tf_section)
    mc_q = parse_mc(_mc_part(body))
    tf_ans, mc_ans = answers.split("单项选择题", 1)
    tf_key = {int(n): k for n, k in re.findall(r"(\d{1,2})\s?\.\s*([√×])", tf_ans)}
    mc_key = {int(n): k for n, k in re.findall(r"(\d{1,3})\s?\.\s*([A-D])", mc_ans)}
    return {
        "tf": [dict(q, a="T" if tf_key[q["n"]] == "√" else "F") for q in tf_q if q["n"] in tf_key],
        "mc": [dict(q, a=mc_key[q["n"]]) for q in mc_q if q["n"] in mc_key],
        "counts": (len(tf_q), len(tf_key), len(mc_q), len(mc_key)),
    }


def _mc_part(paper_body: str) -> str:
    """Text after the MC heading line of a media paper (skips the heading's own prose)."""
    after = paper_body.split("单项选择题", 1)[1]
    # heading reads "...每题 0.5 分，满分 70 分）" - the questions start after the first "）"
    return after.split("满分 70 分）", 1)[1] if "满分 70 分）" in after else after


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")
