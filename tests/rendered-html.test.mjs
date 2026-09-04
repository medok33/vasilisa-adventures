import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("declares production title and domain metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /title:\s*["']Приключения Василисы["']/);
  assert.match(layout, /https:\/\/nectarra\.ru/);
  assert.doesNotMatch(layout, /codex-preview/);
});

test("child-facing feedback supports calm retries without blame styling", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(adventure, /Неверный ответ|Ошибка ничего|Не всё сошлось|Есть неточности|Пока не совпало|не получилось или было сложно|за это не ругают/);
  assert.doesNotMatch(adventure, /["']wrong["']/);
  assert.doesNotMatch(styles, /\.wrong/);
  assert.match(adventure, /Страницы и звёзды за чтение уже сохранены/);
  assert.match(adventure, /папин бонус/i);
});

test("learning screens use a five-question ceiling and a non-evaluative grade-four profile", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  assert.match(adventure, /4 класс · Школа России|EDUCATION_PROFILE\.label/);
  assert.match(adventure, /Мягкая настройка уровня/);
  assert.match(adventure, /Это не контрольная/);
  assert.match(adventure, /До пяти коротких заданий/);
  assert.match(adventure, /learningAssignments\?\.english \?\? \[\]\)\.slice\(0, 5\)/);
  assert.match(adventure, /word-sentence/);
  assert.match(adventure, /Нажимай на слова по порядку/);
  assert.doesNotMatch(adventure, /уровня 3-го класса|Выполни шесть коротких заданий/);
});

test("reading uses one compact end-page field and views survive a refresh", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  assert.match(adventure, /Укажи, до какой страницы ты дочитала сегодня/);
  assert.match(adventure, /aria-label="До какой страницы дочитала сегодня"/);
  assert.doesNotMatch(adventure, /Книга \{BOOKS\.findIndex/);
  assert.doesNotMatch(adventure, /Начала со страницы/);
  assert.match(adventure, /viewFromHash\(window\.location\.hash\)/);
  assert.match(adventure, /window\.history\.replaceState/);
});

test("mom owns the review and signature flow while dad keeps contacts and book bonus", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  const dailyContent = await readFile(new URL("../app/daily-content.ts", import.meta.url), "utf8");
  assert.doesNotMatch(dailyContent, /мам/i);
  assert.match(adventure, /Мама подтверждает бытовые миссии/);
  assert.match(adventure, /Подпись мамы/);
  assert.match(adventure, /<span>Маме<\/span>/);
  assert.match(adventure, /Есть чем поделиться с папой/);
  assert.match(adventure, /папин бонус/i);
  assert.doesNotMatch(adventure, /Подпись папы|Папа подтверждает бытовые миссии/);
});

test("signed mom report uses a clean download label and document seal without a paw", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  const seal = adventure.slice(adventure.indexOf("function approvalSealSvg"), adventure.indexOf("export function buildDayPdfDefinition"));
  const pdf = adventure.slice(adventure.indexOf("export function buildDayPdfDefinition"), adventure.indexOf("async function downloadDayPdf"));
  assert.match(adventure, /Заверено мамой/);
  assert.match(adventure, /Скачать отчёт/);
  assert.doesNotMatch(adventure, /Мамин отчёт готов|Скачать красивый PDF|Современный дневник приключений с маминой подписью и синей печатью/);
  assert.match(seal, /ОБЩЕСТВО С ОГРАНИЧЕННОЙ/);
  assert.match(seal, /ОТВЕТСТВЕННОСТЬЮ «СЛОВОМАМЫ» · Г\. КОВРОВ/);
  assert.match(seal, />ДЛЯ</);
  assert.match(seal, />ДОКУМЕНТОВ</);
  assert.doesNotMatch(seal, /ellipse|лап|МАМА ПРОВЕРИЛА|ИГРОВАЯ ПЕЧАТЬ|ТЫ УМНИЦА/);
  assert.doesNotMatch(pdf, /Мой волшебный день|НАСТРОЕНИЕ|МОЯ ПОБЕДА|БЫЛО НЕПРОСТО|МАМИНА ПРОВЕРКА|Мама проверила маршрут|Подпись мамы|Дата:/);
  assert.match(pdf, /День принят!/);
  assert.match(pdf, /Каждая попытка - это новый шаг вперёд!/);
  assert.match(adventure, /approvalSealSvg/);
});
