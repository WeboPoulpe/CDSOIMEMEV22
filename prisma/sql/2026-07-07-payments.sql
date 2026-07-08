CREATE TABLE IF NOT EXISTS "payments" (
  "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cliente_id"            UUID NOT NULL,
  "seance_id"             UUID,
  "token"                 TEXT NOT NULL,
  "amount_cents"          INTEGER NOT NULL,
  "currency"              TEXT NOT NULL DEFAULT 'eur',
  "label"                 TEXT NOT NULL,
  "status"                TEXT NOT NULL DEFAULT 'pending',
  "stripe_session_id"     TEXT,
  "stripe_payment_intent" TEXT,
  "paid_at"               TIMESTAMPTZ,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "payments_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "payments_seance_id_fkey"  FOREIGN KEY ("seance_id")  REFERENCES "seances"("id")  ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_token_key" ON "payments"("token");
CREATE INDEX IF NOT EXISTS "payments_cliente_id_idx" ON "payments"("cliente_id");
CREATE INDEX IF NOT EXISTS "payments_seance_id_idx" ON "payments"("seance_id");
