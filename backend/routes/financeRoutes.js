const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getTransactions,
  saveTransaction,
  deleteTransaction,
  getFinanceDashboard,
} = require("../controllers/financeController");

const router = express.Router();
router.use(protect, authorizeRoles("admin"));
router.get("/dashboard", getFinanceDashboard);
router.get("/transactions", getTransactions);
router.post("/transactions", saveTransaction);
router.put("/transactions/:id", saveTransaction);
router.delete("/transactions/:id", deleteTransaction);

module.exports = router;
