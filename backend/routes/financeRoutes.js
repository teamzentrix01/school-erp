const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getTransactions,
  saveTransaction,
  deleteTransaction,
  getFinanceDashboard,
} = require("../controllers/financeController");

const router = express.Router();
const financialAudit = require("../middleware/financialAudit");
router.use(financialAudit, protect, authorizeRoles("admin", "accounts"));
router.get("/dashboard", getFinanceDashboard);
router.get("/transactions", getTransactions);
router.post("/transactions", saveTransaction);
router.put("/transactions/:id", saveTransaction);
router.delete("/transactions/:id", authorizeRoles("admin"), deleteTransaction);

module.exports = router;
