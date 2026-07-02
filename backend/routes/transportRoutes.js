const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getTransportOverview,
  saveVehicle,
  updateVehicle,
  deleteVehicle,
  saveRoute,
  updateRoute,
  deleteRoute,
  assignStudent,
  removeAssignment,
} = require("../controllers/transportController");

const router = express.Router();
router.use(protect, authorizeRoles("admin"));

router.get("/", getTransportOverview);
router.post("/vehicles", saveVehicle);
router.put("/vehicles/:id", updateVehicle);
router.delete("/vehicles/:id", deleteVehicle);
router.post("/routes", saveRoute);
router.put("/routes/:id", updateRoute);
router.delete("/routes/:id", deleteRoute);
router.post("/assignments", assignStudent);
router.delete("/assignments/:id", removeAssignment);

module.exports = router;
