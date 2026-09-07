CREATE TABLE IF NOT EXISTS legacy_fee_accounts (
  id SERIAL PRIMARY KEY,
  legacy_number VARCHAR(60) UNIQUE NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  guardian_name VARCHAR(150), phone VARCHAR(20), old_admission_number VARCHAR(80),
  roll_number VARCHAR(80), class_name VARCHAR(60), section VARCHAR(30),
  academic_year VARCHAR(20) NOT NULL, student_status VARCHAR(30) NOT NULL DEFAULT 'Passed Out',
  total_fee NUMERIC(12,2) NOT NULL DEFAULT 0, opening_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT, created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(total_fee>=0 AND opening_paid>=0 AND opening_paid<=total_fee)
);
CREATE TABLE IF NOT EXISTS legacy_fee_payments (
  id SERIAL PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES legacy_fee_accounts(id) ON DELETE CASCADE,
  receipt_number VARCHAR(80) UNIQUE NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE, payment_mode VARCHAR(30) NOT NULL DEFAULT 'Cash',
  reference_number VARCHAR(120), notes TEXT, recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reversed_at TIMESTAMPTZ,
  reversed_by INTEGER REFERENCES users(id) ON DELETE SET NULL, reversal_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_legacy_fee_accounts_year ON legacy_fee_accounts(academic_year);
CREATE INDEX IF NOT EXISTS idx_legacy_fee_payments_account ON legacy_fee_payments(account_id,paid_on);
