"""Tests for the code blocks in docs/l4-operation-guide.md.

Every ```python block must be valid Python. Blocks tagged ``run=`` are executed when pandas and
scikit-learn are installed (otherwise those tests are skipped):

    ```python run=chain:s3   blocks with the same chain name run in order in one shared namespace
    ```python run=sales      a standalone block; the name picks which sample files exist

Run:  python3 -m unittest tests.test_guide -v
"""
from __future__ import annotations

import ast
import importlib.util
import os
import re
import shutil
import tempfile
import unittest
import warnings
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GUIDE = ROOT / "docs" / "l4-operation-guide.md"
SAMPLES = ROOT / "quiz-src" / "files"

FENCE = re.compile(r"^```python(?:[ \t]+run=(\S+))?[ \t]*\n(.*?)^```[ \t]*$", re.S | re.M)


def blocks() -> list[tuple[str | None, str]]:
    text = GUIDE.read_text(encoding="utf-8")
    return [(m.group(1), m.group(2)) for m in FENCE.finditer(text)]


def have(module: str) -> bool:
    return importlib.util.find_spec(module) is not None


DATA_LIBS = all(have(m) for m in ("pandas", "numpy", "sklearn", "matplotlib"))


def prepare_workdir(root: Path) -> None:
    """Copy the sample data every run block may need and create a few tiny images."""
    shutil.copy(SAMPLES / "l4-3.1.1" / "A超市的销售数据.csv", root)
    shutil.copy(SAMPLES / "l4-3.2.5" / "Salary_Data.csv", root)
    shutil.copytree(SAMPLES / "l4-2.1.3" / "dataset", root / "dataset")
    if have("PIL"):
        from PIL import Image

        (root / "2.1.1pic").mkdir()
        for name, color in (("a.png", "red"), ("b.png", "green"), ("c.png", "blue")):
            Image.new("RGB", (8, 8), color).save(root / "2.1.1pic" / name)


class GuideSyntaxTest(unittest.TestCase):
    def test_guide_has_code_blocks(self):
        self.assertGreater(len(blocks()), 20)

    def test_every_python_block_is_valid_python(self):
        for i, (_, code) in enumerate(blocks(), 1):
            try:
                ast.parse(code)
            except SyntaxError as exc:
                self.fail(f"block {i} is not valid Python: {exc}\n{code[:200]}")

    def test_run_tags_are_known(self):
        known = {"sales", "salary", "pics", "xml", "cls", "smote"}
        for tag, _ in blocks():
            if tag is None:
                continue
            name = tag.split(":", 1)[1] if tag.startswith("chain:") else tag
            self.assertTrue(tag.startswith("chain:") or name in known, f"unknown run tag {tag!r}")


@unittest.skipUnless(DATA_LIBS, "pandas / scikit-learn / matplotlib not installed")
class GuideRunTest(unittest.TestCase):
    def setUp(self):
        self._cwd = os.getcwd()
        self._tmp = tempfile.TemporaryDirectory()
        os.chdir(self._tmp.name)
        prepare_workdir(Path(self._tmp.name))
        os.environ["MPLBACKEND"] = "Agg"

    def tearDown(self):
        os.chdir(self._cwd)
        self._tmp.cleanup()

    def _exec(self, code: str, namespace: dict, label: str):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            try:
                exec(compile(code, label, "exec"), namespace)  # noqa: S102 - our own documentation code
            except Exception as exc:  # report which block failed
                self.fail(f"{label} raised {type(exc).__name__}: {exc}\n{code[:300]}")

    def test_standalone_blocks_run(self):
        for i, (tag, code) in enumerate(blocks(), 1):
            if tag is None or tag.startswith("chain:"):
                continue
            if tag == "smote" and not have("imblearn"):
                continue
            self._exec(code, {"__name__": "__main__"}, f"block {i} (run={tag})")

    def test_chained_blocks_run_in_order(self):
        chains: dict[str, dict] = {}
        for i, (tag, code) in enumerate(blocks(), 1):
            if tag is None or not tag.startswith("chain:"):
                continue
            ns = chains.setdefault(tag, {"__name__": "__main__"})
            self._exec(code, ns, f"block {i} ({tag})")
        self.assertIn("chain:s3", chains)
        self.assertIn("RiskLevel", chains["chain:s3"]["data"].columns)  # the early blocks really ran


if __name__ == "__main__":
    unittest.main()
