"""Write the small, deterministic sample data used by the level-4 practice questions.

The real exam files (A超市的销售数据.csv, salary data, labelled XML) are not in the project, so
these are *made up* with the column names the exam task statements mention. Run once:
    python3 scripts/make_sample_data.py
"""
from __future__ import annotations

import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "quiz-src" / "files"


def supermarket() -> str:
    rng = random.Random(42)
    catalog = {
        "食品饮料": ["饮用水", "碳酸饮料", "方便面", "饼干", "牛奶", "啤酒", "零食礼包", "巧克力", "咖啡", "坚果", "果汁", "酸奶"],
        "日用百货": ["洗衣液", "纸巾", "牙膏", "洗发水", "毛巾", "垃圾袋"],
        "厨房用品": ["不锈钢碗", "保鲜盒", "菜刀", "砧板", "炒锅"],
        "生鲜果蔬": ["苹果", "香蕉", "西红柿", "黄瓜"],
    }
    weight = {"食品饮料": 3.0, "日用百货": 1.6, "厨房用品": 1.0, "生鲜果蔬": 2.2}
    lines = ["订单号,大类名称,小类名称,销售金额"]
    for i in range(1, 121):
        cat = rng.choices(list(catalog), weights=[weight[c] for c in catalog])[0]
        sub = rng.choice(catalog[cat])
        lines.append(f"A{i:04d},{cat},{sub},{round(rng.uniform(8, 260), 2)}")
    return "\n".join(lines) + "\n"


def salary() -> str:
    rng = random.Random(7)
    lines = ["YearsExperience,Salary"]
    for i in range(24):
        years = round(1.0 + i * 0.42, 1)
        lines.append(f"{years},{int(26000 + 9300 * years + rng.uniform(-4500, 4500))}")
    return "\n".join(lines) + "\n"


def xml(filename: str, objects: list[str]) -> str:
    body = "".join(
        f"  <object><name>{n}</name><bndbox><xmin>{10 + k}</xmin><ymin>{20 + k}</ymin>"
        f"<xmax>{110 + k}</xmax><ymax>{120 + k}</ymax></bndbox></object>\n"
        for k, n in enumerate(objects)
    )
    return f"<annotation>\n  <filename>{filename}</filename>\n{body}</annotation>\n"


def write(rel: str, text: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("wrote", path.relative_to(ROOT.parent.parent))


if __name__ == "__main__":
    write("l4-3.1.1/A超市的销售数据.csv", supermarket())
    write("l4-3.2.5/Salary_Data.csv", salary())
    write("l4-2.1.3/dataset/img_001.xml", xml("img_001.jpg", ["car"]))
    write("l4-2.1.3/dataset/img_002.xml", xml("img_002.jpg", ["bus", "car"]))
    write("l4-2.1.3/dataset/img_003.xml", xml("img_003.jpg", ["truck"]))
