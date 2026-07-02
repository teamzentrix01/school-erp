const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const controller = require("../controllers/smartAttendanceController");

const router = express.Router();

router.post(
  "/scan",
  protect,
  authorizeRoles("student"),
  controller.scanQrAttendance,
);

const deviceOrAdmin = (req, res, next) => {
  const configuredKey = process.env.SMART_ATTENDANCE_API_KEY;
  const providedKey = req.headers["x-device-key"];
  if (configuredKey && providedKey === configuredKey) {
    req.user = null;
    return next();
  }
  return protect(req, res, () => authorizeRoles("admin")(req, res, next));
};

router.post("/device-events", deviceOrAdmin, controller.recordDeviceEvent);
router.use(protect, authorizeRoles("admin", "teacher"));
router.get("/", controller.getSmartAttendance);
router.post("/sessions", controller.createQrSession);
router.put("/sessions/:id/close", controller.closeSession);
router.post(
  "/identities",
  authorizeRoles("admin"),
  controller.enrollIdentity,
);

module.exports = router;
