const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/attendanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.use(protect);

// ── Attendance ────────────────────────────────────────────────────────────────
router.get ("/status",  authorizeRoles("teacher", "admin"), ctrl.getStatus);
router.get ("/records", authorizeRoles("teacher", "admin"), ctrl.getRecords);
router.get("/export", authorizeRoles("teacher", "admin"), ctrl.exportAttendanceExcel);
router.post("/mark",    authorizeRoles("teacher", "admin"), ctrl.markAttendance);
router.put ("/update",  authorizeRoles("teacher", "admin"), ctrl.updateAttendance);

// ── Reports (admin only) ──────────────────────────────────────────────────────
router.get("/report",   authorizeRoles("admin"), ctrl.getReport);
router.get("/teachers", authorizeRoles("admin"), ctrl.getTeacherAttendance);
router.put("/teachers", authorizeRoles("admin"), ctrl.saveTeacherAttendance);

// ── Holidays ──────────────────────────────────────────────────────────────────
router.get   ("/holidays",     authorizeRoles("admin", "teacher"), ctrl.getHolidays);
router.post  ("/holidays",     authorizeRoles("admin"),            ctrl.createHoliday);
router.delete("/holidays/:id", authorizeRoles("admin"),            ctrl.deleteHoliday);

module.exports = router;
