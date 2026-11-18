"""Chapter layout of each question bank.

``weight`` is the chapter's share of the 100-point theory paper, taken from the
official 考核要素细目表. Question numbers inside a bank follow the syllabus order
for the AI trainer bank, so chapters are plain number ranges there. The media
bank is shuffled, so its chapters are assigned by keyword (see ``media_chapter``).
"""
from __future__ import annotations

from typing import NamedTuple


class Chapter(NamedTuple):
    key: str
    name: str
    weight: int  # points out of 100 on the theory paper


AI_CHAPTERS: dict[str, Chapter] = {
    c.key: c
    for c in (
        Chapter("basic", "基本要求（道德·Office·法律）", 20),
        Chapter("collect", "数据采集和处理", 20),
        Chapter("classify", "数据归类和定义", 24),
        Chapter("audit", "标注数据审核", 16),
        Chapter("maintain", "智能系统维护", 11),
        Chapter("optimize", "智能系统优化", 9),
    )
}

# (first question number, chapter key); a question belongs to the last start <= its number.
AI_TF_STARTS = [(1, "basic"), (51, "collect"), (101, "classify"), (161, "audit"),
                (201, "maintain"), (229, "optimize")]
AI_MC_STARTS = [(1, "basic"), (103, "collect"), (205, "classify"), (322, "audit"),
                (403, "maintain"), (453, "optimize")]


def chapter_for(n: int, starts: list[tuple[int, str]]) -> str:
    key = starts[0][1]
    for first, k in starts:
        if n >= first:
            key = k
    return key


MEDIA_CHAPTERS: dict[str, Chapter] = {
    c.key: c
    for c in (
        Chapter("basic", "基本要求（道德·传播·营销·法规）", 15),
        Chapter("industry", "行业分析", 7),
        Chapter("platform", "平台分析", 8),
        Chapter("placement", "流量投放", 22),
        Chapter("optimize", "流量优化", 18),
        Chapter("analysis", "数据分析", 15),
        Chapter("review", "复盘优化", 15),
    )
}
