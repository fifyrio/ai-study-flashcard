// Run: node --test flashcards/tests
const test = require("node:test");
const assert = require("node:assert/strict");
const deck = require("../js/deck.js");

const chapters = { a: { weight: 10 }, b: { weight: 30 }, c: { weight: 20 } };
const card = (id, ch, n, extra = {}) => ({ id, ch, n, type: "tf", src: "official", a: "T", ...extra });
const cards = [card("a1", "a", 1), card("b2", "b", 2), card("b1", "b", 1), card("c1", "c", 1)];
const none = () => ({ wrong: 0, streak: 0 });

test("splitAbsolute marks absolute wording and keeps the rest in order", () => {
  const parts = deck.splitAbsolute("这仅仅是一个只需要考虑的问题");
  assert.equal(parts.map((p) => p.text).join(""), "这仅仅是一个只需要考虑的问题");
  assert.deepEqual(parts.filter((p) => p.hit).map((p) => p.text), ["仅", "仅", "只"]);
});

test("splitAbsolute prefers the longer word over its first character", () => {
  assert.deepEqual(deck.splitAbsolute("无需考虑").filter((p) => p.hit).map((p) => p.text), ["无需"]);
});

test("splitAbsolute returns one plain part when nothing matches", () => {
  assert.deepEqual(deck.splitAbsolute("职业道德"), [{ text: "职业道德", hit: false }]);
});

test("orderCards puts higher-weight chapters first and does not mutate the input", () => {
  const before = cards.map((c) => c.id);
  const ordered = deck.orderCards(cards, chapters, false, Math.random);
  assert.deepEqual(ordered.map((c) => c.id), ["b1", "b2", "c1", "a1"]);
  assert.deepEqual(cards.map((c) => c.id), before);
});

test("orderCards shuffle keeps chapters grouped and loses no card", () => {
  const many = Array.from({ length: 20 }, (_, i) => card(`b${i}`, "b", i)).concat(cards.filter((c) => c.ch !== "b"));
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = deck.orderCards(many, chapters, true, rng);
  assert.equal(out.length, many.length);
  assert.deepEqual(out.map((c) => c.ch).join("").replace(/(.)\1+/g, "$1"), "bca");
  assert.notDeepEqual(out.slice(0, 20).map((c) => c.n), Array.from({ length: 20 }, (_, i) => i));
});

test("filterCards by chapter, type and source", () => {
  const mixed = [card("x", "a", 1, { type: "mc" }), card("y", "a", 2, { src: "ai", note: "? 不确定" }), card("z", "b", 3, { src: "ai" })];
  const f = (o) => deck.filterCards(mixed, { chapter: "all", type: "all", source: "all", scope: "all", ...o }, none, 2).map((c) => c.id);
  assert.deepEqual(f({ chapter: "a" }), ["x", "y"]);
  assert.deepEqual(f({ type: "mc" }), ["x"]);
  assert.deepEqual(f({ source: "official" }), ["x"]);
  assert.deepEqual(f({ source: "ai" }), ["y", "z"]);
  assert.deepEqual(f({ source: "low" }), ["y"]);
});

test("filterCards scope: todo drops mastered cards, wrong keeps only unmastered mistakes", () => {
  const prog = { a1: { wrong: 0, streak: 2 }, b1: { wrong: 3, streak: 0 }, b2: { wrong: 1, streak: 2 } };
  const get = (id) => prog[id] || { wrong: 0, streak: 0 };
  const f = (scope) => deck.filterCards(cards, { chapter: "all", type: "all", source: "all", scope }, get, 2).map((c) => c.id);
  assert.deepEqual(f("todo"), ["b1", "c1"]); // keeps input order; sorting is orderCards job
  assert.deepEqual(f("wrong"), ["b1"]);
  assert.equal(f("all").length, 4);
});

test("low confidence is only flagged for my own answers that start with ?", () => {
  assert.equal(deck.isLowConfidence({ src: "ai", note: "? 不确定" }), true);
  assert.equal(deck.isLowConfidence({ src: "ai", note: "极差" }), false);
  assert.equal(deck.isLowConfidence({ src: "official", note: "? x" }), false);
  assert.equal(deck.cleanNote({ note: "? 不确定" }), "不确定");
});

test("countMastered counts cards at or above the streak threshold", () => {
  const get = (id) => ({ streak: id === "a1" ? 2 : 1 });
  assert.equal(deck.countMastered(cards, get, 2), 1);
});

test("defaultFilters: the AI exam opens on official-answer questions only, other exams on everything", () => {
  assert.deepEqual(deck.defaultFilters("ai"), { chapter: "all", type: "all", source: "official", scope: "todo" });
  assert.equal(deck.defaultFilters("media").source, "all");
  assert.equal(deck.defaultFilters("unknown-exam").source, "all");
});

test("defaultFilters hands out a fresh object, so changing one result never leaks into the next", () => {
  const first = deck.defaultFilters("ai");
  first.source = "all";
  assert.equal(deck.defaultFilters("ai").source, "official");
});

test("the AI default filter keeps only official cards, and scope still hides mastered ones", () => {
  const mixed = [card("o1", "a", 1), card("o2", "a", 2), card("i1", "a", 3, { src: "ai" })];
  const get = (id) => (id === "o2" ? { wrong: 0, streak: 2 } : { wrong: 0, streak: 0 });
  const todo = deck.filterCards(mixed, deck.defaultFilters("ai"), get, 2).map((c) => c.id);
  assert.deepEqual(todo, ["o1"]);
  const all = deck.filterCards(mixed, { ...deck.defaultFilters("ai"), scope: "all" }, get, 2).map((c) => c.id);
  assert.deepEqual(all, ["o1", "o2"]);
});
