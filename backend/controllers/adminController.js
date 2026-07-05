const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const [students, teachers, classes, revenue] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM students"),
      pool.query("SELECT COUNT(*) FROM teachers"),
      pool.query("SELECT COUNT(*) FROM classes"),
      // ✅ FIXED: fee_payments table use ho rahi hai
      pool.query(`
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM fee_payments
        WHERE DATE_TRUNC('month', paid_on) = DATE_TRUNC('month', CURRENT_DATE)
      `),
    ]);

    const attendanceResult = await pool.query(`
      SELECT
        ROUND(100.0 * SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END)
        / NULLIF(COUNT(*), 0), 1) AS rate
      FROM attendance
      WHERE date >= NOW() - INTERVAL '30 days'
    `);

    // ✅ Low attendance students (<75%)
    const lowAttResult = await pool.query(`
      SELECT COUNT(*) FROM (
        SELECT student_id,
          ROUND(COUNT(*) FILTER (WHERE status = 'Present') * 100.0 / NULLIF(COUNT(*), 0), 1) AS pct
        FROM attendance
        GROUP BY student_id
        HAVING ROUND(COUNT(*) FILTER (WHERE status = 'Present') * 100.0 / NULLIF(COUNT(*), 0), 1) < 75
      ) sub
    `);

    // ✅ Upcoming holidays (crash nahi hoga agar table nahi hai)
    const holidayResult = await pool.query(`
      SELECT id, title, date FROM holidays
      WHERE date >= CURRENT_DATE
      ORDER BY date ASC
      LIMIT 3
    `).catch(() => ({ rows: [] }));

    // ✅ Today's new admissions
    const newAdmissionsResult = await pool.query(`
      SELECT COUNT(*) FROM students
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    res.json({
      totalStudents:      parseInt(students.rows[0].count),
      totalTeachers:      parseInt(teachers.rows[0].count),
      totalClasses:       parseInt(classes.rows[0].count),
      monthlyRevenue:     parseFloat(revenue.rows[0].total),
      attendanceRate:     parseFloat(attendanceResult.rows[0].rate) || 0,
      lowAttendanceCount: parseInt(lowAttResult.rows[0].count) || 0,
      upcomingHolidays:   holidayResult.rows,
      newAdmissionsToday: parseInt(newAdmissionsResult.rows[0].count) || 0,
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

async function generateStudentId() {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;

  const result = await pool.query(
    `SELECT student_id FROM students
     WHERE student_id LIKE $1
     ORDER BY student_id DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const last = result.rows[0].student_id;
    const parts = last.split("-");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const isValidOptionalPhone = (value) =>
  !value || /^\d{10}$/.test(normalizePhone(value));

const normalizeOptionalPhone = (value) => (value ? normalizePhone(value) : null);

const isValidDateString = (value) => {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2100) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

// ── GET /api/admin/students ───────────────────────────────────────────────────
const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         s.*,
         u.name,
         u.email,
         u.is_active,
         ct.name AS class_teacher,
         (
           SELECT ROUND(
             COUNT(*) FILTER (WHERE a.status = 'Present') * 100.0
             / NULLIF(COUNT(*), 0)
           )
           FROM attendance a
           WHERE a.student_id = s.id
         ) AS attendance_pct
       FROM students s
       JOIN users    u  ON s.user_id    = u.id
       LEFT JOIN classes c   ON s.class_id  = c.id
       LEFT JOIN teachers t  ON c.teacher_id = t.id
       LEFT JOIN users   ct  ON t.user_id    = ct.id
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getAllStudents error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/admin/students ──────────────────────────────────────────────────
const createStudent = async (req, res) => {
  const {
    student_id,
    name,
    email,
    password,
    roll_number,
    class_id,
    class: className,
    section,
    class_teacher,
    date_of_birth,
    gender,
    address,
    phone,
    guardian_name,
    guardian_phone,
    aadhar_number,  
  } = req.body;

 console.log("🔍 req.body received:", JSON.stringify(req.body, null, 2));
  console.log("🔍 aadhar_number value:", aadhar_number, "| type:", typeof aadhar_number);

  if (!name || !email || !password || !roll_number || !class_id) {
    return res.status(400).json({
      message: "name, email, password, roll_number, and class_id are required",
    });
  }
  if (!isValidDateString(date_of_birth)) {
    return res
      .status(400)
      .json({ message: "Date of birth must be a valid YYYY-MM-DD date" });
  }
  if (!isValidOptionalPhone(phone)) {
    return res
      .status(400)
      .json({ message: "Student phone must be exactly 10 digits" });
  }
  if (!isValidOptionalPhone(guardian_phone)) {
    return res
      .status(400)
      .json({ message: "Guardian phone must be exactly 10 digits" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password, role, is_active)
       VALUES ($1, $2, $3, 'student', true)
       RETURNING id`,
      [name, email, hashedPassword]
    );
    const userId = userResult.rows[0].id;

    const finalStudentId = student_id?.trim() || (await generateStudentId());

   const studentResult = await client.query(
  `INSERT INTO students
     (user_id, student_id, roll_number, class_id, class, section,
      class_teacher, date_of_birth, gender, address, phone,
      guardian_name, guardian_phone, fee_status, aadhar_number)
   VALUES
     ($1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, 'Pending', $14)
   RETURNING *`,
  [
    userId,               // $1
    finalStudentId,       // $2
    roll_number,          // $3
    class_id,             // $4
    className,            // $5
    section,              // $6
    class_teacher,        // $7
    date_of_birth || null,// $8
    gender,               // $9
    address,              // $10
    normalizeOptionalPhone(phone), // $11
    guardian_name,        // $12
    normalizeOptionalPhone(guardian_phone), // $13
    // 'Pending' is inline in SQL ↑ — no $14 for it
    aadhar_number || null,// $14 ← now correctly hits aadhar_number column
  ]
);

    await client.query("COMMIT");

    res.status(201).json({
      ...studentResult.rows[0],
      name,
      email,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createStudent error:", err);

    if (err.code === "23505") {
      if (err.constraint?.includes("email")) {
        return res.status(409).json({ message: "A user with this email already exists." });
      }
      if (err.constraint?.includes("student_id")) {
        return res.status(409).json({ message: "This Student ID is already taken." });
      }
      return res.status(409).json({ message: "Duplicate entry — please check email or Student ID." });
    }

    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ── PUT /api/admin/students/:id ───────────────────────────────────────────────
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const {
    class_id,
    class: className,
    section,
    class_teacher,
    phone,
    address,
    guardian_name,
    guardian_phone,
    aadhar_number,   // ← keep
    // fee_status,   // ← REMOVE from destructure or just don't pass it below
  } = req.body;

  try {
    if (!isValidOptionalPhone(phone)) {
      return res
        .status(400)
        .json({ message: "Student phone must be exactly 10 digits" });
    }
    if (!isValidOptionalPhone(guardian_phone)) {
      return res
        .status(400)
        .json({ message: "Guardian phone must be exactly 10 digits" });
    }
    const result = await pool.query(
      `UPDATE students SET
         class_id       = COALESCE($1, class_id),
         class          = COALESCE($2, class),
         section        = COALESCE($3, section),
         class_teacher  = COALESCE($4, class_teacher),
         phone          = COALESCE($5, phone),
         address        = COALESCE($6, address),
         guardian_name  = COALESCE($7, guardian_name),
         guardian_phone = COALESCE($8, guardian_phone),
         aadhar_number  = COALESCE($9, aadhar_number),
         updated_at     = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        class_id,
        className,
        section,
        class_teacher,
        normalizeOptionalPhone(phone),
        address,
        guardian_name,   // ← $7 ✓
        normalizeOptionalPhone(guardian_phone),
        aadhar_number,   // ← $9 ✓
        id,              // ← $10 ✓
        // fee_status is GONE — no $11
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateStudent error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── DELETE /api/admin/students/:id ───────────────────────────────────────────
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const studentRow = await client.query(
      "SELECT user_id FROM students WHERE id = $1",
      [id]
    );
    if (studentRow.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Student not found" });
    }
    const userId = studentRow.rows[0].user_id;

    await client.query("DELETE FROM students WHERE id = $1", [id]);
    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    res.json({ message: "Student deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("deleteStudent error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ── GET /api/admin/students/meta ──────────────────────────────────────────────
const getStudentMeta = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.class_name,
        c.section,
        u.name AS teacher_name
      FROM classes c
      LEFT JOIN teachers t ON c.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY c.class_name, c.section
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("getStudentMeta error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── POST /api/admin/students/:id/photo ───────────────────────────────────────
const uploadStudentPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const photoUrl = `/uploads/students/${req.file.filename}`;
    await pool.query(
      "UPDATE students SET photo_url = $1 WHERE id = $2",
      [photoUrl, id]
    );
    res.json({ photo_url: photoUrl });
  } catch (err) {
    console.error("uploadStudentPhoto error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/admin/students/:id/aadhar-image ─────────────────────────────
const uploadAadharImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/uploads/aadhar/${req.file.filename}`;

    await pool.query(
      "UPDATE students SET aadhar_image_url = $1 WHERE id = $2 RETURNING id, aadhar_image_url",
      [imageUrl, req.params.id]
    );

    res.json({
      message: "Aadhaar image uploaded successfully",
      aadhar_image_url: imageUrl,
    });
  } catch (err) {
    console.error("uploadAadharImage error:", err);
    res.status(500).json({ message: "Failed to upload Aadhaar image" });
  }
};

// ── PUT /api/admin/students/:id/aadhar-number ─────────────────────────────
const updateAadharNumber = async (req, res) => {
  try {
    const { aadhar_number } = req.body;

    if (!aadhar_number || !/^\d{12}$/.test(aadhar_number)) {
      return res.status(400).json({ message: "Valid 12-digit Aadhaar number is required" });
    }

    await pool.query(
      "UPDATE students SET aadhar_number = $1 WHERE id = $2",
      [aadhar_number, req.params.id]
    );

    res.json({ message: "Aadhaar number updated successfully" });
  } catch (err) {
    console.error("updateAadharNumber error:", err);
    res.status(500).json({ message: "Failed to update Aadhaar number" });
  }
};

module.exports = {
  getDashboard,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentMeta,
  uploadStudentPhoto,
  uploadAadharImage,    // ← ADD
  updateAadharNumber,   
};
