// Systematic differential test: utils.js (under test) vs independent reference
// implementations written from each function's name / plain meaning.
// Run: node test.js   (read-only, local only)
const u = require("./utils.js");

// ---- Reference implementations (independent, textbook-correct) ----
const ref = {
  sum: (a) => a.reduce((t, x) => t + x, 0),
  max: (a) => Math.max(...a),
  reverse: (s) => [...s].reverse().join(""), // code-point correct
  isPalindrome: (s) => s === [...s].reverse().join(""),
  factorial: (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; },
  clamp: (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
  unique: (a) => [...new Set(a)],
  average: (a) => a.reduce((t, x) => t + x, 0) / a.length,
  // titleCase spec used here: first char of each space-separated word upper, rest untouched
  titleCase: (s) => s.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" "),
  countVowels: (s) => (s.match(/[aeiou]/gi) || []).length, // vowels are case-insensitive
};

let pass = 0, fail = 0;
const failures = [];
function eq(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return Object.is(a, b) || a === b;
}
function check(fn, args, note = "") {
  let actual, expected, errA = null, errE = null;
  try { actual = u[fn](...args); } catch (e) { errA = String(e); }
  try { expected = ref[fn](...args); } catch (e) { errE = String(e); }
  const ok = errA === errE && (errA !== null || eq(actual, expected));
  if (ok) pass++;
  else { fail++; failures.push({ fn, args, actual: errA ?? actual, expected: errE ?? expected, note }); }
  return ok;
}

// Deterministic pseudo-random
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const rint = (n) => Math.floor(rnd() * n);

// --- sum / max / unique / average: fuzz over int arrays ---
for (let t = 0; t < 2000; t++) {
  const a = Array.from({ length: rint(9) }, () => rint(201) - 100);
  if (a.length) { check("sum", [a]); check("max", [a]); check("average", [a]); }
  check("unique", [a]);
  const dup = Array.from({ length: rint(12) }, () => rint(5));
  check("unique", [dup]);
}
check("sum", [[]]); check("sum", [[0]]); check("sum", [[-5, 5]]);

// --- clamp: fuzz triples ---
for (let t = 0; t < 2000; t++) {
  const x = rint(201) - 100, lo = rint(101) - 50, hi = lo + rint(80);
  check("clamp", [x, lo, hi]);
}
check("clamp", [5, 0, 10]); check("clamp", [-1, 0, 10]); check("clamp", [11, 0, 10]);

// --- factorial: exhaustive 0..18 (exact in double up to 18!) ---
for (let n = 0; n <= 18; n++) check("factorial", [n], "exhaustive");

// --- reverse / isPalindrome: ASCII fuzz + targeted ---
const alpha = "abcXYZ 123";
for (let t = 0; t < 2000; t++) {
  const s = Array.from({ length: rint(15) }, () => alpha[rint(alpha.length)]).join("");
  check("reverse", [s]); check("isPalindrome", [s]);
}
for (const s of ["", "a", "racecar", "Racecar", "hello", "abba", "abca", "12321", "noon"])
  { check("reverse", [s]); check("isPalindrome", [s]); }

// --- titleCase: simple lowercase space-separated corpora (unambiguous domain) ---
const words = ["hello", "world", "the", "quick", "brown", "fox", "a", "b", "agent", "bounty"];
for (let t = 0; t < 1000; t++) {
  const s = Array.from({ length: 1 + rint(4) }, () => words[rint(words.length)]).join(" ");
  check("titleCase", [s]);
}
for (const s of ["hello world", "hello", "", "a b c"]) check("titleCase", [s]);

// --- countVowels: fuzz mixed case + targeted ---
const letters = "aeiouAEIOUbcdfBCDF xyz";
for (let t = 0; t < 2000; t++) {
  const s = Array.from({ length: rint(20) }, () => letters[rint(letters.length)]).join("");
  check("countVowels", [s]);
}
for (const s of ["AEIOU", "aeiou", "AeIoU", "xyz", "", "Hello World", "APPLE"]) check("countVowels", [s]);

console.log(`TOTAL: pass=${pass} fail=${fail}`);
const byFn = {};
for (const f of failures) { (byFn[f.fn] = byFn[f.fn] || []).push(f); }
for (const [fn, list] of Object.entries(byFn)) {
  console.log(`\nFAILURES ${fn}: ${list.length} (first 6)`);
  for (const f of list.slice(0, 6)) console.log("  ", JSON.stringify(f));
}
if (!Object.keys(byFn).length) console.log("\nNo failures.");

// ---- Targeted candidates (canonical submit candidates) ----
console.log("\nCANONICAL CANDIDATES:");
console.log("factorial(5): actual =", u.factorial(5), "| expected =", ref.factorial(5));
console.log('countVowels("AEIOU"): actual =', u.countVowels("AEIOU"), "| expected =", ref.countVowels("AEIOU"));

// ---- Edge / ambiguity probes (NOT counted as failures above; spec not defined in repo) ----
console.log("\nEDGE PROBES (spec ambiguous — reported separately, not in fail count):");
console.log('reverse("a\\u{1F600}b") utils =', JSON.stringify(u.reverse("a\u{1F600}b")), "| code-point ref =", JSON.stringify(ref.reverse("a\u{1F600}b")));
console.log('isPalindrome("\\u{1F600}") utils =', u.isPalindrome("\u{1F600}"), "| code-point ref =", ref.isPalindrome("\u{1F600}"));
console.log('titleCase("don\'t stop") utils =', JSON.stringify(u.titleCase("don't stop")), '| apostrophe-aware title = "Don\'t Stop"');
console.log('titleCase("hello WORLD") utils =', JSON.stringify(u.titleCase("hello WORLD")), '| lower-rest title = "Hello World"');
console.log("max([]) utils =", u.max([]), "| Math.max() =", Math.max());
console.log("average([]) utils =", u.average([]), "| ref =", ref.average([]));
console.log('countVowels("yYy") utils =', u.countVowels("yYy"), "(y is not a vowel in either ref)");
