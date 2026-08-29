import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("VDS store persists assignments and every correction attempt", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "vasilisa-learning-"));
  process.env.DATA_DIR = directory;
  try {
    const store = await import(`../vds/learning-store.ts?test=${Date.now()}`);
    const assignments = store.getOrCreateAssignments("2026-09-01");
    assert.equal(assignments.math.length, 5);
    assert.equal(assignments.english.length, 6);
    assert.deepEqual(store.getOrCreateAssignments("2026-09-01"), assignments);

    const question = assignments.math[0];
    let results = store.recordAttempts("2026-09-01", "math", [{ questionId: question.id, answer: "wrong", hintUsed: true, responseMs: 12_000 }]);
    assert.equal(results[0].correct, false);
    assert.equal(results[0].attemptNumber, 1);
    results = store.recordAttempts("2026-09-01", "math", [{ questionId: question.id, answer: question.answer, responseMs: 8_000 }]);
    assert.equal(results[0].correct, true);
    assert.equal(results[0].attemptNumber, 2);
    assert.equal(store.learningDiagnostics().attempts, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("seven perfect completed days increase only sufficiently practised skills", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "vasilisa-adaptation-"));
  process.env.DATA_DIR = directory;
  try {
    const store = await import(`../vds/learning-store.ts?test=${Date.now()}-perfect`);
    for (let index = 1; index <= 7; index += 1) {
      const day = `2026-09-0${index}`;
      const assignments = store.getOrCreateAssignments(day);
      for (const subject of ["math", "english"]) {
        store.recordAttempts(day, subject, assignments[subject].map((question) => ({ questionId: question.id, answer: question.answer, responseMs: 10_000 })));
      }
      store.completeLearningDay(day, ["math", "english"]);
    }
    const latest = store.getOrCreateAssignments("2026-09-08").skillProgress;
    assert.ok(latest.some((state) => state.level === 2 && state.state === "increase"));
    assert.ok(latest.some((state) => state.level === 1));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
