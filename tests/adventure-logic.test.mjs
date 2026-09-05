import assert from "node:assert/strict";
import test from "node:test";
import { dailyContent } from "../app/daily-content.ts";
import { BOOKS, cleanBookReflections, cleanDailyReadingSession, cleanRanges, continuousPage, isBookFinished, isReadingAnswerCorrect, mergeRanges, nextBook, readingQuestionsForRange, readingStarCount } from "../app/books.ts";
import { emptyLearningHistory, recordLearningAttempt } from "../app/learning-history.ts";

test("daily tasks are stable for one day and differ on the next day", () => {
  const today = dailyContent("2026-08-27");
  const sameDay = dailyContent("2026-08-27");
  const tomorrow = dailyContent("2026-08-28");
  assert.deepEqual(today, sameDay);
  assert.notDeepEqual(today.math, tomorrow.math);
  assert.notDeepEqual(today.english, tomorrow.english);
  assert.notDeepEqual(today.kindness, tomorrow.kindness);
  assert.equal(new Set(today.math.map((question) => question.id)).size, 5);
});

test("reading ranges merge and books open sequentially", () => {
  const emerald = BOOKS[0];
  const merged = mergeRanges([], [{ from: 5, to: 20 }, { from: 21, to: 40 }], emerald);
  assert.deepEqual(merged, [{ from: 5, to: 40 }]);
  assert.equal(continuousPage(merged, emerald), 40);
  assert.equal(isBookFinished(cleanRanges([{ from: 5, to: 288 }], emerald), emerald), true);
  assert.equal(nextBook("emerald")?.id, "urfin");
  assert.equal(nextBook("pippi"), null);
});

test("every book has a short checklist of important reading milestones", () => {
  assert.equal(BOOKS.reduce((total, book) => total + book.questions.length, 0), 17);
  for (const book of BOOKS) {
    for (const question of book.questions) {
      assert.ok(question.fromPage >= book.firstPage);
      assert.ok(question.unlockPage >= question.fromPage && question.unlockPage <= book.lastPage);
      assert.equal(["fact", "meaning"].includes(question.kind), true);
      assert.ok(question.focus.length >= 10);
      assert.equal(question.options.includes(question.answer), true);
      assert.equal(isReadingAnswerCorrect(question, question.answer), true);
      assert.equal(isReadingAnswerCorrect(question, "другой ответ"), false);
    }
  }
});

test("reading answers accept prepared wording variants and the same meaning in the child's words", () => {
  const emeraldQuestion = BOOKS[0].questions.find((question) => question.id === "em-1-meaning");
  const pippiQuestion = BOOKS[2].questions.find((question) => question.id === "pi-5-meaning");
  assert.equal(isReadingAnswerCorrect(emeraldQuestion, "Она хотела попросить Гудвина вернуть её домой!"), true);
  assert.equal(isReadingAnswerCorrect(emeraldQuestion, "Элли нужна была помощь Гудвина, чтобы попасть домой"), true);
  assert.equal(isReadingAnswerCorrect(pippiQuestion, "Пеппи бережёт друзей и помогает им"), true);
  assert.equal(isReadingAnswerCorrect(pippiQuestion, "Пеппи любит конфеты"), false);
});

test("a reading range opens at most one important checklist question", () => {
  const questions = readingQuestionsForRange(BOOKS[0], { from: 5, to: 30 });
  assert.deepEqual(questions.map((question) => question.id), ["em-1-meaning"]);
  assert.equal(readingQuestionsForRange(BOOKS[0], { from: 5, to: 29 }).length, 0);
  assert.equal(readingQuestionsForRange(BOOKS[0], { from: 5, to: 30 }, questions.map((question) => question.id)).length, 0);
  assert.equal(readingQuestionsForRange(BOOKS[0], { from: 5, to: 288 }).length, 1);
});

test("only correct answers from the current day's reading add the third star", () => {
  const book = BOOKS[0];
  const questions = readingQuestionsForRange(book, { from: 5, to: 30 });
  const session = {
    day: "2026-09-01", bookId: book.id, from: 5, to: 30, minutes: 30,
    questionIds: questions.map((question) => question.id),
    answers: Object.fromEntries(questions.map((question) => [question.id, question.answer])),
    finished: true,
  };
  assert.equal(readingStarCount({ ...session, answers: { [questions[0].id]: "другой вариант" } }, true, session.day), 2);
  assert.equal(readingStarCount(session, true, session.day), 3);
  assert.equal(readingStarCount(session, true, "2026-09-02"), 2);
  assert.equal(readingStarCount(session, false, session.day), 0);
  assert.equal(readingStarCount(session, true, session.day), 3);
});

test("the server rebuilds the question link from the saved day, book and range", () => {
  const cleaned = cleanDailyReadingSession({
    day: "2026-09-01", bookId: "emerald", from: 5, to: 30, minutes: 20,
    questionIds: ["em-1-fact"], answers: { "em-1-fact": "Ураган", injected: "answer" }, finished: true,
  }, "2026-09-01");
  assert.deepEqual(cleaned?.questionIds, ["em-1-meaning"]);
  assert.deepEqual(Object.keys(cleaned?.answers ?? {}), ["em-1-meaning"]);
  assert.equal(cleanDailyReadingSession({ ...cleaned, day: "2026-08-31" }, "2026-09-01"), null);
});

test("a completed book reflection gets one fixed personal bonus", () => {
  const reflections = cleanBookReflections({
    emerald: { text: "Для меня эта книга о дружбе.", savedAt: "2026-09-01T12:00:00.000Z", bonusStars: 999 },
    urfin: { text: "Черновик без сохранения", bonusStars: 10 },
  });
  assert.deepEqual(reflections.emerald, {
    text: "Для меня эта книга о дружбе.",
    savedAt: "2026-09-01T12:00:00.000Z",
    bonusStars: 10,
    bonusAwardedAt: "2026-09-01T12:00:00.000Z",
  });
  assert.equal(reflections.urfin?.bonusStars, 0);
});

test("every learning check keeps the first and following answers per question", () => {
  const questions = [
    { id: "2026-08-27-sum", label: "27 + 15", answer: "42" },
    { id: "2026-08-27-word", label: "книга", answer: "book" },
  ];
  const initial = emptyLearningHistory();
  const first = recordLearningAttempt(initial, "math", questions, ["41", "book"], "2026-08-27T09:00:00.000Z");
  const second = recordLearningAttempt(first, "math", questions, ["42", "book"], "2026-08-27T09:02:00.000Z");

  assert.deepEqual(initial, { math: {}, english: {} });
  assert.deepEqual(second.math["2026-08-27-sum"].attempts, [
    { number: 1, answer: "41", correct: false, checkedAt: "2026-08-27T09:00:00.000Z", hintUsed: false, responseMs: 0 },
    { number: 2, answer: "42", correct: true, checkedAt: "2026-08-27T09:02:00.000Z", hintUsed: false, responseMs: 0 },
  ]);
  assert.equal(second.math["2026-08-27-word"].attempts[0].correct, true);
  assert.equal(second.math["2026-08-27-sum"].prompt, "27 + 15");
  assert.equal(second.math["2026-08-27-sum"].expectedAnswer, "42");
  assert.equal(second.math["2026-08-27-sum"].skill, "general");
});
