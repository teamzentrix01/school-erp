const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getHostelOverview,
  saveHostel,
  updateHostel,
  deleteHostel,
  saveRoom,
  updateRoom,
  deleteRoom,
  assignStudent,
  vacateStudent,
  createLeaveRequest,
  updateLeaveStatus,
  createComplaint,
  updateComplaint,
} = require("../controllers/hostelController");

const router = express.Router();
router.use(protect, authorizeRoles("admin"));

router.get("/", getHostelOverview);
router.post("/hostels", saveHostel);
router.put("/hostels/:id", updateHostel);
router.delete("/hostels/:id", deleteHostel);
router.post("/rooms", saveRoom);
router.put("/rooms/:id", updateRoom);
router.delete("/rooms/:id", deleteRoom);
router.post("/allocations", assignStudent);
router.delete("/allocations/:id", vacateStudent);
router.post("/leaves", createLeaveRequest);
router.patch("/leaves/:id", updateLeaveStatus);
router.post("/complaints", createComplaint);
router.patch("/complaints/:id", updateComplaint);

module.exports = router;
