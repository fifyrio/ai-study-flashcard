#!/bin/zsh
# Convert the source .doc/.docx/.pdf exam materials into plain text under build/text/.
# Requires macOS `textutil` and poppler `pdftotext`.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/build/text"
mkdir -p "$OUT"

AI_DIR="$ROOT/input/人工智能4级"
MEDIA_DIR="$ROOT/input/全媒体运营师评价指导手册（流量运营四级）"

# 人工智能训练师: theory bank (part 3), theory mock (part 5)
textutil -convert txt -encoding UTF-8 "$AI_DIR/第3部分-人工智能训练师_4级_理论知识复习题.docx" -output "$OUT/ai_theory_bank.txt"
textutil -convert txt -encoding UTF-8 "$AI_DIR/第5部分_人工智能训练师_4级_理论知识模拟试卷.docx" -output "$OUT/ai_theory_mock.txt"

# 全媒体运营师: theory bank (4), theory mock with answers (6). Raw mode keeps reading order.
pdftotext "$MEDIA_DIR/4-全媒体运营师（流量运营）_四级_理论知识复习题.pdf" "$OUT/media_theory_bank.txt"
pdftotext "$MEDIA_DIR/6-全媒体运营师（流量运营）_四级_理论知识模拟试卷及答案.pdf" "$OUT/media_theory_mock.txt"
echo "extracted to $OUT"
