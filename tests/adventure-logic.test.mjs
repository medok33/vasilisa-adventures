import assert from "node:assert/strict";
import test from "node:test";
import { dailyContent } from "../app/daily-content.ts";
import { BOOKS, activeQuestion, cleanRanges, continuousPage, isBookFinished, mergeRanges, nextBook } from "../app/books.ts";

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
