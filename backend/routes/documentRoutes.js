const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getDocuments,
  getMyDocuments,
  uploadDocument,
  verifyDocument,
  deleteDocument,
} = require("../controllers/documentController");

const uploadDir = path.join(__dirname, "../uploads/documents");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(
        null,
        `student_document_${Date.now()}_${Math.random().toString(36).slice(2)}${extension}`,
      );
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    callback(
      allowed.includes(file.mimetype)
        ? null
        : new Error("Only PDF and image documents are allowed"),
      allowed.includes(file.mimetype),
    );
  },
});

const router = express.Router();
router.get("/student", protect, authorizeRoles("student"), getMyDocuments);
router.use(protect, authorizeRoles("admin"));
router.get("/", getDocuments);
router.get("/student/:studentId", getDocuments);
router.post("/", upload.single("file"), uploadDocument);
router.put("/:id/verify", verifyDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
