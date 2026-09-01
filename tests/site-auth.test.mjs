import assert from "node:assert/strict";
import test from "node:test";
import { passwordWithUppercaseFirstCharacter, secureTextEqual, secureUsernameEqual } from "../app/site-auth.ts";

test("accepts the site username in either letter case", async () => {
  assert.equal(await secureUsernameEqual("FamilyUser", "familyuser"), true);
  assert.equal(await secureUsernameEqual("FAMILYUSER", "familyuser"), true);
  assert.equal(await secureUsernameEqual("another-user", "familyuser"), false);
});

test("keeps the site password case-sensitive", async () => {
  const expectedPassword = passwordWithUppercaseFirstCharacter("capitalized-password");
  assert.equal(expectedPassword, "Capitalized-password");
  assert.equal(await secureTextEqual("Capitalized-password", expectedPassword), true);
  assert.equal(await secureTextEqual("capitalized-password", expectedPassword), false);
});
