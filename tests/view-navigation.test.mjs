import assert from "node:assert/strict";
import test from "node:test";
import { createViewNavigation } from "../app/view-navigation.ts";

test("opening a mission starts at top and returning restores the exact home offset", () => {
  const nav = createViewNavigation("home");
  nav.remember(1450);
  assert.equal(nav.open("math"), 0);
  nav.remember(430);
  assert.equal(nav.open("home"), 1450);
  assert.equal(nav.open("math"), 430);
});

test("parent, wallet and journal keep independent offsets", () => {
  const nav = createViewNavigation("home");
  for (const [view, top] of [["home", 1600], ["parent", 900], ["wallet", 250], ["journal", 500]]) {
    nav.open(view); nav.remember(top);
  }
  assert.equal(nav.restore("parent"), 900);
  assert.equal(nav.restore("home"), 1600);
  assert.equal(nav.restore("wallet"), 250);
});

test("browser history offset survives refresh and unknown offsets are safe", () => {
  const nav = createViewNavigation("home");
  assert.equal(nav.restore("reading", 650), 650);
  assert.equal(nav.open("home"), 0);
  nav.remember(-80);
  assert.equal(nav.position("home"), 0);
  nav.remember(NaN);
  assert.equal(nav.position("home"), 0);
  assert.equal(nav.restore("reading"), 650);
});
