const pool = require("./db");

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transport_vehicles (
      id SERIAL PRIMARY KEY,
      registration_number VARCHAR(40) UNIQUE NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'Bus',
      model VARCHAR(100),
      capacity INTEGER NOT NULL DEFAULT 40 CHECK (capacity > 0),
      driver_name VARCHAR(120),
      driver_phone VARCHAR(30),
      conductor_name VARCHAR(120),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      last_service_date DATE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transport_routes (
      id SERIAL PRIMARY KEY,
      route_code VARCHAR(30) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      area VARCHAR(100),
      stops JSONB NOT NULL DEFAULT '[]'::jsonb,
      vehicle_id INTEGER REFERENCES transport_vehicles(id) ON DELETE SET NULL,
      departure_time TIME,
      return_time TIME,
      distance_km NUMERIC(8,2) NOT NULL DEFAULT 0,
      monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_transport (
      id SERIAL PRIMARY KEY,
      student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      route_id INTEGER NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
      stop_name VARCHAR(150) NOT NULL,
      pickup_time TIME,
      drop_time TIME,
      monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      exam_type VARCHAR(60) NOT NULL,
      academic_year VARCHAR(20) NOT NULL,
      class VARCHAR(30) NOT NULL,
      section VARCHAR(30),
      start_date DATE,
      end_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      default_total_marks NUMERIC(8,2) NOT NULL DEFAULT 100,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS result_uploads (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      stored_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_type VARCHAR(80),
      upload_kind VARCHAR(30) NOT NULL DEFAULT 'document',
      rows_imported INTEGER NOT NULL DEFAULT 0,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS result_submissions (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      subject VARCHAR(120) NOT NULL,
      section VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      feedback TEXT,
      submitted_at TIMESTAMP,
      reviewed_at TIMESTAMP,
      reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(exam_id, teacher_id, subject, section)
    );

    CREATE TABLE IF NOT EXISTS hostels (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      hostel_type VARCHAR(30) NOT NULL DEFAULT 'Boys',
      address TEXT,
      warden_name VARCHAR(120),
      warden_phone VARCHAR(30),
      capacity INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE hostels ADD COLUMN IF NOT EXISTS hostel_type VARCHAR(30) NOT NULL DEFAULT 'Boys';
    ALTER TABLE hostels ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE hostels ADD COLUMN IF NOT EXISTS warden_name VARCHAR(120);
    ALTER TABLE hostels ADD COLUMN IF NOT EXISTS warden_phone VARCHAR(30);
    ALTER TABLE hostels ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE hostels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hostels' AND column_name='type') THEN
        EXECUTE 'UPDATE hostels SET hostel_type = COALESCE(hostel_type, type, ''Boys'')';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hostels' AND column_name='location') THEN
        EXECUTE 'UPDATE hostels SET address = COALESCE(address, location)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hostels' AND column_name='warden') THEN
        EXECUTE 'UPDATE hostels SET warden_name = COALESCE(warden_name, warden)';
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hostels' AND column_name='total_rooms') THEN
        EXECUTE 'UPDATE hostels SET capacity = COALESCE(NULLIF(capacity, 0), total_rooms, 0)';
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS hostel_rooms (
      id SERIAL PRIMARY KEY,
      hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      room_number VARCHAR(40) NOT NULL,
      floor VARCHAR(40),
      room_type VARCHAR(40) NOT NULL DEFAULT 'Dorm',
      total_beds INTEGER NOT NULL DEFAULT 1 CHECK (total_beds > 0),
      monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      mess_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'Available',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(hostel_id, room_number)
    );

    CREATE TABLE IF NOT EXISTS hostel_beds (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
      bed_label VARCHAR(40) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Available',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(room_id, bed_label)
    );

    CREATE TABLE IF NOT EXISTS student_hostel_allocations (
      id SERIAL PRIMARY KEY,
      student_id INTEGER UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
      room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
      bed_id INTEGER NOT NULL REFERENCES hostel_beds(id) ON DELETE CASCADE,
      hostel_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      mess_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
      security_deposit NUMERIC(12,2) NOT NULL DEFAULT 0,
      join_date DATE NOT NULL DEFAULT CURRENT_DATE,
      leave_date DATE,
      guardian_contact VARCHAR(30),
      emergency_contact VARCHAR(30),
      notes TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hostel_leave_requests (
      id SERIAL PRIMARY KEY,
      allocation_id INTEGER REFERENCES student_hostel_allocations(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      from_date DATE NOT NULL,
      to_date DATE NOT NULL,
      reason TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hostel_complaints (
      id SERIAL PRIMARY KEY,
      allocation_id INTEGER REFERENCES student_hostel_allocations(id) ON DELETE SET NULL,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      category VARCHAR(60) NOT NULL DEFAULT 'General',
      priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
      description TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Open',
      assigned_to VARCHAR(120),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE hostel_complaints ADD COLUMN IF NOT EXISTS allocation_id INTEGER REFERENCES student_hostel_allocations(id) ON DELETE SET NULL;
    ALTER TABLE hostel_complaints ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(120);
    ALTER TABLE hostel_complaints ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
    ALTER TABLE hostel_complaints ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='hostel_complaints'
          AND column_name='student_id'
          AND data_type <> 'integer'
      ) THEN
        EXECUTE 'ALTER TABLE hostel_complaints ALTER COLUMN student_id TYPE INTEGER USING NULLIF(student_id, '''')::integer';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='hostel_leave_requests'
          AND column_name='student_id'
          AND data_type <> 'integer'
      ) THEN
        EXECUTE 'ALTER TABLE hostel_leave_requests ALTER COLUMN student_id TYPE INTEGER USING NULLIF(student_id, '''')::integer';
      END IF;
    END $$;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS library_books (
      id SERIAL PRIMARY KEY,
      accession_number VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(180),
      isbn VARCHAR(30),
      category VARCHAR(80),
      publisher VARCHAR(150),
      publication_year INTEGER,
      rack VARCHAR(50),
      total_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
      available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (available_copies <= total_copies)
    );

    CREATE TABLE IF NOT EXISTS library_issues (
      id SERIAL PRIMARY KEY,
      book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE RESTRICT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
      due_date DATE NOT NULL,
      return_date DATE,
      fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      fine_paid BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(30) NOT NULL DEFAULT 'Issued',
      issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      returned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_documents (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      document_type VARCHAR(80) NOT NULL,
      title VARCHAR(150) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      mime_type VARCHAR(100),
      file_size INTEGER,
      document_number VARCHAR(100),
      issue_date DATE,
      expiry_date DATE,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS staff_members (
      id SERIAL PRIMARY KEY,
      employee_code VARCHAR(40) UNIQUE NOT NULL,
      name VARCHAR(150) NOT NULL,
      role_title VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      phone VARCHAR(30),
      email VARCHAR(150),
      joining_date DATE,
      base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      bank_account VARCHAR(80),
      bank_ifsc VARCHAR(30),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id SERIAL PRIMARY KEY,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2200),
      status VARCHAR(30) NOT NULL DEFAULT 'Draft',
      notes TEXT,
      processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      processed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(month, year)
    );

    CREATE TABLE IF NOT EXISTS payroll_entries (
      id SERIAL PRIMARY KEY,
      payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
      employee_type VARCHAR(20) NOT NULL,
      employee_id INTEGER NOT NULL,
      employee_name VARCHAR(150) NOT NULL,
      employee_code VARCHAR(50),
      role_title VARCHAR(100),
      base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
      deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
      net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      payment_date DATE,
      payment_mode VARCHAR(40),
      transaction_reference VARCHAR(120),
      remarks TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(payroll_run_id, employee_type, employee_id)
    );

    CREATE TABLE IF NOT EXISTS finance_transactions (
      id SERIAL PRIMARY KEY,
      transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
      transaction_type VARCHAR(20) NOT NULL,
      category VARCHAR(80) NOT NULL,
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      payment_mode VARCHAR(40),
      reference_number VARCHAR(120),
      party_name VARCHAR(150),
      description TEXT,
      attachment_url TEXT,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS exam_schedule (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      subject VARCHAR(120) NOT NULL,
      exam_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      room VARCHAR(80),
      instructions TEXT,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(exam_id, subject, exam_date)
    );

    CREATE TABLE IF NOT EXISTS question_papers (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      subject VARCHAR(120) NOT NULL,
      title VARCHAR(180) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      mime_type VARCHAR(100),
      access_status VARCHAR(30) NOT NULL DEFAULT 'Restricted',
      release_at TIMESTAMP,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admit_cards (
      id SERIAL PRIMARY KEY,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      card_number VARCHAR(80) UNIQUE NOT NULL,
      generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      published BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(exam_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS smart_attendance_sessions (
      id SERIAL PRIMARY KEY,
      session_code VARCHAR(80) UNIQUE NOT NULL,
      attendance_method VARCHAR(30) NOT NULL,
      subject_type VARCHAR(20) NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
      starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      device_id VARCHAR(120),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      subject VARCHAR(120) NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      start_time TIME,
      end_time TIME,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE timetable ADD COLUMN IF NOT EXISTS period_number INTEGER;

    CREATE TABLE IF NOT EXISTS timetable_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      working_days JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb,
      periods JSONB NOT NULL DEFAULT '[
        {"number":1,"label":"P1","start":"08:00","end":"08:45","type":"class"},
        {"number":2,"label":"P2","start":"08:50","end":"09:35","type":"class"},
        {"number":3,"label":"P3","start":"09:40","end":"10:25","type":"class"},
        {"number":4,"label":"P4","start":"10:45","end":"11:30","type":"class"},
        {"number":5,"label":"P5","start":"11:35","end":"12:20","type":"class"},
        {"number":6,"label":"P6","start":"12:25","end":"13:10","type":"class"},
        {"number":7,"label":"P7","start":"13:15","end":"14:00","type":"class"}
      ]'::jsonb,
      updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    INSERT INTO timetable_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS timetable_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(180) NOT NULL,
      event_type VARCHAR(40) NOT NULL DEFAULT 'Event',
      scope VARCHAR(20) NOT NULL DEFAULT 'monthly',
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      event_date DATE,
      start_date DATE,
      end_date DATE,
      description TEXT,
      color VARCHAR(40) DEFAULT 'blue',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS smart_attendance_events (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES smart_attendance_sessions(id) ON DELETE SET NULL,
      attendance_method VARCHAR(30) NOT NULL,
      subject_type VARCHAR(20) NOT NULL,
      subject_id INTEGER NOT NULL,
      event_time TIMESTAMP NOT NULL DEFAULT NOW(),
      status VARCHAR(20) NOT NULL DEFAULT 'Present',
      device_id VARCHAR(120),
      external_reference VARCHAR(180),
      confidence NUMERIC(6,3),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(session_id, subject_type, subject_id)
    );

    CREATE TABLE IF NOT EXISTS smart_attendance_identities (
      id SERIAL PRIMARY KEY,
      subject_type VARCHAR(20) NOT NULL,
      subject_id INTEGER NOT NULL,
      attendance_method VARCHAR(30) NOT NULL,
      external_identifier VARCHAR(180) UNIQUE NOT NULL,
      device_id VARCHAR(120),
      active BOOLEAN NOT NULL DEFAULT TRUE,
      enrolled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      UNIQUE(subject_type, subject_id, attendance_method)
    );

    CREATE TABLE IF NOT EXISTS teacher_attendance (
      id SERIAL PRIMARY KEY,
      teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Present',
      check_in TIMESTAMP,
      check_out TIMESTAMP,
      attendance_method VARCHAR(30),
      device_id VARCHAR(120),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(teacher_id,date)
    );

    ALTER TABLE results ADD COLUMN IF NOT EXISTS exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS grade VARCHAR(10);
    ALTER TABLE results ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(20) NOT NULL DEFAULT 'Present';
    ALTER TABLE results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30);
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS hostel_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS mess_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS section VARCHAR(30);
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS due_date DATE;
    ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_class_academic_year_key;
    ALTER TABLE fee_structures DROP CONSTRAINT IF EXISTS fee_structures_class_year_unique;
    CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_class_section_year_unique
      ON fee_structures(class, COALESCE(section, ''), academic_year);

    CREATE INDEX IF NOT EXISTS idx_transport_routes_vehicle ON transport_routes(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_student_transport_route ON student_transport(route_id);
    CREATE INDEX IF NOT EXISTS idx_results_exam ON results(exam_id);
    CREATE INDEX IF NOT EXISTS idx_results_student_exam ON results(student_id, exam_id);
    CREATE INDEX IF NOT EXISTS idx_result_submissions_status ON result_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_paid_on ON fee_payments(paid_on);
    CREATE INDEX IF NOT EXISTS idx_hostel_rooms_hostel ON hostel_rooms(hostel_id);
    CREATE INDEX IF NOT EXISTS idx_hostel_beds_room ON hostel_beds(room_id);
    CREATE INDEX IF NOT EXISTS idx_student_hostel_status ON student_hostel_allocations(status);
    CREATE INDEX IF NOT EXISTS idx_hostel_leave_status ON hostel_leave_requests(status);
    CREATE INDEX IF NOT EXISTS idx_hostel_complaints_status ON hostel_complaints(status);
    CREATE INDEX IF NOT EXISTS idx_library_issues_student ON library_issues(student_id);
    CREATE INDEX IF NOT EXISTS idx_library_issues_status ON library_issues(status);
    CREATE INDEX IF NOT EXISTS idx_student_documents_student ON student_documents(student_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_entries_run ON payroll_entries(payroll_run_id);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_exam_schedule_exam ON exam_schedule(exam_id);
    CREATE INDEX IF NOT EXISTS idx_question_papers_exam ON question_papers(exam_id);
    CREATE INDEX IF NOT EXISTS idx_admit_cards_student ON admit_cards(student_id);
    CREATE INDEX IF NOT EXISTS idx_smart_attendance_session ON smart_attendance_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_smart_attendance_subject ON smart_attendance_events(subject_type, subject_id);
    CREATE INDEX IF NOT EXISTS idx_smart_identity_subject ON smart_attendance_identities(subject_type, subject_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_attendance_date ON teacher_attendance(date);
  `);
}

module.exports = initDatabase;
