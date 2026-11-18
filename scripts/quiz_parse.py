"""Parse the hand-authored question sources in quiz-src/*.txt.

Source format (one question per file)::

    @id L3-2.2.1            single-line directives: id level no title source total time py runnable
    @files                  multi-line sections: files desc tasks rubric cell (cell may repeat)
    name = ext:<path under the downloaded repo's practices/> | src:<path under quiz-src/files/>
    @cell
    data = ⟦pd.read_csv('a.csv')⟧       a blank; ⟦answer||alternative||alternative⟧

Everything here is pure: parsing returns new dicts and never touches the filesystem except
``read_question_file`` / ``load_materials``.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path
from typing import Any

SINGLE = {"id", "level", "no", "title", "source", "total", "time", "py", "runnable"}
SECTIONS = {"files", "desc", "tasks", "rubric", "cell"}
BLANK_RE = re.compile(r"⟦(.*?)⟧", re.S)
LEVELS = {"L3": "三级（上海交大模拟卷，来自仓库）", "L4": "四级（按实操题改写）"}


class QuizError(ValueError):
    """A question source is malformed."""


def _split_sections(text: str) -> tuple[dict[str, str], list[tuple[str, str]]]:
    singles: dict[str, str] = {}
    sections: list[tuple[str, str]] = []
    current: list[str] | None = None
    name = ""
    for raw in text.splitlines():
        m = re.match(r"@(\w+)\s*(.*)$", raw)
        if m and m.group(1) in SINGLE:
            singles[m.group(1)] = m.group(2).strip()
            continue
        if m and m.group(1) in SECTIONS:
            if current is not None:
                sections.append((name, "\n".join(current).strip("\n")))
            name, current = m.group(1), []
            continue
        if current is None:
            if raw.strip():
                raise QuizError(f"text before the first section: {raw!r}")
            continue
        current.append(raw)
    if current is not None:
        sections.append((name, "\n".join(current).strip("\n")))
    return singles, sections


def parse_cell(code: str, first_index: int) -> tuple[str, list[dict[str, Any]]]:
    """Replace each ⟦answer||alt⟧ by ⟦n⟧ and return (template, blanks)."""
    blanks: list[dict[str, Any]] = []

    def repl(m: re.Match[str]) -> str:
        parts = [p.strip() for p in m.group(1).split("||")]
        if not parts[0]:
            raise QuizError(f"empty blank answer in: {m.group(0)!r}")
        blanks.append({"answer": parts[0], "alts": parts[1:]})
        return f"⟦{first_index + len(blanks) - 1}⟧"

    template = BLANK_RE.sub(repl, code)
    if "⟦" in BLANK_RE.sub("", code) or "⟧" in BLANK_RE.sub("", code):
        raise QuizError("unbalanced ⟦ ⟧ marker in a cell")
    return template, blanks


def fill_cell(template: str, blanks: list[dict[str, Any]]) -> str:
    """Put every blank's primary answer back into the template (used for syntax checks)."""
    return re.sub(r"⟦(\d+)⟧", lambda m: blanks[int(m.group(1))]["answer"], template)


def parse_rubric(text: str) -> list[dict[str, Any]]:
    rows = []
    for line in filter(None, (ln.strip() for ln in text.splitlines())):
        code, points, desc, src = (p.strip() for p in line.split("|"))
        rows.append({"code": code, "points": None if points == "-" else int(points), "text": desc, "src": src})
    return rows


def parse_files(text: str) -> list[tuple[str, str]]:
    out = []
    for line in filter(None, (ln.strip() for ln in text.splitlines())):
        name, _, ref = line.partition("=")
        out.append((name.strip(), ref.strip()))
    return out


def parse_question(text: str) -> dict[str, Any]:
    singles, sections = _split_sections(text)
    missing = {"id", "level", "no", "title", "total"} - set(singles)
    if missing:
        raise QuizError(f"missing directives: {sorted(missing)}")
    if singles["level"] not in LEVELS:
        raise QuizError(f"unknown level {singles['level']!r}")

    cells: list[dict[str, Any]] = []
    blanks: list[dict[str, Any]] = []
    parts: dict[str, str] = {}
    for name, body in sections:
        if name == "cell":
            template, cell_blanks = parse_cell(body, len(blanks))
            cells.append({"tpl": template, "first": len(blanks), "count": len(cell_blanks)})
            blanks = [*blanks, *cell_blanks]
        else:
            parts[name] = body
    if not cells:
        raise QuizError("a question needs at least one @cell")

    pkgs, _, pip = singles.get("py", "").partition("|")
    split = lambda s: [p.strip() for p in s.split(",") if p.strip()]  # noqa: E731
    rubric = parse_rubric(parts.get("rubric", ""))
    return {
        "id": singles["id"], "level": singles["level"], "no": singles["no"], "title": singles["title"],
        "source": singles.get("source", ""), "total": int(singles["total"]), "time": int(singles.get("time", 0)),
        "runnable": singles.get("runnable", "yes") != "no",
        "py": {"pkgs": split(pkgs), "pip": split(pip)},
        "desc": parts.get("desc", ""), "tasks": parts.get("tasks", ""),
        "rubric": rubric, "cells": cells, "blanks": blanks,
        "file_refs": parse_files(parts.get("files", "")),
    }


def validate(q: dict[str, Any]) -> None:
    """Raise QuizError when a parsed question is internally inconsistent."""
    for i, cell in enumerate(q["cells"]):
        code = fill_cell(cell["tpl"], q["blanks"])
        try:
            ast.parse(code)
        except SyntaxError as exc:
            raise QuizError(f"{q['id']} cell {i + 1}: filled-in code is not valid Python: {exc}") from exc
    points = [r["points"] for r in q["rubric"]]
    if points and None not in points and sum(points) != q["total"]:
        raise QuizError(f"{q['id']}: rubric adds up to {sum(points)}, @total says {q['total']}")


def read_question_file(path: Path) -> dict[str, Any]:
    q = parse_question(path.read_text(encoding="utf-8"))
    validate(q)
    return q


def load_materials(q: dict[str, Any], ext_root: Path, src_root: Path) -> list[dict[str, Any]]:
    """Resolve each @files entry to text content and basic facts (rows, columns)."""
    out = []
    for name, ref in q["file_refs"]:
        kind, _, rel = ref.partition(":")
        base = {"ext": ext_root, "src": src_root}.get(kind)
        if base is None:
            raise QuizError(f"{q['id']}: file {name!r} has unknown reference {ref!r}")
        path = base / rel
        if not path.is_file():
            raise QuizError(f"{q['id']}: file not found: {path}")
        text = path.read_text(encoding="utf-8")
        lines = [ln for ln in text.splitlines() if ln.strip()]
        ext = name.rsplit(".", 1)[-1].upper()
        info: dict[str, Any] = {"name": name, "kind": ext, "bytes": len(text.encode("utf-8")), "text": text}
        if ext == "CSV" and lines:
            info["rows"] = len(lines) - 1
            info["columns"] = [c.strip() for c in lines[0].split(",")]
        out.append(info)
    return out
