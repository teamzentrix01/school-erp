const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getStaff,
  saveStaff,
  deleteStaff,
  getPayrollRuns,
  getPayrollRun,
  generatePayroll,
  updatePayrollEntry,
  payPayrollEntry,
} = require("../controllers/payrollController");

const router = express.Router();
router.use(protect, authorizeRoles("admin"));
router.get("/staff", getStaff);
router.post("/staff", saveStaff);
router.put("/staff/:id", saveStaff);
router.delete("/staff/:id", deleteStaff);
router.get("/runs", getPayrollRuns);
router.get("/runs/:id", getPayrollRun);
router.post("/runs", generatePayroll);
router.put("/entries/:id", updatePayrollEntry);
router.post("/entries/:id/pay", payPayrollEntry);

module.exports = router;
