type MoneyPayload = Record<string, unknown>;

export function storedMoney(value: unknown) {
  return Math.max(0, Math.min(1_000_000, Math.round(Number(value) || 0)));
}

export function financialBalances(payload: MoneyPayload) {
  return {
    // `balance` was the original savings field. Keep it as a migration source so
    // already earned money is never lost when the two balances become separate.
    savingsBalance: storedMoney(payload.savingsBalance ?? payload.balance),
    bankBalance: storedMoney(payload.bankBalance),
  };
}
