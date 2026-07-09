// ── timetableRoutes.js
// Add this file to your routes/ folder
// Then in server.js add:
//   const timetableRoutes = require("./routes/timetableRoutes");
//   app.use("/api/admin", timetableRoutes);

const express = require("express");
const router  = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getTimetable,
  createPeriod,
  updatePeriod,
  deletePeriod,
  getTimetableSettings,
  updateTimetableSettings,
  getTimetableEvents,
  createTimetableEvent,
  updateTimetableEvent,
  deleteTimetableEvent,
} = require("../controllers/timetableController");

router.use(protect, authorizeRoles("admin"));

router.get   ("/timetable",     getTimetable);
router.post  ("/timetable",     createPeriod);
router.put   ("/timetable/:id", updatePeriod);
router.delete("/timetable/:id", deletePeriod);
router.get   ("/timetable-settings", getTimetableSettings);
router.put   ("/timetable-settings", updateTimetableSettings);
router.get   ("/timetable-events", getTimetableEvents);
router.post  ("/timetable-events", createTimetableEvent);
router.put   ("/timetable-events/:id", updateTimetableEvent);
router.delete("/timetable-events/:id", deleteTimetableEvent);

module.exports = router;
