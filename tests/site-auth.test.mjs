import assert from "node:assert/strict";
import test from "node:test";
import { secureTextEqual, secureUsernameEqual } from "../app/site-auth.ts";

test("accepts the site username in either letter case", async () => {
  assert.equal(await secureUsernameEqual("FamilyUser", "familyuser"), true);
  assert.equal(await secureUsernameEqual("FAMILYUSER", "familyuser"), true);
  assert.equal(await secureUsernameEqual("another-user", "familyuser"), false);
});

test("keeps the site password case-sensitive", async () => {
  assert.equal(await secureTextEqual("Capitalized-password", "Capitalized-password"), true);
  assert.equal(await secureTextEqual("capitalized-password", "Capitalized-password"), false);
});
