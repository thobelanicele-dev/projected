// Every Paystack payment reference the billing page has already acted on, so a
// reference can switch a plan on once and never again. Kept with no imports so
// db.ts and the activation code can both use it. No foreign key to users on
// purpose: it must never block deleting an account (delete-account clears it).
export const PAYMENT_REFERENCES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS paystack_references (
    reference TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    created_at BIGINT NOT NULL
  );
`;
