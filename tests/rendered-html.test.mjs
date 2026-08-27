import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("declares production title and domain metadata", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /title:\s*["']Приключения Василисы["']/);
  assert.match(layout, /https:\/\/nectarra\.ru/);
  assert.doesNotMatch(layout, /codex-preview/);
});
