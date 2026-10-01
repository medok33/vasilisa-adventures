import assert from "node:assert/strict";
import test from "node:test";
import { financialBalances, storedMoney } from "../app/money-system.ts";

test("legacy balance becomes savings without pretending to be card money", () => {
  assert.deepEqual(financialBalances({ balance: 430 }), {
    savingsBalance: 430,
    bankBalance: 0,
  });
});

test("separate savings and bank balances survive future days", () => {
  assert.deepEqual(financialBalances({ balance: 999, savingsBalance: 280, bankBalance: 1_450 }), {
    savingsBalance: 280,
    bankBalance: 1_450,
  });
});

test("stored money is rounded and kept inside safe bounds", () => {
  assert.equal(storedMoney(-5), 0);
  assert.equal(storedMoney(125.7), 126);
  assert.equal(storedMoney(2_000_000), 1_000_000);
});
