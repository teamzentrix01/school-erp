const pool     = require("../config/db");
const express  = require("express");
const router   = express.Router();
const path     = require("path");
const fs       = require("fs");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requestValidation } = require("../middleware/requestValidation");

// ── Import upload middleware (for students photos)
const studentUpload = require("../middleware/upload");   // uploads/students/

// ── Multer for teacher profile pictures
const multer = require("multer");
const uploadDir = path.join(__dirname, "../uploads/teachers");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const teacherStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (_req,  file, cb) => {
    const ext  = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const teacherUpload = multer({
  storage: teacherStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error("Only image files are allowed"));
  },
});

// ── NEW: Multer for Aadhaar card images ──────────────────────────────────────
const aadharDir = path.join(__dirname, "../uploads/aadhar");
if (!fs.existsSync(aadharDir)) fs.mkdirSync(aadharDir, { recursive: true });

const aadharStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, aadharDir),
  filename:    (req,  file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `aadhar_${req.params.id}_${Date.now()}${ext}`);
  },
});
const aadharUpload = multer({
  storage: aadharStorage,
  limits: { fileSize: 5 * 1024 * 1024 },   // 5 MB
  fileFilter: (_req, file, cb) => {
    const okExt  = /jpeg|jpg|png|webp|pdf/.test(
      path.extname(file.originalname).toLowerCase()
    );
    const okMime = /jpeg|jpg|png|webp|pdf/.test(file.mimetype);
    okExt && okMime
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, WebP or PDF allowed for Aadhaar"));
  },
});

// ── NEW: Multer for teacher Aadhaar images ───────────────────────────────────
const aadharTeacherDir = path.join(__dirname, "../uploads/aadhar-teachers");
if (!fs.existsSync(aadharTeacherDir)) fs.mkdirSync(aadharTeacherDir, { recursive: true });

const aadharTeacherStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, aadharTeacherDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `aadhar_teacher_${req.params.id}_${Date.now()}${ext}`);
  },
});
const aadharTeacherUpload = multer({
  storage: aadharTeacherStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|pdf/.test(
      path.extname(file.originalname).toLowerCase()
    );
    ok ? cb(null, true) : cb(new Error("Only JPG, PNG, WebP or PDF allowed"));
  },
});
// ─────────────────────────────────────────────────────────────────────────────

// ── Controllers
const {
  getDashboard,
  getStudentMeta,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  uploadStudentPhoto,
  uploadAadharImage,    // ← NEW
  updateAadharNumber,   // ← NEW
} = require("../controllers/adminController");

const {
  getAllTeachers, getTeacherMeta, createTeacher, deleteTeacher, updateTeacher, uploadTeacherAadharImage,   // ← ADD
  updateTeacherAadharNumber,
} = require("../controllers/teacherController");

const {
  getAllClasses, getClassMeta, createClass, updateClass, deleteClass, checkTeacherClassAssignment,
} = require("../controllers/classController");

// ── Auth guard for ALL admin routes
router.use(protect, authorizeRoles("admin"));

// ── Dashboard
router.get("/dashboard", getDashboard);

// ── Students  (IMPORTANT: /meta must come before /:id)
router.get   ("/students/meta",              getStudentMeta);
router.get   ("/students",                   getAllStudents);
router.post  ("/students",                   createStudent);
router.post  ("/students/:id/photo",         studentUpload.single("photo"), uploadStudentPhoto);

// ── NEW: Aadhaar routes ──────────────────────────────────────────────────────
router.post  ("/students/:id/aadhar-image",  aadharUpload.single("aadhar_image"), uploadAadharImage);
router.put   ("/students/:id/aadhar-number", updateAadharNumber);
router.put   ("/students/:id",               updateStudent);
router.delete("/students/:id",               deleteStudent);

// ─────────────────────────────────────────────────────────────────────────────

router.get("/teachers/check-class", checkTeacherClassAssignment);

// ── Attendance trend
router.get("/attendance/trend", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(date, 'DD Mon') AS date,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'Present') * 100.0 / NULLIF(COUNT(*), 0),
          1
        ) AS rate
      FROM attendance
      WHERE date >= CURRENT_DATE - ($1 * INTERVAL '1 day')
      GROUP BY date
      ORDER BY date
    `, [days]);
    res.json({ data: rows });
  } catch (err) {
    console.error("attendance/trend error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Teachers
router.get   ("/teachers/meta",        getTeacherMeta);
router.get   ("/teachers",             getAllTeachers);

router.post  ("/teachers",             teacherUpload.single("profilePicture"), requestValidation, createTeacher);
router.post("/teachers/:id/aadhar-image",  aadharTeacherUpload.single("aadhar_image"), uploadTeacherAadharImage);
router.put ("/teachers/:id/aadhar-number", updateTeacherAadharNumber);

router.put   ("/teachers/:id",         teacherUpload.single("profilePicture"), requestValidation, updateTeacher);
router.delete("/teachers/:id",         deleteTeacher);

// ── Classes
router.get   ("/classes/meta",         getClassMeta);
router.get   ("/classes",              getAllClasses);
router.post  ("/classes",              createClass);
router.put   ("/classes/:id",          updateClass);
router.delete("/classes/:id",          deleteClass);

module.exports = router;
