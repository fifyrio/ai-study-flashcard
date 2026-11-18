/* 本机进度存储。只存 {卡片id: {right, wrong, streak, last}}；localStorage 不可用时退化为内存。 */
(function (global) {
  "use strict";
  const KEY = "flashcards-progress-v1";
  const MASTERED_STREAK = 2;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; }
  }
  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* 隐私模式：只保留内存 */ }
  }

  let progress = read();
  const blank = Object.freeze({ right: 0, wrong: 0, streak: 0, last: 0 });

  function get(id) { return progress[id] || blank; }

  // 不可变更新：每次生成新对象
  function record(id, correct) {
    const p = get(id);
    const next = {
      right: p.right + (correct ? 1 : 0),
      wrong: p.wrong + (correct ? 0 : 1),
      streak: correct ? p.streak + 1 : 0,
      last: Date.now(),
    };
    progress = { ...progress, [id]: next };
    write(progress);
    return next;
  }

  function isMastered(id) { return get(id).streak >= MASTERED_STREAK; }
  function clear() { progress = {}; try { localStorage.removeItem(KEY); } catch (_) { /* ignore */ } }

  global.FC = Object.assign(global.FC || {}, { store: { get, record, isMastered, clear, MASTERED_STREAK } });
})(window);
