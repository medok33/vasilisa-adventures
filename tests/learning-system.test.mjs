import assert from "node:assert/strict";
import test from "node:test";
import { decideSkillAdaptation, generateDailyAssignments, isAnswerCorrect, SUBJECT_SKILLS } from "../app/learning-system.ts";
import { createSiteSession, safeReturnTo, verifySiteSession } from "../app/site-auth.ts";

test("daily learning set contains both subjects and the agreed role mix", () => {
  const assignments = generateDailyAssignments({ day: "2026-09-01" });
  assert.equal(assignments.math.length, 5);
  assert.equal(assignments.english.length, 6);
  assert.deepEqual(assignments.math.map((item) => item.role).sort(), ["current", "current", "current", "reinforcement", "stretch"].sort());
  assert.deepEqual(assignments.english.map((item) => item.role).sort(), ["current", "current", "current", "current", "reinforcement", "stretch"].sort());
  assert.ok(assignments.math.every((item) => SUBJECT_SKILLS.math.includes(item.skill)));
  assert.ok(assignments.english.every((item) => SUBJECT_SKILLS.english.includes(item.skill)));
});

test("daily generation is stable and excludes recent exact questions", () => {
  const first = generateDailyAssignments({ day: "2026-09-01" });
  const same = generateDailyAssignments({ day: "2026-09-01" });
  assert.deepEqual(first, same);
  const recent = [...first.math, ...first.english].map((item) => item.fingerprint);
  const next = generateDailyAssignments({ day: "2026-09-02", recentFingerprints: recent, previousTemplates: [...first.math, ...first.english].map((item) => item.templateId) });
  assert.equal(next.math.some((item) => recent.includes(item.fingerprint)), false);
  assert.equal(next.english.some((item) => recent.includes(item.fingerprint)), false);
});

test("exact questions do not repeat inside a rolling 30-day window", () => {
  const recent = [];
  let previousTemplates = [];
  for (let dayNumber = 1; dayNumber <= 35; dayNumber += 1) {
    const day = new Date(Date.UTC(2026, 8, dayNumber)).toISOString().slice(0, 10);
    const assignments = generateDailyAssignments({ day, recentFingerprints: recent.map((item) => item.fingerprint), previousTemplates });
    const daily = [...assignments.math, ...assignments.english];
    assert.equal(new Set(daily.map((item) => item.fingerprint)).size, daily.length, `duplicate on ${day}`);
    assert.equal(daily.some((item) => recent.some((old) => old.fingerprint === item.fingerprint)), false, `recent repeat on ${day}`);
    previousTemplates = daily.map((item) => item.templateId);
    recent.push(...daily.map((item) => ({ day, fingerprint: item.fingerprint })));
    while (recent[0] && recent[0].day < new Date(Date.UTC(2026, 8, dayNumber - 29)).toISOString().slice(0, 10)) recent.shift();
  }
});

test("weak skill is selected for reinforcement without lowering its level", () => {
  const assignments = generateDailyAssignments({
    day: "2026-09-05",
    states: [{ subject: "math", skill: "word_problem", level: 2, state: "reinforce", reviewDueDates: ["2026-09-05"] }],
  });
  const weak = assignments.math.find((item) => item.role === "reinforcement");
  assert.equal(weak?.skill, "word_problem");
  assert.equal(weak?.level, 2);
});

test("answer comparison is case-insensitive and ignores terminal punctuation", () => {
  assert.equal(isAnswerCorrect({ answer: "I like this book" }, " i LIKE this book. "), true);
  assert.equal(isAnswerCorrect({ answer: "42" }, "41"), false);
});

test("site session expires and return paths cannot leave the site", async () => {
  const now = Date.UTC(2026, 7, 29);
  const token = await createSiteSession("test-secret", now);
  assert.equal(await verifySiteSession(token, "test-secret", now + 1_000), true);
  assert.equal(await verifySiteSession(token, "wrong-secret", now + 1_000), false);
  assert.equal(await verifySiteSession(token, "test-secret", now + 8 * 24 * 60 * 60 * 1000), false);
  assert.equal(safeReturnTo("https://example.com"), "/");
  assert.equal(safeReturnTo("/journal?day=1"), "/journal?day=1");
});

test("seven perfect days raise only the evaluated skill", () => {
  const multiplication = decideSkillAdaptation({ day: "2026-09-07", level: 1, total: 7, correct: 7, hints: 0, overTwoAttempts: 0, distinctDays: 7 });
  const wordProblems = decideSkillAdaptation({ day: "2026-09-07", level: 1, total: 7, correct: 4, hints: 2, overTwoAttempts: 3, distinctDays: 7 });
  assert.equal(multiplication.decision, "increase");
  assert.equal(multiplication.level, 2);
  assert.equal(wordProblems.decision, "reinforce");
  assert.equal(wordProblems.level, 1);
  assert.deepEqual(wordProblems.reviewDueDates, ["2026-09-09", "2026-09-11", "2026-09-14"]);
});

test("strong math and weak English receive independent decisions", () => {
  const math = decideSkillAdaptation({ day: "2026-09-07", level: 1, total: 14, correct: 14, hints: 0, overTwoAttempts: 0, distinctDays: 7 });
  const english = decideSkillAdaptation({ day: "2026-09-07", level: 1, total: 14, correct: 8, hints: 4, overTwoAttempts: 4, distinctDays: 7 });
  assert.equal(math.decision, "increase");
  assert.equal(english.decision, "reinforce");
  assert.equal(english.level, 1);
});

test("one mistake does not erase progress or lower a level", () => {
  const result = decideSkillAdaptation({ day: "2026-09-07", level: 2, total: 10, correct: 9, hints: 0, overTwoAttempts: 0, distinctDays: 5 });
  assert.equal(result.decision, "hold");
  assert.equal(result.level, 2);
});
