const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { requestValidation } = require("../middleware/requestValidation");
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
    ];
    const allowedExtensions = new Set([
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".csv",
      ".txt",
    ]);
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed =
      allowedExtensions.has(extension) &&
      (allowedMimeTypes.includes(file.mimetype) ||
        file.mimetype === "application/octet-stream");
    callback(
      allowed
        ? null
        : new Error(
            "Supported documents: PDF, JPG, PNG, WebP, Word, Excel, CSV, and TXT",
          ),
      allowed,
    );
  },
});

const router = express.Router();
router.get("/student", protect, authorizeRoles("student"), getMyDocuments);
router.use(protect, authorizeRoles("admin"));
router.get("/", getDocuments);
router.get("/student/:studentId", getDocuments);
router.post("/", upload.single("file"), requestValidation, uploadDocument);
router.put("/:id/verify", verifyDocument);
router.delete("/:id", deleteDocument);

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ message: "Document must be 20MB or smaller" });
  }
  return res.status(400).json({
    message: error.message || "Document upload failed",
  });
});

module.exports = router;
