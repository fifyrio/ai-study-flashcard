/* 界面里不涉及状态的部分：DOM 构建和右栏面板。所有题目文本都用 textContent 写入，不拼 HTML。 */
(function (global) {
  "use strict";

  function el(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, "");
      else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const kid of kids.flat()) node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    return node;
  }

  const SRC_LABEL = { official: "官方", derived: "推算" };

  function panel(title, ...body) {
    return el("section", { class: "panel" }, el("h2", {}, title), ...body);
  }

  function rubricPanel(q) {
    const rows = q.rubric.map((r) => el("li", { class: "rub-row" },
      el("span", { class: "rub-code" }, r.code),
      el("span", { class: "rub-pts" }, r.points == null ? "—" : `${r.points}分`),
      el("span", { class: "rub-text" }, r.text, " ", el("em", { class: `rub-src ${r.src}` }, SRC_LABEL[r.src] || r.src))));
    return panel("评分表", el("ul", { class: "rubric" }, ...rows),
      el("p", { class: "rub-total" }, `合计配分 ${q.total}`),
      el("p", { class: "fine" }, "「官方」来自题卷或评分表原文；「推算」是我用总分减去已知分值得出的，不是原文。"));
  }

  function openText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function downloadText(name, text) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = el("a", { href: url, download: name.split("/").pop() });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function filesPanel(q, texts) {
    if (!q.files.length) return panel("素材文件", el("p", { class: "fine" }, "这题不需要数据文件。"));
    const rows = q.files.map((f) => {
      const meta = [`${(f.bytes / 1024).toFixed(1)} KB`, f.rows != null ? `${f.rows} 行` : null].filter(Boolean).join(" · ");
      return el("li", { class: "file-row" },
        el("div", { class: "file-name" }, f.name),
        el("div", { class: "file-meta" }, el("span", { class: "tag" }, f.kind), meta),
        el("div", { class: "file-actions" },
          el("button", { type: "button", class: "link", onclick: () => openText(f.name, texts[f.name]) }, "打开"),
          el("button", { type: "button", class: "link", onclick: () => downloadText(f.name, texts[f.name]) }, "下载")));
    });
    const note = q.level === "L3"
      ? "这是仓库提供的小规模模拟数据，真实考试的数据集更大。"
      : "示例数据由我按题干生成，只用来练代码，不是考试原数据。";
    return panel("素材文件", el("ul", { class: "files" }, ...rows), el("p", { class: "fine" }, note));
  }

  function columnsPanel(q) {
    const csvs = q.files.filter((f) => f.columns);
    if (!csvs.length) return null;
    return panel("数据列信息 (data.columns)", ...csvs.map((f) => el("div", { class: "cols" },
      el("div", { class: "cols-head" }, f.name, el("span", {}, `${f.columns.length} 列`)),
      el("pre", { class: "cols-body" }, `[${f.columns.map((c) => `'${c}'`).join(", ")}]`))));
  }

  function sidePanels(q, texts) {
    return [rubricPanel(q), filesPanel(q, texts), columnsPanel(q)].filter(Boolean);
  }

  function briefPanel(q) {
    const kids = [el("h2", {}, "任务说明"), el("p", { class: "brief-text" }, q.desc)];
    if (q.tasks) kids.push(el("h3", {}, "任务要求"), el("p", { class: "brief-text" }, q.tasks));
    kids.push(el("details", { class: "source" }, el("summary", {}, "题目来源与说明"), el("p", {}, q.source)));
    return el("section", { class: "brief" }, ...kids);
  }

  global.CQ = Object.assign(global.CQ || {}, { view: { el, sidePanels, briefPanel } });
})(window);
