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

test("pdf uses a modern playful mom approval block and decorative blue paw seal", async () => {
  const adventure = await readFile(new URL("../app/Adventure.tsx", import.meta.url), "utf8");
  assert.match(adventure, /МАМИНА ПРОВЕРКА/);
  assert.match(adventure, /МАМА ПРОВЕРИЛА/);
  assert.match(adventure, /ИГРОВАЯ ПЕЧАТЬ/);
  assert.match(adventure, /ТЫ УМНИЦА!/);
  assert.match(adventure, /#2F6DCC/);
  assert.match(adventure, /approvalSealSvg/);
});
