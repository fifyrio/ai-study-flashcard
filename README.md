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

## 测试

```bash
python3 -m unittest discover -s tests -v      # 解析器、答案匹配、答案文件校验
node --test flashcards/tests/deck.test.js     # 筛选、排序、绝对化措辞高亮
```

## 目录

```
input/              原始资料（doc/docx/pdf）
scripts/            提取、解析、构建
answers/            我写的答案
flashcards/         网页闪卡（index.html + js/ + data/）
tests/              Python 测试
```
