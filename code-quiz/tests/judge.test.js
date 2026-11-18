// Run: node --test code-quiz/tests/judge.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const judge = require("../js/judge.js");

const blank = (answer, alts = []) => ({ answer, alts });

test("normalize ignores whitespace, quote style and a trailing semicolon", () => {
  assert.equal(judge.normalize(`  pd.read_csv( "a.csv" ) ; `), "pd.read_csv('a.csv')");
  assert.equal(judge.normalize("X,\n y"), "X,y");
});

test("isCorrect accepts the answer and its alternatives, rejects empty and wrong input", () => {
  const b = blank("data.isnull().sum()", ["data.isna().sum()"]);
  assert.equal(judge.isCorrect("data.isnull().sum()", b), true);
  assert.equal(judge.isCorrect("data . isna ( ) . sum ( )", b), true);
  assert.equal(judge.isCorrect("data.isnull().count()", b), false);
  assert.equal(judge.isCorrect("   ", b), false);
});

test("isCorrect is case sensitive, because Python is", () => {
  assert.equal(judge.isCorrect("StandardScaler()", blank("StandardScaler()")), true);
  assert.equal(judge.isCorrect("standardscaler()", blank("StandardScaler()")), false);
});

test("splitTemplate separates text from blanks and keeps order", () => {
  const parts = judge.splitTemplate("a = ⟦0⟧\nb(⟦1⟧, ⟦2⟧)\n");
  assert.deepEqual(parts.map((p) => ("blank" in p ? `#${p.blank}` : p.text)), ["a = ", "#0", "\nb(", "#1", ", ", "#2", ")\n"]);
});

test("splitTemplate returns a single text part when there is no blank", () => {
  assert.deepEqual(judge.splitTemplate("import os\n"), [{ text: "import os\n" }]);
});

test("fillTemplate substitutes every blank through the callback", () => {
  const filled = judge.fillTemplate("x = ⟦0⟧ + ⟦1⟧", (i) => ["1", "2"][i]);
  assert.equal(filled, "x = 1 + 2");
});

test("highlight marks comments, strings, keywords and numbers and loses no character", () => {
  const src = "import os  # note\nx = 'a' + 3\n";
  const toks = judge.highlight(src);
  assert.equal(toks.map((t) => t.text).join(""), src);
  const kinds = Object.fromEntries(toks.filter((t) => t.kind).map((t) => [t.text, t.kind]));
  assert.equal(kinds["import"], "keyword");
  assert.equal(kinds["# note"], "comment");
  assert.equal(kinds["'a'"], "string");
  assert.equal(kinds["3"], "number");
});

test("highlight keeps a quote inside a comment inside the comment", () => {
  const toks = judge.highlight("# it's fine\n");
  assert.equal(toks[0].kind, "comment");
  assert.equal(toks[0].text, "# it's fine");
});
