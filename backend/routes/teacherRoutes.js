const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  getProfile,
  getClasses,
  getStudents,
  markAttendance,
  createAssignment,
  getTimetable,
  updateStudentFee,
  getHomeworkClasses,
} = require("../controllers/teacherController");
const {
  getTeacherExams,
  getTeacherExamMarks,
  saveTeacherMarks,
  submitTeacherMarks,
} = require("../controllers/resultsController");

router.use(protect, authorizeRoles("teacher"));

router.get("/profile", getProfile);
router.get("/classes", getClasses);
router.get("/students", getStudents);
router.get("/timetable", getTimetable); // ← NEW
router.get("/homework-classes", getHomeworkClasses);
router.put("/fees/:studentId", updateStudentFee); // ← NEW
router.post("/attendance", markAttendance);
router.post("/assignments", createAssignment);
router.get("/result-exams", getTeacherExams);
router.get("/result-exams/:id/marks", getTeacherExamMarks);
router.put("/result-exams/:id/marks", saveTeacherMarks);
router.post("/result-exams/:id/submit", submitTeacherMarks);

module.exports = router;
