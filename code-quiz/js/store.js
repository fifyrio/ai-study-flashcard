/* 本机存储：每道题已填的内容、看过答案的空，以及界面设置。localStorage 不可用时退化为内存。 */
(function (global) {
  "use strict";
  const PROGRESS_KEY = "code-quiz-progress-v1";
  const UI_KEY = "code-quiz-ui-v1";

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* 隐私模式：只保留内存 */ }
  }

  let progress = read(PROGRESS_KEY); // {qid: {inputs: {"0": "..."}, shown: {"3": true}}}
  let ui = read(UI_KEY);

  const empty = Object.freeze({ inputs: {}, shown: {} });
  const entry = (qid) => progress[qid] || empty;

  function update(qid, patch) {
    progress = { ...progress, [qid]: { ...entry(qid), ...patch } };
    write(PROGRESS_KEY, progress);
  }

  const getInput = (qid, i) => entry(qid).inputs[i] || "";
  const isShown = (qid, i) => !!entry(qid).shown[i];

  function setInput(qid, i, value) {
    const e = entry(qid);
    // 重新输入就不再算「看过答案」
    const { [i]: _drop, ...shown } = e.shown;
    update(qid, { inputs: { ...e.inputs, [i]: value }, shown });
  }

  /** 填入标准答案并标记为「看过答案」，这些空不计入填对数。 */
  function revealAll(qid, blanks) {
    const inputs = {};
    const shown = {};
    blanks.forEach((b, i) => { inputs[i] = b.answer; shown[i] = true; });
    update(qid, { inputs, shown });
  }

  function resetQuestion(qid) {
    const { [qid]: _drop, ...rest } = progress;
    progress = rest;
    write(PROGRESS_KEY, progress);
  }

  function clearAll() { progress = {}; write(PROGRESS_KEY, progress); }

  const uiGet = (key, fallback) => (key in ui ? ui[key] : fallback);
  function uiSet(key, value) { ui = { ...ui, [key]: value }; write(UI_KEY, ui); }

  global.CQ = Object.assign(global.CQ || {}, {
    store: { getInput, setInput, isShown, revealAll, resetQuestion, clearAll, uiGet, uiSet },
  });
})(window);
