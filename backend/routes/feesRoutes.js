const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const verifyToken = protect;
const requireRole = (...roles) => authorizeRoles(...roles);
const financialAudit = require("../middleware/financialAudit");
const { requestValidation } = require("../middleware/requestValidation");

const {
  getFeeClasses,
  getStudentFees,
  createOrder,
  verifyPayment,
  uploadReceipt,
  getPendingApprovals,
  approvePayment,
  rejectPayment,
  recordCashPayment,
  getStudentFeesList,
  updateStudentFee,
  setFeeStructure,
  getAllPayments,
  getStats,
} = require("../controllers/feesController");

router.use(financialAudit);

// ── Multer for receipt uploads ────────────────────────────────────────────────
const receiptDir = path.join(__dirname, "../uploads/receipts");
if (!fs.existsSync(receiptDir)) fs.mkdirSync(receiptDir, { recursive: true });

const receiptStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, receiptDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(
      null,
      `receipt_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`,
    );
  },
});

const receiptUpload = multer({
  storage: receiptStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".pdf", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only images and PDFs are allowed"));
  },
});

// ── Stats (admin + teacher) ───────────────────────────────────────────────────
router.get("/stats", verifyToken, requireRole("admin", "accounts"), getStats);
router.get(
  "/classes",
  verifyToken,
  requireRole("admin", "accounts"),
  getFeeClasses,
);

// ── Student routes ────────────────────────────────────────────────────────────
router.get(
  "/student/fees",
  verifyToken,
  requireRole("student"),
  getStudentFees,
);
router.post(
  "/payment/create-order",
  verifyToken,
  requireRole("student"),
  createOrder,
);
router.post(
  "/payment/verify",
  verifyToken,
  requireRole("student"),
  verifyPayment,
);
router.post(
  "/payment/upload-receipt",
  verifyToken,
  requireRole("student"),
  receiptUpload.single("receipt"),
  requestValidation,
  uploadReceipt,
);

// ── Admin routes ──────────────────────────────────────────────────────────────
router.get(
  "/admin/pending-approvals",
  verifyToken,
  requireRole("admin", "accounts"),
  getPendingApprovals,
);
router.get(
  "/admin/all-payments",
  verifyToken,
  requireRole("admin", "accounts"),
  getAllPayments,
);
router.patch(
  "/admin/approve/:paymentId",
  verifyToken,
  requireRole("admin", "accounts"),
  approvePayment,
);
router.patch(
  "/admin/reject/:paymentId",
  verifyToken,
  requireRole("admin", "accounts"),
  rejectPayment,
);
router.post(
  "/admin/cash-payment",
  verifyToken,
  requireRole("admin", "accounts"),
  recordCashPayment,
);
router.post(
  "/structures",
  verifyToken,
  requireRole("admin", "accounts"),
  setFeeStructure,
);

// ── Admin + Teacher routes ────────────────────────────────────────────────────
router.get(
  "/students",
  verifyToken,
  requireRole("admin", "accounts", "teacher"),
  getStudentFeesList,
);
router.patch(
  "/students/:id",
  verifyToken,
  requireRole("admin", "accounts"),
  updateStudentFee,
);

module.exports = router;
