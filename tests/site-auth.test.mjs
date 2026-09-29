import assert from "node:assert/strict";
import test from "node:test";
import { matchingSiteCredential, matchesSiteCredentials, passwordWithUppercaseFirstCharacter, secureTextEqual, secureUsernameEqual } from "../app/site-auth.ts";

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

test("accepts either configured account without mixing their passwords", async () => {
  const credentials = [
    { username: "ParentAccount", password: "parent-secret", role: "adult" },
    { username: "ChildAccount", password: "1234", role: "child" },
  ];
  assert.equal(await matchesSiteCredentials("parentaccount", "Parent-secret", credentials), true);
  assert.equal(await matchesSiteCredentials("CHILDACCOUNT", "1234", credentials), true);
  assert.equal(await matchesSiteCredentials("ParentAccount", "1234", credentials), false);
  assert.equal(await matchesSiteCredentials("ChildAccount", "Parent-secret", credentials), false);
  assert.equal((await matchingSiteCredential("parentaccount", "Parent-secret", credentials))?.role, "adult");
  assert.equal((await matchingSiteCredential("CHILDACCOUNT", "1234", credentials))?.role, "child");
});
