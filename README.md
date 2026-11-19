# ai-study-flashcard

人工智能训练师（四级）、全媒体运营师·流量运营（四级）两门考试的理论题库闪卡。

## 打开闪卡

双击 `flashcards/index.html` 即可（离线可用）。如果浏览器在 `file://` 下不保存进度，改用本地服务：

```bash
python3 -m http.server 8765 --directory flashcards
```

然后访问 http://localhost:8765 。进度只存在这台设备的浏览器里。

## 答案的三种来源

| 标记 | 含义 |
|---|---|
| 官方答案 | 模拟卷附的标准答案，按题干和选项文字匹配回题库 |
| 我的推断 | 题库本身没有答案，由 Claude 根据题意判断，**未经官方核对** |
| 把握低 | 推断答案里自己也拿不准的题（备注以 `?` 开头），请自己再判断 |

覆盖情况（重新构建后以终端输出为准）：

| | 题库 | 官方 | 推断 | 无答案 |
|---|---|---|---|---|
| 人工智能训练师 | 750 | 200 | 550 | 0 |
| 全媒体运营师 | 1326 | 197 | 1129 | 0 |

## 重新构建

```bash
./scripts/extract.sh                 # input/ 下的 doc/docx/pdf -> build/text/
python3 scripts/build_decks.py       # 题库 + 官方答案 + answers/*.txt -> flashcards/data/*.js
python3 scripts/build_decks.py --todo media --chapter basic --type mc   # 列出还没有答案的题
```

我的答案写在 `answers/` 下，一行一题：`<题号> <答案> [| 备注]`，判断题用 `T`/`F`，选择题用 `A`–`D`，备注以 `?` 开头表示把握低。官方答案优先于我的答案。

## 代码填空练习（操作技能）

双击 `code-quiz/index.html`。在代码里直接填空、实时判分，右侧对照评分表、素材文件和数据列，
还能在浏览器里用 Python（Pyodide）运行你的代码或参考答案。

- **三级 5 题**：来自 GitHub 仓库 `Morriaty-The-Murderer/2025-AI-Trainer-practices`（3 级模拟卷，共 6 题，
  其中 4.2.1 是纯文字方案题，没有代码，没做成填空）。仓库下载在 `external/`（已加入 `.gitignore`）。
- **四级 4 题**：按四级实操题的题干改写（2.1.1、2.1.3、3.1.1、3.2.5）。评分点取自四级题库的评分表，
  参考代码由我编写、**未经官方核对**，数据是我生成的示例数据。
- 运行功能需要联网（首次从 CDN 下载 Python 环境和 pandas、scikit-learn 等）。3.2.1（需要 onnxruntime 和模型文件）
  和四级 2.1.1（需要图片文件）只做填空判分，不能运行。
- 题目写在 `quiz-src/*.txt`，用 `⟦答案||备选答案⟧` 标出填空。改完后运行：

```bash
python3 scripts/make_sample_data.py   # 只在需要重新生成四级示例数据时运行
python3 scripts/build_quiz.py         # quiz-src/ -> code-quiz/data/*.js
```

## 学习文档

[docs/l4-operation-guide.md](docs/l4-operation-guide.md)：四级实操的循序渐进模板，从读懂代码里的符号，到 pandas、建模、
文件处理，再到写作模板。整理自三级考前视频、一页纸速查表和四级题库。里面带 `run=` 的代码块都在干净环境里运行过。

## 测试

```bash
python3 -m unittest discover -s tests -v          # 解析器、答案匹配、答案文件、题目源文件校验
node --test flashcards/tests/deck.test.js         # 闪卡：筛选、排序、绝对化措辞高亮
node --test code-quiz/tests/judge.test.js         # 填空判分、模板切分、代码高亮
```

## 目录

```
input/              原始资料（doc/docx/pdf）
external/           下载的 GitHub 题库（不入库）
scripts/            提取、解析、构建
answers/            我写的理论题答案
docs/               学习文档（循序渐进模板）
quiz-src/           代码填空题的源文件和示例数据
flashcards/         理论题闪卡（index.html + js/ + data/）
code-quiz/          代码填空练习（index.html + js/ + data/）
tests/              Python 测试
```
