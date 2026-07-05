const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ─── Multer config for Aadhaar image uploads ──────────────────────────────────
const aadharStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/aadhar";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `aadhar_${req.params.id}_${Date.now()}${ext}`);
  },
});

const aadharUpload = multer({
  storage: aadharStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WebP or PDF allowed for Aadhaar"));
  },
});

// ─── GET /api/student/profile ─────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name, u.email, teacher_user.name AS class_teacher
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN teachers class_teacher ON class_teacher.id = c.teacher_id
       LEFT JOIN users teacher_user ON teacher_user.id = class_teacher.user_id
       WHERE s.user_id = $1`,
      [req.user.id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Profile not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/student/attendance ──────────────────────────────────────────────
const getAttendance = async (req, res) => {
  try {
    const student = await pool.query(
      "SELECT id FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const result = await pool.query(
      "SELECT * FROM attendance WHERE student_id=$1 ORDER BY date DESC LIMIT 60",
      [student.rows[0].id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/student/results ─────────────────────────────────────────────────
const getResults = async (req, res) => {
  try {
    const student = await pool.query(
      "SELECT id FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const result = await pool.query(
      `SELECT r.*, e.name AS exam_name, e.academic_year, e.class, e.section
       FROM results r
       LEFT JOIN exams e ON e.id = r.exam_id
       WHERE r.student_id = $1
         AND (r.exam_id IS NULL OR r.published = TRUE)
       ORDER BY r.exam_date DESC, e.created_at DESC, r.subject`,
      [student.rows[0].id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/student/fees ────────────────────────────────────────────────────
const getFees = async (req, res) => {
  try {
    const student = await pool.query(
      "SELECT id FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const result = await pool.query(
      "SELECT * FROM fees WHERE student_id=$1 ORDER BY due_date DESC",
      [student.rows[0].id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/student/assignments ─────────────────────────────────────────────
const getAssignments = async (req, res) => {
  try {
    const student = await pool.query(
      "SELECT class, section FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const { class: cls, section } = student.rows[0];
    const result = await pool.query(
      `SELECT a.*, u.name as teacher_name FROM assignments a
       JOIN classes c ON a.class_id = c.id
       JOIN teachers t ON a.teacher_id = t.id
       JOIN users u ON t.user_id = u.id
       WHERE c.class_name=$1 AND c.section=$2
       ORDER BY a.due_date DESC`,
      [cls, section],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/student/timetable ───────────────────────────────────────────────
const getTimetable = async (req, res) => {
  try {
    // class_id directly use karo — name matching se bachao
    const student = await pool.query(
      "SELECT class_id, class, section FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (student.rows.length === 0)
      return res.status(404).json({ message: "Student not found" });

    const { class_id, class: cls, section } = student.rows[0];

    const result = await pool.query(
      `SELECT 
     tt.id,
     tt.class_id,
     tt.teacher_id,
     tt.subject,
     tt.day_of_week,
     tt.start_time,
     tt.end_time,
     CASE tt.start_time
       WHEN '08:00:00' THEN 1
       WHEN '08:50:00' THEN 2
       WHEN '09:40:00' THEN 3
       WHEN '10:45:00' THEN 4
       WHEN '11:35:00' THEN 5
       WHEN '12:25:00' THEN 6
       WHEN '13:15:00' THEN 7
     END AS period_number,
     u.name AS teacher_name
   FROM timetable tt
   JOIN teachers t ON tt.teacher_id = t.id
   JOIN users u ON t.user_id = u.id
   LEFT JOIN classes c ON c.id = tt.class_id
   WHERE (
     ($1::int IS NOT NULL AND tt.class_id = $1)
     OR (
       $1::int IS NULL
       AND (c.grade = $2 OR c.class_name = $2 OR c.class_name = CONCAT('Class ', $2))
       AND c.section = $3
     )
   )
   ORDER BY 
     CASE tt.day_of_week
       WHEN 'Monday'    THEN 1
       WHEN 'Tuesday'   THEN 2
       WHEN 'Wednesday' THEN 3
       WHEN 'Thursday'  THEN 4
       WHEN 'Friday'    THEN 5
       WHEN 'Saturday'  THEN 6
     END,
     tt.start_time`,
      [class_id || null, cls, section],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getTimetable error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/student/teachers ────────────────────────────────────────────────
const getTeachers = async (req, res) => {
  try {
    const studentResult = await pool.query(
      "SELECT class_id, class, section FROM students WHERE user_id = $1",
      [req.user.id],
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    const student = studentResult.rows[0];
    const result = await pool.query(
      `SELECT DISTINCT
         t.id,
         u.name,
         u.email,
         t.phone,
         COALESCE(ts.subject, t.subject) AS subject,
         (c.teacher_id = t.id) AS is_class_teacher
       FROM teachers t
       JOIN users u ON t.user_id = u.id
       LEFT JOIN teacher_subjects ts ON ts.teacher_id = t.id
       LEFT JOIN classes c ON c.id = $1
       WHERE c.teacher_id = t.id
          OR (
            ts.section = $3
            AND (
              ts.class_name = $2
              OR ts.class_name = CONCAT('Class ', $2)
              OR ts.class_name = c.grade
              OR ts.class_name = c.class_name
            )
          )
       ORDER BY u.name ASC`,
      [student.class_id, student.class, student.section],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getTeachers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/student/:id/aadhar-image ───────────────────────────────────────
// Upload Aadhaar card image and save URL to DB
const uploadAadharImage = [
  aadharUpload.single("aadhar_image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Build the public URL path (adjust base URL to match your server setup)
      const imageUrl = `/uploads/aadhar/${req.file.filename}`;

      await pool.query(
        "UPDATE students SET aadhar_image_url = $1 WHERE id = $2",
        [imageUrl, req.params.id],
      );

      res.json({
        message: "Aadhaar image uploaded successfully",
        aadhar_image_url: imageUrl,
      });
    } catch (err) {
      console.error("uploadAadharImage error:", err);
      res.status(500).json({ message: "Failed to upload Aadhaar image" });
    }
  },
];

// ─── PUT /api/student/:id/aadhar-number ───────────────────────────────────────
// Save or update Aadhaar number only (for edits without re-uploading image)
const updateAadharNumber = async (req, res) => {
  try {
    const { aadhar_number } = req.body;

    if (!aadhar_number || !/^\d{12}$/.test(aadhar_number)) {
      return res
        .status(400)
        .json({ message: "Valid 12-digit Aadhaar number is required" });
    }

    await pool.query("UPDATE students SET aadhar_number = $1 WHERE id = $2", [
      aadhar_number,
      req.params.id,
    ]);

    res.json({ message: "Aadhaar number updated successfully" });
  } catch (err) {
    console.error("updateAadharNumber error:", err);
    res.status(500).json({ message: "Failed to update Aadhaar number" });
  }
};

const getCampusServices = async (req, res) => {
  try {
    const studentResult = await pool.query(
      "SELECT id FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (!studentResult.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }
    const studentId = studentResult.rows[0].id;
    const [transport, hostel, leaves, complaints] = await Promise.all([
      pool.query(
        `SELECT st.*,tr.route_code,tr.name AS route_name,tr.area,tr.stops,
                tr.departure_time,tr.return_time,tv.registration_number,
                tv.driver_name,tv.driver_phone
         FROM student_transport st
         JOIN transport_routes tr ON tr.id=st.route_id
         LEFT JOIN transport_vehicles tv ON tv.id=tr.vehicle_id
         WHERE st.student_id=$1 AND st.active=TRUE`,
        [studentId],
      ),
      pool.query(
        `SELECT sha.*,h.name AS hostel_name,h.hostel_type,h.address,
                h.warden_name,h.warden_phone,hr.room_number,hr.floor,hb.bed_label
         FROM student_hostel_allocations sha
         JOIN hostels h ON h.id=sha.hostel_id
         JOIN hostel_rooms hr ON hr.id=sha.room_id
         JOIN hostel_beds hb ON hb.id=sha.bed_id
         WHERE sha.student_id=$1 AND sha.status='Active'`,
        [studentId],
      ),
      pool.query(
        "SELECT * FROM hostel_leave_requests WHERE student_id=$1 ORDER BY created_at DESC",
        [studentId],
      ),
      pool.query(
        "SELECT * FROM hostel_complaints WHERE student_id=$1 ORDER BY created_at DESC",
        [studentId],
      ),
    ]);
    res.json({
      transport: transport.rows[0] || null,
      hostel: hostel.rows[0] || null,
      leave_requests: leaves.rows,
      complaints: complaints.rows,
    });
  } catch (error) {
    console.error("getCampusServices:", error);
    res.status(500).json({ message: "Failed to load campus services" });
  }
};

const createHostelLeave = async (req, res) => {
  const { from_date, to_date, reason } = req.body;
  if (!from_date || !to_date || from_date > to_date) {
    return res.status(400).json({ message: "Valid leave dates are required" });
  }
  try {
    const allocation = await pool.query(
      `SELECT sha.id,sha.student_id FROM student_hostel_allocations sha
       JOIN students s ON s.id=sha.student_id
       WHERE s.user_id=$1 AND sha.status='Active'`,
      [req.user.id],
    );
    if (!allocation.rows.length) {
      return res.status(409).json({ message: "No active hostel allocation" });
    }
    const result = await pool.query(
      `INSERT INTO hostel_leave_requests
         (allocation_id,student_id,from_date,to_date,reason)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        allocation.rows[0].id,
        allocation.rows[0].student_id,
        from_date,
        to_date,
        reason || null,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createHostelLeave:", error);
    res.status(500).json({ message: "Failed to submit leave request" });
  }
};

const createHostelComplaint = async (req, res) => {
  const { category = "General", priority = "Medium", description } = req.body;
  if (!description?.trim()) {
    return res
      .status(400)
      .json({ message: "Complaint description is required" });
  }
  try {
    const allocation = await pool.query(
      `SELECT sha.id,sha.student_id FROM student_hostel_allocations sha
       JOIN students s ON s.id=sha.student_id
       WHERE s.user_id=$1 AND sha.status='Active'`,
      [req.user.id],
    );
    if (!allocation.rows.length) {
      return res.status(409).json({ message: "No active hostel allocation" });
    }
    const result = await pool.query(
      `INSERT INTO hostel_complaints
         (allocation_id,student_id,category,priority,description)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        allocation.rows[0].id,
        allocation.rows[0].student_id,
        category,
        priority,
        description.trim(),
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("createHostelComplaint:", error);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
};

module.exports = {
  getProfile,
  getAttendance,
  getResults,
  getFees,
  getAssignments,
  getTimetable,
  getTeachers,
  getCampusServices,
  createHostelLeave,
  createHostelComplaint,
  uploadAadharImage, // ← NEW
  updateAadharNumber, // ← NEW
};
