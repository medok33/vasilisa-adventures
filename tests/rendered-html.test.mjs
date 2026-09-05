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
  assert.match(adventure, /Можно подумать ещё чуть-чуть/);
  assert.match(adventure, /Верно! Ты заметила главное/);
  assert.match(adventure, /папин бонус/i);
});

test("reading prompt stays child-facing and hides edition metadata", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  assert.match(adventure, /Василиса, один вопрос о твоей книге/);
  assert.match(adventure, /Хочешь — расскажи по-своему/);
  assert.match(adventure, /Ты прочитала свой отрывок\. Хочешь — ответь на один вопрос о нём/);
  assert.doesNotMatch(adventure, /В книжном чек-листе|Главная мысль этого отрывка|Страницы издания|ISBN|Сегодняшнее чтение уже сохранено/);
});

test("learning screens keep five questions but hide technical learning profile from the child", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  assert.match(adventure, /learningAssignments\?\.english \?\? \[\]\)\.slice\(0, 5\)/);
  assert.match(adventure, /Разгадывай короткие шифры в своём темпе/);
  assert.match(adventure, /Открывай слова и собирай фразы/);
  assert.match(adventure, /word-sentence/);
  assert.match(adventure, /Нажимай на слова по порядку/);
  assert.match(adventure, /function LearningVisual/);
  assert.match(adventure, /aria-hidden="true"/);
  assert.doesNotMatch(adventure, /LearningProfile|4 класс · Школа России|Мягкая настройка уровня|Это не контрольная/);
  assert.doesNotMatch(adventure, /уровня 3-го класса|Выполни шесть коротких заданий/);
});

test("learning hints can be opened and closed while their use remains in progress analytics", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(adventure, /learning\.english\?\.length !== 5/);
  assert.match(adventure, /const \[openLearningHints, setOpenLearningHints\]/);
  assert.match(adventure, /function toggleLearningHint\(questionId: string\)/);
  assert.match(adventure, /\[questionId\]: true/);
  assert.match(adventure, /aria-expanded=\{isOpen\}/);
  assert.match(adventure, /Скрыть подсказку/);
  assert.match(adventure, /hintUsed: Boolean\(progress\.learningHints\[question\.id\]\)/);
  assert.match(styles, /\.learning-hint-button\[aria-expanded="true"\]/);
  assert.match(styles, /\.learning-hint-text\{[^}]*border-left:4px/);
  assert.match(styles, /\.math-list article \{ display: grid; grid-template-columns:/);
  assert.match(styles, /\.learning-visual \{ display: grid;/);
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
  assert.match(seal, /ОТВЕТСТВЕННОСТЬЮ/);
  assert.match(seal, /«СЛОВОМАМЫ» · Г\. КОВРОВ/);
  assert.match(seal, />ДЛЯ</);
  assert.match(seal, />ДОКУМЕНТОВ</);
  assert.doesNotMatch(seal, /ellipse|лап|МАМА ПРОВЕРИЛА|ИГРОВАЯ ПЕЧАТЬ|ТЫ УМНИЦА/);
  assert.doesNotMatch(pdf, /Мой волшебный день|Мой день - моя история|НАСТРОЕНИЕ|МОЯ ПОБЕДА|БЫЛО НЕПРОСТО|МАМИНА ПРОВЕРКА|Мама проверила маршрут|Подпись мамы|Дата:|relativePosition/);
  assert.match(pdf, /День принят!/);
  assert.match(pdf, /Каждая попытка - это новый шаг вперёд!/);
  assert.match(adventure, /approvalSealSvg/);
});
