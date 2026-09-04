import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
    assert.equal(assignments.english.length, 5);
    assert.deepEqual(store.getOrCreateAssignments("2026-09-01"), assignments);

    const question = assignments.math[0];
    let results = store.recordAttempts("2026-09-01", "math", [{ questionId: question.id, answer: "wrong", hintUsed: true, responseMs: 12_000 }]);
    assert.equal(results[0].correct, false);
    assert.equal(results[0].attemptNumber, 1);
    results = store.recordAttempts("2026-09-01", "math", [{ questionId: question.id, answer: question.answer, responseMs: 8_000 }]);
    assert.equal(results[0].correct, true);
    assert.equal(results[0].attemptNumber, 2);
    assert.equal(store.learningDiagnostics().attempts, 2);

    const wordOrder = store.getOrCreateAssignments("2026-09-10").english.find((item) => item.kind === "word_order");
    assert.ok(wordOrder, "tappable word-order kind survives the SQLite compatibility layer");
    assert.ok(wordOrder.options.length >= 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("stored word-order prompts from the old generator become tappable without rewriting history", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "vasilisa-legacy-word-order-"));
  process.env.DATA_DIR = directory;
  await writeFile(path.join(directory, "progress.json"), JSON.stringify({
    days: {
      "2026-09-04": {
        payload: {
          learningHistory: {
            english: {
              oldOrder: {
                skill: "word_order",
                level: 1,
                prompt: "Собери фразу: book / this / I / like",
                expectedAnswer: "I like this book",
                attempts: [],
              },
            },
          },
        },
      },
    },
  }));
  try {
    const store = await import(`../vds/learning-store.ts?test=${Date.now()}-legacy-order`);
    const [question] = store.getOrCreateAssignments("2026-09-04").english;
    assert.equal(question.kind, "word_order");
    assert.equal(question.label, "Собери предложение из слов");
    assert.deepEqual(question.options, ["book", "this", "I", "like"]);
    assert.equal(question.answer, "I like this book");
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

    const eighth = store.getOrCreateAssignments("2026-09-08");
    for (const subject of ["math", "english"]) {
      store.recordAttempts("2026-09-08", subject, eighth[subject].map((question) => ({ questionId: question.id, answer: question.answer, responseMs: 10_000 })));
    }
    store.completeLearningDay("2026-09-08", ["math", "english"]);
    assert.ok(store.getOrCreateAssignments("2026-09-09").skillProgress.every((state) => state.level <= 2));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("three perfect days are not enough to increase difficulty", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "vasilisa-short-streak-"));
  process.env.DATA_DIR = directory;
  try {
    const store = await import(`../vds/learning-store.ts?test=${Date.now()}-short`);
    for (let index = 1; index <= 3; index += 1) {
      const day = `2026-10-0${index}`;
      const assignments = store.getOrCreateAssignments(day);
      for (const subject of ["math", "english"]) {
        store.recordAttempts(day, subject, assignments[subject].map((question) => ({ questionId: question.id, answer: question.answer })));
      }
      store.completeLearningDay(day, ["math", "english"]);
    }
    assert.ok(store.getOrCreateAssignments("2026-10-04").skillProgress.every((state) => state.level === 1));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("a missed calendar day breaks the seven-day mastery streak", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "vasilisa-broken-streak-"));
  process.env.DATA_DIR = directory;
  try {
    const store = await import(`../vds/learning-store.ts?test=${Date.now()}-gap`);
    for (const index of [1, 2, 3, 5, 6, 7, 8]) {
      const day = `2026-11-${String(index).padStart(2, "0")}`;
      const assignments = store.getOrCreateAssignments(day);
      for (const subject of ["math", "english"]) {
        store.recordAttempts(day, subject, assignments[subject].map((question) => ({ questionId: question.id, answer: question.answer })));
      }
      store.completeLearningDay(day, ["math", "english"]);
    }
    assert.ok(store.getOrCreateAssignments("2026-11-09").skillProgress.every((state) => state.level === 1));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
