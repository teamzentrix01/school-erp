const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getProfile,
  getResults,
  getFees,
  getAssignments,
  getTimetable,
  getTeachers,
  getCampusServices,
  createHostelLeave,
  createHostelComplaint,
} = require("../controllers/studentController");
const attCtrl = require("../controllers/attendanceController");

router.use(protect, authorizeRoles("student"));

router.get("/profile", getProfile);

router.get("/results", getResults);
router.get("/fees", getFees);
router.get("/assignments", getAssignments);
router.get("/timetable", getTimetable);
router.get("/teachers", getTeachers);
router.get("/attendance", attCtrl.getStudentAttendance);
router.get("/campus-services", getCampusServices);
router.post("/hostel/leave", createHostelLeave);
router.post("/hostel/complaints", createHostelComplaint);

module.exports = router;
