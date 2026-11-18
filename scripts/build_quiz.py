"""Build code-quiz/data/*.js from quiz-src/*.txt (+ the downloaded practice repo for L3 datasets).

    python3 scripts/build_quiz.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import quiz_parse as qp  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "quiz-src"
EXT = ROOT / "external" / "2025-AI-Trainer-practices" / "practices"
OUT = ROOT / "code-quiz" / "data"

GROUP_ORDER = ["L3", "L4"]


def build() -> tuple[dict, dict]:
    questions, files = [], {}
    for path in sorted(SRC.glob("*.txt")):
        q = qp.read_question_file(path)
        materials = qp.load_materials(q, EXT, SRC / "files")
        files[q["id"]] = {m["name"]: m["text"] for m in materials}
        public = {k: v for k, v in q.items() if k != "file_refs"}
        public["files"] = [{k: v for k, v in m.items() if k != "text"} for m in materials]
        questions.append(public)
    questions.sort(key=lambda q: (GROUP_ORDER.index(q["level"]), q["no"]))
    ids = [q["id"] for q in questions]
    if len(ids) != len(set(ids)):
        raise qp.QuizError("duplicate question ids")
    groups = [{"id": g, "name": qp.LEVELS[g]} for g in GROUP_ORDER if any(q["level"] == g for q in questions)]
    return {"groups": groups, "questions": questions}, files


def write_js(path: Path, var: str, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(f"window.{var} = {body};\n", encoding="utf-8")


def main() -> None:
    quiz, files = build()
    write_js(OUT / "questions.js", "QUIZ", quiz)
    write_js(OUT / "files.js", "QUIZ_FILES", files)
    print(f"{'id':<12}{'blanks':>7}{'cells':>7}  runnable  title")
    for q in quiz["questions"]:
        print(f"{q['id']:<12}{len(q['blanks']):>7}{len(q['cells']):>7}  {'yes' if q['runnable'] else 'no ':<8}  {q['title']}")
    print(f"total blanks: {sum(len(q['blanks']) for q in quiz['questions'])}")


if __name__ == "__main__":
    main()
