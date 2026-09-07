CREATE TABLE IF NOT EXISTS certificate_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  certificate_type VARCHAR(30) NOT NULL CHECK (certificate_type IN ('character', 'transfer')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT,
  destination_school VARCHAR(200),
  conduct VARCHAR(80),
  remarks TEXT,
  leaving_date DATE,
  certificate_number VARCHAR(80) UNIQUE,
  clearance JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_student ON certificate_requests(student_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_status ON certificate_requests(status, requested_at DESC);
