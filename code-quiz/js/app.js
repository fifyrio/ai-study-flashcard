/* 代码填空练习的主逻辑：状态、渲染题目、判分、运行。 */
(function () {
  "use strict";
  const { judge, store, runner, view } = window.CQ;
  const { el } = view;
  const QUESTIONS = window.QUIZ.questions;
  const GROUPS = window.QUIZ.groups;
  const FILES = window.QUIZ_FILES;
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const $ = (id) => document.getElementById(id);

  const seqOrder = () => QUESTIONS.map((q) => q.id);
  function shuffled(ids) {
    const out = [...ids];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  const savedMode = store.uiGet("mode", "seq");
  const savedId = store.uiGet("current", null);
  let state = {
    mode: savedMode,
    order: savedMode === "random" ? shuffled(seqOrder()) : seqOrder(),
    current: byId[savedId] ? savedId : QUESTIONS[0].id,
    checked: new Set(), // 点过「检查答案」的题
    touched: new Set(), // 离开过输入框的空，形如 "qid:3"
    outputs: {}, // {qid: {cellIndex: result}}
    running: false,
  };
  const set = (patch) => { state = { ...state, ...patch }; };
  const question = () => byId[state.current];

  /* ---------- 判分状态 ---------- */
  function blankStatus(q, i) {
    if (store.isShown(q.id, i)) return "shown";
    const value = store.getInput(q.id, i);
    if (judge.isCorrect(value, q.blanks[i])) return "ok";
    if (!(state.checked.has(q.id) || state.touched.has(`${q.id}:${i}`))) return "idle";
    return value.trim() ? "bad" : "empty";
  }
  const isDone = (q) => q.blanks.every((_, i) => blankStatus(q, i) === "ok");

  /* ---------- 左栏 ---------- */
  function renderRail() {
    $("groups").replaceChildren(...GROUPS.map((g) => el("div", { class: "group" },
      el("h3", {}, g.name),
      el("div", { class: "qgrid" }, ...QUESTIONS.filter((q) => q.level === g.id).map((q) => el("button", {
        type: "button", class: `qbtn${isDone(q) ? " done" : ""}`, title: q.title,
        "aria-current": String(q.id === state.current), onclick: () => go(q.id),
      }, q.no))))));
    for (const [id, mode] of [["mode-seq", "seq"], ["mode-random", "random"]]) {
      $(id).setAttribute("aria-pressed", String(state.mode === mode));
    }
  }

  function renderStats() {
    const totalBlanks = QUESTIONS.reduce((n, q) => n + q.blanks.length, 0);
    let ok = 0;
    let done = 0;
    for (const q of QUESTIONS) {
      const statuses = q.blanks.map((_, i) => blankStatus(q, i));
      ok += statuses.filter((s) => s === "ok").length;
      if (statuses.every((s) => s === "ok")) done += 1;
    }
    $("st-total").textContent = String(QUESTIONS.length);
    $("st-done").textContent = String(done);
    $("st-blanks").textContent = String(totalBlanks);
    $("st-ok").textContent = String(ok);
  }

  /* ---------- 题目区 ---------- */
  function applyBlank(input, q, i) {
    const status = blankStatus(q, i);
    input.className = `blank is-${status}`;
    input.title = status === "shown" ? "已显示答案，不计入填对数" : "";
  }

  function codeNode(q, cell) {
    const pre = el("pre", { class: "code" });
    for (const part of judge.splitTemplate(cell.tpl)) {
      if (part.text !== undefined) {
        for (const tok of judge.highlight(part.text)) pre.append(tok.kind ? el("span", { class: `tok-${tok.kind}` }, tok.text) : tok.text);
        continue;
      }
      const i = part.blank;
      const input = el("input", {
        type: "text", class: "blank", spellcheck: "false", autocomplete: "off", autocapitalize: "off",
        placeholder: "填写代码", "aria-label": `第 ${i + 1} 个空`, "data-i": String(i),
        style: `width:${Math.max(9, q.blanks[i].answer.length + 2)}ch`,
      });
      input.value = store.getInput(q.id, i);
      applyBlank(input, q, i);
      input.addEventListener("input", () => {
        store.setInput(q.id, i, input.value);
        applyBlank(input, q, i);
        renderStats();
        renderRail();
      });
      input.addEventListener("blur", () => {
        if (input.value.trim()) {
          set({ touched: new Set([...state.touched, `${q.id}:${i}`]) });
          applyBlank(input, q, i);
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const all = [...document.querySelectorAll("#cells input.blank")];
        const next = all[all.indexOf(input) + 1];
        if (next) next.focus(); else checkAnswers();
      });
      pre.append(input);
    }
    return pre;
  }

  function renderQuestion() {
    const q = question();
    const lvl = q.level === "L3" ? "三级" : "四级";
    $("kicker").textContent = `PYTHON FILL-IN-THE-BLANK · ${lvl}`;
    $("q-title").textContent = `题目 ${q.no} · ${q.title}`;
    const run = q.runnable ? "可在页面里运行" : "只做填空判分，不能运行";
    $("q-meta").textContent = `共 ${q.cells.length} 个代码块，${q.blanks.length} 个填空 · 满分 ${q.total} 分 · 考试用时 ${q.time} 分钟 · ${run}`;
    $("brief").replaceChildren(view.briefPanel(q));
    $("cells").replaceChildren(...q.cells.map((cell, k) => el("div", { class: "cell" },
      el("div", { class: "cell-head" }, `Cell ${k + 1}`), codeNode(q, cell), el("div", { class: "out", id: `out-${k}` }))));
    $("side").replaceChildren(...view.sidePanels(q, FILES[q.id]));
    for (const id of ["run-mine", "run-ref"]) $(id).hidden = !q.runnable;
    $("run-note").hidden = !q.runnable;
    $("run-status").textContent = q.runnable ? "" : "这题不能在页面里运行（原因见「题目来源与说明」）。";
    renderOutputs();
    $("result").textContent = "";
  }

  /* ---------- 运行输出 ---------- */
  function renderOutputs() {
    const q = question();
    const outs = state.outputs[q.id] || {};
    q.cells.forEach((_, k) => {
      const box = $(`out-${k}`);
      const r = outs[k];
      if (!r) { box.replaceChildren(); return; }
      const kids = [];
      const text = [r.stdout, r.result].filter((s) => s && s.trim()).join("\n");
      if (text) kids.push(el("pre", { class: "out-text" }, text));
      for (const b64 of r.images) kids.push(el("img", { class: "out-img", alt: "图表输出", src: `data:image/png;base64,${b64}` }));
      if (r.error) kids.push(el("pre", { class: "out-error" }, r.error));
      box.replaceChildren(...kids);
    });
  }

  function setRunStatus(text) { $("run-status").textContent = text; }
  function setBusy(busy) {
    set({ running: busy });
    for (const id of ["run-mine", "run-ref"]) $(id).disabled = busy;
  }

  async function runCode(mode) {
    const q = question();
    if (state.running || !q.runnable) return;
    const sources = q.cells.map((c) => judge.fillTemplate(c.tpl, (i) => (mode === "ref" ? q.blanks[i].answer : store.getInput(q.id, i))));
    if (mode === "mine") {
      const empty = q.blanks.filter((_, i) => !store.getInput(q.id, i).trim()).length;
      if (empty) {
        set({ checked: new Set([...state.checked, q.id]) });
        document.querySelectorAll("#cells input.blank").forEach((inp) => applyBlank(inp, q, Number(inp.dataset.i)));
        setRunStatus(`还有 ${empty} 个空没填，先填完再运行。想先看效果，可以点「运行参考答案」。`);
        return;
      }
    }
    set({ outputs: { ...state.outputs, [q.id]: {} } });
    renderOutputs();
    setBusy(true);
    try {
      const ok = await runner.runAll(q, FILES[q.id], sources, {
        onStatus: setRunStatus,
        onCell: (k, result) => {
          set({ outputs: { ...state.outputs, [q.id]: { ...state.outputs[q.id], [k]: result } } });
          if (state.current === q.id) renderOutputs();
        },
      });
      setRunStatus(ok ? "运行完成。" : "运行出错，已停在出错的代码块。");
    } catch (err) {
      setRunStatus(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  /* ---------- 工具栏动作 ---------- */
  function checkAnswers() {
    const q = question();
    set({ checked: new Set([...state.checked, q.id]) });
    document.querySelectorAll("#cells input.blank").forEach((inp) => applyBlank(inp, q, Number(inp.dataset.i)));
    const ok = q.blanks.filter((_, i) => blankStatus(q, i) === "ok").length;
    $("result").textContent = ok === q.blanks.length ? `全部填对（${ok} / ${q.blanks.length}）。` : `填对 ${ok} / ${q.blanks.length}，红框是错的，虚线框是还没填的。`;
    renderStats();
    renderRail();
  }

  function showAnswers() {
    const q = question();
    store.revealAll(q.id, q.blanks);
    renderQuestion();
    renderStats();
    renderRail();
    $("result").textContent = "已填入标准答案；看过答案的空不计入「填对数」。";
  }

  function resetQuestion() {
    const q = question();
    store.resetQuestion(q.id);
    set({
      checked: new Set([...state.checked].filter((id) => id !== q.id)),
      touched: new Set([...state.touched].filter((k) => !k.startsWith(`${q.id}:`))),
      outputs: { ...state.outputs, [q.id]: {} },
    });
    renderQuestion();
    renderStats();
    renderRail();
  }

  /* ---------- 导航 ---------- */
  function go(id) {
    set({ current: id });
    store.uiSet("current", id);
    renderRail();
    renderQuestion();
    window.scrollTo({ top: 0 });
  }
  function step(delta) {
    const i = state.order.indexOf(state.current);
    go(state.order[(i + delta + state.order.length) % state.order.length]);
  }
  function setMode(mode) {
    set({ mode, order: mode === "random" ? shuffled(seqOrder()) : seqOrder() });
    store.uiSet("mode", mode);
    renderRail();
  }

  $("check").addEventListener("click", checkAnswers);
  $("show").addEventListener("click", showAnswers);
  $("reset").addEventListener("click", resetQuestion);
  $("run-mine").addEventListener("click", () => runCode("mine"));
  $("run-ref").addEventListener("click", () => runCode("ref"));
  $("prev").addEventListener("click", () => step(-1));
  $("next").addEventListener("click", () => step(1));
  $("mode-seq").addEventListener("click", () => setMode("seq"));
  $("mode-random").addEventListener("click", () => setMode("random"));
  $("clear-all").addEventListener("click", () => {
    if (!window.confirm("清除这台设备上全部题目的填写进度？")) return;
    store.clearAll();
    set({ checked: new Set(), touched: new Set(), outputs: {} });
    renderRail(); renderQuestion(); renderStats();
  });

  // 窄屏上先看题目：刷题顺序、统计、导航默认折叠
  if (window.matchMedia("(max-width: 820px)").matches) $("rail-more").open = false;

  renderRail();
  renderQuestion();
  renderStats();
})();
