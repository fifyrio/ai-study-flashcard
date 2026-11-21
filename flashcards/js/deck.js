/* 题目的筛选、排序和高亮。全部是纯函数，不碰 DOM，方便单独测试。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FC = Object.assign(root.FC || {}, { deck: api });
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  // 来自模拟卷的统计：判断题含这些措辞时，错误概率明显偏高（长词在前，避免被单字截断）
  const ABSOLUTE_WORDS = [
    "不需要", "可以忽略", "而无需", "不包括", "不考虑", "不涉及", "仅依赖", "不受", "不应", "不必",
    "只能", "只要", "仅限", "完全", "必须", "无需", "无须", "唯一", "所有", "随意", "任何", "总是",
    "绝对", "一定", "没有", "不会", "忽略", "无法", "取代", "替代", "自由", "无关", "独立", "全部",
    "毫无", "只", "仅",
  ];
  const ABSOLUTE_RE = new RegExp(ABSOLUTE_WORDS.join("|"), "g");

  /** 把题干切成 [{text, hit}]，hit 表示这一段是绝对化措辞。 */
  function splitAbsolute(text) {
    const parts = [];
    let last = 0;
    for (const m of text.matchAll(ABSOLUTE_RE)) {
      if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
      parts.push({ text: m[0], hit: true });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ text: text.slice(last), hit: false });
    return parts;
  }

  // 打开页面（或切换考试）时的默认答案来源：人工智能训练师只出有官方答案的题，其余考试不限
  const DEFAULT_SOURCE = Object.freeze({ ai: "official" });

  /** 某场考试的默认筛选。每次返回新对象，调用方改动它不会影响下一次。 */
  function defaultFilters(exam) {
    return { chapter: "all", type: "all", source: DEFAULT_SOURCE[exam] || "all", scope: "todo" };
  }

  const isLowConfidence = (c) => c.src === "ai" && typeof c.note === "string" && c.note.startsWith("?");
  const cleanNote = (c) => (c.note ? c.note.replace(/^\?\s*/, "") : "");

  /**
   * f = {chapter, type, source, scope}；progress(id) -> {wrong, streak}。
   * scope: todo=未掌握, wrong=错过且未掌握, all=全部。
   */
  function filterCards(cards, f, progress, masteredStreak) {
    return cards.filter((c) => {
      if (f.chapter !== "all" && c.ch !== f.chapter) return false;
      if (f.type !== "all" && c.type !== f.type) return false;
      if (f.source === "official" && c.src !== "official") return false;
      if (f.source === "ai" && c.src !== "ai") return false;
      if (f.source === "low" && !isLowConfidence(c)) return false;
      const p = progress(c.id);
      const mastered = p.streak >= masteredStreak;
      if (f.scope === "todo") return !mastered;
      if (f.scope === "wrong") return p.wrong > 0 && !mastered;
      return true;
    });
  }

  /** 分值高的章节排前面；shuffle 时只在章节内部打乱（rng 可注入，便于测试）。 */
  function orderCards(cards, chapters, shuffle, rng) {
    const weight = (c) => (chapters[c.ch] ? chapters[c.ch].weight : 0);
    const sorted = [...cards].sort((a, b) => weight(b) - weight(a) || a.ch.localeCompare(b.ch) || a.n - b.n);
    if (!shuffle) return sorted;
    const out = [];
    for (let i = 0; i < sorted.length; ) {
      let j = i;
      while (j < sorted.length && sorted[j].ch === sorted[i].ch) j++;
      const group = sorted.slice(i, j);
      for (let k = group.length - 1; k > 0; k--) {
        const r = Math.floor(rng() * (k + 1));
        [group[k], group[r]] = [group[r], group[k]];
      }
      out.push(...group);
      i = j;
    }
    return out;
  }

  function countMastered(cards, progress, masteredStreak) {
    return cards.reduce((n, c) => n + (progress(c.id).streak >= masteredStreak ? 1 : 0), 0);
  }

  return { splitAbsolute, isLowConfidence, cleanNote, filterCards, orderCards, countMastered, defaultFilters, ABSOLUTE_WORDS };
});
