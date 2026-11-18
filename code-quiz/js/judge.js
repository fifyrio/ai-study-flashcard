/* 填空判分：纯函数，不碰 DOM，浏览器和 node 都能用。 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CQ = Object.assign(root.CQ || {}, { judge: api });
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  /** 去掉所有空白、统一引号、去掉末尾的分号或逗号，让 `x , y` 和 `x,y`、双引号和单引号视为相同。 */
  function normalize(text) {
    return String(text).replace(/\s+/g, "").replace(/"/g, "'").replace(/[;,]+$/, "");
  }

  /** blank = {answer, alts}；输入为空一律算错。 */
  function isCorrect(input, blank) {
    const n = normalize(input);
    if (!n) return false;
    return [blank.answer, ...(blank.alts || [])].some((a) => normalize(a) === n);
  }

  /** 把模板 "text ⟦0⟧ text ⟦1⟧" 切成 [{text}, {blank: 0}, {text}, ...]。 */
  function splitTemplate(tpl) {
    const out = [];
    let last = 0;
    for (const m of tpl.matchAll(/⟦(\d+)⟧/g)) {
      if (m.index > last) out.push({ text: tpl.slice(last, m.index) });
      out.push({ blank: Number(m[1]) });
      last = m.index + m[0].length;
    }
    if (last < tpl.length) out.push({ text: tpl.slice(last) });
    return out;
  }

  /** 用 fill(i) 返回的内容替换模板里的每个空，得到可执行的 Python 源码。 */
  function fillTemplate(tpl, fill) {
    return tpl.replace(/⟦(\d+)⟧/g, (_, i) => fill(Number(i)));
  }

  /** 简单的 Python 高亮：返回 [{text, kind}]，kind 为 comment/string/keyword/number 或 null。 */
  const TOKEN_RE = /(#[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|\b(import|from|as|for|in|if|else|elif|with|def|return|True|False|None|and|or|not|lambda)\b|(\b\d+(?:\.\d+)?\b)/g;
  function highlight(text) {
    const out = [];
    let last = 0;
    for (const m of text.matchAll(TOKEN_RE)) {
      if (m.index > last) out.push({ text: text.slice(last, m.index), kind: null });
      const kind = m[1] ? "comment" : m[2] ? "string" : m[3] ? "keyword" : "number";
      out.push({ text: m[0], kind });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last), kind: null });
    return out;
  }

  return { normalize, isCorrect, splitTemplate, fillTemplate, highlight };
});
