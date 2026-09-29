import assert from "node:assert/strict";
import test from "node:test";
import { safePushState, safeReplaceState } from "../app/browser-history.ts";

test("history helpers report success", () => {
  const calls = [];
  const history = {
    pushState: (...args) => calls.push(["push", ...args]),
    replaceState: (...args) => calls.push(["replace", ...args]),
  };
  assert.equal(safeReplaceState(history, { scroll: 10 }), true);
  assert.equal(safePushState(history, { view: "math" }, "/#math"), true);
  assert.deepEqual(calls.map(([kind]) => kind), ["replace", "push"]);
});

test("Safari-style History API rejection cannot escape into navigation", () => {
  const history = {
    pushState: () => { throw new DOMException("History API rate limited", "SecurityError"); },
    replaceState: () => { throw new DOMException("History API rate limited", "SecurityError"); },
  };
  assert.equal(safeReplaceState(history, { scroll: 10 }), false);
  assert.equal(safePushState(history, { view: "math" }, "/#math"), false);
});
