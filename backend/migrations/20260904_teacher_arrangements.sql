CREATE TABLE IF NOT EXISTS teacher_arrangements (
  id SERIAL PRIMARY KEY,
  timetable_id INTEGER NOT NULL REFERENCES timetable(id) ON DELETE CASCADE,
  arrangement_date DATE NOT NULL,
  original_teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  substitute_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  arrangement_type VARCHAR(30) NOT NULL DEFAULT 'substitute'
    CHECK (arrangement_type IN ('substitute', 'self_study', 'library', 'combined_class', 'free_period')),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'completed', 'cancelled')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (timetable_id, arrangement_date),
  CHECK (
    (arrangement_type = 'substitute' AND substitute_teacher_id IS NOT NULL)
    OR (arrangement_type <> 'substitute' AND substitute_teacher_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_teacher_arrangements_date
  ON teacher_arrangements(arrangement_date);
CREATE INDEX IF NOT EXISTS idx_teacher_arrangements_substitute
  ON teacher_arrangements(substitute_teacher_id, arrangement_date);
