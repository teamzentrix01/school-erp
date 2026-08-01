const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const controller = require("../controllers/accountsController");

const uploadDir = path.join(__dirname, "../uploads/accounts");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
      cb(null, `account_${req.params.id}_${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only PDF, JPG, PNG and WebP files are allowed"), allowed.includes(file.mimetype));
  },
});

const router = express.Router();
router.use(protect);
router.get(
  "/dashboard",
  authorizeRoles("admin", "accounts"),
  controller.getDashboard,
);
router.get("/users", authorizeRoles("admin"), controller.listUsers);
router.post("/users", authorizeRoles("admin"), controller.createUser);
router.put("/users/:id", authorizeRoles("admin"), controller.updateUser);
router.delete("/users/:id", authorizeRoles("admin"), controller.deleteUser);
router.post(
  "/users/:id/documents",
  authorizeRoles("admin"),
  documentUpload.single("document"),
  controller.uploadDocument,
);
router.delete(
  "/users/:id/documents/:documentId",
  authorizeRoles("admin"),
  controller.deleteDocument,
);

module.exports = router;
