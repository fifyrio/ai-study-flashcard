/* 闪卡界面。状态集中在 state，每次变化后重新渲染受影响的区域；所有题目文本都用 textContent 写入。 */
(function () {
  "use strict";
  const { store, deck } = window.FC;
  const UI_KEY = "flashcards-ui-v1";

  const EXAMS = { ai: "人工智能训练师", media: "全媒体运营师" };
  const TYPES = [["all", "全部"], ["tf", "判断"], ["mc", "单选"]];
  const SOURCES = [["all", "全部"], ["official", "官方答案"], ["ai", "我的推断"], ["low", "把握低"]];
  const SCOPES = [["todo", "未掌握"], ["wrong", "错题"], ["all", "全部"]];
  const SOURCE_LABEL = { official: "官方答案", ai: "我的推断" };
  const TYPE_LABEL = { tf: "判断题", mc: "单选题" };

  const $ = (id) => document.getElementById(id);

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

  function loadUi() {
    try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch (_) { return {}; }
  }
  function saveUi() {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ exam: state.exam, hl: state.hl, shuffle: state.shuffle }));
    } catch (_) { /* ignore */ }
  }

  const saved = loadUi();
  const state = {
    exam: EXAMS[saved.exam] && window.DECKS[saved.exam] ? saved.exam : "ai",
    hl: saved.hl !== false,
    shuffle: !!saved.shuffle,
    filters: { chapter: "all", type: "all", source: "all", scope: "todo" },
    queue: [],
    idx: 0,
    answered: null, // 选择的答案；"skip" 表示直接看答案
  };

  const currentDeck = () => window.DECKS[state.exam];
  const progress = (id) => store.get(id);
  const current = () => state.queue[state.idx] || null;

  /* ---------- 队列 ---------- */
  function rebuildQueue() {
    const d = currentDeck();
    const picked = deck.filterCards(d.cards, state.filters, progress, store.MASTERED_STREAK);
    state.queue = deck.orderCards(picked, d.chapters, state.shuffle, Math.random);
    state.idx = 0;
    state.answered = null;
  }

  /* ---------- 侧栏 ---------- */
  function segment(container, items, key) {
    container.replaceChildren(
      ...items.map(([value, label]) =>
        el("button", {
          type: "button", "aria-pressed": String(state.filters[key] === value),
          onclick: () => { state.filters = { ...state.filters, [key]: value }; rebuildQueue(); renderAll(); },
        }, label)));
  }

  function renderChapters() {
    const d = currentDeck();
    const base = { ...state.filters, chapter: "all", scope: "all" };
    const pool = deck.filterCards(d.cards, base, progress, store.MASTERED_STREAK);
    const rows = [["all", "全部章节", null, pool]];
    const keys = Object.keys(d.chapters).sort((a, b) => d.chapters[b].weight - d.chapters[a].weight);
    for (const k of keys) rows.push([k, d.chapters[k].name, d.chapters[k].weight, pool.filter((c) => c.ch === k)]);

    $("chapters").replaceChildren(...rows.map(([key, name, weight, cards]) => {
      const done = deck.countMastered(cards, progress, store.MASTERED_STREAK);
      const ratio = cards.length ? done / cards.length : 0;
      const bar = el("span", { style: `transform:scaleX(${ratio})` });
      return el("li", {}, el("button", {
        type: "button", "aria-pressed": String(state.filters.chapter === key),
        onclick: () => { state.filters = { ...state.filters, chapter: key }; rebuildQueue(); renderAll(); },
      },
      el("span", { class: "ch-name" }, name),
      el("span", { class: "ch-pts" }, weight == null ? "" : `${weight}分`),
      el("span", { class: "ch-bar" }, bar),
      el("span", { class: "ch-count" }, `掌握 ${done} / ${cards.length} 题`)));
    }));
  }

  function renderSidebar() {
    segment($("types"), TYPES, "type");
    segment($("sources"), SOURCES, "source");
    segment($("scopes"), SCOPES, "scope");
    renderChapters();
  }

  /* ---------- 卡片 ---------- */
  function stemNode(card) {
    const p = el("p", { class: "stem" });
    if (state.hl && card.type === "tf") {
      for (const part of deck.splitAbsolute(card.q)) p.append(part.hit ? el("mark", {}, part.text) : part.text);
    } else {
      p.append(card.q);
    }
    return p;
  }

  function optionButton(key, text, card) {
    const done = state.answered !== null;
    const cls = ["opt"];
    if (done) {
      if (key === card.a) cls.push("is-correct");
      else if (key === state.answered) cls.push("is-wrong");
      else cls.push("is-dim");
    }
    const inner = card.type === "tf"
      ? [el("span", { class: "t" }, text)]
      : [el("span", { class: "k" }, key), el("span", { class: "t" }, text)];
    return el("button", { type: "button", class: cls.join(" "), disabled: done, "data-key": key, onclick: () => answer(key) }, inner);
  }

  function verdictNode(card) {
    const ansText = card.type === "tf"
      ? (card.a === "T" ? "√ 正确" : "× 错误")
      : `${card.a}．${card.opts[card.a]}`;
    const badges = el("div", { class: "badges" }, el("span", { class: `badge ${card.src}` }, SOURCE_LABEL[card.src]));
    if (deck.isLowConfidence(card)) badges.append(el("span", { class: "badge low" }, "把握低：请自己再判断一遍"));
    const box = el("div", { class: "verdict" }, el("p", { class: "ans" }, "正确答案：", el("b", {}, ansText)), badges);
    const note = deck.cleanNote(card);
    if (note) box.append(el("p", { class: "note" }, note));
    return box;
  }

  function renderCard() {
    const card = current();
    const host = $("card");
    if (!card) {
      host.replaceChildren(el("div", { class: "empty" },
        el("strong", {}, "这个范围里没有要复习的题了"),
        el("p", {}, "换个章节或把「复习范围」切到「全部」。全媒体题库的答案还在陆续补充。")));
      return;
    }
    const meta = el("p", { class: "card-meta" },
      el("span", { class: "tag" }, TYPE_LABEL[card.type]),
      el("span", {}, currentDeck().chapters[card.ch].name),
      el("span", { class: "no" }, `题库第 ${card.n} 题`));
    const choices = card.type === "tf"
      ? el("div", { class: "tf-row" }, optionButton("T", "√ 正确", card), optionButton("F", "× 错误", card))
      : el("ol", { class: "options", style: "list-style:none" },
        ...["A", "B", "C", "D"].map((k) => el("li", {}, optionButton(k, card.opts[k], card))));

    const kids = [meta, stemNode(card), choices];
    if (state.answered !== null) {
      kids.push(verdictNode(card));
      const ok = state.answered === card.a;
      kids.push(el("div", { class: `stamp ${ok ? "ok" : "no"}`, "aria-hidden": "true" }, ok ? "正确" : "答错"));
    }
    host.replaceChildren(...kids);
    host.focus({ preventScroll: true });
  }

  function renderStatus() {
    const d = currentDeck();
    const scopeAll = { ...state.filters, scope: "all" };
    const all = deck.filterCards(d.cards, scopeAll, progress, store.MASTERED_STREAK);
    const done = deck.countMastered(all, progress, store.MASTERED_STREAK);
    const pos = state.queue.length ? `第 ${state.idx + 1} / ${state.queue.length} 题` : "没有题目";
    $("status").textContent = `${pos} · 当前筛选已掌握 ${done} / ${all.length}`;
    const ratio = all.length ? done / all.length : 0;
    $("meter-fill").style.transform = `scaleX(${ratio})`;
    const meter = $("meter");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", String(all.length));
    meter.setAttribute("aria-valuenow", String(done));
    $("prev").disabled = state.idx === 0;
    $("reveal").disabled = !current() || state.answered !== null;
    $("next").disabled = !current();
  }

  function renderTabs() {
    for (const tab of document.querySelectorAll(".exam-switch [data-exam]")) {
      tab.setAttribute("aria-selected", String(tab.dataset.exam === state.exam));
    }
  }

  function renderAll() { renderTabs(); renderSidebar(); renderCard(); renderStatus(); }

  /* ---------- 动作 ---------- */
  function answer(choice) {
    const card = current();
    if (!card || state.answered !== null) return;
    store.record(card.id, choice === card.a);
    state.answered = choice;
    renderCard(); renderStatus(); renderChapters();
  }

  function reveal() {
    const card = current();
    if (!card || state.answered !== null) return;
    store.record(card.id, false);
    state.answered = "skip";
    renderCard(); renderStatus(); renderChapters();
  }

  function next() {
    if (!state.queue.length) return;
    if (state.idx + 1 >= state.queue.length) rebuildQueue();
    else { state.idx += 1; state.answered = null; }
    renderCard(); renderStatus();
  }

  function prev() {
    if (state.idx === 0) return;
    state.idx -= 1; state.answered = null;
    renderCard(); renderStatus();
  }

  /* ---------- 事件 ---------- */
  for (const tab of document.querySelectorAll(".exam-switch [data-exam]")) {
    tab.addEventListener("click", () => {
      if (!window.DECKS[tab.dataset.exam]) return;
      state.exam = tab.dataset.exam;
      state.filters = { ...state.filters, chapter: "all" };
      saveUi(); rebuildQueue(); renderAll();
    });
  }
  $("next").addEventListener("click", next);
  $("prev").addEventListener("click", prev);
  $("reveal").addEventListener("click", reveal);
  $("opt-hl").checked = state.hl;
  $("opt-shuffle").checked = state.shuffle;
  $("opt-hl").addEventListener("change", (e) => { state.hl = e.target.checked; saveUi(); renderCard(); });
  $("opt-shuffle").addEventListener("change", (e) => { state.shuffle = e.target.checked; saveUi(); rebuildQueue(); renderAll(); });
  $("reset").addEventListener("click", () => {
    if (!window.confirm("清除这台设备上的全部做题进度？")) return;
    store.clear(); rebuildQueue(); renderAll();
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    const onControl = t instanceof HTMLElement && (t.tagName === "BUTTON" || t.tagName === "INPUT" || t.tagName === "SUMMARY");
    const card = current();
    const k = e.key.toLowerCase();

    if (k === "arrowleft") { prev(); return; }
    if (k === "arrowright") { next(); return; }
    if ((k === " " || k === "enter") && !onControl) {
      e.preventDefault();
      if (state.answered !== null) next();
      return;
    }
    if (!card || state.answered !== null) return;
    if (card.type === "tf") {
      if (k === "t" || k === "1") answer("T");
      else if (k === "f" || k === "2") answer("F");
    } else {
      const letter = "abcd".includes(k) && k.length === 1 ? k.toUpperCase() : ("1234".includes(k) && k.length === 1 ? "ABCD"[Number(k) - 1] : null);
      if (letter) answer(letter);
    }
  });

  // 窄屏上先看题目，筛选面板默认折叠
  if (window.matchMedia("(max-width: 820px)").matches) document.querySelector(".filters").open = false;

  rebuildQueue();
  renderAll();
})();
