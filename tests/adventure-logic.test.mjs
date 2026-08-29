import assert from "node:assert/strict";
import test from "node:test";
import { dailyContent } from "../app/daily-content.ts";
import { BOOKS, activeQuestion, cleanRanges, continuousPage, isBookFinished, isReadingAnswerCorrect, mergeRanges, nextBook, readingStarCount } from "../app/books.ts";
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
  assert.equal(activeQuestion(emerald, 39, []), null);
  assert.equal(activeQuestion(emerald, 40, [])?.id, "em-1");
  assert.equal(isBookFinished(cleanRanges([{ from: 5, to: 288 }], emerald), emerald), true);
  assert.equal(nextBook("emerald")?.id, "urfin");
  assert.equal(nextBook("pippi"), null);
});

test("every book question has a bounded page range and an automatic correct answer", () => {
  assert.equal(BOOKS.reduce((total, book) => total + book.questions.length, 0), 17);
  for (const book of BOOKS) {
    for (const question of book.questions) {
      assert.ok(question.fromPage >= book.firstPage);
      assert.ok(question.unlockPage >= question.fromPage && question.unlockPage <= book.lastPage);
      assert.equal(question.options.includes(question.answer), true);
      assert.equal(isReadingAnswerCorrect(question, question.answer), true);
      assert.equal(isReadingAnswerCorrect(question, "другой ответ"), false);
    }
  }
});

test("a book question remains available after a wrong choice and closes only after the correct one", () => {
  const question = BOOKS[2].questions[0];
  assert.equal(activeQuestion(BOOKS[2], question.unlockPage, ["wrong"])?.id, question.id);
  assert.equal(activeQuestion(BOOKS[2], question.unlockPage, [question.id]), null);
});

test("the third reading star requires a correct book answer", () => {
  const book = BOOKS[0];
  const question = book.questions[0];
  assert.equal(readingStarCount(book, { [question.id]: question.options[1] }, 30, true), 2);
  assert.equal(readingStarCount(book, { [question.id]: question.answer }, 15, true), 3);
  assert.equal(readingStarCount(book, { [question.id]: question.answer }, 30, false), 0);
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
    { number: 1, answer: "41", correct: false, checkedAt: "2026-08-27T09:00:00.000Z" },
    { number: 2, answer: "42", correct: true, checkedAt: "2026-08-27T09:02:00.000Z" },
  ]);
  assert.equal(second.math["2026-08-27-word"].attempts[0].correct, true);
  assert.equal(second.math["2026-08-27-sum"].prompt, "27 + 15");
  assert.equal(second.math["2026-08-27-sum"].expectedAnswer, "42");
});
