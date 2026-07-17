const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requestValidation } = require("../middleware/requestValidation");
const {
  getExams,
  createExam,
  updateExam,
  deleteExam,
  getExamMarks,
  saveMarks,
  getResultSubmissions,
  reviewResultSubmission,
  publishExam,
  getFeeClearance,
  updateFeeClearanceOverride,
  getMarksheet,
  getUploads,
  uploadResultFile,
} = require("../controllers/resultsController");

const uploadDir = path.join(__dirname, "../uploads/results");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase();
      callback(
        null,
        `result_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
      );
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      ".csv",
      ".xlsx",
      ".xls",
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) callback(null, true);
    else callback(new Error("Unsupported file type"));
  },
});

const router = express.Router();
router.use(protect, authorizeRoles("admin"));

router.get("/exams", getExams);
router.post("/exams", createExam);
router.put("/exams/:id", updateExam);
router.delete("/exams/:id", deleteExam);
router.get("/exams/:id/marks", getExamMarks);
router.put("/exams/:id/marks", saveMarks);
router.get("/submissions", getResultSubmissions);
router.put("/submissions/:id/review", reviewResultSubmission);
router.post("/exams/:id/publish", publishExam);
router.get("/exams/:id/fee-clearance", getFeeClearance);
router.put(
  "/exams/:id/fee-clearance/:studentId/override",
  updateFeeClearanceOverride,
);
router.get("/marksheet/:examId/:studentId", getMarksheet);
router.get("/uploads", getUploads);
router.post("/uploads", upload.single("file"), requestValidation, uploadResultFile);

module.exports = router;
